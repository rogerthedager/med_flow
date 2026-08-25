from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


if TYPE_CHECKING:
    from .hospital import Hospital
    from .work_order import Work_Order


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[int] = mapped_column(primary_key = True)
    name: Mapped[str] = mapped_column(String(100))
    #foreign key
    hosipital_id: Mapped[int] = mapped_column(Integer, ForeignKey("hosipital.id"))

    hospital: Mapped["Facility"] = relationship(back_populates="technicians")
    work_order: Mapped[list["Work_Order"]] = relationship(back_populates="technician")

    def __repr__(self) -> str:
            return (f"Operator(id={self.id}, name={self.name!r}, "
                    f"facility_id={self.facility_id})")