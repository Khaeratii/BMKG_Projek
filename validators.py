import re
from datetime import datetime
from flask import flash

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone):
    """Validate phone number (Indonesian format)"""
    pattern = r'^(\+62|62|0)8[1-9][0-9]{6,9}$'
    return re.match(pattern, phone) is not None

def validate_date(date_str, date_format='%Y-%m-%d'):
    """Validate date format"""
    try:
        datetime.strptime(date_str, date_format)
        return True
    except ValueError:
        return False

def validate_proposal_data(form_data, check_required=True):
    """Validate proposal form data"""
    errors = []
    
    # Required fields for proposal
    if check_required:
        required_fields = {
            'tanggal': 'Tanggal',
            'deskripsi_perubahan': 'Deskripsi Perubahan',
            'hasil_dibutuhkan_tgl': 'Tanggal Hasil Dibutuhkan'
        }
        
        for field, label in required_fields.items():
            if not form_data.get(field):
                errors.append(f"{label} wajib diisi")
    
    # Date validations
    if form_data.get('tanggal'):
        if not validate_date(form_data['tanggal']):
            errors.append("Format tanggal tidak valid (gunakan YYYY-MM-DD)")
    
    if form_data.get('hasil_dibutuhkan_tgl'):
        if not validate_date(form_data['hasil_dibutuhkan_tgl']):
            errors.append("Format tanggal hasil dibutuhkan tidak valid")
        
        # Check if hasil_dibutuhkan_tgl is not before tanggal
        if form_data.get('tanggal') and validate_date(form_data['tanggal']):
            tanggal = datetime.strptime(form_data['tanggal'], '%Y-%m-%d')
            hasil_tgl = datetime.strptime(form_data['hasil_dibutuhkan_tgl'], '%Y-%m-%d')
            
            if hasil_tgl < tanggal:
                errors.append("Tanggal hasil dibutuhkan tidak boleh sebelum tanggal usulan")
    
    # Text length validations
    if form_data.get('deskripsi_perubahan'):
        if len(form_data['deskripsi_perubahan']) > 5000:
            errors.append("Deskripsi perubahan terlalu panjang (maks 5000 karakter)")
    
    if form_data.get('alasan_perubahan'):
        if len(form_data['alasan_perubahan']) > 2000:
            errors.append("Alasan perubahan terlalu panjang (maks 2000 karakter)")
    
    return errors

def validate_evaluation_data(form_data):
    """Validate evaluation form data"""
    errors = []
    
    if not form_data.get('prioritas'):
        errors.append("Prioritas perubahan wajib dipilih")
    
    if not form_data.get('tipe_perubahan'):
        errors.append("Minimal satu tipe perubahan harus dipilih")
    
    if not form_data.get('dampak_lingkungan'):
        errors.append("Dampak terhadap lingkungan produksi wajib diisi")
    
    return errors