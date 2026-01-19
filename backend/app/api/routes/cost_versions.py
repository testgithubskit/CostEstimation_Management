"""
Cost Versioning Routes - UPDATED WITH MISCELLANEOUS COSTS AND UPDATE SUPPORT
File: app/api/routes/cost_versions.py
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.database import (
    Operation, 
    ProjectCostVersion, 
    ProjectCostSummary,
    MachineMaster,
    MiscellaneousCost
)

router = APIRouter(prefix="/cost-versions", tags=["Cost Versioning"])


class OperationCostInput(BaseModel):
    """Single operation cost input"""
    operation_id: int
    operation_no: str
    selected_machine_model: str
    calculated_cost: float


class SaveCostVersionRequest(BaseModel):
    """Request to save or update a cost version"""
    project_id: int
    operation_costs: List[OperationCostInput]
    notes: Optional[str] = None
    mode: Optional[str] = "new"  # "new" or "update"
    target_version_no: Optional[int] = None  # Required when mode = "update"


@router.post("/save", summary="Save or update a cost version")
async def save_cost_version(
    request: SaveCostVersionRequest,
    db: Session = Depends(get_db)
):
    """
    Save calculated costs as a new version or update an existing version.
    
    Modes:
    - "new": Creates a new version (default)
    - "update": Updates an existing version (requires target_version_no)
    
    This creates/updates:
    1. One record in project_cost_summary with operational cost
    2. Multiple records in project_cost_versions (one per operation)
    
    Note: Miscellaneous costs are added separately via /miscellaneous-costs/save
    """
    
    if not request.operation_costs:
        raise HTTPException(
            status_code=400,
            detail="No operation costs provided"
        )
    
    # Calculate total operational cost
    total_operational_cost = sum(op.calculated_cost for op in request.operation_costs)
    
    try:
        # UPDATE MODE: Update existing version
        if request.mode == "update":
            if not request.target_version_no:
                raise HTTPException(
                    status_code=400,
                    detail="target_version_no is required when mode is 'update'"
                )
            
            # Check if version exists
            summary = db.query(ProjectCostSummary).filter(
                ProjectCostSummary.project_id == request.project_id,
                ProjectCostSummary.version_no == request.target_version_no
            ).first()
            
            if not summary:
                raise HTTPException(
                    status_code=404,
                    detail=f"Version {request.target_version_no} not found for project {request.project_id}"
                )
            
            # Get existing miscellaneous cost to preserve it
            existing_misc_cost = summary.miscellaneous_cost
            
            # Update summary with new operational cost
            summary.operational_cost = total_operational_cost
            summary.total_cost = total_operational_cost + existing_misc_cost
            if request.notes is not None:
                summary.notes = request.notes
            
            # Delete old operation details for this version
            db.query(ProjectCostVersion).filter(
                ProjectCostVersion.project_id == request.project_id,
                ProjectCostVersion.version_no == request.target_version_no
            ).delete()
            
            # Create new operation detail records
            for op_cost in request.operation_costs:
                version_detail = ProjectCostVersion(
                    project_id=request.project_id,
                    version_no=request.target_version_no,
                    operation_no=op_cost.operation_no,
                    selected_machine_model=op_cost.selected_machine_model,
                    calculated_cost=op_cost.calculated_cost,
                    notes=request.notes
                )
                db.add(version_detail)
            
            db.commit()
            db.refresh(summary)
            
            return {
                "success": True,
                "message": f"Cost version {request.target_version_no} updated successfully",
                "version_no": request.target_version_no,
                "operational_cost": round(total_operational_cost, 2),
                "miscellaneous_cost": round(existing_misc_cost, 2),
                "total_cost": round(summary.total_cost, 2),
                "operations_count": len(request.operation_costs),
                "created_at": summary.created_at.isoformat()
            }
        
        # NEW MODE: Create new version
        else:
            # Get next version number
            existing_summaries = db.query(ProjectCostSummary).filter(
                ProjectCostSummary.project_id == request.project_id
            ).all()
            
            next_version = len(existing_summaries) + 1
            
            # Create summary record with operational cost
            summary = ProjectCostSummary(
                project_id=request.project_id,
                version_no=next_version,
                operational_cost=total_operational_cost,
                miscellaneous_cost=0.0,  # Will be updated when misc costs are added
                total_cost=total_operational_cost,  # Initially same as operational
                notes=request.notes
            )
            db.add(summary)
            db.flush()  # Get summary ID
            
            # Create operation detail records
            for op_cost in request.operation_costs:
                version_detail = ProjectCostVersion(
                    project_id=request.project_id,
                    version_no=next_version,
                    operation_no=op_cost.operation_no,
                    selected_machine_model=op_cost.selected_machine_model,
                    calculated_cost=op_cost.calculated_cost,
                    notes=request.notes
                )
                db.add(version_detail)
            
            db.commit()
            db.refresh(summary)
            
            return {
                "success": True,
                "message": f"Cost version {next_version} saved successfully",
                "version_no": next_version,
                "operational_cost": round(total_operational_cost, 2),
                "miscellaneous_cost": 0.0,
                "total_cost": round(total_operational_cost, 2),
                "operations_count": len(request.operation_costs),
                "created_at": summary.created_at.isoformat(),
                "note": "Add miscellaneous costs via /miscellaneous-costs/save endpoint"
            }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error saving version: {str(e)}"
        )

@router.get("/project/{project_id}", summary="Get all versions for a project")
async def get_project_versions(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all saved cost versions for a project.
    Returns summary information for each version.
    """
    
    summaries = db.query(ProjectCostSummary).filter(
        ProjectCostSummary.project_id == project_id
    ).order_by(ProjectCostSummary.version_no).all()
    
    if not summaries:
        return {
            "success": True,
            "project_id": project_id,
            "total_versions": 0,
            "versions": [],
            "message": "No cost versions found. Calculate costs and save a version."
        }
    
    version_list = []
    for summary in summaries:
        # Count operations in this version
        op_count = db.query(ProjectCostVersion).filter(
            ProjectCostVersion.project_id == project_id,
            ProjectCostVersion.version_no == summary.version_no
        ).count()
        
        version_list.append({
            "version_no": summary.version_no,
            "operational_cost": round(summary.operational_cost, 2),
            "miscellaneous_cost": round(summary.miscellaneous_cost, 2),
            "total_cost": round(summary.total_cost, 2),
            "operations_count": op_count,
            "notes": summary.notes,
            "created_at": summary.created_at.isoformat()
        })
    
    return {
        "success": True,
        "project_id": project_id,
        "total_versions": len(summaries),
        "versions": version_list
    }


