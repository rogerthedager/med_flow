"""Verify the compact fixture set in a temporary, rolled-back PostgreSQL schema."""

import argparse
import asyncio
from pathlib import Path
import re
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine
from app.dependencies import get_db
from app.models import Base, User
from scripts.coverage_data import TABLES, USERS
from scripts.seed_coverage import seed


class Checks:
    def __init__(self):
        self.passed = 0
        self.failures = []

    def equal(self, name, actual, expected):
        if actual == expected:
            self.passed += 1
        else:
            self.failures.append(f"{name}: expected {expected!r}, got {actual!r}")


async def verify_data(connection, checks):
    await connection.run_sync(Base.metadata.create_all)

    exported_sql = (
        Path(__file__).resolve().parents[2] / "db/sql/seed_coverage.sql"
    ).read_text(encoding="utf-8")
    exported_sql = "\n".join(
        line for line in exported_sql.splitlines()
        if line not in ("BEGIN;", "COMMIT;", "\\set ON_ERROR_STOP on")
    )
    raw = await connection.get_raw_connection()
    await raw.driver_connection.execute(exported_sql)
    await raw.driver_connection.execute(exported_sql)
    await seed(connection)
    await seed(connection)

    expected_counts = [(model, len(rows)) for model, rows, _ in TABLES]
    expected_counts.append((User, len(USERS)))
    for model, expected in expected_counts:
        actual = await connection.scalar(select(func.count()).select_from(model))
        checks.equal(f"seed count {model.__tablename__}", actual, expected)

    query_text = (
        Path(__file__).resolve().parents[2] / "db/sql/business_questions.sql"
    ).read_text(encoding="utf-8")
    parts = re.split(r"-- (BQ\dP?):", query_text)
    answers = {}
    for key, query in zip(parts[1::2], parts[2::2]):
        query = query.split("\n", 1)[1]
        answers[key] = (await connection.execute(text(query))).mappings().all()

    checks.equal("BQ1 low-charge devices", [row["id"] for row in answers["BQ1"]], [9301, 9306])
    checks.equal("BQ2 discrepant orders/devices", tuple(answers["BQ2"][0].values()), (3, 3))
    checks.equal(
        "BQ2 priority coverage",
        [(row["priority"], row["discrepant_orders"]) for row in answers["BQ2P"]],
        [("Critical", 1), ("Low", 1), ("Medium", 1)],
    )
    checks.equal(
        "BQ3 reliability",
        [tuple(row.values()) for row in answers["BQ3"]],
        [
            ("Seed Infusion Pump", 2, 1, 1, 1, 50),
            ("Seed Mobile Imaging Cart", 0, 0, 0, None, None),
            ("Seed Patient Monitor", 0, 0, 0, None, None),
            ("Seed Ventilator", 4, 1, 1, 1, 50),
        ],
    )
    checks.equal(
        "BQ4 maintenance flags",
        [tuple(row.values()) for row in answers["BQ4"]],
        [
            (9101, "Seed Tampa Central", 4, 1, 25, False),
            (9102, "Seed Orlando Regional", 3, 1, 33.33, True),
            (9103, "Seed Boston Medical", 1, 0, 0, False),
        ],
    )
    checks.equal(
        "BQ5 reporting lines",
        [tuple(row.values()) for row in answers["BQ5"]],
        [(9901, 2, 2, 2), (9902, 1, 0, 0)],
    )
    checks.equal(
        "technician account binding",
        await connection.scalar(select(User.technician_id).where(User.username == "seed_technician")),
        9201,
    )


