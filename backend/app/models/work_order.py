from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import OrderPriority, OrderStatus


if TYPE_CHECKING:
    from .equiment import Equipment


class Work_Order(Base):
    __tablename__ = "Work_Orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    priority: Mapped[order_priority] = mapped_column(
        SqlEnum(
            OrderPriority,
            name="order_priority",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        )
    )
    status: Mapped[order_status] = mapped_column(
        SqlEnum(
            OrderStatus,
            name="order_status",
            values_callable = lambda enum_cls: [member.value for member in enum_cls],
        ),
        default=OrderStatus.PENDING,
    )
    equipment_id: Mapped[int]= mapped_column(Integer, ForeignKey("equiments.id"))
    technician_id: Mapped[int] = mapped_column(Integer, ForeignKey("technician.id"))


    equipment: Mapped["Equiment"] = relationship(back_populates="work_orders")
    technician: Mapped["Technician"] = relationship(back_populates="work_orders")
    #because this is a list, "mission" needs to be singular
    diagnostic_logs: Mapped[list["ServiceReport"]] = relationship(back_populates="work_order")

    def mark_completed(self) -> None:
        self.status =OrderStatus.COMPLETED

    def mark_failed(self) -> None:
        self.status = OrderStatus.FAILED


    def __repr__(self) -> str:
        return (f"Order(id={self.id}, title={self.title!r}, "
                f"priority={self.priority.value}, status={self.status.value})")
