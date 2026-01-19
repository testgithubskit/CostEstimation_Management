import io
import tempfile
import os
from typing import Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class FileService:
    """Service for file processing and conversion"""
    
    @staticmethod
    async def process_3d_file(file_content: bytes, filename: str) -> Tuple[bytes, bytes]:
        """
        Process 3D file and convert to GLB format for web viewing
        
        Args:
            file_content: 3D file content as bytes
            filename: Original filename
            
        Returns:
            Tuple of (original_content, converted_glb_content)
        """
        try:
            logger.info(f"Processing 3D file: {filename}")
            ext = Path(filename).suffix.lower()
            
            converted_data = None
            
            # Handle STEP files with FreeCAD
            if ext in ['.step', '.stp', '.iges', '.igs']:
                logger.info(f"{ext.upper()} file detected, attempting FreeCAD conversion...")
                
                try:
                    from app.services.step_converter import StepConverter
                    converted_data = StepConverter.convert_step_to_glb(file_content)
                    
                    if converted_data:
                        logger.info(f"✅ STEP conversion successful: {len(converted_data)} bytes")
                    else:
                        logger.warning("FreeCAD conversion failed, creating placeholder")
                        converted_data = FileService._create_step_placeholder_glb()
                        
                except ImportError:
                    logger.warning("StepConverter not available, creating placeholder")
                    converted_data = FileService._create_step_placeholder_glb()
                except Exception as e:
                    logger.error(f"STEP conversion error: {e}")
                    converted_data = FileService._create_step_placeholder_glb()
            
            # Handle mesh formats with trimesh
            elif ext in ['.stl', '.obj', '.ply', '.off']:
                logger.info(f"{ext.upper()} file detected, converting with trimesh...")
                converted_data = FileService._convert_with_trimesh(file_content, ext)
            
            else:
                logger.warning(f"Unsupported 3D format: {ext}")
            
            if converted_data:
                logger.info(f"3D conversion completed. Output size: {len(converted_data)} bytes")
            else:
                logger.warning("3D conversion not available")
            
            return file_content, converted_data if converted_data else b''
                
        except Exception as e:
            logger.error(f"Error processing 3D file: {str(e)}", exc_info=True)
            return file_content, b''
    
    @staticmethod
    def _convert_with_trimesh(file_content: bytes, file_ext: str) -> bytes:
        """Convert 3D file to GLB using trimesh"""
        try:
            import trimesh
            
            logger.info(f"Loading {file_ext} file with trimesh...")
            
            # Load mesh from bytes
            with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name
            
            try:
                # Load the mesh
                mesh = trimesh.load(tmp_path, force='mesh')
                
                if mesh is not None and hasattr(mesh, 'vertices'):
                    vertex_count = len(mesh.vertices)
                    face_count = len(mesh.faces) if hasattr(mesh, 'faces') else 0
                    
                    logger.info(f"Mesh loaded: {vertex_count} vertices, {face_count} faces")
                    
                    if vertex_count > 0 and not mesh.is_empty:
                        # Export to GLB
                        logger.info("Exporting to GLB format...")
                        glb_data = mesh.export(file_type='glb')
                        
                        result = glb_data if isinstance(glb_data, bytes) else bytes(glb_data)
                        logger.info(f"✅ GLB export successful: {len(result)} bytes")
                        return result
                    else:
                        logger.warning("Mesh is empty or has no vertices")
                else:
                    logger.warning("Failed to load mesh")
                    
            finally:
                try:
                    os.unlink(tmp_path)
                except:
                    pass
            
        except ImportError:
            logger.error("Trimesh not installed. Install with: pip install trimesh[easy]")
        except Exception as e:
            logger.error(f"Trimesh conversion error: {e}", exc_info=True)
        
        return b''
    
    @staticmethod
    def _create_step_placeholder_glb() -> bytes:
        """Create a placeholder GLB for STEP files"""
        try:
            import trimesh
            import numpy as np
            
            logger.info("Creating STEP file placeholder...")
            
            # Create a more interesting shape - a cylinder with text
            box = trimesh.creation.box(extents=[100, 100, 50])
            
            # Add gradient colors
            num_vertices = len(box.vertices)
            colors = np.zeros((num_vertices, 4), dtype=np.uint8)
            
            for i in range(num_vertices):
                z_norm = (box.vertices[i][2] + 25) / 50
                colors[i] = [
                    int(100 + z_norm * 50),
                    int(149 + z_norm * 50),
                    237,
                    255
                ]
            
            box.visual.vertex_colors = colors
            
            # Export to GLB
            glb_data = box.export(file_type='glb')
            result = glb_data if isinstance(glb_data, bytes) else bytes(glb_data)
            
            logger.info(f"Placeholder GLB created: {len(result)} bytes")
            return result
            
        except Exception as e:
            logger.error(f"Placeholder creation failed: {e}", exc_info=True)
        
        return b''
    
    @staticmethod
    async def process_pdf_to_image(pdf_content: bytes) -> bytes:
        """Convert PDF first page to image for preview"""
        try:
            from pdf2image import convert_from_bytes
            
            images = convert_from_bytes(pdf_content, first_page=1, last_page=1)
            
            if images:
                img_byte_arr = io.BytesIO()
                images[0].save(img_byte_arr, format='PNG')
                logger.info(f"PDF converted to image: {len(img_byte_arr.getvalue())} bytes")
                return img_byte_arr.getvalue()
            
            return b''
        except ImportError:
            logger.error("pdf2image not installed")
            return b''
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
            return b''
    
    @staticmethod
    def validate_file_type(filename: str, expected_type: str) -> bool:
        """Validate file extension"""
        ext = Path(filename).suffix.lower()
        
        if expected_type == 'pdf':
            return ext == '.pdf'
        elif expected_type == '3d':
            return ext in ['.step', '.stp', '.iges', '.igs', '.stl', '.obj', '.ply', '.off']
        
        return False