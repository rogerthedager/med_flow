# MedFlow compact seed data

This fixture set is intentionally small. It provides enough linked data to demonstrate the five business questions and basic role-based access without filling the dashboard with test rows.

## Load the data

From `backend`, with `DATABASE_URL` set to the target PostgreSQL database:

```powershell
& .venv/Scripts/python.exe -m scripts.seed_coverage
```

The Python command creates missing ORM tables, inserts only missing fixture IDs, and adjusts their sequences. Existing rows are never overwritten.

To regenerate the standalone SQL artifact after changing `coverage_data.py`:

```powershell
& .venv/Scripts/python.exe -m scripts.seed_coverage --export-sql ../db/sql/seed_coverage.sql
```

The Python and standalone SQL import methods are alternatives. The Python method is recommended because it always uses the current ORM and enum values.

## Fixture size

| Entity | Count | Reserved IDs |
| --- | ---: | --- |
| Hospitals | 3 | 9101–9103 |
| Technicians | 3 | 9201–9203 |
| Equipment | 8 | 9301–9308 |
| Work orders | 6 | 9401–9406 |
| Users | 3 | 9501–9503 |
| Service reports | 3 | 9601–9603 |

## Demo accounts

| Username | Password | Role | Technician |
| --- | --- | --- | --- |
| `seed_admin` | `SeedAdmin123!` | Clinical Admin | — |
| `seed_technician` | `SeedTech123!` | Field Technician | 9201 |
| `seed_auditor` | `SeedAuditor123!` | Auditor | — |

These credentials are for local or workshop demonstration only.

## Expected business answers

The queries in `db/sql/business_questions.sql` restrict results to the reserved fixture IDs.

| Business question | Expected result |
| --- | --- |
| Low charge | Equipment 9301 and 9306; Offline 9304 is excluded and exactly 20% on 9302 is excluded |
| Co-location discrepancy | 3 orders and 3 distinct devices; one Low, one Medium, and one Critical |
| Reliability | Ventilator and Infusion Pump each have 1 Completed and 1 Failed order, ratio 1.00 and completion rate 50% |
| Maintenance flags | Hospital 9102 is flagged at 1/3 = 33.33%; hospitals 9101 and 9103 are not flagged |
| Reporting lines | Supervisor 9901 has 2 technicians with 2 active orders; supervisor 9902 has none |

The reports include PDF, TXT, and PNG URLs. They are placeholder URLs; this seed does not upload S3 objects.

## Verify safely

The verification command creates a temporary schema and rolls its transaction back. It requires permission to create a PostgreSQL schema.

```powershell
& .venv/Scripts/python.exe -m scripts.verify_seed_coverage
```

For database and business-query checks without importing the FastAPI application:

```powershell
& .venv/Scripts/python.exe -m scripts.verify_seed_coverage --data-only
```

If the previous large fixture set was already imported, running this smaller seed will not delete or update those rows. Use a clean demo database or remove the old reserved fixture rows deliberately before importing the compact set.
