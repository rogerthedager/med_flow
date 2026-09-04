from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import OrderPriority, OrderStatus


if TYPE_CHECKING:
    from .equiment import Equipment
    from .technician import Technician
    from .service_report import ServiceReport
class Work_Order(Base):
    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    priority: Mapped[OrderPriority] = mapped_column(
        SqlEnum(
            OrderPriority,
            name="order_priority",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    status: Mapped[OrderStatus] = mapped_column(
        SqlEnum(
            OrderStatus,
            name="order_status",
            values_callable = lambda enum_cls: [member.value for member in enum_cls],
        ),
        default=OrderStatus.PENDING,
    )
    equipment_id: Mapped[int]= mapped_column(Integer, ForeignKey("equipments.id"))
    technician_id: Mapped[int] = mapped_column(Integer, ForeignKey("technicians.id"))


    equipment: Mapped["Equipment"] = relationship(back_populates="work_orders")
    technician: Mapped["Technician"] = relationship(back_populates="work_orders")
    #because this is a list, "mission" needs to be singular
    service_reports: Mapped[list["ServiceReport"]] = relationship(back_populates="work_order")

    def mark_completed(self) -> None:
        self.status =OrderStatus.COMPLETED

    def mark_failed(self) -> None:
        self.status = OrderStatus.FAILED


    def __repr__(self) -> str:
        return (f"Order(id={self.id}, title={self.title!r}, "
                f"priority={self.priority.value}, status={self.status.value})")
