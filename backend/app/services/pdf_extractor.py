import PyPDF2
import re
from typing import List, Dict
import io
from app.schemas.project_schemas import ProjectDetails, OperationDetail

class PDFExtractorService:
    """Service class for PDF data extraction"""
    
    @staticmethod
    def extract_text_from_pdf(pdf_file: bytes) -> List[str]:
        """Extract text from each page of PDF"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_file))
            pages_text = []
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                pages_text.append(text)
            
            return pages_text
        except Exception as e:
            raise Exception(f"Error reading PDF: {str(e)}")
    
    @staticmethod
    def extract_project_details(first_page_text: str) -> ProjectDetails:
        """Extract project details from the first page"""
        details = ProjectDetails()
        
        # Extract Last Changed By
        match = re.search(r'Last Change By\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.last_changed_by = match.group(1).strip()
        
        # Extract Last Changed Date
        match = re.search(r'Last Changed Dt\s*:?\s*(\d{2}\.\d{2}\.\d{4})', first_page_text, re.IGNORECASE)
        if match:
            details.last_changed_dt = match.group(1).strip()
        
        # Extract Created By
        match = re.search(r'CreatedBy\s*:?\s*(\w+)', first_page_text, re.IGNORECASE)
        if match:
            details.created_by = match.group(1).strip()
        
        # Extract Change Number
        match = re.search(r'Change Number\s*:?\s*([^\n\r]*?)(?=Destination|\n)', first_page_text, re.IGNORECASE)
        if match:
            change_num = match.group(1).strip()
            if change_num and not change_num.startswith('Destination'):
                details.change_number = change_num
        
        # Extract Destination
        match = re.search(r'Destination\s*:?\s*([^\n\r]*?)(?=Storage Bin|CreatedBy|\n)', first_page_text, re.IGNORECASE)
        if match:
            dest = match.group(1).strip()
            if dest and not dest.startswith('Storage') and not dest.startswith('CreatedBy'):
                details.destination = dest
        
        # Extract Storage Bin
        match = re.search(r'Storage Bin\s*:?\s*([^\n\r]*?)(?=DOCUMENT DETAILS|\n|$)', first_page_text, re.IGNORECASE)
        if match:
            storage = match.group(1).strip()
            if storage and storage != "DOCUMENT DETAILS":
                details.storage_bin = storage
        
        # Extract Project Name
        match = re.search(r'Project Name\s*:?\s*([^:\n]+?)(?=Part No|Sale order)', first_page_text, re.IGNORECASE | re.DOTALL)
        if match:
            details.project_name = match.group(1).strip()
        
        # Extract Part No
        match = re.search(r'Part No\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.part_no = match.group(1).strip()
        
        # Extract WBS
        match = re.search(r'WBS\s*:?\s*([A-Z0-9\-]+)', first_page_text, re.IGNORECASE)
        if match:
            wbs_value = match.group(1).strip()
            if wbs_value and not wbs_value.startswith('Sale') and not wbs_value.startswith('Tot'):
                details.wbs = wbs_value
        
        # Extract Sale Order
        match = re.search(r'Sale order\s*:?\s*([^\s\n]+)', first_page_text, re.IGNORECASE)
        if match:
            details.sale_order = match.group(1).strip()
        
        # Extract Part Description
        match = re.search(r'Part Desc\s*:?\s*([^:\n]+?)(?=Tot\.?No of Oprns|WBS)', first_page_text, re.IGNORECASE | re.DOTALL)
        if match:
            details.part_desc = match.group(1).strip()
        
        # Extract Total No of Operations
        match = re.search(r'Tot\.?\s*No\s*of\s*Oprns\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.total_no_of_oprns = match.group(1).strip()
        
        # Extract Plant
        match = re.search(r'Plant\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.plant = match.group(1).strip()
        
        # Extract Rtg Seq No
        match = re.search(r'Rtg Seq No\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.rtg_seq_no = match.group(1).strip()
        
        # Extract Sequence No
        match = re.search(r'Sequence No\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.sequence_no = match.group(1).strip()
        
        # Extract Required Qty
        match = re.search(r'Required Qty\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.required_qty = match.group(1).strip()
        
        # Extract Launched Qty
        match = re.search(r'Launched Qty\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.launched_qty = match.group(1).strip()
        
        # Extract Prod Order No
        match = re.search(r'Prod Order No\s*:?\s*(\d+)', first_page_text, re.IGNORECASE)
        if match:
            details.prod_order_no = match.group(1).strip()
        
        return details
    
    @staticmethod
    def extract_operations_from_page(page_text: str) -> List[OperationDetail]:
        """
        Extract all operation details from a single page
        
        IMPORTANT: allowed_time_hrs is NO LONGER extracted from PDF.
        It will be calculated as: (per_pc_time_hrs × total_qty) + setup_time_hrs
        """
        operations = []
        lines = page_text.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Look for operation number pattern - the main data line
            # Format: 0010  FAB-C-PC  0.160  0.160  1  24  4.000  [ACTUAL_TIME]  6190697
            # We extract setup_time, per_pc_time, jump_qty, total_qty
            # But SKIP the allowed_time field (position 7)
            match = re.match(
                r'^(\d{4})\s+([A-Z0-9\-]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d+)\s+(\d+)\s+([\d.,]+)\s+([\d.,]*)\s+(\d+)\s*$',
                line
            )
            
            if match:
                oprn_no = match.group(1)
                wc = match.group(2)
                setup_time = match.group(3).replace(',', '')
                per_pc_time = match.group(4).replace(',', '')
                jump_qty = match.group(5)
                total_qty = match.group(6)
                # SKIP group(7) - this was allowed_time from PDF
                actual_time = match.group(8).replace(',', '') if match.group(8) else None
                confirm_no = match.group(9)
                
                # Initialize plant_id and operation_name
                plant_id = ""
                operation_name = ""
                
                # Look for plant_id and operation name in the next few lines
                for j in range(i + 1, min(i + 10, len(lines))):
                    next_line = lines[j].strip()
                    
                    if not next_line:
                        continue
                    
                    if next_line.startswith("Long Text:"):
                        continue
                    
                    if re.match(r'^\d{4}\s+[A-Z0-9\-]+\s+[\d.,]+\s+[\d.,]+\s+\d+', next_line):
                        break
                    
                    if re.match(r'^_{10,}', next_line):
                        break
                    
                    if re.match(r'^(Oprn|Quantity|Offered|NCRF)', next_line, re.IGNORECASE):
                        break
                    
                    name_match = re.match(r'^(\d{4})\s+(.+?)$', next_line)
                    if name_match:
                        plant_id = name_match.group(1).strip()
                        operation_name = name_match.group(2).strip()
                        operation_name = re.sub(r'Long Text:.*$', '', operation_name).strip()
                        break
                
                # Create operation WITHOUT allowed_time_hrs
                # It will be calculated in the backend
                operation = OperationDetail(
                    oprn_no=oprn_no,
                    wc=wc,
                    plant_id=plant_id if plant_id else None,
                    setup_time_hrs=setup_time,
                    per_pc_time_hrs=per_pc_time,
                    jump_qty=jump_qty,
                    total_qty=total_qty,
                    allowed_time_hrs=None,  # Will be calculated
                    actual_time_hrs=actual_time,
                    confirm_no=confirm_no,
                    operation=operation_name if operation_name else None
                )
                operations.append(operation)
            
            i += 1
        
        return operations
    
    @classmethod
    def process_pdf(cls, pdf_content: bytes, debug: bool = False) -> Dict:
        """Main method to process entire PDF and extract all data"""
        pages_text = cls.extract_text_from_pdf(pdf_content)
        
        if not pages_text:
            raise Exception("No text could be extracted from PDF")
        
        project_details = cls.extract_project_details(pages_text[0])
        
        all_operations = []
        for page_num, page_text in enumerate(pages_text, 1):
            operations = cls.extract_operations_from_page(page_text)
            all_operations.extend(operations)
        
        return {
            "project_details": project_details.model_dump(),
            "operations": [op.model_dump() for op in all_operations],
            "total_operations_found": len(all_operations),
            "total_pages_processed": len(pages_text)
        }