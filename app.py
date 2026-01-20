import traceback
import os
import sys
import base64
import uuid
import json
import time
import logging
import pytz
from datetime import datetime, timedelta, date
from io import BytesIO
from logging.handlers import RotatingFileHandler
from functools import wraps

from flask import Flask, render_template, redirect, url_for, request, session, flash, jsonify, send_file, send_from_directory, make_response
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

# ==================== WINDOWS COM LIBRARIES ====================
try:
    import pythoncom
    HAS_PYTHONCOM = True
    print("[OK] pythoncom available for Windows COM")
except ImportError:
    HAS_PYTHONCOM = False
    print("[INFO] pythoncom not installed")

try:
    import win32com.client
    HAS_WIN32COM = True
    print("[OK] win32com available for Windows COM")
except ImportError:
    HAS_WIN32COM = False
    print("[INFO] win32com not installed")

# ==================== APP INITIALIZATION ====================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.secret_key = 'bmkg-integrated-secret-key-2024'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

# ==================== KONFIGURASI DATABASE ====================
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
TEMPLATE_SURAT_PERNYATAAN = os.path.join(TEMPLATE_DIR, 'surat_pernyataan_template.docx')
TEMPLATE_LAPORAN_INSIDEN = os.path.join(TEMPLATE_DIR, 'laporan_insiden_template.docx')
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
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
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

# ==================== MODEL SURAT PERNYATAAN (DIPERBARUI) ====================
class SuratPernyataan(db.Model):
    __tablename__ = 'surat_pernyataan'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nama = db.Column(db.String(100), nullable=False)
    nip = db.Column(db.String(20), nullable=False)
    instansi = db.Column(db.String(100), nullable=False)
    kegiatan = db.Column(db.Text, nullable=False)
    periode = db.Column(db.String(50), nullable=False)
    kota = db.Column(db.String(100), default='Makassar')
    tanggal_surat = db.Column(db.Date)
    pdf_object = db.Column(db.String(255), nullable=False)
    tanda_tangan = db.Column(db.String(255))
    nama_petugas = db.Column(db.String(100))
    jabatan = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nama': self.nama,
            'nip': self.nip,
            'instansi': self.instansi,
            'kegiatan': self.kegiatan,
            'periode': self.periode,
            'kota': self.kota,
            'tanggal_surat': self.tanggal_surat.strftime('%Y-%m-%d') if self.tanggal_surat else None,
            'pdf_object': self.pdf_object,
            'tanda_tangan': self.tanda_tangan,
            'nama_petugas': self.nama_petugas or self.nama,
            'jabatan': self.jabatan or '',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
        }

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
                if ',' in signature_data:
                    _, encoded = signature_data.split(',', 1)
                else:
                    encoded = signature_data
                
                signature_bytes = base64.b64decode(encoded)
                print(f"[DEBUG] Signature bytes length: {len(signature_bytes)}")
                
                img = Image.open(BytesIO(signature_bytes))
                img.verify()
                img = Image.open(BytesIO(signature_bytes))
            except Exception as e:
                print(f"[ERROR] Error processing signature image: {e}")
                return None
        else:
            print(f"[DEBUG] Signature is not data:image format, returning as-is")
            return signature_data
        
        if img.mode in ('RGBA', 'LA', 'P'):
            print(f"[DEBUG] Converting image from {img.mode} to RGB")
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        signatures_dir = os.path.join(DATA_FOLDER, 'signatures')
        os.makedirs(signatures_dir, exist_ok=True)
        print(f"[DEBUG] Signatures dir: {signatures_dir}")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"signature_{system_name}_{identifier}_{timestamp}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join(signatures_dir, filename)
        
        img.save(filepath, 'PNG', optimize=True)
        print(f"[DEBUG] Signature saved to: {filepath}")
        
        return filename
        
    except Exception as e:
        print(f"[ERROR] Error saving signature: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return None

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

def format_date(date_str, format_input='%Y-%m-%d', format_output='%d-%m-%Y'):
    """Format date for display"""
    if not date_str:
        return "-"
    try:
        if isinstance(date_str, datetime):
            return date_str.strftime(format_output)
        
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
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password=""
        )
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS bmkg_change_proposal")
        cursor.close()
        conn.close()
        
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

# ==================== FUNGSI GENERATE DARI TEMPLATE ====================

