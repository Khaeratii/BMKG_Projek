/**
 * Form Complete - BMKG
 * JavaScript untuk form lengkap semua tahap (5 Steps)
 * Versi: 2.2 - Simplified (No Draft, No Print)
 */

// ==================== GLOBAL VARIABLES ====================
let currentStep = 1;
const totalSteps = 5;
const signatures = {
  pemohon: null,
  approval: null,
  implementation: null,
};
let lastValidationTime = 0; // Untuk mencegah peringatan terlalu sering

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", function () {
  console.log("Form Complete JavaScript loaded");

  // Initialize core components
  initializeForm();
  initializeSignatures();
  setupEventListeners();
  setupReviewStep();

  // Set initial step
  showStep(1);
});

function initializeForm() {
  console.log("📝 Initializing form...");

  // Set default dates
  setDefaultDates();

  // Initialize character counters
  setupCharacterCounters();

  // Setup approval radio buttons
  setupApprovalListeners();

  // Setup editable fields
  setupEditableFields();

  // Setup form submission
  setupFormSubmission();

  console.log("✅ Form initialization complete");
}

function setDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatDate = (date) => date.toISOString().split("T")[0];

  // Set minimum dates for future dates
  const futureDateInputs = [
    { id: "tglEfektif", minDate: tomorrow },
    { id: "hasilDibutuhkan", minDate: nextWeek },
    { id: "tanggalPelaksanaan", minDate: tomorrow },
    { id: "tanggalRilis", minDate: tomorrow },
  ];

  futureDateInputs.forEach(({ id, minDate }) => {
    const input = document.getElementById(id);
    if (input) {
      input.min = formatDate(minDate);
      if (!input.value) {
        input.value = formatDate(minDate);
      }
    }
  });

  // Set today's date for proposal date
  const tanggalInput = document.getElementById("tanggalInput");
  if (tanggalInput && !tanggalInput.value) {
    tanggalInput.value = formatDate(today);
  }
}

function setupCharacterCounters() {
  const textareas = document.querySelectorAll(".form-textarea[name]");

  textareas.forEach((textarea) => {
    const counter = document.getElementById(`${textarea.name}Counter`);
    if (counter) {
      updateCounter(counter, textarea.value.length);
      textarea.addEventListener("input", () => {
        updateCounter(counter, textarea.value.length);
      });
    }
  });
}

function updateCounter(counter, count) {
  counter.textContent = `${count} karakter`;
}

function setupApprovalListeners() {
  const approvalRadios = document.querySelectorAll(
    'input[name="status_persetujuan"]',
  );

  approvalRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      const isApproved = this.value === "disetujui";

      // Toggle visibility based on approval status
      const elements = {
        tanggalPelaksanaanGroup: document.getElementById(
          "tanggalPelaksanaanGroup",
        ),
        picPelaksanaGroup: document.getElementById("picPelaksanaGroup"),
        catatanPersetujuanGroup: document.getElementById(
          "catatanPersetujuanGroup",
        ),
        catatanPenolakanGroup: document.getElementById("catatanPenolakanGroup"),
      };

      for (const [id, element] of Object.entries(elements)) {
        if (element) {
          const shouldShow = id.includes("Penolakan")
            ? !isApproved
            : isApproved;
          element.style.display = shouldShow ? "block" : "none";
        }
      }

      // Update required attributes
      const tanggalInput = document.getElementById("tanggalPelaksanaan");
      const picInput = document.querySelector('input[name="pic_pelaksana"]');
      const catatanInput = document.querySelector(
        'textarea[name="catatan_penolakan"]',
      );

      if (tanggalInput) tanggalInput.required = isApproved;
      if (picInput) picInput.required = isApproved;
      if (catatanInput) catatanInput.required = !isApproved;
    });
  });
}

function setupEditableFields() {
  console.log("Setting up editable fields...");

  // Field yang bisa diedit: No Dokumen, Diminta Oleh, Jabatan
  const editableFields = ["noDokumenInput", "dimintaOlehInput", "jabatanInput"];

  editableFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      // Pastikan field tidak readonly
      field.removeAttribute("readonly");

      // Hapus placeholder untuk field kosong
      field.addEventListener("focus", function () {
        if (this.hasAttribute("data-placeholder")) {
          if (this.value === this.getAttribute("data-placeholder")) {
            this.value = "";
          }
        }
      });

      field.addEventListener("blur", function () {
        if (this.hasAttribute("data-placeholder")) {
          if (this.value === "") {
            this.value = this.getAttribute("data-placeholder");
          }
        }
      });

      // Tambahkan visual feedback
      field.addEventListener("input", function () {
        if (this.value.trim() === "") {
          this.classList.add("field-empty");
        } else {
          this.classList.remove("field-empty");
        }
      });
    }
  });
}

// ==================== SIGNATURE SYSTEMS ====================

