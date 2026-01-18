import traceback  # Tambahkan di bagian import
import os
import sys
import base64
import uuid
import json
import time
import logging
import traceback
import pytz
from datetime import datetime, timedelta
from io import BytesIO
from logging.handlers import RotatingFileHandler

from flask import Flask, render_template, redirect, url_for, request, session, flash, jsonify, send_file, send_from_directory
from PIL import Image
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
import mysql.connector
from mysql.connector import Error

from urllib.parse import unquote, quote
# ==================== IMPORT DOCX2PDF ====================
try:
    from docx2pdf import convert
    HAS_DOCX2PDF = True
    print("[OK] docx2pdf available for PDF conversion")
except ImportError:
    HAS_DOCX2PDF = False
    print("[WARN] docx2pdf not installed, will serve DOCX only")

# ==================== ALTERNATIVE PDF CONVERSION ====================
try:
    import pdfkit
    HAS_PDFKIT = True
    print("[OK] pdfkit available as alternative PDF converter")
except ImportError:
    HAS_PDFKIT = False
    print("[INFO] pdfkit not installed")

# ==================== APP INITIALIZATION ====================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.secret_key = 'bmkg-integrated-secret-key-2024'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

# ==================== KONFIGURASI DATABASE ====================
# Database utama untuk Usulan Perubahan dan Surat Pernyataan
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost:3306/bmkg_change_proposal'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ==================== KONFIGURASI FOLDER ====================
UPLOAD_FOLDER = 'uploads'
DATA_FOLDER = 'data'
OUTPUT_DIR = 'output'
TEMPLATE_DIR = 'templates'
LOCAL_TEMP_PDF = 'temp_pdf'
LOG_DIR = 'logs'

for folder in [UPLOAD_FOLDER, DATA_FOLDER, OUTPUT_DIR, TEMPLATE_DIR, LOCAL_TEMP_PDF, LOG_DIR]:
    os.makedirs(folder, exist_ok=True)

# Template files
TEMPLATE_USULAN_PERUBAHAN = os.path.join(TEMPLATE_DIR, 'usulan_perubahan.docx')
LOGO_PATH = os.path.join('static', 'images', 'logo_bmkg.png')

# ==================== MODEL DATABASE USULAN PERUBAHAN ====================
class Proposal(db.Model):
    __tablename__ = 'proposals'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tanggal = db.Column(db.Date, nullable=False)
    nomor_dokumen = db.Column(db.String(50), unique=True)
    revisi = db.Column(db.String(10), default='00')
    tgl_efektif = db.Column(db.Date)
    diminta_oleh = db.Column(db.String(100), nullable=False)
    jabatan = db.Column(db.String(100), nullable=False)
    deskripsi_perubahan = db.Column(db.Text, nullable=False)
    hasil_dibutuhkan_tgl = db.Column(db.Date)
    alasan_perubahan = db.Column(db.Text)
    status = db.Column(db.String(20), default='draft')
    signature_filename = db.Column(db.String(255))
    draft_name = db.Column(db.String(100))
    draft_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'tanggal': self.tanggal.strftime('%Y-%m-%d') if self.tanggal else None,
            'nomor_dokumen': self.nomor_dokumen,
            'revisi': self.revisi,
            'tgl_efektif': self.tgl_efektif.strftime('%Y-%m-%d') if self.tgl_efektif else None,
            'diminta_oleh': self.diminta_oleh,
            'jabatan': self.jabatan,
            'deskripsi_perubahan': self.deskripsi_perubahan,
            'hasil_dibutuhkan_tgl': self.hasil_dibutuhkan_tgl.strftime('%Y-%m-%d') if self.hasil_dibutuhkan_tgl else None,
            'alasan_perubahan': self.alasan_perubahan,
            'status': self.status,
            'signature_filename': self.signature_filename,
            'draft_name': self.draft_name,
            'draft_notes': self.draft_notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

class Evaluation(db.Model):
    __tablename__ = 'evaluations'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    proposal_id = db.Column(db.Integer, nullable=False)
    tipe_perubahan = db.Column(db.Text)
    prioritas = db.Column(db.String(20))
    dampak_lingkungan = db.Column(db.Text)
    upaya_dibutuhkan = db.Column(db.Text)
    sumber_daya = db.Column(db.Text)
    rencana_pengujian = db.Column(db.Text)
    catatan_evaluasi = db.Column(db.Text)
    keputusan = db.Column(db.String(20), default='draft')
    evaluated_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'proposal_id': self.proposal_id,
            'tipe_perubahan': json.loads(self.tipe_perubahan) if self.tipe_perubahan else [],
            'prioritas': self.prioritas,
            'dampak_lingkungan': self.dampak_lingkungan,
            'upaya_dibutuhkan': self.upaya_dibutuhkan,
            'sumber_daya': self.sumber_daya,
            'rencana_pengujian': self.rencana_pengujian,
            'catatan_evaluasi': self.catatan_evaluasi,
            'keputusan': self.keputusan,
            'evaluated_at': self.evaluated_at.strftime('%Y-%m-%d %H:%M:%S') if self.evaluated_at else None,
        }

class Approval(db.Model):
    __tablename__ = 'approvals'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    proposal_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20))
    catatan_persetujuan = db.Column(db.Text)
    keputusan = db.Column(db.String(20), default='draft')
    tanggal_pelaksanaan = db.Column(db.Date)
    pic_pelaksana = db.Column(db.String(100))
    approved_at = db.Column(db.DateTime)
    tanda_tangan_persetujuan = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'proposal_id': self.proposal_id,
            'status': self.status,
            'catatan_persetujuan': self.catatan_persetujuan,
            'keputusan': self.keputusan,
            'tanggal_pelaksanaan': self.tanggal_pelaksanaan.strftime('%Y-%m-%d') if self.tanggal_pelaksanaan else None,
            'pic_pelaksana': self.pic_pelaksana,
            'approved_at': self.approved_at.strftime('%Y-%m-%d %H:%M:%S') if self.approved_at else None,
            'tanda_tangan_persetujuan': self.tanda_tangan_persetujuan,
        }

class Implementation(db.Model):
    __tablename__ = 'implementations'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    proposal_id = db.Column(db.Integer, nullable=False)
    hasil_tahapan_perubahan = db.Column(db.Text)
    hasil_pengujian = db.Column(db.Text)
    tanggal_rilis = db.Column(db.Date)
    catatan_implementasi = db.Column(db.Text)
    implemented_at = db.Column(db.DateTime)
    tanda_tangan_pic = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)  # PERBAIKAN: tanda kurung ditutup
    
    def to_dict(self):
        return {
            'id': self.id,
            'proposal_id': self.proposal_id,
            'hasil_tahapan_perubahan': self.hasil_tahapan_perubahan,
            'hasil_pengujian': self.hasil_pengujian,
            'tanggal_rilis': self.tanggal_rilis.strftime('%Y-%m-%d') if self.tanggal_rilis else None,
            'catatan_implementasi': self.catatan_implementasi,
            'implemented_at': self.implemented_at.strftime('%Y-%m-%d %H:%M:%S') if self.implemented_at else None,
            'tanda_tangan_pic': self.tanda_tangan_pic,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

# ==================== MODEL SURAT PERNYATAAN ====================
class SuratPernyataan(db.Model):
    __tablename__ = 'surat_pernyataan'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nama = db.Column(db.String(100), nullable=False)
    nip = db.Column(db.String(50), nullable=False)
    instansi = db.Column(db.String(100), nullable=False)
    kegiatan = db.Column(db.Text, nullable=False)
    periode = db.Column(db.String(100), nullable=False)
    pdf_object = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.nama,
            'nip': self.nip,
            'instansi': self.instansi,
            'kegiatan': self.kegiatan,
            'periode': self.periode,
            'pdf_object': self.pdf_object,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
        }

# ==================== FUNGSI TANDA TANGAN (PERBAIKAN) ====================
def save_signature_for_laporan(signature_data, identifier, system_name="laporan"):
    """Save signature image for laporan insiden khusus"""
    if not signature_data:
        print(f"[DEBUG] No signature data for {identifier}")
        return "manual"  # Default ke manual jika tidak ada data
    
    try:
        # Jika signature sudah berupa status
        if signature_data in ['selesai', 'manual']:
            return signature_data
        
        # Jika berupa data:image base64
        if signature_data.startswith('data:image'):
            print(f"[DEBUG] Processing signature image for {identifier}")
            
            # Extract base64 data
            if ',' in signature_data:
                _, encoded = signature_data.split(',', 1)
            else:
                encoded = signature_data
            
            # Decode
            signature_bytes = base64.b64decode(encoded)
            
            # Verifikasi dan simpan gambar
            img = Image.open(BytesIO(signature_bytes))
            img.verify()
            img = Image.open(BytesIO(signature_bytes))
            
            # Convert ke RGB
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            
            # Buat folder signatures jika belum ada
            signatures_dir = os.path.join(DATA_FOLDER, 'signatures')
            os.makedirs(signatures_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"laporan_{identifier}_{timestamp}.png"
            filepath = os.path.join(signatures_dir, filename)
            
            # Save image
            img.save(filepath, 'PNG', optimize=True)
            print(f"[DEBUG] Signature saved to: {filepath}")
            
            return filename
            
        else:
            # Jika bukan data gambar, anggap manual
            return "manual"
            
    except Exception as e:
        print(f"[ERROR] Error saving signature for {identifier}: {e}")
        return "manual"

def get_signature_image_path(signature_value):
    """Get actual image path from signature value"""
    if not signature_value:
        return None
    
    # Jika sudah berupa path file
    if isinstance(signature_value, str) and signature_value.endswith('.png'):
        # Cek beberapa lokasi yang mungkin
        possible_paths = [
            os.path.join(DATA_FOLDER, 'signatures', signature_value),
            os.path.join('data', 'signatures', signature_value),
            os.path.join('uploads', 'signatures', signature_value),
            signature_value
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        print(f"[WARN] Signature file not found: {signature_value}")
        return None
    
    return None

def convert_signature_to_base64(signature_value):
    """Convert signature to base64 for HTML display"""
    if not signature_value:
        return None
    
    # Jika sudah base64
    if isinstance(signature_value, str) and signature_value.startswith('data:image'):
        return signature_value
    
    # Jika berupa path file
    filepath = get_signature_image_path(signature_value)
    if filepath and os.path.exists(filepath):
        try:
            with open(filepath, 'rb') as f:
                signature_bytes = f.read()
                base64_encoded = base64.b64encode(signature_bytes).decode('utf-8')
                return f"data:image/png;base64,{base64_encoded}"
        except Exception as e:
            print(f"[ERROR] Error reading signature file: {e}")
    
    return None
# ==================== FUNGSI UTILITY UNTUK SEMUA SISTEM ====================
def save_signature_image(signature_data, identifier, system_name=""):
    """Save signature image for any system"""
    if not signature_data:
        print(f"[DEBUG] No signature data provided")
        return None
    
    try:
        print(f"[DEBUG] Processing signature for {system_name}")
        
        if signature_data.startswith('data:image'):
            try:
                # Pisahkan header dan data
                if ',' in signature_data:
                    _, encoded = signature_data.split(',', 1)
                else:
                    encoded = signature_data
                
                # Decode base64
                signature_bytes = base64.b64decode(encoded)
                print(f"[DEBUG] Signature bytes length: {len(signature_bytes)}")
                
                # Verifikasi dan buka gambar
                img = Image.open(BytesIO(signature_bytes))
                img.verify()  # Verifikasi integrity
                img = Image.open(BytesIO(signature_bytes))  # Buka kembali setelah verify
            except Exception as e:
                print(f"[ERROR] Error processing signature image: {e}")
                return None
        else:
            # Jika bukan data:image, kembalikan apa adanya
            print(f"[DEBUG] Signature is not data:image format, returning as-is")
            return signature_data
        
        # Convert ke RGB jika perlu
        if img.mode in ('RGBA', 'LA', 'P'):
            print(f"[DEBUG] Converting image from {img.mode} to RGB")
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Buat directory jika belum ada
        signatures_dir = os.path.join(DATA_FOLDER, 'signatures')
        os.makedirs(signatures_dir, exist_ok=True)
        print(f"[DEBUG] Signatures dir: {signatures_dir}")
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"signature_{system_name}_{identifier}_{timestamp}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join(signatures_dir, filename)
        
        # Save image
        img.save(filepath, 'PNG', optimize=True)
        print(f"[DEBUG] Signature saved to: {filepath}")
        
        return filename
        
    except Exception as e:
        print(f"[ERROR] Error saving signature: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return None

# ==================== DEBUG ENDPOINT UNTUK LAPORAN INSIDEN ====================


def decode_signature(ttd_base64):
    """Decode base64 signature to BytesIO"""
    if not ttd_base64 or not isinstance(ttd_base64, str):
        return None
    
    try:
        if ttd_base64.startswith('data:image'):
            header, encoded = ttd_base64.split(',', 1)
            signature_bytes = base64.b64decode(encoded)
        else:
            signature_bytes = base64.b64decode(ttd_base64)
        
        return BytesIO(signature_bytes)
    except Exception as e:
        print(f"Error decoding signature: {e}")
        return None

def safe_filename(nama):
    """Safe filename for PDF"""
    if not nama:
        return "unknown"
    safe = "".join(c for c in nama if c.isalnum() or c in (' ', '-', '_')).rstrip()
    return safe.replace(' ', '_')

def status_ttd(ttd):
    """Check TTD status for Laporan Insiden"""
    if ttd and isinstance(ttd, str) and ttd.strip() != "":
        return "selesai"
    return "manual"

def format_date(date_str, format_input='%Y-%m-%d', format_output='%d-%m-%Y'):
    """Format date for display"""
    if not date_str:
        return "-"
    try:
        # Handle datetime object
        if isinstance(date_str, datetime):
            return date_str.strftime(format_output)
        
        # Handle string date
        date_obj = datetime.strptime(str(date_str).split(' ')[0], format_input)
        return date_obj.strftime(format_output)
    except Exception as e:
        print(f"[WARN] Format date error for '{date_str}': {e}")
        return str(date_str)
    

def generate_doc_number(proposal_count):
    """Generate document number for Usulan Perubahan"""
    today = datetime.now()
    roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    month_roman = roman_numerals[today.month-1]
    seq_num = proposal_count + 1
    
    return f"SOP/{seq_num:02d}/IMS/{month_roman}/{today.year}/{seq_num:02d}"

def get_db_connection_mysql():
    """Get MySQL connection for Laporan Insiden"""
    try:
        # Coba buat database jika belum ada
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password=""
        )
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS bmkg_change_proposal")
        cursor.close()
        conn.close()
        
        # Konek ke database
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="bmkg_change_proposal"
        )
        return conn
    except Error as e:
        print(f"[ERROR] MySQL connection failed: {e}")
        return None

def create_laporan_table():
    """Create table for Laporan Insiden"""
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return False
        
        cursor = conn.cursor()
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS laporan (
            id INT AUTO_INCREMENT PRIMARY KEY,
            no_dok VARCHAR(100),
            no_revisi VARCHAR(50),
            tgl_efektif DATE,
            no_permohonan VARCHAR(100),
            tanggal_kejadian DATE,
            nama_pelapor VARCHAR(100),
            nama_bidang VARCHAR(100),
            deskripsi_insiden TEXT,
            analisa_penyebab TEXT,
            tindak_smki TEXT,
            pic_tindak VARCHAR(100),
            tindak_pihak VARCHAR(100),
            insiden_selesai ENUM('Ya', 'Tidak'),
            tanggal_penyelesaian DATE,
            ttd_pelapor ENUM('selesai', 'manual'),
            ttd_atasan ENUM('selesai', 'manual'),
            ttd_smki ENUM('selesai', 'manual'),
            ttd_smki2 ENUM('selesai', 'manual'),
            ttd_ketua ENUM('selesai', 'manual'),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
        cursor.execute(create_table_sql)
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"[ERROR] Creating table failed: {e}")
        return False

# ==================== LOGGING SETUP ====================
log_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, "app.log"),
    maxBytes=5 * 1024 * 1024,
    backupCount=5
)
log_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[log_handler])

