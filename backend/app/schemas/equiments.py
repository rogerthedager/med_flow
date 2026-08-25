
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EquipmentStatus




class EquipmentBase(BaseModel):
    serial_number: str = Field(min_length=1, max_length=50)
    model: str = Field(min_length=1, max_length=100)
    status: EquipmentStatus = EquipmentStatus.AVAILIABLE
    charge_level: Decimal = Field(ge=0, le=100)
    facility_id: int
    
class EquipmentCreate(EquipmentBase):
        """Shape of the Request Body for POST /Equipments"""

class EquipmentRead(EquipmentBase):
    """Shape of a Equipment in any API Response"""

    id: int

    model_config = ConfigDict(from_attributes=True)