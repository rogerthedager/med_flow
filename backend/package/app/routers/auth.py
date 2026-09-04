from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


from app.dependencies import get_db, require_role

from app.models import User, UserRole, Technician
from app.schemas.user import Token, UserCreate, UserRead
from app.security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
)-> Token:
    result = await db.execute(select(User).where(User.username == form_data.username))
    user =result.scalar_one_or_none()
    
    if (
        user is None
        or not user.is_active
        or not verify_password(form_data.password, user.hashed_password)
    ):
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    access_token = create_access_token(data = {"sub":user.username, "role": user.role.value})
    return Token(access_token=access_token, token_type="bearer")
    
    
@router.post("/register", response_model=UserRead, status_code = status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.CLINICIAL_ADMIN)),
) -> User:
    existing = await db.execute(select(User).where(User.username == payload.username))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail=f"Username'{payload.username}' is already taken",
        )
    if payload.technician_id is not None:
        technician = await db.get(
            Technician,
            payload.technician_id,
        )

        if technician is None:
            raise HTTPException(
                status_code=400,
                detail="Technician does not exist.",
            )

        bound_user_id = await db.scalar(
            select(User.id).where(
                User.technician_id == payload.technician_id
            )
        )

        if bound_user_id is not None:
            raise HTTPException(
                status_code=409,
                detail="This technician already has a user account.",
            )
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        technician_id=payload.technician_id,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user