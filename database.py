from datetime import datetime
import json
from sqlalchemy import func, and_, or_, extract
from sqlalchemy.orm import joinedload
from models import db, User, Proposal, Evaluation, Approval, Implementation, Draft, AuditLog, Statistic

class DatabaseManager:
    def __init__(self, app=None):
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize database with app"""
        db.init_app(app)
        
        with app.app_context():
            db.create_all()
            self.create_default_users()
    
    def create_default_users(self):
        """Create default users if not exist"""
        if not User.query.filter_by(role='admin').first():
            default_users = [
                User(
                    username='admin',
                    password_hash='pbkdf2:sha256:260000$...',  # Hash untuk 'admin123'
                    nama_lengkap='Administrator',
                    jabatan='Admin Sistem',
                    role='admin',
                    email='admin@bmkg.go.id',
                    is_active=True
                ),
                User(
                    username='pegawai1',
                    password_hash='pbkdf2:sha256:260000$...',  # Hash untuk 'password123'
                    nama_lengkap='Budi Santoso',
                    jabatan='Staff IT',
                    role='pegawai',
                    email='budi@bmkg.go.id',
                    is_active=True
                ),
                User(
                    username='penanggung1',
                    password_hash='pbkdf2:sha256:260000$...',
                    nama_lengkap='Dr. Ahmad Fauzi',
                    jabatan='Ketua Tim Kerja',
                    role='penanggung_jawab',
                    email='ahmad@bmkg.go.id',
                    is_active=True
                ),
                User(
                    username='pemberi1',
                    password_hash='pbkdf2:sha256:260000$...',
                    nama_lengkap='Prof. Surya Dharma',
                    jabatan='Kepala Bidang',
                    role='pemberi_persetujuan',
                    email='surya@bmkg.go.id',
                    is_active=True
                ),
                User(
                    username='pelaksana1',
                    password_hash='pbkdf2:sha256:260000$...',
                    nama_lengkap='Dian Prasetyo',
                    jabatan='Pelaksana Teknis',
                    role='pelaksana',
                    email='dian@bmkg.go.id',
                    is_active=True
                )
            ]
            
            for user in default_users:
                db.session.add(user)
            
            db.session.commit()
            print("[INFO] Default users created successfully")
    
    # ==================== USER METHODS ====================
    
    def get_user_by_username(self, username):
        """Get user by username"""
        return User.query.filter_by(username=username, is_active=True).first()
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        return User.query.filter_by(id=user_id, is_active=True).first()
    
    def get_all_users(self):
        """Get all active users"""
        return User.query.filter_by(is_active=True).order_by(User.role, User.nama_lengkap).all()
    
    def create_user(self, user_data):
        """Create new user"""
        user = User(**user_data)
        db.session.add(user)
        db.session.commit()
        return user
    
    # ==================== PROPOSAL METHODS ====================
    
    def create_proposal(self, proposal_data):
        """Create new proposal"""
        proposal = Proposal(**proposal_data)
        db.session.add(proposal)
        db.session.commit()
        return proposal
    
    def update_proposal(self, proposal_id, update_data):
        """Update proposal"""
        proposal = Proposal.query.get(proposal_id)
        if not proposal:
            return None
        
        for key, value in update_data.items():
            setattr(proposal, key, value)
        
        proposal.updated_at = datetime.now()
        db.session.commit()
        return proposal
    
    def get_proposal(self, proposal_id):
        """Get proposal by ID with creator info"""
        return Proposal.query.options(
            joinedload(Proposal.creator)
        ).get(proposal_id)
    
    def get_proposals_by_user(self, user_id, role=None):
        """Get proposals based on user role"""
        query = Proposal.query.options(
            joinedload(Proposal.creator)
        )
        
        if role == 'pegawai':
            query = query.filter(Proposal.created_by == user_id)
        elif role == 'penanggung_jawab':
            query = query.filter(Proposal.status.in_(['evaluasi', 'approval', 'implementation']))
        elif role == 'pemberi_persetujuan':
            query = query.filter(Proposal.status.in_(['approval', 'implementation', 'completed']))
        elif role == 'pelaksana':
            query = query.filter(Proposal.status.in_(['implementation', 'completed']))
        # Admin dan lainnya bisa melihat semua
        
        return query.order_by(Proposal.created_at.desc()).all()
    
    def get_proposal_with_details(self, proposal_id):
        """Get proposal with all related data"""
        proposal = self.get_proposal(proposal_id)
        if not proposal:
            return None
        
        return {
            'proposal': proposal,
            'evaluation': proposal.evaluation,
            'approval': proposal.approval,
            'implementation': proposal.implementation
        }
    
    # ==================== EVALUATION METHODS ====================
    
    def save_evaluation(self, evaluation_data):
        """Save or update evaluation"""
        # Convert tipe_perubahan list to JSON string
        if 'tipe_perubahan' in evaluation_data and isinstance(evaluation_data['tipe_perubahan'], list):
            evaluation_data['tipe_perubahan'] = json.dumps(evaluation_data['tipe_perubahan'])
        
        existing = Evaluation.query.filter_by(proposal_id=evaluation_data['proposal_id']).first()
        
        if existing:
            # Update existing
            for key, value in evaluation_data.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.now()
        else:
            # Create new
            evaluation = Evaluation(**evaluation_data)
            db.session.add(evaluation)
        
        db.session.commit()
    
    # ==================== APPROVAL METHODS ====================
    
    def save_approval(self, approval_data):
        """Save or update approval"""
        existing = Approval.query.filter_by(proposal_id=approval_data['proposal_id']).first()
        
        if existing:
            # Update existing
            for key, value in approval_data.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.now()
        else:
            # Create new
            approval = Approval(**approval_data)
            db.session.add(approval)
        
        db.session.commit()
    
    # ==================== IMPLEMENTATION METHODS ====================
    
    def save_implementation(self, implementation_data):
        """Save or update implementation"""
        existing = Implementation.query.filter_by(proposal_id=implementation_data['proposal_id']).first()
        
        if existing:
            # Update existing
            for key, value in implementation_data.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.now()
        else:
            # Create new
            implementation = Implementation(**implementation_data)
            db.session.add(implementation)
        
        db.session.commit()
    
    # ==================== DRAFT METHODS ====================
    
    def save_draft(self, draft_data):
        """Save draft"""
        if 'data' in draft_data and isinstance(draft_data['data'], dict):
            draft_data['data'] = json.dumps(draft_data['data'])
        
        if draft_data.get('draft_id'):
            # Update existing
            draft = Draft.query.get(draft_data['draft_id'])
            if draft and draft.user_id == draft_data['user_id']:
                draft.data = draft_data['data']
                draft.draft_name = draft_data.get('draft_name', '')
                draft.draft_notes = draft_data.get('draft_notes', '')
                draft.updated_at = datetime.now()
                db.session.commit()
                return draft.id
        else:
            # Create new
            draft = Draft(**draft_data)
            db.session.add(draft)
            db.session.commit()
            return draft.id
    
    def get_user_drafts(self, user_id):
        """Get all drafts for a user"""
        return Draft.query.filter_by(user_id=user_id, status='draft').order_by(Draft.updated_at.desc()).all()
    
    def get_draft(self, draft_id, user_id):
        """Get specific draft"""
        return Draft.query.filter_by(id=draft_id, user_id=user_id, status='draft').first()
    
    def delete_draft(self, draft_id, user_id):
        """Delete draft"""
        draft = Draft.query.filter_by(id=draft_id, user_id=user_id).first()
        if draft:
            db.session.delete(draft)
            db.session.commit()
            return True
        return False
    
    # ==================== STATISTICS METHODS ====================
    
    def get_dashboard_stats(self):
        """Get dashboard statistics"""
        stats = {
            'total': Proposal.query.count(),
            'draft': Proposal.query.filter_by(status='draft').count(),
            'evaluasi': Proposal.query.filter_by(status='evaluasi').count(),
            'approval': Proposal.query.filter_by(status='approval').count(),
            'implementation': Proposal.query.filter_by(status='implementation').count(),
            'completed': Proposal.query.filter_by(status='completed').count(),
            'rejected': Proposal.query.filter_by(status='rejected').count(),
            'total_users': User.query.filter_by(is_active=True).count()
        }
        
        # Recent proposals
        recent_proposals = Proposal.query.options(
            joinedload(Proposal.creator)
        ).order_by(Proposal.created_at.desc()).limit(10).all()
        
        return {
            'stats': stats,
            'recent_proposals': recent_proposals
        }
    
    def log_activity(self, user_id, username, action, module, details, ip_address):
        """Log user activity"""
        log = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            module=module,
            details=details,
            ip_address=ip_address
        )
        db.session.add(log)
        db.session.commit()
    
    # ==================== UTILITY METHODS ====================
    
    def get_next_proposal_number(self):
        """Generate next proposal document number"""
        current_year = datetime.now().year
        count = Proposal.query.filter(
            extract('year', Proposal.created_at) == current_year
        ).count()
        
        roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
        month_roman = roman_numerals[datetime.now().month - 1]
        seq_num = count + 1
        
        return f"SOP/{seq_num:02d}/IMS/{month_roman}/{current_year}/{seq_num:02d}"