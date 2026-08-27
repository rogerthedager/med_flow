from enum import Enum

class EquipmentStatus(str, Enum):
    AVAILIABLE = "Availiable"
    MAINTENANCE = "Maintenance"
    IN_USE="In-Use"
    OFFLINE="Offline"

class OrderPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    CRITICAL = "Critical"

class OrderStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In-Progress"
    COMPLETED = "Completed"
    FAILED = "Failed"

class UserRole(str,Enum):
    CLINIAL_ADMIN = "Clinial Admin"
    FIELD_TECHNICIAN = "Field_Techician"
    AUDITOR = "Auditor"