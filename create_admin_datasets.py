#!/usr/bin/env python3
# create_admin_datasets_fixed.py
import os
import csv
from datetime import datetime

# Buat folder data jika belum ada
os.makedirs('data', exist_ok=True)

print("🎯 MEMBUAT DATASET LENGKAP UNTUK ADMIN (FIXED)...")

# ==================== 1. ADMIN FULL DATASET ====================
admin_full_data = [
    {
        'id': 1,
        'tanggal': '2024-01-15',
        'nomor_dokumen': 'SOP/12/IMS/VII/2024/01',
        'revisi': '01',
        'tgl_efektif': '2024-02-01',
        'diminta_oleh': 'Dr. Budi Santoso',
        'jabatan': 'Kepala Sub Bagian',
        'deskripsi_perubahan': 'Peningkatan kapasitas server database dari 1TB ke 2TB',
        'hasil_dibutuhkan_tgl': '2024-02-15',
        'alasan_perubahan': 'Data meteorologi meningkat 40% dalam 6 bulan terakhir',
        'status': 'draft',
        'created_by': 'budi.santoso',
        'tipe_perubahan': '',
        'prioritas': '',
        'dampak_lingkungan': '',
        'upaya_dibutuhkan': '',
        'sumber_daya': '',
        'rencana_pengujian': '',
        'evaluated_by': '',
        'status_permintaan': '',
        'tanggal_pelaksanaan': '',
        'pic_pelaksana': '',
        'catatan_approval': '',
        'approved_by': '',
        'hasil_tahapan': '',
        'hasil_pengujian': '',
        'tanggal_rilis': '',
        'catatan_implementasi': '',
        'implemented_by': '',
        'waktu_total_hari': '',
        'anggaran_estimasi': ''
    },
    {
        'id': 2,
        'tanggal': '2024-01-18',
        'nomor_dokumen': 'SOP/15/TEK/II/2024/01',
        'revisi': '00',
        'tgl_efektif': '2024-03-01',
        'diminta_oleh': 'Ir. Siti Aisyah',
        'jabatan': 'Kepala Seksi Observasi',
        'deskripsi_perubahan': 'Penambahan sensor suhu otomatis di Stasiun Klimatologi Pontianak',
        'hasil_dibutuhkan_tgl': '2024-03-10',
        'alasan_perubahan': 'Sensor manual sering error selama musim hujan',
        'status': 'evaluasi',
        'created_by': 'siti.aisyah',
        'tipe_perubahan': 'Perangkat Keras,Konfigurasi',
        'prioritas': 'Emergency',
        'dampak_lingkungan': 'Memerlukan downtime 2 jam pada sistem monitoring',
        'upaya_dibutuhkan': 'Koordinasi dengan vendor, backup data',
        'sumber_daya': '1 teknisi, 2 unit sensor baru',
        'rencana_pengujian': 'Test selama 24 jam non-stop',
        'evaluated_by': 'joko.priyono',
        'status_permintaan': '',
        'tanggal_pelaksanaan': '',
        'pic_pelaksana': '',
        'catatan_approval': '',
        'approved_by': '',
        'hasil_tahapan': '',
        'hasil_pengujian': '',
        'tanggal_rilis': '',
        'catatan_implementasi': '',
        'implemented_by': '',
        'waktu_total_hari': '15',
        'anggaran_estimasi': '125000000'
    },
    {
        'id': 3,
        'tanggal': '2024-01-20',
        'nomor_dokumen': 'SOP/08/INF/III/2024/01',
        'revisi': '02',
        'tgl_efektif': '2024-02-20',
        'diminta_oleh': 'Drs. Agus Wijaya',
        'jabatan': 'Kepala Bidang Data',
        'deskripsi_perubahan': 'Upgrade software processing data gempa dari v2.1 ke v3.0',
        'hasil_dibutuhkan_tgl': '2024-02-25',
        'alasan_perubahan': 'Versi baru memiliki algoritma deteksi lebih akurat',
        'status': 'approval',
        'created_by': 'agus.wijaya',
        'tipe_perubahan': 'Software/Aplikasi,Database',
        'prioritas': 'Normal',
        'dampak_lingkungan': 'Perlu migrasi data historis 5 tahun',
        'upaya_dibutuhkan': 'Tim migrasi 3 orang, server staging',
        'sumber_daya': '2 developer, 1 DBA, server test',
        'rencana_pengujian': 'UAT selama 1 minggu dengan data sample',
        'evaluated_by': 'joko.priyono',
        'status_permintaan': 'Diterima',
        'tanggal_pelaksanaan': '2024-02-25',
        'pic_pelaksana': 'Tim Infrastruktur',
        'catatan_approval': 'Prioritas tinggi karena menyangkut keamanan data',
        'approved_by': 'dr.ir.hasanuddin',
        'hasil_tahapan': '',
        'hasil_pengujian': '',
        'tanggal_rilis': '',
        'catatan_implementasi': '',
        'implemented_by': '',
        'waktu_total_hari': '36',
        'anggaran_estimasi': '75000000'
    },
    {
        'id': 4,
        'tanggal': '2024-01-22',
        'nomor_dokumen': 'SOP/22/OPR/V/2024/01',
        'revisi': '01',
        'tgl_efektif': '2024-03-15',
        'diminta_oleh': 'Maya Indah Sari',
        'jabatan': 'Koordinator Shift',
        'deskripsi_perubahan': 'Perubahan jadwal kalibrasi alat seismograf dari bulanan menjadi mingguan',
        'hasil_dibutuhkan_tgl': '2024-03-20',
        'alasan_perubahan': 'Banyak alat menunjukkan drift yang signifikan',
        'status': 'implementation',
        'created_by': 'maya.indah',
        'tipe_perubahan': 'Konfigurasi,Utilities',
        'prioritas': 'Normal',
        'dampak_lingkungan': 'Tidak ada downtime, hanya perubahan jadwal',
        'upaya_dibutuhkan': 'Pelatihan untuk 5 operator',
        'sumber_daya': 'Dokumentasi, alat kalibrasi',
        'rencana_pengujian': 'Monitoring selama 1 bulan',
        'evaluated_by': 'sri.handayani',
        'status_permintaan': 'Diterima',
        'tanggal_pelaksanaan': '2024-03-20',
        'pic_pelaksana': 'Tim Operasional',
        'catatan_approval': 'Disetujui dengan catatan: laporkan hasil kalibrasi mingguan',
        'approved_by': 'dr.ir.hasanuddin',
        'hasil_tahapan': '1. Kalibrasi 10 seismograf selesai; 2. Training operator dilakukan; 3. Dokumentasi update',
        'hasil_pengujian': 'Semua alat dalam toleransi ±0.1%, operator kompeten',
        'tanggal_rilis': '2024-03-18',
        'catatan_implementasi': 'Implementasi selesai 2 hari lebih cepat',
        'implemented_by': 'toni.prakoso',
        'waktu_total_hari': '55',
        'anggaran_estimasi': '25000000'
    },
    {
        'id': 5,
        'tanggal': '2024-01-25',
        'nomor_dokumen': 'SOP/30/SDM/VI/2024/01',
        'revisi': '00',
        'tgl_efektif': '2024-04-01',
        'diminta_oleh': 'Dr. Ahmad Fauzi',
        'jabatan': 'Kepala Balai',
        'deskripsi_perubahan': 'Penambahan ruang server dengan cooling system redundan',
        'hasil_dibutuhkan_tgl': '2024-04-15',
        'alasan_perubahan': 'Suhu ruang server sering mencapai 28°C, melebihi standar',
        'status': 'completed',
        'created_by': 'ahmad.fauzi',
        'tipe_perubahan': 'Perangkat Keras,Utilities',
        'prioritas': 'Emergency',
        'dampak_lingkungan': 'Downtime 8 jam untuk instalasi',
        'upaya_dibutuhkan': 'Koordinasi dengan kontraktor, pemadaman listrik',
        'sumber_daya': '2 teknisi, 3 AC baru, genset',
        'rencana_pengujian': 'Test cooling system 48 jam',
        'evaluated_by': 'sri.handayani',
        'status_permintaan': 'Diterima',
        'tanggal_pelaksanaan': '2024-04-10',
        'pic_pelaksana': 'Tim Teknik',
        'catatan_approval': 'Anggaran sudah tersedia di Q2',
        'approved_by': 'prof.dr.suryono',
        'hasil_tahapan': '1. Pemasangan 3 unit AC; 2. Instalasi monitoring system; 3. Test redundancy',
        'hasil_pengujian': 'Suhu stabil 22°C, redundancy berjalan baik',
        'tanggal_rilis': '2024-04-05',
        'catatan_implementasi': 'Konsumsi listrik meningkat 15%',
        'implemented_by': 'toni.prakoso',
        'waktu_total_hari': '70',
        'anggaran_estimasi': '350000000'
    },
    {
        'id': 6,
        'tanggal': '2024-01-28',
        'nomor_dokumen': 'SOP/18/LOG/IV/2024/01',
        'revisi': '00',
        'tgl_efektif': '2024-03-05',
        'diminta_oleh': 'Rina Wijaya',
        'jabatan': 'Staf Logistik',
        'deskripsi_perubahan': 'Pengadaan 5 unit laptop untuk tim lapangan',
        'hasil_dibutuhkan_tgl': '2024-03-15',
        'alasan_perubahan': 'Laptop existing sudah berusia >5 tahun dan sering trouble',
        'status': 'draft',
        'created_by': 'rina.wijaya',
        'tipe_perubahan': '',
        'prioritas': '',
        'dampak_lingkungan': '',
        'upaya_dibutuhkan': '',
        'sumber_daya': '',
        'rencana_pengujian': '',
        'evaluated_by': '',
        'status_permintaan': '',
        'tanggal_pelaksanaan': '',
        'pic_pelaksana': '',
        'catatan_approval': '',
        'approved_by': '',
        'hasil_tahapan': '',
        'hasil_pengujian': '',
        'tanggal_rilis': '',
        'catatan_implementasi': '',
        'implemented_by': '',
        'waktu_total_hari': '',
        'anggaran_estimasi': ''
    },
    {
        'id': 7,
        'tanggal': '2024-01-30',
        'nomor_dokumen': 'SOP/25/MON/VIII/2024/01',
        'revisi': '01',
        'tgl_efektif': '2024-03-25',
        'diminta_oleh': 'Dedi Susanto',
        'jabatan': 'Analis Data',
        'deskripsi_perubahan': 'Implementasi sistem monitoring real-time kualitas udara',
        'hasil_dibutuhkan_tgl': '2024-04-05',
        'alasan_perubahan': 'Memenuhi permintaan Kementerian Lingkungan Hidup',
        'status': 'evaluasi',
        'created_by': 'dedi.susanto',
        'tipe_perubahan': 'Software/Aplikasi,Database',
        'prioritas': 'Normal',
        'dampak_lingkungan': 'Integrasi dengan sistem existing',
        'upaya_dibutuhkan': 'Development API, konfigurasi server',
        'sumber_daya': '3 developer, 1 sistem analis',
        'rencana_pengujian': 'Test integrasi 2 minggu',
        'evaluated_by': 'joko.priyono',
        'status_permintaan': '',
        'tanggal_pelaksanaan': '',
        'pic_pelaksana': '',
        'catatan_approval': '',
        'approved_by': '',
        'hasil_tahapan': '',
        'hasil_pengujian': '',
        'tanggal_rilis': '',
        'catatan_implementasi': '',
        'implemented_by': '',
        'waktu_total_hari': '',
        'anggaran_estimasi': ''
    }
]

