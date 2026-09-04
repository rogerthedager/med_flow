from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.permissions import scope_equipment
from app.dependencies import get_db
from app.models.enums import EquipmentStatus, UserRole
from app.models.user import User
from app.models.equiment import Equipment
from app.schemas.equiments import (
    EquipmentCreate,
    EquipmentRead,
    EquipmentUpdate,
)
from app.dependencies import get_db, get_current_user, require_role
from sqlalchemy.exc import IntegrityError
from app.models.hospital import Hospital
from app.models.work_order import Work_Order
router = APIRouter(
    prefix="/equipments",
    tags=["equipments"],
    dependencies=[Depends(get_current_user)],
)

@router.get("", response_model=list[EquipmentRead])
async def list_equipments(
    max_charge: Decimal | None = Query(
        default=None,
        ge=0,
        le=100,
        description="Only return equipment below this charge level.",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    statement = select(Equipment).where(
        Equipment.status != EquipmentStatus.OFFLINE
    )

    if max_charge is not None:
        statement = statement.where(
            Equipment.charge_level < max_charge
        )

    statement = scope_equipment(statement, current_user)
    statement = statement.order_by(Equipment.id)

    result = await db.execute(statement)
    return list(result.scalars().all())

@router.get(
    "/offline",
    response_model=list[EquipmentRead],
)
async def list_offline_equipments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> list[Equipment]:
    statement = (
        select(Equipment)
        .where(Equipment.status == EquipmentStatus.OFFLINE)
        .order_by(Equipment.id)
    )

    result = await db.execute(statement)

    return list(result.scalars().all())

@router.get("/{equipment_id}", response_model=EquipmentRead)
async def get_equipmemt(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Equipment:
    statement = select(Equipment).where(
        Equipment.id == equipment_id
    )
    statement = scope_equipment(statement, current_user)

    equipment = await db.scalar(statement)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found.",
        )

    return equipment

@router.post("", response_model=EquipmentRead, status_code=status.HTTP_201_CREATED)
async def create_equipment(payload: EquipmentCreate, db: AsyncSession = Depends(get_db),
                           _: User = Depends(require_role(UserRole.CLINICIAL_ADMIN))) -> Equipment:
    equipment = Equipment(**payload.model_dump())
    db.add(equipment)
    await db.commit()
    await db.refresh(equipment)
    return equipment

@router.patch(
    "/{equipment_id}",
    response_model=EquipmentRead,
)
async def update_equipment(
    equipment_id: int,
    payload: EquipmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.CLINICIAL_ADMIN)),
) -> Equipment:
    equipment = await db.get(Equipment, equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found.",
        )

    updates = payload.model_dump(exclude_unset=True)

    if "hospital_id" in updates:
        hospital = await db.get(
            Hospital,
            updates["hospital_id"],
        )

        if hospital is None:
            raise HTTPException(
                status_code=400,
                detail="Hospital does not exist.",
            )

    for field_name, value in updates.items():
        setattr(equipment, field_name, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Could not update the equipment because of a "
                "database constraint. The serial number may already exist."
            ),
        ) from None

    await db.refresh(equipment)
    return equipment
@router.delete(
    "/{equipment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.CLINICIAL_ADMIN)),
) -> Response:
    equipment = await db.get(Equipment, equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found.",
        )

    work_order_id = await db.scalar(
        select(Work_Order.id)
        .where(Work_Order.equipment_id == equipment_id)
        .limit(1)
    )

    if work_order_id is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Equipment with existing work orders cannot be deleted. "
                "Set its status to Offline instead."
            ),
        )

    try:
        await db.delete(equipment)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Equipment is still referenced and cannot be deleted.",
        ) from None

    return Response(status_code=status.HTTP_204_NO_CONTENT)