from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.enums import EquipmentStatus
from app.models.equiment import Equipment
from app.schemas.equiments import EquipmentCreate, EquipmentBase

router = APIRouter(prefix="/equipments", tags=["equipments"])
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