# ==================== ROUTE UNTUK SISTEM USULAN PERUBAHAN ====================


  # Tambah parameter ini
# ==================== ROUTE UNTUK DASHBOARD SURAT PERNYATAAN ====================
# ==================== UPDATE EXISTING ROUTES ====================

# PERBAIKI: Ubah route home() untuk redirect ke dashboard utama
@app.route('/')
def home():
    """Home page - redirect to MAIN dashboard (terintegrasi)"""
    return redirect(url_for('main_dashboard'))

# ==================== DASHBOARD ROUTES ====================

@app.route('/dashboard')
def main_dashboard():
    """Main integrated dashboard showing all systems"""
    # Get stats from all systems
    usulan_stats = {
        'total': Proposal.query.count(),
        'draft': Proposal.query.filter_by(status='draft').count(),
        'completed': Proposal.query.filter_by(status='completed').count(),
    }
    
    surat_stats = {
        'total': SuratPernyataan.query.count(),
    }
    
    # Get laporan insiden stats
    laporan_stats = {'total': 0, 'selesai': 0}
    try:
        conn = get_db_connection_mysql()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN insiden_selesai = 'Ya' THEN 1 ELSE 0 END) as selesai FROM laporan")
            result = cursor.fetchone()
            laporan_stats['total'] = result[0] if result else 0
            laporan_stats['selesai'] = result[1] if result and result[1] else 0
            cursor.close()
            conn.close()
    except:
        pass
    
    # Get recent documents (max 10 each)
    recent_usulan = Proposal.query.order_by(Proposal.created_at.desc()).limit(10).all()
    recent_surat = SuratPernyataan.query.order_by(SuratPernyataan.created_at.desc()).limit(10).all()
    recent_insiden = []
    try:
        conn = get_db_connection_mysql()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM laporan ORDER BY created_at DESC LIMIT 10")
            recent_insiden = cursor.fetchall()
            cursor.close()
            conn.close()
    except:
        pass
    
    return render_template('dashboard_pegawai.html',
                         usulan_stats=usulan_stats,
                         surat_stats=surat_stats,
                         laporan_stats=laporan_stats,
                         usulan_documents=recent_usulan,
                         surat_documents=recent_surat,
                         insiden_documents=recent_insiden,
                         system_name="main",
                         show_all_systems=True)

@app.route('/usulan-perubahan/dashboard')
def dashboard_usulan():
    """Dashboard untuk Usulan Perubahan"""
    # Ambil semua proposal sebagai objects langsung
    proposals = Proposal.query.order_by(Proposal.created_at.desc()).all()
    
    # DEBUG: Print untuk melihat struktur data
    print(f"[DEBUG] dashboard_usulan: proposals count = {len(proposals)}")
    if proposals:
        print(f"[DEBUG] First proposal type: {type(proposals[0])}")
        print(f"[DEBUG] First proposal attributes: {dir(proposals[0])}")
    
    # Hitung stats
    stats = {
        'total': len(proposals),
        'draft': len([p for p in proposals if p.status == 'draft']),
        'evaluasi': len([p for p in proposals if p.status == 'evaluasi']),
        'approval': len([p for p in proposals if p.status == 'approval']),
        'implementation': len([p for p in proposals if p.status == 'implementation']),
        'completed': len([p for p in proposals if p.status == 'completed']),
        'rejected': len([p for p in proposals if p.status == 'rejected']),
    }
    
    # Jika tidak ada proposals, kirim list kosong
    if not proposals:
        print("[DEBUG] No proposals found, sending empty list")
    
    return render_template('dashboard_pegawai.html',
                         proposals=proposals,  # ← Kirim Proposal OBJECTS
                         stats=stats,
                         system_name="usulan-perubahan",
                         show_only_usulan=True)

# ==================== DASHBOARD SURAT PERNYATAAN (BARU) ====================
@app.route('/surat-pernyataan/dashboard')
def surat_pernyataan_dashboard():
    """Dashboard khusus untuk Surat Pernyataan"""
    # Ambil semua surat sebagai objects
    surat_list = SuratPernyataan.query.order_by(SuratPernyataan.created_at.desc()).all()
    
    # Hitung stats
    today = datetime.now().date()
    stats = {
        'total': len(surat_list),
        'recent': len([s for s in surat_list if s.created_at and s.created_at.date() > today - timedelta(days=30)]),
        'today': len([s for s in surat_list if s.created_at and s.created_at.date() == today]),
    }
    
    return render_template('dashboard_pegawai.html',
                         surat_list=surat_list,  # ← SuratPernyataan OBJECTS
                         stats=stats,
                         system_name="surat-pernyataan",
                         show_only_surat=True)

# ==================== DASHBOARD LAPORAN INSIDEN (DIPERBAIKI) ====================
@app.route('/laporan-insiden/dashboard')
def dashboard_laporan_insiden():
    """Dashboard khusus untuk Laporan Insiden"""
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return render_template('dashboard_pegawai.html',
                                 laporans=[],  # ← Empty list
                                 system_name="laporan-insiden",
                                 show_only_insiden=True)
            
        cursor = conn.cursor(dictionary=True)  # ← dictionary=True membuat hasil sebagai dict
        cursor.execute("""
            SELECT id, no_dok, no_revisi, tgl_efektif, no_permohonan,
                   tanggal_kejadian, nama_pelapor, nama_bidang,
                   deskripsi_insiden, jenis_insiden, analisa_penyebab,
                   tindak_smki, pic_tindak, tindak_pihak,
                   insiden_selesai, tanggal_penyelesaian,
                   ttd_pelapor, ttd_atasan, ttd_smki, ttd_smki2, ttd_ketua,
                   created_at
            FROM laporan 
            ORDER BY created_at DESC
        """)
        results = cursor.fetchall()  # ← List of DICTIONARIES (bukan objects)
        
        cursor.close()
        conn.close()
        
        # Hitung stats
        today = datetime.now().date()
        stats = {
            'total': len(results),
            'selesai': len([r for r in results if r.get('insiden_selesai') == 'Ya']),
            'proses': len([r for r in results if r.get('insiden_selesai') == 'Tidak']),
            'recent': len([r for r in results if r.get('created_at') and 
                          datetime.strptime(str(r['created_at']), '%Y-%m-%d %H:%M:%S').date() > today - timedelta(days=30)]),
        }
        
        return render_template('dashboard_pegawai.html',
                             laporans=results,  # ← List of DICTIONARIES
                             stats=stats,
                             system_name="laporan-insiden",
                             show_only_insiden=True)
        
    except Error as e:
        print(f"[ERROR] Dashboard laporan insiden error: {e}")
        return render_template('dashboard_pegawai.html',
                             laporans=[],  # ← Empty list
                             system_name="laporan-insiden",
                             show_only_insiden=True)

