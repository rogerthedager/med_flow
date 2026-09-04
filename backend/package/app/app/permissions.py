from fastapi import HTTPException

from app.models import User, UserRole, Equipment, Work_Order


def _technician_scope_id(user: User) -> int | None:
    if user.role in (
        UserRole.CLINICIAL_ADMIN,
        UserRole.AUDITOR,
    ):
        return None

    if (
        user.role == UserRole.FIELD_TECHNICIAN
        and user.technician_id is not None
    ):
        return user.technician_id

    raise HTTPException(
        status_code=403,
        detail="This account cannot access these records.",
    )


def scope_equipment(statement, user: User):
    technician_id = _technician_scope_id(user)

    if technician_id is not None:
        statement = statement.where(
            Equipment.work_orders.any(
                Work_Order.technician_id == technician_id
            )
        )

    return statement


def scope_orders(statement, user: User):
    technician_id = _technician_scope_id(user)

    if technician_id is not None:
        statement = statement.where(
            Work_Order.technician_id == technician_id
        )

    return statement