async def verify_api(connection, checks, app):
    async def test_db():
        async with AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            yield session

    app.dependency_overrides[get_db] = test_db
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        checks.equal("health endpoint", (await client.get("/health")).status_code, 200)

        tokens = {}
        for user in USERS:
            response = await client.post(
                "/auth/token",
                data={"username": user["username"], "password": user["password"]},
            )
            checks.equal(f"login {user['username']}", response.status_code, 200)
            if response.status_code == 200:
                tokens[user["username"]] = {
                    "Authorization": "Bearer " + response.json()["access_token"]
                }

        admin = tokens["seed_admin"]
        technician = tokens["seed_technician"]
        auditor = tokens["seed_auditor"]

        checks.equal("unauthenticated equipment list", (await client.get("/equipments")).status_code, 401)
        checks.equal("admin active equipment count", len((await client.get("/equipments", headers=admin)).json()), 7)
        checks.equal("technician scoped equipment count", len((await client.get("/equipments", headers=technician)).json()), 2)
        checks.equal(
            "low-charge API",
            len((await client.get("/equipments", params={"max_charge": 20}, headers=admin)).json()),
            2,
        )
        checks.equal("discrepancy API", len((await client.get("/orders/discrepancies", headers=admin)).json()), 3)
        checks.equal("reliability API", len((await client.get("/orders/reliability", headers=auditor)).json()), 4)
        checks.equal(
            "maintenance API",
            [row["hospital_id"] for row in (await client.get("/hospitals/maintenance-flags", headers=auditor)).json()],
            [9102],
        )
        reporting = await client.get("/hospitals/reporting-lines", params={"supervisor_id": 9901}, headers=auditor)
        checks.equal("reporting-line API", reporting.json(), {"supervisor_id": 9901, "active_technicians": 2, "active_orders": 2})

        payload = {"serial_number": "SEED-API-CREATE", "model": "API Test", "charge_level": 50, "hospital_id": 9101}
        checks.equal("admin create equipment", (await client.post("/equipments", json=payload, headers=admin)).status_code, 201)
        checks.equal("technician create denied", (await client.post("/equipments", json={**payload, "serial_number": "SEED-TECH-DENIED"}, headers=technician)).status_code, 403)
        checks.equal("auditor create denied", (await client.post("/equipments", json={**payload, "serial_number": "SEED-AUDIT-DENIED"}, headers=auditor)).status_code, 403)

        with (
            patch(
                "app.routers.service_reports.upload_service_report",
                new=AsyncMock(return_value="s3://medflow-service-report-rx34/service-reports/9402/test.pdf"),
            ),
            patch(
                "app.routers.service_reports.create_download_url",
                return_value="https://example.test/presigned",
            ),
            patch(
                "app.routers.service_reports.delete_service_report_object",
                new=AsyncMock(),
            ),
        ):
            uploaded = await client.post(
                "/orders/9402/service-reports",
                files={"file": ("test.pdf", b"%PDF-test", "application/pdf")},
                data={"notes": "Basic upload"},
                headers=technician,
            )
            checks.equal("technician uploads assigned report", uploaded.status_code, 201)
            report_id = uploaded.json().get("id") if uploaded.status_code == 201 else None
            listed = await client.get("/orders/9402/service-reports", headers=technician)
            checks.equal("technician lists assigned reports", len(listed.json()), 1)
            checks.equal(
                "technician cannot list another order's reports",
                (await client.get("/orders/9401/service-reports", headers=technician)).status_code,
                404,
            )
            checks.equal(
                "auditor upload denied",
                (await client.post(
                    "/orders/9402/service-reports",
                    files={"file": ("audit.pdf", b"%PDF-test", "application/pdf")},
                    headers=auditor,
                )).status_code,
                403,
            )
            if report_id is not None:
                checks.equal(
                    "admin deletes report",
                    (await client.delete(f"/service-reports/{report_id}", headers=admin)).status_code,
                    204,
                )

        checks.equal("technician updates assigned order", (await client.patch("/orders/9402/status", json={"status": "Completed"}, headers=technician)).status_code, 200)
        checks.equal("technician cannot update another order", (await client.patch("/orders/9401/status", json={"status": "Completed"}, headers=technician)).status_code, 404)
        checks.equal("auditor status update denied", (await client.patch("/orders/9401/status", json={"status": "Completed"}, headers=auditor)).status_code, 403)


async def main(data_only=False):
    app = None
    if not data_only:
        from app.main import app

    checks = Checks()
    engine.echo = False
    schema = "medflow_seed_check_" + uuid4().hex
    overrides = app.dependency_overrides.copy() if app is not None else {}
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
                await connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                await verify_data(connection, checks)
                if app is not None:
                    await verify_api(connection, checks, app)
            finally:
                await transaction.rollback()

        print(f"{checks.passed} checks passed; {len(checks.failures)} failures.")
        for failure in checks.failures:
            print(f"FAIL: {failure}")
        print("Temporary schema and test data rolled back; existing application data unchanged.")
        if checks.failures:
            raise SystemExit(1)
    finally:
        if app is not None:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(overrides)
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-only", action="store_true")
    asyncio.run(main(data_only=parser.parse_args().data_only))
