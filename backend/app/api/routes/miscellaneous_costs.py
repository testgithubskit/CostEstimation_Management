"""
Miscellaneous Costs Routes
File: app/api/routes/miscellaneous_costs.py
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.database import MiscellaneousCost, ProjectCostSummary

router = APIRouter(prefix="/miscellaneous-costs", tags=["Miscellaneous Costs"])


# Predefined cost types
PREDEFINED_COST_TYPES = [
    "Wage Rates",
    "Material Cost",
    "Tooling Cost",
    "CNC Programming Cost",
    "Heat Treatment",
    "Surface Treatment",
    "Weldings",
    "Inspection Cost",
    "Packaging & Forwarding Cost",
    "Fixturing Cost",
    "Other"
]


class MiscCostInput(BaseModel):
    """Single miscellaneous cost input"""
    cost_type: str
    cost_value: float
    description: Optional[str] = None


class SaveMiscCostsRequest(BaseModel):
    """Request to save miscellaneous costs for a version"""
    project_id: int
    version_no: int
    misc_costs: List[MiscCostInput]


@router.get("/cost-types", summary="Get predefined cost types")
async def get_cost_types():
    """
    Get list of predefined miscellaneous cost types
    """
    return {
        "success": True,
        "cost_types": PREDEFINED_COST_TYPES,
        "count": len(PREDEFINED_COST_TYPES)
    }


@router.post("/save", summary="Save miscellaneous costs for a version")
async def save_miscellaneous_costs(
    request: SaveMiscCostsRequest,
    db: Session = Depends(get_db)
):
    """
    Save miscellaneous costs for a specific project version.
    This will:
    1. Delete existing misc costs for this version
    2. Save new misc costs
    3. Update project_cost_summary with breakdown
    """
    
    # Validate cost types
    for misc_cost in request.misc_costs:
        if misc_cost.cost_value < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cost value cannot be negative: {misc_cost.cost_type}"
            )
    
    try:
        # Delete existing misc costs for this version
        db.query(MiscellaneousCost).filter(
            MiscellaneousCost.project_id == request.project_id,
            MiscellaneousCost.version_no == request.version_no
        ).delete()
        
        # Save new misc costs
        total_misc_cost = 0.0
        for misc_cost in request.misc_costs:
            misc_record = MiscellaneousCost(
                project_id=request.project_id,
                version_no=request.version_no,
                cost_type=misc_cost.cost_type,
                cost_value=misc_cost.cost_value,
                description=misc_cost.description
            )
            db.add(misc_record)
            total_misc_cost += misc_cost.cost_value
        
        # Update project_cost_summary
        summary = db.query(ProjectCostSummary).filter(
            ProjectCostSummary.project_id == request.project_id,
            ProjectCostSummary.version_no == request.version_no
        ).first()
        
        if not summary:
            raise HTTPException(
                status_code=404,
                detail=f"Version {request.version_no} not found. Please save operational costs first."
            )
        
        # Update summary with breakdown
        summary.miscellaneous_cost = total_misc_cost
        summary.total_cost = summary.operational_cost + total_misc_cost
        
        db.commit()
        db.refresh(summary)
        
        return {
            "success": True,
            "message": f"Miscellaneous costs saved for version {request.version_no}",
            "version_no": request.version_no,
            "miscellaneous_cost": round(total_misc_cost, 2),
            "operational_cost": round(summary.operational_cost, 2),
            "total_cost": round(summary.total_cost, 2),
            "misc_items_count": len(request.misc_costs)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error saving miscellaneous costs: {str(e)}"
        )


@router.get("/version/{project_id}/{version_no}", summary="Get miscellaneous costs for a version")
async def get_miscellaneous_costs(
    project_id: int,
    version_no: int,
    db: Session = Depends(get_db)
):
    """
    Get all miscellaneous costs for a specific version
    """
    
    misc_costs = db.query(MiscellaneousCost).filter(
        MiscellaneousCost.project_id == project_id,
        MiscellaneousCost.version_no == version_no
    ).order_by(MiscellaneousCost.cost_type).all()
    
    cost_list = []
    total = 0.0
    
    for cost in misc_costs:
        cost_list.append({
            "id": cost.id,
            "cost_type": cost.cost_type,
            "cost_value": round(cost.cost_value, 2),
            "description": cost.description,
            "created_at": cost.created_at.isoformat()
        })
        total += cost.cost_value
    
    return {
        "success": True,
        "project_id": project_id,
        "version_no": version_no,
        "miscellaneous_costs": cost_list,
        "total_miscellaneous_cost": round(total, 2),
        "count": len(cost_list)
    }


@router.put("/update/{cost_id}", summary="Update a single miscellaneous cost")
async def update_miscellaneous_cost(
    cost_id: int,
    cost_value: float,
    description: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update a specific miscellaneous cost item
    """
    
    if cost_value < 0:
        raise HTTPException(
            status_code=400,
            detail="Cost value cannot be negative"
        )
    
    misc_cost = db.query(MiscellaneousCost).filter(
        MiscellaneousCost.id == cost_id
    ).first()
    
    if not misc_cost:
        raise HTTPException(
            status_code=404,
            detail="Miscellaneous cost not found"
        )
    
    try:
        # Update the cost
        old_value = misc_cost.cost_value
        misc_cost.cost_value = cost_value
        if description is not None:
            misc_cost.description = description
        
        # Update summary total
        summary = db.query(ProjectCostSummary).filter(
            ProjectCostSummary.project_id == misc_cost.project_id,
            ProjectCostSummary.version_no == misc_cost.version_no
        ).first()
        
        if summary:
            # Recalculate total miscellaneous cost
            all_misc = db.query(MiscellaneousCost).filter(
                MiscellaneousCost.project_id == misc_cost.project_id,
                MiscellaneousCost.version_no == misc_cost.version_no
            ).all()
            
            total_misc = sum(m.cost_value for m in all_misc)
            summary.miscellaneous_cost = total_misc
            summary.total_cost = summary.operational_cost + total_misc
        
        db.commit()
        
        return {
            "success": True,
            "message": "Miscellaneous cost updated",
            "cost_id": cost_id,
            "old_value": round(old_value, 2),
            "new_value": round(cost_value, 2),
            "total_cost": round(summary.total_cost, 2) if summary else None
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating cost: {str(e)}"
        )


