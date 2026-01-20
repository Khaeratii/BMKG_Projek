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

    // Setup navigation
    setupNavigation();

    // Setup validation
    setupValidation();

    // Show first step
    showStep(1);

    // Setup form submission
    setupFormSubmission();

    // Auto-generate nomor permohonan
    generateNomorPermohonan();

    console.log("✅ Form initialized");
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
            }
          } else if (state.currentStep === 2) {
            // Step 2 → Step 3
            if (validateStep2()) {
              console.log("✅ Validation passed, generating review...");
              navigateToStep(3);
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
  // 4. VALIDATION (DIPERBAIKI DENGAN VALIDASI LENGKAP)
  // ===============================
  function setupValidation() {
    // Toggle tanggal penyelesaian based on radio
    const selesaiRadios = document.querySelectorAll('input[name="selesai"]');
    selesaiRadios.forEach((radio) => {
      radio.addEventListener("change", function () {
        const tanggalGroup = document.getElementById(
          "tanggalPenyelesaianGroup",
        );
        if (tanggalGroup) {
          tanggalGroup.style.display = this.value === "Ya" ? "block" : "none";

          // Jika "Ya", set tanggal default
          if (this.value === "Ya") {
            const tanggalInput = document.getElementById(
              "tanggal_penyelesaian",
            );
            if (tanggalInput && !tanggalInput.value) {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tanggalInput.value = tomorrow.toISOString().split("T")[0];
            }
          }
        }
      });
    });

    // Set initial state
    const tanggalGroup = document.getElementById("tanggalPenyelesaianGroup");
    if (tanggalGroup) {
      const checkedRadio = document.querySelector(
        'input[name="selesai"]:checked',
      );
      tanggalGroup.style.display =
        checkedRadio && checkedRadio.value === "Ya" ? "block" : "none";
    }

    // Clear errors on input
    document.querySelectorAll("input, textarea, select").forEach((field) => {
      field.addEventListener("input", function () {
        clearFieldError(this);
      });
    });
  }

  function validateCurrentStep() {
    if (state.currentStep === 1) return validateStep1();
    if (state.currentStep === 2) return validateStep2();
    return true;
  }

  // ===============================
  // 4. VALIDATION (DIPERBAIKI DENGAN VALIDASI LENGKAP)
  // ===============================

  function validateStep1() {
    console.log("🔍 Validating Step 1...");

    const requiredFields = [
      { id: "no_dok", name: "Nomor Dokumen", type: "text" },
      { id: "tgl_efektif", name: "Tanggal Efektif", type: "date" },
      { id: "tanggal_kejadian", name: "Tanggal Kejadian", type: "date" },
      { id: "nama_pelapor", name: "Nama Pelapor", type: "text" },
      { id: "nama_bidang", name: "Nama Bidang", type: "text" },
      { id: "deskripsi_insiden", name: "Deskripsi Insiden", type: "textarea" },
      { id: "jenis_insiden", name: "Jenis Insiden", type: "select" },
      { id: "analisa_penyebab", name: "Analisa Penyebab", type: "textarea" },
    ];

    let isValid = true;
    let firstErrorField = null;
    let errorMessage = "";

    // VALIDASI SEMUA FIELD WAJIB DIISI
    for (const field of requiredFields) {
      const element = document.getElementById(field.id);
      if (!element) continue;

      let value = "";

      if (field.type === "select") {
        value = element.value; // Untuk select, ambil value langsung
      } else {
        value = element.value ? element.value.trim() : "";
      }

      if (!value) {
        showFieldError(element, `${field.name} wajib diisi`);
        isValid = false;

        if (!firstErrorField) {
          firstErrorField = element;
          errorMessage = `${field.name} belum diisi`;
        }
      } else {
        clearFieldError(element);
      }
    }

    // TIDAK ADA VALIDASI TANGGAL LAINNYA, HANYA WAJIB DIISI

    // Scroll ke error pertama jika ada
    if (firstErrorField) {
      setTimeout(() => {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
        firstErrorField.focus();
      }, 100);

      // Show notification
      if (errorMessage) {
        showNotification(`❌ ${errorMessage}`, "error");
      }
    }

    return isValid;
  }

  function validateStep2() {
    console.log("🔍 Validating Step 2...");

    const requiredFields = [
      { id: "tindak_smki", name: "Tindak Lanjut SMKI", type: "textarea" },
      { id: "pic_tindak", name: "PIC Tindak Lanjut", type: "text" },
    ];

    // 5 Tanda Tangan (semua harus lengkap)
    const signatureFields = [
      {
        signatureId: "signatureData1",
        nameId: "nama_ttd_pelapor",
        canvasId: "signatureCanvas1",
        label: "Pelapor",
        required: true,
      },
      {
        signatureId: "signatureData2",
        nameId: "nama_ttd_atasan",
        canvasId: "signatureCanvas2",
        label: "Atasan",
        required: true,
      },
      {
        signatureId: "signatureData3",
        nameId: "nama_ttd_smki",
        canvasId: "signatureCanvas3",
        label: "SMKI",
        required: true,
      },
      {
        signatureId: "signatureData4",
        nameId: "nama_ttd_ketua",
        canvasId: "signatureCanvas4",
        label: "Ketua",
        required: true,
      },
      {
        signatureId: "signatureData5",
        nameId: "nama_ttd_smki2",
        canvasId: "signatureCanvas5",
        label: "SMKI 2",
        required: true,
      },
    ];

    let isValid = true;
    let firstErrorField = null;
    let errorMessage = "";

    // Validasi field wajib
    for (const field of requiredFields) {
      const element = document.getElementById(field.id);
      if (!element) continue;

      const value = element.value ? element.value.trim() : "";
      if (!value) {
        showFieldError(element, `${field.name} wajib diisi`);
        isValid = false;

        if (!firstErrorField) {
          firstErrorField = element;
          errorMessage = `${field.name} belum diisi`;
        }
      } else {
        clearFieldError(element);
      }
    }

    // Validasi semua 5 tanda tangan HARUS lengkap
    signatureFields.forEach((field) => {
      const signatureData =
        document.getElementById(field.signatureId)?.value || "";
      const nameElement = document.getElementById(field.nameId);
      const canvasElement = document.getElementById(field.canvasId);

      // Tanda tangan wajib untuk semua 5 pihak
      if (field.required) {
        if (!signatureData || signatureData.trim() === "") {
          // Highlight canvas
          if (canvasElement) {
            canvasElement.style.border = "2px solid #dc3545";
            canvasElement.style.boxShadow = "0 0 0 3px rgba(220, 53, 69, 0.1)";
          }

          isValid = false;

          if (!firstErrorField && canvasElement) {
            firstErrorField = canvasElement;
            errorMessage = `Tanda tangan ${field.label} belum dibuat`;
          }
        } else {
          // Clear highlight jika sudah ada tanda tangan
          if (canvasElement) {
            canvasElement.style.border = "";
            canvasElement.style.boxShadow = "";
          }
        }
      }

      // Validasi nama penandatangan HARUS diisi jika ada tanda tangan
      if (nameElement) {
        const nameValue = nameElement.value ? nameElement.value.trim() : "";

        // Jika ada tanda tangan, nama WAJIB diisi
        if (signatureData && signatureData.trim() !== "") {
          if (!nameValue) {
            showFieldError(
              nameElement,
              `Nama ${field.label} wajib diisi karena ada tanda tangan`,
            );
            isValid = false;

            if (!firstErrorField) {
              firstErrorField = nameElement;
              errorMessage = `Nama ${field.label} belum diisi`;
            }
          } else {
            clearFieldError(nameElement);
          }
        } else {
          // Jika tidak ada tanda tangan, clear error
          clearFieldError(nameElement);
        }
      }
    });

    // Validasi tanggal penyelesaian HANYA WAJIB DIISI jika insiden selesai
    const selesaiYa = document.querySelector(
      'input[name="selesai"][value="Ya"]:checked',
    );
    if (selesaiYa) {
      const tanggalPenyelesaian = document.getElementById(
        "tanggal_penyelesaian",
      );
      if (tanggalPenyelesaian && !tanggalPenyelesaian.value) {
        showFieldError(
          tanggalPenyelesaian,
          "Tanggal penyelesaian wajib diisi jika insiden selesai",
        );
        isValid = false;

        if (!firstErrorField) {
          firstErrorField = tanggalPenyelesaian;
          errorMessage = "Tanggal penyelesaian belum diisi";
        }
      } else if (tanggalPenyelesaian && tanggalPenyelesaian.value) {
        // Hanya clear error jika ada value, TIDAK ADA VALIDASI LAINNYA
        clearFieldError(tanggalPenyelesaian);
      }
    }

    // Scroll ke error pertama jika ada
    if (firstErrorField) {
      setTimeout(() => {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
        if (firstErrorField.focus) {
          firstErrorField.focus();
        }
      }, 100);

      // Show notification
      if (errorMessage) {
        showNotification(`❌ ${errorMessage}`, "error");
      }
    }

    return isValid;
  }

  function showFieldError(element, message) {
    element.classList.add("error");

    // Cek apakah sudah ada error message
    let errorDiv = element.parentElement.querySelector(".error-message");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      element.parentElement.appendChild(errorDiv);
    }
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  }

  function clearFieldError(element) {
    element.classList.remove("error");
    element.style.border = "";
    element.style.boxShadow = "";

    const errorDiv = element.parentElement.querySelector(".error-message");
    if (errorDiv) errorDiv.remove();
  }

  // ===============================
  // 5. REVIEW STEP
  // ===============================
  function generateReview() {
    console.log("🔍 Generating review...");

    const reviewLoading = document.getElementById("reviewLoading");
    const reviewContent = document.getElementById("reviewContent");
    const reviewActions = document.getElementById("reviewActions");

    if (!reviewContent) return;

    // Show loading
    if (reviewLoading) reviewLoading.style.display = "flex";
    if (reviewContent) reviewContent.style.display = "none";
    if (reviewActions) reviewActions.style.display = "none";

    setTimeout(() => {
      try {
        const formData = collectFormData();

        // Update review fields
        updateReviewFields(formData);

        // Update signature status
        updateSignatureStatus(formData);

        // Show content
        if (reviewLoading) reviewLoading.style.display = "none";
        if (reviewContent) reviewContent.style.display = "block";
        if (reviewActions) reviewActions.style.display = "block";

        // Setup review actions
        setupReviewActions();
      } catch (error) {
        console.error("❌ Error generating review:", error);
        if (reviewLoading) reviewLoading.style.display = "none";
      }
    }, 300);
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
      "reviewTanggalKejadian",
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
  }

  function updateSignatureStatus(formData) {
    console.log("🔏 Updating signature status...");

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
        required: true,
      },
      {
        index: 3,
        key: "ttd_smki",
        nameKey: "nama_ttd_smki",
        label: "SMKI",
        required: true,
      },
      {
        index: 4,
        key: "ttd_ketua",
        nameKey: "nama_ttd_ketua",
        label: "Ketua",
        required: true,
      },
      {
        index: 5,
        key: "ttd_smki2",
        nameKey: "nama_ttd_smki2",
        label: "SMKI 2",
        required: true,
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
            '<span class="status-badge completed">✓ Lengkap</span>';
        } else {
          statusElement.innerHTML =
            '<span class="status-badge error">Belum</span>';
        }
      }

      if (nameElement) {
        nameElement.textContent = nameValue || "-";
      }
    });
  }

  function setupReviewActions() {
    console.log("🔧 Setting up review actions...");

    // CONFIRM CHECKBOX & SUBMIT BUTTON
    const confirmCheckbox = document.getElementById("confirmReview");
    const submitBtn = document.getElementById("finalSubmitBtn");

    if (confirmCheckbox && submitBtn) {
      confirmCheckbox.addEventListener("change", function () {
        submitBtn.disabled = !this.checked;
      });

      // Set initial state
      submitBtn.disabled = !confirmCheckbox.checked;
    }
  }

  // ===============================
  // 6. FORM DATA COLLECTION
  // ===============================
  function collectFormData() {
    console.log("📋 Collecting form data...");

    // Helper functions
    function getValue(id, defaultValue = "") {
      const element = document.getElementById(id);
      if (!element) {
        return defaultValue;
      }

      if (element.type === "checkbox") {
        return element.checked;
      } else if (element.type === "radio") {
        const radio = document.querySelector(
          `input[name="${element.name}"]:checked`,
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

    // Get status value
    let statusValue = "Tidak";
    const statusRadios = document.querySelectorAll(
      'input[name="selesai"]:checked',
    );

    if (statusRadios.length > 0) {
      statusValue = statusRadios[0].value;
    } else {
      const statusElement = document.getElementById("selesai");
      if (statusElement) {
        statusValue = statusElement.value || "Tidak";
      }
    }

    // Collect all data
    const formData = {
      // Data Dokumen
      no_dok: getValue("no_dok"),
      no_revisi: getValue("no_revisi", "00"),
      tgl_efektif: getValue("tgl_efektif"),
      no_permohonan: getValue("no_permohonan"),

      // Data Kejadian
      tanggal_kejadian: getValue("tanggal_kejadian"),
      nama_pelapor: getValue("nama_pelapor"),
      nama_bidang: getValue("nama_bidang"),
      deskripsi_insiden: getValue("deskripsi_insiden"),
      jenis_insiden: getValue("jenis_insiden"),
      analisa_penyebab: getValue("analisa_penyebab"),

      // Tindakan
      tindak_smki: getValue("tindak_smki"),
      pic_tindak: getValue("pic_tindak"),
      tindak_pihak: getValue("tindak_pihak"),

      // Status
      selesai: statusValue,
      tanggal_penyelesaian: getValue("tanggal_penyelesaian"),

      // 5 Tanda Tangan (WAJIB SEMUA)
      ttd_pelapor: getValue("signatureData1", ""),
      ttd_atasan: getValue("signatureData2", ""),
      ttd_smki: getValue("signatureData3", ""),
      ttd_ketua: getValue("signatureData4", ""),
      ttd_smki2: getValue("signatureData5", ""),

      // 5 Nama Penandatangan
      nama_ttd_pelapor: getValue("nama_ttd_pelapor", ""),
      nama_ttd_atasan: getValue("nama_ttd_atasan", ""),
      nama_ttd_smki: getValue("nama_ttd_smki", ""),
      nama_ttd_ketua: getValue("nama_ttd_ketua", ""),
      nama_ttd_smki2: getValue("nama_ttd_smki2", ""),
    };

    return formData;
  }

  // ===============================
  // 7. GENERATE NOMOR PERMOHONAN
  // ===============================
  function generateNomorPermohonan() {
    const noPermohonanField = document.getElementById("no_permohonan");
    if (noPermohonanField && !noPermohonanField.value) {
      const now = new Date();
      const timestamp =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      noPermohonanField.value = `INS-${timestamp}`;
    }
  }

  // ===============================
  // 8. FORM SUBMISSION HANDLER
  // ===============================
  function setupFormSubmission() {
    const form = document.getElementById("formLaporan");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      console.log("📤 Form submission started");

      // Validasi semua data sebelum submit
      if (!validateStep1() || !validateStep2()) {
        showNotification(
          "Harap lengkapi semua data wajib sebelum submit!",
          "error",
        );
        return;
      }

      const confirmCheckbox = document.getElementById("confirmReview");
      if (!confirmCheckbox || !confirmCheckbox.checked) {
        showNotification(
          "Harap centang konfirmasi review sebelum submit!",
          "error",
        );
        confirmCheckbox.scrollIntoView({ behavior: "smooth", block: "center" });
        confirmCheckbox.focus();
        return;
      }

      // Konfirmasi akhir
      if (
        !confirm(
          "Apakah Anda yakin ingin mengirim laporan ini?\n\nData tidak dapat diubah setelah submit.",
        )
      ) {
        return;
      }

      const submitBtn = document.getElementById("finalSubmitBtn");
      const loadingDiv = document.getElementById("submitLoading");
      const errorDiv = document.getElementById("submitError");

      // UI Loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
      }

      if (loadingDiv) loadingDiv.style.display = "block";
      if (errorDiv) errorDiv.style.display = "none";

      try {
        const formData = collectFormData();

        // Kirim data ke API
        const response = await fetch("/api/laporan-insiden/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok && data.status === "ok") {
          showNotification(
            "✅ Laporan berhasil disimpan ke database!",
            "success",
          );

          // Update button
          if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
            submitBtn.classList.add("success");
          }

          // Redirect ke dashboard setelah berhasil
          setTimeout(() => {
            window.location.href = data.redirect || "/dashboard";
          }, 1500);
        } else {
          throw new Error(data.error || "Gagal menyimpan laporan");
        }
      } catch (error) {
        console.error("❌ Submission error:", error);

        // Show error in UI
        if (errorDiv) {
          errorDiv.style.display = "block";
          document.getElementById("errorMessage").textContent = error.message;
        }

        showNotification(`❌ ${error.message}`, "error");

        // Reset button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML =
            '<i class="fas fa-paper-plane"></i> Submit Laporan Insiden';
        }
      } finally {
        // Hide loading
        if (loadingDiv) loadingDiv.style.display = "none";
      }
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
      }, 3000);

      // Close button
      const closeBtn = document.getElementById("closeToast");
      if (closeBtn) {
        closeBtn.onclick = () => {
          toast.style.display = "none";
        };
      }
    } else {
      // Fallback ke alert jika toast tidak ada
      alert(message);
    }
  }

  // ===============================
  // 10. EXPORT FUNCTIONS UNTUK SIGNATURE.JS
  // ===============================
  window.navigateToStep = navigateToStep;
  window.showNotification = showNotification;
  window.collectFormData = collectFormData;
  window.validateStep2 = validateStep2;
  window.showFieldError = showFieldError;
  window.clearFieldError = clearFieldError;

  // ===============================
  // 11. START EVERYTHING
  // ===============================
  initializeForm();
});
