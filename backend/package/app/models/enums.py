from enum import Enum

class EquipmentStatus(str, Enum):
    AVAILABLE = "Available"
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
    CLINICIAL_ADMIN = "Clinical Admin"
    FIELD_TECHNICIAN = "Field Technician"
    AUDITOR = "Auditor"