function initializeSignatures() {
  console.log("Initializing signature systems...");

  // Initialize all three signature systems
  initializeSignature("signatureCanvas", "signatureData", "pemohon");
  initializeSignature("signatureCanvas2", "signatureData2", "approval");
  initializeSignature("signatureCanvas3", "signatureData3", "implementation");

  // Setup file upload for all three sections
  setupFileUploads();
  setupSignatureOptions();
}

function initializeSignature(canvasId, dataId, type) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  const drawingHistory = [];

  // Set canvas size
  function resizeCanvas() {
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = 200;

    // Set display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Set actual size
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;

    // Scale context
    ctx.scale(scale, scale);

    // Clear canvas
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Set drawing properties
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";
  }

  resizeCanvas();

  // Drawing functions
  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();

    if (e.type.includes("touch")) {
      lastX = e.touches[0].clientX - rect.left;
      lastY = e.touches[0].clientY - rect.top;
    } else {
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    }

    // Hide placeholder
    const placeholder = canvas.parentElement.querySelector(
      ".signature-placeholder",
    );
    if (placeholder) placeholder.style.display = "none";

    // Save state for undo
    drawingHistory.push(canvas.toDataURL());
    if (drawingHistory.length > 10) drawingHistory.shift();

    e.preventDefault();
  }

  function draw(e) {
    if (!isDrawing) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    let x, y;

    if (e.type.includes("touch")) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX = x;
    lastY = y;
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    updateSignatureData(type);
  }

  // Event listeners
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // Touch events
  canvas.addEventListener("touchstart", startDrawing);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", stopDrawing);

  // Window resize
  window.addEventListener("resize", () => {
    setTimeout(resizeCanvas, 100);
  });

  // Store methods on canvas
  canvas.clear = () => {
    const width = canvas.parentElement.clientWidth;
    const height = 200;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Clear history
    drawingHistory.length = 0;

    // Show placeholder
    const placeholder = canvas.parentElement.querySelector(
      ".signature-placeholder",
    );
    if (placeholder) placeholder.style.display = "block";

    updateSignatureData(type);
  };

  canvas.undo = () => {
    if (drawingHistory.length === 0) return;

    drawingHistory.pop();
    const width = canvas.parentElement.clientWidth;
    const height = 200;

    // Clear canvas
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    if (drawingHistory.length > 0) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        updateSignatureData(type);
      };
      img.src = drawingHistory[drawingHistory.length - 1];
    } else {
      const placeholder = canvas.parentElement.querySelector(
        ".signature-placeholder",
      );
      if (placeholder) placeholder.style.display = "block";
      signatures[type] = null;
      document.getElementById(dataId).value = "";
    }
  };

  // Set up clear and undo buttons
  const clearBtn = document.getElementById(
    `clear${canvasId.replace("signatureCanvas", "SignatureBtn")}`,
  );
  const undoBtn = document.getElementById(
    `undo${canvasId.replace("signatureCanvas", "SignatureBtn")}`,
  );

  if (clearBtn) clearBtn.addEventListener("click", canvas.clear);
  if (undoBtn) undoBtn.addEventListener("click", canvas.undo);
}

function setupFileUploads() {
  // Setup for all three signature sections
  const uploadConfigs = [
    { section: 1, type: "pemohon" },
    { section: 2, type: "approval" },
    { section: 3, type: "implementation" },
  ];

  uploadConfigs.forEach(({ section, type }) => {
    const suffix = section === 1 ? "" : section;
    setupFileUpload(
      `uploadArea${suffix}`,
      `signatureFile${suffix}`,
      `previewContainer${suffix}`,
      `signaturePreview${suffix}`,
      `removePreviewBtn${suffix}`,
      `signatureData${section === 1 ? "" : section}`,
      type,
    );
  });
}

function setupFileUpload(
  uploadAreaId,
  fileInputId,
  previewContainerId,
  previewImgId,
  removeBtnId,
  dataInputId,
  signatureType,
) {
  const uploadArea = document.getElementById(uploadAreaId);
  const fileInput = document.getElementById(fileInputId);
  const previewContainer = document.getElementById(previewContainerId);
  const previewImg = document.getElementById(previewImgId);
  const removeBtn = document.getElementById(removeBtnId);
  const dataInput = document.getElementById(dataInputId);

  if (!uploadArea || !fileInput) return;

  // Click to upload
  uploadArea.addEventListener("click", () => fileInput.click());

  // Drag and drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () =>
    uploadArea.classList.remove("dragover"),
  );

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelect(
        fileInput,
        previewImg,
        previewContainer,
        uploadArea,
        dataInput,
        signatureType,
      );
    }
  });

  // File selection
  fileInput.addEventListener("change", (e) =>
    handleFileSelect(
      e.target,
      previewImg,
      previewContainer,
      uploadArea,
      dataInput,
      signatureType,
    ),
  );

  // Remove preview
  if (removeBtn) {
    removeBtn.addEventListener("click", () =>
      removeUploadedSignature(
        fileInput,
        previewContainer,
        uploadArea,
        previewImg,
        dataInput,
        signatureType,
      ),
    );
  }
}