# Simpan admin_full_dataset.csv dengan quoting untuk CSV
with open('data/admin_full_dataset.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=admin_full_data[0].keys(), quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    for row in admin_full_data:
        # Pastikan semua string yang mengandung koma dikutip
        cleaned_row = {}
        for key, value in row.items():
            if isinstance(value, str) and (',' in value or '"' in value or '\n' in value):
                cleaned_row[key] = value
            else:
                cleaned_row[key] = value
        writer.writerow(cleaned_row)

print("✅ File admin_full_dataset.csv berhasil dibuat (FIXED)")

# ==================== 2. CREATE SIMPLE CSV (Tanpa quoting kompleks) ====================
simple_csv_content = """id,tanggal,nomor_dokumen,revisi,tgl_efektif,diminta_oleh,jabatan,deskripsi_perubahan,hasil_dibutuhkan_tgl,alasan_perubahan,status,created_by,tipe_perubahan,prioritas,dampak_lingkungan,upaya_dibutuhkan,sumber_daya,rencana_pengujian,evaluated_by,status_permintaan,tanggal_pelaksanaan,pic_pelaksana,catatan_approval,approved_by,hasil_tahapan,hasil_pengujian,tanggal_rilis,catatan_implementasi,implemented_by,waktu_total_hari,anggaran_estimasi
1,2024-01-15,SOP/12/IMS/VII/2024/01,01,2024-02-01,Dr. Budi Santoso,Kepala Sub Bagian,"Peningkatan kapasitas server database dari 1TB ke 2TB",2024-02-15,Data meteorologi meningkat 40% dalam 6 bulan terakhir,draft,budi.santoso,,,,,,,,,,,,,,,,,,,
2,2024-01-18,SOP/15/TEK/II/2024/01,00,2024-03-01,Ir. Siti Aisyah,Kepala Seksi Observasi,"Penambahan sensor suhu otomatis di Stasiun Klimatologi Pontianak",2024-03-10,Sensor manual sering error selama musim hujan,evaluasi,siti.aisyah,"Perangkat Keras,Konfigurasi",Emergency,Memerlukan downtime 2 jam pada sistem monitoring,"Koordinasi dengan vendor, backup data","1 teknisi, 2 unit sensor baru",Test selama 24 jam non-stop,joko.priyono,,,,,,,,,,,15,125000000
3,2024-01-20,SOP/08/INF/III/2024/01,02,2024-02-20,Drs. Agus Wijaya,Kepala Bidang Data,"Upgrade software processing data gempa dari v2.1 ke v3.0",2024-02-25,Versi baru memiliki algoritma deteksi lebih akurat,approval,agus.wijaya,"Software/Aplikasi,Database",Normal,Perlu migrasi data historis 5 tahun,"Tim migrasi 3 orang, server staging","2 developer, 1 DBA, server test",UAT selama 1 minggu dengan data sample,joko.priyono,Diterima,2024-02-25,Tim Infrastruktur,Prioritas tinggi karena menyangkut keamanan data,dr.ir.hasanuddin,,,,,,36,75000000
4,2024-01-22,SOP/22/OPR/V/2024/01,01,2024-03-15,Maya Indah Sari,Koordinator Shift,"Perubahan jadwal kalibrasi alat seismograf dari bulanan menjadi mingguan",2024-03-20,Banyak alat menunjukkan drift yang signifikan,implementation,maya.indah,"Konfigurasi,Utilities",Normal,"Tidak ada downtime, hanya perubahan jadwal",Pelatihan untuk 5 operator,"Dokumentasi, alat kalibrasi",Monitoring selama 1 bulan,sri.handayani,Diterima,2024-03-20,Tim Operasional,"Disetujui dengan catatan: laporkan hasil kalibrasi mingguan",dr.ir.hasanuddin,"1. Kalibrasi 10 seismograf selesai; 2. Training operator dilakukan; 3. Dokumentasi update","Semua alat dalam toleransi ±0.1%, operator kompeten",2024-03-18,Implementasi selesai 2 hari lebih cepat,toni.prakoso,55,25000000
5,2024-01-25,SOP/30/SDM/VI/2024/01,00,2024-04-01,Dr. Ahmad Fauzi,Kepala Balai,"Penambahan ruang server dengan cooling system redundan",2024-04-15,Suhu ruang server sering mencapai 28°C melebihi standar,completed,ahmad.fauzi,"Perangkat Keras,Utilities",Emergency,Downtime 8 jam untuk instalasi,"Koordinasi dengan kontraktor, pemadaman listrik","2 teknisi, 3 AC baru, genset",Test cooling system 48 jam,sri.handayani,Diterima,2024-04-10,Tim Teknik,Anggaran sudah tersedia di Q2,prof.dr.suryono,"1. Pemasangan 3 unit AC; 2. Instalasi monitoring system; 3. Test redundancy","Suhu stabil 22°C, redundancy berjalan baik",2024-04-05,Konsumsi listrik meningkat 15%,toni.prakoso,70,350000000
6,2024-01-28,SOP/18/LOG/IV/2024/01,00,2024-03-05,Rina Wijaya,Staf Logistik,Pengadaan 5 unit laptop untuk tim lapangan,2024-03-15,Laptop existing sudah berusia >5 tahun dan sering trouble,draft,rina.wijaya,,,,,,,,,,,,,,,,,,,
7,2024-01-30,SOP/25/MON/VIII/2024/01,01,2024-03-25,Dedi Susanto,Analis Data,Implementasi sistem monitoring real-time kualitas udara,2024-04-05,Memenuhi permintaan Kementerian Lingkungan Hidup,evaluasi,dedi.susanto,Software/Aplikasi,Database,Normal,Integrasi dengan sistem existing,Development API konfigurasi server,3 developer 1 sistem analis,Test integrasi 2 minggu,joko.priyono,,,,,,,,,,,"""

with open('data/admin_full_dataset_simple.csv', 'w', encoding='utf-8') as f:
    f.write(simple_csv_content)

print("✅ File admin_full_dataset_simple.csv berhasil dibuat")

# ==================== 3. STATISTICS DATA ====================
statistics_data = [
    {
        'periode': '2024-01',
        'total_usulan': '7',
        'usulan_draft': '2',
        'usulan_evaluasi': '3',
        'usulan_approval': '2',
        'usulan_implementation': '1',
        'usulan_completed': '1',
        'usulan_ditolak': '0',
        'rata_rata_waktu_hari': '45',
        'anggaran_total': '650000000',
        'pegawai_aktif': '8',
        'pegawai_nonaktif': '0'
    }
]

with open('data/admin_statistics.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=statistics_data[0].keys())
    writer.writeheader()
    writer.writerows(statistics_data)

print("✅ File admin_statistics.csv berhasil dibuat")

# ==================== 4. CREATE ALL SEPARATE FILES ====================
print("\n📁 Membuat file terpisah untuk setiap role...")

# Proposals untuk Pegawai
proposals_data = [
    {
        'id': 1,
        'tanggal': '2024-01-15',
        'nomor_dokumen': 'SOP/12/IMS/VII/2024/01',
        'revisi': '01',
        'tgl_efektif': '2024-02-01',
        'diminta_oleh': 'Dr. Budi Santoso',
        'jabatan': 'Kepala Sub Bagian',
        'deskripsi_perubahan': 'Peningkatan kapasitas server database dari 1TB ke 2TB',
        'hasil_dibutuhkan_tgl': '2024-02-15',
        'alasan_perubahan': 'Data meteorologi meningkat 40% dalam 6 bulan terakhir',
        'status': 'draft',
        'created_by': 'budi.santoso'
    }
]

with open('data/proposals_pegawai.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=proposals_data[0].keys())
    writer.writeheader()
    writer.writerows(proposals_data)

print("✅ File proposals_pegawai.csv berhasil dibuat")

# Evaluations untuk Penanggung Jawab
evaluations_data = [
    {
        'id': 2,
        'proposal_id': 2,
        'tipe_perubahan': 'Perangkat Keras,Konfigurasi',
        'prioritas': 'Emergency',
        'dampak_lingkungan': 'Memerlukan downtime 2 jam pada sistem monitoring',
        'upaya_dibutuhkan': 'Koordinasi dengan vendor, backup data',
        'sumber_daya': '1 teknisi, 2 unit sensor baru',
        'rencana_pengujian': 'Test selama 24 jam non-stop',
        'evaluated_by': 'joko.priyono'
    }
]

with open('data/evaluations_penanggung_jawab.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=evaluations_data[0].keys())
    writer.writeheader()
    writer.writerows(evaluations_data)

print("✅ File evaluations_penanggung_jawab.csv berhasil dibuat")

# Approvals untuk Pemberi Persetujuan
approvals_data = [
    {
        'id': 3,
        'proposal_id': 3,
        'status_permintaan': 'Diterima',
        'tanggal_pelaksanaan': '2024-02-25',
        'pic_pelaksana': 'Tim Infrastruktur',
        'catatan_approval': 'Prioritas tinggi karena menyangkut keamanan data',
        'approved_by': 'dr.ir.hasanuddin'
    }
]

with open('data/approvals_persetujuan.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=approvals_data[0].keys())
    writer.writeheader()
    writer.writerows(approvals_data)

print("✅ File approvals_persetujuan.csv berhasil dibuat")

# Implementations untuk Pelaksana
implementations_data = [
    {
        'id': 4,
        'proposal_id': 4,
        'hasil_tahapan': '1. Kalibrasi 10 seismograf selesai; 2. Training operator dilakukan; 3. Dokumentasi update',
        'hasil_pengujian': 'Semua alat dalam toleransi ±0.1%, operator kompeten',
        'tanggal_rilis': '2024-03-18',
        'catatan_implementasi': 'Implementasi selesai 2 hari lebih cepat',
        'implemented_by': 'toni.prakoso'
    }
]

with open('data/implementations_pelaksana.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=implementations_data[0].keys())
    writer.writeheader()
    writer.writerows(implementations_data)

print("✅ File implementations_pelaksana.csv berhasil dibuat")

print("\n" + "="*60)
print("🎉 SEMUA DATASET BERHASIL DIBUAT & DIPERBAIKI!")
print("="*60)
print("\n📁 File yang tersedia:")
print("1. admin_full_dataset.csv         - Data lengkap untuk admin")
print("2. admin_full_dataset_simple.csv  - Versi simple (fixed)")
print("3. admin_statistics.csv           - Statistik dashboard")
print("4. proposals_pegawai.csv          - Contoh untuk pegawai")
print("5. evaluations_penanggung_jawab.csv - Contoh untuk penanggung jawab")
print("6. approvals_persetujuan.csv      - Contoh untuk pemberi persetujuan")
print("7. implementations_pelaksana.csv  - Contoh untuk pelaksana")
print(f"\n📍 Lokasi: {os.path.abspath('data/')}")