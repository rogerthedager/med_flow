from __future__ import annotations
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship


from .base import Base
from .enums import EquipmentStatus



if TYPE_CHECKING:
    from .hospital import Hospital
    from .work_order import Work_Order

class Equipment(Base):
    __tablename__ = "equipments"

    __table_args__ = (
        CheckConstraint("Charge BETWEEN 0 AND 100",
                        name="charge_level_range"),
    )
    
    id: Mapped[int] = mapped_column(primary_key = True)
    serial_number: Mapped[str] = mapped_column(String(50), unique=True)
    model: Mapped[str] = mapped_column(String(100))

    status: Mapped[EquipmentStatus] = mapped_column(
        SqlEnum(
            EquipmentStatus,
            name="equipment_status",

            value_callable= lambda enum_cls:[member.value for member in enum_cls],
        ),
        default=EquipmentStatus.AVAILIABLE,
    )

    charge_level: Mapped[Decimal]= mapped_column(Numeric(5,2))
    hospital_id: Mapped[int]=mapped_column(Integer, ForeignKey("hospitals.id"))


    hospital: Mapped["Hospital"] = relationship(back_populates="equipments")
    work_order: Mapped[list["Work_Order"]] = relationship(back_populates="equipment")

    LOW_CHARGE_THRESHOLD = 20

    def is_low_charge(self, threshold: int | None = None) -> bool:
        limit = threshold if threshold is not None else Equipment.LOW_CHARGE_THRESHOLD
        return self.charge_level < limit

    def needs_maintenace(self) -> bool:
        return self.status == EquipmentStatus.MAINTENANCE

    def offline(self) -> bool:
        return self.status == EquipmentStatus.OFFLINE

    def __repr__(self) -> str:
        return (f"Equipment(serial={self.serial_number!r}, model={self.model!r}, "
                f"Charge={self.charge_level}%, status={self.status.value})")