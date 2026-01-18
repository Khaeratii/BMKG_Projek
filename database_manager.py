from models import db, User, Proposal, Evaluation, Approval, Implementation, Draft, AuditLog, Statistic
from datetime import datetime
import json
from sqlalchemy import func, extract, and_, or_

class DatabaseManager:
    @staticmethod
    def init_db(app):
        """Initialize database with app"""
        db.init_app(app)
        
        with app.app_context():
            # Create all tables
            db.create_all()
            
            # Create default admin user if not exists
            if not User.query.filter_by(username='admin').first():
                default_users = [
                    User(
                        username='admin',
                        password_hash='admin123',  # Plain text for now, should be hashed
                        nama_lengkap='Administrator',
                        jabatan='Admin Sistem',
                        role='admin',
                        email='admin@bmkg.go.id',
                        is_active=True
                    ),
                    User(
                        username='pegawai1',
                        password_hash='password123',
                        nama_lengkap='Budi Santoso',
                        jabatan='Staff IT',
                        role='pegawai',
                        email='budi@bmkg.go.id',
                        is_active=True
                    ),
                    User(
                        username='penanggung1',
                        password_hash='password123',
                        nama_lengkap='Dr. Ahmad Fauzi',
                        jabatan='Ketua Tim Kerja',
                        role='penanggung_jawab',
                        email='ahmad@bmkg.go.id',
                        is_active=True
                    ),
                    User(
                        username='pemberi1',
                        password_hash='password123',
                        nama_lengkap='Prof. Surya Dharma',
                        jabatan='Kepala Bidang',
                        role='pemberi_persetujuan',
                        email='surya@bmkg.go.id',
                        is_active=True
                    ),
                    User(
                        username='pelaksana1',
                        password_hash='password123',
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
    
    # ==================== HELPER FUNCTIONS (Ganti fungsi CSV) ====================
    
    @staticmethod
    def get_user_by_username(username):
        """Get user by username"""
        return User.query.filter_by(username=username, is_active=True).first()
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        return User.query.get(user_id)
    
    @staticmethod
    def get_next_proposal_id():
        """Get next proposal ID"""
        last_proposal = Proposal.query.order_by(Proposal.id.desc()).first()
        return (last_proposal.id + 1) if last_proposal else 1
    
    @staticmethod
    def get_proposal_count():
        """Get total proposal count"""
        return Proposal.query.count()
    
    @staticmethod
    def get_proposals_by_status(status):
        """Get proposals by status"""
        return Proposal.query.filter_by(status=status).all()
    
    @staticmethod
    def get_all_proposals():
        """Get all proposals"""
        return Proposal.query.all()
    
    @staticmethod
    def get_proposal(proposal_id):
        """Get proposal by ID"""
        return Proposal.query.get(proposal_id)
    
    @staticmethod
    def get_proposal_data(proposal_id):
        """Get proposal with all related data"""
        proposal = Proposal.query.get(proposal_id)
        evaluation = Evaluation.query.filter_by(proposal_id=proposal_id).first()
        approval = Approval.query.filter_by(proposal_id=proposal_id).first()
        implementation = Implementation.query.filter_by(proposal_id=proposal_id).first()
        
        return {
            'proposal': proposal.to_dict() if proposal else {},
            'evaluation': evaluation.to_dict() if evaluation else {},
            'approval': approval.to_dict() if approval else {},
            'implementation': implementation.to_dict() if implementation else {}
        }
    
    @staticmethod
    def create_proposal(data):
        """Create new proposal"""
        proposal = Proposal(**data)
        db.session.add(proposal)
        db.session.commit()
        return proposal
    
    @staticmethod
    def update_proposal(proposal_id, data):
        """Update proposal"""
        proposal = Proposal.query.get(proposal_id)
        if proposal:
            for key, value in data.items():
                setattr(proposal, key, value)
            proposal.updated_at = datetime.now()
            db.session.commit()
        return proposal
    
    @staticmethod
    def delete_proposal(proposal_id):
        """Delete proposal"""
        proposal = Proposal.query.get(proposal_id)
        if proposal:
            db.session.delete(proposal)
            db.session.commit()
            return True
        return False
    
    @staticmethod
    def save_evaluation(data):
        """Save or update evaluation"""
        evaluation = Evaluation.query.filter_by(proposal_id=data['proposal_id']).first()
        
        if evaluation:
            # Update existing
            for key, value in data.items():
                setattr(evaluation, key, value)
        else:
            # Create new
            evaluation = Evaluation(**data)
            db.session.add(evaluation)
        
        evaluation.updated_at = datetime.now()
        db.session.commit()
        return evaluation
    
    @staticmethod
    def save_approval(data):
        """Save or update approval"""
        approval = Approval.query.filter_by(proposal_id=data['proposal_id']).first()
        
        if approval:
            # Update existing
            for key, value in data.items():
                setattr(approval, key, value)
        else:
            # Create new
            approval = Approval(**data)
            db.session.add(approval)
        
        approval.updated_at = datetime.now()
        db.session.commit()
        return approval
    
    @staticmethod
    def save_implementation(data):
        """Save or update implementation"""
        implementation = Implementation.query.filter_by(proposal_id=data['proposal_id']).first()
        
        if implementation:
            # Update existing
            for key, value in data.items():
                setattr(implementation, key, value)
        else:
            # Create new
            implementation = Implementation(**data)
            db.session.add(implementation)
        
        implementation.updated_at = datetime.now()
        db.session.commit()
        return implementation
    
    @staticmethod
    def save_draft(data):
        """Save draft"""
        draft = Draft(
            user_id=data['user_id'],
            username=data['username'],
            nama_lengkap=data['nama_lengkap'],
            jabatan=data['jabatan'],
            data=json.dumps(data['data']),
            draft_name=data.get('draft_name', ''),
            draft_notes=data.get('draft_notes', '')
        )
        db.session.add(draft)
        db.session.commit()
        return draft
    
    @staticmethod
    def update_draft(draft_id, data):
        """Update draft"""
        draft = Draft.query.get(draft_id)
        if draft:
            for key, value in data.items():
                setattr(draft, key, value)
            draft.updated_at = datetime.now()
            draft.data = json.dumps(data['data']) if 'data' in data else draft.data
            db.session.commit()
        return draft
    
    @staticmethod
    def get_draft(draft_id):
        """Get draft by ID"""
        draft = Draft.query.get(draft_id)
        if draft:
            draft_data = draft.to_dict()
            draft_data['data'] = json.loads(draft.data) if draft.data else {}
            return draft_data
        return None
    
    @staticmethod
    def get_user_drafts(user_id):
        """Get all drafts for a user"""
        drafts = Draft.query.filter_by(user_id=user_id, status='draft').all()
        result = []
        for draft in drafts:
            draft_data = draft.to_dict()
            draft_data['data'] = json.loads(draft.data) if draft.data else {}
            result.append(draft_data)
        return result
    
    @staticmethod
    def delete_draft(draft_id):
        """Delete draft"""
        draft = Draft.query.get(draft_id)
        if draft:
            db.session.delete(draft)
            db.session.commit()
            return True
        return False
    
    @staticmethod
    def log_activity(username, action, description, ip_address='N/A'):
        """Log user activity"""
        user = User.query.filter_by(username=username).first()
        log = AuditLog(
            user_id=user.id if user else None,
            username=username,
            action=action,
            description=description,
            ip_address=ip_address
        )
        db.session.add(log)
        db.session.commit()
    
    @staticmethod
    def get_dashboard_stats(role='admin', username=None):
        """Get dashboard statistics based on user role"""
        total = Proposal.query.count()
        draft = Proposal.query.filter_by(status='draft').count()
        evaluasi = Proposal.query.filter_by(status='evaluasi').count()
        approval = Proposal.query.filter_by(status='approval').count()
        implementation = Proposal.query.filter_by(status='implementation').count()
        completed = Proposal.query.filter_by(status='completed').count()
        rejected = Proposal.query.filter_by(status='rejected').count()
        
        # Filter proposals based on role
        query = Proposal.query
        
        if role == 'pegawai' and username:
            user = User.query.filter_by(username=username).first()
            if user:
                query = query.filter_by(created_by=user.id)
        
        elif role == 'penanggung_jawab':
            query = query.filter(Proposal.status.in_(['evaluasi', 'approval', 'implementation']))
        
        elif role == 'pemberi_persetujuan':
            query = query.filter(Proposal.status.in_(['approval', 'implementation', 'completed']))
        
        elif role == 'pelaksana':
            query = query.filter(Proposal.status.in_(['implementation', 'completed']))
        
        filtered_proposals = query.order_by(Proposal.created_at.desc()).all()
        
        return {
            'total': total,
            'draft': draft,
            'evaluasi': evaluasi,
            'approval': approval,
            'implementation': implementation,
            'completed': completed,
            'rejected': rejected,
            'filtered_proposals': filtered_proposals
        }
    
    @staticmethod
    def get_all_users():
        """Get all users"""
        return User.query.filter_by(is_active=True).all()