-- DROP TABLES IF EXISTS (untuk development)
DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS implementations;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS drafts;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS statistics;
DROP TABLE IF EXISTS users;

-- CREATE TABLES

-- Table: users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('pegawai', 'penanggung_jawab', 'pemberi_persetujuan', 'pelaksana', 'admin')),
    email VARCHAR(100),
    no_hp VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: proposals
CREATE TABLE proposals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tanggal DATE NOT NULL,
    nomor_dokumen VARCHAR(50) UNIQUE,
    revisi VARCHAR(10) DEFAULT '00',
    tgl_efektif DATE,
    diminta_oleh VARCHAR(100) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    deskripsi_perubahan TEXT NOT NULL,
    hasil_dibutuhkan_tgl DATE,
    alasan_perubahan TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'evaluasi', 'approval', 'implementation', 'completed', 'rejected')),
    signature_filename VARCHAR(255),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    draft_name VARCHAR(100),
    draft_notes TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: evaluations
CREATE TABLE evaluations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proposal_id INT UNIQUE NOT NULL,
    tipe_perubahan TEXT,
    prioritas VARCHAR(20) CHECK (prioritas IN ('Normal', 'Emergency')),
    dampak_lingkungan TEXT,
    upaya_dibutuhkan TEXT,
    sumber_daya TEXT,
    rencana_pengujian TEXT,
    catatan_evaluasi TEXT,
    keputusan VARCHAR(20) DEFAULT 'draft' CHECK (keputusan IN ('draft', 'teruskan', 'tolak')),
    evaluated_by INT,
    evaluated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: approvals
CREATE TABLE approvals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proposal_id INT UNIQUE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('disetujui', 'ditolak')),
    catatan_persetujuan TEXT,
    keputusan VARCHAR(20) DEFAULT 'draft' CHECK (keputusan IN ('draft', 'setuju', 'tolak')),
    tanggal_pelaksanaan DATE,
    pic_pelaksana VARCHAR(100),
    approved_by INT,
    approved_at TIMESTAMP NULL,
    tanda_tangan_persetujuan VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: implementations