# ==================== API UNTUK DELETE SURAT PERNYATAAN ====================
@app.route('/api/surat-pernyataan/delete/<int:surat_id>', methods=['DELETE'])
def delete_surat_pernyataan(surat_id):
    """Delete Surat Pernyataan"""
    try:
        surat = SuratPernyataan.query.get(surat_id)
        
        if not surat:
            return jsonify({"success": False, "message": "Surat tidak ditemukan"}), 404
        
        # Hapus file PDF jika ada
        if surat.pdf_object:
            pdf_path = os.path.join(LOCAL_TEMP_PDF, surat.pdf_object)
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
        
        db.session.delete(surat)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Surat pernyataan dengan ID {surat_id} berhasil dihapus"
        })
        
    except Exception as e:
        print(f"[ERROR] Delete surat error: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ==================== ROUTE UNTUK DASHBOARD LAPORAN INSIDEN (DIPERBAIKI) ====================


# ==================== ROUTE UNTUK DASHBOARD SURAT PERNYATAAN ====================


# ==================== API UNTUK DELETE SURAT PERNYATAAN ====================

# ==================== PERBAIKI HOME REDIRECT ====================

@app.route('/usulan-perubahan/baru', methods=['GET', 'POST'])
def proposal_baru():
    """Buat usulan perubahan baru"""
    if request.method == 'GET':
        today = datetime.now()
        proposals_count = Proposal.query.count()
        
        return render_template('form_complete.html',
                             today_date=today.strftime('%Y-%m-%d'),
                             tomorrow_date=(today + timedelta(days=1)).strftime('%Y-%m-%d'),
                             next_week_date=(today + timedelta(days=7)).strftime('%Y-%m-%d'),
                             current_year=today.year,
                             proposal_count=proposals_count,
                             doc_number=generate_doc_number(proposals_count),
                             system_name="usulan-perubahan")
    
    if request.method == 'POST':
        try:
            form_data = request.form.to_dict()
            tipe_perubahan = request.form.getlist('tipe_perubahan')
            if tipe_perubahan:
                form_data['tipe_perubahan'] = ','.join(tipe_perubahan)
            
            # Panggil fungsi save
            result = save_proposal_complete(form_data)
            
            if isinstance(result, tuple):  # Jika ada error
                flash(result[0].json['message'], 'error')
                return redirect(url_for('proposal_baru'))
            
            flash('Usulan perubahan berhasil disimpan!', 'success')
            return redirect(url_for('main_dashboard'))  # PERUBAHAN: Redirect ke main_dashboard
            
        except Exception as e:
            flash(f'Terjadi kesalahan: {str(e)}', 'error')
            return redirect(url_for('proposal_baru'))

def save_proposal_complete(form_data):
    """Save complete proposal dengan semua data - SATU VERSI SAJA"""
    try:
        print(f"[DEBUG] save_proposal_complete called")
        print(f"[DEBUG] Form data keys: {list(form_data.keys())}")
        
        # PARSE SEMUA TANGGAL
        def parse_date(date_str):
            if not date_str:
                return None
            try:
                # Coba format YYYY-MM-DD
                return datetime.strptime(str(date_str), '%Y-%m-%d').date()
            except:
                try:
                    # Coba format DD/MM/YYYY
                    return datetime.strptime(str(date_str), '%d/%m/%Y').date()
                except:
                    try:
                        # Coba format ISO jika ada waktu
                        return datetime.fromisoformat(str(date_str)).date()
                    except:
                        print(f"[WARN] Failed to parse date: {date_str}")
                        return None
        
        # HANDLE SIGNATURE PEMOHON
        signature_filename = None
        if form_data.get('signature_data') and form_data['signature_data'].startswith('data:image'):
            identifier = f"pemohon_{datetime.now().timestamp()}"
            signature_filename = save_signature_image(
                form_data.get('signature_data'), 
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Pemohon signature saved: {signature_filename}")
        
        # GENERATE DOC NUMBER atau gunakan yang ada
        doc_number = form_data.get('no_dokumen', '')
        if not doc_number:
            proposal_count = Proposal.query.count()
            doc_number = generate_doc_number(proposal_count)
        
        print(f"[DEBUG] Document number: {doc_number}")
        
        # DETERMINE STATUS - PERBAIKI LOGIKA INI
        status = 'draft'  # default
        if form_data.get('hasil_tahapan'):
            status = 'completed'
        elif form_data.get('status_persetujuan'):
            status = 'implementation'
        elif form_data.get('tipe_perubahan'):
            status = 'evaluasi'  # Evaluasi adalah status setelah step 2
        else:
            status = 'draft'  # Hanya step 1
        
        print(f"[DEBUG] Proposal status determined: {status}")
        
        # CREATE/UPDATE PROPOSAL - PASTIKAN SEMUA FIELD DISIMPAN
        proposal = Proposal(
            tanggal=parse_date(form_data.get('tanggal')) or datetime.now().date(),
            nomor_dokumen=doc_number,
            revisi=form_data.get('revisi', '00'),
            tgl_efektif=parse_date(form_data.get('tgl_efektif')),
            diminta_oleh=form_data.get('diminta_oleh', ''),
            jabatan=form_data.get('jabatan', ''),
            deskripsi_perubahan=form_data.get('deskripsi_perubahan', ''),
            hasil_dibutuhkan_tgl=parse_date(form_data.get('hasil_dibutuhkan_tgl')),
            alasan_perubahan=form_data.get('alasan_perubahan', ''),
            status=status,
            signature_filename=signature_filename or '',
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.session.add(proposal)
        db.session.flush()  # Flush untuk dapatkan ID
        proposal_id = proposal.id
        print(f"[DEBUG] Proposal created with ID: {proposal_id}, Nomor: {doc_number}")
        
        # DEBUG: Print semua data proposal
        print(f"[DEBUG] Proposal Data:")
        print(f"  - ID: {proposal.id}")
        print(f"  - No. Dokumen: {proposal.nomor_dokumen}")
        print(f"  - Diminta Oleh: {proposal.diminta_oleh}")
        print(f"  - Jabatan: {proposal.jabatan}")
        print(f"  - Deskripsi: {proposal.deskripsi_perubahan[:50] if proposal.deskripsi_perubahan else 'Empty'}")
        print(f"  - Alasan: {proposal.alasan_perubahan[:50] if proposal.alasan_perubahan else 'Empty'}")
        print(f"  - Signature: {proposal.signature_filename}")
        
        # SAVE EVALUATION DATA JIKA ADA
        if form_data.get('tipe_perubahan'):
            tipe_perubahan = form_data.get('tipe_perubahan', '')
            if isinstance(tipe_perubahan, str):
                tipe_list = tipe_perubahan.split(',')
            else:
                tipe_list = tipe_perubahan
            
            evaluation = Evaluation(
                proposal_id=proposal_id,
                tipe_perubahan=json.dumps(tipe_list),
                prioritas=form_data.get('prioritas', ''),
                dampak_lingkungan=form_data.get('dampak_lingkungan', ''),
                upaya_dibutuhkan=form_data.get('upaya_diperlukan', ''),
                sumber_daya=form_data.get('kebutuhan_sumber_daya', ''),
                rencana_pengujian=form_data.get('rencana_pengujian', ''),
                catatan_evaluasi=form_data.get('catatan_evaluator', ''),
                keputusan='teruskan' if form_data.get('prioritas') else 'draft',
                evaluated_at=parse_date(form_data.get('tanggal_evaluasi')) or datetime.now()
            )
            db.session.add(evaluation)
            print(f"[DEBUG] Evaluation saved with data")
        
        # HANDLE APPROVAL SIGNATURE JIKA ADA
        approval_signature = None
        if form_data.get('signature_approval') and form_data['signature_approval'].startswith('data:image'):
            identifier = f"approval_{datetime.now().timestamp()}_{proposal_id}"
            approval_signature = save_signature_image(
                form_data.get('signature_approval'),
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Approval signature saved: {approval_signature}")
        
        # SAVE APPROVAL DATA JIKA ADA
        if form_data.get('status_persetujuan'):
            approval_status = form_data.get('status_persetujuan')
            keputusan = 'setuju' if approval_status == 'disetujui' else 'tolak'
            
            approval = Approval(
                proposal_id=proposal_id,
                status=approval_status,
                catatan_persetujuan=form_data.get('catatan_persetujuan', ''),
                keputusan=keputusan,
                tanggal_pelaksanaan=parse_date(form_data.get('tanggal_pelaksanaan')),
                pic_pelaksana=form_data.get('pic_pelaksana', ''),
                approved_at=parse_date(form_data.get('tanggal_persetujuan')) or datetime.now(),
                tanda_tangan_persetujuan=approval_signature or '',
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.session.add(approval)
            print(f"[DEBUG] Approval saved: {approval_status}")
        
        # HANDLE IMPLEMENTATION SIGNATURE JIKA ADA
        implementation_signature = None
        if form_data.get('signature_implementation') and form_data['signature_implementation'].startswith('data:image'):
            identifier = f"implementation_{datetime.now().timestamp()}_{proposal_id}"
            implementation_signature = save_signature_image(
                form_data.get('signature_implementation'),
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Implementation signature saved: {implementation_signature}")
        
        # SAVE IMPLEMENTATION DATA JIKA ADA
        if form_data.get('hasil_tahapan'):
            implementation = Implementation(
                proposal_id=proposal_id,
                hasil_tahapan_perubahan=form_data.get('hasil_tahapan', ''),
                hasil_pengujian=form_data.get('hasil_pengujian', ''),
                tanggal_rilis=parse_date(form_data.get('tanggal_rilis')),
                catatan_implementasi=form_data.get('catatan_implementasi', ''),
                implemented_at=parse_date(form_data.get('tanggal_implementasi')) or datetime.now(),
                tanda_tangan_pic=implementation_signature or '',
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.session.add(implementation)
            print(f"[DEBUG] Implementation saved")
        
        # COMMIT SEMUA DATA
        db.session.commit()
        print(f"[SUCCESS] All data committed successfully for proposal {proposal_id}")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error in save_proposal_complete: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return False



@app.route('/usulan-perubahan/view/<int:proposal_id>')
def view_proposal(proposal_id):
    """View proposal details"""
    proposal = Proposal.query.get(proposal_id)
    
    if not proposal:
        flash('Proposal tidak ditemukan', 'danger')
        return redirect(url_for('dashboard_usulan'))
    
    evaluation = Evaluation.query.filter_by(proposal_id=proposal_id).first()
    approval = Approval.query.filter_by(proposal_id=proposal_id).first()
    implementation = Implementation.query.filter_by(proposal_id=proposal_id).first()
    
    proposal_dict = proposal.to_dict()
    
    evaluation_dict = {}
    if evaluation:
        evaluation_dict = evaluation.to_dict()
        if isinstance(evaluation_dict.get('tipe_perubahan'), list):
            evaluation_dict['tipe_perubahan_str'] = ', '.join(evaluation_dict['tipe_perubahan'])
        else:
            evaluation_dict['tipe_perubahan_str'] = str(evaluation_dict.get('tipe_perubahan', ''))
    
    approval_dict = approval.to_dict() if approval else {}
    implementation_dict = implementation.to_dict() if implementation else {}
    
    return render_template('view_proposal.html',
                         proposal=proposal_dict,
                         evaluation=evaluation_dict,
                         approval=approval_dict,
                         implementation=implementation_dict,
                         system_name="usulan-perubahan")

@app.route('/usulan-perubahan/generate/<int:proposal_id>')
def generate_document(proposal_id):
    """Generate Word/PDF document - PERBAIKI INI"""
    try:
        print(f"[DEBUG] Generating document for proposal {proposal_id}")
        
        # Get ALL proposal data with related tables
        proposal = Proposal.query.get(proposal_id)
        
        if not proposal:
            flash('Proposal tidak ditemukan', 'danger')
            return redirect(url_for('dashboard_usulan'))
        
        # Pastikan kita mengambil data yang berelasi
        evaluation = Evaluation.query.filter_by(proposal_id=proposal_id).first()
        approval = Approval.query.filter_by(proposal_id=proposal_id).first()
        implementation = Implementation.query.filter_by(proposal_id=proposal_id).first()
        
        print(f"[DEBUG] Data ditemukan:")
        print(f"  - Proposal: {proposal.nomor_dokumen}")
        print(f"  - Evaluation: {'Ya' if evaluation else 'Tidak'}")
        print(f"  - Approval: {'Ya' if approval else 'Tidak'}")
        print(f"  - Implementation: {'Ya' if implementation else 'Tidak'}")
        
        if not os.path.exists(TEMPLATE_USULAN_PERUBAHAN):
            flash(f'Template Word tidak ditemukan', 'danger')
            return redirect(url_for('view_proposal', proposal_id=proposal_id))
        
        doc = DocxTemplate(TEMPLATE_USULAN_PERUBAHAN)
        
        # Get signature images - PASTIKAN PATH BENAR
        signature_pemohon = None
        if proposal.signature_filename:
            # Cari di beberapa lokasi yang mungkin
            possible_paths = [
                os.path.join(DATA_FOLDER, 'signatures', proposal.signature_filename),
                os.path.join('data', 'signatures', proposal.signature_filename),
                os.path.join('uploads', 'signatures', proposal.signature_filename),
                proposal.signature_filename  # Jika sudah full path
            ]
            
            for sig_path in possible_paths:
                if os.path.exists(sig_path):
                    try:
                        signature_pemohon = InlineImage(doc, sig_path, width=Mm(80))
                        print(f"[DEBUG] Signature pemohon loaded from: {sig_path}")
                        break
                    except Exception as e:
                        print(f"[WARN] Failed to load signature from {sig_path}: {e}")
                        continue
        
        signature_approval = None
        if approval and approval.tanda_tangan_persetujuan:
            approval_path = os.path.join(DATA_FOLDER, 'signatures', approval.tanda_tangan_persetujuan)
            if os.path.exists(approval_path):
                try:
                    signature_approval = InlineImage(doc, approval_path, width=Mm(80))
                    print(f"[DEBUG] Signature approval loaded")
                except Exception as e:
                    print(f"[WARN] Failed to load approval signature: {e}")
        
        signature_implementation = None
        if implementation and implementation.tanda_tangan_pic:
            impl_path = os.path.join(DATA_FOLDER, 'signatures', implementation.tanda_tangan_pic)
            if os.path.exists(impl_path):
                try:
                    signature_implementation = InlineImage(doc, impl_path, width=Mm(80))
                    print(f"[DEBUG] Signature implementation loaded")
                except Exception as e:
                    print(f"[WARN] Failed to load implementation signature: {e}")
        
        # Prepare template data dengan data lengkap
        tipe_perubahan_list = []
        if evaluation and evaluation.tipe_perubahan:
            try:
                tipe_perubahan_list = json.loads(evaluation.tipe_perubahan) if isinstance(evaluation.tipe_perubahan, str) else evaluation.tipe_perubahan
                print(f"[DEBUG] Tipe perubahan list: {tipe_perubahan_list}")
            except:
                tipe_perubahan_list = []
        
        # Format tanggal untuk template
        def format_date_for_template(date_obj):
            if not date_obj:
                return ""
            try:
                months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                         'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
                return f"{date_obj.day} {months[date_obj.month-1]} {date_obj.year}"
            except:
                return str(date_obj)
        
        # Prepare data untuk template - PASTIKAN SEMUA DATA DIMASUKKAN
        data_form = {
            # Header Dokumen
            'no_dokumen': proposal.nomor_dokumen or 'SOP/XX/IMS/XX/XXXX/XX',
            'revisi': proposal.revisi or '00',
            'tgl_efektif': format_date_for_template(proposal.tgl_efektif) if proposal.tgl_efektif else '',
            
            # A. USULAN PERUBAHAN
            'no_usulan': f"{proposal.id:03d}",
            'tanggal': format_date_for_template(proposal.tanggal) if proposal.tanggal else '',
            'diminta_oleh': proposal.diminta_oleh or '',
            'jabatan': proposal.jabatan or '',
            'deskripsi_perubahan': proposal.deskripsi_perubahan or '',
            'tgl_dibutuhkan': format_date_for_template(proposal.hasil_dibutuhkan_tgl) if proposal.hasil_dibutuhkan_tgl else '',
            'alasan_perubahan': proposal.alasan_perubahan or '',
            
            # Tanda Tangan
            'tanda_tangan_pemohon': signature_pemohon if signature_pemohon else "TTD PEMOHON",
            'tanda_tangan_persetujuan': signature_approval if signature_approval else "TTD PEMBERI PERSETUJUAN",
            'tanda_tangan_pic': signature_implementation if signature_implementation else "TTD PELAKSANA",
            
            # B. EVALUASI DAMPAK PERUBAHAN
            'is_hardware': '✓' if 'Perangkat Keras' in tipe_perubahan_list else '',
            'is_konfigurasi': '✓' if 'Konfigurasi' in tipe_perubahan_list else '',
            'is_software': '✓' if 'Software/Aplikasi' in tipe_perubahan_list else '',
            'is_database': '✓' if 'Database' in tipe_perubahan_list else '',
            'is_utilities': '✓' if 'Utilities' in tipe_perubahan_list else '',
            
            'is_normal': '✓' if evaluation and evaluation.prioritas == 'Normal' else '',
            'is_emergency': '✓' if evaluation and evaluation.prioritas == 'Emergency' else '',
            
            'dampak_produksi': evaluation.dampak_lingkungan if evaluation else '',
            'upaya_diperlukan': evaluation.upaya_dibutuhkan if evaluation else '',
            'kebutuhan_sdm': evaluation.sumber_daya if evaluation else '',
            'rencana_pengujian': evaluation.rencana_pengujian if evaluation else '',
            'catatan_evaluator': evaluation.catatan_evaluasi if evaluation else '',
            'tanggal_evaluasi': format_date_for_template(evaluation.evaluated_at) if evaluation and evaluation.evaluated_at else '',
            
            # C. PERSETUJUAN PERUBAHAN
            'status_diterima': '✓' if approval and approval.keputusan == 'setuju' else '',
            'status_ditolak': '✓' if approval and approval.keputusan == 'tolak' else '',
            
            'tgl_pelaksanaan': format_date_for_template(approval.tanggal_pelaksanaan) if approval and approval.tanggal_pelaksanaan else '',
            'pic_pelaksana': approval.pic_pelaksana if approval else '',
            'catatan_persetujuan': approval.catatan_persetujuan if approval else '',
            'tanggal_persetujuan': format_date_for_template(approval.approved_at) if approval and approval.approved_at else '',
            
            # D. IMPLEMENTASI PERUBAHAN
            'hasil_tahapan_perubahan': implementation.hasil_tahapan_perubahan if implementation else '',
            'hasil_pengujian_implementasi': implementation.hasil_pengujian if implementation else '',
            'tgl_rilis': format_date_for_template(implementation.tanggal_rilis) if implementation and implementation.tanggal_rilis else '',
            'catatan_implementasi': implementation.catatan_implementasi if implementation else '',
            'tanggal_implementasi': format_date_for_template(implementation.implemented_at) if implementation and implementation.implemented_at else '',
            
            # Metadata tambahan
            'bulan_tahun': datetime.now().strftime('%B %Y'),
            'tahun': datetime.now().strftime('%Y'),
            'nomor_urut': f"{proposal.id:03d}",
        }
        
        print(f"[DEBUG] Template data prepared with {len(data_form)} fields")
        
        # Debug beberapa field penting
        debug_fields = ['no_dokumen', 'diminta_oleh', 'jabatan', 'deskripsi_perubahan', 
                       'alasan_perubahan', 'dampak_produksi', 'hasil_tahapan_perubahan']
        for field in debug_fields:
            value = data_form.get(field, 'NOT FOUND')
            print(f"  - {field}: {value[:50] if value else 'EMPTY'}")
        
        try:
            doc.render(data_form)
            print(f"[DEBUG] Template rendered successfully")
        except Exception as render_error:
            print(f"[ERROR] Error rendering template: {render_error}")
            flash(f'Error rendering template: {str(render_error)}', 'danger')
            return redirect(url_for('view_proposal', proposal_id=proposal_id))
        
        # Save document
        safe_doc_number = proposal.nomor_dokumen.replace('/', '_').replace(' ', '_')
        filename_docx = f"Usulan_Perubahan_{safe_doc_number}.docx"
        output_docx_path = os.path.join(OUTPUT_DIR, filename_docx)
        
        try:
            doc.save(output_docx_path)
            print(f"[DEBUG] Document saved to: {output_docx_path}")
        except Exception as save_error:
            print(f"[ERROR] Error saving document: {save_error}")
            flash(f'Error saving document: {str(save_error)}', 'danger')
            return redirect(url_for('view_proposal', proposal_id=proposal_id))
        
        # Try to convert to PDF
        pdf_path = None
        if HAS_DOCX2PDF:
            try:
                pdf_path = output_docx_path.replace(".docx", ".pdf")
                convert(output_docx_path, pdf_path)
                
                if os.path.exists(pdf_path):
                    filename = f"Usulan_Perubahan_{safe_doc_number}.pdf"
                    print(f"[SUCCESS] PDF generated: {pdf_path}")
                    return send_file(
                        pdf_path,
                        as_attachment=True,
                        download_name=filename,
                        mimetype='application/pdf'
                    )
            except Exception as e:
                print(f"[WARN] PDF conversion failed: {e}")
        
        # Serve DOCX if PDF conversion failed
        flash('Konversi ke PDF gagal. File DOCX telah didownload.', 'info')
        return send_file(
            output_docx_path,
            as_attachment=True,
            download_name=filename_docx,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
            
    except Exception as e:
        print(f"[ERROR] Error generating document: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('view_proposal', proposal_id=proposal_id))

@app.route('/usulan-perubahan/edit/<int:proposal_id>', methods=['GET', 'POST'])
def edit_proposal(proposal_id):
    """Edit draft proposal"""
    try:
        proposal = Proposal.query.get(proposal_id)
        
        if not proposal or proposal.status != 'draft':
            flash('Hanya draft yang bisa diedit', 'danger')
            return redirect(url_for('dashboard_usulan'))
        
        if request.method == 'POST':
            form_data = request.form.to_dict()
            tipe_perubahan = request.form.getlist('tipe_perubahan')
            if tipe_perubahan:
                form_data['tipe_perubahan'] = ','.join(tipe_perubahan)
            
            signature_filename = proposal.signature_filename
            if form_data.get('signature_data') and form_data['signature_data'].startswith('data:image'):
                if signature_filename:
                    old_path = os.path.join(DATA_FOLDER, 'signatures', signature_filename)
                    if os.path.exists(old_path):
                        os.remove(old_path)
                
                identifier = f"pemohon_{datetime.now().timestamp()}"
                signature_filename = save_signature_image(
                    form_data['signature_data'], 
                    identifier,
                    "usulan"
                )
            
            proposal.tanggal = form_data.get('tanggal', '')
            proposal.revisi = form_data.get('revisi', '00')
            proposal.tgl_efektif = form_data.get('tgl_efektif', '')
            proposal.deskripsi_perubahan = form_data.get('deskripsi_perubahan', '')
            proposal.hasil_dibutuhkan_tgl = form_data.get('hasil_dibutuhkan_tgl', '')
            proposal.alasan_perubahan = form_data.get('alasan_perubahan', '')
            proposal.signature_filename = signature_filename or proposal.signature_filename
            proposal.updated_at = datetime.now()
            
            action = request.form.get('action', 'draft')
            if action == 'submit':
                proposal.status = 'evaluasi'
                flash_message = 'Draft berhasil dikirim sebagai usulan!'
            else:
                proposal.status = 'draft'
                flash_message = 'Draft berhasil diperbarui!'
            
            db.session.commit()
            flash(flash_message, 'success')
            return redirect(url_for('dashboard_usulan'))
        
        # GET request - load data
        evaluation = Evaluation.query.filter_by(proposal_id=proposal_id).first()
        approval = Approval.query.filter_by(proposal_id=proposal_id).first()
        implementation = Implementation.query.filter_by(proposal_id=proposal_id).first()
        
        form_data = {
            'no_dokumen': proposal.nomor_dokumen,
            'revisi': proposal.revisi,
            'tgl_efektif': proposal.tgl_efektif.strftime('%Y-%m-%d') if proposal.tgl_efektif else '',
            'tanggal': proposal.tanggal.strftime('%Y-%m-%d') if proposal.tanggal else '',
            'diminta_oleh': proposal.diminta_oleh,
            'jabatan': proposal.jabatan,
            'deskripsi_perubahan': proposal.deskripsi_perubahan,
            'hasil_dibutuhkan_tgl': proposal.hasil_dibutuhkan_tgl.strftime('%Y-%m-%d') if proposal.hasil_dibutuhkan_tgl else '',
            'alasan_perubahan': proposal.alasan_perubahan,
        }
        
        if evaluation:
            tipe_perubahan = json.loads(evaluation.tipe_perubahan) if evaluation.tipe_perubahan else []
            form_data.update({
                'tipe_perubahan': ','.join(tipe_perubahan) if tipe_perubahan else '',
                'prioritas': evaluation.prioritas,
                'dampak_lingkungan': evaluation.dampak_lingkungan,
                'upaya_diperlukan': evaluation.upaya_dibutuhkan,
                'kebutuhan_sumber_daya': evaluation.sumber_daya,
                'rencana_pengujian': evaluation.rencana_pengujian,
                'catatan_evaluator': evaluation.catatan_evaluasi,
                'tanggal_evaluasi': evaluation.evaluated_at.strftime('%Y-%m-%d') if evaluation.evaluated_at else '',
            })
        
        if approval:
            form_data.update({
                'status_persetujuan': approval.status,
                'tanggal_pelaksanaan': approval.tanggal_pelaksanaan.strftime('%Y-%m-%d') if approval.tanggal_pelaksanaan else '',
                'pic_pelaksana': approval.pic_pelaksana,
                'catatan_persetujuan': approval.catatan_persetujuan,
                'catatan_penolakan': approval.catatan_persetujuan,
                'tanggal_persetujuan': approval.approved_at.strftime('%Y-%m-%d') if approval.approved_at else '',
            })
        
        if implementation:
            form_data.update({
                'hasil_tahapan': implementation.hasil_tahapan_perubahan,
                'hasil_pengujian': implementation.hasil_pengujian,
                'tanggal_rilis': implementation.tanggal_rilis.strftime('%Y-%m-%d') if implementation.tanggal_rilis else '',
                'catatan_implementasi': implementation.catatan_implementasi,
                'tanggal_implementasi': implementation.implemented_at.strftime('%Y-%m-%d') if implementation.implemented_at else '',
            })
        
        signature_data = None
        if proposal.signature_filename:
            signature_path = os.path.join(DATA_FOLDER, 'signatures', proposal.signature_filename)
            if os.path.exists(signature_path):
                with open(signature_path, 'rb') as f:
                    signature_bytes = f.read()
                    signature_data = f"data:image/png;base64,{base64.b64encode(signature_bytes).decode('utf-8')}"
        
        today = datetime.now()
        proposals_all = Proposal.query.count()
        
        return render_template('form_complete.html',
                             edit_mode=True,
                             proposal=proposal.to_dict(),
                             form_data=form_data,
                             signature_data=signature_data,
                             draft_name=proposal.draft_name,
                             draft_notes=proposal.draft_notes,
                             today_date=today.strftime('%Y-%m-%d'),
                             tomorrow_date=(today + timedelta(days=1)).strftime('%Y-%m-%d'),
                             next_week_date=(today + timedelta(days=7)).strftime('%Y-%m-%d'),
                             current_year=today.year,
                             proposal_count=proposals_all,
                             system_name="usulan-perubahan")
                             
    except Exception as e:
        print(f"Error editing proposal: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('dashboard_usulan'))

# ==================== API ROUTES UNTUK USULAN PERUBAHAN ====================
@app.route('/api/usulan-perubahan/submit', methods=['POST'])
def submit_proposal_api():
    try:
        print(f"[DEBUG] submit_proposal_api called")
        
        # Cek content type
        if request.content_type != 'application/json':
            print(f"[WARN] Invalid content type: {request.content_type}")
            return jsonify({'success': False, 'message': 'Content type must be application/json'}), 400
        
        data = request.get_json()
        if not data:
            print(f"[WARN] No JSON data received")
            return jsonify({'success': False, 'message': 'Tidak ada data'}), 400
        
        print(f"[DEBUG] Data received. Keys: {list(data.keys())}")
        
        form_data = data.get('form_data', {})
        action = data.get('action', 'submit')
        draft_id = data.get('draft_id')
        draft_name = data.get('draft_name', '')
        draft_notes = data.get('draft_notes', '')
        
        print(f"[DEBUG] Action: {action}, Draft ID: {draft_id}")
        
        # Validasi form_data
        if not isinstance(form_data, dict):
            print(f"[ERROR] form_data is not a dict: {type(form_data)}")
            return jsonify({
                'success': False,
                'message': 'Format data tidak valid'
            }), 400
        
        # VALIDASI DATA WAJIB
        required_fields = ['no_dokumen', 'diminta_oleh', 'jabatan', 'deskripsi_perubahan']
        missing_fields = [field for field in required_fields if not form_data.get(field)]
        
        if missing_fields and action != 'draft':
            print(f"[WARN] Missing required fields: {missing_fields}")
            return jsonify({
                'success': False,
                'message': f'Data wajib tidak lengkap: {", ".join(missing_fields)}'
            }), 400
        
        if action == 'draft':
            # Simpan sebagai draft
            print(f"[DEBUG] Saving as draft...")
            result = save_draft_enhanced(form_data, draft_id, draft_name, draft_notes)
            
            # Jika draft berhasil disimpan, redirect ke dashboard
            if isinstance(result, dict) and result.get('success'):
                return jsonify({
                    'success': True,
                    'message': 'Draft berhasil disimpan!',
                    'redirect': url_for('main_dashboard')  # PERUBAHAN: Redirect ke main_dashboard
                })
            return result
            
        else:
            # Submit langsung
            print(f"[DEBUG] Submitting proposal...")
            success = save_proposal_complete(form_data)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'Usulan perubahan berhasil disimpan!',
                    'redirect': url_for('main_dashboard')  # PERUBAHAN: Redirect ke main_dashboard
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Gagal menyimpan usulan perubahan'
                }), 500
                
    except Exception as e:
        print(f"[ERROR] Error in submit_proposal_api: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'Terjadi kesalahan server: {str(e)}'
        }), 500

def parse_date_safe(date_str):
    """Parse tanggal dengan berbagai format secara aman"""
    if not date_str:
        return None
    try:
        # Coba berbagai format tanggal
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
            try:
                return datetime.strptime(str(date_str), fmt).date()
            except ValueError:
                continue
        return None
    except Exception as e:
        print(f"[WARN] Failed to parse date '{date_str}': {e}")
        return None
    
def save_draft_enhanced(form_data, draft_id=None, draft_name='', draft_notes=''):
    """Save draft dengan nama lama tapi implementasi baru"""
    try:
        print(f"[DEBUG] save_draft_enhanced called")
        print(f"[DEBUG] Draft ID: {draft_id}, Draft Name: {draft_name}")
        
        # PARSE DRAFT ID
        actual_id = None
        if draft_id and isinstance(draft_id, str):
            if draft_id.startswith('draft_'):
                try:
                    actual_id = int(draft_id.replace('draft_', ''))
                    print(f"[DEBUG] Parsed draft ID: {actual_id}")
                except ValueError:
                    print(f"[DEBUG] Invalid draft ID format: {draft_id}")
                    actual_id = None
            elif draft_id.startswith('DRAFT_'):
                try:
                    actual_id = int(draft_id.replace('DRAFT_', ''))
                    print(f"[DEBUG] Parsed DRAFT ID: {actual_id}")
                except ValueError:
                    print(f"[DEBUG] Invalid DRAFT ID format: {draft_id}")
                    actual_id = None
        elif draft_id:
            try:
                actual_id = int(draft_id)
            except:
                actual_id = None
        
        # CARI PROPOSAL
        proposal = None
        is_new = True
        
        if actual_id:
            proposal = Proposal.query.get(actual_id)
            if proposal and proposal.status == 'draft':
                is_new = False
                print(f"[DEBUG] Found existing draft: {proposal.id}")
            else:
                proposal = None
                print(f"[DEBUG] Draft not found or not a draft, creating new")
        
        # HANDLE SIGNATURE PEMOHON
        signature_pemohon = None
        if form_data.get('signature_data'):
            print(f"[DEBUG] Processing signature data")
            identifier = f"pemohon_{datetime.now().timestamp()}"
            signature_pemohon = save_signature_image(
                form_data.get('signature_data'), 
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Signature saved: {signature_pemohon}")
        
        # GENERATE DOC NUMBER
        proposal_count = Proposal.query.count()
        if not form_data.get('no_dokumen'):
            form_data['no_dokumen'] = generate_doc_number(proposal_count)
            print(f"[DEBUG] Generated doc number: {form_data['no_dokumen']}")
        
        now = datetime.now()
        
        # UPDATE ATAU CREATE PROPOSAL
        if proposal:
            # UPDATE EXISTING DRAFT
            proposal.tanggal = parse_date_safe(form_data.get('tanggal')) or now.date()
            proposal.nomor_dokumen = form_data.get('no_dokumen', proposal.nomor_dokumen or '')
            proposal.revisi = form_data.get('revisi', proposal.revisi or '00')
            proposal.tgl_efektif = parse_date_safe(form_data.get('tgl_efektif'))
            proposal.diminta_oleh = form_data.get('diminta_oleh', proposal.diminta_oleh or '')
            proposal.jabatan = form_data.get('jabatan', proposal.jabatan or '')
            proposal.deskripsi_perubahan = form_data.get('deskripsi_perubahan', proposal.deskripsi_perubahan or '')
            proposal.hasil_dibutuhkan_tgl = parse_date_safe(form_data.get('hasil_dibutuhkan_tgl'))
            proposal.alasan_perubahan = form_data.get('alasan_perubahan', proposal.alasan_perubahan or '')
            proposal.signature_filename = signature_pemohon or proposal.signature_filename
            proposal.draft_name = draft_name or proposal.draft_name
            proposal.draft_notes = draft_notes or proposal.draft_notes
            proposal.updated_at = now
            print(f"[DEBUG] Updated draft ID: {proposal.id}")
        else:
            # CREATE NEW DRAFT
            proposal = Proposal(
                tanggal=parse_date_safe(form_data.get('tanggal')) or now.date(),
                nomor_dokumen=form_data.get('no_dokumen', ''),
                revisi=form_data.get('revisi', '00'),
                tgl_efektif=parse_date_safe(form_data.get('tgl_efektif')),
                diminta_oleh=form_data.get('diminta_oleh', ''),
                jabatan=form_data.get('jabatan', ''),
                deskripsi_perubahan=form_data.get('deskripsi_perubahan', ''),
                hasil_dibutuhkan_tgl=parse_date_safe(form_data.get('hasil_dibutuhkan_tgl')),
                alasan_perubahan=form_data.get('alasan_perubahan', ''),
                status='draft',
                signature_filename=signature_pemohon or '',
                draft_name=draft_name,
                draft_notes=draft_notes,
                created_at=now,
                updated_at=now
            )
            db.session.add(proposal)
            print(f"[DEBUG] Created new draft")
        
        db.session.flush()
        print(f"[DEBUG] Draft saved. Proposal ID: {proposal.id}")
        
        # SIMPAN DATA TERKAIT
        save_draft_related_data(proposal.id, form_data, {})
        
        db.session.commit()
        print(f"[DEBUG] All data committed successfully")
        
        return jsonify({
            'success': True,
            'message': 'Draft berhasil disimpan' if is_new else 'Draft berhasil diperbarui',
            'draft_id': f"draft_{proposal.id}",
            'is_new': is_new,
            'timestamp': now.strftime('%Y-%m-%d %H:%M:%S'),
            'proposal_number': proposal.nomor_dokumen
        })
        
    except Exception as e:
        print(f"[ERROR] Error in save_draft_enhanced: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Gagal menyimpan draft: {str(e)}'
        }), 500
def save_draft_related_data(proposal_id, form_data, signatures=None):
    """Save related data for draft - nama lama tapi implementasi baru"""
    try:
        if signatures is None:
            signatures = {}
        
        print(f"[DEBUG] save_draft_related_data for proposal {proposal_id}")
        
        # HANDLE EVALUATION DATA
        if form_data.get('tipe_perubahan') or form_data.get('prioritas'):
            evaluation = Evaluation.query.filter_by(proposal_id=proposal_id).first()
            
            if evaluation:
                # UPDATE EXISTING
                evaluation.tipe_perubahan = json.dumps(
                    form_data.get('tipe_perubahan', '').split(',') 
                    if form_data.get('tipe_perubahan') else []
                )
                evaluation.prioritas = form_data.get('prioritas', '')
                evaluation.dampak_lingkungan = form_data.get('dampak_lingkungan', '')
                evaluation.upaya_dibutuhkan = form_data.get('upaya_diperlukan', '')
                evaluation.sumber_daya = form_data.get('kebutuhan_sumber_daya', '')
                evaluation.rencana_pengujian = form_data.get('rencana_pengujian', '')
                evaluation.catatan_evaluasi = form_data.get('catatan_evaluator', '')
                evaluation.keputusan = 'draft'
                evaluation.evaluated_at = parse_date_safe(form_data.get('tanggal_evaluasi'))
                evaluation.updated_at = datetime.now()
                print(f"[DEBUG] Updated evaluation")
            else:
                # CREATE NEW
                evaluation = Evaluation(
                    proposal_id=proposal_id,
                    tipe_perubahan=json.dumps(
                        form_data.get('tipe_perubahan', '').split(',') 
                        if form_data.get('tipe_perubahan') else []
                    ),
                    prioritas=form_data.get('prioritas', ''),
                    dampak_lingkungan=form_data.get('dampak_lingkungan', ''),
                    upaya_dibutuhkan=form_data.get('upaya_diperlukan', ''),
                    sumber_daya=form_data.get('kebutuhan_sumber_daya', ''),
                    rencana_pengujian=form_data.get('rencana_pengujian', ''),
                    catatan_evaluasi=form_data.get('catatan_evaluator', ''),
                    keputusan='draft',
                    evaluated_at=parse_date_safe(form_data.get('tanggal_evaluasi'))
                )
                db.session.add(evaluation)
                print(f"[DEBUG] Created new evaluation")
        
        # HANDLE APPROVAL SIGNATURE
        approval_signature = None
        if form_data.get('signature_approval'):
            identifier = f"approval_{datetime.now().timestamp()}_{proposal_id}"
            approval_signature = save_signature_image(
                form_data.get('signature_approval'),
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Approval signature saved: {approval_signature}")
        
        # HANDLE APPROVAL DATA
        if form_data.get('status_persetujuan'):
            approval = Approval.query.filter_by(proposal_id=proposal_id).first()
            
            if approval:
                # UPDATE EXISTING
                approval.status = form_data.get('status_persetujuan')
                approval.catatan_persetujuan = form_data.get('catatan_persetujuan') or form_data.get('catatan_penolakan', '')
                approval.keputusan = 'draft'
                approval.tanggal_pelaksanaan = parse_date_safe(form_data.get('tanggal_pelaksanaan'))
                approval.pic_pelaksana = form_data.get('pic_pelaksana', '')
                approval.approved_at = parse_date_safe(form_data.get('tanggal_persetujuan'))
                approval.tanda_tangan_persetujuan = approval_signature or approval.tanda_tangan_persetujuan
                approval.updated_at = datetime.now()
                print(f"[DEBUG] Updated approval")
            else:
                # CREATE NEW
                approval = Approval(
                    proposal_id=proposal_id,
                    status=form_data.get('status_persetujuan'),
                    catatan_persetujuan=form_data.get('catatan_persetujuan') or form_data.get('catatan_penolakan', ''),
                    keputusan='draft',
                    tanggal_pelaksanaan=parse_date_safe(form_data.get('tanggal_pelaksanaan')),
                    pic_pelaksana=form_data.get('pic_pelaksana', ''),
                    approved_at=parse_date_safe(form_data.get('tanggal_persetujuan')),
                    tanda_tangan_persetujuan=approval_signature or ''
                )
                db.session.add(approval)
                print(f"[DEBUG] Created new approval")
        
        # HANDLE IMPLEMENTATION SIGNATURE
        implementation_signature = None
        if form_data.get('signature_implementation'):
            identifier = f"implementation_{datetime.now().timestamp()}_{proposal_id}"
            implementation_signature = save_signature_image(
                form_data.get('signature_implementation'),
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Implementation signature saved: {implementation_signature}")
        
        # HANDLE IMPLEMENTATION DATA
        if form_data.get('hasil_tahapan'):
            implementation = Implementation.query.filter_by(proposal_id=proposal_id).first()
            
            if implementation:
                # UPDATE EXISTING
                implementation.hasil_tahapan_perubahan = form_data.get('hasil_tahapan', '')
                implementation.hasil_pengujian = form_data.get('hasil_pengujian', '')
                implementation.tanggal_rilis = parse_date_safe(form_data.get('tanggal_rilis'))
                implementation.catatan_implementasi = form_data.get('catatan_implementasi', '')
                implementation.implemented_at = parse_date_safe(form_data.get('tanggal_implementasi'))
                implementation.tanda_tangan_pic = implementation_signature or implementation.tanda_tangan_pic
                implementation.updated_at = datetime.now()
                print(f"[DEBUG] Updated implementation")
            else:
                # CREATE NEW
                implementation = Implementation(
                    proposal_id=proposal_id,
                    hasil_tahapan_perubahan=form_data.get('hasil_tahapan', ''),
                    hasil_pengujian=form_data.get('hasil_pengujian', ''),
                    tanggal_rilis=parse_date_safe(form_data.get('tanggal_rilis')),
                    catatan_implementasi=form_data.get('catatan_implementasi', ''),
                    implemented_at=parse_date_safe(form_data.get('tanggal_implementasi')),
                    tanda_tangan_pic=implementation_signature or ''
                )
                db.session.add(implementation)
                print(f"[DEBUG] Created new implementation")
        
        print(f"[DEBUG] All related data saved for proposal {proposal_id}")
            
    except Exception as e:
        print(f"[ERROR] Error in save_draft_related_data: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise e
    
@app.route('/api/usulan-perubahan/load-draft/<draft_id>', methods=['GET'])
def load_draft_api(draft_id):
    """Load draft data"""
    try:
        if draft_id.startswith('draft_'):
            actual_id = int(draft_id.replace('draft_', ''))
        elif draft_id.startswith('DRAFT_'):
            actual_id = int(draft_id.replace('DRAFT_', ''))
        else:
            actual_id = int(draft_id)
        
        proposal = Proposal.query.get(actual_id)
        
        if not proposal or proposal.status != 'draft':
            return jsonify({'success': False, 'message': 'Draft tidak ditemukan'}), 404
        
        evaluation = Evaluation.query.filter_by(proposal_id=actual_id).first()
        
        signature_data = None
        if proposal.signature_filename:
            signature_path = os.path.join(DATA_FOLDER, 'signatures', proposal.signature_filename)
            if os.path.exists(signature_path):
                with open(signature_path, 'rb') as f:
                    signature_bytes = f.read()
                    signature_data = f"data:image/png;base64,{base64.b64encode(signature_bytes).decode('utf-8')}"
        
        form_data = {
            'no_dokumen': proposal.nomor_dokumen,
            'revisi': proposal.revisi,
            'tgl_efektif': proposal.tgl_efektif.strftime('%Y-%m-%d') if proposal.tgl_efektif else '',
            'tanggal': proposal.tanggal.strftime('%Y-%m-%d') if proposal.tanggal else '',
            'diminta_oleh': proposal.diminta_oleh,
            'jabatan': proposal.jabatan,
            'deskripsi_perubahan': proposal.deskripsi_perubahan,
            'hasil_dibutuhkan_tgl': proposal.hasil_dibutuhkan_tgl.strftime('%Y-%m-%d') if proposal.hasil_dibutuhkan_tgl else '',
            'alasan_perubahan': proposal.alasan_perubahan,
            'signature_data': signature_data,
        }
        
        if evaluation:
            tipe_perubahan = json.loads(evaluation.tipe_perubahan) if evaluation.tipe_perubahan else []
            form_data.update({
                'tipe_perubahan': ','.join(tipe_perubahan) if tipe_perubahan else '',
                'prioritas': evaluation.prioritas,
                'dampak_lingkungan': evaluation.dampak_lingkungan,
                'upaya_diperlukan': evaluation.upaya_dibutuhkan,
                'kebutuhan_sumber_daya': evaluation.sumber_daya,
                'rencana_pengujian': evaluation.rencana_pengujian,
                'catatan_evaluator': evaluation.catatan_evaluasi,
                'tanggal_evaluasi': evaluation.evaluated_at.strftime('%Y-%m-%d') if evaluation.evaluated_at else '',
            })
        
        return jsonify({
            'success': True,
            'draft': {
                'id': f"draft_{proposal.id}",
                'draft_id': f"draft_{proposal.id}",
                'form_data': form_data,
                'draft_name': proposal.draft_name,
                'draft_notes': proposal.draft_notes,
                'created_at': proposal.created_at.strftime('%Y-%m-%d %H:%M:%S') if proposal.created_at else '',
                'updated_at': proposal.updated_at.strftime('%Y-%m-%d %H:%M:%S') if proposal.updated_at else '',
                'proposal_number': proposal.nomor_dokumen
            }
        })
        
    except Exception as e:
        print(f"Error loading draft: {e}")
        return jsonify({
            'success': False,
            'message': f'Gagal memuat draft: {str(e)}'
        }), 500

@app.route('/api/usulan-perubahan/delete-draft/<draft_id>', methods=['DELETE'])
def delete_draft_api(draft_id):
    """Delete draft"""
    try:
        if draft_id.startswith('draft_'):
            actual_id = int(draft_id.replace('draft_', ''))
        elif draft_id.startswith('DRAFT_'):
            actual_id = int(draft_id.replace('DRAFT_', ''))
        else:
            actual_id = int(draft_id)
        
        proposal = Proposal.query.get(actual_id)
        
        if not proposal or proposal.status != 'draft':
            return jsonify({'success': False, 'message': 'Draft tidak ditemukan'}), 404
        
        if proposal.signature_filename and not proposal.signature_filename.startswith('data:image'):
            signature_path = os.path.join(DATA_FOLDER, 'signatures', proposal.signature_filename)
            if os.path.exists(signature_path):
                os.remove(signature_path)
        
        Evaluation.query.filter_by(proposal_id=actual_id).delete()
        Approval.query.filter_by(proposal_id=actual_id).delete()
        Implementation.query.filter_by(proposal_id=actual_id).delete()
        
        db.session.delete(proposal)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Draft berhasil dihapus'})
        
    except Exception as e:
        print(f"Error deleting draft: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Gagal menghapus draft: {str(e)}'
        }), 500

@app.route('/api/usulan-perubahan/refresh', methods=['GET'])
def refresh_proposals_api():
    """Refresh proposals list"""
    try:
        proposals = Proposal.query.all()
        
        stats = {
            'total': len(proposals),
            'draft': len([p for p in proposals if p.status == 'draft']),
            'evaluasi': len([p for p in proposals if p.status == 'evaluasi']),
            'approval': len([p for p in proposals if p.status == 'approval']),
            'implementation': len([p for p in proposals if p.status == 'implementation']),
            'completed': len([p for p in proposals if p.status == 'completed']),
            'rejected': len([p for p in proposals if p.status == 'rejected']),
        }
        
        proposals_list = []
        for proposal in proposals[-10:]:
            prop_dict = proposal.to_dict()
            
            evaluation = Evaluation.query.filter_by(proposal_id=proposal.id).first()
            if evaluation:
                prop_dict['evaluation'] = evaluation.to_dict()
            
            proposals_list.append(prop_dict)
        
        return jsonify({
            'success': True,
            'stats': stats,
            'proposals': proposals_list,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ==================== ROUTE UNTUK SISTEM SURAT PERNYATAAN ====================
@app.route('/surat-pernyataan')
def surat_pernyataan_home():
    """Home page for Surat Pernyataan system"""
    return render_template("form_02.html", system_name="surat-pernyataan")

@app.route('/surat-pernyataan/test-db')
def test_db_sp():
    """Test database connection for Surat Pernyataan"""
    try:
        result = db.session.execute("SELECT 1")
        return jsonify({
            "status": "success", 
            "message": "Database connected successfully"
        })
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"Database connection failed: {str(e)}"
        }), 500

@app.route('/surat-pernyataan/generate', methods=["POST"])
def generate_surat_pernyataan():
    """Generate Surat Pernyataan PDF - DIPERBAIKI"""
    try:
        nama = request.form.get("nama", "").strip()
        nip = request.form.get("nip", "").strip()
        instansi = request.form.get("instansi", "").strip()
        kegiatan = request.form.get("kegiatan", "").strip()
        periode = request.form.get("periode", "").strip()
        kota = request.form.get("kota", "Makassar")
        ttd_base64 = request.form.get("ttd_base64", "").strip()

        print(f"[INFO] Surat Pernyataan: nama={nama}, nip={nip}, instansi={instansi}")
        print(f"[INFO] Kegiatan: {kegiatan[:50]}...")
        print(f"[INFO] Periode: {periode}")
        print(f"[INFO] TTD length: {len(ttd_base64) if ttd_base64 else 0}")

        # Validasi data
        if not all([nama, nip, instansi, kegiatan, periode]):
            error_msg = "Semua field wajib diisi"
            print(f"[ERROR] {error_msg}")
            
            # Return JSON for AJAX request
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": error_msg}), 400
            else:
                flash(error_msg, "error")
                return redirect(url_for('surat_pernyataan_home'))

        # Decode signature
        ttd_io = decode_signature(ttd_base64)
        if not ttd_io:
            error_msg = "Tanda tangan tidak valid"
            print(f"[ERROR] {error_msg}")
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": error_msg}), 400
            else:
                flash(error_msg, "error")
                return redirect(url_for('surat_pernyataan_home'))

        # Cek logo
        if not os.path.exists(LOGO_PATH):
            error_msg = f"Logo tidak ditemukan di: {LOGO_PATH}"
            print(f"[ERROR] {error_msg}")
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": error_msg}), 500
            else:
                flash(error_msg, "error")
                return redirect(url_for('surat_pernyataan_home'))

        # Setup timezone
        tz = pytz.timezone("Asia/Makassar")
        now = datetime.now(tz)
        tanggal_str = now.strftime("%d %B %Y")
        
        # Generate filename
        safe_name = safe_filename(nama)
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        pdf_name = f"Surat_Pernyataan_{safe_name}_{timestamp}.pdf"
        pdf_path = os.path.join(LOCAL_TEMP_PDF, pdf_name)
        
        print(f"[INFO] Generating PDF: {pdf_name}")

        # Generate PDF using reportlab
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from reportlab.lib.utils import ImageReader
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm, mm
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
            from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
            
            # Create PDF document
            doc = SimpleDocTemplate(
                pdf_path,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            
            # Create story (content)
            story = []
            styles = getSampleStyleSheet()
            
            # Add custom style for justified text
            justified_style = ParagraphStyle(
                'Justified',
                parent=styles['Normal'],
                alignment=TA_JUSTIFY,
                fontSize=12,
                leading=14
            )
            
            centered_style = ParagraphStyle(
                'Centered',
                parent=styles['Normal'],
                alignment=TA_CENTER,
                fontSize=12
            )
            
            # 1. Logo and Header
            if os.path.exists(LOGO_PATH):
                logo = Image(LOGO_PATH, width=80, height=80)
                logo.hAlign = 'LEFT'
                story.append(logo)
                story.append(Spacer(1, 0.5*cm))
            
            # Header text
            header_text = "<b>BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA</b><br/>"
            header_text += "STASIUN METEOROLOGI KELAS I MAKASSAR"
            story.append(Paragraph(header_text, centered_style))
            story.append(Spacer(1, 1*cm))
            
            # 2. Title
            title_text = "<b><u>SURAT PERNYATAAN</u></b><br/>"
            title_text += "<i>Menjaga Kerahasiaan Informasi</i>"
            story.append(Paragraph(title_text, centered_style))
            story.append(Spacer(1, 2*cm))
            
            # 3. Content
            content_text = f"""
            Yang bertanda tangan di bawah ini:
            <br/><br/>
            <b>Nama</b>          : {nama}
            <br/>
            <b>NIP/NIK</b>       : {nip}
            <br/>
            <b>Instansi</b>      : {instansi}
            <br/><br/>
            Dengan ini menyatakan bahwa:
            <br/><br/>
            1. Saya telah diberikan akses dan akan terlibat dalam kegiatan: <b>{kegiatan}</b>
            <br/>
            2. Periode penugasan: <b>{periode}</b>
            <br/><br/>
            Saya menyadari sepenuhnya bahwa dalam pelaksanaan kegiatan tersebut, 
            saya akan memiliki akses terhadap informasi yang bersifat rahasia dan/atau sensitif.
            <br/><br/>
            Oleh karena itu, saya dengan ini menyatakan bahwa:
            <br/><br/>
            1. Saya akan menjaga kerahasiaan seluruh informasi yang diperoleh selama menjalankan kegiatan tersebut.
            <br/>
            2. Saya tidak akan menyebarluaskan, memperbanyak, atau menggunakan informasi tersebut untuk kepentingan pribadi di luar lingkup pekerjaan.
            <br/>
            3. Saya akan menggunakan informasi tersebut hanya untuk tujuan yang telah disetujui.
            <br/>
            4. Saya akan mengembalikan seluruh dokumen dan materi terkait setelah masa penugasan berakhir.
            <br/><br/>
            Surat pernyataan ini saya buat dengan sebenarnya dan penuh kesadaran.
            <br/><br/>
            Demikian surat pernyataan ini saya buat untuk dapat dipergunakan sebagaimana mestinya.
            """
            
            story.append(Paragraph(content_text, justified_style))
            story.append(Spacer(1, 3*cm))
            
            # 4. Signature section
            signature_text = f"""
            Hormat saya,
            <br/><br/><br/><br/>
            <b><u>{nama}</u></b>
            <br/>
            NIP/NIK: {nip}
            """
            
            story.append(Paragraph(signature_text, centered_style))
            story.append(Spacer(1, 2*cm))
            
            # 5. Place and date
            place_date = f"{kota}, {tanggal_str}"
            story.append(Paragraph(place_date, centered_style))
            
            # Build PDF
            doc.build(story)
            
            if not os.path.exists(pdf_path):
                raise Exception(f"PDF file not created: {pdf_path}")
            
            file_size = os.path.getsize(pdf_path)
            print(f"[OK] PDF generated: {pdf_path} ({file_size} bytes)")
            
        except Exception as e:
            print(f"[ERROR] PDF generation failed: {e}")
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            error_msg = f"Gagal membuat PDF: {str(e)}"
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": error_msg}), 500
            else:
                flash(error_msg, "error")
                return redirect(url_for('surat_pernyataan_home'))

        # Save to database
        try:
            data = SuratPernyataan(
                nama=nama,
                nip=nip,
                instansi=instansi,
                kegiatan=kegiatan,
                periode=periode,
                pdf_object=pdf_name,
                created_at=now
            )

            db.session.add(data)
            db.session.commit()
            print(f"[OK] Data saved to DB: ID={data.id}, Nama={nama}, PDF={pdf_name}")
            
        except Exception as e:
            print(f"[ERROR] Database save failed: {e}")
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            db.session.rollback()
            
            # Even if DB fails, the PDF is created, so we can still offer download
            error_msg = f"Gagal menyimpan ke database: {str(e)}"
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    "status": "partial_success", 
                    "message": error_msg,
                    "pdf_created": True,
                    "pdf_path": pdf_name
                }), 500
            else:
                flash(error_msg, "error")
                # Still redirect to dashboard
                return redirect(url_for('main_dashboard'))

        # Success response
        success_msg = "Surat pernyataan berhasil dibuat dan disimpan!"
        print(f"[SUCCESS] {success_msg}")
        
        # Flash message for non-AJAX requests
        if not request.headers.get('X-Requested-With'):
            flash(success_msg, "success")
            return redirect(url_for('main_dashboard'))  # PERUBAHAN: Redirect ke main_dashboard
        
        # Return JSON for AJAX requests dengan redirect
        return jsonify({
            "status": "success",
            "message": success_msg,
            "redirect": url_for('main_dashboard'),  # PERUBAHAN: Redirect ke main_dashboard
            "data": {
                "id": data.id,
                "nama": nama,
                "pdf_name": pdf_name
            }
        })

    except Exception as e:
        print(f"[ERROR] Surat Pernyataan error: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        
        try:
            db.session.rollback()
        except:
            pass
        
        error_msg = f"Terjadi kesalahan server: {str(e)}"
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({"status": "error", "message": error_msg}), 500
        else:
            flash(error_msg, "error")
            return redirect(url_for('surat_pernyataan_home'))

@app.route('/surat-pernyataan/preview/<int:surat_id>')
def preview_surat_pernyataan(surat_id):
    """Preview Surat Pernyataan"""
    try:
        data = SuratPernyataan.query.get_or_404(surat_id)
        
        download_url = url_for('download_surat_pernyataan', surat_id=surat_id, _external=True)
        
        return render_template("preview_sp.html", 
                             download_url=download_url, 
                             surat_id=data.id,
                             nama=data.nama,
                             kegiatan=data.kegiatan,
                             created_at=data.created_at.strftime("%d %B %Y") if data.created_at else "",
                             filename=data.pdf_object,
                             system_name="surat-pernyataan")
    except Exception as e:
        print(f"[ERROR] Preview error: {e}")
        return f"Error: {str(e)}", 500



@app.route('/download/<filename>')
def download_file(filename):
    """Download file dari output folder"""
    try:
        if '..' in filename or '/' in filename:
            flash('Nama file tidak valid', 'danger')
            return redirect(url_for('main_dashboard'))
        
        file_path = os.path.join(OUTPUT_DIR, filename)
        
        if not os.path.exists(file_path):
            flash('File tidak ditemukan', 'danger')
            return redirect(url_for('main_dashboard'))
        
        if filename.endswith('.pdf'):
            mimetype = 'application/pdf'
        elif filename.endswith('.docx'):
            mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        else:
            mimetype = 'application/octet-stream'
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype=mimetype
        )
        
    except Exception as e:
        flash(f'Error downloading file: {str(e)}', 'danger')
        return redirect(url_for('main_dashboard'))
    
@app.route('/dokumen-saya')
def dokumen_saya():
    """Halaman dokumen saya"""
    # Ambil semua proposal yang completed
    completed_proposals = Proposal.query.filter_by(status='completed').all()
    
    # Ambil semua surat pernyataan
    surat_list = SuratPernyataan.query.order_by(SuratPernyataan.created_at.desc()).all()
    
    return render_template('dokumen_saya.html',
                         proposals=completed_proposals,
                         surat_list=surat_list,
                         system_name="dokumen-saya")

@app.route('/surat-pernyataan/download/<int:surat_id>')
def download_surat_pernyataan(surat_id):
    """Download Surat Pernyataan PDF"""
    try:
        data = SuratPernyataan.query.get_or_404(surat_id)
        
        pdf_path = os.path.join(LOCAL_TEMP_PDF, data.pdf_object)
        
        if not os.path.exists(pdf_path):
            return jsonify({
                "status": "error", 
                "message": f"File PDF tidak ditemukan: {data.pdf_object}"
            }), 404

        return send_file(
            pdf_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=data.pdf_object
        )

    except Exception as e:
        print(f"[ERROR] Download error: {e}")
        return jsonify({
            "status": "error", 
            "message": f"Gagal mengunduh file: {str(e)}"
        }), 500

@app.route('/surat-pernyataan/list')
def list_surat_pernyataan():
    """List all Surat Pernyataan"""
    try:
        surat_list = SuratPernyataan.query.order_by(SuratPernyataan.created_at.desc()).all()
        
        result = []
        for surat in surat_list:
            result.append({
                "id": surat.id,
                "nama": surat.nama,
                "nip": surat.nip,
                "instansi": surat.instansi,
                "kegiatan": surat.kegiatan[:100] + "..." if len(surat.kegiatan) > 100 else surat.kegiatan,
                "periode": surat.periode,
                "created_at": surat.created_at.strftime("%Y-%m-%d %H:%M:%S") if surat.created_at else "",
                "download_url": url_for('download_surat_pernyataan', surat_id=surat.id, _external=True),
                "preview_url": url_for('preview_surat_pernyataan', surat_id=surat.id, _external=True)
            })
        
        return jsonify({
            "status": "success", 
            "data": result,
            "count": len(result)
        })
    
    except Exception as e:
        print(f"[ERROR] List error: {e}")
        return jsonify({
            "status": "error", 
            "message": str(e)
        }), 500

# ==================== ROUTE UNTUK SISTEM LAPORAN INSIDEN ====================
@app.route('/laporan-insiden')
def laporan_insiden_form():
    """Form for Laporan Insiden"""
    return render_template("form_03.html", system_name="laporan-insiden")

@app.route('/laporan-insiden/review')
def laporan_insiden_review():
    """Review page for Laporan Insiden - KOMPATIBILITAS LAMA"""
    print("[DEBUG] laporan_insiden_review called")
    
    # Coba ambil data dari parameter URL
    data_param = request.args.get('data')
    if data_param:
        try:
            # Decode data
            decoded_data = unquote(data_param)
            laporan_data = json.loads(decoded_data)
            
            # Simpan ke session untuk digunakan di template
            session['review_data'] = laporan_data
            print(f"[DEBUG] Data loaded from URL parameter")
            
        except Exception as e:
            print(f"[ERROR] Failed to load data from URL: {e}")
    
    return render_template("review_insiden.html", system_name="laporan-insiden")

# ==================== ROUTE UNTUK PRINT LAPORAN INSIDEN ====================


# ==================== ROUTE UNTUK PRINT LAPORAN INSIDEN ====================
# ==================== PERBAIKI ROUTE PRINT LAPORAN INSIDEN ====================
@app.route('/laporan-insiden/print', methods=['GET'])
def laporan_insiden_print():
    """Print Laporan Insiden - DIPERBAIKI UNTUK SMKI & SMKI2"""
    print(f"[DEBUG] laporan_insiden_print - GET with sessionStorage")
    
    # Coba ambil dari URL parameter data_id
    data_id = request.args.get('data_id')
    is_minimal = request.args.get('minimal', '0') == '1'
    
    if data_id:
        print(f"[INFO] Loading print data with ID: {data_id}, minimal: {is_minimal}")
        
        # Cari data di sessionStorage (akan diisi oleh JavaScript)
        try:
            # Buat template yang akan memuat data dari sessionStorage
            return render_template("print_insiden.html", 
                                 laporan=None,  # Kosong, akan diisi oleh JS
                                 system_name="laporan-insiden",
                                 datetime=datetime,
                                 data_id=data_id,
                                 is_minimal=is_minimal,
                                 debug_mode=True)
        except Exception as e:
            print(f"[ERROR] Print error: {e}")
            return redirect(url_for('laporan_insiden_dashboard'))
    
    # Jika tidak ada data_id, coba ambil langsung dari database
    laporan_id = request.args.get('laporan_id')
    if laporan_id:
        try:
            return laporan_insiden_print_by_id(laporan_id)
        except:
            pass
    
    # Jika tidak ada parameter, redirect ke dashboard
    return redirect(url_for('laporan_insiden_dashboard'))


@app.route('/laporan-insiden/print/<int:laporan_id>')
def laporan_insiden_print_by_id(laporan_id):
    """Print Laporan Insiden dari database - DIPERBAIKI UNTUK SMKI & SMKI2"""
    print(f"[DEBUG] Print by ID: {laporan_id} - DENGAN TANDA TANGAN GAMBAR")
    
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return render_template("print_insiden.html", 
                                 laporan=None,
                                 error_message="Database connection failed",
                                 system_name="laporan-insiden")
            
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, no_dok, no_revisi, tgl_efektif, no_permohonan,
                   tanggal_kejadian, nama_pelapor, nama_bidang,
                   deskripsi_insiden, jenis_insiden, analisa_penyebab,
                   tindak_smki, pic_tindak, tindak_pihak,
                   insiden_selesai, tanggal_penyelesaian,
                   ttd_pelapor, ttd_atasan, ttd_smki, ttd_smki2, ttd_ketua,
                   ttd_pelapor_filename, ttd_atasan_filename, 
                   ttd_smki_filename, ttd_smki2_filename, ttd_ketua_filename,
                   nama_ttd_pelapor, nama_ttd_atasan, nama_ttd_smki, 
                   nama_ttd_smki2, nama_ttd_ketua,
                   created_at
            FROM laporan 
            WHERE id = %s
        """, (laporan_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            # Prepare data dengan base64 signatures
            laporan_data = prepare_print_data(result)
            
            # Pastikan SMKI dan SMKI2 ada
            print(f"[DEBUG] Laporan data for print:")
            print(f"  - ID: {laporan_data.get('id')}")
            print(f"  - TTD SMKI: {laporan_data.get('ttd_smki', 'MISSING')}")
            print(f"  - TTD SMKI2: {laporan_data.get('ttd_smki2', 'MISSING')}")
            print(f"  - TTD SMKI base64: {'✓' if laporan_data.get('ttd_smki_base64') else '✗'}")
            print(f"  - TTD SMKI2 base64: {'✓' if laporan_data.get('ttd_smki2_base64') else '✗'}")
            
            # Tambahkan metadata
            laporan_data['form_version'] = '2.0'
            laporan_data['has_logo'] = False
            laporan_data['print_timestamp'] = datetime.now().strftime('%d-%m-%Y %H:%M:%S')
            
            return render_template("print_insiden_direct.html",  # Template khusus database
                                 laporan=laporan_data, 
                                 system_name="laporan-insiden",
                                 datetime=datetime)
        else:
            return render_template("print_insiden.html", 
                                 laporan=None,
                                 error_message=f"Laporan dengan ID {laporan_id} tidak ditemukan",
                                 system_name="laporan-insiden")
            
    except Exception as e:
        print(f"[ERROR] Print by ID error: {e}")
        return render_template("print_insiden.html", 
                             laporan=None,
                             error_message=f"Error: {str(e)}",
                             system_name="laporan-insiden")










    
@app.route('/list-files')
def list_files():
    """List semua file output"""
    try:
        files = []
        if os.path.exists(OUTPUT_DIR):
            for file in os.listdir(OUTPUT_DIR):
                if file.endswith(('.pdf', '.docx')):
                    file_path = os.path.join(OUTPUT_DIR, file)
                    files.append({
                        'name': file,
                        'size': os.path.getsize(file_path),
                        'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
                    })
        
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        return render_template('list_files.html',
                             files=files,
                             system_name="main")
                             
    except Exception as e:
        flash(f'Error listing files: {str(e)}', 'danger')
        return redirect(url_for('main_dashboard'))

@app.route('/api/laporan-insiden/save', methods=['POST'])
def save_laporan_insiden():
    """Save Laporan Insiden to database - PERBAIKAN LENGKAP untuk semua field"""
    print("[DEBUG] save_laporan_insiden - FULL FIXED VERSION")
    
    try:
        data = request.get_json()
        if not data:
            print("[ERROR] No JSON data received")
            return jsonify({"error": "Data kosong"}), 400

        print(f"[DEBUG] Data received. Keys: {list(data.keys())}")
        print(f"[DEBUG] Status field: '{data.get('selesai')}'")
        print(f"[DEBUG] Completion date: '{data.get('tanggal_penyelesaian')}'")
        
        # ============ PERBAIKI: VALIDASI STATUS SELESAI ============
        insiden_selesai = data.get("selesai", "Tidak")
        print(f"[DEBUG] Status selesai raw from form: '{insiden_selesai}' (type: {type(insiden_selesai)})")
        
        # Pastikan hanya "Ya" atau "Tidak" (case insensitive)
        if isinstance(insiden_selesai, str):
            insiden_selesai = insiden_selesai.strip()
            if insiden_selesai.upper() == "YA":
                insiden_selesai = "Ya"
            elif insiden_selesai.upper() == "TIDAK":
                insiden_selesai = "Tidak"
            else:
                print(f"[WARN] Invalid status value: '{insiden_selesai}', default to 'Tidak'")
                insiden_selesai = "Tidak"
        else:
            print(f"[WARN] Status is not string: {insiden_selesai}, default to 'Tidak'")
            insiden_selesai = "Tidak"
            
        print(f"[DEBUG] Status after validation: '{insiden_selesai}'")
        
        # ============ PERBAIKI: TANGGAL PENYELESAIAN ============
        tanggal_penyelesaian = None
        if insiden_selesai == "Ya":
            tgl_penyelesaian = data.get("tanggal_penyelesaian", "")
            print(f"[DEBUG] Completion date raw: '{tgl_penyelesaian}'")
            
            if tgl_penyelesaian and str(tgl_penyelesaian).strip():
                try:
                    # Coba berbagai format tanggal
                    date_str = str(tgl_penyelesaian).strip()
                    
                    # Format 1: YYYY-MM-DD
                    try:
                        tanggal_penyelesaian = datetime.strptime(date_str, '%Y-%m-%d').date()
                        print(f"[DEBUG] Completion date parsed (YYYY-MM-DD): {tanggal_penyelesaian}")
                    except:
                        # Format 2: DD/MM/YYYY
                        try:
                            tanggal_penyelesaian = datetime.strptime(date_str, '%d/%m/%Y').date()
                            print(f"[DEBUG] Completion date parsed (DD/MM/YYYY): {tanggal_penyelesaian}")
                        except:
                            # Format 3: DD-MM-YYYY
                            try:
                                tanggal_penyelesaian = datetime.strptime(date_str, '%d-%m-%Y').date()
                                print(f"[DEBUG] Completion date parsed (DD-MM-YYYY): {tanggal_penyelesaian}")
                            except:
                                print(f"[WARN] Failed to parse completion date: {tgl_penyelesaian}")
                                tanggal_penyelesaian = None
                except Exception as e:
                    print(f"[ERROR] Error parsing completion date: {e}")
                    tanggal_penyelesaian = None
        else:
            print(f"[DEBUG] Incident not completed, no completion date needed")
            
        # ============ PROSES 5 TANDA TANGAN ============
        ttd_fields = [
            ('ttd_pelapor', 'Pelapor'),
            ('ttd_atasan', 'Atasan'),
            ('ttd_smki', 'SMKI'),
            ('ttd_smki2', 'SMKI 2'),
            ('ttd_ketua', 'Ketua')
        ]
        
        ttd_statuses = {}
        ttd_filenames = {}
        nama_ttd_fields = {}
        
        # Proses dan simpan setiap tanda tangan sebagai gambar
        for ttd_field, label in ttd_fields:
            ttd_data = data.get(ttd_field, "")
            nama_field = f"nama_{ttd_field}"
            nama_value = data.get(nama_field, "")
            
            # Simpan tanda tangan sebagai gambar
            if ttd_data and ttd_data.startswith('data:image'):
                try:
                    identifier = f"{ttd_field}_{datetime.now().timestamp()}"
                    signature_filename = save_signature_for_laporan(
                        ttd_data, 
                        identifier,
                        "laporan_insiden"
                    )
                    
                    if signature_filename and signature_filename != "manual":
                        ttd_statuses[ttd_field] = 'selesai'
                        ttd_filenames[f"{ttd_field}_filename"] = signature_filename
                        print(f"[SUCCESS] {label} signature saved: {signature_filename}")
                    else:
                        ttd_statuses[ttd_field] = 'manual'
                        ttd_filenames[f"{ttd_field}_filename"] = ''
                        print(f"[INFO] {label} signature: manual")
                except Exception as e:
                    print(f"[ERROR] Error saving {label} signature: {e}")
                    ttd_statuses[ttd_field] = 'manual'
                    ttd_filenames[f"{ttd_field}_filename"] = ''
            else:
                ttd_statuses[ttd_field] = 'manual' if not ttd_data else ttd_data
                ttd_filenames[f"{ttd_field}_filename"] = ''
            
            # Simpan nama penandatangan
            nama_ttd_fields[nama_field] = nama_value
            
            print(f"[DEBUG] {label}: TTD={ttd_statuses.get(ttd_field, 'manual')}, Nama={nama_value}")
            
        # ============ SIMPAN KE DATABASE ============
        conn = get_db_connection_mysql()
        if not conn:
            print("[ERROR] Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500
            
        cursor = conn.cursor()

        # SQL dengan semua kolom
        sql = """
        INSERT INTO laporan (
            no_dok, no_revisi, tgl_efektif, no_permohonan,
            tanggal_kejadian, nama_pelapor, nama_bidang,
            deskripsi_insiden, jenis_insiden, analisa_penyebab,
            tindak_smki, pic_tindak, tindak_pihak,
            insiden_selesai, tanggal_penyelesaian,
            ttd_pelapor, ttd_atasan, ttd_smki, ttd_smki2, ttd_ketua,
            ttd_pelapor_filename, ttd_atasan_filename, 
            ttd_smki_filename, ttd_smki2_filename, ttd_ketua_filename,
            nama_ttd_pelapor, nama_ttd_atasan, nama_ttd_smki, 
            nama_ttd_smki2, nama_ttd_ketua
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                  %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                  %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            data.get("no_dok", ""),
            data.get("no_revisi", "0"),
            data.get("tgl_efektif", ""),
            data.get("no_permohonan", generate_no_permohonan_laporan()),
            data.get("tanggal_kejadian", ""),
            data.get("nama_pelapor", ""),
            data.get("nama_bidang", ""),
            data.get("deskripsi_insiden", ""),
            data.get("jenis_insiden", ""),
            data.get("analisa_penyebab", ""),
            data.get("tindak_smki", ""),
            data.get("pic_tindak", ""),
            data.get("tindak_pihak", ""),
            insiden_selesai,
            tanggal_penyelesaian,
            ttd_statuses.get('ttd_pelapor', 'manual'),
            ttd_statuses.get('ttd_atasan', 'manual'),
            ttd_statuses.get('ttd_smki', 'manual'),
            ttd_statuses.get('ttd_smki2', 'manual'),
            ttd_statuses.get('ttd_ketua', 'manual'),
            ttd_filenames.get('ttd_pelapor_filename', ''),
            ttd_filenames.get('ttd_atasan_filename', ''),
            ttd_filenames.get('ttd_smki_filename', ''),
            ttd_filenames.get('ttd_smki2_filename', ''),
            ttd_filenames.get('ttd_ketua_filename', ''),
            nama_ttd_fields.get('nama_ttd_pelapor', ''),
            nama_ttd_fields.get('nama_ttd_atasan', ''),
            nama_ttd_fields.get('nama_ttd_smki', ''),
            nama_ttd_fields.get('nama_ttd_smki2', ''),
            nama_ttd_fields.get('nama_ttd_ketua', '')
        )

        print(f"[DEBUG] Executing SQL with values:")
        print(f"  - Status: {insiden_selesai}")
        print(f"  - Completion date: {tanggal_penyelesaian}")
        print(f"  - Signatures saved: {sum(1 for v in ttd_statuses.values() if v == 'selesai')}/5")
        
        cursor.execute(sql, values)
        conn.commit()
        last_id = cursor.lastrowid
        
        # Ambil data yang baru disimpan
        cursor.execute("SELECT * FROM laporan WHERE id = %s", (last_id,))
        result = cursor.fetchone()
        column_names = [desc[0] for desc in cursor.description]
        
        saved_data = dict(zip(column_names, result)) if result else {}
        
        cursor.close()
        conn.close()

        print(f"[SUCCESS] Data saved. ID: {last_id}, Status: {insiden_selesai}")
        
        # Siapkan data untuk response
        response_data = prepare_print_data(saved_data)
        
        return jsonify({
            "status": "ok",
            "id": last_id,
            "message": "Laporan berhasil disimpan",
            "data": response_data,
            "print_url": url_for('laporan_insiden_print_by_id', laporan_id=last_id),
            "redirect": url_for('main_dashboard')  # PERUBAHAN: Tambahkan redirect
        }), 200

    except Exception as e:
        print(f"[ERROR] save_laporan_insiden: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({
            "error": f"Server error: {str(e)}"
        }), 500

def prepare_print_data(laporan_data):
    """Prepare laporan data for print with base64 signatures"""
    if not laporan_data:
        return {}
    
    # Convert to dict if not already
    if not isinstance(laporan_data, dict):
        if hasattr(laporan_data, '__dict__'):
            laporan_data = laporan_data.__dict__
        else:
            laporan_data = dict(laporan_data)
    
    # Tambahkan base64 untuk setiap tanda tangan
    ttd_fields = ['pelapor', 'atasan', 'smki', 'smki2', 'ketua']
    
    for field in ttd_fields:
        ttd_status = laporan_data.get(f'ttd_{field}', '')
        ttd_filename = laporan_data.get(f'ttd_{field}_filename', '')
        
        # Jika ada filename, convert ke base64
        if ttd_filename and ttd_status == 'selesai':
            base64_data = convert_signature_to_base64(ttd_filename)
            if base64_data:
                laporan_data[f'ttd_{field}_base64'] = base64_data
                laporan_data[f'ttd_{field}_has_image'] = True
            else:
                laporan_data[f'ttd_{field}_has_image'] = False
        else:
            laporan_data[f'ttd_{field}_has_image'] = False
    
    # Format tanggal untuk display
    def format_date_display(date_value):
        if not date_value:
            return ""
        try:
            if isinstance(date_value, datetime):
                return date_value.strftime('%d-%m-%Y')
            elif isinstance(date_value, date):
                return date_value.strftime('%d-%m-%Y')
            else:
                # Try to parse string
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
                    try:
                        date_obj = datetime.strptime(str(date_value), fmt)
                        return date_obj.strftime('%d-%m-%Y')
                    except:
                        continue
                return str(date_value)
        except:
            return str(date_value)
    
    # Format specific dates
    date_fields = ['tgl_efektif', 'tanggal_kejadian', 'tanggal_penyelesaian', 'created_at']
    for field in date_fields:
        if field in laporan_data:
            laporan_data[f'{field}_formatted'] = format_date_display(laporan_data[field])
    
    return laporan_data

# Tambahkan fungsi ini setelah fungsi save_laporan_insiden
def generate_no_permohonan_laporan():
    """Generate nomor permohonan untuk laporan insiden"""
    now = datetime.now()
    return f"INS-{now.strftime('%Y%m%d-%H%M%S')}"

@app.route('/api/laporan-insiden/preview', methods=['POST'])
def preview_laporan_insiden():
    """Preview Laporan Insiden without saving"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Data kosong"}), 400
    
    return jsonify({
        "status": "ok",
        "message": "Data siap untuk preview",
        "data": data
    }), 200

@app.route('/api/laporan-insiden/data', methods=['GET'])
def get_laporan_insiden_data():
    """Get Laporan Insiden data"""
    try:
        conn = get_db_connection_mysql()
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500
            
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM laporan ORDER BY created_at DESC LIMIT 10")
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "ok",
            "count": len(results),
            "data": results
        }), 200
        
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/laporan-insiden/dashboard')
def laporan_insiden_dashboard():
    """Dashboard for Laporan Insiden"""
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return render_template("dashboard_pegawai.html", 
                                 laporans=[], 
                                 system_name="laporan-insiden",
                                 show_only_insiden=True)
            
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, no_dok, no_permohonan, nama_pelapor, 
                   tanggal_kejadian, insiden_selesai, created_at 
            FROM laporan 
            ORDER BY created_at DESC 
            LIMIT 50
        """)
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        for laporan in results:
            if laporan['tanggal_kejadian']:
                laporan['tanggal_kejadian'] = format_date(str(laporan['tanggal_kejadian']))
            if laporan['created_at']:
                laporan['created_at'] = laporan['created_at'].strftime('%d-%m-%Y %H:%M')
        
        return render_template("dashboard_pegawai.html", 
                             laporans=results, 
                             system_name="laporan-insiden",
                             show_only_insiden=True)
        
    except Error as e:
        print(f"[ERROR] Dashboard error: {e}")
        return render_template("dashboard_pegawai.html", 
                             laporans=[], 
                             system_name="laporan-insiden",
                             show_only_insiden=True)

@app.route('/api/laporan-insiden/delete/<int:laporan_id>', methods=['POST'])
def delete_laporan_insiden(laporan_id):
    """Delete Laporan Insiden"""
    try:
        conn = get_db_connection_mysql()
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500
            
        cursor = conn.cursor()
        cursor.execute("DELETE FROM laporan WHERE id = %s", (laporan_id,))
        conn.commit()
        
        affected_rows = cursor.rowcount
        cursor.close()
        conn.close()
        
        if affected_rows > 0:
            return jsonify({
                "status": "ok",
                "message": f"Laporan dengan ID {laporan_id} berhasil dihapus"
            }), 200
        else:
            return jsonify({
                "error": f"Laporan dengan ID {laporan_id} tidak ditemukan"
            }), 404
            
    except Error as e:
        return jsonify({"error": str(e)}), 500

# ==================== MAIN DASHBOARD (INTEGRATED) ====================


# ==================== UPDATE MAIN DASHBOARD ====================
  # Tambah parameter ini

# ==================== STATIC FILE SERVING ====================
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory('uploads', filename)

@app.route('/data/<path:filename>')
def serve_data(filename):
    return send_from_directory('data', filename)

# ==================== TEMPLATE FILTERS ====================
@app.template_filter('format_date')
def format_date_filter(value, format='%d/%m/%Y'):
    if not value or value in ('', 'None'):
        return '-'
    try:
        if isinstance(value, str):
            date_formats = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%Y-%m-%d %H:%M:%S']
            for date_format in date_formats:
                try:
                    date_obj = datetime.strptime(str(value), date_format)
                    return date_obj.strftime(format)
                except ValueError:
                    continue
        return str(value)
    except Exception:
        return str(value)

# ==================== ERROR HANDLERS ====================
@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors - IGNORE CHROME DEVTOOLS REQUESTS"""
    url = request.url
    
    # Ignore Chrome DevTools requests
    if '.well-known/appspecific/com.chrome.devtools' in url:
        print(f"[INFO] Ignoring Chrome DevTools request: {url}")
        return '', 204  # No content
    
    if '.well-known/' in url:
        print(f"[INFO] Ignoring .well-known request: {url}")
        return '', 204
    
    # Log the error
    print(f"[404] Page not found: {request.url}")
    
    # Return JSON if request is AJAX
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': False,
            'error': 'Page not found',
            'message': 'The requested URL was not found on the server.',
            'url': request.url
        }), 404
    
    # Return HTML page for regular requests
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    """Handle 500 errors"""
    print(f"[500] Internal Server Error: {e}")
    print(traceback.format_exc())
    
    # Return JSON if request is AJAX
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': str(e) if str(e) else 'An internal server error occurred.',
            'traceback': traceback.format_exc()
        }), 500
    
    # Return HTML page for regular requests
    return render_template('500.html', error=str(e)), 500

@app.errorhandler(500)
def internal_server_error(e):
    print(f'Internal Server Error: {e}')
    return render_template('500.html', error=str(e)), 500

@app.errorhandler(413)
def too_large(e):
    flash('File terlalu besar. Maksimum 5MB.', 'danger')
    return redirect(request.url)

# ==================== INITIALIZE DATABASE ====================
def init_databases():
    """Initialize all databases"""
    with app.app_context():
        # SQLAlchemy database
        db.create_all()
        print("[OK] SQLAlchemy database tables created")
        
        # MySQL database for Laporan Insiden
        if create_laporan_table():
            print("[OK] MySQL laporan table created/verified")
        
        # Update untuk 5 nama TTD
        if update_laporan_table():
            print("[OK] Updated laporan table with 5 name fields")
        
        # Test connections
        try:
            proposal_count = Proposal.query.count()
            surat_count = SuratPernyataan.query.count()
            print(f"[INFO] Usulan Perubahan: {proposal_count} records")
            print(f"[INFO] Surat Pernyataan: {surat_count} records")
        except Exception as e:
            print(f"[ERROR] Database test failed: {e}")

# ==================== CLEANUP FUNCTIONS ====================
def clean_temp_files():
    """Clean temporary files"""
    try:
        temp_dir = os.path.join(OUTPUT_DIR, 'temp_signatures')
        if os.path.exists(temp_dir):
            now = time.time()
            for file in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, file)
                if os.path.isfile(file_path):
                    file_age = now - os.path.getmtime(file_path)
                    if file_age > 3600:
                        os.remove(file_path)
    except Exception as e:
        print(f"Error cleaning temp files: {e}")

def update_laporan_table():
    """Update laporan table untuk 5 nama penandatangan"""
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
        # Cek apakah kolom sudah ada
        cursor.execute("""
            SHOW COLUMNS FROM laporan LIKE 'nama_ttd_pelapor'
        """)
        
        if not cursor.fetchone():
            # Tambahkan kolom untuk 5 nama penandatangan
            alter_sql = """
                ALTER TABLE laporan
                ADD COLUMN nama_ttd_pelapor VARCHAR(100),
                ADD COLUMN nama_ttd_atasan VARCHAR(100),
                ADD COLUMN nama_ttd_smki VARCHAR(100),
                ADD COLUMN nama_ttd_smki2 VARCHAR(100),
                ADD COLUMN nama_ttd_ketua VARCHAR(100)
            """
            cursor.execute(alter_sql)
            conn.commit()
            print("[SUCCESS] Updated laporan table with 5 name fields")
        else:
            print("[INFO] Name fields already exist in laporan table")
        
        cursor.close()
        conn.close()
        return True
        
    except Error as e:
        print(f"[ERROR] Updating laporan table: {e}")
        return False

# ==================== RUN APP ====================
if __name__ == '__main__':
    # Initialize all databases
    init_databases()
    
    # Clean temp files
    clean_temp_files()
    
    print("\n" + "="*80)
    print("SISTEM TERINTEGRASI BMKG - 3 SISTEM DALAM 1 APLIKASI")
    print("="*80)
    print("\n[SYSTEM 1] USULAN PERUBAHAN")
    print("  Dashboard    : http://localhost:5000/usulan-perubahan/dashboard")
    print("  Buat Baru    : http://localhost:5000/usulan-perubahan/baru")
    print("  API Refresh  : http://localhost:5000/api/usulan-perubahan/refresh")
    
    print("\n[SYSTEM 2] SURAT PERNYATAAN")
    print("  Form Input   : http://localhost:5000/surat-pernyataan")
    print("  List Surat   : http://localhost:5000/surat-pernyataan/list")
    print("  Test DB      : http://localhost:5000/surat-pernyataan/test-db")
    
    print("\n[SYSTEM 3] LAPORAN INSIDEN")
    print("  Form Input   : http://localhost:5000/laporan-insiden")
    print("  Dashboard    : http://localhost:5000/laporan-insiden/dashboard")
    print("  API Data     : http://localhost:5000/api/laporan-insiden/data")
    
    print("\n[INTEGRATED]")
    print("  Main Dashboard: http://localhost:5000/dashboard")
    print("  Home          : http://localhost:5000/")
    
    print("\n[INFO]")
    print(f"  Template dir: {TEMPLATE_DIR}")
    print(f"  Output dir  : {OUTPUT_DIR}")
    print(f"  Data dir    : {DATA_FOLDER}")
    print(f"  Temp PDF dir: {LOCAL_TEMP_PDF}")
    print(f"  Logo path   : {LOGO_PATH}")
    
    if not os.path.exists(LOGO_PATH):
        print(f"\n[WARNING] Logo tidak ditemukan di: {LOGO_PATH}")
        print("          Pastikan file logo_bmkg.png ada di static/images/")
    
    if not os.path.exists(TEMPLATE_USULAN_PERUBAHAN):
        print(f"\n[WARNING] Template usulan perubahan tidak ditemukan")
        print(f"          Pastikan file usulan_perubahan.docx ada di {TEMPLATE_DIR}/")
    
    print("\n" + "="*80)
    print("[READY] Server berjalan di http://localhost:5000")
    print("="*80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)