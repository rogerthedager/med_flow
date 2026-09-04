
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    model_validator,
)


from app.models.enums import EquipmentStatus




class EquipmentBase(BaseModel):
    serial_number: str = Field(min_length=1, max_length=50)
    model: str = Field(min_length=1, max_length=100)
    status: EquipmentStatus = EquipmentStatus.AVAILABLE
    charge_level: Decimal = Field(ge=0, le=100)
    hospital_id: int

class EquipmentCreate(EquipmentBase):
        """Shape of the Request Body for POST /Equipments"""

class EquipmentRead(EquipmentBase):
    """Shape of a Equipment in any API Response"""

    id: int

    model_config = ConfigDict(from_attributes=True)

class EquipmentUpdate(BaseModel):
    serial_number: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )
    model: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    status: EquipmentStatus | None = None
    charge_level: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
    )
    hospital_id: StrictInt | None = Field(
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
            raise ValueError("At least one field must be provided.")

        if any(
            getattr(self, field_name) is None
            for field_name in self.model_fields_set
        ):
            raise ValueError("Updated fields cannot be null.")

        return self