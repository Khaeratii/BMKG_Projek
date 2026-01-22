// ================================================
// FORM LAPORAN INSIDEN - 2 TAHAP (FIXED VERSION)
// JavaScript untuk form split-screen dan review
// ================================================

// Global variables
let currentStep = 1;
const totalSteps = 2;
let signaturePads = {};
let signaturesSaved = {};

// Generate nomor permohonan
// Generate nomor permohonan
function generateNomorPermohonan() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}.${min}`;
}

// Initialize form
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Form Laporan Insiden 2-Tahap Loaded");

  try {
    // Initialize everything
    initializeForm();
    setupEventListeners();
    setupSignaturePads();
    setupFormValidation();

    // Auto-generate nomor permohonan
    const noPermohonanField = document.getElementById("no_permohonan");
    if (noPermohonanField && !noPermohonanField.value) {
      noPermohonanField.value = generateNomorPermohonan();
    }

    // Set default dates
    setDefaultDates();

    console.log("✅ Form initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing form:", error);
    showNotification("Terjadi kesalahan saat memuat form", "error");
  }
});

// ================================================
// FORM INITIALIZATION
// ================================================

function initializeForm() {
  console.log("📝 Initializing form...");

  // Show first step
  showStep(1);

  // Update progress steps
  updateProgressSteps();

  // Setup tanggal penyelesaian toggle
  setupTanggalPenyelesaian();
}

function setupEventListeners() {
  // Review button
  const reviewButton = document.getElementById("reviewButton");
  if (reviewButton) {
    reviewButton.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToStep(2);
    });
  }

  // Back to form button
  const backToFormButton = document.getElementById("backToFormButton");
  if (backToFormButton) {
    backToFormButton.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToStep(1);
    });
  }

  // Confirm checkbox
  const confirmCheckbox = document.getElementById("confirmReview");
  const submitBtn = document.getElementById("finalSubmitBtn");

  if (confirmCheckbox && submitBtn) {
    confirmCheckbox.addEventListener("change", function () {
      submitBtn.disabled = !this.checked;
    });

    // Initial state
    submitBtn.disabled = !confirmCheckbox.checked;
  }

  // Progress steps click
  document.querySelectorAll(".step").forEach((step) => {
    step.addEventListener("click", function () {
      const stepNumber = parseInt(this.dataset.step);
      if (stepNumber < currentStep) {
        navigateToStep(stepNumber);
      }
    });
  });
}

// ================================================
// STEP NAVIGATION
// ================================================

function navigateToStep(stepNumber) {
  console.log(`🔄 Navigating to step ${stepNumber}`);

  // Validate current step before moving
  if (stepNumber === 2) {
    if (!validateStep1()) {
      showNotification("Harap lengkapi semua data wajib pada form!", "error");
      return;
    }
  }

  // Update current step
  currentStep = stepNumber;

  // Show step
  showStep(stepNumber);

  // Update progress steps
  updateProgressSteps();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Generate review if going to step 2
  if (stepNumber === 2) {
    setTimeout(generateReview, 300);
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

function updateProgressSteps() {
  document.querySelectorAll(".step").forEach((step) => {
    const stepNumber = parseInt(step.dataset.step);

    step.classList.remove("active", "completed");

    if (stepNumber === currentStep) {
      step.classList.add("active");
    } else if (stepNumber < currentStep) {
      step.classList.add("completed");
    }
  });
}

// ================================================
// FORM VALIDATION
// ================================================

function setupFormValidation() {
  // Setup tanggal penyelesaian toggle
  const selesaiRadios = document.querySelectorAll('input[name="selesai"]');
  const tanggalPenyelesaianGroup = document.getElementById(
    "tanggalPenyelesaianGroup",
  );

  if (selesaiRadios.length > 0 && tanggalPenyelesaianGroup) {
    selesaiRadios.forEach((radio) => {
      radio.addEventListener("change", function () {
        if (this.value === "Ya") {
          tanggalPenyelesaianGroup.style.display = "block";
          // Set default date tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tanggalInput = document.getElementById("tanggal_penyelesaian");
          if (tanggalInput && !tanggalInput.value) {
            tanggalInput.value = tomorrow.toISOString().split("T")[0];
          }
        } else {
          tanggalPenyelesaianGroup.style.display = "none";
        }
      });
    });

    // Set initial state
    const checkedRadio = document.querySelector(
      'input[name="selesai"]:checked',
    );
    if (checkedRadio) {
      tanggalPenyelesaianGroup.style.display =
        checkedRadio.value === "Ya" ? "block" : "none";
    }
  }

  // Clear errors on input
  document.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", function () {
      clearFieldError(this);
    });

    // Juga clear error saat field diubah
    field.addEventListener("change", function () {
      clearFieldError(this);
    });
  });
}

function setupTanggalPenyelesaian() {
  const selesaiRadios = document.querySelectorAll('input[name="selesai"]');
  const tanggalGroup = document.getElementById("tanggalPenyelesaianGroup");

  if (selesaiRadios.length > 0 && tanggalGroup) {
    selesaiRadios.forEach((radio) => {
      radio.addEventListener("change", function () {
        tanggalGroup.style.display = this.value === "Ya" ? "block" : "none";
      });
    });
  }
}

function validateStep1() {
  console.log("🔍 Validating Step 1...");

  // Required fields configuration
  const requiredFields = [
    { id: "no_dok", name: "Nomor Dokumen" },
    { id: "tgl_efektif", name: "Tanggal Efektif" },
    { id: "tanggal_kejadian", name: "Tanggal Kejadian" },
    { id: "nama_pelapor", name: "Nama Pelapor" },
    { id: "nama_bidang", name: "Nama Bidang" },
    { id: "deskripsi_insiden", name: "Deskripsi Insiden" },
    { id: "jenis_insiden", name: "Jenis Insiden" },
    { id: "analisa_penyebab", name: "Analisa Penyebab" },
    { id: "tindak_smki", name: "Tindak Lanjut SMKI" },
    { id: "pic_tindak", name: "PIC Tindak Lanjut" },
  ];

  let isValid = true;
  let firstErrorField = null;
  let errorMessage = "";

  // Validate each required field
  for (const field of requiredFields) {
    const element = document.getElementById(field.id);
    if (!element) continue;

    let value = "";

    if (element.tagName === "SELECT") {
      value = element.value;
    } else if (element.type === "radio") {
      const radioChecked = document.querySelector(
        `input[name="${element.name}"]:checked`,
      );
      value = radioChecked ? radioChecked.value : "";
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

  // Validate tanda tangan
  const requiredSignatures = [
    { id: "signatureData1", name: "Tanda Tangan Pelapor" },
    { id: "signatureData2", name: "Tanda Tangan Atasan" },
    { id: "signatureData3", name: "Tanda Tangan SMKI" },
  ];

  for (const signature of requiredSignatures) {
    const signatureData = document.getElementById(signature.id);
    if (!signatureData) continue;

    const value = signatureData.value ? signatureData.value.trim() : "";
    if (!value) {
      // Highlight signature canvas
      const canvasId = signature.id.replace("signatureData", "signatureCanvas");
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        canvas.style.border = "2px solid var(--bmkg-error)";
        canvas.style.boxShadow = "0 0 0 3px rgba(220, 53, 69, 0.1)";
      }

      isValid = false;

      if (!firstErrorField && canvas) {
        firstErrorField = canvas;
        errorMessage = `${signature.name} belum dibuat`;
      }
    } else {
      // Clear canvas highlight if signature exists
      const canvasId = signature.id.replace("signatureData", "signatureCanvas");
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        canvas.style.border = "";
        canvas.style.boxShadow = "";
      }
    }
  }

  // Validate nama penandatangan untuk tanda tangan yang sudah ada
  const signatureNames = [
    {
      signatureId: "signatureData1",
      nameId: "nama_ttd_pelapor",
      name: "Nama Pelapor Penandatangan",
    },
    {
      signatureId: "signatureData2",
      nameId: "nama_ttd_atasan",
      name: "Nama Atasan Penandatangan",
    },
    {
      signatureId: "signatureData3",
      nameId: "nama_ttd_smki",
      name: "Nama SMKI Penandatangan",
    },
    {
      signatureId: "signatureData4",
      nameId: "nama_ttd_ketua",
      name: "Nama Ketua Penandatangan",
    },
    {
      signatureId: "signatureData5",
      nameId: "nama_ttd_smki2",
      name: "Nama SMKI 2 Penandatangan",
    },
  ];

  for (const sig of signatureNames) {
    const signatureData = document.getElementById(sig.signatureId);
    const nameElement = document.getElementById(sig.nameId);

    if (signatureData && nameElement) {
      const signatureValue = signatureData.value
        ? signatureData.value.trim()
        : "";
      const nameValue = nameElement.value ? nameElement.value.trim() : "";

      // Jika ada tanda tangan, nama WAJIB diisi
      if (signatureValue && !nameValue) {
        showFieldError(
          nameElement,
          `${sig.name} wajib diisi karena ada tanda tangan`,
        );
        isValid = false;

        if (!firstErrorField) {
          firstErrorField = nameElement;
          errorMessage = `${sig.name} belum diisi`;
        }
      } else if (!signatureValue && nameValue) {
        // Jika ada nama tapi tidak ada tanda tangan, hanya warning untuk yang wajib
        if (["Pelapor", "Atasan", "SMKI"].includes(sig.name.split(" ")[1])) {
          showFieldError(
            nameElement,
            `${sig.name} harus diikuti dengan tanda tangan`,
          );
          isValid = false;

          if (!firstErrorField) {
            firstErrorField = nameElement;
            errorMessage = `${sig.name} tidak memiliki tanda tangan`;
          }
        }
      } else {
        clearFieldError(nameElement);
      }
    }
  }

  // Validate tanggal penyelesaian jika insiden selesai
  const selesaiYa = document.querySelector(
    'input[name="selesai"][value="Ya"]:checked',
  );
  if (selesaiYa) {
    const tanggalPenyelesaian = document.getElementById("tanggal_penyelesaian");
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
    }
  }

  // Scroll to first error
  if (firstErrorField) {
    setTimeout(() => {
      firstErrorField.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      if (firstErrorField.focus && firstErrorField.tagName !== "CANVAS") {
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
  // Add error class to element
  element.classList.add("error");

  // Create or update error message
  let errorDiv = element.parentElement.querySelector(".error-message");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.className = "error-message";

    // Insert after the element
    if (element.parentElement) {
      element.parentElement.appendChild(errorDiv);
    }
  }

  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  errorDiv.style.display = "block";
}

function clearFieldError(element) {
  element.classList.remove("error");
  element.style.border = "";
  element.style.boxShadow = "";

  // Remove error message
  const errorDiv = element.parentElement.querySelector(".error-message");
  if (errorDiv) {
    errorDiv.remove();
  }

  // Clear canvas border
  if (element.id && element.id.includes("signatureCanvas")) {
    element.style.border = "";
    element.style.boxShadow = "";
  }
}

// ================================================
// SIGNATURE PAD FUNCTIONS
// ================================================

function setupSignaturePads() {
  console.log("🖊️ Setting up signature pads...");

  // Initialize all signature pads (1-5)
  for (let i = 1; i <= 5; i++) {
    initializeSignaturePad(i);
  }
}

function initializeSignaturePad(signatureNumber) {
  const canvasId = `signatureCanvas${signatureNumber}`;
  const canvas = document.getElementById(canvasId);

  if (!canvas) {
    console.warn(`Canvas ${canvasId} not found`);
    return;
  }

  // Initialize SignaturePad
  signaturePads[signatureNumber] = new SignaturePad(canvas, {
    backgroundColor: "rgb(255, 255, 255)",
    penColor: "rgb(0, 0, 0)",
    velocityFilterWeight: 0.7,
    minWidth: 0.5,
    maxWidth: 2.5,
    throttle: 16,
    minPointDistance: 3,
  });

  // Setup clear button
  const clearBtn = document.getElementById(
    `clearSignatureBtn${signatureNumber}`,
  );
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      clearSignature(signatureNumber);
    });
  }

  // Setup save button
  const saveBtn = document.getElementById(`saveSignatureBtn${signatureNumber}`);
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      saveSignature(signatureNumber);
    });
  }

  // Add drawing event to show visual feedback
  canvas.addEventListener("mousedown", function () {
    canvas.classList.add("drawing");
    clearFieldError(canvas); // Clear error when user starts drawing
  });

  canvas.addEventListener("mouseup", function () {
    canvas.classList.remove("drawing");
  });

  canvas.addEventListener("touchstart", function () {
    canvas.classList.add("drawing");
    clearFieldError(canvas); // Clear error when user starts drawing
  });

  canvas.addEventListener("touchend", function () {
    canvas.classList.remove("drawing");
  });

  // Handle window resize
  window.addEventListener("resize", function () {
    resizeSignatureCanvas(signatureNumber);
  });

  // Initial resize
  setTimeout(() => {
    resizeSignatureCanvas(signatureNumber);
  }, 200);
}

function resizeSignatureCanvas(signatureNumber) {
  const canvasId = `signatureCanvas${signatureNumber}`;
  const canvas = document.getElementById(canvasId);

  if (!canvas) return;

  // Get container dimensions
  const container = canvas.parentElement;
  if (!container) return;

  // Store original data
  const signaturePad = signaturePads[signatureNumber];
  const dataUrl = signaturePad ? signaturePad.toDataURL() : null;

  // Set canvas dimensions to match container
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = container.clientWidth * ratio;
  canvas.height = container.clientHeight * ratio;
  canvas.getContext("2d").scale(ratio, ratio);

  // Redraw signature if it exists
  if (dataUrl && signaturePad && !signaturePad.isEmpty()) {
    signaturePad.clear();
    signaturePad.fromDataURL(dataUrl);
  }
}

function saveSignature(signatureNumber) {
  const signaturePad = signaturePads[signatureNumber];
  const canvas = document.getElementById(`signatureCanvas${signatureNumber}`);
  const dataField = document.getElementById(`signatureData${signatureNumber}`);
  const previewContainer = document.getElementById(
    `previewSignature${signatureNumber}`,
  );

  if (!signaturePad || signaturePad.isEmpty()) {
    showNotification(
      `Tanda tangan ${getSignatureLabel(signatureNumber)} masih kosong!`,
      "error",
    );
    if (canvas) {
      canvas.style.border = "2px solid var(--bmkg-error)";
      canvas.style.boxShadow = "0 0 0 3px rgba(220, 53, 69, 0.1)";
    }
    return;
  }

  // Get signature as data URL
  const dataUrl = signaturePad.toDataURL();

  // Save to hidden field
  if (dataField) {
    dataField.value = dataUrl;
    console.log(`✅ Signature ${signatureNumber} saved to hidden field`);
  }

  // Create preview
  if (previewContainer) {
    previewContainer.innerHTML = `
            <div class="signature-preview-saved">
                <img src="${dataUrl}" alt="Tanda Tangan ${getSignatureLabel(signatureNumber)}" style="max-height: 60px; max-width: 100%;">
                <p style="margin-top: 8px; color: var(--bmkg-success); font-size: 14px;">
                    <i class="fas fa-check-circle"></i> Tanda tangan disimpan
                </p>
            </div>
        `;
  }

  // Mark as saved
  signaturesSaved[signatureNumber] = true;

  // Visual feedback
  if (canvas) {
    canvas.style.border = "2px solid var(--bmkg-success)";
    canvas.style.boxShadow = "0 0 0 3px rgba(40, 167, 69, 0.1)";
    canvas.classList.add("saved");
  }

  showNotification(
    `✅ Tanda tangan ${getSignatureLabel(signatureNumber)} berhasil disimpan!`,
    "success",
  );

  // Clear any error messages
  if (canvas) clearFieldError(canvas);

  // Remove saved class after animation
  setTimeout(() => {
    if (canvas) canvas.classList.remove("saved");
  }, 2000);
}

function clearSignature(signatureNumber) {
  const signaturePad = signaturePads[signatureNumber];
  const canvas = document.getElementById(`signatureCanvas${signatureNumber}`);
  const dataField = document.getElementById(`signatureData${signatureNumber}`);
  const previewContainer = document.getElementById(
    `previewSignature${signatureNumber}`,
  );

  if (signaturePad) {
    signaturePad.clear();
  }

  // Clear data
  if (dataField) {
    dataField.value = "";
  }

  // Clear preview
  if (previewContainer) {
    previewContainer.innerHTML = "";
  }

  // Clear saved state
  signaturesSaved[signatureNumber] = false;

  // Reset canvas style
  if (canvas) {
    canvas.style.border = "";
    canvas.style.boxShadow = "";
    canvas.classList.remove("saved");
  }

  // Clear error
  if (canvas) clearFieldError(canvas);

  // Clear nama field jika perlu
  const nameFieldId = `nama_ttd_${getSignatureLabel(signatureNumber).toLowerCase().replace(/\s+/g, "_")}`;
  const nameField = document.getElementById(nameFieldId);
  if (nameField) {
    nameField.value = "";
    clearFieldError(nameField);
  }

  showNotification(
    `Tanda tangan ${getSignatureLabel(signatureNumber)} dihapus`,
    "info",
  );
}

function getSignatureLabel(signatureNumber) {
  const labels = {
    1: "Pelapor",
    2: "Atasan",
    3: "SMKI",
    4: "Ketua",
    5: "SMKI 2",
  };

  return labels[signatureNumber] || `Signature ${signatureNumber}`;
}

// ================================================
// REVIEW STEP FUNCTIONS
// ================================================

function generateReview() {
  console.log("🔍 Generating review...");

  const reviewLoading = document.getElementById("reviewLoading");
  const reviewContent = document.getElementById("reviewContent");
  const reviewActions = document.getElementById("reviewActions");

  // Show loading
  if (reviewLoading) reviewLoading.style.display = "flex";
  if (reviewContent) reviewContent.style.display = "none";
  if (reviewActions) reviewActions.style.display = "none";

  // Collect form data
  const formData = collectFormData();
  console.log("📋 Form data collected:", formData);

  // Update review after short delay (for loading effect)
  setTimeout(() => {
    try {
      updateReviewFields(formData);
      updateSignatureStatus(formData);

      // Show content
      if (reviewLoading) reviewLoading.style.display = "none";
      if (reviewContent) reviewContent.style.display = "block";
      if (reviewActions) reviewActions.style.display = "block";

      // Enable/disable submit button based on confirmation
      const confirmCheckbox = document.getElementById("confirmReview");
      const submitBtn = document.getElementById("finalSubmitBtn");
      if (confirmCheckbox && submitBtn) {
        submitBtn.disabled = !confirmCheckbox.checked;
      }

      console.log("✅ Review generated successfully");
    } catch (error) {
      console.error("❌ Error generating review:", error);
      showNotification("Terjadi kesalahan saat membuat review", "error");

      // Show error state
      if (reviewLoading) reviewLoading.style.display = "none";
      if (reviewContent) {
        reviewContent.innerHTML = `
                    <div class="review-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Error Generating Review</h4>
                        <p>${error.message}</p>
                        <button onclick="generateReview()" class="btn btn-primary">
                            <i class="fas fa-redo"></i> Coba Lagi
                        </button>
                    </div>
                `;
        reviewContent.style.display = "block";
      }
    }
  }, 500);
}

function collectFormData() {
  const formData = {};

  // Helper function to get value
  function getValue(id, defaultValue = "") {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`Element ${id} not found`);
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

  // Collect all data
  formData.no_dok = getValue("no_dok");
  formData.no_revisi = getValue("no_revisi", "00");
  formData.tgl_efektif = getValue("tgl_efektif");
  formData.no_permohonan = getValue("no_permohonan");
  formData.tanggal_kejadian = getValue("tanggal_kejadian");
  formData.nama_pelapor = getValue("nama_pelapor");
  formData.nama_bidang = getValue("nama_bidang");
  formData.deskripsi_insiden = getValue("deskripsi_insiden");
  formData.jenis_insiden = getValue("jenis_insiden");
  formData.analisa_penyebab = getValue("analisa_penyebab");
  formData.tindak_smki = getValue("tindak_smki");
  formData.pic_tindak = getValue("pic_tindak");
  formData.tindak_pihak = getValue("tindak_pihak");
  formData.selesai =
    document.querySelector('input[name="selesai"]:checked')?.value || "Tidak";
  formData.tanggal_penyelesaian = getValue("tanggal_penyelesaian");

  // PERBAIKAN: Signature data - gunakan ID yang benar
  const signatureFields = [
    { key: "ttd_pelapor", id: "signatureData1", nameId: "nama_ttd_pelapor" },
    { key: "ttd_atasan", id: "signatureData2", nameId: "nama_ttd_atasan" },
    { key: "ttd_smki", id: "signatureData3", nameId: "nama_ttd_smki" },
    { key: "ttd_ketua", id: "signatureData4", nameId: "nama_ttd_ketua" },
    { key: "ttd_smki2", id: "signatureData5", nameId: "nama_ttd_smki2" },
  ];

  signatureFields.forEach((field) => {
    formData[field.key] = getValue(field.id, "");
    formData[field.nameId] = getValue(field.nameId, "");

    // Debug logging
    if (field.key === "ttd_smki2") {
      console.log(`📝 SMKI2 Data:`, {
        signature: formData[field.key] ? "Ada" : "Kosong",
        name: formData[field.nameId] || "Kosong",
        elementId: field.id,
        elementExists: !!document.getElementById(field.id),
        elementValue: document.getElementById(field.id)?.value || "Kosong",
      });
    }
  });

  return formData;
}

function updateReviewFields(formData) {
  console.log("🔄 Updating review fields...");
  console.log("📊 Form data for review:", formData);

  // Format date function
  function formatDate(dateStr) {
    if (!dateStr || dateStr === "-") return "-";
    try {
      // Handle both YYYY-MM-DD and other formats
      let date;
      if (dateStr.includes("-")) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) return dateStr;

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.warn("Error formatting date:", dateStr, e);
      return dateStr;
    }
  }

  // Update each field
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
    { source: "no_permohonan", target: "reviewNoPermohonan" },
  ];

  fieldMap.forEach(({ source, target }) => {
    const element = document.getElementById(target);
    if (element) {
      let value = formData[source] || "-";

      // Format dates
      if (source.includes("tgl") || source.includes("tanggal")) {
        value = formatDate(value);
      }

      element.textContent = value;
    }
  });

  // Update tanggal kejadian
  const tanggalKejadianElement = document.getElementById(
    "reviewTanggalKejadian",
  );
  if (tanggalKejadianElement) {
    tanggalKejadianElement.textContent = formatDate(formData.tanggal_kejadian);
  }

  // Update status
  const statusBadge = document.getElementById("reviewStatus");
  if (statusBadge) {
    const status = formData.selesai || "Tidak";
    statusBadge.textContent = status === "Ya" ? "SELESAI" : "BELUM SELESAI";
    statusBadge.className = `status-badge ${status === "Ya" ? "completed" : "error"}`;
  }

  // PERBAIKAN: Update signature names - gunakan field yang benar
  const signatureNames = [
    { key: "nama_ttd_pelapor", target: "reviewNamaTTDPelapor" },
    { key: "nama_ttd_atasan", target: "reviewNamaTTDAtasan" },
    { key: "nama_ttd_smki", target: "reviewNamaTTDSMKI" },
    { key: "nama_ttd_ketua", target: "reviewNamaTTDKetua" },
    { key: "nama_ttd_smki2", target: "reviewNamaTTDSMKI2" },
  ];

  signatureNames.forEach(({ key, target }) => {
    const element = document.getElementById(target);
    if (element) {
      const value = formData[key] || "-";
      element.textContent = value;
      console.log(`✅ ${target}: ${value}`);
    }
  });
}

function updateSignatureStatus(formData) {
  console.log("🔏 Updating signature status...");

  const signatureStatus = [
    {
      key: "ttd_pelapor",
      label: "Pelapor",
      statusId: "reviewStatusTTDPelapor",
    },
    { key: "ttd_atasan", label: "Atasan", statusId: "reviewStatusTTDAtasan" },
    { key: "ttd_smki", label: "SMKI", statusId: "reviewStatusTTDSMKI" },
    { key: "ttd_ketua", label: "Ketua", statusId: "reviewStatusTTDKetua" },
    { key: "ttd_smki2", label: "SMKI 2", statusId: "reviewStatusTTDSMKI2" },
  ];

  signatureStatus.forEach(({ key, label, statusId }) => {
    const statusElement = document.getElementById(statusId);
    if (statusElement) {
      const hasSignature = formData[key] && formData[key].trim() !== "";

      console.log(`🔍 ${label} (${key}):`, {
        hasSignature,
        value: formData[key] ? "Ada data" : "Kosong",
        length: formData[key]?.length || 0,
      });

      if (hasSignature) {
        statusElement.innerHTML =
          '<span class="status-badge completed">✓ LENGKAP</span>';
      } else if (["Pelapor", "Atasan", "SMKI"].includes(label)) {
        statusElement.innerHTML =
          '<span class="status-badge error">BELUM</span>';
      } else {
        statusElement.innerHTML = '<span class="status-badge">OPSIONAL</span>';
      }
    }
  });
}

// ================================================
// FORM SUBMISSION (DIPERBAIKI)
// ================================================

// Setup form submission
function setupFormSubmission() {
  const form = document.getElementById("formLaporan");
  if (!form) {
    console.error("Form element not found");
    return;
  }

  form.addEventListener("submit", handleFormSubmit);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  console.log("📤 Form submission started");

  // Final validation
  if (!validateStep1()) {
    showNotification(
      "Harap lengkapi semua data wajib sebelum submit!",
      "error",
    );
    navigateToStep(1);
    return;
  }

  // Check confirmation
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

  // Final confirmation
  if (
    !confirm(
      "Apakah Anda yakin ingin mengirim laporan ini?\n\nData tidak dapat diubah setelah submit.",
    )
  ) {
    return;
  }

  // Get form elements
  const submitBtn = document.getElementById("finalSubmitBtn");
  const loadingDiv = document.getElementById("submitLoading");
  const errorDiv = document.getElementById("submitError");
  const errorMessageEl = document.getElementById("errorMessage");

  // Show loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  }

  if (loadingDiv) loadingDiv.style.display = "flex";
  if (errorDiv) {
    errorDiv.style.display = "none";
    if (errorMessageEl) errorMessageEl.textContent = "";
  }

  try {
    const formData = collectFormData();
    console.log("📤 Sending form data:", formData);

    // Kirim sebagai JSON
    const response = await fetch("/api/laporan-insiden/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
      body: JSON.stringify(formData),
    });

    console.log("📥 Response status:", response.status);

    let result;
    try {
      result = await response.json();
      console.log("📥 Response data:", result);
    } catch (jsonError) {
      console.error("❌ JSON parse error:", jsonError);
      const text = await response.text();
      console.error("📥 Response text:", text);
      throw new Error("Format respons server tidak valid");
    }

    if (response.ok) {
      // PERBAIKAN: Handle berbagai format respons sukses
      if (
        result.status === "success" ||
        result.status === "ok" ||
        result.success ||
        result.message?.includes("berhasil")
      ) {
        showNotification(
          "✅ Laporan berhasil disimpan ke database!",
          "success",
        );

        // Update button to show success
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
          submitBtn.classList.add("success");
        }

        // Redirect to dashboard after delay
        setTimeout(() => {
          const redirectUrl = result.redirect || "/dashboard";
          console.log(`🔄 Redirecting to: ${redirectUrl}`);
          window.location.href = redirectUrl;
        }, 2000);
      } else {
        throw new Error(result.message || "Gagal menyimpan laporan");
      }
    } else {
      throw new Error(result.message || `Server error: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Submission error:", error);

    // Show error
    if (errorDiv) {
      errorDiv.style.display = "flex";
      if (errorMessageEl) {
        errorMessageEl.textContent =
          error.message || "Terjadi kesalahan saat menyimpan data";
      }
    }

    showNotification(
      `❌ ${error.message || "Gagal menyimpan laporan"}`,
      "error",
    );

    // Reset button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Laporan';
      submitBtn.classList.remove("success");
    }
  } finally {
    // Hide loading
    if (loadingDiv) loadingDiv.style.display = "none";
  }
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

