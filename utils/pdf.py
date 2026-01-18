from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import inch
import os

def generate_pdf(output_path, logo_path, nama, nip, instansi, kegiatan, periode, kota, tanggal_str, ttd_io):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter
    
    # Add logo
    if os.path.exists(logo_path):
        logo = ImageReader(logo_path)
        c.drawImage(logo, 50, height - 100, width=100, height=80, mask='auto')
    
    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(160, height - 70, "BADAN METEOROLOGI, KLIMATOLOGI,")
    c.drawString(160, height - 90, "DAN GEOFISIKA")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(160, height - 110, "WILAYAH IV MAKASSAR")
    
    c.setFont("Helvetica", 10)
    c.drawString(160, height - 130, "Jalan Prof. Dr. Ir. Sutami No. 293, Makassar 90231")
    c.drawString(160, height - 145, "Telp. (0411) 441733, 441734 Fax. (0411) 444622")
    
    # Title
    c.line(50, height - 170, width - 50, height - 170)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height - 200, "SURAT PERNYATAAN")
    c.line(50, height - 210, width - 50, height - 210)
    
    # Content
    y_position = height - 250
    c.setFont("Helvetica", 12)
    
    # Data fields
    data = [
        ("Nama", nama),
        ("NIP", nip),
        ("Instansi", instansi),
        ("Kegiatan", kegiatan),
        ("Periode", periode),
    ]
    
    for label, value in data:
        c.drawString(50, y_position, f"{label}: {value}")
        y_position -= 30
    
    # Pernyataan
    y_position -= 30
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "PERNYATAAN:")
    y_position -= 30
    
    pernyataan = [
        f"Dengan ini saya menyatakan bahwa selama mengikuti {kegiatan},",
        "saya akan mematuhi semua peraturan dan tata tertib yang berlaku.",
        "Saya bersedia mengikuti seluruh rangkaian kegiatan dengan penuh tanggung jawab.",
        "Apabila melanggar, saya bersedia menerima sanksi sesuai peraturan yang berlaku."
    ]
    
    c.setFont("Helvetica", 12)
    for line in pernyataan:
        c.drawString(70, y_position, line)
        y_position -= 20
    
    # Signature section
    y_position -= 50
    c.drawString(50, y_position, f"{kota}, {tanggal_str}")
    y_position -= 80
    
    # Add signature
    if ttd_io:
        signature = ImageReader(ttd_io)
        c.drawImage(signature, 50, y_position - 50, width=150, height=50, mask='auto')
    
    c.drawString(50, y_position - 70, f"({nama})")
    c.drawString(50, y_position - 85, f"NIP. {nip}")
    
    # Footer
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(width/2, 50, "Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah")
    
    c.save()