def generate_docx_from_template(template_path, data, output_filename):
    """Generate DOCX from template"""
    try:
        if not os.path.exists(template_path):
            print(f"[ERROR] Template not found: {template_path}")
            return None
        
        doc = DocxTemplate(template_path)
        doc.render(data)
        
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        doc.save(output_path)
        
        print(f"[SUCCESS] Document generated: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"[ERROR] Failed to generate document: {e}")
        return None

# ==================== FUNGSI KONVERSI PDF YANG DIPERBAIKI ====================

def convert_docx_to_pdf_robust(docx_path, pdf_path):
    """Convert DOCX to PDF dengan error handling yang lebih baik"""
    try:
        if not os.path.exists(docx_path):
            print(f"[ERROR] DOCX file not found: {docx_path}")
            return False
        
        print(f"[DEBUG] Converting DOCX to PDF: {docx_path} -> {pdf_path}")
        
        # Pastikan output directory ada
        os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
        
        # Method 1: Try docx2pdf with COM initialization
        if HAS_DOCX2PDF:
            try:
                # Inisialisasi COM untuk Windows jika perlu
                if sys.platform == 'win32' and HAS_PYTHONCOM:
                    pythoncom.CoInitialize()
                    print("[DEBUG] COM initialized for Windows")
                
                convert(docx_path, pdf_path)
                
                if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
                    print(f"[SUCCESS] PDF created with docx2pdf: {pdf_path}")
                    return True
                else:
                    print(f"[WARN] PDF created but might be empty")
                    return False
                    
            except Exception as e:
                print(f"[WARN] docx2pdf conversion failed: {e}")
                # Lanjut ke metode lain
        
        # Method 2: Try win32com (Microsoft Word)
        if HAS_WIN32COM and sys.platform == 'win32':
            try:
                pythoncom.CoInitialize()
                word = win32com.client.Dispatch("Word.Application")
                word.Visible = False
                
                # Convert absolute paths
                docx_abs = os.path.abspath(docx_path)
                pdf_abs = os.path.abspath(pdf_path)
                
                doc = word.Documents.Open(docx_abs)
                doc.SaveAs(pdf_abs, FileFormat=17)  # 17 = PDF format
                doc.Close()
                word.Quit()
                
                if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
                    print(f"[SUCCESS] PDF created with Word COM: {pdf_path}")
                    return True
                    
            except Exception as e:
                print(f"[WARN] Word COM conversion failed: {e}")
        
        # Method 3: Try pdfkit jika wkhtmltopdf terinstall
        if HAS_PDFKIT:
            try:
                # Cek jika wkhtmltopdf tersedia
                if sys.platform == 'win32':
                    wkhtmltopdf_paths = [
                        'C:/Program Files/wkhtmltopdf/bin/wkhtmltopdf.exe',
                        'C:/Program Files (x86)/wkhtmltopdf/bin/wkhtmltopdf.exe'
                    ]
                    config = None
                    for path in wkhtmltopdf_paths:
                        if os.path.exists(path):
                            config = pdfkit.configuration(wkhtmltopdf=path)
                            break
                else:
                    config = pdfkit.configuration(wkhtmltopdf='/usr/bin/wkhtmltopdf')
                
                if config:
                    pdfkit.from_file(docx_path, pdf_path, configuration=config)
                    
                    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
                        print(f"[SUCCESS] PDF created with pdfkit: {pdf_path}")
                        return True
                        
            except Exception as e:
                print(f"[WARN] pdfkit conversion failed: {e}")
        
        # Method 4: Try subprocess dengan LibreOffice/OpenOffice
        try:
            import subprocess
            
            if sys.platform == 'win32':
                # Cari LibreOffice di Windows
                lo_paths = [
                    r"C:\Program Files\LibreOffice\program\soffice.exe",
                    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
                ]
            else:
                lo_paths = ["/usr/bin/libreoffice", "/usr/bin/soffice"]
            
            for lo_exe in lo_paths:
                if os.path.exists(lo_exe):
                    cmd = [
                        lo_exe,
                        '--headless',
                        '--convert-to', 'pdf:writer_pdf_Export',
                        '--outdir', os.path.dirname(pdf_path),
                        os.path.abspath(docx_path)
                    ]
                    
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        # Cari file PDF yang dihasilkan
                        base_name = os.path.splitext(os.path.basename(docx_path))[0]
                        generated_pdf = os.path.join(os.path.dirname(pdf_path), f"{base_name}.pdf")
                        
                        if os.path.exists(generated_pdf):
                            # Rename ke path yang diinginkan
                            if generated_pdf != pdf_path:
                                os.rename(generated_pdf, pdf_path)
                            
                            print(f"[SUCCESS] PDF created with LibreOffice: {pdf_path}")
                            return True
                        
            print(f"[WARN] LibreOffice/OpenOffice not found or failed")
            
        except Exception as e:
            print(f"[WARN] LibreOffice conversion failed: {e}")
        
        print(f"[ERROR] All PDF conversion methods failed")
        return False
        
    except Exception as e:
        print(f"[ERROR] PDF conversion failed: {e}")
        traceback.print_exc()
        return False

def convert_to_pdf(docx_path):
    """Convert DOCX to PDF - wrapper untuk compatibility"""
    try:
        if not os.path.exists(docx_path):
            print(f"[ERROR] DOCX file not found: {docx_path}")
            return None
        
        pdf_path = docx_path.replace('.docx', '.pdf')
        
        success = convert_docx_to_pdf_robust(docx_path, pdf_path)
        
        if success and os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
            print(f"[SUCCESS] PDF created: {pdf_path}")
            return pdf_path
        
        print(f"[WARN] PDF conversion failed for {docx_path}")
        return None
        
    except Exception as e:
        print(f"[WARN] PDF conversion failed: {e}")
        return None

def generate_surat_pernyataan_docx(surat_data):
    """Generate Surat Pernyataan dari template Word - PERBESAR TTD"""
    try:
        print(f"[DEBUG] ⚡ Generating surat pernyataan from template")
        
        if not os.path.exists(TEMPLATE_SURAT_PERNYATAAN):
            print(f"[ERROR] ❌ Template not found: {TEMPLATE_SURAT_PERNYATAAN}")
            return None
        
        doc = DocxTemplate(TEMPLATE_SURAT_PERNYATAAN)
        
        # Format tanggal Indonesia
        def format_date_indonesia(date_value):
            if not date_value:
                return datetime.now().strftime("%d %B %Y")
            
            try:
                if isinstance(date_value, str):
                    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
                        try:
                            date_obj = datetime.strptime(date_value, fmt)
                            break
                        except:
                            continue
                    else:
                        date_obj = datetime.now()
                elif hasattr(date_value, 'strftime'):
                    date_obj = date_value
                else:
                    date_obj = datetime.now()
                
                bulan = [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ]
                return f"{date_obj.day} {bulan[date_obj.month-1]} {date_obj.year}"
                
            except Exception as e:
                print(f"[WARN] ⚠️ Date formatting error: {e}")
                return datetime.now().strftime("%d %B %Y")
        
        # ============ PERBESAR TANDA TANGAN ============
        print(f"[DEBUG] 🖋️ Processing signature...")
        tanda_tangan_image = None
        
        if surat_data.get('tanda_tangan'):
            signature_filename = surat_data['tanda_tangan']
            print(f"[DEBUG] 📁 Signature filename: {signature_filename}")
            
            # Cari file signature
            possible_paths = [
                os.path.join(DATA_FOLDER, 'signatures', signature_filename),
                os.path.join('data', 'signatures', signature_filename),
                os.path.join('uploads', 'signatures', signature_filename),
                signature_filename
            ]
            
            for sig_path in possible_paths:
                if os.path.exists(sig_path):
                    try:
                        print(f"[DEBUG] ✅ Found signature at: {sig_path}")
                        
                        # **PERBESAR TANDA TANGAN: width=Mm(100)**
                        tanda_tangan_image = InlineImage(doc, sig_path, width=Mm(100))
                        
                        # Cek ukuran asli gambar
                        img = Image.open(sig_path)
                        print(f"[DEBUG] 🖼️ Original image size: {img.size}")
                        print(f"[DEBUG] 🖼️ Image mode: {img.mode}")
                        
                        # **OPTIONAL: Optimize image quality**
                        if img.mode in ('RGBA', 'LA', 'P'):
                            print(f"[DEBUG] 🔄 Converting image from {img.mode} to RGB")
                            background = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                            img = background
                            # Save optimized version
                            optimized_path = sig_path.replace('.png', '_optimized.png')
                            img.save(optimized_path, 'PNG', optimize=True, dpi=(300, 300))
                            tanda_tangan_image = InlineImage(doc, optimized_path, width=Mm(100))
                            print(f"[DEBUG] ✅ Optimized image saved: {optimized_path}")
                        
                        break
                    except Exception as e:
                        print(f"[ERROR] ❌ Failed to load signature from {sig_path}: {e}")
                        continue
            
            if not tanda_tangan_image:
                print(f"[WARN] ⚠️ Signature file not found, using placeholder")
                tanda_tangan_image = "[TTD]"
        else:
            print(f"[WARN] ⚠️ No signature filename in data")
            tanda_tangan_image = "[TTD]"
        
        print(f"[DEBUG] 🖋️ Signature type: {type(tanda_tangan_image)}")
        
        # ============ Siapkan Data Template ============
        tanggal_surat = surat_data.get('tanggal_surat', datetime.now().date())
        tanggal_formatted = format_date_indonesia(tanggal_surat)
        
        # Data untuk template - GUNAKAN placeholder 'tanda_tangan'
        template_data = {
            'nama': surat_data.get('nama', ''),
            'nip': surat_data.get('nip', ''),
            'instansi': surat_data.get('instansi', ''),
            'kegiatan': surat_data.get('kegiatan', ''),
            'periode': surat_data.get('periode', ''),
            'kota': surat_data.get('kota', 'Makassar'),
            'tanggal_surat': tanggal_formatted,
            
            # **TANDA TANGAN DIPERBESAR**
            'tanda_tangan': tanda_tangan_image,
            
            'nama_petugas': surat_data.get('nama_petugas', surat_data.get('nama', '')),
            'jabatan': surat_data.get('jabatan', ''),
        }
        
        print(f"[DEBUG] 📋 Template data prepared")
        
        # ============ Render Template ============
        try:
            print(f"[DEBUG] 🎨 Rendering template...")
            doc.render(template_data)
            print(f"[DEBUG] ✅ Template rendered successfully")
        except Exception as render_error:
            print(f"[ERROR] ❌ Error rendering template: {render_error}")
            return None
        
        # ============ Save Document ============
        safe_name = safe_filename(surat_data.get('nama', 'unknown'))
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Surat_Pernyataan_{safe_name}_{timestamp}.docx"
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        doc.save(output_path)
        print(f"[SUCCESS] ✅ Document saved: {output_path}")
        
        return output_path
        
    except Exception as e:
        print(f"[ERROR] ❌ Error generating surat pernyataan: {e}")
        print(f"[ERROR] 📝 Traceback: {traceback.format_exc()}")
        return None

# ==================== FUNGSI UTILITAS BARU UNTUK MENGATASI MASALAH CACHE ====================

def disable_cache(f):
    """Decorator untuk menonaktifkan cache pada response"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = f(*args, **kwargs)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        # Tambahkan timestamp unik dalam header
        response.headers['X-Generated-At'] = str(time.time())
        return response
    return decorated_function

def send_file_with_cache_control(filepath, filename, mimetype):
    """Send file dengan cache control yang tepat"""
    try:
        if not os.path.exists(filepath):
            print(f"[ERROR] File not found: {filepath}")
            return None
        
        response = make_response(send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype=mimetype
        ))
        
        # Set header untuk mencegah caching
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        # Tambahkan timestamp unik
        response.headers['X-Unique-ID'] = str(uuid.uuid4())[:8]
        response.headers['X-Filename'] = filename
        
        return response
        
    except Exception as e:
        print(f"[ERROR] Error in send_file_with_cache_control: {e}")
        return None

def clear_old_pdf_files(prefix, max_age_minutes=5):
    """Hapus file PDF lama untuk mencegah penumpukan"""
    try:
        import glob
        current_time = time.time()
        
        pattern = os.path.join(OUTPUT_DIR, f"*{prefix}*.pdf")
        pdf_files = glob.glob(pattern)
        
        for pdf_file in pdf_files:
            try:
                file_age = current_time - os.path.getmtime(pdf_file)
                if file_age > (max_age_minutes * 60):
                    os.remove(pdf_file)
                    print(f"[CLEANUP] Removed old PDF: {pdf_file}")
            except Exception as e:
                print(f"[WARN] Failed to remove old PDF {pdf_file}: {e}")
                
    except Exception as e:
        print(f"[WARN] Error in clear_old_pdf_files: {e}")

def generate_unique_filename(base_name, extension):
    """Generate nama file unik dengan timestamp"""
    timestamp = int(time.time() * 1000)  # Milliseconds
    unique_id = str(uuid.uuid4())[:8]
    safe_base = "".join(c for c in base_name if c.isalnum() or c in ('-', '_')).rstrip()
    return f"{safe_base}_{timestamp}_{unique_id}.{extension}"

def get_or_create_pdf(docx_path, prefix):
    """Get existing PDF or create new one"""
    try:
        # Cari PDF yang sudah ada
        import glob
        pattern = os.path.join(OUTPUT_DIR, f"*{prefix}*.pdf")
        existing_files = glob.glob(pattern)
        
        # Sort by modification time (newest first)
        existing_files.sort(key=os.path.getmtime, reverse=True)
        
        # Jika ada file yang kurang dari 5 menit, gunakan itu
        current_time = time.time()
        for pdf_file in existing_files:
            file_age = current_time - os.path.getmtime(pdf_file)
            if file_age < 300:  # 5 menit
                print(f"[INFO] Using existing PDF: {pdf_file}")
                return pdf_file
        
        # Jika tidak ada, buat baru
        timestamp = int(time.time() * 1000)
        unique_id = str(uuid.uuid4())[:8]
        pdf_filename = f"{prefix}_{timestamp}_{unique_id}.pdf"
        pdf_path = os.path.join(OUTPUT_DIR, pdf_filename)
        
        success = convert_docx_to_pdf_robust(docx_path, pdf_path)
        
        if success and os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
            print(f"[SUCCESS] Created new PDF: {pdf_path}")
            return pdf_path
        
        return None
        
    except Exception as e:
        print(f"[ERROR] Error in get_or_create_pdf: {e}")
        return None

# ==================== SURAT PERNYATAAN ROUTES ====================

@app.route('/surat-pernyataan/generate', methods=["POST"])
def generate_surat_pernyataan():
    """Generate Surat Pernyataan - COMPATIBILITY ROUTE untuk form_02.js"""
    try:
        print("[INFO] /surat-pernyataan/generate route called (COMPATIBILITY)")
        
        nama = request.form.get("nama", "").strip()
        nip = request.form.get("nip", "").strip()
        instansi = request.form.get("instansi", "").strip()
        kegiatan = request.form.get("kegiatan", "").strip()
        periode = request.form.get("periode", "").strip()
        kota = request.form.get("kota", "Makassar")
        jabatan = request.form.get("jabatan", "").strip()
        ttd_base64 = request.form.get("ttd_base64", "").strip()

        print(f"[INFO] Generating surat for: {nama}, NIP: {nip}")
        
        # Validasi
        if not all([nama, nip, instansi, kegiatan, periode]):
            error_msg = "Semua field wajib diisi"
            print(f"[ERROR] {error_msg}")
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": error_msg}), 400
            else:
                flash(error_msg, "error")
                return redirect(url_for('surat_pernyataan_home'))

        # Simpan tanda tangan
        tanda_tangan_filename = None
        if ttd_base64 and ttd_base64.startswith('data:image'):
            identifier = f"sp_{nama}_{datetime.now().timestamp()}"
            tanda_tangan_filename = save_signature_image(ttd_base64, identifier, "surat_pernyataan")
            print(f"[DEBUG] Signature saved: {tanda_tangan_filename}")

        tz = pytz.timezone("Asia/Makassar")
        now = datetime.now(tz)
        
        # Siapkan data untuk template
        surat_data = {
            'nama': nama,
            'nip': nip,
            'instansi': instansi,
            'kegiatan': kegiatan,
            'periode': periode,
            'kota': kota,
            'tanggal_surat': now.date(),
            'tanda_tangan': tanda_tangan_filename,
            'nama_petugas': nama,
            'jabatan': jabatan,
        }

        # Generate DOCX dari template
        docx_path = generate_surat_pernyataan_docx(surat_data)
        
        if not docx_path:
            error_msg = "Gagal membuat dokumen dari template"
            print(f"[ERROR] {error_msg}")
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({"status": "error", "message": error_msg}), 500
            else:
                flash(error_msg, "error")
                return redirect(url_for('surat_pernyataan_home'))

        # Convert ke PDF dengan cache control
        pdf_path = convert_to_pdf(docx_path)
        
        # Simpan ke database
        surat = SuratPernyataan(
            nama=nama,
            nip=nip,
            instansi=instansi,
            kegiatan=kegiatan,
            periode=periode,
            kota=kota,
            tanggal_surat=now.date(),
            pdf_object=os.path.basename(pdf_path) if pdf_path and os.path.exists(pdf_path) else os.path.basename(docx_path),
            tanda_tangan=tanda_tangan_filename,
            nama_petugas=nama,
            jabatan=jabatan,
            created_at=now
        )
        
        db.session.add(surat)
        db.session.commit()
        print(f"[OK] Data saved to DB: ID={surat.id}, Nama={nama}")

        # Kirim response JSON untuk AJAX
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            success_msg = "Surat pernyataan berhasil dibuat!"
            print(f"[SUCCESS] {success_msg}")
            
            return jsonify({
                "status": "success",
                "message": success_msg,
                "data": {
                    "id": surat.id,
                    "nama": nama,
                    "docx_url": url_for('generate_surat_pernyataan_docx_route', surat_id=surat.id),
                    "pdf_url": url_for('generate_surat_pernyataan_pdf_route', surat_id=surat.id) + f"?t={int(time.time())}",
                    "view_url": url_for('view_surat_pernyataan', surat_id=surat.id)
                },
                "redirect": url_for('main_dashboard')
            })
        
        # Kirim file untuk non-AJAX dengan cache control
        if pdf_path and os.path.exists(pdf_path):
            response_file = pdf_path
            response_filename = generate_unique_filename(f"Surat_Pernyataan_{safe_filename(nama)}", "pdf")
            mimetype = 'application/pdf'
        else:
            response_file = docx_path
            response_filename = generate_unique_filename(f"Surat_Pernyataan_{safe_filename(nama)}", "docx")
            mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        
        success_msg = "Surat pernyataan berhasil dibuat!"
        flash(success_msg, "success")
        
        response = send_file_with_cache_control(response_file, response_filename, mimetype)
        if response:
            return response
        else:
            # Fallback jika ada error
            return send_file(
                response_file,
                as_attachment=True,
                download_name=response_filename,
                mimetype=mimetype
            )

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
    """Preview Surat Pernyataan - COMPATIBILITY ROUTE"""
    try:
        print(f"[INFO] Preview route called for surat_id: {surat_id}")
        
        # Redirect ke view_surat_pernyataan (fungsi baru)
        return redirect(url_for('view_surat_pernyataan', surat_id=surat_id))
        
    except Exception as e:
        print(f"[ERROR] Preview redirect error: {e}")
        return redirect(url_for('main_dashboard'))

@app.route('/surat-pernyataan/download/<int:surat_id>')
def download_surat_pernyataan(surat_id):
    """Download Surat Pernyataan PDF - COMPATIBILITY ROUTE"""
    try:
        print(f"[INFO] Download route called for surat_id: {surat_id}")
        
        # Redirect ke generate PDF route dengan timestamp
        return redirect(url_for('generate_surat_pernyataan_pdf_route', surat_id=surat_id) + f"?nocache={int(time.time())}")
        
    except Exception as e:
        print(f"[ERROR] Download redirect error: {e}")
        return jsonify({
            "status": "error", 
            "message": f"Gagal mengunduh file: {str(e)}"
        }), 500

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

# ==================== FUNGSI GENERATE USULAN PERUBAHAN DARI TEMPLATE ====================

def generate_usulan_perubahan_docx(proposal_id):
    """Generate Usulan Perubahan dari template Word"""
    try:
        print(f"[DEBUG] Generating usulan perubahan from template for proposal_id: {proposal_id}")
        
        if not os.path.exists(TEMPLATE_USULAN_PERUBAHAN):
            print(f"[ERROR] Template not found: {TEMPLATE_USULAN_PERUBAHAN}")
            return None
        
        # Get proposal data
        proposal = db.session.get(Proposal, proposal_id)
        if not proposal:
            print(f"[ERROR] Proposal not found: {proposal_id}")
            return None
        
        # Get related data
        evaluation = Evaluation.query.filter_by(proposal_id=proposal_id).first()
        approval = Approval.query.filter_by(proposal_id=proposal_id).first()
        implementation = Implementation.query.filter_by(proposal_id=proposal_id).first()
        
        # Load template
        doc = DocxTemplate(TEMPLATE_USULAN_PERUBAHAN)
        
        # Format tanggal Indonesia
        def format_date_indonesia(date_obj):
            if not date_obj:
                return ""
            try:
                bulan = [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ]
                return f"{date_obj.day} {bulan[date_obj.month-1]} {date_obj.year}"
            except:
                return str(date_obj)
        
        # Get signature images
        signature_pemohon = None
        if proposal.signature_filename:
            signature_path = os.path.join(DATA_FOLDER, 'signatures', proposal.signature_filename)
            if os.path.exists(signature_path):
                try:
                    signature_pemohon = InlineImage(doc, signature_path, width=Mm(80))
                except Exception as e:
                    print(f"[WARN] Failed to load pemohon signature: {e}")
                    signature_pemohon = "(TTD PEMOHON)"
        
        signature_approval = None
        if approval and approval.tanda_tangan_persetujuan:
            approval_path = os.path.join(DATA_FOLDER, 'signatures', approval.tanda_tangan_persetujuan)
            if os.path.exists(approval_path):
                try:
                    signature_approval = InlineImage(doc, approval_path, width=Mm(80))
                except Exception as e:
                    print(f"[WARN] Failed to load approval signature: {e}")
                    signature_approval = "(TTD APPROVAL)"
        
        signature_implementation = None
        if implementation and implementation.tanda_tangan_pic:
            impl_path = os.path.join(DATA_FOLDER, 'signatures', implementation.tanda_tangan_pic)
            if os.path.exists(impl_path):
                try:
                    signature_implementation = InlineImage(doc, impl_path, width=Mm(80))
                except Exception as e:
                    print(f"[WARN] Failed to load implementation signature: {e}")
                    signature_implementation = "(TTD IMPLEMENTASI)"
        
        # Prepare template data
        tipe_perubahan_list = []
        if evaluation and evaluation.tipe_perubahan:
            try:
                tipe_perubahan_list = json.loads(evaluation.tipe_perubahan) if isinstance(evaluation.tipe_perubahan, str) else evaluation.tipe_perubahan
            except:
                tipe_perubahan_list = []
        
        template_data = {
            # Header Dokumen
            'no_dokumen': proposal.nomor_dokumen or '',
            'revisi': proposal.revisi or '00',
            'tgl_efektif': format_date_indonesia(proposal.tgl_efektif) if proposal.tgl_efektif else '',
            
            # A. USULAN PERUBAHAN
            'no_usulan': f"{proposal.id:03d}",
            'tanggal': format_date_indonesia(proposal.tanggal) if proposal.tanggal else '',
            'diminta_oleh': proposal.diminta_oleh or '',
            'jabatan': proposal.jabatan or '',
            'deskripsi_perubahan': proposal.deskripsi_perubahan or '',
            'tgl_dibutuhkan': format_date_indonesia(proposal.hasil_dibutuhkan_tgl) if proposal.hasil_dibutuhkan_tgl else '',
            'alasan_perubahan': proposal.alasan_perubahan or '',
            
            # Tanda Tangan
            'tanda_tangan_pemohon': signature_pemohon if signature_pemohon else "(TTD PEMOHON)",
            'tanda_tangan_persetujuan': signature_approval if signature_approval else "(TTD PEMBERI PERSETUJUAN)",
            'tanda_tangan_pic': signature_implementation if signature_implementation else "(TTD PELAKSANA)",
            
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
            'tanggal_evaluasi': format_date_indonesia(evaluation.evaluated_at) if evaluation and evaluation.evaluated_at else '',
            
            # C. PERSETUJUAN PERUBAHAN
            'status_diterima': '✓' if approval and approval.keputusan == 'setuju' else '',
            'status_ditolak': '✓' if approval and approval.keputusan == 'tolak' else '',
            
            'tgl_pelaksanaan': format_date_indonesia(approval.tanggal_pelaksanaan) if approval and approval.tanggal_pelaksanaan else '',
            'pic_pelaksana': approval.pic_pelaksana if approval else '',
            'catatan_persetujuan': approval.catatan_persetujuan if approval else '',
            'tanggal_persetujuan': format_date_indonesia(approval.approved_at) if approval and approval.approved_at else '',
            
            # D. IMPLEMENTASI PERUBAHAN
            'hasil_tahapan_perubahan': implementation.hasil_tahapan_perubahan if implementation else '',
            'hasil_pengujian_implementasi': implementation.hasil_pengujian if implementation else '',
            'tgl_rilis': format_date_indonesia(implementation.tanggal_rilis) if implementation and implementation.tanggal_rilis else '',
            'catatan_implementasi': implementation.catatan_implementasi if implementation else '',
            'tanggal_implementasi': format_date_indonesia(implementation.implemented_at) if implementation and implementation.implemented_at else '',
            
            # Metadata tambahan
            'bulan_tahun': datetime.now().strftime('%B %Y'),
            'tahun': datetime.now().strftime('%Y'),
            'nomor_urut': f"{proposal.id:03d}",
        }
        
        # Render template
        try:
            doc.render(template_data)
            print(f"[DEBUG] Template rendered successfully for proposal {proposal_id}")
        except Exception as e:
            print(f"[ERROR] Error rendering template: {e}")
            return None
        
        # Save document dengan timestamp untuk menghindari cache
        timestamp = int(time.time() * 1000)
        safe_doc_number = proposal.nomor_dokumen.replace('/', '_').replace(' ', '_') if proposal.nomor_dokumen else f"proposal_{proposal_id}"
        filename_docx = f"Usulan_Perubahan_{safe_doc_number}_{timestamp}.docx"
        output_docx_path = os.path.join(OUTPUT_DIR, filename_docx)
        
        doc.save(output_docx_path)
        print(f"[SUCCESS] Document saved: {output_docx_path}")
        
        # Bersihkan file DOCX lama
        clear_old_pdf_files(f"Usulan_Perubahan_{safe_doc_number}")
        
        return output_docx_path
        
    except Exception as e:
        print(f"[ERROR] Error generating usulan perubahan: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return None

# ==================== TAMBAHKAN ROUTES UNTUK USULAN PERUBAHAN ====================

@app.route('/usulan-perubahan/generate/<int:proposal_id>')
@disable_cache
def generate_document(proposal_id):
    """Generate Word/PDF document untuk Usulan Perubahan - DIPERBAIKI"""
    try:
        print(f"[DEBUG] Generating document for proposal {proposal_id}")
        
        # Generate DOCX from template dengan timestamp
        docx_path = generate_usulan_perubahan_docx(proposal_id)
        
        if not docx_path:
            flash('Gagal membuat dokumen dari template', 'danger')
            return redirect(url_for('view_proposal', proposal_id=proposal_id))
        
        # Convert to PDF using robust method
        proposal = db.session.get(Proposal, proposal_id)
        safe_doc_number = proposal.nomor_dokumen.replace('/', '_').replace(' ', '_') if proposal and proposal.nomor_dokumen else f"proposal_{proposal_id}"
        prefix = f"Usulan_Perubahan_{safe_doc_number}"
        
        pdf_path = get_or_create_pdf(docx_path, prefix)
        
        if pdf_path and os.path.exists(pdf_path):
            filename = os.path.basename(pdf_path)
            print(f"[SUCCESS] PDF generated: {pdf_path}")
            
            # Kirim file dengan cache control
            response = send_file_with_cache_control(pdf_path, filename, 'application/pdf')
            if response:
                return response
        
        # Fallback to DOCX dengan cache control
        filename = generate_unique_filename(f"Usulan_Perubahan_{safe_doc_number}", "docx")
        
        flash('Konversi ke PDF gagal. File DOCX telah didownload.', 'info')
        response = send_file_with_cache_control(
            docx_path,
            filename,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if response:
            return response
        else:
            # Ultimate fallback
            return send_file(
                docx_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            
    except Exception as e:
        print(f"[ERROR] Error generating document: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('view_proposal', proposal_id=proposal_id))

@app.route('/usulan-perubahan/generate-docx/<int:proposal_id>')
@disable_cache
def generate_usulan_perubahan_docx_route(proposal_id):
    """Generate Usulan Perubahan DOCX saja - DIPERBAIKI"""
    try:
        print(f"[DEBUG] Generate DOCX for proposal_id: {proposal_id}")
        
        docx_path = generate_usulan_perubahan_docx(proposal_id)
        
        if not docx_path:
            flash('Gagal membuat dokumen dari template', 'danger')
            return redirect(url_for('view_proposal', proposal_id=proposal_id))
        
        proposal = db.session.get(Proposal, proposal_id)
        safe_doc_number = proposal.nomor_dokumen.replace('/', '_').replace(' ', '_') if proposal and proposal.nomor_dokumen else f"proposal_{proposal_id}"
        filename = generate_unique_filename(f"Usulan_Perubahan_{safe_doc_number}", "docx")
        
        response = send_file_with_cache_control(
            docx_path,
            filename,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if response:
            return response
        else:
            return send_file(
                docx_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        
    except Exception as e:
        print(f"[ERROR] Error generating DOCX: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('view_proposal', proposal_id=proposal_id))

@app.route('/usulan-perubahan/generate-pdf/<int:proposal_id>')
@disable_cache
def generate_usulan_perubahan_pdf_route(proposal_id):
    """Generate Usulan Perubahan PDF (konversi dari DOCX) - DIPERBAIKI"""
    try:
        print(f"[DEBUG] Generate PDF for proposal_id: {proposal_id}")
        
        # Generate DOCX first dengan timestamp
        docx_path = generate_usulan_perubahan_docx(proposal_id)
        
        if not docx_path:
            flash('Gagal membuat dokumen dari template', 'danger')
            return redirect(url_for('view_proposal', proposal_id=proposal_id))
        
        # Convert to PDF dengan nama file unik
        proposal = db.session.get(Proposal, proposal_id)
        safe_doc_number = proposal.nomor_dokumen.replace('/', '_').replace(' ', '_') if proposal and proposal.nomor_dokumen else f"proposal_{proposal_id}"
        prefix = f"Usulan_Perubahan_{safe_doc_number}"
        
        pdf_path = get_or_create_pdf(docx_path, prefix)
        
        if pdf_path and os.path.exists(pdf_path):
            filename = os.path.basename(pdf_path)
            # Kirim dengan cache control
            response = send_file_with_cache_control(pdf_path, filename, 'application/pdf')
            if response:
                return response
        
        # Fallback to DOCX dengan cache control
        filename = generate_unique_filename(f"Usulan_Perubahan_{safe_doc_number}", "docx")
        flash('Konversi ke PDF gagal, file DOCX telah didownload', 'info')
        
        response = send_file_with_cache_control(
            docx_path,
            filename,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if response:
            return response
        else:
            return send_file(
                docx_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        
    except Exception as e:
        print(f"[ERROR] Error generating PDF: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('view_proposal', proposal_id=proposal_id))

@app.route('/usulan-perubahan/view/<int:proposal_id>')
def view_proposal(proposal_id):
    """View proposal details"""
    try:
        proposal = db.session.get(Proposal, proposal_id)
        
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
        
        # Tambahkan timestamp untuk URL download PDF
        pdf_url_with_timestamp = url_for('generate_usulan_perubahan_pdf_route', proposal_id=proposal_id) + f"?t={int(time.time())}"
        
        return render_template('view_proposal.html',
                             proposal=proposal_dict,
                             evaluation=evaluation_dict,
                             approval=approval_dict,
                             implementation=implementation_dict,
                             pdf_url_with_timestamp=pdf_url_with_timestamp,
                             system_name="usulan-perubahan")
                             
    except Exception as e:
        print(f"[ERROR] View proposal error: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('dashboard_usulan'))

# ==================== PERBAIKI API SUBMIT USULAN PERUBAHAN ====================

@app.route('/api/usulan-perubahan/submit', methods=['POST'])
def submit_proposal_api():
    """API untuk submit usulan perubahan - PERBAIKI JSON RESPONSE"""
    try:
        print(f"[DEBUG] submit_proposal_api called")
        
        # Check if request is JSON
        if not request.is_json:
            print(f"[WARN] Request is not JSON, content-type: {request.content_type}")
            return jsonify({
                'success': False, 
                'message': 'Content-Type must be application/json'
            }), 400
        
        data = request.get_json()
        if not data:
            print(f"[WARN] No JSON data received")
            return jsonify({
                'success': False, 
                'message': 'Tidak ada data JSON'
            }), 400
        
        print(f"[DEBUG] Data received. Keys: {list(data.keys())}")
        
        form_data = data.get('form_data', {})
        action = data.get('action', 'submit')
        draft_id = data.get('draft_id')
        draft_name = data.get('draft_name', '')
        draft_notes = data.get('draft_notes', '')
        
        print(f"[DEBUG] Action: {action}, Draft ID: {draft_id}")
        
        # Validate form_data
        if not isinstance(form_data, dict):
            print(f"[ERROR] form_data is not a dict: {type(form_data)}")
            return jsonify({
                'success': False,
                'message': 'Format data tidak valid'
            }), 400
        
        # VALIDASI DATA WAJIB
        required_fields = ['diminta_oleh', 'jabatan', 'deskripsi_perubahan']
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
            
            # Panggil fungsi save draft yang benar
            try:
                # Parse draft ID
                actual_id = None
                if draft_id and isinstance(draft_id, str):
                    if draft_id.startswith('draft_'):
                        try:
                            actual_id = int(draft_id.replace('draft_', ''))
                        except ValueError:
                            actual_id = None
                    elif draft_id.startswith('DRAFT_'):
                        try:
                            actual_id = int(draft_id.replace('DRAFT_', ''))
                        except ValueError:
                            actual_id = None
                elif draft_id:
                    try:
                        actual_id = int(draft_id)
                    except:
                        actual_id = None
                
                # Simpan draft
                result = save_draft_enhanced(form_data, actual_id, draft_name, draft_notes)
                
                if isinstance(result, dict) and result.get('success'):
                    return jsonify({
                        'success': True,
                        'message': 'Draft berhasil disimpan!',
                        'redirect': url_for('main_dashboard')
                    })
                else:
                    return result
                    
            except Exception as e:
                print(f"[ERROR] Error saving draft: {e}")
                return jsonify({
                    'success': False,
                    'message': f'Gagal menyimpan draft: {str(e)}'
                }), 500
        else:
            # Submit langsung
            print(f"[DEBUG] Submitting proposal...")
            success = save_proposal_complete(form_data)
            
            if success:
                # Cari proposal terbaru untuk mendapatkan ID
                latest_proposal = Proposal.query.order_by(Proposal.created_at.desc()).first()
                proposal_id = latest_proposal.id if latest_proposal else None
                
                return jsonify({
                    'success': True,
                    'message': 'Usulan perubahan berhasil disimpan!',
                    'proposal_id': proposal_id,
                    'redirect': url_for('main_dashboard')
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

def save_draft_enhanced(form_data, draft_id=None, draft_name='', draft_notes=''):
    """Save draft dengan semua data"""
    try:
        print(f"[DEBUG] save_draft_enhanced called")
        
        # Parse tanggal
        def parse_date_safe(date_str):
            if not date_str:
                return None
            try:
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
                    try:
                        return datetime.strptime(str(date_str), fmt).date()
                    except:
                        continue
                return None
            except Exception as e:
                print(f"[WARN] Failed to parse date '{date_str}': {e}")
                return None
        
        # Handle signature
        signature_pemohon = None
        if form_data.get('signature_data') and form_data['signature_data'].startswith('data:image'):
            identifier = f"pemohon_{datetime.now().timestamp()}"
            signature_pemohon = save_signature_image(
                form_data.get('signature_data'), 
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Pemohon signature saved: {signature_pemohon}")
        
        # Generate doc number if not exists
        if not form_data.get('no_dokumen'):
            proposal_count = Proposal.query.count()
            form_data['no_dokumen'] = generate_doc_number(proposal_count)
            print(f"[DEBUG] Generated doc number: {form_data['no_dokumen']}")
        
        now = datetime.now()
        
        # Update or create proposal
        if draft_id:
            proposal = db.session.get(Proposal, draft_id)
            if proposal and proposal.status == 'draft':
                # Update existing draft
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
                proposal = None
        
        if not draft_id or not proposal:
            # Create new draft
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
        proposal_id = proposal.id
        print(f"[DEBUG] Draft saved. Proposal ID: {proposal_id}")
        
        # Save related data
        save_draft_related_data(proposal_id, form_data, {})
        
        db.session.commit()
        print(f"[DEBUG] All data committed successfully")
        
        return jsonify({
            'success': True,
            'message': 'Draft berhasil disimpan',
            'draft_id': f"draft_{proposal_id}",
            'proposal_number': proposal.nomor_dokumen
        })
        
    except Exception as e:
        print(f"[ERROR] Error in save_draft_enhanced: {e}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Gagal menyimpan draft: {str(e)}'
        }), 500

def save_draft_related_data(proposal_id, form_data, signatures=None):
    """Save related data for draft"""
    try:
        if signatures is None:
            signatures = {}
        
        print(f"[DEBUG] save_draft_related_data for proposal {proposal_id}")
        
        # Handle evaluation data
        if form_data.get('tipe_perubahan') or form_data.get('prioritas'):
            evaluation = Evaluation.query.filter_by(proposal_id=proposal_id).first()
            
            if evaluation:
                # Update existing
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
            else:
                # Create new
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
        
        print(f"[DEBUG] Related data saved for proposal {proposal_id}")
            
    except Exception as e:
        print(f"[ERROR] Error in save_draft_related_data: {e}")
        raise e

# ==================== TAMBAHKAN TEMPLATE FILTER ====================

@app.template_filter('json_load')
def json_load_filter(value):
    """JSON load filter untuk template"""
    if not value:
        return []
    try:
        if isinstance(value, str):
            return json.loads(value)
        return value
    except:
        return []

def generate_laporan_insiden_docx(laporan_data):
    """Generate Laporan Insiden dari template Word"""
    try:
        print(f"[DEBUG] Generating laporan insiden from template")
        
        if not os.path.exists(TEMPLATE_LAPORAN_INSIDEN):
            print(f"[ERROR] Template not found: {TEMPLATE_LAPORAN_INSIDEN}")
            return None
        
        doc = DocxTemplate(TEMPLATE_LAPORAN_INSIDEN)
        
        def format_date_indonesia(date_str):
            if not date_str:
                return ""
            try:
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
                    try:
                        date_obj = datetime.strptime(str(date_str), fmt)
                        bulan = [
                            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                        ]
                        hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
                        day_name = hari[date_obj.weekday()]
                        return f"{day_name}, {date_obj.day} {bulan[date_obj.month-1]} {date_obj.year}"
                    except:
                        continue
                return str(date_str)
            except:
                return str(date_str)
        
        def format_date_simple(date_str):
            if not date_str:
                return ""
            try:
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
                    try:
                        date_obj = datetime.strptime(str(date_str), fmt)
                        return f"{date_obj.day}-{date_obj.month}-{date_obj.year}"
                    except:
                        continue
                return str(date_str)
            except:
                return str(date_str)
        
        signatures = {}
        signature_fields = ['pelapor', 'atasan', 'smki', 'smki2', 'ketua']
        
        for field in signature_fields:
            filename_key = f'ttd_{field}_filename'
            filename = laporan_data.get(filename_key)
            
            if filename and filename != 'manual' and filename != '':
                possible_paths = [
                    os.path.join(DATA_FOLDER, 'signatures', filename),
                    os.path.join('data', 'signatures', filename),
                    os.path.join('uploads', 'signatures', filename),
                    filename
                ]
                
                for path in possible_paths:
                    if os.path.exists(path):
                        try:
                            signatures[f'ttd_{field}_image'] = InlineImage(doc, path, width=Mm(60))
                            print(f"[DEBUG] Loaded signature for {field}: {path}")
                            break
                        except Exception as e:
                            print(f"[WARN] Failed to load signature for {field}: {e}")
                            signatures[f'ttd_{field}_image'] = f"(TTD {field.upper()})"
                            break
                else:
                    signatures[f'ttd_{field}_image'] = f"(TTD {field.upper()})"
            else:
                signatures[f'ttd_{field}_image'] = f"(TTD {field.upper()})"
        
        template_data = {
            'no_dok': laporan_data.get('no_dok', 'SOP/11/SMKI/VIII/2021/01'),
            'no_revisi': laporan_data.get('no_revisi', '01'),
            'tgl_efektif': format_date_indonesia(laporan_data.get('tgl_efektif', '21 September 2023')),
            'no_permohonan': laporan_data.get('no_permohonan', ''),
            'tanggal_form': datetime.now().strftime('%A, %d %B %Y'),
            'tanggal_kejadian': format_date_indonesia(laporan_data.get('tanggal_kejadian')),
            'nama_pelapor': laporan_data.get('nama_pelapor', ''),
            'nama_bidang': laporan_data.get('nama_bidang', ''),
            'deskripsi_insiden': laporan_data.get('deskripsi_insiden', ''),
            'nama_ttd_pelapor': laporan_data.get('nama_ttd_pelapor', laporan_data.get('nama_pelapor', '')),
            'nama_ttd_atasan': laporan_data.get('nama_ttd_atasan', ''),
            'nama_ttd_smki': laporan_data.get('nama_ttd_smki', ''),
            'nama_ttd_smki2': laporan_data.get('nama_ttd_smki2', ''),
            'nama_ttd_ketua': laporan_data.get('nama_ttd_ketua', ''),
            'jenis_insiden': laporan_data.get('jenis_insiden', 'Keamanan Informasi'),
            'analisa_penyebab': laporan_data.get('analisa_penyebab', ''),
            'tindak_smki': laporan_data.get('tindak_smki', ''),
            'pic_tindak': laporan_data.get('pic_tindak', ''),
            'tindak_pihak': laporan_data.get('tindak_pihak', ''),
            'insiden_selesai': '✓ Ya' if laporan_data.get('insiden_selesai') == 'Ya' else '✗ Tidak',
            'tanggal_penyelesaian': format_date_indonesia(laporan_data.get('tanggal_penyelesaian')),
            'tanggal_hari_ini': datetime.now().strftime('%d %B %Y'),
            'jam_sekarang': datetime.now().strftime('%H:%M'),
            **signatures,
        }
        
        try:
            doc.render(template_data)
            print(f"[DEBUG] Template rendered successfully")
        except Exception as e:
            print(f"[ERROR] Error rendering template: {e}")
            return None
        
        # Generate unique filename dengan timestamp
        timestamp = int(time.time() * 1000)
        safe_id = laporan_data.get('id', 'unknown')
        safe_no = laporan_data.get('no_permohonan', 'unknown').replace('/', '_')
        filename = f"Laporan_Insiden_{safe_no}_{timestamp}.docx"
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        doc.save(output_path)
        print(f"[SUCCESS] Document saved: {output_path}")
        
        return output_path
        
    except Exception as e:
        print(f"[ERROR] Error generating laporan insiden: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return None

def get_laporan_from_database(laporan_id):
    """Get laporan data from database"""
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return None
            
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
        
        return result
        
    except Exception as e:
        print(f"[ERROR] Database error: {e}")
        return None

# ==================== LOGGING SETUP ====================
log_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, "app.log"),
    maxBytes=5 * 1024 * 1024,
    backupCount=5
)
log_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[log_handler])

# ==================== ROUTES ====================

@app.route('/')
def home():
    """Home page - redirect to MAIN dashboard"""
    return redirect(url_for('main_dashboard'))

@app.route('/dashboard')
def main_dashboard():
    """Main integrated dashboard showing all systems"""
    usulan_stats = {
        'total': Proposal.query.count(),
        'draft': Proposal.query.filter_by(status='draft').count(),
        'completed': Proposal.query.filter_by(status='completed').count(),
    }
    
    surat_stats = {
        'total': SuratPernyataan.query.count(),
    }
    
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
    proposals = Proposal.query.order_by(Proposal.created_at.desc()).all()
    
    stats = {
        'total': len(proposals),
        'draft': len([p for p in proposals if p.status == 'draft']),
        'evaluasi': len([p for p in proposals if p.status == 'evaluasi']),
        'approval': len([p for p in proposals if p.status == 'approval']),
        'implementation': len([p for p in proposals if p.status == 'implementation']),
        'completed': len([p for p in proposals if p.status == 'completed']),
        'rejected': len([p for p in proposals if p.status == 'rejected']),
    }
    
    return render_template('dashboard_pegawai.html',
                         proposals=proposals,
                         stats=stats,
                         system_name="usulan-perubahan",
                         show_only_usulan=True)

@app.route('/surat-pernyataan/dashboard')
def surat_pernyataan_dashboard():
    """Dashboard khusus untuk Surat Pernyataan"""
    surat_list = SuratPernyataan.query.order_by(SuratPernyataan.created_at.desc()).all()
    
    today = datetime.now().date()
    stats = {
        'total': len(surat_list),
        'recent': len([s for s in surat_list if s.created_at and s.created_at.date() > today - timedelta(days=30)]),
        'today': len([s for s in surat_list if s.created_at and s.created_at.date() == today]),
    }
    
    return render_template('dashboard_pegawai.html',
                         surat_list=surat_list,
                         stats=stats,
                         system_name="surat-pernyataan",
                         show_only_surat=True)

@app.route('/laporan-insiden/dashboard')
def dashboard_laporan_insiden():
    """Dashboard khusus untuk Laporan Insiden"""
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return render_template('dashboard_pegawai.html',
                                 laporans=[],
                                 system_name="laporan-insiden",
                                 show_only_insiden=True)
            
        cursor = conn.cursor(dictionary=True)
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
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        today = datetime.now().date()
        stats = {
            'total': len(results),
            'selesai': len([r for r in results if r.get('insiden_selesai') == 'Ya']),
            'proses': len([r for r in results if r.get('insiden_selesai') == 'Tidak']),
            'recent': len([r for r in results if r.get('created_at') and 
                          datetime.strptime(str(r['created_at']), '%Y-%m-%d %H:%M:%S').date() > today - timedelta(days=30)]),
        }
        
        return render_template('dashboard_pegawai.html',
                             laporans=results,
                             stats=stats,
                             system_name="laporan-insiden",
                             show_only_insiden=True)
        
    except Error as e:
        print(f"[ERROR] Dashboard laporan insiden error: {e}")
        return render_template('dashboard_pegawai.html',
                             laporans=[],
                             system_name="laporan-insiden",
                             show_only_insiden=True)

# ==================== SURAT PERNYATAAN ROUTES ====================

@app.route('/surat-pernyataan')
def surat_pernyataan_home():
    """Home page for Surat Pernyataan system"""
    return render_template("form_02.html", system_name="surat-pernyataan")

@app.route('/surat-pernyataan/generate-template', methods=["POST"])
@disable_cache
def generate_surat_pernyataan_template():
    """Generate Surat Pernyataan menggunakan template Word DAN convert ke PDF"""
    try:
        print(f"[DEBUG] Template route called")
        
        nama = request.form.get("nama", "").strip()
        nip = request.form.get("nip", "").strip()
        instansi = request.form.get("instansi", "").strip()
        kegiatan = request.form.get("kegiatan", "").strip()
        periode = request.form.get("periode", "").strip()
        kota = request.form.get("kota", "Makassar")
        jabatan = request.form.get("jabatan", "").strip()
        ttd_base64 = request.form.get("ttd_base64", "").strip()

        print(f"[INFO] Surat Pernyataan Template: nama={nama}, nip={nip}")
        print(f"[INFO] TTD length: {len(ttd_base64) if ttd_base64 else 0}")

        if not all([nama, nip, instansi, kegiatan, periode]):
            flash("Semua field wajib diisi", "error")
            return redirect(url_for('surat_pernyataan_home'))

        # Simpan signature
        signature_filename = None
        if ttd_base64 and ttd_base64.startswith('data:image'):
            identifier = f"sp_{nama}_{datetime.now().timestamp()}"
            signature_filename = save_signature_image(ttd_base64, identifier, "surat_pernyataan")
            print(f"[DEBUG] Signature saved: {signature_filename}")

        # Format tanggal
        tz = pytz.timezone("Asia/Makassar")
        now = datetime.now(tz)
        
        # Simpan ke database TERLEBIH DAHULU untuk mendapatkan ID
        surat = SuratPernyataan(
            nama=nama,
            nip=nip,
            instansi=instansi,
            kegiatan=kegiatan,
            periode=periode,
            kota=kota,
            tanggal_surat=now.date(),
            pdf_object="",  # Kosong dulu, akan diisi nanti
            tanda_tangan=signature_filename,
            nama_petugas=nama,
            jabatan=jabatan,
            created_at=now
        )
        
        db.session.add(surat)
        db.session.flush()  # Dapatkan ID tanpa commit
        surat_id = surat.id
        print(f"[DEBUG] Database entry created with ID: {surat_id}")

        # Generate DOCX dari database (bukan dari form langsung)
        docx_path = generate_surat_pernyataan_docx(surat.to_dict())
        
        if not docx_path:
            db.session.rollback()
            flash("Gagal membuat dokumen dari template", "error")
            return redirect(url_for('surat_pernyataan_home'))

        print(f"[DEBUG] DOCX created: {docx_path}")
        
        # Convert ke PDF menggunakan robust method
        prefix = f"Surat_Pernyataan_{safe_filename(nama)}"
        pdf_path = get_or_create_pdf(docx_path, prefix)
        
        if pdf_path and os.path.exists(pdf_path):
            pdf_filename = os.path.basename(pdf_path)
            print(f"[SUCCESS] PDF created: {pdf_path}")
            
            # Update database dengan nama file PDF
            surat.pdf_object = pdf_filename
            db.session.commit()
            
            # Kirim file PDF dengan cache control
            response = send_file_with_cache_control(pdf_path, pdf_filename, 'application/pdf')
            if response:
                return response
        
        # FALLBACK: Kirim DOCX jika PDF gagal
        if os.path.exists(docx_path):
            docx_filename = os.path.basename(docx_path)
            
            # Update database dengan nama file DOCX
            surat.pdf_object = docx_filename
            db.session.commit()
            
            print(f"[INFO] Sending DOCX as fallback: {docx_filename}")
            
            response = send_file_with_cache_control(
                docx_path,
                docx_filename,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            
            if response:
                return response
            else:
                # Ultimate fallback
                return send_file(
                    docx_path,
                    as_attachment=True,
                    download_name=docx_filename,
                    mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                )
        else:
            db.session.rollback()
            flash("Gagal membuat dokumen", "error")
            return redirect(url_for('surat_pernyataan_home'))
            
    except Exception as e:
        print(f"[ERROR] Template generation failed: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        
        try:
            db.session.rollback()
        except:
            pass
        
        flash(f"Terjadi kesalahan: {str(e)}", "error")
        return redirect(url_for('surat_pernyataan_home'))

@app.route('/surat-pernyataan/view/<int:surat_id>')
def view_surat_pernyataan(surat_id):
    """View detail surat pernyataan"""
    try:
        surat = db.session.get(SuratPernyataan, surat_id)
        
        if not surat:
            flash('Surat tidak ditemukan', 'danger')
            return redirect(url_for('surat_pernyataan_dashboard'))
        
        # Convert signature to base64 for display
        signature_base64 = None
        if surat.tanda_tangan:
            signature_path = os.path.join(DATA_FOLDER, 'signatures', surat.tanda_tangan)
            if os.path.exists(signature_path):
                with open(signature_path, 'rb') as f:
                    signature_bytes = f.read()
                    signature_base64 = f"data:image/png;base64,{base64.b64encode(signature_bytes).decode('utf-8')}"
        
        surat_dict = surat.to_dict()
        surat_dict['signature_base64'] = signature_base64
        
        # Tambahkan timestamp untuk URL download
        pdf_url_with_timestamp = url_for('generate_surat_pernyataan_pdf_route', surat_id=surat_id) + f"?t={int(time.time())}"
        docx_url_with_timestamp = url_for('generate_surat_pernyataan_docx_route', surat_id=surat_id) + f"?t={int(time.time())}"
        
        return render_template('view_surat_pernyataan.html',
                             surat=surat_dict,
                             pdf_url_with_timestamp=pdf_url_with_timestamp,
                             docx_url_with_timestamp=docx_url_with_timestamp,
                             system_name="surat-pernyataan")
                             
    except Exception as e:
        print(f"[ERROR] View surat error: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('surat_pernyataan_dashboard'))

@app.route('/surat-pernyataan/generate-docx/<int:surat_id>')
@disable_cache
def generate_surat_pernyataan_docx_route(surat_id):
    """Generate Surat Pernyataan DOCX dari database - DIPERBAIKI"""
    try:
        print(f"[DEBUG] Generate DOCX for surat_id: {surat_id}")
        
        surat = db.session.get(SuratPernyataan, surat_id)
        
        if not surat:
            flash('Surat tidak ditemukan', 'danger')
            return redirect(url_for('surat_pernyataan_dashboard'))
        
        surat_data = surat.to_dict()
        
        # Generate DOCX from template
        docx_path = generate_surat_pernyataan_docx(surat_data)
        
        if not docx_path:
            flash('Gagal membuat dokumen dari template', 'danger')
            return redirect(url_for('surat_pernyataan_dashboard'))
        
        # Generate unique filename
        timestamp = int(time.time() * 1000)
        unique_id = str(uuid.uuid4())[:8]
        filename = f"Surat_Pernyataan_{safe_filename(surat.nama)}_{timestamp}_{unique_id}.docx"
        
        response = send_file_with_cache_control(
            docx_path,
            filename,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if response:
            return response
        else:
            return send_file(
                docx_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        
    except Exception as e:
        print(f"[ERROR] Error generating DOCX: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('surat_pernyataan_dashboard'))

@app.route('/surat-pernyataan/generate-pdf/<int:surat_id>')
@disable_cache
def generate_surat_pernyataan_pdf_route(surat_id):
    """Generate Surat Pernyataan PDF (konversi dari DOCX) - DIPERBAIKI"""
    try:
        print(f"[DEBUG] Generate PDF for surat_id: {surat_id}")
        
        surat = db.session.get(SuratPernyataan, surat_id)
        
        if not surat:
            flash('Surat tidak ditemukan', 'danger')
            return redirect(url_for('surat_pernyataan_dashboard'))
        
        surat_data = surat.to_dict()
        
        # Generate DOCX first
        docx_path = generate_surat_pernyataan_docx(surat_data)
        
        if not docx_path:
            flash('Gagal membuat dokumen dari template', 'danger')
            return redirect(url_for('surat_pernyataan_dashboard'))
        
        # Convert to PDF dengan robust method
        prefix = f"Surat_Pernyataan_{safe_filename(surat.nama)}"
        pdf_path = get_or_create_pdf(docx_path, prefix)
        
        if pdf_path and os.path.exists(pdf_path):
            filename = os.path.basename(pdf_path)
            # Kirim dengan cache control
            response = send_file_with_cache_control(pdf_path, filename, 'application/pdf')
            if response:
                return response
        
        # Fallback to DOCX
        timestamp = int(time.time() * 1000)
        unique_id = str(uuid.uuid4())[:8]
        filename = f"Surat_Pernyataan_{safe_filename(surat.nama)}_{timestamp}_{unique_id}.docx"
        flash('Konversi ke PDF gagal, file DOCX telah didownload', 'info')
        
        response = send_file_with_cache_control(
            docx_path,
            filename,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if response:
            return response
        else:
            return send_file(
                docx_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        
    except Exception as e:
        print(f"[ERROR] Error generating PDF: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('surat_pernyataan_dashboard'))

# ==================== LAPORAN INSIDEN ROUTES ====================

@app.route('/laporan-insiden')
def laporan_insiden_form():
    """Form for Laporan Insiden"""
    return render_template("form_03.html", system_name="laporan-insiden")

@app.route('/laporan-insiden/generate-docx/<int:laporan_id>')
@disable_cache
def generate_laporan_insiden_docx_route(laporan_id):
    """Generate Laporan Insiden DOCX dari database - DIPERBAIKI"""
    try:
        print(f"[DEBUG] Generate DOCX for laporan_id: {laporan_id}")
        
        laporan_data = get_laporan_from_database(laporan_id)
        
        if not laporan_data:
            flash('Laporan tidak ditemukan', 'danger')
            return redirect(url_for('dashboard_laporan_insiden'))
        
        docx_path = generate_laporan_insiden_docx(laporan_data)
        
        if not docx_path:
            flash('Gagal membuat dokumen dari template', 'danger')
            return redirect(url_for('dashboard_laporan_insiden'))
        
        # Generate unique filename
        timestamp = int(time.time() * 1000)
        unique_id = str(uuid.uuid4())[:8]
        safe_no = laporan_data.get('no_permohonan', f"laporan_{laporan_id}").replace('/', '_')
        filename = f"Laporan_Insiden_{safe_no}_{timestamp}_{unique_id}.docx"
        
        response = send_file_with_cache_control(
            docx_path,
            filename,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if response:
            return response
        else:
            return send_file(
                docx_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        
    except Exception as e:
        print(f"[ERROR] Error generating DOCX: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('dashboard_laporan_insiden'))

# ==================== UPDATE ROUTE LAPORAN INSIDEN UNTUK PDF ====================

@app.route('/laporan-insiden/print/<int:laporan_id>')
@disable_cache
def laporan_insiden_print(laporan_id):
    """Print Laporan Insiden - DAPATKAN PDF (bukan DOCX)"""
    try:
        print(f"[DEBUG] laporan_insiden_print called for ID: {laporan_id}")
        
        # Langsung generate PDF
        return generate_laporan_insiden_pdf_route(laporan_id)
        
    except Exception as e:
        print(f"[ERROR] laporan_insiden_print error: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('dashboard_laporan_insiden'))

# ==================== PERBAIKI ROUTE PRINT-BY-ID ====================

@app.route('/laporan-insiden/print-by-id/<int:laporan_id>')
@disable_cache
def laporan_insiden_print_by_id(laporan_id):
    """Alias untuk laporan_insiden_print - UNTUK KOMPATIBILITAS DASHBOARD"""
    try:
        print(f"[DEBUG] print-by-id called for ID: {laporan_id}")
        # Panggil fungsi print yang sudah diperbarui
        return laporan_insiden_print(laporan_id)
        
    except Exception as e:
        print(f"[ERROR] print-by-id error: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('dashboard_laporan_insiden'))

# ==================== ROUTE GENERATE PDF YANG DIPERBAIKI ====================

@app.route('/laporan-insiden/generate-pdf/<int:laporan_id>')
@disable_cache
def generate_laporan_insiden_pdf_route(laporan_id):
    """Generate Laporan Insiden PDF (konversi dari DOCX) - DIPERBAIKI"""
    try:
        print(f"[DEBUG] Generate PDF for laporan_id: {laporan_id}")
        
        laporan_data = get_laporan_from_database(laporan_id)
        
        if not laporan_data:
            flash('Laporan tidak ditemukan', 'danger')
            return redirect(url_for('dashboard_laporan_insiden'))
        
        # Generate DOCX first
        docx_path = generate_laporan_insiden_docx(laporan_data)
        
        if not docx_path:
            flash('Gagal membuat dokumen dari template', 'danger')
            return redirect(url_for('dashboard_laporan_insiden'))
        
        print(f"[DEBUG] DOCX created: {docx_path}")
        
        # Convert to PDF dengan robust method
        safe_no = laporan_data.get('no_permohonan', f"laporan_{laporan_id}").replace('/', '_')
        prefix = f"Laporan_Insiden_{safe_no}"
        
        pdf_path = get_or_create_pdf(docx_path, prefix)
        
        if pdf_path and os.path.exists(pdf_path):
            filename = os.path.basename(pdf_path)
            response = send_file_with_cache_control(pdf_path, filename, 'application/pdf')
            if response:
                return response
        
        # FALLBACK: Kirim DOCX jika PDF gagal
        timestamp = int(time.time() * 1000)
        unique_id = str(uuid.uuid4())[:8]
        filename = f"Laporan_Insiden_{safe_no}_{timestamp}_{unique_id}.docx"
        
        flash('Konversi ke PDF gagal, file DOCX telah didownload', 'info')
        
        response = send_file_with_cache_control(
            docx_path,
            filename,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        if response:
            return response
        else:
            return send_file(
                docx_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        
    except Exception as e:
        print(f"[ERROR] Error generating PDF: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('dashboard_laporan_insiden'))

@app.route('/laporan-insiden/view/<int:laporan_id>')
def view_laporan_insiden(laporan_id):
    """View detail laporan insiden"""
    try:
        laporan_data = get_laporan_from_database(laporan_id)
        
        if not laporan_data:
            flash('Laporan tidak ditemukan', 'danger')
            return redirect(url_for('dashboard_laporan_insiden'))
        
        # Convert signature files to base64 for display
        ttd_fields = ['pelapor', 'atasan', 'smki', 'smki2', 'ketua']
        for field in ttd_fields:
            filename_key = f'ttd_{field}_filename'
            if laporan_data.get(filename_key):
                filepath = os.path.join(DATA_FOLDER, 'signatures', laporan_data[filename_key])
                if os.path.exists(filepath):
                    try:
                        with open(filepath, 'rb') as f:
                            signature_bytes = f.read()
                            base64_encoded = base64.b64encode(signature_bytes).decode('utf-8')
                            laporan_data[f'ttd_{field}_base64'] = f"data:image/png;base64,{base64_encoded}"
                    except Exception as e:
                        print(f"[WARN] Error reading signature file: {e}")
                        laporan_data[f'ttd_{field}_base64'] = None
                else:
                    laporan_data[f'ttd_{field}_base64'] = None
            else:
                laporan_data[f'ttd_{field}_base64'] = None
        
        # Format dates for display
        date_fields = ['tgl_efektif', 'tanggal_kejadian', 'tanggal_penyelesaian', 'created_at']
        for field in date_fields:
            if laporan_data.get(field):
                laporan_data[f'{field}_formatted'] = format_date(str(laporan_data[field]))
        
        # Tambahkan timestamp untuk URL download
        pdf_url_with_timestamp = url_for('generate_laporan_insiden_pdf_route', laporan_id=laporan_id) + f"?t={int(time.time())}"
        docx_url_with_timestamp = url_for('generate_laporan_insiden_docx_route', laporan_id=laporan_id) + f"?t={int(time.time())}"
        
        return render_template('view_laporan_insiden.html',
                             laporan=laporan_data,
                             pdf_url_with_timestamp=pdf_url_with_timestamp,
                             docx_url_with_timestamp=docx_url_with_timestamp,
                             system_name="laporan-insiden")
                             
    except Exception as e:
        print(f"[ERROR] View laporan error: {e}")
        flash(f'Terjadi kesalahan: {str(e)}', 'danger')
        return redirect(url_for('dashboard_laporan_insiden'))

# ==================== API ROUTES ====================

@app.route('/api/surat-pernyataan/delete/<int:surat_id>', methods=['DELETE'])
def delete_surat_pernyataan(surat_id):
    """Delete Surat Pernyataan"""
    try:
        surat = db.session.get(SuratPernyataan, surat_id)
        
        if not surat:
            return jsonify({"success": False, "message": "Surat tidak ditemukan"}), 404
        
        if surat.pdf_object:
            pdf_path = os.path.join(LOCAL_TEMP_PDF, surat.pdf_object)
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
        
        if surat.tanda_tangan:
            signature_path = os.path.join(DATA_FOLDER, 'signatures', surat.tanda_tangan)
            if os.path.exists(signature_path):
                os.remove(signature_path)
        
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

@app.route('/api/laporan-insiden/save', methods=['POST'])
def save_laporan_insiden():
    """Save Laporan Insiden to database"""
    print("[DEBUG] save_laporan_insiden")
    
    try:
        data = request.get_json()
        if not data:
            print("[ERROR] No JSON data received")
            return jsonify({"error": "Data kosong"}), 400

        print(f"[DEBUG] Data received. Keys: {list(data.keys())}")
        
        required_fields = ['nama_pelapor', 'nama_bidang', 'deskripsi_insiden']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            print(f"[WARN] Missing required fields: {missing_fields}")
            return jsonify({
                "error": f"Data wajib tidak lengkap: {', '.join(missing_fields)}"
            }), 400
        
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
        
        for ttd_field, label in ttd_fields:
            ttd_data = data.get(ttd_field, "")
            nama_field = f"nama_{ttd_field}"
            nama_value = data.get(nama_field, "")
            
            if ttd_data and ttd_data.startswith('data:image'):
                try:
                    identifier = f"{ttd_field}_{datetime.now().timestamp()}"
                    signature_filename = save_signature_image(
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
            
            nama_ttd_fields[nama_field] = nama_value
            
            print(f"[DEBUG] {label}: TTD={ttd_statuses.get(ttd_field, 'manual')}, Nama={nama_value}")
        
        conn = get_db_connection_mysql()
        if not conn:
            print("[ERROR] Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500
            
        cursor = conn.cursor()

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

        def generate_no_permohonan_laporan():
            now = datetime.now()
            return f"INS-{now.strftime('%Y%m%d-%H%M%S')}"

        values = (
            data.get("no_dok", "SOP/11/SMKI/VIII/2021/01"),
            data.get("no_revisi", "01"),
            data.get("tgl_efektif", "2023-09-21"),
            data.get("no_permohonan", generate_no_permohonan_laporan()),
            data.get("tanggal_kejadian", ""),
            data.get("nama_pelapor", ""),
            data.get("nama_bidang", ""),
            data.get("deskripsi_insiden", ""),
            data.get("jenis_insiden", "Keamanan Informasi"),
            data.get("analisa_penyebab", ""),
            data.get("tindak_smki", ""),
            data.get("pic_tindak", ""),
            data.get("tindak_pihak", ""),
            data.get("selesai", "Tidak"),
            data.get("tanggal_penyelesaian", None) if data.get("selesai") == "Ya" else None,
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

        cursor.execute(sql, values)
        conn.commit()
        last_id = cursor.lastrowid
        
        cursor.execute("SELECT * FROM laporan WHERE id = %s", (last_id,))
        result = cursor.fetchone()
        column_names = [desc[0] for desc in cursor.description]
        
        saved_data = dict(zip(column_names, result)) if result else {}
        
        cursor.close()
        conn.close()

        print(f"[SUCCESS] Data saved. ID: {last_id}")
        
        return jsonify({
            "status": "ok",
            "id": last_id,
            "message": "Laporan berhasil disimpan",
            "data": saved_data,
            "docx_url": url_for('generate_laporan_insiden_docx_route', laporan_id=last_id) + f"?t={int(time.time())}",
            "pdf_url": url_for('generate_laporan_insiden_pdf_route', laporan_id=last_id) + f"?t={int(time.time())}",
            "redirect": url_for('main_dashboard')
        }), 200

    except Exception as e:
        print(f"[ERROR] save_laporan_insiden: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({
            "error": f"Server error: {str(e)}"
        }), 500

@app.route('/api/laporan-insiden/delete/<int:laporan_id>', methods=['POST'])
def delete_laporan_insiden(laporan_id):
    """Delete Laporan Insiden"""
    try:
        conn = get_db_connection_mysql()
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500
            
        cursor = conn.cursor()
        
        # Hapus file tanda tangan terlebih dahulu
        cursor.execute("SELECT * FROM laporan WHERE id = %s", (laporan_id,))
        result = cursor.fetchone()
        
        if result:
            column_names = [desc[0] for desc in cursor.description]
            laporan_data = dict(zip(column_names, result))
            
            # Hapus file signature jika ada
            ttd_fields = ['pelapor', 'atasan', 'smki', 'smki2', 'ketua']
            for field in ttd_fields:
                filename_key = f'ttd_{field}_filename'
                if laporan_data.get(filename_key):
                    filepath = os.path.join(DATA_FOLDER, 'signatures', laporan_data[filename_key])
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        print(f"[INFO] Deleted signature file: {filepath}")
        
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

# ==================== USULAN PERUBAHAN ROUTES (DIKUTIP SEBAGIAN) ====================

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
            
            result = save_proposal_complete(form_data)
            
            if isinstance(result, tuple):
                flash(result[0].json['message'], 'error')
                return redirect(url_for('proposal_baru'))
            
            flash('Usulan perubahan berhasil disimpan!', 'success')
            return redirect(url_for('main_dashboard'))
            
        except Exception as e:
            flash(f'Terjadi kesalahan: {str(e)}', 'error')
            return redirect(url_for('proposal_baru'))

def save_proposal_complete(form_data):
    """Save complete proposal dengan semua data"""
    try:
        print(f"[DEBUG] save_proposal_complete called")
        
        def parse_date(date_str):
            if not date_str:
                return None
            try:
                return datetime.strptime(str(date_str), '%Y-%m-%d').date()
            except:
                try:
                    return datetime.strptime(str(date_str), '%d/%m/%Y').date()
                except:
                    try:
                        return datetime.fromisoformat(str(date_str)).date()
                    except:
                        print(f"[WARN] Failed to parse date: {date_str}")
                        return None
        
        signature_filename = None
        if form_data.get('signature_data') and form_data['signature_data'].startswith('data:image'):
            identifier = f"pemohon_{datetime.now().timestamp()}"
            signature_filename = save_signature_image(
                form_data.get('signature_data'), 
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Pemohon signature saved: {signature_filename}")
        
        doc_number = form_data.get('no_dokumen', '')
        if not doc_number:
            proposal_count = Proposal.query.count()
            doc_number = generate_doc_number(proposal_count)
        
        print(f"[DEBUG] Document number: {doc_number}")
        
        status = 'draft'
        if form_data.get('hasil_tahapan'):
            status = 'completed'
        elif form_data.get('status_persetujuan'):
            status = 'implementation'
        elif form_data.get('tipe_perubahan'):
            status = 'evaluasi'
        else:
            status = 'draft'
        
        print(f"[DEBUG] Proposal status determined: {status}")
        
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
        db.session.flush()
        proposal_id = proposal.id
        print(f"[DEBUG] Proposal created with ID: {proposal_id}, Nomor: {doc_number}")
        
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
        
        approval_signature = None
        if form_data.get('signature_approval') and form_data['signature_approval'].startswith('data:image'):
            identifier = f"approval_{datetime.now().timestamp()}_{proposal_id}"
            approval_signature = save_signature_image(
                form_data.get('signature_approval'),
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Approval signature saved: {approval_signature}")
        
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
        
        implementation_signature = None
        if form_data.get('signature_implementation') and form_data['signature_implementation'].startswith('data:image'):
            identifier = f"implementation_{datetime.now().timestamp()}_{proposal_id}"
            implementation_signature = save_signature_image(
                form_data.get('signature_implementation'),
                identifier,
                "usulan"
            )
            print(f"[DEBUG] Implementation signature saved: {implementation_signature}")
        
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
        
        db.session.commit()
        print(f"[SUCCESS] All data committed successfully for proposal {proposal_id}")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error in save_proposal_complete: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return False

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
    url = request.url
    
    if '.well-known/appspecific/com.chrome.devtools' in url:
        print(f"[INFO] Ignoring Chrome DevTools request: {url}")
        return '', 204
    
    if '.well-known/' in url:
        print(f"[INFO] Ignoring .well-known request: {url}")
        return '', 204
    
    print(f"[404] Page not found: {request.url}")
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': False,
            'error': 'Page not found',
            'message': 'The requested URL was not found on the server.',
            'url': request.url
        }), 404
    
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    print(f"[500] Internal Server Error: {e}")
    print(traceback.format_exc())
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': str(e) if str(e) else 'An internal server error occurred.',
            'traceback': traceback.format_exc()
        }), 500
    
    return render_template('500.html', error=str(e)), 500

@app.errorhandler(413)
def too_large(e):
    flash('File terlalu besar. Maksimum 5MB.', 'danger')
    return redirect(request.url)

# ==================== INITIALIZE DATABASE ====================
def init_databases():
    """Initialize all databases"""
    with app.app_context():
        db.create_all()
        print("[OK] SQLAlchemy database tables created")
        
        if create_laporan_table():
            print("[OK] MySQL laporan table created/verified")
        
        try:
            proposal_count = Proposal.query.count()
            surat_count = SuratPernyataan.query.count()
            print(f"[INFO] Usulan Perubahan: {proposal_count} records")
            print(f"[INFO] Surat Pernyataan: {surat_count} records")
        except Exception as e:
            print(f"[ERROR] Database test failed: {e}")

def update_laporan_table():
    """Update laporan table untuk 5 nama penandatangan"""
    try:
        conn = get_db_connection_mysql()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
        cursor.execute("""
            SHOW COLUMNS FROM laporan LIKE 'nama_ttd_pelapor'
        """)
        
        if not cursor.fetchone():
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
    init_databases()
    
    print("\n" + "="*80)
    print("SISTEM TERINTEGRASI BMKG - 3 SISTEM DALAM 1 APLIKASI")
    print("="*80)
    print("\n[SYSTEM 1] USULAN PERUBAHAN")
    print("  Dashboard    : http://localhost:5000/usulan-perubahan/dashboard")
    print("  Buat Baru    : http://localhost:5000/usulan-perubahan/baru")
    
    print("\n[SYSTEM 2] SURAT PERNYATAAN")
    print("  Form Input   : http://localhost:5000/surat-pernyataan")
    print("  Dashboard    : http://localhost:5000/surat-pernyataan/dashboard")
    
    print("\n[SYSTEM 3] LAPORAN INSIDEN")
    print("  Form Input   : http://localhost:5000/laporan-insiden")
    print("  Dashboard    : http://localhost:5000/laporan-insiden/dashboard")
    
    print("\n[INTEGRATED]")
    print("  Main Dashboard: http://localhost:5000/dashboard")
    print("  Home          : http://localhost:5000/")
    
    print("\n[INFO]")
    print(f"  Template dir: {TEMPLATE_DIR}")
    print(f"  Output dir  : {OUTPUT_DIR}")
    print(f"  Data dir    : {DATA_FOLDER}")
    print(f"  Temp PDF dir: {LOCAL_TEMP_PDF}")
    print(f"  Logo path   : {LOGO_PATH}")
    
    if not os.path.exists(TEMPLATE_SURAT_PERNYATAAN):
        print(f"\n[WARNING] Template surat pernyataan tidak ditemukan")
        print(f"          Pastikan file surat_pernyataan_template.docx ada di {TEMPLATE_DIR}/")
    
    if not os.path.exists(TEMPLATE_LAPORAN_INSIDEN):
        print(f"\n[WARNING] Template laporan insiden tidak ditemukan")
        print(f"          Pastikan file laporan_insiden_template.docx ada di {TEMPLATE_DIR}/")
    
    print("\n[IMPORTANT] Untuk konversi PDF yang sempurna:")
    print("1. Pastikan Microsoft Word terinstall")
    print("2. Atau install LibreOffice untuk konversi alternatif")
    print("3. Untuk Windows, install pywin32: pip install pywin32 pypiwin32")
    
    print("\n" + "="*80)
    print("[READY] Server berjalan di http://localhost:5000")
    print("="*80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)