function handleFileSelect(
  fileInput,
  previewImg,
  previewContainer,
  uploadArea,
  dataInput,
  signatureType,
) {
  const file = fileInput.files[0];
  if (!file) return;

  // Validate file
  const validTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (!validTypes.includes(file.type)) {
    showToast("Hanya file gambar (JPEG, PNG) yang diizinkan", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("Ukuran file maksimal 5MB", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    if (previewImg) previewImg.src = event.target.result;
    if (previewContainer) previewContainer.classList.add("active");
    if (uploadArea) uploadArea.style.display = "none";

    signatures[signatureType] = event.target.result;
    if (dataInput) dataInput.value = event.target.result;
    showToast(`Tanda tangan ${signatureType} berhasil diupload`, "success");
  };

  reader.readAsDataURL(file);
}

function removeUploadedSignature(
  fileInput,
  previewContainer,
  uploadArea,
  previewImg,
  dataInput,
  signatureType,
) {
  if (fileInput) fileInput.value = "";
  if (previewContainer) previewContainer.classList.remove("active");
  if (uploadArea) uploadArea.style.display = "block";
  if (previewImg) previewImg.src = "";

  signatures[signatureType] = null;
  if (dataInput) dataInput.value = "";
  showToast(`Tanda tangan ${signatureType} dihapus`, "warning");
}

function updateSignatureData(type) {
  const sectionNum = type === "pemohon" ? 1 : type === "approval" ? 2 : 3;
  const canvas = document.getElementById(
    `signatureCanvas${sectionNum === 1 ? "" : sectionNum}`,
  );
  const dataInput = document.getElementById(
    `signatureData${sectionNum === 1 ? "" : sectionNum}`,
  );

  if (canvas && dataInput) {
    signatures[type] = canvas.toDataURL("image/png");
    dataInput.value = signatures[type];
  }
}

function setupSignatureOptions() {
  const sections = [
    { section: 1, type: "pemohon" },
    { section: 2, type: "approval" },
    { section: 3, type: "implementation" },
  ];

  sections.forEach(({ section, type }) => {
    const canvasBtn = document.querySelector(
      `[data-option="canvas${section === 1 ? "" : section}"]`,
    );
    const uploadBtn = document.querySelector(
      `[data-option="upload${section === 1 ? "" : section}"]`,
    );

    if (canvasBtn)
      canvasBtn.addEventListener("click", () =>
        switchSignatureOption(section, "canvas", type),
      );
    if (uploadBtn)
      uploadBtn.addEventListener("click", () =>
        switchSignatureOption(section, "upload", type),
      );
  });
}

function switchSignatureOption(sectionNum, optionType, signatureType) {
  const suffix = sectionNum === 1 ? "" : sectionNum;
  const containerId = `Signature${suffix}`;

  // Update active button
  document
    .querySelectorAll(
      `[data-option^="canvas${suffix}"], [data-option^="upload${suffix}"]`,
    )
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector(`[data-option="${optionType}${suffix}"]`)
    .classList.add("active");

  // Show selected container, hide others
  document
    .querySelectorAll(`.signature-option-container`)
    .forEach((container) => {
      if (container.id.includes(suffix ? suffix.toString() : "")) {
        container.classList.remove("active");
      }
    });

  document
    .getElementById(`${optionType}${containerId}`)
    .classList.add("active");

  // Clear other option
  if (optionType === "canvas") {
    clearUploadedSignatureByType(signatureType);
  } else {
    const canvas = document.getElementById(`signatureCanvas${suffix}`);
    if (canvas && canvas.clear) canvas.clear();
  }
}

function clearUploadedSignatureByType(type) {
  const sectionNum = { pemohon: 1, approval: 2, implementation: 3 }[type];
  if (!sectionNum) return;

  const suffix = sectionNum === 1 ? "" : sectionNum;
  const fileInput = document.getElementById(`signatureFile${suffix}`);
  const previewContainer = document.getElementById(`previewContainer${suffix}`);
  const uploadArea = document.getElementById(`uploadArea${suffix}`);
  const previewImg = document.getElementById(`signaturePreview${suffix}`);
  const dataInput = document.getElementById(`signatureData${suffix}`);

  if (fileInput) fileInput.value = "";
  if (previewContainer) previewContainer.classList.remove("active");
  if (uploadArea) uploadArea.style.display = "block";
  if (previewImg) previewImg.src = "";

  signatures[type] = null;
  if (dataInput) dataInput.value = "";
}

// ==================== REVIEW STEP SETUP ====================

function setupReviewStep() {
  const confirmCheckbox = document.getElementById("confirmReview");
  const submitBtn = document.getElementById("finalSubmitBtn");

  if (confirmCheckbox && submitBtn) {
    confirmCheckbox.addEventListener("change", () => {
      submitBtn.disabled = !confirmCheckbox.checked;
    });
  }
}

// ==================== FORM SUBMISSION HANDLER ====================

function setupFormSubmission() {
  console.log("🔧 Setting up form submission...");

  const submitBtn = document.getElementById("finalSubmitBtn");
  if (submitBtn) {
    // Remove existing event listeners first
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

    // Add new event listener
    newSubmitBtn.addEventListener("click", handleFormSubmission);

    console.log("✅ Form submission setup complete");
  } else {
    console.error("❌ Submit button not found!");
  }
}

async function handleFormSubmission() {
  console.log("🚀 handleFormSubmission called");

  const submitBtn = document.getElementById("finalSubmitBtn");
  if (!submitBtn) {
    console.error("❌ Submit button not found!");
    showToast("Submit button tidak ditemukan", "error");
    return;
  }

  // Validasi minimal - hanya step 1 wajib
  if (!validateStep(1)) {
    showToast("Harap lengkapi data usulan dasar terlebih dahulu!", "error");
    goToStep(1);
    return;
  }

  const confirmCheckbox = document.getElementById("confirmReview");
  if (!confirmCheckbox || !confirmCheckbox.checked) {
    showToast("Harap centang konfirmasi review sebelum submit!", "warning");
    return;
  }

  // Confirm submission
  if (
    !confirm(
      "Apakah Anda yakin ingin mengirim usulan perubahan ini?\nData yang sudah dikirim tidak dapat diedit.",
    )
  ) {
    return;
  }

  // Collect all data
  const formData = collectFormData();

  // Validasi tambahan untuk data kritis
  if (
    !formData.no_dokumen ||
    !formData.diminta_oleh ||
    !formData.deskripsi_perubahan
  ) {
    showToast(
      "Data wajib (No. Dokumen, Diminta Oleh, Deskripsi) harus diisi!",
      "error",
    );
    return;
  }

  // Prepare submission data
  const submissionData = {
    action: "submit",
    form_data: formData,
  };

  console.log("📤 Preparing to send data to server...");
  console.log("  - Action:", submissionData.action);
  console.log("  - Field count:", Object.keys(formData).length);

  // Show loading
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
  submitBtn.disabled = true;

  try {
    // Submit via API
    const response = await fetch("/api/usulan-perubahan/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    });

    console.log("📥 Response status:", response.status);

    const result = await response.json();
    console.log("📊 Server response:", result);

    if (!response.ok) {
      throw new Error(result.message || `Server error: ${response.status}`);
    }

    if (result.success) {
      showToast(
        result.message || "✅ Usulan perubahan berhasil dikirim!",
        "success",
      );

      // Redirect ke main_dashboard setelah berhasil
      setTimeout(() => {
        if (result.redirect) {
          window.location.href = result.redirect;
        } else {
          window.location.href = "/dashboard";
        }
      }, 1500);
    } else {
      throw new Error(result.message || "Gagal mengirim usulan");
    }
  } catch (error) {
    console.error("❌ Submission error:", error);

    let errorMessage = "Gagal mengirim usulan: ";
    if (error.message.includes("Network")) {
      errorMessage +=
        "Koneksi jaringan bermasalah. Periksa koneksi internet Anda.";
    } else {
      errorMessage += error.message;
    }

    showToast(errorMessage, "error");
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// ==================== STEP NAVIGATION ====================

function goToStep(stepNumber) {
  if (stepNumber < 1 || stepNumber > totalSteps) return;

  // Validasi sebelum pindah ke step 5
  if (stepNumber === 5) {
    if (!validateCurrentStep()) {
      return;
    }
    generateReviewContent();
  }

  // Validasi sebelum moving forward untuk step lain
  if (stepNumber > currentStep && stepNumber < 5) {
    if (!validateCurrentStep()) {
      return;
    }
  }

  showStep(stepNumber);
}

function showStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll(".form-section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show target step
  const targetStep = document.getElementById(`step${stepNumber}`);
  if (targetStep) targetStep.classList.add("active");

  // Update progress steps
  updateProgressSteps(stepNumber);

  // Update current step
  currentStep = stepNumber;

  // Scroll to top
  const formMain = document.querySelector(".form-main");
  if (formMain) formMain.scrollTop = 0;
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

function nextStep() {
  if (!validateCurrentStep()) {
    return;
  }
  if (currentStep < totalSteps) goToStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Navigation buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === "next") nextStep();
    else if (action === "prev") prevStep();
  });

  // Progress steps click
  document.querySelectorAll(".step").forEach((step) => {
    step.addEventListener("click", function () {
      const stepNumber = parseInt(this.dataset.step);
      if (stepNumber <= currentStep) goToStep(stepNumber);
    });
  });
}

function collectAllSignatureData() {
  const signatureInputs = [
    { id: "signatureData", type: "pemohon" },
    { id: "signatureData2", type: "approval" },
    { id: "signatureData3", type: "implementation" },
  ];

  signatureInputs.forEach(({ id, type }) => {
    const input = document.getElementById(id);
    if (input && input.value) signatures[type] = input.value;
  });
}

// ==================== FORM VALIDATION ====================

function validateCurrentStep() {
  return validateStep(currentStep);
}

function validateStep(stepNumber) {
  const validators = {
    1: validateStep1,
    2: validateStep2,
    3: validateStep3,
    4: validateStep4,
  };
  return validators[stepNumber] ? validators[stepNumber]() : true;
}

// Helper untuk mencegah peringatan terlalu sering
function canShowWarning() {
  const now = Date.now();
  if (now - lastValidationTime > 2000) {
    // Hanya tampilkan peringatan setiap 2 detik
    lastValidationTime = now;
    return true;
  }
  return false;
}

function validateStep1() {
  let isValid = true;

  // HANYA field yang benar-benar kritis
  const criticalFields = [
    { name: "no_dokumen", label: "No. Dokumen" },
    { name: "diminta_oleh", label: "Diminta Oleh" },
    { name: "jabatan", label: "Jabatan" },
    { name: "deskripsi_perubahan", label: "Deskripsi Perubahan" },
  ];

  let firstErrorField = null;

  // Validate critical fields
  criticalFields.forEach(({ name, label }) => {
    const element = document.querySelector(`[name="${name}"]`);
    if (element) {
      if (!element.value || element.value.trim() === "") {
        markError(element, `${label} wajib diisi`);
        isValid = false;
        if (!firstErrorField) firstErrorField = element;
      } else {
        clearError(element);
      }
    }
  });

  // Validate dates only if they exist
  const tanggal = document.querySelector('[name="tanggal"]');
  const tglEfektif = document.querySelector('[name="tgl_efektif"]');
  const hasilDibutuhkan = document.querySelector(
    '[name="hasil_dibutuhkan_tgl"]',
  );

  if (tanggal && tglEfektif && tglEfektif.value) {
    const tgl = new Date(tanggal.value);
    const efektif = new Date(tglEfektif.value);

    if (efektif <= tgl) {
      markError(tglEfektif, "Tanggal efektif harus setelah tanggal usulan");
      isValid = false;
    }
  }

  if (tanggal && hasilDibutuhkan && hasilDibutuhkan.value) {
    const tgl = new Date(tanggal.value);
    const hasil = new Date(hasilDibutuhkan.value);

    if (hasil <= tgl) {
      markError(
        hasilDibutuhkan,
        "Tanggal hasil dibutuhkan harus setelah tanggal usulan",
      );
      isValid = false;
    }
  }

  // Only show toast if validation failed and we can show warning
  if (!isValid && canShowWarning()) {
    showToast("Harap lengkapi data pada tahap ini terlebih dahulu", "warning");

    // Scroll to first error field
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        firstErrorField.focus();
      }, 300);
    }
  }

  console.log(`✅ Step 1 validation: ${isValid ? "PASS" : "FAIL"}`);
  return isValid;
}

