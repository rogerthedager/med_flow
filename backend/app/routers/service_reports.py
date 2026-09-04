from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, require_role
from app.models import ServiceReport, User, UserRole, Work_Order
from app.permissions import scope_orders
from app.s3_storage import create_download_url, delete_service_report_object, upload_service_report
from app.schemas.service_report import ServiceReportRead


router = APIRouter(
    tags=["service reports"],
    dependencies=[Depends(get_current_user)],
)


async def _accessible_order(order_id: int, db: AsyncSession, user: User) -> Work_Order:
    statement = scope_orders(
        select(Work_Order).where(Work_Order.id == order_id),
        user,
    )
    order = await db.scalar(statement)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


def _read_report(report: ServiceReport) -> ServiceReportRead:
    return ServiceReportRead(
        id=report.id,
        work_order_id=report.work_order_id,
        file_url=report.file_url,
        notes=report.notes,
        created_at=report.created_at,
        download_url=create_download_url(report.file_url),
    )


@router.get(
    "/orders/{order_id}/service-reports",
    response_model=list[ServiceReportRead],
)
async def list_service_reports(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ServiceReportRead]:
    await _accessible_order(order_id, db, current_user)
    reports = list((await db.scalars(
        select(ServiceReport)
        .where(ServiceReport.work_order_id == order_id)
        .order_by(ServiceReport.created_at.desc(), ServiceReport.id.desc())
    )).all())
    return [_read_report(report) for report in reports]


@router.post(
    "/orders/{order_id}/service-reports",
    response_model=ServiceReportRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_service_report(
    order_id: int,
    file: UploadFile = File(...),
    notes: str | None = Form(default=None, max_length=2000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.CLINICIAL_ADMIN, UserRole.FIELD_TECHNICIAN)
    ),
) -> ServiceReportRead:
    await _accessible_order(order_id, db, current_user)
    normalized_notes = notes.strip() if notes and notes.strip() else None
    file_url = await upload_service_report(file, order_id)
    report = ServiceReport(
        work_order_id=order_id,
        file_url=file_url,
        notes=normalized_notes,
    )
    db.add(report)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        try:
            await delete_service_report_object(file_url)
        except HTTPException:
            pass
        raise
    await db.refresh(report)
    return _read_report(report)


@router.delete(
    "/service-reports/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_service_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.CLINICIAL_ADMIN)),
) -> Response:
    report = await db.get(ServiceReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Service report not found.")
    await delete_service_report_object(report.file_url)
    await db.delete(report)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
