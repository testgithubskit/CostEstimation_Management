from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import io
import logging

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.models.database import Project, ProjectFile, Operation
from app.services.pdf_extractor import PDFExtractorService
from app.services.file_service import FileService
from app.schemas.project_schemas import OARCDataResponse, ErrorResponse

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post(
    "/",
    response_model=Dict,
    summary="Create new project with file uploads"
)
async def create_project(
    oarc_file: UploadFile = File(..., description="OARC PDF file"),
    drawing_2d_file: Optional[UploadFile] = File(None, description="2D Drawing PDF file"),
    drawing_3d_file: Optional[UploadFile] = File(None, description="3D STEP file"),
    db: Session = Depends(get_db)
):
    """
    Create a new project by uploading OARC file. 2D and 3D files are optional.
    Operations are stored WITHOUT cost calculation fields.
    """
    
    # Validate file types
    if not oarc_file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="OARC file must be PDF")
    
    if drawing_2d_file is not None and (not drawing_2d_file.filename.lower().endswith('.pdf')):
        raise HTTPException(status_code=400, detail="2D drawing must be PDF")
    
    if drawing_3d_file is not None and (not FileService.validate_file_type(drawing_3d_file.filename, '3d')):
        raise HTTPException(status_code=400, detail="3D file must be STEP/STL format")
    
    try:
        # Read file contents
        oarc_content = await oarc_file.read()
        drawing_2d_content = await drawing_2d_file.read() if drawing_2d_file is not None else None
        drawing_3d_content = await drawing_3d_file.read() if drawing_3d_file is not None else None
        
        # Process OARC PDF to extract data
        extracted_data = PDFExtractorService.process_pdf(oarc_content)
        project_details = extracted_data["project_details"]
        operations_data = extracted_data["operations"]
        
        # Create project record
        project = Project(
            project_name=project_details.get("project_name", "Unnamed Project"),
            part_no=project_details.get("part_no"),
            wbs=project_details.get("wbs"),
            sale_order=project_details.get("sale_order"),
            part_desc=project_details.get("part_desc"),
            total_no_of_oprns=int(project_details.get("total_no_of_oprns", 0)) if project_details.get("total_no_of_oprns") else None,
            plant=project_details.get("plant"),
            rtg_seq_no=project_details.get("rtg_seq_no"),
            sequence_no=project_details.get("sequence_no"),
            required_qty=int(project_details.get("required_qty", 0)) if project_details.get("required_qty") else None,
            launched_qty=int(project_details.get("launched_qty", 0)) if project_details.get("launched_qty") else None,
            prod_order_no=project_details.get("prod_order_no"),
            last_changed_by=project_details.get("last_changed_by"),
            last_changed_dt=project_details.get("last_changed_dt"),
            created_by=project_details.get("created_by"),
            change_number=project_details.get("change_number"),
            destination=project_details.get("destination"),
            storage_bin=project_details.get("storage_bin"),
            status="completed"
        )
        
        db.add(project)
        db.flush()  # Get project ID
        
        # Store OARC file
        oarc_file_record = ProjectFile(
            project_id=project.id,
            file_type="oarc",
            filename=oarc_file.filename,
            file_size=len(oarc_content),
            mime_type=oarc_file.content_type,
            file_data=oarc_content
        )
        db.add(oarc_file_record)
        
        # Store 2D drawing (optional)
        if drawing_2d_file is not None and drawing_2d_content is not None:
            drawing_2d_record = ProjectFile(
                project_id=project.id,
                file_type="2d",
                filename=drawing_2d_file.filename,
                file_size=len(drawing_2d_content),
                mime_type=drawing_2d_file.content_type,
                file_data=drawing_2d_content
            )
            db.add(drawing_2d_record)
        
        # Process and store 3D file (optional)
        if drawing_3d_file is not None and drawing_3d_content is not None:
            original_3d, converted_3d = await FileService.process_3d_file(
                drawing_3d_content, 
                drawing_3d_file.filename
            )
            
            drawing_3d_record = ProjectFile(
                project_id=project.id,
                file_type="3d",
                filename=drawing_3d_file.filename,
                file_size=len(original_3d),
                mime_type=drawing_3d_file.content_type,
                file_data=original_3d,
                converted_data=converted_3d if converted_3d else None
            )
            db.add(drawing_3d_record)
        
        # Store operations (SIMPLIFIED - no cost fields)
        for op_data in operations_data:
            # Extract values
            per_pc_time = float(op_data.get("per_pc_time_hrs", 0)) if op_data.get("per_pc_time_hrs") else 0.0
            total_qty = int(op_data.get("total_qty", 0)) if op_data.get("total_qty") else 0
            setup_time = float(op_data.get("setup_time_hrs", 0)) if op_data.get("setup_time_hrs") else 0.0
            
            # CALCULATE allowed_time_hrs instead of using extracted value
            # Formula: (per_pc_time_hrs × total_qty) + setup_time_hrs
            calculated_allowed_time = (per_pc_time * total_qty) + setup_time
            
            operation = Operation(
                project_id=project.id,
                oprn_no=op_data.get("oprn_no"),
                wc=op_data.get("wc"),
                plant_id=op_data.get("plant_id"),
                operation=op_data.get("operation"),
                setup_time_hrs=setup_time,
                per_pc_time_hrs=per_pc_time,
                jump_qty=int(op_data.get("jump_qty", 0)) if op_data.get("jump_qty") else None,
                total_qty=total_qty,
                allowed_time_hrs=calculated_allowed_time,  # CALCULATED VALUE
                actual_time_hrs=float(op_data.get("actual_time_hrs", 0)) if op_data.get("actual_time_hrs") else None,
                confirm_no=op_data.get("confirm_no")
            )
            db.add(operation)
        
        db.commit()
        db.refresh(project)
        
        return {
            "success": True,
            "message": "Project created successfully",
            "project_id": project.id,
            "project_name": project.project_name,
            "operations_count": len(operations_data)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")


@router.get("/", summary="Get all projects")
async def get_all_projects(db: Session = Depends(get_db)):
    """Get list of all completed projects"""
    
    projects = db.query(Project).filter(Project.status == "completed").all()
    
    return {
        "success": True,
        "count": len(projects),
        "projects": [
            {
                "id": p.id,
                "project_name": p.project_name,
                "part_no": p.part_no,
                "part_desc": p.part_desc,
                "prod_order_no": p.prod_order_no,
                "total_no_of_oprns": p.total_no_of_oprns,
                "created_at": p.created_at.isoformat(),
                "status": p.status
            }
            for p in projects
        ]
    }


@router.get("/{project_id}", summary="Get project details")
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """
    Get detailed information about a specific project.
    Operations now return ONLY OARC data (no cost fields).
    """
    
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get operations
    operations = db.query(Operation).filter(Operation.project_id == project_id).all()
    
    # Get file info (without actual file data)
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
    
    return {
        "success": True,
        "project": {
            "id": project.id,
            "project_name": project.project_name,
            "part_no": project.part_no,
            "wbs": project.wbs,
            "sale_order": project.sale_order,
            "part_desc": project.part_desc,
            "total_no_of_oprns": project.total_no_of_oprns,
            "plant": project.plant,
            "prod_order_no": project.prod_order_no,
            "created_at": project.created_at.isoformat(),
            "status": project.status
        },
        "operations": [
            {
                "id": op.id,
                "oprn_no": op.oprn_no,
                "wc": op.wc,
                "plant_id": op.plant_id,
                "operation": op.operation,
                "setup_time_hrs": op.setup_time_hrs,
                "per_pc_time_hrs": op.per_pc_time_hrs,
                "jump_qty": op.jump_qty,
                "total_qty": op.total_qty,
                "allowed_time_hrs": op.allowed_time_hrs,
                "actual_time_hrs": op.actual_time_hrs,
                "confirm_no": op.confirm_no
                # NO cost fields returned!
            }
            for op in operations
        ],
        "files": [
            {
                "id": f.id,
                "file_type": f.file_type,
                "filename": f.filename,
                "file_size": f.file_size,
                "uploaded_at": f.uploaded_at.isoformat()
            }
            for f in files
        ]
    }


@router.head("/{project_id}/files/{file_type}", summary="Check file availability")
async def check_file(
    project_id: int, 
    file_type: str,
    db: Session = Depends(get_db)
):
    """
    Check if a file exists and get its size (HEAD method)
    Useful for checking 3d-converted availability without downloading
    """
    is_converted = file_type == '3d-converted'
    actual_file_type = '3d' if is_converted else file_type
    
    project_file = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id,
        ProjectFile.file_type == actual_file_type
    ).first()
    
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if is_converted:
        if not project_file.converted_data:
            raise HTTPException(
                status_code=404, 
                detail="Converted 3D model not available"
            )
        content_length = len(project_file.converted_data)
        media_type = "model/gltf-binary"
    else:
        content_length = project_file.file_size or len(project_file.file_data)
        media_type = project_file.mime_type or "application/octet-stream"
    
    return Response(
        content=b"",  # Empty body for HEAD
        media_type=media_type,
        headers={
            "Content-Length": str(content_length),
            "Access-Control-Allow-Origin": "*"
        }
    )


