"""Small deterministic fixture set covering MedFlow's five business questions."""

from datetime import datetime
from decimal import Decimal

from app.models import Equipment, Hospital, ServiceReport, Technician, User, Work_Order
from app.models.enums import UserRole


HOSPITALS = [
    dict(id=9101, name="Seed Tampa Central", location_region="US-Southeast", capacity=1200, supervisor_id=9901),
    dict(id=9102, name="Seed Orlando Regional", location_region="US-Southeast", capacity=650, supervisor_id=9901),
    dict(id=9103, name="Seed Boston Medical", location_region="US-Northeast", capacity=900, supervisor_id=9902),
]

TECHNICIANS = [
    dict(id=9201, name="Seed Alice Chen", hospital_id=9101),
    dict(id=9202, name="Seed Sofia Rivera", hospital_id=9102),
    dict(id=9203, name="Seed Priya Shah", hospital_id=9103),
]

# Low-charge active devices: 9301 and 9306. Device 9302 is the exact 20% boundary,
# and Offline device 9304 proves that a low charge alone does not trigger the alert.
# Maintenance shares: Tampa 25%, Orlando 33.33%, Boston 0%.
EQUIPMENTS = [
    dict(id=9301, serial_number="SEED-MF-9301", model="Seed Ventilator", status="Available", charge_level=Decimal("10"), hospital_id=9101),
    dict(id=9302, serial_number="SEED-MF-9302", model="Seed Infusion Pump", status="In-Use", charge_level=Decimal("20"), hospital_id=9101),
    dict(id=9303, serial_number="SEED-MF-9303", model="Seed Patient Monitor", status="Maintenance", charge_level=Decimal("80"), hospital_id=9101),
    dict(id=9304, serial_number="SEED-MF-9304", model="Seed Mobile Imaging Cart", status="Offline", charge_level=Decimal("5"), hospital_id=9101),
    dict(id=9305, serial_number="SEED-MF-9305", model="Seed Ventilator", status="Available", charge_level=Decimal("70"), hospital_id=9102),
    dict(id=9306, serial_number="SEED-MF-9306", model="Seed Infusion Pump", status="Maintenance", charge_level=Decimal("15"), hospital_id=9102),
    dict(id=9307, serial_number="SEED-MF-9307", model="Seed Patient Monitor", status="Available", charge_level=Decimal("50"), hospital_id=9102),
    dict(id=9308, serial_number="SEED-MF-9308", model="Seed Ventilator", status="Available", charge_level=Decimal("100"), hospital_id=9103),
]

# Cross-site orders cover every priority; same-site controls cover all four statuses.
# Ventilator and Infusion Pump each have one Completed and one Failed order.
ORDERS = [
    dict(id=9401, title="Seed low pending cross-site inspection", priority="Low", status="Pending", equipment_id=9301, technician_id=9202),
    dict(id=9402, title="Seed medium in-progress cross-site inspection", priority="Medium", status="In-Progress", equipment_id=9305, technician_id=9201),
    dict(id=9403, title="Seed critical completed same-site inspection", priority="Critical", status="Completed", equipment_id=9301, technician_id=9201),
    dict(id=9404, title="Seed critical failed same-site inspection", priority="Critical", status="Failed", equipment_id=9305, technician_id=9202),
    dict(id=9405, title="Seed critical completed cross-site inspection", priority="Critical", status="Completed", equipment_id=9302, technician_id=9202),
    dict(id=9406, title="Seed medium failed same-site inspection", priority="Medium", status="Failed", equipment_id=9306, technician_id=9202),
]

REPORTS = [
    dict(id=9601, work_order_id=9403, file_url="https://reports.medflow.example/seed/9403/9601.pdf", notes="Completed inspection", created_at=datetime(2026, 8, 20, 9, 30)),
    dict(id=9602, work_order_id=9404, file_url="https://reports.medflow.example/seed/9404/9602.txt", notes=None, created_at=datetime(2026, 8, 20, 10, 30)),
    dict(id=9603, work_order_id=9405, file_url="https://reports.medflow.example/seed/9405/9603.png", notes="Inspection image", created_at=datetime(2026, 8, 20, 11, 30)),
]

USERS = [
    dict(id=9501, username="seed_admin", password="SeedAdmin123!", role=UserRole.CLINICIAL_ADMIN, technician_id=None, is_active=True),
    dict(id=9502, username="seed_technician", password="SeedTech123!", role=UserRole.FIELD_TECHNICIAN, technician_id=9201, is_active=True),
    dict(id=9503, username="seed_auditor", password="SeedAuditor123!", role=UserRole.AUDITOR, technician_id=None, is_active=True),
]

TABLES = [
    (Hospital, HOSPITALS, "name"),
    (Technician, TECHNICIANS, "name"),
    (Equipment, EQUIPMENTS, "serial_number"),
    (Work_Order, ORDERS, "title"),
    (ServiceReport, REPORTS, "file_url"),
]
