"""
Database Migration - Add Versioning Support
File: app/migrations/add_versioning.py
"""
from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate_add_versioning():
    """Add project cost versioning table and update machine_master"""
    
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            print("🔄 Adding versioning support...")
            
            # Add columns to machine_master for tracking upload source
            print("\n1. Updating machine_master table...")
            conn.execute(text("""
                ALTER TABLE machine_master 
                ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'
            """))
            
            conn.execute(text("""
                ALTER TABLE machine_master 
                ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(100)
            """))
            
            conn.commit()
            print("✅ Machine master table updated")
            
            # Create project_cost_versions table
            print("\n2. Creating project_cost_versions table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS project_cost_versions (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    version_number INTEGER NOT NULL,
                    version_name VARCHAR(100),
                    total_cost FLOAT NOT NULL,
                    operation_costs JSON,
                    calculated_by VARCHAR(100),
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(project_id, version_number)
                )
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_cost_version_project 
                ON project_cost_versions(project_id)
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_cost_version_number 
                ON project_cost_versions(project_id, version_number)
            """))
            
            conn.commit()
            print("✅ project_cost_versions table created")
            
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    migrate_add_versioning()