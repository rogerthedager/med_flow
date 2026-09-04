from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/medflow_dev"
    secret_key: str
    frontend_origin: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env")
    
settings = Settings()