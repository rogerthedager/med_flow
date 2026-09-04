from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy import select, func, Numeric
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.dependencies import get_db, get_current_user, require_role
from app.models import (
    Hospital,
    Equipment,
    User,
    UserRole,
    EquipmentStatus,
    Technician,
    Work_Order,
    OrderStatus,
)
from app.schemas.hospital import (
    HospitalCreate,
    HospitalRead,
    HospitalUpdate,
    MaintenanceFlagRead,
    ReportingLineRead,
)


router = APIRouter(
    prefix="/hospitals",
    tags=["hospitals"],
    dependencies=[Depends(get_current_user)],
)

@router.get(
    "",
    response_model=list[HospitalRead],
)
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Hospital]:
    statement = select(Hospital).order_by(Hospital.id)

    result = await db.execute(statement)

    return list(result.scalars().all())

@router.get(
    "/maintenance-flags",
    response_model=list[MaintenanceFlagRead],
)
async def maintenance_flags(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    equipment_count = func.count(Equipment.id)

    maintenance_count = func.count(Equipment.id).filter(
        Equipment.status == EquipmentStatus.MAINTENANCE
    )

    statement = (
        select(
            Hospital.id.label("hospital_id"),
            Hospital.name.label("hospital_name"),
            equipment_count.label("equipment_count"),
            maintenance_count.label("maintenance_count"),
            func.round(
                maintenance_count.cast(Numeric) * 100
                / func.nullif(equipment_count, 0),
                2,
            ).label("maintenance_pct"),
        )
        .select_from(Hospital)
        .outerjoin(
            Equipment,
            Equipment.hospital_id == Hospital.id,
        )
        .group_by(Hospital.id, Hospital.name)
        .having(maintenance_count * 100 > equipment_count * 30)
        .order_by(Hospital.id)
    )

    result = await db.execute(statement)
    return [dict(row) for row in result.mappings().all()]

@router.get("/reporting-lines", response_model=ReportingLineRead)
async def reporting_lines(
    supervisor_id: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    hospital_id = await db.scalar(
        select(Hospital.id)
        .where(Hospital.supervisor_id == supervisor_id)
        .limit(1)
    )

    if hospital_id is None:
        raise HTTPException(
            status_code=404,
            detail="No hospital is assigned to this supervisor.",
        )

    statement = (
        select(
            func.count(
                func.distinct(Technician.id)
            ).label("active_technicians"),
            func.count(Work_Order.id).label("active_orders"),
        )
        .select_from(Technician)
        .join(
            Hospital,
            Hospital.id == Technician.hospital_id,
        )
        .join(
            Work_Order,
            Work_Order.technician_id == Technician.id,
        )
        .where(
            Hospital.supervisor_id == supervisor_id,
            Work_Order.status.in_([
                OrderStatus.PENDING,
                OrderStatus.IN_PROGRESS,
            ]),
        )
    )

    result = await db.execute(statement)
    counts = result.mappings().one()

    return ReportingLineRead(
        supervisor_id=supervisor_id,
        active_technicians=counts["active_technicians"],
        active_orders=counts["active_orders"],
    )
    
@router.get(
    "/{hospital_id}",
    response_model=HospitalRead,
)
async def get_hospital(
    hospital_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Hospital:
    hospital = await db.get(Hospital, hospital_id)

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found.",
        )

    return hospital
@router.patch(
    "/{hospital_id}",
    response_model=HospitalRead,
)
async def update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> Hospital:
    hospital = await db.get(Hospital, hospital_id)

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found.",
        )

    updates = payload.model_dump(exclude_unset=True)

    for field_name, value in updates.items():
        setattr(hospital, field_name, value)

    await db.commit()
    await db.refresh(hospital)

    return hospital
@router.post(
    "",
    response_model=HospitalRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_hospital(
    payload: HospitalCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> Hospital:
    hospital = Hospital(**payload.model_dump())

    db.add(hospital)
    await db.commit()
    await db.refresh(hospital)

    return hospital

@router.delete(
    "/{hospital_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_hospital(
    hospital_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> Response:
    hospital = await db.get(Hospital, hospital_id)

    if hospital is None:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found.",
        )

    equipment_id = await db.scalar(
        select(Equipment.id)
        .where(Equipment.hospital_id == hospital_id)
        .limit(1)
    )

    if equipment_id is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Hospital with existing equipment cannot be deleted."
            ),
        )

    technician_id = await db.scalar(
        select(Technician.id)
        .where(Technician.hospital_id == hospital_id)
        .limit(1)
    )

    if technician_id is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Hospital with existing technicians cannot be deleted."
            ),
        )

    try:
        await db.delete(hospital)
        await db.commit()
    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Hospital is still referenced and cannot be deleted."
            ),
        ) from None

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )