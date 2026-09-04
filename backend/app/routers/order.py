from decimal import Decimal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from app.permissions import scope_orders
from sqlalchemy import select, func, Numeric
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user, require_role
from app.models.enums import OrderStatus, OrderPriority, UserRole
from app.models.work_order import Work_Order
from app.models import (
    User,
    UserRole,
    Equipment,
    Technician,
    ServiceReport,
)
from app.schemas.order import OrderRead, OrderCreate,DiscrepancyRead, OrderStatusUpdate, DiscrepancySummary, ReliabilityRead, OrderCreateOptions, OrderUpdate
from sqlalchemy.exc import IntegrityError

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model = list[OrderRead])
async def list_orders(db: AsyncSession = Depends(get_db),     current_user: User = Depends(get_current_user),):
    statement = select(Work_Order)
    statement = statement.order_by(Work_Order.id)
    statement = scope_orders(statement, current_user)
    result = await db.execute(statement)
    return list(result.scalars().all())


@router.get("/discrepancies", response_model = list[DiscrepancyRead])
async def discrepancies(
    priority: OrderPriority | None = Query(
        default = None,
        description="Only return discrepancies for orders of the priority"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),):

    statement = (
                select(
                Work_Order.id.label("order_id"),
                Work_Order.title, 
                Equipment.hospital_id.label("equipment_hospital_id"),
                Technician.hospital_id.label("technician_hospital_id")
                ).
                 join(Work_Order.equipment).
                 join(Work_Order.technician)
                 .where(Equipment.hospital_id != Technician.hospital_id)
    )
    if priority is not None:
        statement = statement.where(Work_Order.priority == priority)
        statement = statement.order_by(Work_Order.id)
    statement = scope_orders(statement, current_user)
    result = await db.execute(statement)
    if result is None:
                raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order not found"
        )

    return[
        dict(row) for row in result.mappings().all()
    ]


@router.get("/discrepancies/summary", response_model=DiscrepancySummary)
async def discrepancy_summary(
    priority: OrderPriority | None = Query(default = None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(
            func.count(func.distinct(Work_Order.equipment_id))
        )
        .select_from(Work_Order)
        .join(Work_Order.equipment)
        .join(Work_Order.technician)
        .where(Equipment.hospital_id != Technician.hospital_id)
    )
    if priority is not None:
        statement = statement.where(Work_Order.priority == priority)
    statement = scope_orders(statement, current_user)
    result = await db.execute(statement)
    return DiscrepancySummary(
        device_count = result.scalar_one()
    )


@router.patch("/{order_id}/status", response_model=OrderRead)
async def get_status(order_id: int, 
                     payload: OrderStatusUpdate,
                     db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(
                            require_role(
                                UserRole.CLINICIAL_ADMIN,
                                UserRole.FIELD_TECHNICIAN,
                            )
                        ),
                     )-> Work_Order:
    statement = select(Work_Order).where(
        Work_Order.id == order_id
    )
    statement = scope_orders(statement, current_user)

    order = await db.scalar(statement)
    if order is None:
            raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )
    if payload.status == OrderStatus.COMPLETED:
        order.mark_completed()
    elif payload.status == OrderStatus.FAILED:
        order.mark_failed()
    elif payload.status == OrderStatus.PENDING:
        order.status = OrderStatus.PENDING
    elif payload.status == OrderStatus.IN_PROGRESS:
        order.status = OrderStatus.IN_PROGRESS
        

    await db.commit()
    await db.refresh(order)
    return order

@router.get("/reliability", response_model=list[ReliabilityRead])
async def reliability_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    completed = func.count(Work_Order.id).filter(
        Work_Order.status == OrderStatus.COMPLETED
    )
    failed = func.count(Work_Order.id).filter(
        Work_Order.status == OrderStatus.FAILED
    )

    statement = (
        select(
            Equipment.model,
            completed.label("completed"),
            failed.label("failed"),
            func.round(
                completed.cast(Numeric) / func.nullif(failed, 0),
                2,
            ).label("completion_failure_ratio"),
            func.round(
                completed.cast(Numeric) * 100
                / func.nullif(completed + failed, 0),
                2,
            ).label("completion_rate_pct"),
        )
        .select_from(Equipment)
        .outerjoin(
            Work_Order,
            Work_Order.equipment_id == Equipment.id,
        )
        .group_by(Equipment.model)
        .order_by(Equipment.model)
    )

    result = await db.execute(statement)
    return [dict(row) for row in result.mappings().all()]


@router.post(
    "",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.CLINICIAL_ADMIN)),
) -> Work_Order:
    equipment = await db.get(Equipment, payload.equipment_id)
    if equipment is None:
        raise HTTPException(
            status_code=400,
            detail="Equipment does not exist.",
        )

    technician = await db.get(Technician, payload.technician_id)
    if technician is None:
        raise HTTPException(
            status_code=400,
            detail="Technician does not exist.",
        )

    order = Work_Order(**payload.model_dump())
    db.add(order)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Could not create the order because of a database "
                "constraint. Check the equipment and technician."
            ),
        ) from None

    await db.refresh(order)
    return order

@router.get(
    "/create-options",
    response_model=OrderCreateOptions,
)
async def get_order_create_options(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.CLINICIAL_ADMIN)),
) -> OrderCreateOptions:
    equipment_result = await db.execute(
        select(Equipment).order_by(Equipment.id)
    )

    technician_result = await db.execute(
        select(Technician).order_by(Technician.name, Technician.id)
    )

    return OrderCreateOptions(
        equipments=list(equipment_result.scalars().all()),
        technicians=list(technician_result.scalars().all()),
    )


@router.patch(
    "/{order_id}",
    response_model=OrderRead,
)
async def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> Work_Order:
    order = await db.get(Work_Order, order_id)

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    updates = payload.model_dump(exclude_unset=True)

    if "equipment_id" in updates:
        equipment = await db.get(
            Equipment,
            updates["equipment_id"],
        )

        if equipment is None:
            raise HTTPException(
                status_code=400,
                detail="Equipment does not exist.",
            )

    if "technician_id" in updates:
        technician = await db.get(
            Technician,
            updates["technician_id"],
        )

        if technician is None:
            raise HTTPException(
                status_code=400,
                detail="Technician does not exist.",
            )

    for field_name, value in updates.items():
        setattr(order, field_name, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Could not update the order because of a "
                "database constraint."
            ),
        ) from None

    await db.refresh(order)

    return order

@router.get(
    "/{order_id}",
    response_model=OrderRead,
)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Work_Order:
    statement = select(Work_Order).where(
        Work_Order.id == order_id
    )

    statement = scope_orders(
        statement,
        current_user,
    )

    order = await db.scalar(statement)

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    return order

@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> Response:
    order = await db.get(Work_Order, order_id)

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    report_id = await db.scalar(
        select(ServiceReport.id)
        .where(ServiceReport.work_order_id == order_id)
        .limit(1)
    )

    if report_id is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Order with existing service reports "
                "cannot be deleted."
            ),
        )

    try:
        await db.delete(order)
        await db.commit()
    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Order is still referenced and cannot be deleted."
            ),
        ) from None

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )