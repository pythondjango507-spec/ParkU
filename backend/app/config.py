import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Database Configuration
# Anchor local SQLite database file to backend directory: D:\ReactNative_Projects\ParkU\backend\parku.db
db_file = (Path(__file__).resolve().parent.parent / "parku.db").as_posix()

raw_database_url = os.getenv("DATABASE_URL", "").strip()
if raw_database_url.startswith("postgres://"):
    DATABASE_URL = raw_database_url.replace("postgres://", "postgresql://", 1)
elif "postgresql" in raw_database_url:
    DATABASE_URL = raw_database_url
else:
    # Always use the absolute path to backend/parku.db for SQLite
    DATABASE_URL = f"sqlite:///{db_file}"

# Google Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

# JWT & Security Secret Key
SECRET_KEY = os.getenv("SECRET_KEY", "parku_sec_7f9a2b8e3c4d1e5a6f8b0c2d4e6a8f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", 30))

# Server configuration
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

