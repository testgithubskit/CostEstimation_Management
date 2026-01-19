"""
Database models for Cost Estimation Software - COMPLETE UPDATED VERSION
File: app/models/database.py

Includes support for:
- Projects and Operations (OARC data)
- Machine Master Data
- Cost Versioning
- Miscellaneous Costs
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, LargeBinary, ForeignKey, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Project(Base):
    """Main project table"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(255), nullable=False)
    part_no = Column(String(100))
    wbs = Column(String(100))
    sale_order = Column(String(100))
    part_desc = Column(Text)
    total_no_of_oprns = Column(Integer)
    plant = Column(String(50))
    rtg_seq_no = Column(String(50))
    sequence_no = Column(String(50))
    required_qty = Column(Integer)
    launched_qty = Column(Integer)
    prod_order_no = Column(String(100))
    last_changed_by = Column(String(100))
    last_changed_dt = Column(String(50))
    created_by = Column(String(100))
    change_number = Column(String(100))
    destination = Column(String(255))
    storage_bin = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Status
    status = Column(String(50), default="completed")
    
    # Relationships
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    operations = relationship("Operation", back_populates="project", cascade="all, delete-orphan")
    cost_versions = relationship("ProjectCostVersion", back_populates="project", cascade="all, delete-orphan")
    cost_summaries = relationship("ProjectCostSummary", back_populates="project", cascade="all, delete-orphan")
    miscellaneous_costs = relationship("MiscellaneousCost", back_populates="project", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Project(id={self.id}, name={self.project_name})>"


class ProjectFile(Base):
    """Store project files as BLOBs"""
    __tablename__ = "project_files"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    file_type = Column(String(20), nullable=False)  # 'oarc', '2d', '3d'
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    
    file_data = Column(LargeBinary)
    converted_data = Column(LargeBinary)  # For 3D GLB conversion
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="files")
    
    def __repr__(self):
        return f"<ProjectFile(id={self.id}, type={self.file_type}, filename={self.filename})>"


class Operation(Base):
    """Store operation details from OARC - NO COST FIELDS"""
    __tablename__ = "operations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Operation details (from OARC)
    oprn_no = Column(String(10))
    wc = Column(String(50))
    plant_id = Column(String(50))
    operation = Column(String(255))
    setup_time_hrs = Column(Float)
    per_pc_time_hrs = Column(Float)
    jump_qty = Column(Integer)
    total_qty = Column(Integer)
    allowed_time_hrs = Column(Float)  # CALCULATED: (per_pc_time × total_qty) + setup_time
    actual_time_hrs = Column(Float)
    confirm_no = Column(String(50))
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="operations")
    
    def __repr__(self):
        return f"<Operation(id={self.id}, oprn_no={self.oprn_no}, operation={self.operation})>"


class MachineMaster(Base):
    """Machine master data for work centers"""
    __tablename__ = "machine_master"
    
    id = Column(Integer, primary_key=True, index=True)
    work_center_id = Column(Integer, index=True)
    work_center_code = Column(String(50), nullable=False, index=True)
    work_center_type = Column(String(100))
    machine_make = Column(String(100))
    machine_model = Column(String(100))
    hourly_rate = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<MachineMaster(wc={self.work_center_code}, model={self.machine_model}, rate={self.hourly_rate})>"


class ProjectCostVersion(Base):
    """Store operation-level cost details for each version"""
    __tablename__ = "project_cost_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    version_no = Column(Integer, nullable=False, index=True)
    operation_no = Column(String(10), nullable=False, index=True)
    
    # Machine selection and cost for this operation
    selected_machine_model = Column(String(100))
    calculated_cost = Column(Float)
    
    # Optional notes
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="cost_versions")
    
    def __repr__(self):
        return f"<ProjectCostVersion(project={self.project_id}, v{self.version_no}, op={self.operation_no}, cost={self.calculated_cost})>"


class ProjectCostSummary(Base):
    """Store total costs for each version with breakdown"""
    __tablename__ = "project_cost_summary"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    version_no = Column(Integer, nullable=False, index=True)
    
    # Cost breakdown
    operational_cost = Column(Float, default=0.0)  # Sum of operation costs
    miscellaneous_cost = Column(Float, default=0.0)  # Sum of misc costs
    total_cost = Column(Float, nullable=False)  # operational_cost + miscellaneous_cost
    
    # Optional notes
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="cost_summaries")
    
    def __repr__(self):
        return f"<ProjectCostSummary(project={self.project_id}, v{self.version_no}, op={self.operational_cost}, misc={self.miscellaneous_cost}, total={self.total_cost})>"


class MiscellaneousCost(Base):
    """Store miscellaneous costs for each project version"""
    __tablename__ = "miscellaneous_costs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    version_no = Column(Integer, nullable=False, index=True)
    
    # Cost details
    cost_type = Column(String(100), nullable=False)  # "Wage Rates", "Material Cost", "Other", etc.
    cost_value = Column(Float, nullable=False)
    description = Column(Text)  # Optional description
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="miscellaneous_costs")
    
    def __repr__(self):
        return f"<MiscellaneousCost(project={self.project_id}, v{self.version_no}, type={self.cost_type}, value={self.cost_value})>"