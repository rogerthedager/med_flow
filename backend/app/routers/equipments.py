from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.enums import EquipmentStatus
from app.models.user import User
from app.models.equiment import Equipment
from app.schemas.equiments import EquipmentCreate, EquipmentBase, EquipmentRead
from app.dependencies import get_db, get_current_user, require_role


router = APIRouter(prefix="/equipments", tags=["equipments"])

@router.get("", response_model=list[EquipmentRead])
async def list_equipments(
    max_charge: Decimal | None = Query(
        default = None,
        ge = 0,
        le = 100,
        desciption="Only return equipments strictly bet"
    ),
    db: AsyncSession = Depends(get_db)):
    
    statement = select(Equipment).where(Equipment.status != EquipmentStatus.Offline)
    
    if max_charge is not None:
        statement = statement.where(Equipment.charge_level < max_charge)
    
    statement = statement.order_by(Equipment.id)
    
    result = await db.execute(statement)
    
    return list(result.scalars().all()) 


@router.get("/{robot_id}", response_model = EquipmentRead)
async def get_equipmemt(equipment_id: int, db : AsyncSession = Depends(get_db), _: User = Depends(get_current_user)) -> Equipment:
    equipment = await db.get(Equipment, equipment_id)
    if equipment is None:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail=f"Equipment{equipment_id} not found",
        )
    return equipment