function setDefaultDates() {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Format: YYYY-MM-DD
  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  // Set tanggal efektif to today
  const tglEfektif = document.getElementById("tgl_efektif");
  if (tglEfektif && !tglEfektif.value) {
    tglEfektif.value = formatDate(today);
  }

  // Set tanggal kejadian to today
  const tanggalKejadian = document.getElementById("tanggal_kejadian");
  if (tanggalKejadian && !tanggalKejadian.value) {
    tanggalKejadian.value = formatDate(today);
  }

  // Set tanggal penyelesaian to tomorrow (default jika insiden selesai)
  const tanggalPenyelesaian = document.getElementById("tanggal_penyelesaian");
  if (tanggalPenyelesaian) {
    // Only set if not already set
    if (!tanggalPenyelesaian.value) {
      tanggalPenyelesaian.value = formatDate(tomorrow);
    }
  }
}

function showNotification(message, type = "info") {
  console.log(`📢 Notification [${type}]: ${message}`);

  const toast = document.getElementById("notificationToast");
  const toastMessage = document.getElementById("toastMessage");

  if (!toast || !toastMessage) {
    // Fallback to alert if toast not found
    console.log(`Notification: ${message}`);
    return;
  }

  // Set message
  toastMessage.textContent = message;

  // Set type and icon
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

  // Show toast
  toast.style.display = "flex";

  // Auto hide after 5 seconds
  const hideTimeout = setTimeout(() => {
    toast.style.display = "none";
  }, 5000);

  // Setup close button
  const closeBtn = document.getElementById("closeToast");
  if (closeBtn) {
    // Remove existing listeners
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    newCloseBtn.addEventListener("click", function () {
      clearTimeout(hideTimeout);
      toast.style.display = "none";
    });
  }
}

// ================================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ================================================

window.navigateToStep = navigateToStep;
window.validateStep1 = validateStep1;
window.showNotification = showNotification;
window.saveSignature = saveSignature;
window.clearSignature = clearSignature;
window.collectFormData = collectFormData;
window.generateReview = generateReview;

// ================================================
// WINDOW RESIZE HANDLER
// ================================================

window.addEventListener("resize", function () {
  // Resize all signature canvases
  for (let i = 1; i <= 5; i++) {
    if (signaturePads[i]) {
      setTimeout(() => resizeSignatureCanvas(i), 100);
    }
  }
});

// ================================================
// INITIALIZE FORM SUBMISSION
// ================================================

// Initialize form submission after everything is loaded
setTimeout(() => {
  setupFormSubmission();
  console.log("✅ Form submission handler initialized");
}, 1000);

console.log("✅ Form JavaScript loaded successfully");
