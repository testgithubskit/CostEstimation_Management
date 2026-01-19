"""
Cleanup Old Columns - Simple Migration
File: app/migrations/cleanup_old_columns.py

This removes the old columns that are no longer needed:
- operations: selected_machine_model, is_cost_calculated, calculated_cost, updated_at
- machine_master: source, uploaded_by
"""
from sqlalchemy import create_engine, text
from app.core.config import settings

def cleanup_old_columns():
    """Remove old columns from operations and machine_master tables"""
    
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            print("=" * 80)
            print("🧹 CLEANUP OLD COLUMNS MIGRATION")
            print("=" * 80)
            
            # ====================================================================
            # STEP 1: Remove columns from operations table
            # ====================================================================
            print("\n🔧 STEP 1: Cleaning up operations table...")
            print("   Removing: selected_machine_model, is_cost_calculated, calculated_cost, updated_at")
            
            # Check if columns have data before removing
            has_data = conn.execute(text("""
                SELECT COUNT(*) 
                FROM operations 
                WHERE selected_machine_model IS NOT NULL 
                   OR calculated_cost IS NOT NULL
            """)).scalar()
            
            if has_data > 0:
                print(f"   ⚠️  WARNING: {has_data} operations have cost data that will be lost!")
                print("   This data should be saved as versions first if needed.")
                response = input("   Continue? (yes/no): ")
                if response.lower() != 'yes':
                    print("   ❌ Migration cancelled")
                    return
            
            # Remove columns
            conn.execute(text("""
                ALTER TABLE operations 
                DROP COLUMN IF EXISTS selected_machine_model CASCADE
            """))
            print("   ✅ Removed: selected_machine_model")
            
            conn.execute(text("""
                ALTER TABLE operations 
                DROP COLUMN IF EXISTS is_cost_calculated CASCADE
            """))
            print("   ✅ Removed: is_cost_calculated")
            
            conn.execute(text("""
                ALTER TABLE operations 
                DROP COLUMN IF EXISTS calculated_cost CASCADE
            """))
            print("   ✅ Removed: calculated_cost")
            
            conn.execute(text("""
                ALTER TABLE operations 
                DROP COLUMN IF EXISTS updated_at CASCADE
            """))
            print("   ✅ Removed: updated_at")
            
            conn.commit()
            print("✅ Operations table cleaned successfully!")
            
            # ====================================================================
            # STEP 2: Remove columns from machine_master table
            # ====================================================================
            print("\n🔧 STEP 2: Cleaning up machine_master table...")
            print("   Removing: source, uploaded_by")
            
            conn.execute(text("""
                ALTER TABLE machine_master 
                DROP COLUMN IF EXISTS source CASCADE
            """))
            print("   ✅ Removed: source")
            
            conn.execute(text("""
                ALTER TABLE machine_master 
                DROP COLUMN IF EXISTS uploaded_by CASCADE
            """))
            print("   ✅ Removed: uploaded_by")
            
            conn.commit()
            print("✅ Machine master table cleaned successfully!")
            
            # ====================================================================
            # STEP 3: Verify final schema
            # ====================================================================
            print("\n✅ STEP 3: Verifying final schema...")
            
            # Check operations columns
            op_cols = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'operations'
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("\n📋 operations columns:")
            for col in op_cols:
                print(f"   ✓ {col[0]}")
            
            # Check machine_master columns
            mm_cols = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'machine_master'
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("\n📋 machine_master columns:")
            for col in mm_cols:
                print(f"   ✓ {col[0]}")
            
            # Verify cost version tables
            print("\n📋 Cost version tables:")
            
            pcv_count = conn.execute(text("""
                SELECT COUNT(*) FROM project_cost_versions
            """)).scalar()
            print(f"   ✓ project_cost_versions: {pcv_count} records")
            
            pcs_count = conn.execute(text("""
                SELECT COUNT(*) FROM project_cost_summary
            """)).scalar()
            print(f"   ✓ project_cost_summary: {pcs_count} records")
            
            # Summary
            print("\n" + "=" * 80)
            print("✅ CLEANUP COMPLETED SUCCESSFULLY!")
            print("=" * 80)
            
            print("\n📊 Final Database State:")
            print("   ✅ operations: OARC data only (no cost fields)")
            print("   ✅ machine_master: Machine data only (no tracking fields)")
            print("   ✅ project_cost_versions: Ready for per-operation costs")
            print("   ✅ project_cost_summary: Ready for version totals")
            
            print("\n🎯 Next Steps:")
            print("   1. Update your backend code (models, routes)")
            print("   2. Restart your API server")
            print("   3. Test the new cost calculation flow")
            print("   4. Frontend: Update to use new API structure")
            
        except Exception as e:
            conn.rollback()
            print(f"\n❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    cleanup_old_columns()