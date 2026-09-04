from decimal import Decimal
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    model_validator,
)

from app.models.enums import OrderPriority, OrderStatus
from app.schemas.equiments import EquipmentRead

class OrderBase(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    priority: OrderPriority
    status: OrderStatus = OrderStatus.PENDING
    equipment_id: int = Field(ge=1)
    technician_id: int = Field(ge=1)


class OrderCreate(OrderBase):
    """Request body for POST /orders."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

class OrderRead(OrderBase):
    """Shape of a Robot in any API Response"""

    id: int
    title:str
    priority : OrderPriority
    status: OrderStatus
    equipment_id : int
    technician_id : int
    model_config = ConfigDict(from_attributes=True)
    
class DiscrepancyRead(BaseModel):
    order_id: int
    title: str 
    equipment_hospital_id: int
    technician_hospital_id: int
    model_config = ConfigDict(from_attributes=True)
    

class OrderStatusUpdate(BaseModel):
        status: OrderStatus
        
class DiscrepancySummary(BaseModel):
    device_count: int = Field(ge=0)
        
class ReliabilityRead(BaseModel):
    model: str
    completed: int = Field(ge=0)
    failed: int = Field(ge=0)
    completion_failure_ratio: float | None = Field(default=None, ge=0)
    completion_rate_pct: float | None = Field(
        default=None, ge=0, le=100
    )
    
class TechnicianOptionRead(BaseModel):
    id: int
    name: str
    hospital_id: int

    model_config = ConfigDict(from_attributes=True)


class OrderCreateOptions(BaseModel):
    equipments: list[EquipmentRead]
    technicians: list[TechnicianOptionRead]
    
class OrderUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    priority: OrderPriority | None = None
    equipment_id: StrictInt | None = Field(
        default=None,
        ge=1,
    )
    technician_id: StrictInt | None = Field(
        default=None,
        ge=1,
    )

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError(
                "At least one field must be provided."
            )

        if any(
            getattr(self, field_name) is None
            for field_name in self.model_fields_set
        ):
            raise ValueError(
                "Updated fields cannot be null."
            )

        return self