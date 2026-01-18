#!/usr/bin/env python3
# create_all_datasets_fixed.py
import os
import csv

os.makedirs('data', exist_ok=True)

# ==================== 1. PROPOSALS CSV ====================
proposals_content = """id,tanggal,nomor_dokumen,revisi,tgl_efektif,diminta_oleh,jabatan,deskripsi_perubahan,hasil_dibutuhkan_tgl,alasan_perubahan,status,created_by,created_at
1,2024-01-15,SOP/12/IMS/VII/2024/01,01,2024-02-01,Dr. Budi Santoso,Kepala Sub Bagian,Peningkatan kapasitas server database dari 1TB ke 2TB,2024-02-15,Data meteorologi meningkat 40% dalam 6 bulan terakhir,draft,budi.santoso,2024-01-15 09:30:00
2,2024-01-18,SOP/15/TEK/II/2024/01,00,2024-03-01,Ir. Siti Aisyah,Kepala Seksi Observasi,Penambahan sensor suhu otomatis di Stasiun Klimatologi Pontianak,2024-03-10,Sensor manual sering error selama musim hujan,evaluasi,siti.aisyah,2024-01-18 14:20:00
3,2024-01-20,SOP/08/INF/III/2024/01,02,2024-02-20,Drs. Agus Wijaya,Kepala Bidang Data,Upgrade software processing data gempa dari v2.1 ke v3.0,2024-02-25,Versi baru memiliki algoritma deteksi lebih akurat,approval,agus.wijaya,2024-01-20 10:15:00
4,2024-01-22,SOP/22/OPR/V/2024/01,01,2024-03-15,Maya Indah Sari,Koordinator Shift,Perubahan jadwal kalibrasi alat seismograf dari bulanan menjadi mingguan,2024-03-20,Banyak alat menunjukkan drift yang signifikan,implementation,maya.indah,2024-01-22 11:45:00
5,2024-01-25,SOP/30/SDM/VI/2024/01,00,2024-04-01,Dr. Ahmad Fauzi,Kepala Balai,Penambahan ruang server dengan cooling system redundan,2024-04-15,Suhu ruang server sering mencapai 28°C melebihi standar,completed,ahmad.fauzi,2024-01-25 16:30:00
6,2024-01-28,SOP/18/LOG/IV/2024/01,00,2024-03-05,Rina Wijaya,Staf Logistik,Pengadaan 5 unit laptop untuk tim lapangan,2024-03-15,Laptop existing sudah berusia >5 tahun dan sering trouble,draft,rina.wijaya,2024-01-28 13:10:00
7,2024-01-30,SOP/25/MON/VIII/2024/01,01,2024-03-25,Dedi Susanto,Analis Data,Implementasi sistem monitoring real-time kualitas udara,2024-04-05,Memenuhi permintaan Kementerian Lingkungan Hidup,evaluasi,dedi.susanto,2024-01-30 09:45:00"""

with open('data/proposals.csv', 'w', encoding='utf-8') as f:
    f.write(proposals_content)

# ==================== 2. EVALUATIONS CSV ====================
evaluations_content = """id,proposal_id,tipe_perubahan,prioritas,dampak_lingkungan,upaya_dibutuhkan,sumber_daya,rencana_pengujian,evaluated_by,evaluated_at
1,2,Perangkat Keras;Konfigurasi,Emergency,Memerlukan downtime 2 jam pada sistem monitoring,Koordinasi dengan vendor backup data,1 teknisi 2 unit sensor baru,Test selama 24 jam non-stop,joko.priyono,2024-01-19 10:30:00
2,3,Software/Aplikasi;Database,Normal,Perlu migrasi data historis 5 tahun,Tim migrasi 3 orang server staging,2 developer 1 DBA server test,UAT selama 1 minggu dengan data sample,joko.priyono,2024-01-21 14:15:00
3,4,Konfigurasi;Utilities,Normal,Tidak ada downtime hanya perubahan jadwal,Pelatihan untuk 5 operator,Dokumentasi alat kalibrasi,Monitoring selama 1 bulan,sri.handayani,2024-01-23 11:20:00
4,5,Perangkat Keras;Utilities,Emergency,Downtime 8 jam untuk instalasi,Koordinasi dengan kontraktor pemadaman listrik,2 teknisi 3 AC baru genset,Test cooling system 48 jam,sri.handayani,2024-01-26 15:40:00
5,7,Software/Aplikasi;Database,Normal,Integrasi dengan sistem existing,Development API konfigurasi server,3 developer 1 sistem analis,Test integrasi 2 minggu,joko.priyono,2024-01-31 13:25:00"""

