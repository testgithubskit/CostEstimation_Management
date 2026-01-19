"""
API Configuration
File: app/core/api.py
"""

# Base API prefix
API_V1_STR = "/api/v1"

# API Endpoints for documentation/reference
class APIEndpoints:
    """Centralized API endpoint definitions"""
    
    # Projects
    PROJECTS_LIST = f"{API_V1_STR}/projects"
    PROJECTS_CREATE = f"{API_V1_STR}/projects/create"
    
    @staticmethod
    def PROJECT_DETAIL(project_id: int) -> str:
        return f"{API_V1_STR}/projects/{project_id}"
    
    @staticmethod
    def PROJECT_DELETE(project_id: int) -> str:
        return f"{API_V1_STR}/projects/{project_id}"
    
    # Files - OARC
    @staticmethod
    def FILE_OARC(project_id: int) -> str:
        return f"{API_V1_STR}/oarc-files/{project_id}"
    
    # Files - 2D
    @staticmethod
    def FILE_2D(project_id: int) -> str:
        return f"{API_V1_STR}/2d-files/{project_id}"
    
    # Files - 3D
    @staticmethod
    def FILE_3D(project_id: int) -> str:
        return f"{API_V1_STR}/3d-files/{project_id}/original"
    
    @staticmethod
    def FILE_3D_CONVERTED(project_id: int) -> str:
        return f"{API_V1_STR}/3d-files/{project_id}/converted"