@router.get("/version/{project_id}/{version_no}", summary="Get version details")
async def get_version_detail(
    project_id: int,
    version_no: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific version,
    including operation-level breakdown and miscellaneous costs.
    """
    
    # Get summary
    summary = db.query(ProjectCostSummary).filter(
        ProjectCostSummary.project_id == project_id,
        ProjectCostSummary.version_no == version_no
    ).first()
    
    if not summary:
        raise HTTPException(
            status_code=404,
            detail=f"Version {version_no} not found for project {project_id}"
        )
    
    # Get operation details
    operations = db.query(ProjectCostVersion).filter(
        ProjectCostVersion.project_id == project_id,
        ProjectCostVersion.version_no == version_no
    ).order_by(ProjectCostVersion.operation_no).all()
    
    # Get operation names and details
    operation_list = []
    for op_version in operations:
        # Get operation details from operations table
        operation = db.query(Operation).filter(
            Operation.project_id == project_id,
            Operation.oprn_no == op_version.operation_no
        ).first()
        
        # Get machine hourly rate
        machines = db.query(MachineMaster).filter(
            MachineMaster.work_center_code == operation.wc if operation else None
        ).all()
        
        hourly_rate = None
        machine_make = None
        for m in machines:
            display_val = m.work_center_type if m.machine_model == "DEFAULT" else m.machine_model
            if display_val == op_version.selected_machine_model:
                hourly_rate = m.hourly_rate
                machine_make = m.machine_make
                break
        
        operation_list.append({
            "operation_no": op_version.operation_no,
            "operation_name": operation.operation if operation else None,
            "wc": operation.wc if operation else None,
            "selected_machine": op_version.selected_machine_model,
            "machine_make": machine_make,
            "hourly_rate": hourly_rate,
            "setup_time_hrs": operation.setup_time_hrs if operation else None,
            "per_pc_time_hrs": operation.per_pc_time_hrs if operation else None,
            "total_qty": operation.total_qty if operation else None,
            "calculated_cost": round(op_version.calculated_cost, 2),
            "notes": op_version.notes
        })
    
    # Get miscellaneous costs for this version
    misc_costs = db.query(MiscellaneousCost).filter(
        MiscellaneousCost.project_id == project_id,
        MiscellaneousCost.version_no == version_no
    ).order_by(MiscellaneousCost.cost_type).all()
    
    misc_cost_list = []
    for misc in misc_costs:
        misc_cost_list.append({
            "id": misc.id,
            "cost_type": misc.cost_type,
            "cost_value": round(misc.cost_value, 2),
            "description": misc.description
        })
    
    return {
        "success": True,
        "version": {
            "project_id": project_id,
            "version_no": version_no,
            "operational_cost": round(summary.operational_cost, 2),
            "miscellaneous_cost": round(summary.miscellaneous_cost, 2),
            "total_cost": round(summary.total_cost, 2),
            "notes": summary.notes,
            "created_at": summary.created_at.isoformat(),
            "operations": operation_list,
            "miscellaneous_costs": misc_cost_list
        }
    }


@router.get("/compare/{project_id}", summary="Compare all versions")
async def compare_versions(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Compare all cost versions for a project to see changes over time.
    """
    
    summaries = db.query(ProjectCostSummary).filter(
        ProjectCostSummary.project_id == project_id
    ).order_by(ProjectCostSummary.version_no).all()
    
    if len(summaries) < 2:
        return {
            "success": True,
            "message": "Need at least 2 versions to compare",
            "project_id": project_id,
            "versions_count": len(summaries)
        }
    
    # Build comparison
    comparison = []
    for i, summary in enumerate(summaries):
        version_data = {
            "version_no": summary.version_no,
            "operational_cost": round(summary.operational_cost, 2),
            "miscellaneous_cost": round(summary.miscellaneous_cost, 2),
            "total_cost": round(summary.total_cost, 2),
            "created_at": summary.created_at.isoformat()
        }
        
        # Calculate delta from previous version
        if i > 0:
            prev_cost = summaries[i-1].total_cost
            delta = summary.total_cost - prev_cost
            delta_percent = (delta / prev_cost * 100) if prev_cost > 0 else 0
            
            version_data["delta_from_previous"] = {
                "amount": round(delta, 2),
                "percentage": round(delta_percent, 2)
            }
        
        comparison.append(version_data)
    
    return {
        "success": True,
        "project_id": project_id,
        "total_versions": len(summaries),
        "comparison": comparison,
        "cost_range": {
            "lowest": round(min(s.total_cost for s in summaries), 2),
            "highest": round(max(s.total_cost for s in summaries), 2)
        }
    }


@router.delete("/version/{project_id}/{version_no}", summary="Delete a version")
async def delete_version(
    project_id: int,
    version_no: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific cost version.
    This deletes the summary, all operation details, and miscellaneous costs.
    """
    
    # Check if version exists
    summary = db.query(ProjectCostSummary).filter(
        ProjectCostSummary.project_id == project_id,
        ProjectCostSummary.version_no == version_no
    ).first()
    
    if not summary:
        raise HTTPException(
            status_code=404,
            detail=f"Version {version_no} not found"
        )
    
    try:
        # Delete operation details
        db.query(ProjectCostVersion).filter(
            ProjectCostVersion.project_id == project_id,
            ProjectCostVersion.version_no == version_no
        ).delete()
        
        # Delete miscellaneous costs
        db.query(MiscellaneousCost).filter(
            MiscellaneousCost.project_id == project_id,
            MiscellaneousCost.version_no == version_no
        ).delete()
        
        # Delete summary
        db.delete(summary)
        db.commit()
        
        return {
            "success": True,
            "message": f"Version {version_no} deleted successfully",
            "project_id": project_id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting version: {str(e)}"
        )


@router.get("/operation-changes/{project_id}/{operation_no}", summary="Track operation cost across versions")
async def get_operation_cost_history(
    project_id: int,
    operation_no: str,
    db: Session = Depends(get_db)
):
    """
    See how a specific operation's cost changed across versions.
    Useful for understanding which operations had cost changes.
    """
    
    operation_versions = db.query(ProjectCostVersion).filter(
        ProjectCostVersion.project_id == project_id,
        ProjectCostVersion.operation_no == operation_no
    ).order_by(ProjectCostVersion.version_no).all()
    
    if not operation_versions:
        raise HTTPException(
            status_code=404,
            detail=f"No version data found for operation {operation_no}"
        )
    
    history = []
    for i, op_ver in enumerate(operation_versions):
        version_data = {
            "version_no": op_ver.version_no,
            "selected_machine": op_ver.selected_machine_model,
            "cost": round(op_ver.calculated_cost, 2),
            "created_at": op_ver.created_at.isoformat()
        }
        
        # Calculate delta from previous version
        if i > 0:
            prev_cost = operation_versions[i-1].calculated_cost
            delta = op_ver.calculated_cost - prev_cost
            version_data["cost_change"] = round(delta, 2)
            version_data["machine_changed"] = (
                op_ver.selected_machine_model != 
                operation_versions[i-1].selected_machine_model
            )
        
        history.append(version_data)
    
    return {
        "success": True,
        "project_id": project_id,
        "operation_no": operation_no,
        "total_versions": len(history),
        "history": history
    }