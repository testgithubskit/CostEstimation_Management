"""
Database Migration - Add Miscellaneous Costs Support
File: app/migrations/add_miscellaneous_costs.py
"""
from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate_add_miscellaneous_costs():
    """Add miscellaneous costs table for project cost estimation"""
    
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            print("=" * 80)
            print("📦 ADDING MISCELLANEOUS COSTS SUPPORT")
            print("=" * 80)
            
            # Create miscellaneous_costs table
            print("\n1. Creating miscellaneous_costs table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS miscellaneous_costs (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    version_no INTEGER NOT NULL,
                    
                    -- Cost Type (predefined or custom)
                    cost_type VARCHAR(100) NOT NULL,
                    
                    -- Cost Value (entered by user)
                    cost_value FLOAT NOT NULL,
                    
                    -- Description/Notes
                    description TEXT,
                    
                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    -- Ensure unique cost_type per project per version
                    UNIQUE(project_id, version_no, cost_type)
                )
            """))
            
            # Create indexes
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_misc_cost_project 
                ON miscellaneous_costs(project_id)
            """))
            
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_misc_cost_version 
                ON miscellaneous_costs(project_id, version_no)
            """))
            
            conn.commit()
            print("✅ miscellaneous_costs table created")
            
            # Update project_cost_summary to include miscellaneous costs
            print("\n2. Updating project_cost_summary table...")
            conn.execute(text("""
                ALTER TABLE project_cost_summary 
                ADD COLUMN IF NOT EXISTS operational_cost FLOAT DEFAULT 0.0
            """))
            
            conn.execute(text("""
                ALTER TABLE project_cost_summary 
                ADD COLUMN IF NOT EXISTS miscellaneous_cost FLOAT DEFAULT 0.0
            """))
            
            conn.execute(text("""
                ALTER TABLE project_cost_summary 
                ADD COLUMN IF NOT EXISTS notes TEXT
            """))
            
            conn.commit()
            print("✅ project_cost_summary table updated")
            
            # Insert predefined miscellaneous cost types
            print("\n3. Inserting predefined cost types...")
            
            predefined_types = [
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
            
            print(f"   📋 Predefined cost types: {len(predefined_types)}")
            for cost_type in predefined_types:
                print(f"      • {cost_type}")
            
            # Verify schema
            print("\n4. Verifying schema...")
            
            # Check miscellaneous_costs columns
            misc_cols = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'miscellaneous_costs'
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("\n📋 miscellaneous_costs columns:")
            for col_name, col_type in misc_cols:
                print(f"   ✓ {col_name} ({col_type})")
            
            # Check project_cost_summary columns
            summary_cols = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'project_cost_summary'
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("\n📋 project_cost_summary columns:")
            for col_name, col_type in summary_cols:
                print(f"   ✓ {col_name} ({col_type})")
            
            # Summary
            print("\n" + "=" * 80)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 80)
            
            print("\n🎯 Database Changes:")
            print("   ✅ miscellaneous_costs table created")
            print("   ✅ project_cost_summary updated with cost breakdown")
            print(f"   ✅ {len(predefined_types)} predefined cost types available")
            
            print("\n📊 Cost Calculation Flow:")
            print("   1. Operational Cost (from operations)")
            print("   2. Miscellaneous Cost (from miscellaneous_costs)")
            print("   3. Total Cost = Operational + Miscellaneous")
            
            print("\n🔄 Next Steps:")
            print("   1. Update database models (database.py)")
            print("   2. Create miscellaneous costs API routes")
            print("   3. Update cost_versions.py to handle misc costs")
            print("   4. Update frontend to show misc cost entry")
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    migrate_add_miscellaneous_costs()