import os
import subprocess
from datetime import datetime

# Import render_template dari Flask
from flask import Flask, request, send_file, render_template
from docxtpl import DocxTemplate

app = Flask(__name__)

# --- KONFIGURASI PATH ---

# 1. Pastikan folder output sudah ada
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output')

# 2. Path ke file template DOCX (PASTIKAN NAMA FILE DAN EKSTENSI BENAR)
TEMPLATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates', 'usulan_perubahan.docx')

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- KONFIGURASI LIBREOFFICE (WAJIB DIGANTI) ---

# GANTI PATH INI dengan path ABSOLUT ke 'soffice.exe' di komputer Anda!
# Contoh umum: r"C:\Program Files\LibreOffice\program\soffice.exe"
# Contoh alternatif: r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
LIBREOFFICE_PATH = r"C:\Program Files\LibreOffice\program\soffice.exe" # <--- GANTI PATH INI!!!


# --- FUNGSI UTAMA UNTUK KONVERSI DARI DOCX KE PDF ---
def convert_docx_to_pdf(docx_path):
    """
    Mengkonversi file DOCX menjadi PDF menggunakan LibreOffice CLI.
    """
    pdf_path = docx_path.replace(".docx", ".pdf")
    
    try:
        # Perintah subprocess untuk menjalankan LibreOffice
        subprocess.run(
            [
                LIBREOFFICE_PATH, 
                '--headless', # Penting: Mode tanpa antarmuka grafis
                '--convert-to', 'pdf', 
                docx_path, 
                '--outdir', os.path.dirname(pdf_path) # Lokasi output
            ],
            check=True, 
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60 # Batas waktu konversi
        )
        return pdf_path
    
    except subprocess.CalledProcessError as e:
        print(f"!!! GAGAL KONVERSI (LibreOffice Error): Pastikan LibreOffice tertutup. Error detail: {e.stderr.decode()}")
        return None
    except FileNotFoundError:
        print(f"!!! GAGAL KONVERSI: File soffice.exe tidak ditemukan di PATH yang ditentukan: {LIBREOFFICE_PATH}")
        return None


# --- ROUTE: Menampilkan Formulir HTML ---
@app.route('/', methods=['GET'])
def index():
    # Asumsi Anda sudah membuat templates/index.html
    return render_template('index.html')


# --- ROUTE: Memproses Data dan Menghasilkan PDF ---
@app.route('/generate_usulan', methods=['POST'])
def generate_usulan():
    # 1. Ambil Data dari Form Pengguna
    form_data = request.form
    
    # Data ini harus cocok dengan placeholder {{...}} di usulan_perubahan.docx Anda
    data_form = {
        # HEADER DOKUMEN
        'no_dokumen': 'SOP/12/IMS/VII/2021/01',
        'revisi': '01',
        'tgl_efektif': '12 Oktober 2023',

        # DESKRIPSI PERUBAHAN
        'no_usulan': form_data.get('no_usulan', '001/UP/XII/2025'),
        'tanggal': datetime.now().strftime("%d %B %Y"),
        'diminta_oleh': form_data.get('pemohon', 'N/A'),
        'jabatan': form_data.get('jabatan', 'N/A'),
        'deskripsi_perubahan': form_data.get('deskripsi', 'N/A'),
        'tgl_dibutuhkan': form_data.get('tgl_dibutuhkan', datetime.now().strftime("%d-%m-%Y")),
        'alasan_perubahan': form_data.get('alasan', 'N/A'),
        'tanda_tangan_pemohon': '(Tertanda di Sistem)',

        # EVALUASI DAMPAK PERUBAHAN (Placeholder Checkbox)
        # Ganti placeholder di DOCX Anda menjadi format {{is_tipe_hardware}} 
        'is_hardware': '✓' if form_data.get('tipe_perubahan_hardware') else ' ',
        'is_konfigurasi': '✓' if form_data.get('tipe_perubahan_konfigurasi') else ' ',
        'is_software': '✓' if form_data.get('tipe_perubahan_software') else ' ',
        'is_database': '✓' if form_data.get('tipe_perubahan_database') else ' ',
        'is_utilities': '✓' if form_data.get('tipe_perubahan_utilities') else ' ',
        
        # PRIORITAS PERUBAHAN
        'is_normal': '✓' if form_data.get('prioritas') == 'Normal' else ' ',
        'is_emergency': '✓' if form_data.get('prioritas') == 'Emergency' else ' ',
        
        # DAMPAK DAN SUMBER DAYA
        'dampak_produksi': form_data.get('dampak', 'N/A'),
        'upaya_diperlukan': form_data.get('upaya', 'N/A'),
        'kebutuhan_sdm': form_data.get('sdm', '[Contoh: 6 Orang]'),
        'rencana_pengujian': form_data.get('pengujian', 'N/A'),
        
        # CHANGE APPROVAL & IMPLEMENTASI (Data Hardcode/Placeholder)
        'status_diterima': ' ',
        'status_ditolak': ' ',
        'tgl_pelaksanaan': form_data.get('tgl_pelaksanaan', ' '),
        'pic_pelaksana': form_data.get('pic_pelaksana', '[Nama PIC]'),
        'tgl_rilis': form_data.get('tgl_rilis', ' '),
    }

    # 2. Isi Template DOCX dengan Data
    try:
        doc = DocxTemplate(TEMPLATE_FILE)
        doc.render(data_form)
        
        filename_docx = f"Usulan_Perubahan_{data_form['no_usulan'].replace('/', '_')}.docx"
        output_docx_path = os.path.join(OUTPUT_DIR, filename_docx)
        
        doc.save(output_docx_path)
    
    except Exception as e:
        return f"Error saat mengisi template DOCX: {str(e)}. Pastikan file '{TEMPLATE_FILE}' sudah disiapkan dengan placeholder docxtpl yang benar.", 500

    # 3. Konversi DOCX ke PDF
    pdf_path = convert_docx_to_pdf(output_docx_path)

    if pdf_path and os.path.exists(pdf_path):
        # 4. Kirim File PDF ke Pengguna
        return send_file(
            pdf_path,
            as_attachment=True,
            mimetype='application/pdf',
            download_name=pdf_path.split(os.sep)[-1]
        )
    else:
        # Jika pdf_path None, berarti konversi gagal
        return "Gagal menghasilkan file PDF. Cek log server Flask untuk detail error (kemungkinan masalah path LibreOffice/perizinan).", 500


if __name__ == '__main__':
    app.run(debug=True)