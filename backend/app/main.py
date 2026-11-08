from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import Base, engine, SessionLocal
from app.models import ParkingSpot
from app.routers import spots, bookings, ai, auth, owner
from app.config import DATABASE_URL, GEMINI_API_KEY, ENVIRONMENT

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="ParkU Smart Parking API",
    description="FastAPI Backend for ParkU Mobile App with PostgreSQL/SQLite, Gemini AI, and Render hosting",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Native Expo development and Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include Routers
app.include_router(auth.router)
app.include_router(owner.router)
app.include_router(spots.router)
app.include_router(bookings.router)
app.include_router(ai.router)

@app.get("/")
def root():
    db_type = "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite"
    ai_status = "Configured" if bool(GEMINI_API_KEY) else "Key not set (Fallback heuristics active)"
    return {
        "app": "ParkU API",
        "status": "online",
        "version": "1.0.0",
        "database": db_type,
        "gemini_ai": ai_status,
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