with open('data/evaluations.csv', 'w', encoding='utf-8') as f:
    f.write(evaluations_content)

# ==================== 3. APPROVALS CSV ====================
approvals_content = """id,proposal_id,status_permintaan,tanggal_pelaksanaan,pic_pelaksana,catatan,approved_by,approved_at
1,3,Diterima,2024-02-25,Tim Infrastruktur,Prioritas tinggi karena menyangkut keamanan data,dr.ir.hasanuddin,2024-01-22 09:15:00
2,4,Diterima,2024-03-20,Tim Operasional,Disetujui dengan catatan: laporkan hasil kalibrasi mingguan,dr.ir.hasanuddin,2024-01-24 14:30:00
3,5,Diterima,2024-04-10,Tim Teknik,Anggaran sudah tersedia di Q2,prof.dr.suryono,2024-01-27 11:45:00
4,7,Diterima,2024-04-01,Tim Development,Sesuai dengan roadmap tahunan,prof.dr.suryono,2024-02-01 10:20:00"""

with open('data/approvals.csv', 'w', encoding='utf-8') as f:
    f.write(approvals_content)

# ==================== 4. IMPLEMENTATIONS CSV ====================
implementations_content = """id,proposal_id,hasil_tahapan,hasil_pengujian,tanggal_rilis,catatan,implemented_by,implemented_at
1,4,1. Kalibrasi 10 seismograf selesai; 2. Training operator dilakukan; 3. Dokumentasi update,Semua alat dalam toleransi ±0.1% operator kompeten,2024-03-18,Implementasi selesai 2 hari lebih cepat,toni.prakoso,2024-03-18 16:20:00
2,5,1. Pemasangan 3 unit AC; 2. Instalasi monitoring system; 3. Test redundancy,Suhu stabil 22°C redundancy berjalan baik,2024-04-05,Konsumsi listrik meningkat 15%,toni.prakoso,2024-04-05 14:10:00"""

with open('data/implementations.csv', 'w', encoding='utf-8') as f:
    f.write(implementations_content)

# ==================== 5. USERS CSV ====================
users_content = """id,username,password_hash,nama_lengkap,jabatan,role,email,nip,is_active,created_at
1,budi.santoso,hashed123,Dr. Budi Santoso,Kepala Sub Bagian,pegawai,budi.santoso@bmkg.go.id,197803121995021001,1,2024-01-01 08:00:00
2,siti.aisyah,hashed123,Ir. Siti Aisyah,Kepala Seksi Observasi,pegawai,siti.aisyah@bmkg.go.id,198205152000032002,1,2024-01-01 08:00:00
3,joko.priyono,hashed123,Joko Priyono S.T.,Ketua Tim Teknologi,penanggung_jawab,joko.priyono@bmkg.go.id,197512101993031003,1,2024-01-01 08:00:00
4,sri.handayani,hashed123,Sri Handayani M.T.,Ketua Tim Operasional,penanggung_jawab,sri.handayani@bmkg.go.id,198308182002042004,1,2024-01-01 08:00:00
5,dr.ir.hasanuddin,hashed123,Dr. Ir. Hasanuddin M.Si.,Kepala Bidang,pemberi_persetujuan,hasanuddin@bmkg.go.id,196910101989011001,1,2024-01-01 08:00:00
6,prof.dr.suryono,hashed123,Prof. Dr. Suryono,Kepala Balai Besar,pemberi_persetujuan,suryono@bmkg.go.id,196504151985031002,1,2024-01-01 08:00:00
7,toni.prakoso,hashed123,Toni Prakoso S.Kom.,Koordinator Implementasi,pelaksana,toni.prakoso@bmkg.go.id,199001152010011005,1,2024-01-01 08:00:00
8,admin.bmkg,hashed123,Administrator System,Super Admin,admin,admin@bmkg.go.id,000000000000000000,1,2024-01-01 08:00:00
9,rina.wijaya,hashed123,Rina Wijaya,Staf Logistik,pegawai,rina.wijaya@bmkg.go.id,199205102015012001,1,2024-01-01 08:00:00
10,dedi.susanto,hashed123,Dedi Susanto,Analis Data,pegawai,dedi.susanto@bmkg.go.id,198811202008011002,1,2024-01-01 08:00:00"""

with open('data/users.csv', 'w', encoding='utf-8') as f:
    f.write(users_content)

print("✅ SEMUA FILE CSV BERHASIL DIBUAT!")
print("\n📁 File yang dibuat:")
print("1. data/proposals.csv")
print("2. data/evaluations.csv")
print("3. data/approvals.csv")
print("4. data/implementations.csv")
print("5. data/users.csv")