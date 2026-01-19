"""
Machine Selection and Cost Calculation Routes - UPDATED FOR NEW SCHEMA
File: app/api/routes/machines.py
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from pydantic import BaseModel

from app.core.database import get_db
from app.models.database import Operation, MachineMaster

router = APIRouter(prefix="/machines", tags=["Machines"])


class MachineSelectionRequest(BaseModel):
    """Request to select machine for an operation"""
    operation_id: int
    selected_machine_model: str


class CostCalculationResponse(BaseModel):
    """Response with calculated cost details"""
    operation_id: int
    oprn_no: str
    wc: str
    selected_machine: str
    calculated_cost: float
    breakdown: dict


@router.get("/work-center/{wc_code}", summary="Get machines for work center")
async def get_machines_for_wc(wc_code: str, db: Session = Depends(get_db)):
    """
    Get all available machines for a given work center code from database
    
    LOGIC:
    - If machine_model is "DEFAULT", return work_center_type as display value
    - Otherwise, return machine_model as display value
    """
    
    machines = db.query(MachineMaster).filter(
        MachineMaster.work_center_code == wc_code.upper()
    ).all()
    
    if not machines:
        return {
            "success": True,
            "work_center": wc_code,
            "machines": [],
            "message": f"No machines found for work center {wc_code}. Please upload machine data via Excel first."
        }
    
    # Build response with smart display logic
    machine_list = []
    for m in machines:
        # If machine_model is "DEFAULT", show work_center_type
        # Otherwise, show machine_model
        display_value = m.work_center_type if m.machine_model == "DEFAULT" else m.machine_model
        
        machine_list.append({
            "id": m.id,
            "machine_model": m.machine_model,  # Actual value in DB
            "display_value": display_value,     # What to show in dropdown
            "machine_make": m.machine_make,
            "work_center_type": m.work_center_type,
            "hourly_rate": m.hourly_rate,
            "is_default": m.machine_model == "DEFAULT"
        })
    
    return {
        "success": True,
        "work_center": wc_code,
        "machines": machine_list,
        "count": len(machine_list)
    }


@router.post("/calculate-cost", summary="Calculate operation cost (does not save)")
async def calculate_cost(
    operation_id: int,
    selected_machine_model: str,
    db: Session = Depends(get_db)
):
    """
    Calculate cost for an operation WITHOUT saving to database.
    Returns the calculated cost for the frontend to use.
    
    FORMULA: ((per_pc_time_hrs × total_qty) + setup_time_hrs) × hourly_rate
    
    This endpoint only calculates - saving happens when creating a version.
    """
    
    operation = db.query(Operation).filter(
        Operation.id == operation_id
    ).first()
    
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    # Find the machine to get hourly_rate from database
    machines = db.query(MachineMaster).filter(
        MachineMaster.work_center_code == operation.wc
    ).all()
    
    if not machines:
        raise HTTPException(
            status_code=404,
            detail=f"No machines found for work center {operation.wc}. Please upload machine data first."
        )
    
    # Find matching machine
    selected_machine = None
    for m in machines:
        display_val = m.work_center_type if m.machine_model == "DEFAULT" else m.machine_model
        if display_val == selected_machine_model:
            selected_machine = m
            break
    
    if not selected_machine:
        raise HTTPException(
            status_code=404,
            detail=f"Machine data not found for {selected_machine_model}"
        )
    
    # Get values for calculation
    per_pc_time = float(operation.per_pc_time_hrs or 0.0)
    total_qty = int(operation.total_qty or 0)
    setup_time = float(operation.setup_time_hrs or 0.0)
    hourly_rate = float(selected_machine.hourly_rate or 0.0)
    
    # FORMULA: ((per_pc_time × total_qty) + setup_time) × hourly_rate
    total_time_hrs = (per_pc_time * total_qty) + setup_time
    calculated_cost = total_time_hrs * hourly_rate
    
    return {
        "success": True,
        "operation_id": operation.id,
        "oprn_no": operation.oprn_no,
        "wc": operation.wc,
        "operation_name": operation.operation,
        "selected_machine": selected_machine_model,
        "calculated_cost": round(calculated_cost, 2),
        "breakdown": {
            "per_pc_time_hrs": per_pc_time,
            "total_qty": total_qty,
            "setup_time_hrs": setup_time,
            "total_time_hrs": round(total_time_hrs, 4),
            "hourly_rate": hourly_rate,
            "formula": f"(({per_pc_time} × {total_qty}) + {setup_time}) × {hourly_rate} = ₹{round(calculated_cost, 2)}"
        }
    }


@router.get("/project/{project_id}/operations", summary="Get all operations for cost calculation")
async def get_project_operations(project_id: int, db: Session = Depends(get_db)):
    """
    Get all operations for a project to display in cost calculation UI.
    Frontend will call calculate-cost for each operation with selected machine.
    """
    
    operations = db.query(Operation).filter(
        Operation.project_id == project_id
    ).order_by(Operation.oprn_no).all()
    
    if not operations:
        raise HTTPException(
            status_code=404,
            detail="No operations found for this project"
        )
    
    # For each operation, get available machines for its work center
    result_operations = []
    for op in operations:
        # Get machines for this work center
        machines = db.query(MachineMaster).filter(
            MachineMaster.work_center_code == op.wc
        ).all()
        
        machine_options = []
        for m in machines:
            display_val = m.work_center_type if m.machine_model == "DEFAULT" else m.machine_model
            machine_options.append({
                "machine_model": m.machine_model,
                "display_value": display_val,
                "hourly_rate": m.hourly_rate,
                "machine_make": m.machine_make
            })
        
        result_operations.append({
            "id": op.id,
            "oprn_no": op.oprn_no,
            "wc": op.wc,
            "operation": op.operation,
            "setup_time_hrs": op.setup_time_hrs,
            "per_pc_time_hrs": op.per_pc_time_hrs,
            "total_qty": op.total_qty,
            "allowed_time_hrs": op.allowed_time_hrs,
            "available_machines": machine_options
        })
    
    return {
        "success": True,
        "project_id": project_id,
        "total_operations": len(operations),
        "operations": result_operations
    }


@router.get("/check-data", summary="Check if machine data exists")
async def check_machine_data(db: Session = Depends(get_db)):
    """
    Check if machine master data has been uploaded
    Useful for showing upload prompt in frontend
    """
    
    from sqlalchemy import func
    
    total_machines = db.query(func.count(MachineMaster.id)).scalar()
    total_wc = db.query(func.count(func.distinct(MachineMaster.work_center_code))).scalar()
    
    return {
        "success": True,
        "has_data": total_machines > 0,
        "total_machines": total_machines,
        "total_work_centers": total_wc,
        "message": "Machine data exists" if total_machines > 0 else "No machine data found. Please upload Excel file."
    }