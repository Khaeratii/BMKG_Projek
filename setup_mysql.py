import pymysql
from pymysql.cursors import DictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class MySQLSetup:
    def __init__(self):
        self.host = os.getenv('MYSQL_HOST', 'localhost')
        self.port = int(os.getenv('MYSQL_PORT', 3306))
        self.user = os.getenv('MYSQL_USER', 'root')
        self.password = os.getenv('MYSQL_PASSWORD', '')
        self.database = os.getenv('MYSQL_DB', 'bmkg_change_proposal')
        
    def get_connection(self):
        """Get MySQL connection"""
        return pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            charset='utf8mb4',
            cursorclass=DictCursor
        )
    
    def create_database(self):
        """Create database if not exists"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"[SUCCESS] Database '{self.database}' created/verified")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to create database: {e}")
            return False
        finally:
            cursor.close()
            conn.close()
    
    def execute_sql_file(self, sql_file_path):
        """Execute SQL file to create tables"""
        conn = pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.database,
            charset='utf8mb4',
            cursorclass=DictCursor
        )
        cursor = conn.cursor()
        
        try:
            with open(sql_file_path, 'r', encoding='utf-8') as f:
                sql_commands = f.read().split(';')
                
                for command in sql_commands:
                    if command.strip():
                        cursor.execute(command)
            
            conn.commit()
            print(f"[SUCCESS] SQL file '{sql_file_path}' executed successfully")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to execute SQL file: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

def setup_xampp_mysql():
    """Setup database for XAMPP"""
    print("="*50)
    print("SETTING UP MYSQL DATABASE FOR XAMPP")
    print("="*50)
    
    setup = MySQLSetup()
    
    # 1. Create database
    if not setup.create_database():
        return
    
    # 2. Inform user that tables will be created by Flask
    print(f"[INFO] Tables will be created automatically when Flask app starts")
    print(f"[INFO] Run 'python app.py' to start the application")
    print(f"[INFO] Database '{setup.database}' is ready for use")

if __name__ == '__main__':
    setup_xampp_mysql()