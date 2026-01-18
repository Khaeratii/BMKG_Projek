// ===============================
// FORM MULTI-STEP JS (DIPERBAIKI)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Form Laporan Insiden Multi-Step Loaded");

  // ===============================
  // 1. STATE MANAGEMENT
  // ===============================
  const state = {
    currentStep: 1,
    totalSteps: 3,
  };

  // ===============================
  // 2. INITIALIZE FORM
  // ===============================
  function initializeForm() {
    console.log("📝 Initializing form...");

    // Load draft jika ada
    loadDraft();

    // Setup navigation
    setupNavigation();

    // Setup validation
    setupValidation();

    // Show first step
    showStep(1);

    console.log("✅ Form initialized");
  }

  function loadDraft() {
    try {
      const draftData = localStorage.getItem("laporanDraft");
      if (!draftData) {
        console.log("📭 No draft found");
        return;
      }

      console.log("📂 Loading draft from localStorage...");
      const draft = JSON.parse(draftData);

      if (!draft.data) return;

      // Populate form fields
      Object.keys(draft.data).forEach((key) => {
        const element = document.getElementById(key);
        if (element && draft.data[key]) {
          if (element.type === "radio") {
            // Handle radio buttons
            const radio = document.querySelector(
              `[name="${element.name}"][value="${draft.data[key]}"]`
            );
            if (radio) radio.checked = true;
          } else {
            element.value = draft.data[key];
          }
        }
      });

      // Restore signature jika ada
      if (draft.data.ttd_pelapor) {
        document.getElementById("signatureData1").value =
          draft.data.ttd_pelapor;
      }

      if (draft.data.ttd_atasan) {
        document.getElementById("signatureData2").value = draft.data.ttd_atasan;
      }

      // Restore step jika ada
      if (draft.currentStep && draft.currentStep > 1) {
        setTimeout(() => {
          navigateToStep(draft.currentStep);
        }, 500);
      }

      console.log("✅ Draft loaded successfully");
    } catch (error) {
      console.error("❌ Error loading draft:", error);
      localStorage.removeItem("laporanDraft");
    }
  }

  // ===============================
  // 3. STEP NAVIGATION (DIPERBAIKI)
  // ===============================
  function setupNavigation() {
    // Next buttons
    document
      .querySelectorAll('.btn-next[data-action="next"]')
      .forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          console.log("👉 Next button clicked - Step:", state.currentStep);

          if (state.currentStep === 1) {
            // Step 1 → Step 2
            if (validateStep1()) {
              navigateToStep(2);
            } else {
              alert("Harap lengkapi semua data insiden!");
            }
          } else if (state.currentStep === 2) {
            // Step 2 → Step 3
            if (validateStep2()) {
              console.log("✅ Validation passed, saving data for review...");

              // Simpan data ke localStorage sebelum review
              if (saveDataBeforeReview()) {
                navigateToStep(3);
              } else {
                alert("Gagal menyimpan data untuk review. Silakan coba lagi.");
              }
            } else {
              alert(
                "Harap lengkapi semua data yang diperlukan di Tindakan & TTD!"
              );
            }
          }
        });
      });

    // Prev buttons
    document
      .querySelectorAll('.btn-prev[data-action="prev"]')
      .forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          console.log("👈 Prev button clicked");

          const prevStep = Math.max(state.currentStep - 1, 1);
          navigateToStep(prevStep);
        });
      });

    // Progress steps click
    document.querySelectorAll(".step").forEach((step) => {
      step.addEventListener("click", function () {
        const stepNumber = parseInt(this.dataset.step);
        console.log(`📊 Progress step clicked: ${stepNumber}`);
        if (stepNumber <= state.currentStep) {
          navigateToStep(stepNumber);
        }
      });
    });
  }

  // ===============================
  // SAVE DATA BEFORE REVIEW (FUNGSI BARU)
  // ===============================
  function saveDataBeforeReview() {
    console.log("💾 Saving data before review...");

    try {
      const formData = collectFormData();

      // Simpan ke multiple places untuk redundancy
      localStorage.setItem(
        "laporanReviewData",
        JSON.stringify({
          data: formData,
          timestamp: new Date().toISOString(),
          step: 3,
          source: "form_03_js",
        })
      );

      localStorage.setItem("laporanReviewBackup", JSON.stringify(formData));

      sessionStorage.setItem("formDataCurrent", JSON.stringify(formData));

      console.log("✅ Data saved for review:", {
        keys: Object.keys(formData).length,
        ttd_count: Object.keys(formData).filter((k) => k.startsWith("ttd_"))
          .length,
      });

      return true;
    } catch (error) {
      console.error("❌ Failed to save data before review:", error);
      return false;
    }
  }

  function navigateToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > state.totalSteps) return;

    console.log(`🔄 Navigating to step ${stepNumber}`);

    // Update UI
    showStep(stepNumber);

    // Update state
    state.currentStep = stepNumber;

    // Update progress bar
    updateProgressSteps(stepNumber);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Generate review jika step 3
    if (stepNumber === 3) {
      console.log("🔄 Step 3 detected, calling generateReview()");
      setTimeout(generateReview, 500);
    }
  }

  function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll(".form-section").forEach((section) => {
      section.classList.remove("active");
    });

    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
      targetStep.classList.add("active");
    }
  }

  function updateProgressSteps(activeStep) {
    document.querySelectorAll(".step").forEach((step) => {
      const stepNumber = parseInt(step.dataset.step);
      step.classList.remove("active", "completed");

      if (stepNumber === activeStep) {
        step.classList.add("active");
      } else if (stepNumber < activeStep) {
        step.classList.add("completed");
      }
    });
  }

  // ===============================
  // 4. VALIDATION (DIPERBAIKI UNTUK 5 TTD)
  // ===============================
  function setupValidation() {
    // Toggle tanggal penyelesaian based on radio
    const selesaiRadios = document.querySelectorAll('input[name="selesai"]');
    selesaiRadios.forEach((radio) => {
      radio.addEventListener("change", function () {
        const tanggalGroup = document.getElementById(
          "tanggalPenyelesaianGroup"
        );
        if (tanggalGroup) {
          tanggalGroup.style.display = this.value === "Ya" ? "block" : "none";
        }
      });
    });

    // Set initial state
    const tanggalGroup = document.getElementById("tanggalPenyelesaianGroup");
    if (tanggalGroup) {
      const checkedRadio = document.querySelector(
        'input[name="selesai"]:checked'
      );
      tanggalGroup.style.display =
        checkedRadio && checkedRadio.value === "Ya" ? "block" : "none";
    }

    // Clear errors on input
    document.querySelectorAll("input, textarea, select").forEach((field) => {
      field.addEventListener("input", function () {
        this.classList.remove("error");
      });
    });
  }

  function validateCurrentStep() {
    if (state.currentStep === 1) return validateStep1();
    if (state.currentStep === 2) return validateStep2();
    return true; // Step 3 always valid
  }

  function validateStep1() {
    console.log("🔍 Validating Step 1...");

    const requiredFields = [
      { id: "no_dok", name: "Nomor Dokumen" },
      { id: "tgl_efektif", name: "Tanggal Efektif" },
      { id: "tanggal_kejadian", name: "Tanggal Kejadian" },
      { id: "nama_pelapor", name: "Nama Pelapor" },
      { id: "nama_bidang", name: "Nama Bidang" },
      { id: "deskripsi_insiden", name: "Deskripsi Insiden" },
      { id: "jenis_insiden", name: "Jenis Insiden" },
      { id: "analisa_penyebab", name: "Analisa Penyebab" },
    ];

    let isValid = true;
    let firstErrorField = null;

    for (const field of requiredFields) {
      const element = document.getElementById(field.id);
      if (!element) continue;

      let value = "";
      if (element.type === "select-one") {
        value = element.value;
      } else {
        value = element.value ? element.value.trim() : "";
      }

      if (!value) {
        console.log(`❌ ${field.name} is empty`);
        element.classList.add("error");
        isValid = false;

        if (!firstErrorField) {
          firstErrorField = element;
        }
      } else {
        element.classList.remove("error");
      }
    }

    // Scroll ke error pertama jika ada
    if (firstErrorField) {
      setTimeout(() => {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
        firstErrorField.focus();
      }, 100);
    }

    console.log(`✅ Step 1 validation: ${isValid ? "PASSED" : "FAILED"}`);
    return isValid;
  }

  function validateStep2() {
    console.log("🔍 Validating Step 2 (5 signatures)...");

    const requiredFields = [
      { id: "tindak_smki", name: "Tindak Lanjut SMKI" },
      { id: "pic_tindak", name: "PIC Tindak Lanjut" },
    ];

    // Definisi 5 tanda tangan
    const signatureFields = [
      {
        signatureId: "signatureData1",
        nameId: "nama_ttd_pelapor",
        label: "Pelapor",
        required: true,
      },
      {
        signatureId: "signatureData2",
        nameId: "nama_ttd_atasan",
        label: "Atasan",
        required: false,
      },
      {
        signatureId: "signatureData3",
        nameId: "nama_ttd_smki",
        label: "SMKI",
        required: false,
      },
      {
        signatureId: "signatureData4",
        nameId: "nama_ttd_ketua",
        label: "Ketua",
        required: false,
      },
      {
        signatureId: "signatureData5",
        nameId: "nama_ttd_smki2",
        label: "SMKI 2",
        required: false,
      },
    ];

    let isValid = true;
    let firstErrorField = null;

    // Validasi field wajib
    for (const field of requiredFields) {
      const element = document.getElementById(field.id);
      if (!element) continue;

      const value = element.value ? element.value.trim() : "";
      if (!value) {
        console.log(`❌ ${field.name} is empty`);
        element.classList.add("error");
        isValid = false;

        if (!firstErrorField) {
          firstErrorField = element;
        }
      } else {
        element.classList.remove("error");
      }
    }

    // Validasi 5 tanda tangan
    signatureFields.forEach((field) => {
      const signatureData =
        document.getElementById(field.signatureId)?.value || "";
      const nameElement = document.getElementById(field.nameId);
      const canvasElement = document.getElementById(
        `signatureCanvas${field.signatureId.slice(-1)}`
      );

      // Jika tanda tangan wajib (Pelapor)
      if (field.required) {
        if (!signatureData || signatureData.trim() === "") {
          console.log(`❌ Tanda tangan ${field.label} belum dibuat`);

          if (canvasElement) {
            canvasElement.style.border = "2px solid #dc3545";
            setTimeout(() => {
              canvasElement.style.border = "";
            }, 2000);
          }

          isValid = false;

          if (!firstErrorField && canvasElement) {
            firstErrorField = canvasElement;
          }
        } else {
          if (canvasElement) {
            canvasElement.style.border = "2px solid #28a745";
          }
        }
      }

      // Validasi nama penandatangan
      if (nameElement) {
        const nameValue = nameElement.value ? nameElement.value.trim() : "";

        // Jika ada tanda tangan, nama wajib diisi
        if (signatureData && signatureData.trim() !== "") {
          if (!nameValue) {
            console.log(
              `⚠️ Nama ${field.label} harus diisi karena ada tanda tangan`
            );
            nameElement.classList.add("error");
            isValid = false;

            if (!firstErrorField) {
              firstErrorField = nameElement;
            }
          } else {
            nameElement.classList.remove("error");
          }
        } else {
          nameElement.classList.remove("error");
        }
      }
    });

    // Scroll ke error pertama jika ada
    if (firstErrorField) {
      setTimeout(() => {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
        if (firstErrorField.focus) {
          firstErrorField.focus();
        }
      }, 100);
    }

    console.log(`✅ Step 2 validation: ${isValid ? "PASSED" : "FAILED"}`);
    return isValid;
  }

  // ===============================
  // 5. REVIEW STEP (DIPERBAIKI)
  // ===============================
  function generateReview() {
    console.log("🔍 [DEBUG] generateReview() called");

    const reviewLoading = document.getElementById("reviewLoading");
    const reviewContent = document.getElementById("reviewContent");
    const reviewActions = document.getElementById("reviewActions");

    // Debug: Cek apakah element ada
    console.log("🔍 [DEBUG] Elements found:", {
      reviewLoading: !!reviewLoading,
      reviewContent: !!reviewContent,
      reviewActions: !!reviewActions,
    });

    if (!reviewContent) {
      console.error("❌ [ERROR] reviewContent element not found!");
      alert("Error: Review content element not found. Please refresh page.");
      return;
    }

    // Show loading
    if (reviewLoading) reviewLoading.style.display = "flex";
    if (reviewContent) reviewContent.style.display = "none";
    if (reviewActions) reviewActions.style.display = "none";

    setTimeout(() => {
      try {
        console.log("🔍 [DEBUG] Attempting to generate review...");

        // Coba ambil data dari localStorage
        const reviewData = localStorage.getItem("laporanReviewData");
        const laporanDraft = localStorage.getItem("laporanDraft");
        const formDataSession = sessionStorage.getItem("formDataSession");

        console.log("🔍 [DEBUG] Data sources:", {
          reviewData: reviewData ? "Found" : "Not found",
          laporanDraft: laporanDraft ? "Found" : "Not found",
          formDataSession: formDataSession ? "Found" : "Not found",
        });

        let formData = null;

        // Priority 1: Review data dari localStorage
        if (reviewData) {
          try {
            const parsed = JSON.parse(reviewData);
            formData = parsed.data;
            console.log("✅ [DEBUG] Using data from laporanReviewData");
          } catch (e) {
            console.error("❌ [ERROR] Failed to parse reviewData:", e);
          }
        }

        // Priority 2: Draft data
        if (!formData && laporanDraft) {
          try {
            const parsed = JSON.parse(laporanDraft);
            formData = parsed.data;
            console.log("✅ [DEBUG] Using data from laporanDraft");
          } catch (e) {
            console.error("❌ [ERROR] Failed to parse laporanDraft:", e);
          }
        }

        // Priority 3: Collect langsung dari form
        if (!formData) {
          console.log("ℹ️ [DEBUG] Collecting fresh data from form...");
          formData = collectFormData();
          console.log("✅ [DEBUG] Using fresh form data");
        }

        if (!formData) {
          throw new Error("No form data available for review");
        }

        // Debug: log data yang akan ditampilkan
        console.log("📊 [DEBUG] Form data to display:", {
          no_dok: formData.no_dok,
          nama_pelapor: formData.nama_pelapor,
          tanggal_kejadian: formData.tanggal_kejadian,
          deskripsi_length: formData.deskripsi_insiden
            ? formData.deskripsi_insiden.length
            : 0,
          ttd_count: Object.keys(formData).filter((k) => k.startsWith("ttd_"))
            .length,
          ttd_status: {
            pelapor: formData.ttd_pelapor ? "✓" : "✗",
            atasan: formData.ttd_atasan ? "✓" : "✗",
            smki: formData.ttd_smki ? "✓" : "✗",
            ketua: formData.ttd_ketua ? "✓" : "✗",
            smki2: formData.ttd_smki2 ? "✓" : "✗",
          },
        });

        // Update review fields
        console.log("🔄 [DEBUG] Updating review fields...");
        updateReviewFields(formData);

        // Update signature status
        console.log("🔏 [DEBUG] Updating signature status...");
        updateSignatureStatus(formData);

        // Show content
        console.log("👁️ [DEBUG] Showing review content...");
        if (reviewLoading) reviewLoading.style.display = "none";
        if (reviewContent) reviewContent.style.display = "block";
        if (reviewActions) reviewActions.style.display = "block";

        // Setup review actions
        console.log("🔧 [DEBUG] Setting up review actions...");
        setupReviewActions(formData);

        console.log("✅ [DEBUG] Review generated successfully");
      } catch (error) {
        console.error("❌ [ERROR] Error generating review:", error);

        if (reviewLoading) reviewLoading.style.display = "none";

        // Show error in review area
        if (reviewContent) {
          reviewContent.innerHTML = `
                    <div class="review-error" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <h3>Error Loading Review</h3>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p style="font-size: 14px; margin-top: 10px;">
                            Please check browser console for details.
                        </p>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-secondary" onclick="navigateToStep(1)" style="margin-right: 10px;">
                                <i class="fas fa-redo"></i> Back to Form
                            </button>
                            <button class="btn btn-primary" onclick="location.reload()">
                                <i class="fas fa-sync-alt"></i> Refresh Page
                            </button>
                        </div>
                    </div>
                `;
          reviewContent.style.display = "block";
        }
      }
    }, 500);
  }

  function updateReviewFields(formData) {
    console.log("🔄 Updating review fields...");

    // Format date function
    function formatDateForDisplay(dateStr) {
      if (!dateStr || dateStr === "") return "-";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      } catch (e) {
        return dateStr;
      }
    }

    // Mapping fields
    const fieldMap = [
      { source: "no_dok", target: "reviewNoDok" },
      { source: "no_revisi", target: "reviewNoRevisi" },
      { source: "tgl_efektif", target: "reviewTglEfektif" },
      { source: "nama_pelapor", target: "reviewPelapor" },
      { source: "nama_bidang", target: "reviewBidang" },
      { source: "jenis_insiden", target: "reviewJenisInsiden" },
      { source: "deskripsi_insiden", target: "reviewDeskripsi" },
      { source: "analisa_penyebab", target: "reviewAnalisa" },
      { source: "tindak_smki", target: "reviewTindakSMKI" },
      { source: "pic_tindak", target: "reviewPICTindak" },
      { source: "tindak_pihak", target: "reviewTindakPihak" },
      { source: "tanggal_penyelesaian", target: "reviewTanggalPenyelesaian" },
      { source: "nama_ttd_pelapor", target: "reviewNamaTTDPelapor" },
      { source: "nama_ttd_atasan", target: "reviewNamaTTDAtasan" },
      { source: "nama_ttd_smki", target: "reviewNamaTTDSMKI" },
      { source: "nama_ttd_ketua", target: "reviewNamaTTDKetua" },
      { source: "nama_ttd_smki2", target: "reviewNamaTTDSMKI2" },
    ];

    // Update each field
    fieldMap.forEach(({ source, target }) => {
      const targetElement = document.getElementById(target);
      if (targetElement) {
        let value = formData[source] || "-";

        // Format dates
        if (source.includes("tgl") || source.includes("tanggal")) {
          value = formatDateForDisplay(value);
        }

        targetElement.textContent = value;
      }
    });

    // Update status badge
    const statusBadge = document.getElementById("reviewStatus");
    if (statusBadge) {
      const status = formData.selesai || "Tidak";
      statusBadge.textContent = status === "Ya" ? "Selesai" : "Belum Selesai";
      statusBadge.className = `status-badge ${
        status === "Ya" ? "completed" : ""
      }`;
    }

    // Update tanggal kejadian
    const tanggalKejadianElement = document.getElementById(
      "reviewTanggalKejadian"
    );
    if (tanggalKejadianElement) {
      const value = formatDateForDisplay(formData.tanggal_kejadian);
      tanggalKejadianElement.textContent = value;
    }

    // Update no permohonan
    const noPermohonanElement = document.getElementById("reviewNoPermohonan");
    if (noPermohonanElement) {
      noPermohonanElement.textContent = formData.no_permohonan || "-";
    }

    console.log("✅ Review fields updated");
  }

  function updateSignatureStatus(formData) {
    console.log("🔏 Updating signature status for 5 TTD...");

    const signatureFields = [
      {
        index: 1,
        key: "ttd_pelapor",
        nameKey: "nama_ttd_pelapor",
        label: "Pelapor",
        required: true,
      },
      {
        index: 2,
        key: "ttd_atasan",
        nameKey: "nama_ttd_atasan",
        label: "Atasan",
        required: false,
      },
      {
        index: 3,
        key: "ttd_smki",
        nameKey: "nama_ttd_smki",
        label: "SMKI",
        required: false,
      },
      {
        index: 4,
        key: "ttd_ketua",
        nameKey: "nama_ttd_ketua",
        label: "Ketua",
        required: false,
      },
      {
        index: 5,
        key: "ttd_smki2",
        nameKey: "nama_ttd_smki2",
        label: "SMKI 2",
        required: false,
      },
    ];

    signatureFields.forEach(({ index, key, nameKey, label, required }) => {
      const signatureData = formData[key] || "";
      const nameValue = formData[nameKey] || "";

      const statusId = `reviewStatusTTD${label.replace(/\s+/g, "")}`;
      const nameId = `reviewNamaTTD${label.replace(/\s+/g, "")}`;

      const statusElement = document.getElementById(statusId);
      const nameElement = document.getElementById(nameId);

      if (statusElement) {
        if (signatureData && signatureData.trim() !== "") {
          statusElement.innerHTML =
            '<span class="status-badge completed">✓ Tersedia</span>';
        } else if (nameValue && nameValue.trim() !== "") {
          statusElement.innerHTML = '<span class="status-badge">Manual</span>';
        } else if (required) {
          statusElement.innerHTML =
            '<span class="status-badge error">Wajib</span>';
        } else {
          statusElement.innerHTML =
            '<span class="status-badge">Opsional</span>';
        }
      }

      if (nameElement) {
        nameElement.textContent = nameValue || "-";
      }
    });

    console.log("✅ Signature status updated");
  }

  // ===============================
  // 6. SETUP REVIEW ACTIONS (LENGKAP)
  // ===============================
  function setupReviewActions(formData) {
    console.log("🔧 Setting up review actions...");

    // 1. CONFIRM CHECKBOX & SUBMIT BUTTON
    const confirmCheckbox = document.getElementById("confirmReview");
    const submitBtn = document.getElementById("finalSubmitBtn");

    if (confirmCheckbox && submitBtn) {
      confirmCheckbox.addEventListener("change", function () {
        submitBtn.disabled = !this.checked;
        console.log(
          "✅ Confirm checkbox:",
          this.checked ? "checked" : "unchecked"
        );
      });

      // Set initial state
      submitBtn.disabled = !confirmCheckbox.checked;
    }

    // 2. PRINT REVIEW BUTTON
    const printReviewBtn = document.getElementById("printReviewBtn");
    if (printReviewBtn) {
      printReviewBtn.addEventListener("click", () => {
        console.log("🖨️ Print Review button clicked");

        if (!formData) {
          formData = collectFormData();
        }

        handlePrintReview(formData);
      });
    }

    // 3. SAVE AS DRAFT BUTTON
    const saveDraftBtn = document.getElementById("saveAsDraftBtn");
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener("click", () => {
        console.log("💾 Save as Draft clicked");

        if (!formData) {
          formData = collectFormData();
        }

        handleSaveDraft(formData);
      });
    }

    // 4. FINAL SUBMIT BUTTON
    if (submitBtn) {
      submitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("📤 Final Submit clicked");

        if (!formData) {
          formData = collectFormData();
        }

        handleFinalSubmit(formData);
      });
    }

    console.log("✅ Review actions setup complete");
  }

  // ===============================
  // HANDLE PRINT REVIEW
  // ===============================
  // PERBAIKAN UTAMA: handlePrintReview di form_03.js
  // ===============================
  // PERBAIKAN: handlePrintReview dengan base64 signatures
  // ===============================
  // ===============================
  // PERBAIKAN: handlePrintReview tanpa URL parameter panjang
  // ===============================

  // Di file signature.js atau bagian inisialisasi tanda tangan:
  function initializeAllSignatures() {
    console.log("✍️ Initializing all signatures...");

    for (let i = 1; i <= 5; i++) {
      const canvas = document.getElementById(`signatureCanvas${i}`);
      const saveBtn = document.getElementById(`saveSignatureBtn${i}`);
      const clearBtn = document.getElementById(`clearSignatureBtn${i}`);
      const hiddenInput = document.getElementById(`signatureData${i}`);

      if (!canvas || !saveBtn) {
        console.warn(`⚠️ Canvas or save button ${i} not found`);
        continue;
      }

      // Initialize signature pad
      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });

      // Save button click handler
      saveBtn.addEventListener("click", function () {
        if (signaturePad.isEmpty()) {
          alert(
            `Tanda tangan ${i} kosong! Gambar tanda tangan terlebih dahulu.`
          );
          return;
        }

        const dataUrl = signaturePad.toDataURL("image/png");
        if (hiddenInput) {
          hiddenInput.value = dataUrl;
          console.log(`✅ Signature ${i} saved, length: ${dataUrl.length}`);

          // Mark as saved
          saveBtn.dataset.saved = "true";
          saveBtn.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
          saveBtn.classList.add("saved");

          // Show preview
          showSignaturePreview(i, dataUrl);
        }
      });

      // Clear button handler
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          signaturePad.clear();
          if (hiddenInput) hiddenInput.value = "";
          saveBtn.dataset.saved = "false";
          saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Tanda Tangan';
          saveBtn.classList.remove("saved");
          clearSignaturePreview(i);
        });
      }

      console.log(`✅ Signature ${i} initialized`);
    }
  }

  // Call this on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", function () {
    initializeAllSignatures();
  });

  // ===============================
  // HANDLE PRINT REVIEW - DIPERBAIKI UNTUK SMKI & SMKI2
  // ===============================
  function handlePrintReview(formData) {
    console.log("🖨️ Handle Print Review - DIPERBAIKI LENGKAP");

    if (!formData) {
      formData = collectFormData();
    }

    // ============ DEBUG DETAILED: CEK SEMUA DATA ============
    console.log("🔍 === DETAILED FORM DATA DEBUG ===");
    console.log("🔑 All form data keys:", Object.keys(formData));

    // Debug status khusus
    console.log("📋 Status fields:");
    console.log(
      "  selesai:",
      formData.selesai,
      "(type:",
      typeof formData.selesai,
      ")"
    );
    console.log("  tanggal_penyelesaian:", formData.tanggal_penyelesaian);

    // Debug radio button status
    const statusRadios = document.querySelectorAll('input[name="selesai"]');
    console.log("📻 Radio button status:");
    statusRadios.forEach((radio) => {
      console.log(
        `  ${radio.value}: ${radio.checked ? "✓ CHECKED" : "unchecked"}`
      );
    });

    // Pastikan status valid
    let finalStatus = formData.selesai || "Tidak";
    console.log(`🔧 Raw status from form: '${finalStatus}'`);

    // Normalisasi status
    if (typeof finalStatus === "string") {
      finalStatus = finalStatus.trim();
      if (finalStatus.toUpperCase() === "YA") {
        finalStatus = "Ya";
      } else if (finalStatus.toUpperCase() === "TIDAK") {
        finalStatus = "Tidak";
      }
    }

    if (finalStatus !== "Ya" && finalStatus !== "Tidak") {
      console.warn(
        `⚠️ Invalid status: '${finalStatus}', defaulting to 'Tidak'`
      );
      finalStatus = "Tidak";
    }

    console.log(`✅ Final normalized status: '${finalStatus}'`);

    // ============ PREPARE PRINT DATA ============
    const printData = {
      // ============ DOKUMEN ============
      no_dok: formData.no_dok || "",
      no_revisi: formData.no_revisi || "00",
      tgl_efektif: formData.tgl_efektif || "",
      no_permohonan: formData.no_permohonan || `INS-${Date.now()}`,

      // ============ KEJADIAN ============
      tanggal_kejadian: formData.tanggal_kejadian || "",
      nama_pelapor: formData.nama_pelapor || "",
      nama_bidang: formData.nama_bidang || "",
      deskripsi_insiden: formData.deskripsi_insiden || "",
      jenis_insiden: formData.jenis_insiden || "",
      analisa_penyebab: formData.analisa_penyebab || "",

      // ============ TINDAKAN ============
      tindak_smki: formData.tindak_smki || "",
      pic_tindak: formData.pic_tindak || "",
      tindak_pihak: formData.tindak_pihak || "",

      // ============ STATUS (DIPERBAIKI) ============
      selesai: finalStatus, // ← "Ya" atau "Tidak"
      insiden_selesai: finalStatus, // ← Untuk kompatibilitas database
      completed: finalStatus === "Ya", // ← Boolean version
      tanggal_penyelesaian: formData.tanggal_penyelesaian || "",

      // ============ 5 TANDA TANGAN BASE64 ============
      // Format utama (dengan _base64 suffix)
      ttd_pelapor_base64: formData.ttd_pelapor || "",
      ttd_atasan_base64: formData.ttd_atasan || "",
      ttd_smki_base64: formData.ttd_smki || "",
      ttd_ketua_base64: formData.ttd_ketua || "",
      ttd_smki2_base64: formData.ttd_smki2 || "",

      // Format alternatif (camelCase) untuk kompatibilitas
      ttdPelaporBase64: formData.ttd_pelapor || "",
      ttdAtasanBase64: formData.ttd_atasan || "",
      ttdSmkiBase64: formData.ttd_smki || "",
      ttdKetuaBase64: formData.ttd_ketua || "",
      ttdSmki2Base64: formData.ttd_smki2 || "",

      // Format asli (tanpa suffix) untuk fallback
      ttd_pelapor: formData.ttd_pelapor || "",
      ttd_atasan: formData.ttd_atasan || "",
      ttd_smki: formData.ttd_smki || "",
      ttd_ketua: formData.ttd_ketua || "",
      ttd_smki2: formData.ttd_smki2 || "",

      // ============ 5 NAMA PENANDATANGAN ============
      nama_ttd_pelapor:
        formData.nama_ttd_pelapor || formData.nama_pelapor || "",
      nama_ttd_atasan: formData.nama_ttd_atasan || "",
      nama_ttd_smki: formData.nama_ttd_smki || "",
      nama_ttd_ketua: formData.nama_ttd_ketua || "",
      nama_ttd_smki2: formData.nama_ttd_smki2 || "",

      // ============ METADATA ============
      print_timestamp: new Date().toISOString(),
      print_date_formatted: new Date().toLocaleString("id-ID"),
      form_version: "3.0",
      generated_id: `print_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,

      // ============ DEBUG INFO ============
      _debug: {
        status_normalized: finalStatus,
        completion_date: formData.tanggal_penyelesaian || "empty",
        signature_count: {
          pelapor: formData.ttd_pelapor ? 1 : 0,
          atasan: formData.ttd_atasan ? 1 : 0,
          smki: formData.ttd_smki ? 1 : 0,
          ketua: formData.ttd_ketua ? 1 : 0,
          smki2: formData.ttd_smki2 ? 1 : 0,
          total:
            (formData.ttd_pelapor ? 1 : 0) +
            (formData.ttd_atasan ? 1 : 0) +
            (formData.ttd_smki ? 1 : 0) +
            (formData.ttd_ketua ? 1 : 0) +
            (formData.ttd_smki2 ? 1 : 0),
        },
        storage_time: new Date().toISOString(),
      },
    };

    // Debug summary
    console.log("📋 === PRINT DATA STATUS SUMMARY ===");
    console.log("Status fields:");
    console.log("  selesai:", printData.selesai);
    console.log("  insiden_selesai:", printData.insiden_selesai);
    console.log("  completed:", printData.completed);
    console.log("  tanggal_penyelesaian:", printData.tanggal_penyelesaian);
    console.log("Is completed?", printData.selesai === "Ya");
    console.log("Signature counts:", printData._debug.signature_count);

    // ============ SAVE TO STORAGE ============
    try {
      // Clean up old data first
      cleanupOldPrintData();

      // Simpan dengan unique ID
      const storageKey = `print_data_${printData.generated_id}`;

      // Coba save ke sessionStorage
      const jsonString = JSON.stringify(printData);
      console.log(
        `💾 Saving data (${jsonString.length} bytes) to: ${storageKey}`
      );

      if (jsonString.length > 5000000) {
        // 5MB limit
        console.warn(
          "⚠️ Data terlalu besar untuk storage, menggunakan minimal data"
        );

        // Buat versi minimal tanpa base64 duplikat
        const minimalPrintData = {
          no_dok: printData.no_dok,
          no_permohonan: printData.no_permohonan,
          nama_pelapor: printData.nama_pelapor,
          nama_bidang: printData.nama_bidang,
          tanggal_kejadian: printData.tanggal_kejadian,
          selesai: printData.selesai,
          insiden_selesai: printData.insiden_selesai,
          tanggal_penyelesaian: printData.tanggal_penyelesaian,
          generated_id: printData.generated_id,
          form_version: printData.form_version,
          _minimal: true,
          message:
            "Data lengkap tidak tersedia, tanda tangan mungkin tidak muncul",
        };

        const minimalString = JSON.stringify(minimalPrintData);
        sessionStorage.setItem(storageKey, minimalString);
        console.log(`✅ Minimal data saved (${minimalString.length} bytes)`);
      } else {
        sessionStorage.setItem(storageKey, jsonString);
        console.log("✅ Full data saved successfully");
      }

      // Simpan backup ke localStorage
      sessionStorage.setItem("last_print_data_id", printData.generated_id);

      const backupData = {
        id: printData.generated_id,
        timestamp: printData.print_timestamp,
        no_dok: printData.no_dok,
        no_permohonan: printData.no_permohonan,
        nama_pelapor: printData.nama_pelapor,
        status: printData.selesai,
        signature_count: printData._debug.signature_count.total,
      };
      localStorage.setItem("last_print_data", JSON.stringify(backupData));

      console.log("✅ Data saved successfully");
      console.log("🔗 Storage key:", storageKey);

      // ============ OPEN PRINT WINDOW ============
      const printUrl = `/laporan-insiden/print?data_id=${printData.generated_id}&autoprint=1`;
      console.log("🌐 Opening print window:", printUrl);

      const printWindow = window.open(
        printUrl,
        "_blank",
        "width=1024,height=768,toolbar=no,menubar=no"
      );

      if (!printWindow) {
        console.warn("⚠️ Popup diblokir, menggunakan tab yang sama");

        // Tampilkan notifikasi
        alert(
          "Izinkan popup untuk membuka window print. Membuka di tab yang sama..."
        );

        // Fallback: buka di tab yang sama
        window.location.href = printUrl;
      } else {
        // Focus ke window print
        printWindow.focus();

        // Optional: auto close setelah beberapa saat jika tidak di-print
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.close();
            console.log("🔄 Print window auto-closed");
          }
        }, 30000); // 30 detik
      }
    } catch (error) {
      console.error("❌ Error saving print data:", error);

      // Fallback minimal data
      const fallbackData = {
        no_dok: printData.no_dok,
        no_permohonan: printData.no_permohonan,
        nama_pelapor: printData.nama_pelapor,
        nama_bidang: printData.nama_bidang,
        tanggal_kejadian: printData.tanggal_kejadian,
        selesai: printData.selesai,
        insiden_selesai: printData.insiden_selesai,
        generated_id: printData.generated_id,
        error: error.message,
        _fallback: true,
      };

      const fallbackKey = `fallback_data_${printData.generated_id}`;
      sessionStorage.setItem(fallbackKey, JSON.stringify(fallbackData));

      const fallbackUrl = `/laporan-insiden/print?data_id=${printData.generated_id}&minimal=1`;

      if (
        confirm(
          "Terjadi kesalahan saat menyimpan data. Lanjutkan dengan data terbatas?\n\nTanda tangan mungkin tidak akan ditampilkan."
        )
      ) {
        window.open(fallbackUrl, "_blank");
      }
    }
  }

  // Helper function untuk cleanup old data
  function cleanupOldPrintData() {
    try {
      const keysToRemove = [];
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 jam

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key.startsWith("print_data_") ||
          key.startsWith("minimal_data_") ||
          key.startsWith("fallback_data_")
        ) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key));
            if (data && data._debug && data._debug.storage_time) {
              const storageTime = new Date(data._debug.storage_time).getTime();
              if (now - storageTime > maxAge) {
                keysToRemove.push(key);
              }
            } else if (data && data.timestamp) {
              const storageTime = new Date(data.timestamp).getTime();
              if (now - storageTime > maxAge) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            // Jika parsing gagal, hapus saja
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => {
        sessionStorage.removeItem(key);
        console.log(`🧹 Cleaned up old data: ${key}`);
      });

      if (keysToRemove.length > 0) {
        console.log(`✅ Cleaned up ${keysToRemove.length} old data items`);
      }
    } catch (e) {
      console.warn("Could not cleanup old data:", e);
    }
  }

  // Helper function untuk cleanup old data
  function cleanupOldPrintData() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key.startsWith("print_data_") || key.startsWith("minimal_data_")) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        sessionStorage.removeItem(key);
        console.log(`🧹 Cleaned up: ${key}`);
      });
    } catch (e) {
      console.warn("Could not cleanup old data:", e);
    }
  }

  // Helper function untuk cleanup old data
  function cleanupOldPrintData() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key.startsWith("print_data_") || key.startsWith("minimal_data_")) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        sessionStorage.removeItem(key);
        console.log(`🧹 Cleaned up old data: ${key}`);
      });
    } catch (e) {
      console.warn("Could not cleanup old data:", e);
    }
  }

  // ===============================
  // HANDLE SAVE DRAFT
  // ===============================
  function handleSaveDraft(formData) {
    console.log("💾 Save as Draft clicked");

    if (!formData) {
      formData = collectFormData();
    }

    // Simpan ke localStorage
    const draftData = {
      data: formData,
      savedAt: new Date().toISOString(),
      currentStep: state.currentStep,
      draftName: `Draft Laporan ${formData.no_dok || "Tanpa Nomor"}`,
      draftNotes: "Disimpan dari form review",
    };

    try {
      localStorage.setItem("laporanDraft", JSON.stringify(draftData));
      showNotification("✅ Draft berhasil disimpan!", "success");

      // Tanya apakah ingin kembali ke dashboard
      if (confirm("Draft berhasil disimpan. Kembali ke dashboard?")) {
        window.location.href = "/laporan-insiden/dashboard";
      }
    } catch (error) {
      console.error("❌ Failed to save draft:", error);
      showNotification("❌ Gagal menyimpan draft", "error");
    }
  }

  // ===============================
  // HANDLE FINAL SUBMIT
  // ===============================
  function handleFinalSubmit(formData) {
    console.log("📤 Final Submit clicked");

    // 1. Validasi semua data
    if (!validateStep1() || !validateStep2()) {
      alert("❌ Harap lengkapi semua data wajib sebelum submit!");
      navigateToStep(1);
      return;
    }

    // 2. Validasi checkbox konfirmasi
    const confirmCheckbox = document.getElementById("confirmReview");
    if (!confirmCheckbox || !confirmCheckbox.checked) {
      alert("❌ Harap centang konfirmasi review sebelum submit!");
      return;
    }

    // 3. Konfirmasi akhir
    if (
      !confirm(
        "Apakah Anda yakin ingin mengirim laporan ini?\n\nData tidak dapat diubah setelah submit."
      )
    ) {
      return;
    }

    // 4. Kumpulkan data
    if (!formData) {
      formData = collectFormData();
    }

    // 5. Kirim ke database
    submitToDatabase(formData);
  }

  // ===============================
  // 7. COLLECT FORM DATA (LENGKAP UNTUK 5 TTD)
  // ===============================
  function collectFormData() {
    console.log("📋 Collecting form data...");

    // Helper functions
    function getValue(id, defaultValue = "") {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`⚠️ Element with id "${id}" not found`);
        return defaultValue;
      }

      if (element.type === "checkbox") {
        return element.checked;
      } else if (element.type === "radio") {
        const radio = document.querySelector(
          `input[name="${element.name}"]:checked`
        );
        return radio ? radio.value : defaultValue;
      } else if (element.tagName === "SELECT") {
        return element.value || defaultValue;
      } else if (element.tagName === "TEXTAREA") {
        return element.value.trim() || defaultValue;
      } else {
        return element.value.trim() || defaultValue;
      }
    }

    // ============ PERBAIKI: AMBIL STATUS SELESAI ============
    let statusValue = "Tidak";
    const statusRadios = document.querySelectorAll(
      'input[name="selesai"]:checked'
    );

    if (statusRadios.length > 0) {
      statusValue = statusRadios[0].value;
      console.log(`✅ Status radio found: ${statusValue}`);
    } else {
      // Coba dari hidden field atau default
      const statusElement = document.getElementById("selesai");
      if (statusElement) {
        statusValue = statusElement.value || "Tidak";
        console.log(`✅ Status from element: ${statusValue}`);
      }
      console.warn(
        `⚠️ No status radio selected, using default: ${statusValue}`
      );
    }

    // Debug: tampilkan semua radio button status
    console.log("🔍 All status radios:");
    document.querySelectorAll('input[name="selesai"]').forEach((radio) => {
      console.log(
        `  ${radio.value}: ${radio.checked ? "✓ checked" : "unchecked"}`
      );
    });

    // KUMPULKAN SEMUA DATA
    const formData = {
      // ====== DATA DOKUMEN ======
      no_dok: getValue("no_dok"),
      no_revisi: getValue("no_revisi", "00"),
      tgl_efektif: getValue("tgl_efektif"),
      no_permohonan: getValue("no_permohonan"),

      // ====== DATA KEJADIAN ======
      tanggal_kejadian: getValue("tanggal_kejadian"),
      nama_pelapor: getValue("nama_pelapor"),
      nama_bidang: getValue("nama_bidang"),
      deskripsi_insiden: getValue("deskripsi_insiden"),
      jenis_insiden: getValue("jenis_insiden"),
      analisa_penyebab: getValue("analisa_penyebab"),

      // ====== TINDAKAN ======
      tindak_smki: getValue("tindak_smki"),
      pic_tindak: getValue("pic_tindak"),
      tindak_pihak: getValue("tindak_pihak"),

      // ====== STATUS ====== (DIPERBAIKI)
      selesai: statusValue, // ← PASTIKAN "Ya" atau "Tidak"
      tanggal_penyelesaian: getValue("tanggal_penyelesaian"),

      // ====== 5 TANDA TANGAN ======
      ttd_pelapor: getValue("signatureData1", ""),
      ttd_atasan: getValue("signatureData2", ""),
      ttd_smki: getValue("signatureData3", ""),
      ttd_ketua: getValue("signatureData4", ""),
      ttd_smki2: getValue("signatureData5", ""),

      // ====== 5 NAMA PENANDATANGAN ======
      nama_ttd_pelapor: getValue("nama_ttd_pelapor", ""),
      nama_ttd_atasan: getValue("nama_ttd_atasan", ""),
      nama_ttd_smki: getValue("nama_ttd_smki", ""),
      nama_ttd_ketua: getValue("nama_ttd_ketua", ""),
      nama_ttd_smki2: getValue("nama_ttd_smki2", ""),

      // ====== METADATA ======
      collected_at: new Date().toISOString(),
      form_version: "3.0",
      has_5_signatures: true,
    };

    console.log("📋 Form data collected:", {
      fieldCount: Object.keys(formData).length,
      status: {
        value: formData.selesai,
        type: typeof formData.selesai,
        isYa: formData.selesai === "Ya",
      },
      completionDate: formData.tanggal_penyelesaian,
      signatures: {
        pelapor: formData.ttd_pelapor ? "✓" : "✗",
        atasan: formData.ttd_atasan ? "✓" : "✗",
        smki: formData.ttd_smki ? "✓" : "✗",
        ketua: formData.ttd_ketua ? "✓" : "✗",
        smki2: formData.ttd_smki2 ? "✓" : "✗",
      },
    });

    return formData;
  }

  // ===============================
  // 8. SUBMIT TO DATABASE
  // ===============================
  // ===============================
  // 8. SUBMIT TO DATABASE - DIPERBAIKI UNTUK REDIRECT KE MAIN DASHBOARD
  // ===============================
  function submitToDatabase(formData) {
    console.log("💾 Submitting to database via API...");

    // Tampilkan loading
    const submitBtn = document.getElementById("finalSubmitBtn");
    const loadingDiv = document.getElementById("submitLoading");
    const errorDiv = document.getElementById("submitError");

    if (loadingDiv) loadingDiv.style.display = "block";
    if (errorDiv) errorDiv.style.display = "none";

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    submitBtn.disabled = true;

    // Kirim data ke API
    fetch("/api/laporan-insiden/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("API response:", data);

        if (data.status === "ok") {
          // Success
          showNotification(
            "✅ Laporan berhasil disimpan ke database!",
            "success"
          );

          // Update button
          submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
          submitBtn.classList.add("success");

          // Clear storage
          localStorage.removeItem("laporanDraft");
          localStorage.removeItem("laporanReviewData");
          localStorage.removeItem("laporanPrintData");

          // PERUBAHAN: Redirect ke main_dashboard setelah berhasil
          setTimeout(() => {
            // Priority: Use redirect from server, otherwise go to main_dashboard
            if (data.redirect) {
              console.log("↪️ Redirecting to:", data.redirect);
              window.location.href = data.redirect;
            } else {
              console.log("↪️ Redirecting to main dashboard");
              window.location.href = "/dashboard"; // <-- INI DIUBAH
            }
          }, 1500); // <-- Dikurangi dari 2000 menjadi 1500
        } else {
          // Error dari server
          throw new Error(data.error || "Gagal menyimpan laporan");
        }
      })
      .catch((error) => {
        console.error("Error:", error);

        // Show error in UI
        if (errorDiv) {
          errorDiv.style.display = "block";
          document.getElementById("errorMessage").textContent = error.message;
        }

        showNotification(`❌ ${error.message}`, "error");

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      })
      .finally(() => {
        // Hide loading
        if (loadingDiv) loadingDiv.style.display = "none";
      });
  }

  // ===============================
  // 9. NOTIFICATION SYSTEM
  // ===============================
  function showNotification(message, type = "info") {
    console.log(`📢 Notification [${type}]: ${message}`);

    // Coba gunakan global function jika ada
    if (typeof window.showNotification === "function") {
      window.showNotification(message, type);
      return;
    }

    // Coba gunakan toast jika ada
    const toast = document.getElementById("notificationToast");
    const toastMessage = document.getElementById("toastMessage");

    if (toast && toastMessage) {
      // Set message
      toastMessage.textContent = message;

      // Set type dan icon
      toast.className = `notification ${type}`;
      const icon = toast.querySelector("i");
      if (icon) {
        switch (type) {
          case "success":
            icon.className = "fas fa-check-circle";
            break;
          case "error":
            icon.className = "fas fa-exclamation-circle";
            break;
          case "warning":
            icon.className = "fas fa-exclamation-triangle";
            break;
          default:
            icon.className = "fas fa-info-circle";
        }
      }

      // Show
      toast.style.display = "flex";

      // Auto hide
      setTimeout(() => {
        toast.style.display = "none";
      }, 5000);

      // Close button
      const closeBtn = document.getElementById("closeToast");
      if (closeBtn) {
        closeBtn.onclick = () => {
          toast.style.display = "none";
        };
      }
    } else {
      // Fallback ke alert jika toast tidak ada
      const alertType =
        {
          success: "✅ ",
          error: "❌ ",
          warning: "⚠️ ",
          info: "ℹ️ ",
        }[type] || "";

      alert(alertType + message);
    }
  }
  // Debug function untuk cek status radio
  function debugStatusRadio() {
    console.log("🔍 Debug status radio buttons:");

    const radios = document.querySelectorAll('input[name="selesai"]');
    let foundChecked = false;

    radios.forEach((radio) => {
      console.log(
        `  ${radio.value}: ${radio.checked ? "✓ CHECKED" : "unchecked"} (id: ${
          radio.id
        })`
      );
      if (radio.checked) {
        foundChecked = true;
      }
    });

    if (!foundChecked) {
      console.warn("⚠️ No status radio button is checked!");
    }

    // Cek juga hidden field
    const hiddenStatus = document.getElementById("selesai");
    if (hiddenStatus) {
      console.log(`  Hidden field 'selesai': ${hiddenStatus.value}`);
    }
  }

  // Panggil saat form load atau saat ingin debug
  document.addEventListener("DOMContentLoaded", function () {
    // Test debug
    setTimeout(debugStatusRadio, 1000);
  });
  // ===============================
  // DEBUG UTILITIES
  // ===============================
  function debugFormState() {
    console.log("🔍 === DEBUG FORM STATE ===");
    console.log("Current step:", state.currentStep);

    // Check localStorage
    const keys = Object.keys(localStorage);
    const laporanKeys = keys.filter((k) => k.includes("laporan"));
    console.log("LocalStorage keys with 'laporan':", laporanKeys);

    // Check form data
    const formData = collectFormData();
    console.log("Form data collected:", {
      fieldCount: Object.keys(formData).length,
      hasTTD: {
        pelapor: !!formData.ttd_pelapor,
        atasan: !!formData.ttd_atasan,
        smki: !!formData.ttd_smki,
        ketua: !!formData.ttd_ketua,
        smki2: !!formData.ttd_smki2,
      },
    });
  }

  // ===============================
  // 10. START EVERYTHING
  // ===============================
  initializeForm();
});
