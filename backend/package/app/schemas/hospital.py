from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    model_validator,
)


class MaintenanceFlagRead(BaseModel):
    hospital_id: int
    hospital_name: str
    equipment_count: int = Field(ge=0)
    maintenance_count: int = Field(ge=0)
    maintenance_pct: float = Field(ge=0, le=100)
    
class ReportingLineRead(BaseModel):
    supervisor_id: int
    active_technicians: int = Field(ge=0)
    active_orders: int = Field(ge=0)
    
class HospitalRead(BaseModel):
    id: int
    name: str
    location_region: str
    capacity: int = Field(ge=0)
    supervisor_id: int = Field(ge=1)

    model_config = ConfigDict(from_attributes=True)

class HospitalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    location_region: str = Field(min_length=1, max_length=50)
    capacity: StrictInt = Field(ge=0)
    supervisor_id: StrictInt = Field(ge=1)

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )
    
class HospitalUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    location_region: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )
    capacity: StrictInt | None = Field(
        default=None,
        ge=0,
    )
    supervisor_id: StrictInt | None = Field(
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