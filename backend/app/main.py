"""
Main FastAPI Application - UPDATED
File: app/main.py
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db

# Import all routers
from app.api.routes import projects, machines, excel_upload, cost_versions, miscellaneous_costs


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Cost Estimation Software with Machine Data Upload and Cost Versioning"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(machines.router, prefix=settings.API_V1_STR)
app.include_router(excel_upload.router, prefix=settings.API_V1_STR)
app.include_router(cost_versions.router, prefix=settings.API_V1_STR)
app.include_router(miscellaneous_costs.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("✅ Database initialized")

@app.get("/")
async def root():
    return {
        "message": "Cost Estimation Software API",
        "version": settings.VERSION,
        "docs": "/docs",
        "features": [
            "Project Management",
            "Machine Data Upload from Excel",
            "Cost Calculation",
            "Cost Versioning (v1, v2, v3...)",
            "3D Model Viewing"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}