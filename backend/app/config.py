from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openrouter_api_key: str
    pinecone_api_key: str
    pinecone_index_name: str = "tenk-rag"
    next_public_api_url: str = "http://localhost:8000"

    class Config:
        env_file = "../../.env"
        env_file_encoding = "utf-8"


settings = Settings()
