"""
Database Migration Script - CORRECTED to match Excel exactly
File: app/migrations/add_cost_columns.py

Based on SMC MACHINE HOURLY RATE DETAILS.xlsx - EXACT MATCH
"""
from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate_database():
    """Add new columns to operations table and create machine_master table"""
    
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # Add new columns to operations table
            print("Adding new columns to operations table...")
            
            conn.execute(text("""
                ALTER TABLE operations 
                ADD COLUMN IF NOT EXISTS selected_machine_model VARCHAR(100)
            """))
            
            conn.execute(text("""
                ALTER TABLE operations 
                ADD COLUMN IF NOT EXISTS is_cost_calculated BOOLEAN DEFAULT FALSE
            """))
            
            conn.execute(text("""
                ALTER TABLE operations 
                ADD COLUMN IF NOT EXISTS calculated_cost FLOAT
            """))
            
            conn.execute(text("""
                ALTER TABLE operations 
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """))
            
            conn.commit()
            print("✅ Operations table updated successfully!")
            
            # Drop and recreate machine_master table to ensure correct schema
            print("\nDropping existing machine_master table if exists...")
            conn.execute(text("DROP TABLE IF EXISTS machine_master CASCADE"))
            conn.commit()
            
            print("Creating machine_master table with correct schema...")
            
            conn.execute(text("""
                CREATE TABLE machine_master (
                    id SERIAL PRIMARY KEY,
                    work_center_id INTEGER,
                    work_center_code VARCHAR(50) NOT NULL,
                    work_center_type VARCHAR(100),
                    machine_make VARCHAR(100),
                    machine_model VARCHAR(100),
                    hourly_rate FLOAT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            conn.execute(text("""
                CREATE INDEX idx_machine_wc 
                ON machine_master(work_center_code)
            """))
            
            conn.execute(text("""
                CREATE INDEX idx_machine_wc_id
                ON machine_master(work_center_id)
            """))
            
            conn.commit()
            print("✅ Machine master table created successfully!")
            
            # Insert machine master data from Excel - EXACT MATCH
            print("\nInserting machine master data from Excel (21 Work Centers)...")
            
            # Format: (wc_id, wc_code, wc_type, make, model, rate)
            machine_data = [
                # Work Center 1: MMC1 - CUTTING
                (1, "MMC1", "CUTTING", "Amada", "Amada", 1200),
                
                # Work Center 2: CNCM - MILLING (6 machines)
                (2, "CNCM", "MILLING", "DMG", "DMU-80MB 5 Axis", 3800),
                (2, "CNCM", "MILLING", "DMG", "DMU-50", 3000),
                (2, "CNCM", "MILLING", "DMG", "DMU-60 Evo Linear", 3500),
                (2, "CNCM", "MILLING", "DMG", "DMU-60T", 3200),
                (2, "CNCM", "Turn-Mill", "DMG", "CTX Beta 1250TC4A", 2800),
                (2, "CNCM", "MILLING", "Mikron", "VCP800 Duo", 2500),
                
                # Work Center 3: SMPD - DEFAULT(DEBURR)
                (3, "SMPD", "DEFAULT(DEBURR)", "DEFAULT", "DEFAULT", 300),
                
                # Work Center 4: QFAB - DEFAULT(INSPECTION)
                (4, "QFAB", "DEFAULT(INSPECTION)", "DEFAULT", "DEFAULT", 400),
                
                # Work Center 5: SSM5 - DEFAULT(SHEAR)
                (5, "SSM5", "DEFAULT(SHEAR)", "DEFAULT", "DEFAULT", 350),
                
                # Work Center 6: SPH1 - DEFAULT(BLANKING)
                (6, "SPH1", "DEFAULT(BLANKING)", "DEFAULT", "DEFAULT", 350),
                
                # Work Center 7: SMPP - DEFAULT(DEBURR)
                (7, "SMPP", "DEFAULT(DEBURR)", "DEFAULT", "DEFAULT", 300),
                
                # Work Center 8: PLDG - DEFAULT(DEGREASE)
                (8, "PLDG", "DEFAULT(DEGREASE)", "DEFAULT", "DEFAULT", 250),
                
                # Work Center 9: OTHT - DEFAULT(HEAT TREATMENT)
                (9, "OTHT", "DEFAULT(HEAT TREATMENT)", "DEFAULT", "DEFAULT", 800),
                
                # Work Center 10: CNCT - TURNING (6 machines)
                (10, "CNCT", "TURNING", "LMW", "Platina 20T-L3", 1800),
                (10, "CNCT", "TURNING", "Schaublin", "SCH-110", 1600),
                (10, "CNCT", "TURNING", "Schaublin", "SCH-125 CCN", 1700),
                (10, "CNCT", "TURNING", "Schaublin", "SCH-180 CCN-RT", 1900),
                (10, "CNCT", "TURNING", "Ikegai", "TUR26", 2000),
                (10, "CNCT", "TURNING", "Tsugami", "NU7By", 2200),
                
                # Work Center 11: MMM3 - DEFAULT
                (11, "MMM3", "DEFAULT", "DEFAULT", "DEFAULT", 300),
                
                # Work Center 12: SMFD - DEFAULT(DEBURR)
                (12, "SMFD", "DEFAULT(DEBURR)", "DEFAULT", "DEFAULT", 300),
                
                # Work Center 13: NEWC - Wire EDM
                (13, "NEWC", "Wire EDM", "Makino", "U32J", 2500),
                
                # Work Center 14: MWTEST1 - DEFAULT(PLATING)
                (14, "MWTEST1", "DEFAULT(PLATING)", "DEFAULT", "DEFAULT", 450),
                
                # Work Center 15: WEDM - Wire EDM
                (15, "WEDM", "Wire EDM", "DEFAULT", "DEFAULT", 2000),
                
                # Work Center 16: FAB-C-PC - DEFAULT(DOC VERIFICATION)
                (16, "FAB-C-PC", "DEFAULT(DOC VERIFICATION)", "DEFAULT", "DEFAULT", 300),
                
                # Work Center 17: MLP2 - DEFAULT(FACE TO LENGTH)
                (17, "MLP2", "DEFAULT(FACE TO LENGTH)", "DEFAULT", "DEFAULT", 350),
                
                # Work Center 18: MSM5 - DEFAULT(RAW MAT CUTTING)
                (18, "MSMS", "DEFAULT(RAW MAT CUTTING)", "DEFAULT", "DEFAULT", 400),
                
                # Work Center 19: MLP1 - DEFAULT(TURNING - MANUAL)
                (19, "MLP1", "DEFAULT(TURNING - MANUAL)", "DEFAULT", "DEFAULT", 400),
                
                # Work Center 20: SPH2 - DEFAULT(2D DRAWING)
                (20, "SPH2", "DEFAULT(2D DRAWING)", "DEFAULT", "DEFAULT", 500),
                
                # Work Center 21: TRGRG5 - DEFAULT(SURFACE GRINDING)
                (21, "TRGRG5", "DEFAULT(SURFACE GRINDING)", "DEFAULT", "DEFAULT", 900),
            ]
            
            inserted_count = 0
            for wc_id, wc_code, wc_type, make, model, rate in machine_data:
                conn.execute(text("""
                    INSERT INTO machine_master 
                    (work_center_id, work_center_code, work_center_type, machine_make, machine_model, hourly_rate)
                    VALUES (:wc_id, :wc, :type, :make, :model, :rate)
                """), {
                    "wc_id": wc_id,
                    "wc": wc_code,
                    "type": wc_type,
                    "make": make,
                    "model": model,
                    "rate": rate
                })
                inserted_count += 1
            
            conn.commit()
            print(f"✅ Inserted {inserted_count} machine records!")
            
            # Show summary by work center
            print("\n" + "="*80)
            print("📊 MACHINE DATA SUMMARY BY WORK CENTER (FROM EXCEL)")
            print("="*80)
            
            result = conn.execute(text("""
                SELECT work_center_id,
                       work_center_code, 
                       COUNT(*) as machine_count,
                       work_center_type,
                       MIN(hourly_rate) as min_rate,
                       MAX(hourly_rate) as max_rate
                FROM machine_master
                GROUP BY work_center_id, work_center_code, work_center_type
                ORDER BY work_center_id
            """))
            
            print(f"{'ID':<4} {'Code':<12} {'Machines':<10} {'Type':<30} {'Rate Range'}")
            print("-" * 80)
            for row in result:
                wc_id, wc_code, count, wc_type, min_rate, max_rate = row
                if min_rate == max_rate:
                    rate_str = f"₹{min_rate}"
                else:
                    rate_str = f"₹{min_rate}-{max_rate}"
                print(f"{wc_id:<4} {wc_code:<12} {count:<10} {wc_type:<30} {rate_str}")
            
            print("="*80)
            
            # Count unique work centers
            unique_wc = conn.execute(text("""
                SELECT COUNT(DISTINCT work_center_code) as unique_wc
                FROM machine_master
            """)).fetchone()[0]
            
            print(f"✅ Total: {inserted_count} machine records across {unique_wc} work centers")
            print("="*80)
            print("\n✅ Migration completed successfully!")
            print("\n📝 Work Centers Summary:")
            print("   - CNCM: 6 milling machines (₹2,500 - ₹3,800/hr)")
            print("   - CNCT: 6 turning machines (₹1,600 - ₹2,200/hr)")
            print("   - Other 19 work centers: 1 machine each")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    migrate_database()