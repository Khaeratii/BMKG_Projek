document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Review page loaded");

  // =============================================================
  // 1. GET DATA FROM MULTIPLE SOURCES - DIPERBAIKI
  // =============================================================
  function getData() {
    console.log("🔍 Searching for data in localStorage...");

    const sources = [
      { key: "laporanPrintData", name: "Print Data" },
      { key: "laporanInsiden", name: "Form Submission" },
      { key: "lastPrintData", name: "Last Print Data" },
      { key: "laporanDraft", name: "Draft Data" },
      { key: "laporanReviewData", name: "Review Data" },
    ];

    let raw = null;
    let source = null;
    let sourceName = null;

    // Priority 1: Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get("data");

    if (encodedData) {
      try {
        raw = decodeURIComponent(encodedData);
        source = "url_parameter";
        sourceName = "URL Parameter";
        console.log("📥 Data found in URL parameters");
      } catch (e) {
        console.error("❌ Failed to decode URL data:", e);
      }
    }

    // Priority 2: Check all localStorage sources
    if (!raw) {
      for (const src of sources) {
        raw = localStorage.getItem(src.key);
        if (raw) {
          source = src.key;
          sourceName = src.name;
          console.log(`✅ Data found in: ${src.name}`);
          break;
        }
      }
    }

    if (!raw) {
      console.log("❌ No data found in any source");
      return { success: false, data: null, source: null };
    }

    console.log(`✅ Data loaded from: ${sourceName} (${source})`);

    try {
      let data;
      const parsed = JSON.parse(raw);

      // Handle different data structures
      if (source === "laporanDraft" || source === "laporanReviewData") {
        data = parsed.data || parsed;
        console.log("📋 Draft/review data parsed successfully");
      } else {
        data = parsed;
      }

      // Debug: Show what we got
      console.log("📊 Data keys:", Object.keys(data));
      console.log("🔍 Signature data check:", {
        ttd_pelapor: data.ttd_pelapor
          ? `✓ (${data.ttd_pelapor.substring(0, 50)}...)`
          : "✗",
        ttd_atasan: data.ttd_atasan
          ? `✓ (${data.ttd_atasan.substring(0, 50)}...)`
          : "✗",
        ttd_smki: data.ttd_smki
          ? `✓ (${data.ttd_smki.substring(0, 50)}...)`
          : "✗",
        ttd_ketua: data.ttd_ketua
          ? `✓ (${data.ttd_ketua.substring(0, 50)}...)`
          : "✗",
        ttd_smki2: data.ttd_smki2
          ? `✓ (${data.ttd_smki2.substring(0, 50)}...)`
          : "✗",
      });

      return {
        success: true,
        data: data,
        source: source,
        sourceName: sourceName,
      };
    } catch (e) {
      console.error("❌ Failed to parse JSON:", e);
      console.error("Raw data (first 500 chars):", raw.substring(0, 500));
      return { success: false, data: null, source: source };
    }
  }

  // =============================================================
  // 2. FORMAT DATE HELPER
  // =============================================================
  function formatDateISOToReadable(d) {
    if (!d || d === "" || d === "-" || d === "undefined") return "-";

    // Jika sudah dalam format readable, kembalikan langsung
    const indonesianMonths = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    for (const month of indonesianMonths) {
      if (d.includes(month)) {
        return d;
      }
    }

    // Coba parse berbagai format
    try {
      // Format YYYY-MM-DD (ISO format)
      if (d.includes("-") && d.length >= 10) {
        const datePart = d.substring(0, 10); // Ambil hanya bagian tanggal
        const parts = datePart.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          const year = parts[0];
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);

          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${day} ${indonesianMonths[month - 1]} ${year}`;
          }
        }
      }

      // Format DD/MM/YYYY
      if (d.includes("/") && d.length >= 10) {
        const datePart = d.substring(0, 10);
        const parts = datePart.split("/");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parts[2];

          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${day} ${indonesianMonths[month - 1]} ${year}`;
          }
        }
      }

      // Format DD-MM-YYYY
      if (d.includes("-") && d.length >= 10) {
        const datePart = d.substring(0, 10);
        const parts = datePart.split("-");
        if (parts.length === 3 && parts[0].length === 2) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parts[2];

          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${day} ${indonesianMonths[month - 1]} ${year}`;
          }
        }
      }

      // Try with Date object
      const dateObj = new Date(d);
      if (!isNaN(dateObj.getTime())) {
        const day = dateObj.getDate();
        const month = dateObj.getMonth();
        const year = dateObj.getFullYear();

        return `${day} ${indonesianMonths[month]} ${year}`;
      }
    } catch (e) {
      console.warn("⚠️ Date parsing failed for:", d);
    }

    // Fallback: return as-is
    return d;
  }

  // =============================================================
  // 3. POPULATE DATA TO PAGE - DIPERBAIKI UNTUK 5 TANDA TANGAN
  // =============================================================
  function populateData(data) {
    console.log("📝 Populating data to page...");
    console.log("📊 Data structure:", Object.keys(data));

    // Helper untuk mengambil data dengan fallback
    function getValue(key, defaultValue = "-") {
      const value = data[key];
      return value !== undefined && value !== null && value !== ""
        ? value.toString().trim()
        : defaultValue;
    }

    // Mapping field names untuk text content
    const fieldMapping = [
      // Dokumen
      { id: "preview_no_dok", value: getValue("no_dok") },
      { id: "preview_no_revisi", value: getValue("no_revisi", "00") },
      {
        id: "preview_tgl_efektif",
        value: formatDateISOToReadable(getValue("tgl_efektif")),
      },

      // Permohonan & Kejadian
      {
        id: "preview_no_permohonan",
        value: getValue("no_permohonan", `INS-${Date.now()}`),
      },
      {
        id: "preview_tanggal_kejadian",
        value: formatDateISOToReadable(getValue("tanggal_kejadian")),
      },
      { id: "preview_nama_pelapor", value: getValue("nama_pelapor") },
      { id: "preview_nama_bidang", value: getValue("nama_bidang") },

      // Deskripsi & Analisa
      {
        id: "preview_deskripsi",
        value: getValue("deskripsi_insiden") || getValue("deskripsi"),
      },
      { id: "preview_jenis_insiden", value: getValue("jenis_insiden") },
      {
        id: "preview_analisa",
        value: getValue("analisa_penyebab") || getValue("analisa"),
      },

      // Tindakan
      {
        id: "preview_tindak",
        value: getValue("tindak_smki") || getValue("tindak_lanjut"),
      },
      { id: "preview_pic", value: getValue("pic_tindak") },
      {
        id: "preview_tindak_pihak",
        value: getValue("tindak_pihak", "Tidak ada"),
      },

      // Status
      { id: "preview_selesai", value: getValue("selesai", "Tidak") },
      {
        id: "preview_tanggal_penyelesaian",
        value: formatDateISOToReadable(getValue("tanggal_penyelesaian")),
      },
    ];

    // Populate text fields
    fieldMapping.forEach(({ id, value }) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value;
        console.log(`✅ ${id}: ${value}`);
      } else {
        console.warn(`⚠️ Element not found: ${id}`);
      }
    });

    // =============================================================
    // 4. POPULATE 5 SIGNATURES - DIPERBAIKI
    // =============================================================
    const signatureTargets = [
      {
        previewId: "preview_ttd_pelapor",
        namaField: "preview_nama_ttd_pelapor",
        ttdData: getValue("ttd_pelapor") || getValue("signatureData1") || "",
        namaValue:
          getValue("nama_ttd_pelapor") || getValue("nama_pelapor") || "",
        required: true,
        label: "PELAPOR",
      },
      {
        previewId: "preview_ttd_atasan",
        namaField: "preview_nama_ttd_atasan",
        ttdData: getValue("ttd_atasan") || getValue("signatureData2") || "",
        namaValue: getValue("nama_ttd_atasan") || "",
        required: false,
        label: "ATASAN",
      },
      {
        previewId: "preview_ttd_smki",
        namaField: "preview_nama_ttd_smki",
        ttdData: getValue("ttd_smki") || getValue("signatureData3") || "",
        namaValue: getValue("nama_ttd_smki") || "",
        required: false,
        label: "SMKI",
      },
      {
        previewId: "preview_ttd_ketua",
        namaField: "preview_nama_ttd_ketua",
        ttdData: getValue("ttd_ketua") || getValue("signatureData4") || "",
        namaValue: getValue("nama_ttd_ketua") || "",
        required: false,
        label: "KETUA",
      },
      {
        previewId: "preview_ttd_smki2",
        namaField: "preview_nama_ttd_smki2",
        ttdData: getValue("ttd_smki2") || getValue("signatureData5") || "",
        namaValue: getValue("nama_ttd_smki2") || "",
        required: false,
        label: "SMKI 2",
      },
    ];

    console.log("🔏 Processing 5 signatures...");

    signatureTargets.forEach(
      ({ previewId, namaField, ttdData, namaValue, required, label }) => {
        const previewEl = document.getElementById(previewId);
        const namaEl = document.getElementById(namaField);

        if (previewEl) {
          // Reset content
          previewEl.innerHTML = "";

          if (ttdData && ttdData.startsWith("data:image")) {
            // Ada signature image
            const img = document.createElement("img");
            img.src = ttdData;
            img.alt = `Tanda Tangan ${label}`;
            img.style.cssText =
              "max-height: 60px; max-width: 200px; display: block; margin: 0 auto; border: 1px solid #ddd; background: white;";
            img.onerror = function () {
              this.style.display = "none";
              previewEl.innerHTML = `<div style="text-align: center; color: #999; font-style: italic;">Gambar tanda tangan gagal dimuat</div>`;
            };

            previewEl.appendChild(img);
            console.log(`✅ ${previewId}: Signature image loaded for ${label}`);
          } else if (
            namaValue &&
            namaValue.trim() !== "" &&
            namaValue !== "-"
          ) {
            // Hanya nama (manual signing)
            previewEl.innerHTML = `
            <div style="text-align: center; padding: 15px 0; border-bottom: 2px solid #666; min-height: 60px; display: flex; align-items: center; justify-content: center;">
              <div>
                <strong style="font-size: 14px;">${namaValue}</strong><br>
                <small style="color: #666;"><em>(${label}${
              required ? " - WAJIB" : " - OPSIONAL"
            })</em></small>
              </div>
            </div>
          `;
            console.log(
              `ℹ️ ${previewId}: Manual signature for ${label} (${namaValue})`
            );
          } else {
            // Tidak ada tanda tangan
            previewEl.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #999; font-style: italic; border: 1px dashed #ccc; background: #f9f9f9; border-radius: 4px;">
              <i class="fas fa-signature" style="font-size: 24px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
              ${required ? "TANDA TANGAN WAJIB" : "Tanda tangan tidak tersedia"}
              <br><small>${label}</small>
            </div>
          `;
            console.log(
              `${
                required ? "⚠️" : "ℹ️"
              } ${previewId}: No signature for ${label}`
            );
          }
        }

        if (namaEl) {
          namaEl.textContent = namaValue.trim() !== "" ? namaValue : "-";
        }
      }
    );

    // Update jumlah tanda tangan yang tersedia
    updateSignatureStats(signatureTargets);

    console.log("✅ Data population complete");
  }

  // Helper untuk statistik tanda tangan
  function updateSignatureStats(signatureTargets) {
    const totalSignatures = signatureTargets.length;
    const availableSignatures = signatureTargets.filter(
      (sig) =>
        (sig.ttdData && sig.ttdData.startsWith("data:image")) ||
        (sig.namaValue && sig.namaValue.trim() !== "" && sig.namaValue !== "-")
    ).length;

    console.log(
      `📊 Signature stats: ${availableSignatures}/${totalSignatures} available`
    );

    // Update UI jika ada elemen untuk statistik
    const statsEl = document.getElementById("signatureStats");
    if (statsEl) {
      statsEl.textContent = `${availableSignatures} dari ${totalSignatures} tanda tangan tersedia`;

      if (availableSignatures === totalSignatures) {
        statsEl.style.color = "#28a745";
        statsEl.innerHTML += ' <i class="fas fa-check-circle"></i>';
      } else if (availableSignatures >= 1) {
        statsEl.style.color = "#ffc107";
      } else {
        statsEl.style.color = "#dc3545";
      }
    }
  }

  // =============================================================
  // 5. DOWNLOAD PDF FUNCTION - DIPERBAIKI
  // =============================================================
  function setupPDFDownload() {
    const downloadBtn = document.getElementById("download-pdf");
    const printBtn = document.getElementById("print-direct");
    const printReviewBtn = document.getElementById("print-review-btn");

    if (downloadBtn) {
      downloadBtn.addEventListener("click", async () => {
        console.log("📥 Download PDF clicked");
        await generatePDF(false);
      });
    }

    if (printBtn) {
      printBtn.addEventListener("click", async () => {
        console.log("🖨️ Direct Print clicked");
        await generatePDF(true);
      });
    }

    if (printReviewBtn) {
      printReviewBtn.addEventListener("click", async () => {
        console.log("🖨️ Print Review clicked");
        await generatePDF(true);
      });
    }
  }

  // =============================================================
  // 6. GENERATE PDF - DIPERBAIKI DENGAN TANDA TANGAN
  // =============================================================
  async function generatePDF(shouldPrint = false) {
    console.log("🔄 Generating PDF...");

    const dataResult = getData();
    if (!dataResult.success || !dataResult.data) {
      alert("❌ Data tidak ditemukan untuk membuat PDF");
      return;
    }

    const data = dataResult.data;

    // Debug: Show what data we have
    console.log("📋 Source data for PDF:", {
      source: dataResult.sourceName,
      has_ttd_pelapor: !!data.ttd_pelapor,
      has_ttd_atasan: !!data.ttd_atasan,
      has_ttd_smki: !!data.ttd_smki,
      has_ttd_ketua: !!data.ttd_ketua,
      has_ttd_smki2: !!data.ttd_smki2,
    });

    // Show loading overlay
    const loadingOverlay = document.createElement("div");
    loadingOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); color: white; z-index: 9999;
      display: flex; justify-content: center; align-items: center;
      flex-direction: column; font-size: 1.2rem; font-family: Arial, sans-serif;
    `;
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <i class="fas fa-spinner fa-spin fa-3x" style="margin-bottom: 20px;"></i>
        <p style="margin: 10px 0; font-weight: bold;">${
          shouldPrint ? "Mempersiapkan cetakan..." : "Membuat PDF..."
        }</p>
        <p style="margin: 5px 0; font-size: 0.9rem; opacity: 0.8;">
          Harap tunggu, proses mungkin memakan waktu beberapa detik...
        </p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);

    try {
      // Prepare data for PDF - INI PERBAIKAN UTAMA!
      const pdfData = preparePDFData(data);

      // Debug: Verify signature data is included
      console.log("✅ PDF Data prepared (with signatures):", {
        fieldCount: Object.keys(pdfData).length,
        signaturesIncluded: {
          ttd_pelapor: pdfData.ttd_pelapor ? "✓" : "✗",
          ttd_atasan: pdfData.ttd_atasan ? "✓" : "✗",
          ttd_smki: pdfData.ttd_smki ? "✓" : "✗",
          ttd_ketua: pdfData.ttd_ketua ? "✓" : "✗",
          ttd_smki2: pdfData.ttd_smki2 ? "✓" : "✗",
        },
      });

      // Encode data for URL
      const encodedData = encodeURIComponent(JSON.stringify(pdfData));
      console.log("🔗 Encoded data length:", encodedData.length);

      // Save to localStorage for backup
      localStorage.setItem("lastPrintData", JSON.stringify(pdfData));
      console.log("💾 Backup saved to localStorage: lastPrintData");

      // Open print page
      const printUrl = `/laporan-insiden/print?data=${encodedData}&auto_print=${
        shouldPrint ? "1" : "0"
      }&source=review_page`;

      if (shouldPrint) {
        console.log("🖨️ Opening print page for direct print...");
        const printWindow = window.open(
          printUrl,
          "_blank",
          "width=800,height=600"
        );
        if (!printWindow) {
          alert("⚠️ Popup diblokir! Silakan izinkan popup untuk situs ini.");
          window.location.href = printUrl;
        }
      } else {
        console.log("📥 Opening print page for PDF download...");
        window.open(printUrl, "_blank", "width=800,height=600");
      }
    } catch (error) {
      console.error("❌ PDF generation failed:", error);
      alert(
        `❌ Gagal membuat PDF: ${error.message}\n\nSilakan coba lagi atau hubungi administrator.`
      );
    } finally {
      // Remove loading overlay after delay
      setTimeout(() => {
        if (loadingOverlay.parentNode) {
          document.body.removeChild(loadingOverlay);
        }
      }, 1000);
    }
  }

  // =============================================================
  // FIX: FUNGSI preparePDFData() - INI PERBAIKAN PENTING
  // =============================================================
  function preparePDFData(data) {
    console.log("📋 Preparing PDF data (with signatures)...");

    // Helper function untuk ambil data
    function getValue(key, defaultValue = "") {
      const value = data[key];
      return value !== undefined && value !== null && value !== ""
        ? value
        : defaultValue;
    }

    // Format tanggal untuk PDF
    function formatDateForPDF(dateStr) {
      if (!dateStr || dateStr === "" || dateStr === "-") return "";

      try {
        // Coba berbagai format
        const formats = [
          { regex: /^\d{4}-\d{2}-\d{2}$/, parse: (d) => d.split("-") }, // YYYY-MM-DD
          {
            regex: /^\d{2}\/\d{2}\/\d{4}$/,
            parse: (d) => d.split("/").reverse().join("-").split("-"),
          }, // DD/MM/YYYY
          {
            regex: /^\d{2}-\d{2}-\d{4}$/,
            parse: (d) => d.split("-").reverse().join("-").split("-"),
          }, // DD-MM-YYYY
        ];

        for (const format of formats) {
          if (format.regex.test(dateStr)) {
            const parts = format.parse(dateStr);
            if (parts.length === 3) {
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const day = parseInt(parts[2]);

              const months = [
                "Januari",
                "Februari",
                "Maret",
                "April",
                "Mei",
                "Juni",
                "Juli",
                "Agustus",
                "September",
                "Oktober",
                "November",
                "Desember",
              ];

              if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
                return `${day} ${months[month]} ${year}`;
              }
            }
          }
        }

        // Fallback ke Date object
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          const day = dateObj.getDate();
          const month = dateObj.getMonth();
          const year = dateObj.getFullYear();
          const months = [
            "Januari",
            "Februari",
            "Maret",
            "April",
            "Mei",
            "Juni",
            "Juli",
            "Agustus",
            "September",
            "Oktober",
            "November",
            "Desember",
          ];
          return `${day} ${months[month]} ${year}`;
        }
      } catch (e) {
        console.warn("⚠️ Date formatting failed:", e);
      }

      return dateStr;
    }

    // PERBAIKAN UTAMA: Masukkan SEMUA data tanda tangan!
    const pdfData = {
      // ========== DOKUMEN ==========
      no_dok: getValue("no_dok"),
      no_revisi: getValue("no_revisi", "00"),
      tgl_efektif: formatDateForPDF(getValue("tgl_efektif")),
      tgl_efektif_formatted: formatDateForPDF(getValue("tgl_efektif")),

      // ========== PERMOHONAN ==========
      no_permohonan: getValue("no_permohonan", `INS-${Date.now()}`),

      // ========== KEJADIAN ==========
      tanggal_kejadian: getValue("tanggal_kejadian"),
      tanggal_kejadian_formatted: formatDateForPDF(
        getValue("tanggal_kejadian")
      ),
      nama_pelapor: getValue("nama_pelapor"),
      nama_bidang: getValue("nama_bidang"),

      // ========== DESKRIPSI ==========
      deskripsi_insiden:
        getValue("deskripsi_insiden") || getValue("deskripsi", ""),
      jenis_insiden: getValue("jenis_insiden"),
      analisa_penyebab: getValue("analisa_penyebab") || getValue("analisa", ""),

      // ========== TINDAKAN ==========
      tindak_smki: getValue("tindak_smki") || getValue("tindak_lanjut", ""),
      pic_tindak: getValue("pic_tindak"),
      tindak_pihak: getValue("tindak_pihak", "Tidak ada"),

      // ========== STATUS ==========
      selesai: getValue("selesai", "Tidak"),
      tanggal_penyelesaian: getValue("tanggal_penyelesaian"),
      tanggal_penyelesaian_formatted: formatDateForPDF(
        getValue("tanggal_penyelesaian")
      ),

      // ========== PERBAIKAN: 5 TANDA TANGAN (INCLUDE SEMUA) ==========
      ttd_pelapor: getValue("ttd_pelapor") || getValue("signatureData1") || "",
      ttd_atasan: getValue("ttd_atasan") || getValue("signatureData2") || "",
      ttd_smki: getValue("ttd_smki") || getValue("signatureData3") || "",
      ttd_ketua: getValue("ttd_ketua") || getValue("signatureData4") || "",
      ttd_smki2: getValue("ttd_smki2") || getValue("signatureData5") || "",

      // ========== 5 NAMA PENANDATANGAN ==========
      nama_ttd_pelapor:
        getValue("nama_ttd_pelapor") || getValue("nama_pelapor") || "",
      nama_ttd_atasan: getValue("nama_ttd_atasan") || "",
      nama_ttd_smki: getValue("nama_ttd_smki") || "",
      nama_ttd_ketua: getValue("nama_ttd_ketua") || "",
      nama_ttd_smki2: getValue("nama_ttd_smki2") || "",

      // ========== METADATA ==========
      pdf_generated_at: new Date().toISOString(),
      pdf_source: "review_page",
      form_version: "1.0",

      // Debug info
      _debug: {
        has_signature_data: {
          pelapor: !!(getValue("ttd_pelapor") || getValue("signatureData1")),
          atasan: !!(getValue("ttd_atasan") || getValue("signatureData2")),
          smki: !!(getValue("ttd_smki") || getValue("signatureData3")),
          ketua: !!(getValue("ttd_ketua") || getValue("signatureData4")),
          smki2: !!(getValue("ttd_smki2") || getValue("signatureData5")),
        },
        signature_lengths: {
          ttd_pelapor: (
            getValue("ttd_pelapor") ||
            getValue("signatureData1") ||
            ""
          ).length,
          ttd_atasan: (
            getValue("ttd_atasan") ||
            getValue("signatureData2") ||
            ""
          ).length,
        },
      },
    };

    console.log("✅ PDF Data prepared with signatures");
    return pdfData;
  }

  // =============================================================
  // 7. EDIT BUTTON HANDLER
  // =============================================================
  function setupEditButton() {
    const editBtn = document.getElementById("edit-form");
    if (!editBtn) {
      console.warn("⚠️ Edit button not found");
      return;
    }

    editBtn.addEventListener("click", () => {
      if (!confirm("Kembali ke form untuk mengedit data?")) return;

      // Get current data
      const dataResult = getData();
      if (dataResult.success) {
        // Save as draft
        localStorage.setItem(
          "laporanDraft",
          JSON.stringify({
            data: dataResult.data,
            currentStep: 2, // Kembali ke step 2 (tanda tangan)
            savedAt: new Date().toISOString(),
            draftName: `Draft dari Review - ${
              dataResult.data.no_dok || "Tanpa Nomor"
            }`,
            notes: "Data dikembalikan dari halaman review untuk diedit",
          })
        );

        console.log("💾 Draft saved for editing");
      }

      // Redirect to form
      window.location.href = "/laporan-insiden";
    });
  }

  // =============================================================
  // 8. SAVE DRAFT BUTTON
  // =============================================================
  function setupSaveDraftButton() {
    const saveDraftBtn = document.getElementById("save-draft");
    if (!saveDraftBtn) return;

    saveDraftBtn.addEventListener("click", () => {
      const dataResult = getData();
      if (!dataResult.success) {
        alert("❌ Tidak ada data untuk disimpan sebagai draft");
        return;
      }

      // Create draft name
      const draftName = `Draft Laporan ${
        dataResult.data.no_dok || "Tanpa Nomor"
      } - ${new Date().toLocaleString()}`;

      // Save as draft
      localStorage.setItem(
        "laporanDraft",
        JSON.stringify({
          data: dataResult.data,
          currentStep: 3, // Review step
          savedAt: new Date().toISOString(),
          draftName: draftName,
          source: "review_page",
        })
      );

      alert(`✅ Draft berhasil disimpan!\n\nNama: ${draftName}`);

      // Update UI
      saveDraftBtn.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
      saveDraftBtn.disabled = true;
      setTimeout(() => {
        saveDraftBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Draft';
        saveDraftBtn.disabled = false;
      }, 3000);
    });
  }

  // =============================================================
  // 9. CLEAR DATA BUTTON
  // =============================================================
  function setupClearButton() {
    const clearBtn = document.getElementById("clear-data");
    if (!clearBtn) return;

    clearBtn.addEventListener("click", () => {
      if (
        !confirm(
          "Hapus semua data yang tersimpan? Tindakan ini tidak dapat dibatalkan."
        )
      ) {
        return;
      }

      // Clear all related localStorage items
      const keysToClear = [
        "laporanPrintData",
        "laporanInsiden",
        "lastPrintData",
        "laporanDraft",
        "laporanReviewData",
        "printDataBackup",
      ];

      let clearedCount = 0;
      keysToClear.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      });

      alert(
        `✅ ${clearedCount} item data berhasil dihapus.\n\nHalaman akan direfresh.`
      );

      // Redirect to form
      setTimeout(() => {
        window.location.href = "/laporan-insiden";
      }, 1000);
    });
  }

  // =============================================================
  // 10. DEBUG BUTTON
  // =============================================================
  function setupDebugButton() {
    const debugBtn = document.getElementById("debug-data");
    if (!debugBtn) return;

    debugBtn.addEventListener("click", () => {
      console.log("🔍 === DEBUG INFORMATION ===");

      const dataResult = getData();
      console.log("Data result:", dataResult);

      if (dataResult.success) {
        console.log("📊 Full data structure:", dataResult.data);
        console.log("🔏 Signature details:", {
          ttd_pelapor: dataResult.data.ttd_pelapor
            ? `Present (starts with: ${dataResult.data.ttd_pelapor.substring(
                0,
                30
              )}...)`
            : "Missing",
          ttd_pelapor_length: dataResult.data.ttd_pelapor?.length || 0,
          ttd_pelapor_is_base64:
            dataResult.data.ttd_pelapor?.startsWith?.("data:image") || false,
        });

        alert(
          `✅ Debug info logged to console.\n\nSource: ${
            dataResult.sourceName
          }\nFields: ${
            Object.keys(dataResult.data).length
          }\nCheck browser console (F12) for details.`
        );
      } else {
        alert("❌ No data available for debugging.");
      }
    });
  }

  // =============================================================
  // 11. INITIALIZATION - DIPERBAIKI
  // =============================================================
  function init() {
    console.log("🚀 Initializing review page...");

    // Get data
    const dataResult = getData();

    if (!dataResult.success || !dataResult.data) {
      console.error("❌ No valid data found");

      // Show error message
      const errorContainer =
        document.getElementById("review-content") || document.body;
      if (errorContainer) {
        errorContainer.innerHTML = `
          <div style="text-align: center; padding: 40px; background: #f8d7da; border-radius: 8px; margin: 20px;">
            <i class="fas fa-exclamation-triangle fa-3x" style="color: #721c24; margin-bottom: 20px;"></i>
            <h2 style="color: #721c24;">Data Tidak Ditemukan</h2>
            <p style="color: #721c24; margin-bottom: 20px;">
              Tidak dapat menemukan data laporan untuk ditampilkan.
            </p>
            <div style="margin-top: 20px;">
              <button onclick="window.location.href='/laporan-insiden'" 
                      style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">
                <i class="fas fa-arrow-left"></i> Kembali ke Form
              </button>
              <button onclick="location.reload()" 
                      style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-redo"></i> Muat Ulang Halaman
              </button>
            </div>
          </div>
        `;
      }

      return;
    }

    console.log(`✅ Data loaded from: ${dataResult.sourceName}`);
    console.log("📊 Data summary:", {
      fields: Object.keys(dataResult.data).length,
      hasSignatures: {
        ttd_pelapor: !!dataResult.data.ttd_pelapor,
        ttd_atasan: !!dataResult.data.ttd_atasan,
        ttd_smki: !!dataResult.data.ttd_smki,
        ttd_ketua: !!dataResult.data.ttd_ketua,
        ttd_smki2: !!dataResult.data.ttd_smki2,
      },
    });

    // Populate data
    try {
      populateData(dataResult.data);
    } catch (error) {
      console.error("❌ Error populating data:", error);
      alert(
        "Terjadi kesalahan saat menampilkan data. Silakan refresh halaman."
      );
      return;
    }

    // Setup all buttons
    setupPDFDownload();
    setupEditButton();
    setupSaveDraftButton();
    setupClearButton();
    setupDebugButton();

    // Auto-print if requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auto_print") === "1") {
      console.log("🖨️ Auto-print requested");
      setTimeout(() => {
        window.print();
      }, 1500);
    }

    console.log("✅ Review page initialized successfully");
  }

  // =============================================================
  // 12. START EVERYTHING
  // =============================================================
  init();
});
