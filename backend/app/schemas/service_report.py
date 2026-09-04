from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ServiceReportRead(BaseModel):
    id: int
    work_order_id: int
    file_url: str
    notes: str | None
    created_at: datetime
    download_url: str | None = None

    model_config = ConfigDict(from_attributes=True)