function validateStep2() {
  let isValid = true;
  let firstErrorField = null;

  // Check at least one change type
  const changeTypes = document.querySelectorAll(
    'input[name="tipe_perubahan"]:checked',
  );
  if (changeTypes.length === 0) {
    const checkboxes = document.querySelectorAll(
      'input[name="tipe_perubahan"]',
    );
    if (checkboxes.length > 0) {
      markError(
        checkboxes[0].closest(".checkbox-group"),
        "Pilih minimal satu tipe perubahan",
      );
      isValid = false;
      firstErrorField = checkboxes[0];
    }
  }

  // Validate required fields
  const requiredFields = [
    { name: "prioritas", label: "Prioritas Perubahan", type: "radio" },
    { name: "dampak_lingkungan", label: "Dampak terhadap lingkungan produksi" },
    { name: "upaya_diperlukan", label: "Upaya/Tindakan yang diperlukan" },
    { name: "kebutuhan_sumber_daya", label: "Kebutuhan Sumber Daya" },
    { name: "rencana_pengujian", label: "Penjelasan Rencana Pengujian" },
  ];

  requiredFields.forEach(({ name, label, type }) => {
    if (type === "radio") {
      const radioSelected = document.querySelector(
        `input[name="${name}"]:checked`,
      );
      if (!radioSelected) {
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        if (radios.length > 0) {
          markError(
            radios[0].closest(".radio-group"),
            `${label} wajib dipilih`,
          );
          isValid = false;
          if (!firstErrorField) firstErrorField = radios[0];
        }
      }
    } else {
      const element = document.querySelector(`[name="${name}"]`);
      if (element && (!element.value || element.value.trim() === "")) {
        markError(element, `${label} wajib diisi`);
        isValid = false;
        if (!firstErrorField) firstErrorField = element;
      } else if (element) {
        clearError(element);
      }
    }
  });

  // Only show toast if validation failed and we can show warning
  if (!isValid && canShowWarning()) {
    showToast("Harap lengkapi data pada tahap ini terlebih dahulu", "warning");

    // Scroll to first error field
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        if (firstErrorField.type !== "radio") {
          firstErrorField.focus();
        }
      }, 300);
    }
  }

  return isValid;
}

