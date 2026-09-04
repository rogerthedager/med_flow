from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import (
    get_current_user,
    get_db,
    require_role,
)
from app.models import Technician, User, UserRole
from app.schemas.user import (
    UserCreateOptions,
    UserRead,
    UserUpdate,
)
from sqlalchemy.exc import IntegrityError
from app.security import hash_password

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)],
)


@router.get(
    "",
    response_model=list[UserRead],
)
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> list[User]:
    statement = select(User).order_by(User.id)

    result = await db.execute(statement)

    return list(result.scalars().all())
@router.get(
    "/create-options",
    response_model=UserCreateOptions,
)
async def get_user_create_options(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> UserCreateOptions:
    statement = (
        select(Technician)
        .outerjoin(
            User,
            User.technician_id == Technician.id,
        )
        .where(User.id.is_(None))
        .order_by(Technician.name, Technician.id)
    )

    result = await db.execute(statement)

    return UserCreateOptions(
        technicians=list(result.scalars().all())
    )
@router.get(
    "/{user_id}",
    response_model=UserRead,
)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> User:
    user = await db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return user


@router.patch(
    "/{user_id}",
    response_model=UserRead,
)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> User:
    user = await db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    updates = payload.model_dump(exclude_unset=True)

    if (
        user.id == current_user.id
        and updates.get("is_active") is False
    ):
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account.",
        )

    if (
        user.id == current_user.id
        and "role" in updates
        and updates["role"] != UserRole.CLINICIAL_ADMIN
    ):
        raise HTTPException(
            status_code=400,
            detail="You cannot remove your own admin role.",
        )

    new_role = updates.get("role", user.role)
    new_technician_id = updates.get(
        "technician_id",
        user.technician_id,
    )

    if new_role == UserRole.FIELD_TECHNICIAN:
        if new_technician_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "A technician account must have a "
                    "technician_id."
                ),
            )
    elif new_technician_id is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only technician accounts can have a "
                "technician_id."
            ),
        )

    if "username" in updates:
        existing_user_id = await db.scalar(
            select(User.id).where(
                User.username == updates["username"],
                User.id != user_id,
            )
        )

        if existing_user_id is not None:
            raise HTTPException(
                status_code=409,
                detail="Username is already taken.",
            )

    if new_technician_id is not None:
        technician = await db.get(
            Technician,
            new_technician_id,
        )

        if technician is None:
            raise HTTPException(
                status_code=400,
                detail="Technician does not exist.",
            )

        bound_user_id = await db.scalar(
            select(User.id).where(
                User.technician_id == new_technician_id,
                User.id != user_id,
            )
        )

        if bound_user_id is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This technician already has a "
                    "user account."
                ),
            )

    password = updates.pop("password", None)

    if password is not None:
        user.hashed_password = hash_password(password)

    for field_name, value in updates.items():
        setattr(user, field_name, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Could not update the user because of a "
                "database constraint."
            ),
        ) from None

    await db.refresh(user)

    return user

@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN)
    ),
) -> Response:
    user = await db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account.",
        )

    if (
        user.role == UserRole.CLINICIAL_ADMIN
        and user.is_active
    ):
        active_admin_count = await db.scalar(
            select(func.count(User.id)).where(
                User.role == UserRole.CLINICIAL_ADMIN,
                User.is_active.is_(True),
            )
        )

        if (active_admin_count or 0) <= 1:
            raise HTTPException(
                status_code=409,
                detail=(
                    "The last active administrator "
                    "cannot be deleted."
                ),
            )

    try:
        await db.delete(user)
        await db.commit()
    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "User is still referenced and "
                "cannot be deleted."
            ),
        ) from None

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )