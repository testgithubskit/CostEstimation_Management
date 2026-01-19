"""
Updated Pydantic Schemas for Cost Estimation Software
File: app/schemas/project_schemas.py

Schemas updated to match restructured database
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ========================================
# OPERATION SCHEMAS
# ========================================
class OperationDetail(BaseModel):
    """Schema for individual operation details"""
    oprn_no: Optional[str] = Field(None, description="Operation number")
    wc: Optional[str] = Field(None, description="Work center")
    plant_id: Optional[str] = Field(None, description="Plant ID")
    operation: Optional[str] = Field(None, description="Operation name")
    setup_time_hrs: Optional[float] = Field(None, description="Setup time in hours")
    per_pc_time_hrs: Optional[float] = Field(None, description="Per piece time in hours")
    jump_qty: Optional[int] = Field(None, description="Jump quantity")
    total_qty: Optional[int] = Field(None, description="Total quantity")
    allowed_time_hrs: Optional[float] = Field(None, description="Allowed time in hours")
    actual_time_hrs: Optional[float] = Field(None, description="Actual time in hours")
    confirm_no: Optional[str] = Field(None, description="Confirmation number")

    class Config:
        from_attributes = True


class OperationResponse(BaseModel):
    """Response schema for operation with ID"""
    id: int
    project_id: int
    oprn_no: Optional[str]
    wc: Optional[str]
    operation: Optional[str]
    setup_time_hrs: Optional[float]
    per_pc_time_hrs: Optional[float]
    allowed_time_hrs: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ========================================
# MACHINE MASTER SCHEMAS
# ========================================
class MachineMasterBase(BaseModel):
    """Base schema for machine master"""
    work_center_id: Optional[int] = None
    work_center_code: str
    work_center_type: Optional[str] = None
    machine_make: Optional[str] = None
    machine_model: Optional[str] = None
    hourly_rate: Optional[float] = None


class MachineMasterResponse(MachineMasterBase):
    """Response schema for machine master"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ========================================
# COST VERSION SCHEMAS
# ========================================
class OperationCostDetail(BaseModel):
    """Schema for individual operation cost in a version"""
    operation_no: str = Field(..., description="Operation number")
    selected_machine_model: Optional[str] = Field(None, description="Selected machine model")
    calculated_cost: Optional[float] = Field(None, description="Calculated cost for this operation")
    notes: Optional[str] = Field(None, description="Notes for this operation")


class OperationCostResponse(BaseModel):
    """Response schema for operation cost"""
    id: int
    project_id: int
    version_no: int
    operation_no: str
    selected_machine_model: Optional[str]
    calculated_cost: Optional[float]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreateVersionRequest(BaseModel):
    """Request schema to create a new cost version"""
    version_no: int = Field(..., description="Version number (1, 2, 3...)")
    operation_costs: List[OperationCostDetail] = Field(..., description="List of operation costs")


class CostSummaryResponse(BaseModel):
    """Response schema for cost summary"""
    id: int
    project_id: int
    version_no: int
    total_cost: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class VersionDetailResponse(BaseModel):
    """Complete version details with summary and operation costs"""
    summary: CostSummaryResponse
    operations: List[OperationCostResponse]


# ========================================
# PROJECT SCHEMAS
# ========================================
class ProjectDetails(BaseModel):
    """Schema for project header details"""
    project_name: Optional[str] = Field(None, description="Project name")
    part_no: Optional[str] = Field(None, description="Part number")
    wbs: Optional[str] = Field(None, description="Work Breakdown Structure")
    sale_order: Optional[str] = Field(None, description="Sales order number")
    part_desc: Optional[str] = Field(None, description="Part description")
    total_no_of_oprns: Optional[int] = Field(None, description="Total number of operations")
    plant: Optional[str] = Field(None, description="Plant number")
    rtg_seq_no: Optional[str] = Field(None, description="Routing sequence number")
    sequence_no: Optional[str] = Field(None, description="Sequence number")
    required_qty: Optional[int] = Field(None, description="Required quantity")
    launched_qty: Optional[int] = Field(None, description="Launched quantity")
    prod_order_no: Optional[str] = Field(None, description="Production order number")
    last_changed_by: Optional[str] = Field(None, description="Last changed by user ID")
    last_changed_dt: Optional[str] = Field(None, description="Last changed date")
    created_by: Optional[str] = Field(None, description="Created by user")
    change_number: Optional[str] = Field(None, description="Change number")
    destination: Optional[str] = Field(None, description="Destination")
    storage_bin: Optional[str] = Field(None, description="Storage bin")


class ProjectResponse(BaseModel):
    """Response schema for project"""
    id: int
    project_name: Optional[str]
    part_no: Optional[str]
    wbs: Optional[str]
    sale_order: Optional[str]
    part_desc: Optional[str]
    total_no_of_oprns: Optional[int]
    plant: Optional[str]
    status: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectWithOperationsResponse(ProjectResponse):
    """Project response with operations"""
    operations: List[OperationResponse] = []
    
    class Config:
        from_attributes = True


class ProjectWithVersionsResponse(ProjectResponse):
    """Project response with cost versions"""
    cost_summaries: List[CostSummaryResponse] = []
    
    class Config:
        from_attributes = True


# ========================================
# API RESPONSE SCHEMAS
# ========================================
class OARCDataResponse(BaseModel):
    """Complete OARC data response schema"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: Optional[dict] = Field(None, description="Extracted data")


class ErrorResponse(BaseModel):
    """Error response schema"""
    success: bool = Field(False, description="Request success status")
    message: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")


class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = Field(True, description="Request success status")
    message: str = Field(..., description="Success message")
    data: Optional[dict] = Field(None, description="Response data")