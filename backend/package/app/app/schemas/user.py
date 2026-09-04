from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    field_validator,
    model_validator,
)

from app.models import UserRole



class UserBase(BaseModel):
    username: str = Field(min_length = 3, max_length = 50)
    
    role: UserRole


class UserCreate(UserBase):
    password: str = Field(min_length=8)
    technician_id: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_technician_binding(self):
        if self.role == UserRole.FIELD_TECHNICIAN:
            if self.technician_id is None:
                raise ValueError(
                    "A technician account must have a technician_id."
                )
        elif self.technician_id is not None:
            raise ValueError(
                "Only technician accounts can have a technician_id."
            )

        return self
    
class UserUpdate(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
    )
    password: str | None = Field(
        default=None,
        min_length=8,
    )
    role: UserRole | None = None
    is_active: StrictBool | None = None
    technician_id: StrictInt | None = Field(
        default=None,
        ge=1,
    )

    model_config = ConfigDict(
        extra="forbid",
    )

    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, value):
        if isinstance(value, str):
            return value.strip()

        return value

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError(
                "At least one field must be provided."
            )

        non_nullable_fields = {
            "username",
            "password",
            "role",
            "is_active",
        }

        if any(
            getattr(self, field_name) is None
            for field_name in (
                self.model_fields_set &
                non_nullable_fields
            )
        ):
            raise ValueError(
                "Updated fields cannot be null."
            )

        return self

class UserRead(UserBase):
    id: int
    technician_id: int | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
    
    
class Token(BaseModel):
    access_token:str
    token_type: str = "bearer"
    
class UserTechnicianOptionRead(BaseModel):
    id: int
    name: str
    hospital_id: int

    model_config = ConfigDict(from_attributes=True)


class UserCreateOptions(BaseModel):
    technicians: list[UserTechnicianOptionRead]