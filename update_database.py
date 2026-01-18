# update_database.py
import mysql.connector
from mysql.connector import Error

def update_laporan_table():
    """Update laporan table untuk 5 filename tanda tangan"""
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="bmkg_change_proposal"
        )
        
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("SHOW COLUMNS FROM laporan LIKE 'ttd_pelapor_filename'")
        
        if not cursor.fetchone():
            # Add signature filename columns
            print("Adding signature filename columns...")
            cursor.execute("""
                ALTER TABLE laporan 
                ADD COLUMN ttd_pelapor_filename VARCHAR(255),
                ADD COLUMN ttd_atasan_filename VARCHAR(255),
                ADD COLUMN ttd_smki_filename VARCHAR(255),
                ADD COLUMN ttd_smki2_filename VARCHAR(255),
                ADD COLUMN ttd_ketua_filename VARCHAR(255)
            """)
            conn.commit()
            print("✅ Successfully added signature filename columns")
        else:
            print("✅ Signature filename columns already exist")
        
        cursor.close()
        conn.close()
        return True
        
    except Error as e:
        print(f"❌ Error updating table: {e}")
        return False

if __name__ == "__main__":
    update_laporan_table()