function validateStep3() {
  let isValid = true;
  let firstErrorField = null;

  const approvalStatus = document.querySelector(
    'input[name="status_persetujuan"]:checked',
  );

  if (!approvalStatus) {
    const radios = document.querySelectorAll(
      'input[name="status_persetujuan"]',
    );
    if (radios.length > 0) {
      markError(
        radios[0].closest(".radio-group"),
        "Pilih status persetujuan (Disetujui/Ditolak)",
      );
      isValid = false;
      firstErrorField = radios[0];
    }
  } else {
    if (approvalStatus.value === "disetujui") {
      const requiredFields = [
        { name: "tanggal_pelaksanaan", label: "Tanggal pelaksanaan perubahan" },
        { name: "pic_pelaksana", label: "PIC Pelaksana perubahan" },
      ];

      requiredFields.forEach(({ name, label }) => {
        const element = document.querySelector(`[name="${name}"]`);
        if (element && (!element.value || element.value.trim() === "")) {
          markError(element, `${label} wajib diisi`);
          isValid = false;
          if (!firstErrorField) firstErrorField = element;
        } else if (element) {
          clearError(element);
        }
      });

      // Validate date
      const tanggalPelaksanaan = document.querySelector(
        '[name="tanggal_pelaksanaan"]',
      );
      if (tanggalPelaksanaan && tanggalPelaksanaan.value) {
        const date = new Date(tanggalPelaksanaan.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          markError(
            tanggalPelaksanaan,
            "Tanggal pelaksanaan tidak boleh di masa lalu",
          );
          isValid = false;
          if (!firstErrorField) firstErrorField = tanggalPelaksanaan;
        }
      }
    } else {
      const catatanElement = document.querySelector(
        '[name="catatan_penolakan"]',
      );
      if (
        catatanElement &&
        (!catatanElement.value || catatanElement.value.trim() === "")
      ) {
        markError(catatanElement, "Alasan penolakan wajib diisi");
        isValid = false;
        if (!firstErrorField) firstErrorField = catatanElement;
      } else if (catatanElement) {
        clearError(catatanElement);
      }
    }
  }

  // Validate signature
  const signatureData2 = document.getElementById("signatureData2");
  if (
    !signatureData2 ||
    !signatureData2.value ||
    !signatureData2.value.startsWith("data:image")
  ) {
    const signatureSection = document.querySelector(
      "#step3 .signature-section",
    );
    if (signatureSection) {
      markError(
        signatureSection,
        "Tanda tangan pemberi persetujuan wajib diisi!",
      );
      isValid = false;
    }
  } else {
    signatures.approval = signatureData2.value;
  }

  // Only show toast if validation failed and we can show warning
  if (!isValid && canShowWarning()) {
    showToast("Harap lengkapi data pada tahap ini terlebih dahulu", "warning");

    // Scroll to first error field
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        if (firstErrorField.tagName !== "DIV") {
          firstErrorField.focus();
        }
      }, 300);
    }
  }

  return isValid;
}