@router.delete("/{cost_id}", summary="Delete a miscellaneous cost")
async def delete_miscellaneous_cost(
    cost_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific miscellaneous cost item
    """
    
    misc_cost = db.query(MiscellaneousCost).filter(
        MiscellaneousCost.id == cost_id
    ).first()
    
    if not misc_cost:
        raise HTTPException(
            status_code=404,
            detail="Miscellaneous cost not found"
        )
    
    try:
        project_id = misc_cost.project_id
        version_no = misc_cost.version_no
        deleted_value = misc_cost.cost_value
        
        db.delete(misc_cost)
        
        # Update summary total
        summary = db.query(ProjectCostSummary).filter(
            ProjectCostSummary.project_id == project_id,
            ProjectCostSummary.version_no == version_no
        ).first()
        
        if summary:
            # Recalculate total miscellaneous cost
            all_misc = db.query(MiscellaneousCost).filter(
                MiscellaneousCost.project_id == project_id,
                MiscellaneousCost.version_no == version_no
            ).all()
            
            total_misc = sum(m.cost_value for m in all_misc)
            summary.miscellaneous_cost = total_misc
            summary.total_cost = summary.operational_cost + total_misc
        
        db.commit()
        
        return {
            "success": True,
            "message": "Miscellaneous cost deleted",
            "deleted_value": round(deleted_value, 2),
            "new_total": round(summary.total_cost, 2) if summary else None
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting cost: {str(e)}"
        )
