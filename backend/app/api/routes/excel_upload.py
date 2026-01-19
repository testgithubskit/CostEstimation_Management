"""
Excel Upload Route for Machine Master Data - UPDATED FOR NEW SCHEMA
File: app/api/routes/excel_upload.py

ADDED: Manual data entry endpoint
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd
import io
from typing import Optional
import logging
from pydantic import BaseModel

from app.core.database import get_db
from app.models.database import MachineMaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin - Data Upload"])

@router.get("/machine-data", summary="List all machine master records")
async def list_machine_data(db: Session = Depends(get_db)):
    records = db.query(MachineMaster).order_by(MachineMaster.work_center_code, MachineMaster.machine_model).all()
    return {
        "success": True,
        "count": len(records),
        "machines": [
            {
                "id": m.id,
                "Work_Center_ID": m.work_center_id,
                "Work_Center_Code": m.work_center_code,
                "Work_Center_Type": m.work_center_type,
                "Machine_Make": m.machine_make,
                "Machine_Model": m.machine_model,
                "Hourly_Rate": m.hourly_rate,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in records
        ],
    }

class UpdateRateRequest(BaseModel):
    hourly_rate: float

class CreateMachineRequest(BaseModel):
    work_center_id: Optional[int] = None
    work_center_code: str
    work_center_type: str
    machine_make: str
    machine_model: str
    hourly_rate: float

@router.post("/machine", summary="Create machine record manually")
async def create_machine(
    payload: CreateMachineRequest,
    db: Session = Depends(get_db)
):
    """Create a single machine master record manually"""
    try:
        # Check if record already exists
        existing = db.query(MachineMaster).filter(
            MachineMaster.work_center_code == payload.work_center_code.strip().upper(),
            MachineMaster.machine_model == payload.machine_model.strip()
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Machine already exists: {payload.work_center_code} - {payload.machine_model}"
            )
        
        # Create new machine record
        machine = MachineMaster(
            work_center_id=payload.work_center_id,
            work_center_code=payload.work_center_code.strip().upper(),
            work_center_type=payload.work_center_type.strip(),
            machine_make=payload.machine_make.strip(),
            machine_model=payload.machine_model.strip(),
            hourly_rate=float(payload.hourly_rate)
        )
        
        db.add(machine)
        db.commit()
        db.refresh(machine)
        
        return {
            "success": True,
            "message": "Machine record created successfully",
            "machine": {
                "id": machine.id,
                "Work_Center_Code": machine.work_center_code,
                "Machine_Model": machine.machine_model,
                "Hourly_Rate": machine.hourly_rate
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/machine/{machine_id}/hourly-rate", summary="Update machine hourly rate")
async def update_hourly_rate(
    machine_id: int,
    payload: UpdateRateRequest,
    db: Session = Depends(get_db)
):
    """Update only the hourly rate for a machine master record"""
    machine = db.query(MachineMaster).filter(MachineMaster.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine record not found")
    try:
        machine.hourly_rate = float(payload.hourly_rate)
        db.commit()
        db.refresh(machine)
        return {
            "success": True,
            "machine_id": machine.id,
            "hourly_rate": machine.hourly_rate
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/machine/{machine_id}", summary="Delete machine record")
async def delete_machine(
    machine_id: int,
    db: Session = Depends(get_db)
):
    """Delete a single machine master record"""
    machine = db.query(MachineMaster).filter(MachineMaster.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine record not found")
    
    try:
        db.delete(machine)
        db.commit()
        return {
            "success": True,
            "message": "Machine record deleted successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-machine-data", summary="Upload machine master data from Excel")
async def upload_machine_excel(
    file: UploadFile = File(..., description="Excel file with machine data"),
    replace_existing: bool = False,
    db: Session = Depends(get_db)
):
    """
    Upload machine master data from Excel file
    
    Expected Excel columns:
    - Work_Center_ID (optional)
    - Work_Center_Code (required)
    - Work_Center_Type (required)
    - Machine_Make (required)
    - Machine_Model (required)
    - Hourly_Rate (required, in ₹/hr)
    
    Parameters:
    - file: Excel file (.xlsx or .xls)
    - replace_existing: If True, deletes all existing data before upload
    """
    
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400, 
            detail="File must be Excel format (.xlsx or .xls)"
        )
    
    try:
        # Read Excel file
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        # Log available columns for debugging
        logger.info(f"Excel columns found: {list(df.columns)}")
        
        # Flexible column mapping - handle different column name variations
        column_mapping = {}
        for col in df.columns:
            col_lower = col.lower().replace('_', '').replace(' ', '')
            if 'workcenterid' in col_lower:
                column_mapping['Work_Center_ID'] = col
            elif 'workcentercode' in col_lower:
                column_mapping['Work_Center_Code'] = col
            elif 'workcentertype' in col_lower:
                column_mapping['Work_Center_Type'] = col
            elif 'machinemake' in col_lower:
                column_mapping['Machine_Make'] = col
            elif 'machinemodel' in col_lower:
                column_mapping['Machine_Model'] = col
            elif 'hourlyrate' in col_lower or 'rate' in col_lower:
                column_mapping['Hourly_Rate'] = col
        
        logger.info(f"Column mapping: {column_mapping}")
        
        # Validate required columns
        required_columns = [
            'Work_Center_Code', 
            'Work_Center_Type', 
            'Machine_Make', 
            'Machine_Model', 
            'Hourly_Rate'
        ]
        
        missing_columns = [col for col in required_columns if col not in column_mapping]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}. Found columns: {list(df.columns)}"
            )
        
        # Rename columns to standard names
        df = df.rename(columns={v: k for k, v in column_mapping.items()})
        
        # Clean data
        df = df.dropna(subset=['Work_Center_Code', 'Machine_Model', 'Hourly_Rate'])
        df = df.fillna('')
        
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid data found in Excel file"
            )
        
        # Replace existing data if requested
        if replace_existing:
            logger.info("🗑️ Deleting existing machine master data...")
            db.execute(text("DELETE FROM machine_master"))
            db.commit()
            logger.info("✅ Existing data cleared")
        
        # Insert new data
        logger.info(f"📥 Uploading {len(df)} machine records...")
        
        inserted_count = 0
        skipped_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Check if record already exists (based on work_center_code + machine_model)
                existing = db.query(MachineMaster).filter(
                    MachineMaster.work_center_code == str(row['Work_Center_Code']).strip().upper(),
                    MachineMaster.machine_model == str(row['Machine_Model']).strip()
                ).first()
                
                if existing and not replace_existing:
                    skipped_count += 1
                    continue
                
                # Create new machine record
                machine = MachineMaster(
                    work_center_id=int(row['Work_Center_ID']) if 'Work_Center_ID' in row and pd.notna(row['Work_Center_ID']) else None,
                    work_center_code=str(row['Work_Center_Code']).strip().upper(),
                    work_center_type=str(row['Work_Center_Type']).strip() if pd.notna(row['Work_Center_Type']) else None,
                    machine_make=str(row['Machine_Make']).strip() if pd.notna(row['Machine_Make']) else None,
                    machine_model=str(row['Machine_Model']).strip() if pd.notna(row['Machine_Model']) else None,
                    hourly_rate=float(row['Hourly_Rate']) if pd.notna(row['Hourly_Rate']) else 0.0
                )
                
                db.add(machine)
                inserted_count += 1
                
            except Exception as e:
                errors.append(f"Row {idx + 2}: {str(e)}")
                continue
        
        db.commit()
        
        # Get summary by work center
        summary = db.execute(text("""
            SELECT work_center_code, 
                   COUNT(*) as machine_count,
                   MIN(hourly_rate) as min_rate,
                   MAX(hourly_rate) as max_rate
            FROM machine_master
            GROUP BY work_center_code
            ORDER BY work_center_code
        """)).fetchall()
        
        work_center_summary = [
            {
                "work_center": row[0],
                "machines": row[1],
                "rate_range": f"₹{row[2]}-{row[3]}" if row[2] != row[3] else f"₹{row[2]}"
            }
            for row in summary
        ]
        
        return {
            "success": True,
            "message": f"Machine data uploaded successfully",
            "inserted": inserted_count,
            "skipped": skipped_count,
            "errors": errors if errors else None,
            "total_records": len(df),
            "work_center_summary": work_center_summary
        }
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="Excel file is empty")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing Excel file: {str(e)}"
        )


@router.delete("/clear-machine-data", summary="Clear all machine master data")
async def clear_machine_data(
    confirm: bool = False,
    db: Session = Depends(get_db)
):
    """
    Clear all machine master data from database
    USE WITH CAUTION!
    """
    
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Must set confirm=true to delete all machine data"
        )
    
    try:
        result = db.execute(text("DELETE FROM machine_master"))
        count = result.rowcount
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {count} machine records",
            "deleted_count": count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/machine-data-stats", summary="Get machine data statistics")
async def get_machine_stats(db: Session = Depends(get_db)):
    """Get statistics about uploaded machine data"""
    
    stats = db.execute(text("""
        SELECT 
            COUNT(*) as total_machines,
            COUNT(DISTINCT work_center_code) as total_work_centers,
            MIN(hourly_rate) as min_rate,
            MAX(hourly_rate) as max_rate,
            AVG(hourly_rate) as avg_rate
        FROM machine_master
    """)).fetchone()
    
    by_work_center = db.execute(text("""
        SELECT work_center_code, 
               COUNT(*) as count
        FROM machine_master
        GROUP BY work_center_code
        ORDER BY work_center_code
    """)).fetchall()
    
    return {
        "success": True,
        "total_machines": stats[0],
        "total_work_centers": stats[1],
        "rate_statistics": {
            "min": stats[2],
            "max": stats[3],
            "average": round(stats[4], 2) if stats[4] else 0
        },
        "by_work_center": [
            {"work_center": row[0], "machines": row[1]}
            for row in by_work_center
        ]
    }