function validateStep4() {
  let isValid = true;
  let firstErrorField = null;

  const requiredFields = [
    { name: "hasil_tahapan", label: "Hasil Tahapan Perubahan" },
    { name: "hasil_pengujian", label: "Hasil pengujian Implementasi" },
    { name: "tanggal_rilis", label: "Tanggal rilis ke lingkungan operasional" },
  ];

  requiredFields.forEach(({ name, label }) => {
    const element = document.querySelector(`[name="${name}"]`);
    if (element && (!element.value || element.value.trim() === "")) {
      markError(element, `${label} wajib diisi`);
      isValid = false;
      if (!firstErrorField) firstErrorField = element;
    } else if (element) {
      clearError(element);
    }
  });

  // Validate date
  const tanggalRilis = document.querySelector('[name="tanggal_rilis"]');
  if (tanggalRilis && tanggalRilis.value) {
    const date = new Date(tanggalRilis.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      markError(tanggalRilis, "Tanggal rilis tidak boleh di masa lalu");
      isValid = false;
      if (!firstErrorField) firstErrorField = tanggalRilis;
    }
  }

  // Validate signature
  const signatureData3 = document.getElementById("signatureData3");
  if (
    !signatureData3 ||
    !signatureData3.value ||
    !signatureData3.value.startsWith("data:image")
  ) {
    const signatureSection = document.querySelector(
      "#step4 .signature-section",
    );
    if (signatureSection) {
      markError(signatureSection, "Tanda tangan pelaksana wajib diisi!");
      isValid = false;
    }
  } else {
    signatures.implementation = signatureData3.value;
  }

  // Only show toast if validation failed and we can show warning
  if (!isValid && canShowWarning()) {
    showToast("Harap lengkapi data pada tahap ini terlebih dahulu", "warning");

    // Scroll to first error field
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        firstErrorField.focus();
      }, 300);
    }
  }

  return isValid;
}

function markError(element, message) {
  element.classList.add("error");
  let errorDiv = element.parentElement.querySelector(".error-message");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    element.parentElement.appendChild(errorDiv);
  }
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
}

