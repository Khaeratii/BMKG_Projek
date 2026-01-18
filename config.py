import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent

class Config:
    """Base configuration class"""
    
    # ==================== BASIC FLASK CONFIG ====================
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'bmkg-secret-key-2024'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ['true', '1', 'yes']
    
    # ==================== MYSQL DATABASE CONFIG (XAMPP) ====================
    # PERBAIKAN: XAMPP biasanya password kosong untuk root
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')  # Password kosong untuk XAMPP
    MYSQL_DB = os.environ.get('MYSQL_DB', 'bmkg_change_proposal')
    
    # SQLAlchemy Configuration
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
    }
    
    # ==================== FILE UPLOAD CONFIG ====================
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max file size
    
    # ==================== APPLICATION DIRECTORIES ====================
    # PERBAIKAN: Definisikan semua atribut yang diperlukan
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    DATA_FOLDER = os.path.join(BASE_DIR, 'data')
    OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
    TEMPLATE_FILE = os.path.join(BASE_DIR, 'templates', 'usulan_perubahan.docx')
    LOG_DIR = os.path.join(BASE_DIR, 'logs')
    PDF_TEMP_DIR = os.path.join(BASE_DIR, 'temp')  # PERBAIKAN: sesuaikan dengan struktur Anda
    
    # ==================== SIGNATURE CONFIG ====================
    SIGNATURE_WIDTH = 80  # mm
    SIGNATURE_HEIGHT = 40  # mm
    
    # ==================== LOGO CONFIG (SURAT PERNYATAAN) ====================
    LOGO_PATH = os.path.join(BASE_DIR, 'static', 'images', 'logo_bmkg.png')
    
    # ==================== LOGGING CONFIG ====================
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_MAX_BYTES = 5 * 1024 * 1024  # 5MB
    LOG_BACKUP_COUNT = 5
    
    # ==================== TIMEZONE CONFIG ====================
    TIMEZONE = 'Asia/Makassar'
    
    # ==================== DOCUMENT NUMBERING CONFIG ====================
    DOCUMENT_PREFIX = 'SOP'
    DOCUMENT_DIVISION = 'IMS'

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
    # Additional development settings
    SQLALCHEMY_ECHO = False  # Set to True to see SQL queries in console
    
    # Enable detailed error pages
    PROPAGATE_EXCEPTIONS = True
    PRESERVE_CONTEXT_ON_EXCEPTION = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    
    # Use test database
    MYSQL_DB = os.environ.get('MYSQL_TEST_DB', 'bmkg_change_proposal_test')
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    # Security settings for production
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
    
    # Production database settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 20,
        'max_overflow': 30,
    }
    
    # Log errors only
    LOG_LEVEL = 'ERROR'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    """Get configuration class based on environment"""
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')
    
    return config.get(config_name, config['default'])

def ensure_directories():
    """Ensure all required directories exist"""
    # Gunakan instance Config untuk mendapatkan atribut
    config_instance = Config()
    
    directories = [
        config_instance.UPLOAD_FOLDER,
        config_instance.DATA_FOLDER,
        config_instance.OUTPUT_DIR,
        config_instance.LOG_DIR,
        config_instance.PDF_TEMP_DIR,
        os.path.join(config_instance.UPLOAD_FOLDER, 'signatures'),
        os.path.join(config_instance.OUTPUT_DIR, 'temp_signatures'),
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"[DIR] Created/verified: {directory}")

def check_required_files():
    """Check if required files exist"""
    config_instance = Config()
    
    required_files = [
        config_instance.LOGO_PATH,
        config_instance.TEMPLATE_FILE,
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
            print(f"[WARN] File not found: {file_path}")
        else:
            print(f"[OK] File found: {file_path}")
    
    return len(missing_files) == 0

# Auto-create directories when config is imported
# Hapus atau comment line ini karena akan dipanggil di app.py
# ensure_directories()

if __name__ == '__main__':
    # Test configuration
    print("=" * 70)
    print("CONFIGURATION TEST")
    print("=" * 70)
    
    # Show current configuration
    current_config = get_config()
    print(f"Config: {current_config.__name__}")
    print(f"Debug: {current_config.DEBUG}")
    print(f"Database: {current_config.SQLALCHEMY_DATABASE_URI}")
    
    # Check directories
    print("\n" + "=" * 70)
    print("DIRECTORY CHECK")
    print("=" * 70)
    ensure_directories()
    
    # Check files
    print("\n" + "=" * 70)
    print("FILE CHECK")
    print("=" * 70)
    all_files_ok = check_required_files()
    
    if all_files_ok:
        print("\n✅ All required files found!")
    else:
        print("\n⚠️  Some required files are missing!")
    
    print("=" * 70)