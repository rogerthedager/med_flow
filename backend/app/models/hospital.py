from __future__ import annotations

#Loading the TYPE_CHECKING constant from the typing modules which is used to indicate that certain
#imports are only needed for type checking and not at runtime
from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
#ORM = Object Relational Mapper
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
if TYPE_CHECKING:
    from .equiment import Equipment

class Hospital(base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key = True)
    name: Mapped[str] = mapped_column(String(100))
    location_region: Mapped[str] = mapped_column(String(50))
    capacity: Mapped[int] = mapped_column(Integer)
    supervisor_id: Mapped[int] = mapped_column(Integer)

    supervisor: Mapped["supervisor"] = relationship(back_populates="hospitals")


    def __repr__(self) -> str:
        return(f"Hospital(id={self.id}, name={self.name!r}),"
               f"region={self.location_region!r}")