function clearError(element) {
  element.classList.remove("error");
  const errorDiv = element.parentElement.querySelector(".error-message");
  if (errorDiv) errorDiv.remove();
}

// ==================== REVIEW CONTENT ====================

function generateReviewContent() {
  const reviewLoading = document.getElementById("reviewLoading");
  const reviewContent = document.getElementById("reviewContent");
  const reviewActions = document.getElementById("reviewActions");

  reviewLoading.style.display = "flex";
  reviewContent.style.display = "none";
  reviewActions.style.display = "none";

  setTimeout(() => {
    const formData = collectFormData();
    reviewContent.innerHTML = createReviewHTML(formData);
    reviewLoading.style.display = "none";
    reviewContent.style.display = "block";
    reviewActions.style.display = "block";
  }, 500);
}

function createReviewHTML(formData) {
  function formatDateDisplay(dateStr) {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function formatCheckboxes(value, name) {
    if (!value) return "-";
    const values = value.split(",");
    const result = [];
    document.querySelectorAll(`[name="${name}"]`).forEach((el) => {
      if (el.type === "checkbox" && values.includes(el.value)) {
        result.push(`✓ ${el.value}`);
      }
    });
    return result.length > 0 ? result.join("<br>") : "-";
  }

  function formatRadio(value, name) {
    if (!value) return "-";
    const element = document.querySelector(
      `[name="${name}"][value="${value}"]`,
    );
    return element ? `✓ ${element.value}` : value;
  }

  return `
        <div class="review-summary">
            <h3><i class="fas fa-file-alt"></i> Ringkasan Usulan</h3>
            <div class="summary-grid">
                <div class="summary-item"><label>No. Dokumen:</label><span class="highlight">${
                  formData.no_dokumen || "-"
                }</span></div>
                <div class="summary-item"><label>Status:</label><span class="status-badge review"><i class="fas fa-hourglass-half"></i> Dalam Review</span></div>
                <div class="summary-item"><label>Dibuat oleh:</label><span>${
                  formData.diminta_oleh || "-"
                }</span></div>
                <div class="summary-item"><label>Tanggal Usulan:</label><span>${formatDateDisplay(
                  formData.tanggal,
                )}</span></div>
            </div>
        </div>
        
        <div class="review-details">
            <div class="review-section">
                <h4><i class="fas fa-id-card"></i> A. USULAN PERUBAHAN</h4>
                <table class="review-table">
                    ${createTableRows([
                      ["No. Dokumen", formData.no_dokumen || "-"],
                      ["Revisi", formData.revisi || "00"],
                      ["Tgl. Efektif", formatDateDisplay(formData.tgl_efektif)],
                      ["Tanggal Usulan", formatDateDisplay(formData.tanggal)],
                      ["Diminta Oleh", formData.diminta_oleh || "-"],
                      ["Jabatan", formData.jabatan || "-"],
                      [
                        "Deskripsi Perubahan",
                        formData.deskripsi_perubahan || "-",
                      ],
                      [
                        "Hasil Dibutuhkan Tgl",
                        formatDateDisplay(formData.hasil_dibutuhkan_tgl),
                      ],
                      ["Alasan Perubahan", formData.alasan_perubahan || "-"],
                      [
                        "Tanda Tangan Pemohon",
                        formData.signature_data
                          ? '<span class="status-success"><i class="fas fa-check-circle"></i> Tersedia</span>'
                          : '<span class="status-error"><i class="fas fa-times-circle"></i> Belum ada</span>',
                      ],
                    ])}
                </table>
            </div>
            
            ${
              formData.tipe_perubahan
                ? `
                <div class="review-section">
                    <h4><i class="fas fa-clipboard-check"></i> B. EVALUASI DAMPAK PERUBAHAN</h4>
                    <table class="review-table">
                        ${createTableRows([
                          [
                            "Tipe Perubahan",
                            formatCheckboxes(
                              formData.tipe_perubahan,
                              "tipe_perubahan",
                            ),
                          ],
                          [
                            "Prioritas Perubahan",
                            formatRadio(formData.prioritas, "prioritas"),
                          ],
                          [
                            "Dampak Lingkungan",
                            formData.dampak_lingkungan || "-",
                          ],
                          [
                            "Upaya Diperlukan",
                            formData.upaya_diperlukan || "-",
                          ],
                          [
                            "Kebutuhan Sumber Daya",
                            formData.kebutuhan_sumber_daya || "-",
                          ],
                          [
                            "Rencana Pengujian",
                            formData.rencana_pengujian || "-",
                          ],
                          [
                            "Catatan Evaluator",
                            formData.catatan_evaluator || "-",
                          ],
                          [
                            "Tanggal Evaluasi",
                            formatDateDisplay(formData.tanggal_evaluasi),
                          ],
                        ])}
                    </table>
                </div>
            `
                : ""
            }
            
            ${
              formData.status_persetujuan
                ? `
                <div class="review-section">
                    <h4><i class="fas fa-check-circle"></i> C. PERSETUJUAN PERUBAHAN</h4>
                    <table class="review-table">
                        ${createTableRows(
                          [
                            [
                              "Status",
                              formData.status_persetujuan === "disetujui"
                                ? '<span class="status-success">Disetujui</span>'
                                : '<span class="status-error">Ditolak</span>',
                            ],
                            formData.status_persetujuan === "disetujui"
                              ? [
                                  "Tanggal Pelaksanaan",
                                  formatDateDisplay(
                                    formData.tanggal_pelaksanaan,
                                  ),
                                ]
                              : null,
                            formData.status_persetujuan === "disetujui"
                              ? ["PIC Pelaksana", formData.pic_pelaksana || "-"]
                              : null,
                            formData.status_persetujuan === "disetujui"
                              ? [
                                  "Catatan Persetujuan",
                                  formData.catatan_persetujuan || "-",
                                ]
                              : [
                                  "Alasan Penolakan",
                                  formData.catatan_penolakan || "-",
                                ],
                            [
                              "Tanggal Persetujuan",
                              formatDateDisplay(formData.tanggal_persetujuan),
                            ],
                            [
                              "Tanda Tangan Persetujuan",
                              formData.signature_approval
                                ? '<span class="status-success"><i class="fas fa-check-circle"></i> Tersedia</span>'
                                : '<span class="status-error"><i class="fas fa-times-circle"></i> Belum ada</span>',
                            ],
                          ].filter(Boolean),
                        )}
                    </table>
                </div>
            `
                : ""
            }
            
            ${
              formData.hasil_tahapan
                ? `
                <div class="review-section">
                    <h4><i class="fas fa-tools"></i> D. IMPLEMENTASI PERUBAHAN</h4>
                    <table class="review-table">
                        ${createTableRows([
                          [
                            "Hasil Tahapan Perubahan",
                            formData.hasil_tahapan || "-",
                          ],
                          ["Hasil Pengujian", formData.hasil_pengujian || "-"],
                          [
                            "Tanggal Rilis",
                            formatDateDisplay(formData.tanggal_rilis),
                          ],
                          [
                            "Catatan Implementasi",
                            formData.catatan_implementasi || "-",
                          ],
                          [
                            "Tanggal Implementasi",
                            formatDateDisplay(formData.tanggal_implementasi),
                          ],
                          [
                            "Tanda Tangan Pelaksana",
                            formData.signature_implementation
                              ? '<span class="status-success"><i class="fas fa-check-circle"></i> Tersedia</span>'
                              : '<span class="status-error"><i class="fas fa-times-circle"></i> Belum ada</span>',
                          ],
                        ])}
                    </table>
                </div>
            `
                : ""
            }
        </div>
    `;
}

function createTableRows(data) {
  return data
    .map(
      ([label, value]) => `
        <tr>
            <td width="30%">${label}</td>
            <td width="70%">${value}</td>
        </tr>
    `,
    )
    .join("");
}

// ==================== UTILITY FUNCTIONS ====================

function collectFormData() {
  console.log("📝 collectFormData called");

  const form = document.getElementById("completeForm");
  if (!form) {
    console.error("❌ Form not found!");
    return {};
  }

  const formData = new FormData(form);
  const data = {};

  // Convert FormData to object
  for (const [key, value] of formData.entries()) {
    if (key.includes("tipe_perubahan")) {
      // Handle checkbox array
      if (!data.tipe_perubahan) data.tipe_perubahan = [];
      data.tipe_perubahan.push(value);
    } else if (key.includes("catatan")) {
      // Preserve catatan fields exactly
      data[key] = value;
    } else {
      data[key] = value;
    }
  }

  // Convert array to comma-separated string
  if (data.tipe_perubahan && Array.isArray(data.tipe_perubahan)) {
    data.tipe_perubahan = data.tipe_perubahan.join(",");
  }

  // Add signatures
  data.signature_data = signatures.pemohon || "";
  data.signature_approval = signatures.approval || "";
  data.signature_implementation = signatures.implementation || "";

  // Debug: Log all collected data
  console.log("📊 Form data collected:");
  console.log(`  • no_dokumen: ${data.no_dokumen || "MISSING"}`);
  console.log(`  • diminta_oleh: ${data.diminta_oleh || "MISSING"}`);
  console.log(`  • jabatan: ${data.jabatan || "MISSING"}`);
  console.log(
    `  • deskripsi_perubahan: ${
      data.deskripsi_perubahan
        ? data.deskripsi_perubahan.substring(0, 30) + "..."
        : "MISSING"
    }`,
  );
  console.log(`  • pemohon_signature: ${data.signature_data ? "✓" : "✗"}`);
  console.log(`  • approval_signature: ${data.signature_approval ? "✓" : "✗"}`);
  console.log(
    `  • implementation_signature: ${data.signature_implementation ? "✓" : "✗"}`,
  );

  return data;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

// ==================== GLOBAL EXPORTS ====================

window.goToStep = goToStep;
window.nextStep = nextStep;
window.prevStep = prevStep;
