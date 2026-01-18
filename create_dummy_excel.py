import pandas as pd
import os
from datetime import datetime, timedelta

# Pastikan folder data ada
os.makedirs('data', exist_ok=True)

# Data dummy untuk proposals
proposals_data = {
    'id': [1, 2, 3, 4, 5],
    'tanggal': ['2024-01-15', '2024-01-18', '2024-01-20', '2024-01-22', '2024-01-25'],
    'nomor_dokumen': ['SOP/12/IMS/VII/2024/01', 'SOP/15/TEK/II/2024/01', 'SOP/08/INF/III/2024/01', 'SOP/22/OPR/V/2024/01', 'SOP/30/SDM/VI/2024/01'],
    'revisi': ['01', '00', '02', '01', '00'],
    'tgl_efektif': ['2024-02-01', '2024-03-01', '2024-02-20', '2024-03-15', '2024-04-01'],
    'diminta_oleh': ['Dr. Budi Santoso', 'Ir. Siti Aisyah', 'Drs. Agus Wijaya', 'Maya Indah Sari', 'Dr. Ahmad Fauzi'],
    'jabatan': ['Kepala Sub Bagian', 'Kepala Seksi Observasi', 'Kepala Bidang Data', 'Koordinator Shift', 'Kepala Balai'],
    'deskripsi_perubahan': [
        'Peningkatan kapasitas server database dari 1TB ke 2TB',
        'Penambahan sensor suhu otomatis di Stasiun Klimatologi Pontianak',
        'Upgrade software processing data gempa dari v2.1 ke v3.0',
        'Perubahan jadwal kalibrasi alat seismograf dari bulanan menjadi mingguan',
        'Penambahan ruang server dengan cooling system redundan'
    ],
    'hasil_dibutuhkan_tgl': ['2024-02-15', '2024-03-10', '2024-02-25', '2024-03-20', '2024-04-15'],
    'alasan_perubahan': [
        'Data meteorologi meningkat 40% dalam 6 bulan terakhir',
        'Sensor manual sering error selama musim hujan',
        'Versi baru memiliki algoritma deteksi lebih akurat',
        'Banyak alat menunjukkan drift yang signifikan',
        'Suhu ruang server sering mencapai 28°C, melebihi standar'
    ],
    'status': ['draft', 'evaluasi', 'approval', 'implementation', 'completed'],
    'created_by': ['budi.santoso', 'siti.aisyah', 'agus.wijaya', 'maya.indah', 'ahmad.fauzi']
}

# Data dummy untuk evaluations
evaluations_data = {
    'id': [1, 2, 3, 4],
    'proposal_id': [2, 3, 4, 5],
    'tipe_perubahan': [
        'Perangkat Keras,Konfigurasi',
        'Software/Aplikasi,Database',
        'Konfigurasi,Utilities',
        'Perangkat Keras,Utilities'
    ],
    'prioritas': ['Emergency', 'Normal', 'Normal', 'Emergency'],
    'dampak_lingkungan': [
        'Memerlukan downtime 2 jam pada sistem monitoring',
        'Perlu migrasi data historis 5 tahun',
        'Tidak ada downtime, hanya perubahan jadwal',
        'Downtime 8 jam untuk instalasi'
    ],
    'upaya_dibutuhkan': [
        'Koordinasi dengan vendor, backup data',
        'Tim migrasi 3 orang, server staging',
        'Pelatihan untuk 5 operator',
        'Koordinasi dengan kontraktor, pemadaman listrik'
    ],
    'sumber_daya': [
        '1 teknisi, 2 unit sensor baru',
        '2 developer, 1 DBA, server test',
        'Dokumentasi, alat kalibrasi',
        '2 teknisi, 3 AC baru, genset'
    ],
    'rencana_pengujian': [
        'Test selama 24 jam non-stop',
        'UAT selama 1 minggu dengan data sample',
        'Monitoring selama 1 bulan',
        'Test cooling system 48 jam'
    ],
    'evaluated_by': ['joko.priyono', 'joko.priyono', 'sri.handayani', 'sri.handayani'],
    'evaluated_at': ['2024-01-19', '2024-01-21', '2024-01-23', '2024-01-26']
}