CREATE TABLE implementations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proposal_id INT UNIQUE NOT NULL,
    hasil_tahapan_perubahan TEXT,
    hasil_pengujian TEXT,
    tanggal_rilis DATE,
    catatan_implementasi TEXT,
    implemented_by INT,
    implemented_at TIMESTAMP NULL,
    tanda_tangan_pic VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (implemented_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: drafts
CREATE TABLE drafts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    data LONGTEXT NOT NULL,
    draft_name VARCHAR(100),
    draft_notes TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admin_audit_log
CREATE TABLE admin_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: statistics
CREATE TABLE statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    periode VARCHAR(10) NOT NULL UNIQUE, -- Format: YYYY-MM
    total_usulan INT DEFAULT 0,
    usulan_draft INT DEFAULT 0,
    usulan_evaluasi INT DEFAULT 0,
    usulan_approval INT DEFAULT 0,
    usulan_implementation INT DEFAULT 0,
    usulan_completed INT DEFAULT 0,
    usulan_ditolak INT DEFAULT 0,
    rata_rata_waktu_hari DECIMAL(10, 2) DEFAULT 0,
    anggaran_total DECIMAL(15, 2) DEFAULT 0,
    pegawai_aktif INT DEFAULT 0,
    pegawai_nonaktif INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_periode (periode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERT DEFAULT DATA
INSERT INTO users (username, password_hash, nama_lengkap, jabatan, role, email, is_active) VALUES
-- Admin (password: admin123)
('admin', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Administrator', 'Admin Sistem', 'admin', 'admin@bmkg.go.id', TRUE),
-- Pegawai (password: password123)
('pegawai1', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Budi Santoso', 'Staff IT', 'pegawai', 'budi@bmkg.go.id', TRUE),
('pegawai2', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Siti Rahayu', 'Analis Data', 'pegawai', 'siti@bmkg.go.id', TRUE),
-- Penanggung Jawab (password: password123)
('penanggung1', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Dr. Ahmad Fauzi', 'Ketua Tim Kerja', 'penanggung_jawab', 'ahmad@bmkg.go.id', TRUE),
-- Pemberi Persetujuan (password: password123)
('pemberi1', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Prof. Surya Dharma', 'Kepala Bidang', 'pemberi_persetujuan', 'surya@bmkg.go.id', TRUE),
-- Pelaksana (password: password123)
('pelaksana1', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Dian Prasetyo', 'Pelaksana Teknis', 'pelaksana', 'dian@bmkg.go.id', TRUE);

-- INSERT SAMPLE PROPOSALS
INSERT INTO proposals (tanggal, nomor_dokumen, revisi, tgl_efektif, diminta_oleh, jabatan, deskripsi_perubahan, hasil_dibutuhkan_tgl, alasan_perubahan, status, created_by) VALUES
('2024-01-15', 'SOP/01/IMS/I/2024/01', '01', '2024-02-01', 'Budi Santoso', 'Staff IT', 'Perubahan konfigurasi server database untuk meningkatkan performa', '2024-01-30', 'Performance server database lambat', 'completed', 2),
('2024-01-20', 'SOP/02/IMS/I/2024/02', '00', '2024-02-15', 'Siti Rahayu', 'Analis Data', 'Penambahan fitur export data ke format Excel', '2024-02-10', 'Permintaan dari user untuk kemudahan analisis', 'approval', 3),
('2024-01-25', 'SOP/03/IMS/I/2024/03', '00', '2024-03-01', 'Budi Santoso', 'Staff IT', 'Upgrade sistem operasi server ke versi terbaru', '2024-02-28', 'Security patch dan bug fixes', 'evaluasi', 2);

-- INSERT SAMPLE EVALUATIONS
INSERT INTO evaluations (proposal_id, tipe_perubahan, prioritas, dampak_lingkungan, upaya_dibutuhkan, sumber_daya, rencana_pengujian, keputusan, evaluated_by, evaluated_at) VALUES
(1, '["Konfigurasi", "Software/Aplikasi"]', 'Normal', 'Tidak ada downtime, perubahan dilakukan di luar jam operasional', 'Tim IT 2 orang, waktu 4 jam', 'Server database, monitoring tools', 'Load testing selama 2 jam setelah perubahan', 'teruskan', 4, '2024-01-16 10:30:00');

-- INSERT SAMPLE APPROVALS
INSERT INTO approvals (proposal_id, status, catatan_persetujuan, keputusan, tanggal_pelaksanaan, pic_pelaksana, approved_by, approved_at) VALUES
(1, 'disetujui', 'Disetujui dengan catatan backup data dilakukan sebelum perubahan', 'setuju', '2024-01-25', 'Dian Prasetyo', 5, '2024-01-17 14:20:00');

-- INSERT SAMPLE IMPLEMENTATIONS
INSERT INTO implementations (proposal_id, hasil_tahapan_perubahan, hasil_pengujian, tanggal_rilis, catatan_implementasi, implemented_by, implemented_at) VALUES
(1, 'Konfigurasi berhasil diubah, monitoring menunjukkan peningkatan performa 30%', 'Load testing berhasil dengan response time membaik', '2024-01-25', 'Implementasi berjalan lancar sesuai rencana', 6, '2024-01-25 22:00:00');

-- INSERT SAMPLE STATISTICS
INSERT INTO statistics (periode, total_usulan, usulan_draft, usulan_evaluasi, usulan_approval, usulan_implementation, usulan_completed, usulan_ditolak, rata_rata_waktu_hari, anggaran_total, pegawai_aktif, pegawai_nonaktif) VALUES
('2024-01', 15, 3, 2, 4, 3, 3, 0, 7.5, 12500000.00, 25, 2);

-- SHOW TABLES STATUS
SHOW TABLES;

-- SHOW TABLE STRUCTURES
DESC users;
DESC proposals;
DESC evaluations;
DESC approvals;
DESC implementations;