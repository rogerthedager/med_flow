from fastapi import FastAPI

from app.routers import equipments


app = FastAPI(
    title="MedFlow Fleet Command Center",
    description="Fleet Management API for Apex Robotics autonomous inspection rovers and aerial drones",
    version="0.1.0"
)

app.include_router(equipments.router)



@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

