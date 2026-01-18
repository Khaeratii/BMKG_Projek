import base64
from io import BytesIO
import re

def decode_signature(signature_base64):
    if not signature_base64:
        return None
    
    try:
        if signature_base64.startswith('data:image'):
            _, encoded = signature_base64.split(',', 1)
        else:
            encoded = signature_base64
        
        signature_bytes = base64.b64decode(encoded)
        return BytesIO(signature_bytes)
    except:
        return None

def safe_filename(filename):
    return re.sub(r'[^\w\s-]', '', filename).strip().replace(' ', '_')