@router.get("/{project_id}/files/{file_type}", summary="Download project file")
async def download_file(
    project_id: int, 
    file_type: str,
    db: Session = Depends(get_db)
):
    """
    Download a specific file from project
    file_type: 'oarc', '2d', '3d', or '3d-converted'
    """
    
    # Handle 3d-converted separately
    is_converted = file_type == '3d-converted'
    actual_file_type = '3d' if is_converted else file_type
    
    logger.info(f"Fetching file: project_id={project_id}, file_type={file_type}, is_converted={is_converted}")
    
    project_file = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id,
        ProjectFile.file_type == actual_file_type
    ).first()
    
    if not project_file:
        logger.warning(f"File not found: project_id={project_id}, file_type={actual_file_type}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # Return converted 3D file if requested and available
    if is_converted:
        if not project_file.converted_data or len(project_file.converted_data) == 0:
            logger.warning(f"No converted data for project {project_id}")
            raise HTTPException(
                status_code=404, 
                detail="Converted 3D model not available. Please ensure trimesh is installed and re-upload the project."
            )
        
        logger.info(f"Serving converted GLB: {len(project_file.converted_data)} bytes")
        
        return Response(
            content=project_file.converted_data,
            media_type="model/gltf-binary",
            headers={
                "Content-Length": str(len(project_file.converted_data)),
                "Content-Disposition": f'inline; filename="model.glb"',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
                "Cache-Control": "public, max-age=3600"
            }
        )
    
    # Determine proper media type for original files
    media_type = project_file.mime_type or "application/octet-stream"
    
    # For PDFs, use inline disposition to allow viewing in browser
    if file_type in ['oarc', '2d'] and project_file.filename.lower().endswith('.pdf'):
        media_type = "application/pdf"
        disposition = f'inline; filename="{project_file.filename}"'
    else:
        disposition = f'attachment; filename="{project_file.filename}"'
    
    logger.info(f"Serving original file: {project_file.filename}, size: {len(project_file.file_data)} bytes")
    
    # Return original file
    return Response(
        content=project_file.file_data,
        media_type=media_type,
        headers={
            "Content-Length": str(len(project_file.file_data)),
            "Content-Disposition": disposition,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
            "Cache-Control": "no-cache"
        }
    )


# Also add this debugging endpoint (optional but helpful):
@router.get("/{project_id}/files-info", summary="Get file information")
async def get_files_info(project_id: int, db: Session = Depends(get_db)):
    """
    Get information about all files for a project (debugging)
    """
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
    
    if not files:
        raise HTTPException(status_code=404, detail="Project has no files")
    
    return {
        "project_id": project_id,
        "files": [
            {
                "id": f.id,
                "file_type": f.file_type,
                "filename": f.filename,
                "file_size": f.file_size,
                "has_data": f.file_data is not None,
                "data_size": len(f.file_data) if f.file_data else 0,
                "has_converted": f.converted_data is not None if hasattr(f, 'converted_data') else False,
                "converted_size": len(f.converted_data) if hasattr(f, 'converted_data') and f.converted_data else 0,
                "uploaded_at": f.uploaded_at.isoformat()
            }
            for f in files
        ]
    }

@router.get("/{project_id}/files/{file_type}", summary="Download project file")
async def download_file(
    project_id: int, 
    file_type: str,
    db: Session = Depends(get_db)
):
    """
    Download a specific file from project
    file_type: 'oarc', '2d', '3d', or '3d-converted'
    """
    
    # Handle 3d-converted separately
    is_converted = file_type == '3d-converted'
    actual_file_type = '3d' if is_converted else file_type
    
    project_file = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id,
        ProjectFile.file_type == actual_file_type
    ).first()
    
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Return converted 3D file if requested and available
    if is_converted:
        if not project_file.converted_data:
            raise HTTPException(
                status_code=404, 
                detail="Converted 3D model not available. Please download the original file."
            )
        
        return Response(
            content=project_file.converted_data,
            media_type="model/gltf-binary",
            headers={
                "Content-Disposition": f'inline; filename="{project_file.filename}.glb"',
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
            }
        )
    
    # Determine proper media type
    media_type = project_file.mime_type or "application/octet-stream"
    
    # For PDFs, use inline disposition to allow viewing in browser
    if file_type in ['oarc', '2d'] and project_file.filename.lower().endswith('.pdf'):
        media_type = "application/pdf"
        disposition = f'inline; filename="{project_file.filename}"'
    else:
        disposition = f'attachment; filename="{project_file.filename}"'
    
    # Return original file
    return Response(
        content=project_file.file_data,
        media_type=media_type,
        headers={
            "Content-Disposition": disposition,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Cache-Control": "no-cache"
        }
    )


@router.delete("/{project_id}", summary="Delete project")
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project and all associated data"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {
        "success": True,
        "message": "Project deleted successfully"
    }