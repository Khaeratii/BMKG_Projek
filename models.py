import os
import json
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

# Initialize SQLAlchemy
db = SQLAlchemy()

# Base class for all models
Base = declarative_base()

# ==================== MODELS FOR USULAN PERUBAHAN ====================

class User(db.Model):
    """Model untuk user/pegawai"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    nama_lengkap = db.Column(db.String(100), nullable=False)
    jabatan = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # pegawai, penanggung_jawab, pemberi_persetujuan, pelaksana, admin
    email = db.Column(db.String(100))
    no_hp = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    proposals = relationship('Proposal', backref='creator', foreign_keys='Proposal.created_by', lazy='dynamic')
    evaluations = relationship('Evaluation', backref='evaluator', foreign_keys='Evaluation.evaluated_by')
    approvals = relationship('Approval', backref='approver', foreign_keys='Approval.approved_by')
    implementations = relationship('Implementation', backref='implementer', foreign_keys='Implementation.implemented_by')
    drafts = relationship('Draft', backref='user', lazy='dynamic')
    audit_logs = relationship('AuditLog', backref='user', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'nama_lengkap': self.nama_lengkap,
            'jabatan': self.jabatan,
            'role': self.role,
            'email': self.email,
            'no_hp': self.no_hp,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

class Proposal(db.Model):
    """Model untuk proposal perubahan"""
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
    status = db.Column(db.String(20), default='draft')  # draft, evaluasi, approval, implementation, completed, rejected
    signature_filename = db.Column(db.String(255))
    created_by = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    draft_name = db.Column(db.String(100))
    draft_notes = db.Column(db.Text)
    
    # Relationships
    evaluation = relationship('Evaluation', backref='proposal', uselist=False, cascade='all, delete-orphan')
    approval = relationship('Approval', backref='proposal', uselist=False, cascade='all, delete-orphan')
    implementation = relationship('Implementation', backref='proposal', uselist=False, cascade='all, delete-orphan')
    
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
            'created_by': self.created_by,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
            'draft_name': self.draft_name,
            'draft_notes': self.draft_notes
        }

class Evaluation(db.Model):
    """Model untuk evaluasi proposal"""
    __tablename__ = 'evaluations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    proposal_id = db.Column(db.Integer, ForeignKey('proposals.id'), nullable=False, unique=True)
    tipe_perubahan = db.Column(db.Text)  # JSON array
    prioritas = db.Column(db.String(20))  # Normal, Emergency
    dampak_lingkungan = db.Column(db.Text)
    upaya_dibutuhkan = db.Column(db.Text)
    sumber_daya = db.Column(db.Text)
    rencana_pengujian = db.Column(db.Text)
    catatan_evaluasi = db.Column(db.Text)
    keputusan = db.Column(db.String(20), default='draft')  # draft, teruskan, tolak
    evaluated_by = db.Column(db.Integer, ForeignKey('users.id'))
    evaluated_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        tipe_perubahan_data = []
        if self.tipe_perubahan:
            try:
                tipe_perubahan_data = json.loads(self.tipe_perubahan)
            except:
                tipe_perubahan_data = []
        
        return {
            'id': self.id,
            'proposal_id': self.proposal_id,
            'tipe_perubahan': tipe_perubahan_data,
            'prioritas': self.prioritas,
            'dampak_lingkungan': self.dampak_lingkungan,
            'upaya_dibutuhkan': self.upaya_dibutuhkan,
            'sumber_daya': self.sumber_daya,
            'rencana_pengujian': self.rencana_pengujian,
            'catatan_evaluasi': self.catatan_evaluasi,
            'keputusan': self.keputusan,
            'evaluated_by': self.evaluated_by,
            'evaluated_at': self.evaluated_at.strftime('%Y-%m-%d %H:%M:%S') if self.evaluated_at else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

class Approval(db.Model):
    """Model untuk persetujuan proposal"""
    __tablename__ = 'approvals'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    proposal_id = db.Column(db.Integer, ForeignKey('proposals.id'), nullable=False, unique=True)
    status = db.Column(db.String(20))  # disetujui, ditolak
    catatan_persetujuan = db.Column(db.Text)
    keputusan = db.Column(db.String(20), default='draft')  # draft, setuju, tolak
    tanggal_pelaksanaan = db.Column(db.Date)
    pic_pelaksana = db.Column(db.String(100))
    approved_by = db.Column(db.Integer, ForeignKey('users.id'))
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
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.strftime('%Y-%m-%d %H:%M:%S') if self.approved_at else None,
            'tanda_tangan_persetujuan': self.tanda_tangan_persetujuan,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

class Implementation(db.Model):
    """Model untuk implementasi proposal"""
    __tablename__ = 'implementations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    proposal_id = db.Column(db.Integer, ForeignKey('proposals.id'), nullable=False, unique=True)
    hasil_tahapan_perubahan = db.Column(db.Text)
    hasil_pengujian = db.Column(db.Text)
    tanggal_rilis = db.Column(db.Date)
    catatan_implementasi = db.Column(db.Text)
    implemented_by = db.Column(db.Integer, ForeignKey('users.id'))
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
            'implemented_by': self.implemented_by,
            'implemented_at': self.implemented_at.strftime('%Y-%m-%d %H:%M:%S') if self.implemented_at else None,
            'tanda_tangan_pic': self.tanda_tangan_pic,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

class Draft(db.Model):
    """Model untuk draft proposal"""
    __tablename__ = 'drafts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    username = db.Column(db.String(50), nullable=False)
    nama_lengkap = db.Column(db.String(100), nullable=False)
    jabatan = db.Column(db.String(100), nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON data
    draft_name = db.Column(db.String(100))
    draft_notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='draft')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'nama_lengkap': self.nama_lengkap,
            'jabatan': self.jabatan,
            'data': json.loads(self.data) if self.data else {},
            'draft_name': self.draft_name,
            'draft_notes': self.draft_notes,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

class AuditLog(db.Model):
    """Model untuk audit log"""
    __tablename__ = 'admin_audit_log'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, default=datetime.now)
    user_id = db.Column(db.Integer, ForeignKey('users.id'))
    username = db.Column(db.String(50))
    action = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else None,
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'description': self.description,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
        }

class Statistic(db.Model):
    """Model untuk statistik"""
    __tablename__ = 'statistics'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    periode = db.Column(db.String(10), nullable=False, unique=True)  # YYYY-MM
    total_usulan = db.Column(db.Integer, default=0)
    usulan_draft = db.Column(db.Integer, default=0)
    usulan_evaluasi = db.Column(db.Integer, default=0)
    usulan_approval = db.Column(db.Integer, default=0)
    usulan_implementation = db.Column(db.Integer, default=0)
    usulan_completed = db.Column(db.Integer, default=0)
    usulan_ditolak = db.Column(db.Integer, default=0)
    rata_rata_waktu_hari = db.Column(db.Float, default=0)
    anggaran_total = db.Column(db.Float, default=0)
    pegawai_aktif = db.Column(db.Integer, default=0)
    pegawai_nonaktif = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'periode': self.periode,
            'total_usulan': self.total_usulan,
            'usulan_draft': self.usulan_draft,
            'usulan_evaluasi': self.usulan_evaluasi,
            'usulan_approval': self.usulan_approval,
            'usulan_implementation': self.usulan_implementation,
            'usulan_completed': self.usulan_completed,
            'usulan_ditolak': self.usulan_ditolak,
            'rata_rata_waktu_hari': self.rata_rata_waktu_hari,
            'anggaran_total': self.anggaran_total,
            'pegawai_aktif': self.pegawai_aktif,
            'pegawai_nonaktif': self.pegawai_nonaktif,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }

# ==================== MODELS FOR SURAT PERNYATAAN ====================

class SuratPernyataan(db.Model):
    """Model untuk surat pernyataan"""
    __tablename__ = 'surat_pernyataan'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nama = db.Column(db.String(100), nullable=False)
    nip = db.Column(db.String(20), nullable=False)
    instansi = db.Column(db.String(100), nullable=False)
    kegiatan = db.Column(db.Text, nullable=False)
    periode = db.Column(db.String(50), nullable=False)
    pdf_object = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def __repr__(self):
        return f'<SuratPernyataan {self.nama} - {self.nip}>'
    
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

# ==================== MODELS FOR LAPORAN INSIDEN ====================
# Note: Laporan Insiden menggunakan raw MySQL, jadi tidak ada model SQLAlchemy
# Tapi kita bisa membuat class untuk representasi data

class LaporanInsiden:
    """Class representasi untuk laporan insiden (tidak menggunakan SQLAlchemy)"""
    
    def __init__(self, data=None):
        if data:
            self.id = data.get('id')
            self.no_dok = data.get('no_dok')
            self.no_revisi = data.get('no_revisi')
            self.tgl_efektif = data.get('tgl_efektif')
            self.no_permohonan = data.get('no_permohonan')
            self.tanggal_kejadian = data.get('tanggal_kejadian')
            self.nama_pelapor = data.get('nama_pelapor')
            self.nama_bidang = data.get('nama_bidang')
            self.deskripsi_insiden = data.get('deskripsi_insiden')
            self.jenis_insiden = data.get('jenis_insiden')
            self.analisa_penyebab = data.get('analisa_penyebab')
            self.tindak_smki = data.get('tindak_smki')
            self.pic_tindak = data.get('pic_tindak')
            self.tindak_pihak = data.get('tindak_pihak')
            self.insiden_selesai = data.get('insiden_selesai')
            self.tanggal_penyelesaian = data.get('tanggal_penyelesaian')
            self.ttd_pelapor = data.get('ttd_pelapor')
            self.ttd_atasan = data.get('ttd_atasan')
            self.ttd_smki = data.get('ttd_smki')
            self.ttd_smki2 = data.get('ttd_smki2')
            self.ttd_ketua = data.get('ttd_ketua')
            self.created_at = data.get('created_at')
        else:
            self.id = None
            self.no_dok = None
            self.no_revisi = None
            self.tgl_efektif = None
            self.no_permohonan = None
            self.tanggal_kejadian = None
            self.nama_pelapor = None
            self.nama_bidang = None
            self.deskripsi_insiden = None
            self.jenis_insiden = None
            self.analisa_penyebab = None
            self.tindak_smki = None
            self.pic_tindak = None
            self.tindak_pihak = None
            self.insiden_selesai = None
            self.tanggal_penyelesaian = None
            self.ttd_pelapor = None
            self.ttd_atasan = None
            self.ttd_smki = None
            self.ttd_smki2 = None
            self.ttd_ketua = None
            self.created_at = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'no_dok': self.no_dok,
            'no_revisi': self.no_revisi,
            'tgl_efektif': self.tgl_efektif.strftime('%Y-%m-%d') if hasattr(self.tgl_efektif, 'strftime') else self.tgl_efektif,
            'no_permohonan': self.no_permohonan,
            'tanggal_kejadian': self.tanggal_kejadian.strftime('%Y-%m-%d') if hasattr(self.tanggal_kejadian, 'strftime') else self.tanggal_kejadian,
            'nama_pelapor': self.nama_pelapor,
            'nama_bidang': self.nama_bidang,
            'deskripsi_insiden': self.deskripsi_insiden,
            'jenis_insiden': self.jenis_insiden,
            'analisa_penyebab': self.analisa_penyebab,
            'tindak_smki': self.tindak_smki,
            'pic_tindak': self.pic_tindak,
            'tindak_pihak': self.tindak_pihak,
            'insiden_selesai': self.insiden_selesai,
            'tanggal_penyelesaian': self.tanggal_penyelesaian.strftime('%Y-%m-%d') if hasattr(self.tanggal_penyelesaian, 'strftime') else self.tanggal_penyelesaian,
            'ttd_pelapor': self.ttd_pelapor,
            'ttd_atasan': self.ttd_atasan,
            'ttd_smki': self.ttd_smki,
            'ttd_smki2': self.ttd_smki2,
            'ttd_ketua': self.ttd_ketua,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(self.created_at, 'strftime') else self.created_at,
        }

# ==================== HELPER FUNCTIONS ====================

def create_all_tables(app):
    """Create all database tables"""
    with app.app_context():
        try:
            # Drop all tables first (for development only)
            # db.drop_all()
            
            # Create all tables
            db.create_all()
            
            # Create default admin user if not exists
            create_default_user()
            
            print("[OK] All database tables created successfully")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to create tables: {e}")
            return False

def create_default_user():
    """Create default admin user if not exists"""
    try:
        # Check if admin user exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            # Create default users
            default_users = [
                User(
                    username='admin',
                    password_hash='admin123',  # In production, use hashed password
                    nama_lengkap='Administrator Sistem',
                    jabatan='Admin Sistem',
                    role='admin',
                    email='admin@bmkg.go.id',
                    no_hp='081234567890',
                    is_active=True
                ),
                User(
                    username='pegawai1',
                    password_hash='password123',
                    nama_lengkap='Budi Santoso',
                    jabatan='Staff IT',
                    role='pegawai',
                    email='budi@bmkg.go.id',
                    no_hp='081234567891',
                    is_active=True
                ),
                User(
                    username='penanggung1',
                    password_hash='password123',
                    nama_lengkap='Dr. Ahmad Fauzi',
                    jabatan='Ketua Tim Kerja',
                    role='penanggung_jawab',
                    email='ahmad@bmkg.go.id',
                    no_hp='081234567892',
                    is_active=True
                ),
                User(
                    username='pemberi1',
                    password_hash='password123',
                    nama_lengkap='Prof. Surya Dharma',
                    jabatan='Kepala Bidang',
                    role='pemberi_persetujuan',
                    email='surya@bmkg.go.id',
                    no_hp='081234567893',
                    is_active=True
                ),
                User(
                    username='pelaksana1',
                    password_hash='password123',
                    nama_lengkap='Dian Prasetyo',
                    jabatan='Pelaksana Teknis',
                    role='pelaksana',
                    email='dian@bmkg.go.id',
                    no_hp='081234567894',
                    is_active=True
                )
            ]
            
            for user in default_users:
                db.session.add(user)
            
            db.session.commit()
            print("[OK] Default users created successfully")
        else:
            print("[INFO] Admin user already exists")
            
    except Exception as e:
        print(f"[ERROR] Failed to create default user: {e}")
        db.session.rollback()

def get_model_by_tablename(tablename):
    """Get SQLAlchemy model by table name"""
    for model in db.Model._decl_class_registry.values():
        if hasattr(model, '__tablename__') and model.__tablename__ == tablename:
            return model
    return None

def init_database(app):
    """Initialize database with all tables"""
    return create_all_tables(app)

# ==================== TEST FUNCTIONS ====================

def test_models():
    """Test function to verify models work correctly"""
    print("=" * 70)
    print("MODELS TEST")
    print("=" * 70)
    
    # List all models
    models = [User, Proposal, Evaluation, Approval, Implementation, 
              Draft, AuditLog, Statistic, SuratPernyataan]
    
    for model in models:
        print(f"✓ {model.__name__}: {model.__tablename__}")
    
    print(f"\nTotal models: {len(models)}")
    print("=" * 70)

if __name__ == '__main__':
    # Run test
    test_models()