# Data dummy untuk approvals
approvals_data = {
    'id': [1, 2, 3],
    'proposal_id': [3, 4, 5],
    'status_permintaan': ['Diterima', 'Diterima', 'Diterima'],
    'tanggal_pelaksanaan': ['2024-02-25', '2024-03-20', '2024-04-10'],
    'pic_pelaksana': ['Tim Infrastruktur', 'Tim Operasional', 'Tim Teknik'],
    'catatan': [
        'Prioritas tinggi karena menyangkut keamanan data',
        'Disetujui dengan catatan: laporkan hasil kalibrasi mingguan',
        'Anggaran sudah tersedia di Q2'
    ],
    'approved_by': ['dr.ir.hasanuddin', 'dr.ir.hasanuddin', 'prof.dr.suryono'],
    'approved_at': ['2024-01-22', '2024-01-24', '2024-01-27']
}

# Data dummy untuk implementations
implementations_data = {
    'id': [1, 2],
    'proposal_id': [4, 5],
    'hasil_tahapan': [
        '1. Kalibrasi 10 seismograf selesai\n2. Training operator dilakukan\n3. Dokumentasi update',
        '1. Pemasangan 3 unit AC\n2. Instalasi monitoring system\n3. Test redundancy'
    ],
    'hasil_pengujian': [
        'Semua alat dalam toleransi ±0.1%, operator kompeten',
        'Suhu stabil 22°C, redundancy berjalan baik'
    ],
    'tanggal_rilis': ['2024-03-18', '2024-04-05'],
    'catatan': [
        'Implementasi selesai 2 hari lebih cepat',
        'Konsumsi listrik meningkat 15%'
    ],
    'implemented_by': ['toni.prakoso', 'toni.prakoso'],
    'implemented_at': ['2024-03-18', '2024-04-05']
}

# Data dummy untuk users
users_data = {
    'id': [1, 2, 3, 4, 5, 6, 7, 8],
    'username': ['budi.santoso', 'siti.aisyah', 'joko.priyono', 'sri.handayani', 'dr.ir.hasanuddin', 'prof.dr.suryono', 'toni.prakoso', 'admin.bmkg'],
    'password_hash': ['hashed123'] * 8,  # Password dummy (harus di-hash di production)
    'nama_lengkap': ['Dr. Budi Santoso', 'Ir. Siti Aisyah', 'Joko Priyono, S.T.', 'Sri Handayani, M.T.', 'Dr. Ir. Hasanuddin, M.Si.', 'Prof. Dr. Suryono', 'Toni Prakoso, S.Kom.', 'Administrator System'],
    'jabatan': ['Kepala Sub Bagian', 'Kepala Seksi Observasi', 'Ketua Tim Teknologi', 'Ketua Tim Operasional', 'Kepala Bidang', 'Kepala Balai Besar', 'Koordinator Implementasi', 'Super Admin'],
    'role': ['pegawai', 'pegawai', 'penanggung_jawab', 'penanggung_jawab', 'pemberi_persetujuan', 'pemberi_persetujuan', 'pelaksana', 'admin'],
    'email': ['budi.santoso@bmkg.go.id', 'siti.aisyah@bmkg.go.id', 'joko.priyono@bmkg.go.id', 'sri.handayani@bmkg.go.id', 'hasanuddin@bmkg.go.id', 'suryono@bmkg.go.id', 'toni.prakoso@bmkg.go.id', 'admin@bmkg.go.id'],
    'nip': ['197803121995021001', '198205152000032002', '197512101993031003', '198308182002042004', '196910101989011001', '196504151985031002', '199001152010011005', '000000000000000000'],
    'is_active': [1, 1, 1, 1, 1, 1, 1, 1]
}

# Buat DataFrame
df_proposals = pd.DataFrame(proposals_data)
df_evaluations = pd.DataFrame(evaluations_data)
df_approvals = pd.DataFrame(approvals_data)
df_implementations = pd.DataFrame(implementations_data)
df_users = pd.DataFrame(users_data)

# Simpan ke Excel dengan multiple sheets
with pd.ExcelWriter('data/dataset.xlsx', engine='openpyxl') as writer:
    df_proposals.to_excel(writer, sheet_name='proposals', index=False)
    df_evaluations.to_excel(writer, sheet_name='evaluations', index=False)
    df_approvals.to_excel(writer, sheet_name='approvals', index=False)
    df_implementations.to_excel(writer, sheet_name='implementations', index=False)
    df_users.to_excel(writer, sheet_name='users', index=False)

print("✅ File Excel berhasil dibuat: data/dataset.xlsx")
print(f"📁 Lokasi: {os.path.abspath('data/dataset.xlsx')}")
print("\n📊 Sheet yang tersedia:")
print("1. proposals     - Data usulan perubahan")
print("2. evaluations   - Hasil evaluasi dampak")
print("3. approvals     - Persetujuan perubahan")
print("4. implementations - Hasil implementasi")
print("5. users         - Data pengguna sistem")