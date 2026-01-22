/**
 * Two Step Form - BMKG Wilayah IV
 * JavaScript untuk form 2 tahap (Form & Review)
 * Versi: 2.1 - Updated Signature Handling
 */

// ==================== GLOBAL VARIABLES ====================
let currentStep = 1;
const totalSteps = 2;
const signatures = {
  pemohon: null,
  approval: null,
  implementation: null,
};
let lastValidationTime = 0;
let signaturePads = {};
const SIGNATURE_WIDTH = 400; // Lebar maksimal signature
const SIGNATURE_HEIGHT = 150; // Tinggi signature

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", function () {
  console.log("Two Step Form JavaScript loaded");

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
    { id: "tgl_efektif", minDate: tomorrow },
    { id: "hasil_dibutuhkan_tgl", minDate: nextWeek },
    { id: "tanggal_pelaksanaan", minDate: tomorrow },
    { id: "tanggal_rilis", minDate: tomorrow },
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
  const tanggalInput = document.getElementById("tanggal");
  if (tanggalInput && !tanggalInput.value) {
    tanggalInput.value = formatDate(today);
  }

  // Set other dates to today
  const todayDateInputs = [
    "tanggal_evaluasi",
    "tanggal_persetujuan",
    "tanggal_implementasi",
  ];

  todayDateInputs.forEach((id) => {
    const input = document.getElementById(id);
    if (input && !input.value) {
      input.value = formatDate(today);
    }
  });
}

function setupCharacterCounters() {
  const textareas = document.querySelectorAll(".form-control[data-counter]");

  textareas.forEach((textarea) => {
    const counterId = textarea.dataset.counter;
    const counter = document.getElementById(counterId);
    if (counter) {
      updateCounter(counter, textarea.value.length);
      textarea.addEventListener("input", () => {
        updateCounter(counter, textarea.value.length);
      });
    }
  });

  // Setup for hardcoded textareas
  const deskripsiTextarea = document.getElementById("deskripsi_perubahan");
  const deskripsiCounter = document.getElementById("deskripsiCounter");
  const alasanTextarea = document.getElementById("alasan_perubahan");
  const alasanCounter = document.getElementById("alasanCounter");

  if (deskripsiTextarea && deskripsiCounter) {
    updateCounter(deskripsiCounter, deskripsiTextarea.value.length);
    deskripsiTextarea.addEventListener("input", () => {
      updateCounter(deskripsiCounter, deskripsiTextarea.value.length);
    });
  }

  if (alasanTextarea && alasanCounter) {
    updateCounter(alasanCounter, alasanTextarea.value.length);
    alasanTextarea.addEventListener("input", () => {
      updateCounter(alasanCounter, alasanTextarea.value.length);
    });
  }
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
      const tanggalInput = document.getElementById("tanggal_pelaksanaan");
      const picInput = document.getElementById("pic_pelaksana");
      const catatanInput = document.getElementById("catatan_penolakan");

      if (tanggalInput) tanggalInput.required = isApproved;
      if (picInput) picInput.required = isApproved;
      if (catatanInput) catatanInput.required = !isApproved;
    });
  });

  // Trigger initial state
  const defaultRadio = document.querySelector(
    'input[name="status_persetujuan"]:checked',
  );
  if (defaultRadio) {
    defaultRadio.dispatchEvent(new Event("change"));
  }
}

function setupEditableFields() {
  console.log("Setting up editable fields...");

  // Field yang bisa diedit: No Dokumen, Diminta Oleh, Jabatan
  const editableFields = ["no_dokumen", "diminta_oleh", "jabatan"];

  editableFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
      // Tambahkan visual feedback
      field.addEventListener("input", function () {
        if (this.value.trim() === "") {
          this.classList.add("field-empty");
        } else {
          this.classList.remove("field-empty");
        }
      });

      // Inisialisasi state
      if (field.value.trim() === "") {
        field.classList.add("field-empty");
      }
    }
  });
}

// ==================== SIGNATURE SYSTEMS ====================

function initializeSignatures() {
  console.log("Initializing signature systems...");

  // Initialize all three signature systems
  initializeSignaturePad(1, "pemohon");
  initializeSignaturePad(2, "approval");
  initializeSignaturePad(3, "implementation");

  // Setup file upload for all three sections
  setupFileUploads();
  setupSignatureOptions();
}

function initializeSignaturePad(sectionNum, type) {
  const canvasId = `signatureCanvas${sectionNum}`;
  const dataId = `signatureData${sectionNum}`;
  const canvas = document.getElementById(canvasId);
  const dataInput = document.getElementById(dataId);

  if (!canvas || !dataInput) {
    console.error(`❌ Canvas or data input not found for ${type}`);
    return;
  }

  // Clear canvas context untuk pastikan transparan
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Initialize Signature Pad dengan background transparan
  const signaturePad = new SignaturePad(canvas, {
    backgroundColor: "rgba(255, 255, 255, 0)", // Transparan
    penColor: "rgb(0, 0, 0)", // Warna tanda tangan hitam
    minWidth: 0.5,
    maxWidth: 2.5, // Lebih tipis
    velocityFilterWeight: 0.7,
    throttle: 5, // Smooth drawing
  });

  // Store reference
  signaturePads[type] = signaturePad;

  // Set canvas size yang lebih proporsional
  function resizeCanvas() {
    const container = canvas.parentElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // Hitung ukuran yang proporsional
    const containerWidth = container.offsetWidth;
    const canvasWidth = Math.min(containerWidth, SIGNATURE_WIDTH);
    const canvasHeight = SIGNATURE_HEIGHT;

    // Set canvas size
    canvas.width = canvasWidth * ratio;
    canvas.height = canvasHeight * ratio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);

    // Clear dengan background transparan
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw existing signature if any
    setTimeout(() => {
      if (signatures[type]) {
        signaturePad.fromDataURL(signatures[type]);
      } else {
        signaturePad.clear();
      }

      // Update placeholder visibility
      updatePlaceholderVisibility(sectionNum, signaturePad);
    }, 100);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Event listeners untuk drawing
  canvas.addEventListener("touchstart", () => {
    const placeholder = canvas.parentElement.querySelector(
      ".signature-placeholder",
    );
    if (placeholder) placeholder.style.display = "none";
  });

  canvas.addEventListener("mousedown", () => {
    const placeholder = canvas.parentElement.querySelector(
      ".signature-placeholder",
    );
    if (placeholder) placeholder.style.display = "none";
  });

  // Update signature data
  signaturePad.addEventListener("endStroke", () => {
    updateSignatureData(sectionNum, type);
    updateSignatureVisualFeedback(canvasId, type, true);
  });

  // Set up clear and undo buttons
  const clearBtn = document.getElementById(`clearSignatureBtn${sectionNum}`);
  const undoBtn = document.getElementById(`undoSignatureBtn${sectionNum}`);

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      signaturePad.clear();
      updateSignatureData(sectionNum, type);
      updateSignatureVisualFeedback(canvasId, type, false);
      updatePlaceholderVisibility(sectionNum, signaturePad);
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      const data = signaturePad.toData();
      if (data && data.length > 0) {
        data.pop(); // Remove the last dot or line
        signaturePad.fromData(data);
        updateSignatureData(sectionNum, type);
        updateSignatureVisualFeedback(canvasId, type, !signaturePad.isEmpty());
        updatePlaceholderVisibility(sectionNum, signaturePad);
      }
    });
  }

  // Load existing signature if any
  if (signatures[type]) {
    setTimeout(() => {
      signaturePad.fromDataURL(signatures[type]);
      updatePlaceholderVisibility(sectionNum, signaturePad);
    }, 100);
  } else {
    updatePlaceholderVisibility(sectionNum, signaturePad);
  }
}

function updatePlaceholderVisibility(sectionNum, signaturePad) {
  const placeholder = document
    .querySelector(`#signatureCanvas${sectionNum}`)
    .parentElement.querySelector(".signature-placeholder");
  if (placeholder) {
    placeholder.style.display = signaturePad.isEmpty() ? "block" : "none";
  }
}

function updateSignatureData(sectionNum, type) {
  const canvasId = `signatureCanvas${sectionNum}`;
  const dataId = `signatureData${sectionNum}`;
  const canvas = document.getElementById(canvasId);
  const dataInput = document.getElementById(dataId);
  const signaturePad = signaturePads[type];

  if (!signaturePad || !dataInput) return;

  if (!signaturePad.isEmpty()) {
    // Optimize signature untuk tidak terlalu lebar
    const dataUrl = optimizeSignature(signaturePad);
    signatures[type] = dataUrl;
    dataInput.value = dataUrl;
  } else {
    signatures[type] = null;
    dataInput.value = "";
  }
}

function optimizeSignature(signaturePad) {
  // Buat canvas temporary untuk cropping
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  // Get original canvas
  const originalCanvas = signaturePad.canvas;
  const originalCtx = originalCanvas.getContext("2d");

  // Get image data untuk menemukan batas tanda tangan
  const imageData = originalCtx.getImageData(
    0,
    0,
    originalCanvas.width,
    originalCanvas.height,
  );
  const data = imageData.data;

  let minX = originalCanvas.width;
  let minY = originalCanvas.height;
  let maxX = 0;
  let maxY = 0;

  // Cari batas non-transparan
  for (let y = 0; y < originalCanvas.height; y++) {
    for (let x = 0; x < originalCanvas.width; x++) {
      const alpha = data[(y * originalCanvas.width + x) * 4 + 3];
      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Tambahkan padding
  const padding = 10;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(originalCanvas.width, maxX + padding);
  maxY = Math.min(originalCanvas.height, maxY + padding);

  const width = maxX - minX;
  const height = maxY - minY;

  if (width === 0 || height === 0) {
    return signaturePad.toDataURL("image/png");
  }

  // Set ukuran temp canvas proporsional
  const maxWidth = 300; // Lebar maksimal
  const ratio = Math.min(1, maxWidth / width);
  tempCanvas.width = width * ratio;
  tempCanvas.height = height * ratio;

  // Draw hanya bagian yang diperlukan
  tempCtx.drawImage(
    originalCanvas,
    minX,
    minY,
    width,
    height,
    0,
    0,
    tempCanvas.width,
    tempCanvas.height,
  );

  return tempCanvas.toDataURL("image/png");
}

function updateSignatureVisualFeedback(canvasId, type, isValid) {
  const canvas = document.getElementById(canvasId);
  const section = canvas.closest(".signature-section");

  if (!canvas || !section) return;

  // Update canvas classes
  canvas.classList.remove("drawing", "saved");

  if (isValid && !signaturePads[type].isEmpty()) {
    canvas.classList.add("saved");
    section.classList.remove("invalid");
    section.classList.add("valid");

    // Show saved indicator
    showSavedIndicator(sectionNumFromType(type));
  } else if (!isValid) {
    section.classList.remove("valid");
    section.classList.add("invalid");
  } else {
    section.classList.remove("valid", "invalid");
  }
}

function sectionNumFromType(type) {
  const map = { pemohon: 1, approval: 2, implementation: 3 };
  return map[type] || 1;
}

function showSavedIndicator(sectionNum) {
  const section = document
    .querySelector(`#signatureCanvas${sectionNum}`)
    .closest(".signature-section");
  const existingIndicator = section.querySelector(".signature-saved");

  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicator = document.createElement("div");
  indicator.className = "signature-saved";
  indicator.innerHTML = '<i class="fas fa-check-circle me-1"></i>Tersimpan';

  section.style.position = "relative";
  section.appendChild(indicator);

  // Remove indicator after animation
  setTimeout(() => {
    indicator.remove();
  }, 2000);
}

function setupFileUploads() {
  // Setup for all three signature sections
  const uploadConfigs = [
    { section: 1, type: "pemohon" },
    { section: 2, type: "approval" },
    { section: 3, type: "implementation" },
  ];

  uploadConfigs.forEach(({ section, type }) => {
    setupFileUpload(
      section,
      type,
      `uploadArea${section}`,
      `signatureFile${section}`,
      `previewContainer${section}`,
      `signaturePreview${section}`,
      `removePreviewBtn${section}`,
      `signatureData${section}`,
    );
  });
}

function setupFileUpload(
  sectionNum,
  type,
  uploadAreaId,
  fileInputId,
  previewContainerId,
  previewImgId,
  removeBtnId,
  dataInputId,
) {
  const uploadArea = document.getElementById(uploadAreaId);
  const fileInput = document.getElementById(fileInputId);
  const previewContainer = document.getElementById(previewContainerId);
  const previewImg = document.getElementById(previewImgId);
  const removeBtn = document.getElementById(removeBtnId);
  const dataInput = document.getElementById(dataInputId);
  const canvasId = `signatureCanvas${sectionNum}`;

  if (!uploadArea || !fileInput) return;

  // Click to upload
  uploadArea.addEventListener("click", () => fileInput.click());

  // Drag and drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelect(fileInput, type, canvasId);
    }
  });

  // File selection
  fileInput.addEventListener("change", (e) => {
    handleFileSelect(e.target, type, canvasId);
  });

  // Remove preview
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      removeUploadedSignature(type, canvasId);
    });
  }
}

function handleFileSelect(fileInput, type, canvasId) {
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
    const sectionNum = canvasId.replace("signatureCanvas", "");
    const previewImg = document.getElementById(`signaturePreview${sectionNum}`);
    const previewContainer = document.getElementById(
      `previewContainer${sectionNum}`,
    );
    const uploadArea = document.getElementById(`uploadArea${sectionNum}`);
    const dataInput = document.getElementById(`signatureData${sectionNum}`);

    // Optimize uploaded signature
    const img = new Image();
    img.onload = function () {
      const optimizedUrl = optimizeUploadedSignature(img);

      if (previewImg) {
        previewImg.src = optimizedUrl;
        previewImg.style.maxWidth = "300px"; // Batasi lebar preview
        previewImg.style.maxHeight = "150px";
      }

      if (previewContainer) previewContainer.classList.add("active");
      if (uploadArea) uploadArea.style.display = "none";

      // Clear corresponding canvas
      const signaturePad = signaturePads[type];
      if (signaturePad) {
        signaturePad.clear();
      }

      signatures[type] = optimizedUrl;
      if (dataInput) dataInput.value = optimizedUrl;

      // Update visual feedback
      updateSignatureVisualFeedback(canvasId, type, true);
      showToast(`Tanda tangan ${type} berhasil diupload`, "success");
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

function optimizeUploadedSignature(img) {
  // Buat canvas untuk processing
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set ukuran maksimal
  const maxWidth = 300;
  const maxHeight = 150;

  // Hitung rasio scaling
  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = height * (maxWidth / width);
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = width * (maxHeight / height);
    height = maxHeight;
  }

  // Set canvas size
  canvas.width = width;
  canvas.height = height;

  // Buat background transparan
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Proses untuk membuat background transparan (remove white background)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Deteksi warna putih atau hampir putih, ubah ke transparan
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Jika warna mendekati putih, ubah alpha ke 0
    if (r > 240 && g > 240 && b > 240) {
      data[i + 3] = 0; // Set alpha ke 0 (transparan)
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}

function removeUploadedSignature(type, canvasId) {
  const sectionNum = canvasId.replace("signatureCanvas", "");
  const fileInput = document.getElementById(`signatureFile${sectionNum}`);
  const previewContainer = document.getElementById(
    `previewContainer${sectionNum}`,
  );
  const uploadArea = document.getElementById(`uploadArea${sectionNum}`);
  const previewImg = document.getElementById(`signaturePreview${sectionNum}`);
  const dataInput = document.getElementById(`signatureData${sectionNum}`);

  if (fileInput) fileInput.value = "";
  if (previewContainer) previewContainer.classList.remove("active");
  if (uploadArea) uploadArea.style.display = "block";
  if (previewImg) previewImg.src = "";

  signatures[type] = null;
  if (dataInput) dataInput.value = "";

  // Update visual feedback
  updateSignatureVisualFeedback(canvasId, type, false);
  showToast(`Tanda tangan ${type} dihapus`, "warning");
}

function setupSignatureOptions() {
  const sections = [
    { section: 1, type: "pemohon" },
    { section: 2, type: "approval" },
    { section: 3, type: "implementation" },
  ];

  sections.forEach(({ section, type }) => {
    const canvasBtn = document.querySelector(
      `[data-option="canvas${section}"]`,
    );
    const uploadBtn = document.querySelector(
      `[data-option="upload${section}"]`,
    );

    if (canvasBtn) {
      canvasBtn.addEventListener("click", () => {
        switchSignatureOption(section, "canvas", type);
      });
    }

    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        switchSignatureOption(section, "upload", type);
      });
    }
  });
}

function switchSignatureOption(sectionNum, optionType, signatureType) {
  // Update active button
  document
    .querySelectorAll(
      `[data-option^="canvas${sectionNum}"], [data-option^="upload${sectionNum}"]`,
    )
    .forEach((btn) => btn.classList.remove("active"));

  document
    .querySelector(`[data-option="${optionType}${sectionNum}"]`)
    .classList.add("active");

  // Show selected container, hide others
  document
    .querySelectorAll(`.signature-option-container`)
    .forEach((container) => {
      if (container.id.includes(sectionNum.toString())) {
        container.classList.remove("active");
      }
    });

  document
    .getElementById(`${optionType}Signature${sectionNum}`)
    .classList.add("active");

  // Clear other option
  if (optionType === "canvas") {
    clearUploadedSignatureByType(signatureType);
  } else {
    const signaturePad = signaturePads[signatureType];
    if (signaturePad) {
      signaturePad.clear();
      updateSignatureData(sectionNum, signatureType);
      updateSignatureVisualFeedback(
        `signatureCanvas${sectionNum}`,
        signatureType,
        false,
      );

      // Show placeholder
      const placeholder = document
        .querySelector(`#signatureCanvas${sectionNum}`)
        .parentElement.querySelector(".signature-placeholder");
      if (placeholder) placeholder.style.display = "block";
    }
  }
}

function clearUploadedSignatureByType(type) {
  const sectionNum = { pemohon: 1, approval: 2, implementation: 3 }[type];
  if (!sectionNum) return;

  const fileInput = document.getElementById(`signatureFile${sectionNum}`);
  const previewContainer = document.getElementById(
    `previewContainer${sectionNum}`,
  );
  const uploadArea = document.getElementById(`uploadArea${sectionNum}`);
  const previewImg = document.getElementById(`signaturePreview${sectionNum}`);
  const dataInput = document.getElementById(`signatureData${sectionNum}`);

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
    document
      .getElementById("finalSubmitBtn")
      .addEventListener("click", handleFormSubmission);

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

  // Validate all required fields
  if (!validateStep(1)) {
    showToast("Harap lengkapi semua data wajib pada form!", "error");
    goToStep(1);
    return;
  }

  // Validate signatures
  if (!validateSignatures()) {
    showToast("Harap lengkapi semua tanda tangan yang wajib!", "error");
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
    step_count: 2,
    form_type: "two_step",
  };

  console.log("📤 Preparing to send data to server...");
  console.log("  - Action:", submissionData.action);
  console.log("  - Step count:", submissionData.step_count);
  console.log("  - Field count:", Object.keys(formData).length);
  console.log("  - Has pemohon signature:", !!signatures.pemohon);
  console.log("  - Has approval signature:", !!signatures.approval);
  console.log("  - Has implementation signature:", !!signatures.implementation);

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

  // Validasi sebelum pindah ke step 2
  if (stepNumber === 2) {
    if (!validateStep(1)) {
      return;
    }
    if (!validateSignatures()) {
      showToast("Harap lengkapi semua tanda tangan yang wajib!", "error");
      return;
    }
    generateReviewContent();
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
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (currentStep < totalSteps) goToStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Navigation buttons
  const nextToReviewBtn = document.getElementById("nextToReview");
  const backToFormBtn = document.getElementById("backToForm");

  if (nextToReviewBtn) {
    nextToReviewBtn.addEventListener("click", nextStep);
  }

  if (backToFormBtn) {
    backToFormBtn.addEventListener("click", prevStep);
  }

  // Progress steps click
  document.querySelectorAll(".step").forEach((step) => {
    step.addEventListener("click", function () {
      const stepNumber = parseInt(this.dataset.step);
      if (stepNumber <= currentStep) goToStep(stepNumber);
    });
  });
}

// ==================== FORM VALIDATION ====================

function validateStep(stepNumber) {
  const validators = {
    1: validateFormData,
    2: () => true, // Step 2 doesn't need form validation
  };
  return validators[stepNumber] ? validators[stepNumber]() : true;
}

function validateFormData() {
  let isValid = true;
  let firstErrorField = null;

  // Collect all critical fields
  const criticalFields = [
    // USULAN PERUBAHAN
    {
      name: "no_dokumen",
      label: "No. Dokumen",
      element: document.getElementById("no_dokumen"),
    },
    {
      name: "diminta_oleh",
      label: "Diminta Oleh",
      element: document.getElementById("diminta_oleh"),
    },
    {
      name: "jabatan",
      label: "Jabatan",
      element: document.getElementById("jabatan"),
    },
    {
      name: "deskripsi_perubahan",
      label: "Deskripsi Perubahan",
      element: document.getElementById("deskripsi_perubahan"),
    },
    {
      name: "alasan_perubahan",
      label: "Alasan Perubahan",
      element: document.getElementById("alasan_perubahan"),
    },

    // EVALUASI DAMPAK
    {
      name: "dampak_lingkungan",
      label: "Dampak terhadap lingkungan produksi",
      element: document.getElementById("dampak_lingkungan"),
    },
    {
      name: "upaya_diperlukan",
      label: "Upaya/Tindakan yang diperlukan",
      element: document.getElementById("upaya_diperlukan"),
    },
    {
      name: "kebutuhan_sumber_daya",
      label: "Kebutuhan Sumber Daya",
      element: document.getElementById("kebutuhan_sumber_daya"),
    },
    {
      name: "rencana_pengujian",
      label: "Penjelasan Rencana Pengujian",
      element: document.getElementById("rencana_pengujian"),
    },

    // IMPLEMENTASI
    {
      name: "hasil_tahapan",
      label: "Hasil Tahapan Perubahan",
      element: document.getElementById("hasil_tahapan"),
    },
    {
      name: "hasil_pengujian",
      label: "Hasil pengujian Implementasi",
      element: document.getElementById("hasil_pengujian"),
    },
    {
      name: "tanggal_rilis",
      label: "Tanggal rilis ke lingkungan operasional",
      element: document.getElementById("tanggal_rilis"),
    },
  ];

  // Validate critical fields
  criticalFields.forEach(({ name, label, element }) => {
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

  // Validate checkbox group (tipe perubahan)
  const tipeCheckboxes = document.querySelectorAll(
    'input[name="tipe_perubahan"]:checked',
  );
  if (tipeCheckboxes.length === 0) {
    const checkboxGroup = document.querySelector(".checkbox-group");
    if (checkboxGroup) {
      markError(checkboxGroup, "Pilih minimal satu tipe perubahan");
      isValid = false;
      if (!firstErrorField) firstErrorField = checkboxGroup;
    }
  } else {
    clearError(document.querySelector(".checkbox-group"));
  }

  // Validate radio group (prioritas)
  const prioritasRadio = document.querySelector(
    'input[name="prioritas"]:checked',
  );
  if (!prioritasRadio) {
    const radioGroup = document.querySelector(".radio-group");
    if (radioGroup) {
      markError(radioGroup, "Pilih prioritas perubahan");
      isValid = false;
      if (!firstErrorField) firstErrorField = radioGroup;
    }
  } else {
    clearError(document.querySelector(".radio-group"));
  }

  // Validate approval status and related fields
  const approvalStatus = document.querySelector(
    'input[name="status_persetujuan"]:checked',
  );
  if (!approvalStatus) {
    const statusGroup = document
      .querySelector('input[name="status_persetujuan"]')
      .closest(".radio-group");
    if (statusGroup) {
      markError(statusGroup, "Pilih status persetujuan");
      isValid = false;
      if (!firstErrorField) firstErrorField = statusGroup;
    }
  } else {
    if (approvalStatus.value === "disetujui") {
      const tanggalPelaksanaan = document.getElementById("tanggal_pelaksanaan");
      const picPelaksana = document.getElementById("pic_pelaksana");

      if (
        tanggalPelaksanaan &&
        (!tanggalPelaksanaan.value || tanggalPelaksanaan.value.trim() === "")
      ) {
        markError(tanggalPelaksanaan, "Tanggal pelaksanaan wajib diisi");
        isValid = false;
        if (!firstErrorField) firstErrorField = tanggalPelaksanaan;
      } else {
        clearError(tanggalPelaksanaan);
      }

      if (
        picPelaksana &&
        (!picPelaksana.value || picPelaksana.value.trim() === "")
      ) {
        markError(picPelaksana, "PIC Pelaksana wajib diisi");
        isValid = false;
        if (!firstErrorField) firstErrorField = picPelaksana;
      } else {
        clearError(picPelaksana);
      }
    } else {
      const catatanPenolakan = document.getElementById("catatan_penolakan");
      if (
        catatanPenolakan &&
        (!catatanPenolakan.value || catatanPenolakan.value.trim() === "")
      ) {
        markError(catatanPenolakan, "Alasan penolakan wajib diisi");
        isValid = false;
        if (!firstErrorField) firstErrorField = catatanPenolakan;
      } else {
        clearError(catatanPenolakan);
      }
    }
  }

  // Validate dates
  validateDates();

  // Only show toast if validation failed
  if (!isValid && canShowWarning()) {
    showToast("Harap lengkapi semua data wajib pada form", "error");

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

function validateDates() {
  let hasError = false;

  // Validate tanggal efektif > tanggal usulan
  const tanggal = document.getElementById("tanggal");
  const tglEfektif = document.getElementById("tgl_efektif");

  if (tanggal && tglEfektif && tglEfektif.value) {
    const tgl = new Date(tanggal.value);
    const efektif = new Date(tglEfektif.value);

    if (efektif <= tgl) {
      markError(tglEfektif, "Tanggal efektif harus setelah tanggal usulan");
      hasError = true;
    } else {
      clearError(tglEfektif);
    }
  }

  // Validate hasil dibutuhkan > tanggal usulan
  const hasilDibutuhkan = document.getElementById("hasil_dibutuhkan_tgl");
  if (tanggal && hasilDibutuhkan && hasilDibutuhkan.value) {
    const tgl = new Date(tanggal.value);
    const hasil = new Date(hasilDibutuhkan.value);

    if (hasil <= tgl) {
      markError(
        hasilDibutuhkan,
        "Tanggal hasil dibutuhkan harus setelah tanggal usulan",
      );
      hasError = true;
    } else {
      clearError(hasilDibutuhkan);
    }
  }

  // Validate future dates
  const futureDateFields = [
    { id: "tanggal_pelaksanaan", name: "tanggal_pelaksanaan" },
    { id: "tanggal_rilis", name: "tanggal_rilis" },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  futureDateFields.forEach(({ id, name }) => {
    const field = document.getElementById(id);
    if (field && field.value) {
      const date = new Date(field.value);
      if (date < today) {
        const label =
          name === "tanggal_pelaksanaan"
            ? "Tanggal pelaksanaan"
            : "Tanggal rilis";
        markError(field, `${label} tidak boleh di masa lalu`);
        hasError = true;
      }
    }
  });

  return !hasError;
}

function validateSignatures() {
  let isValid = true;
  const signatureSections = document.querySelectorAll(".signature-section");

  signatureSections.forEach((section, index) => {
    const sectionNum = index + 1;
    const dataInput = document.getElementById(`signatureData${sectionNum}`);
    const signaturePad = signaturePads[Object.keys(signatures)[index]];

    let hasSignature = false;

    if (
      dataInput &&
      dataInput.value &&
      dataInput.value.startsWith("data:image")
    ) {
      hasSignature = true;
    } else if (signaturePad && !signaturePad.isEmpty()) {
      hasSignature = true;
    }

    if (!hasSignature) {
      markError(section, "Tanda tangan wajib diisi");
      isValid = false;
    } else {
      clearError(section);
    }
  });

  return isValid;
}

function canShowWarning() {
  const now = Date.now();
  if (now - lastValidationTime > 2000) {
    lastValidationTime = now;
    return true;
  }
  return false;
}

function markError(element, message) {
  if (!element) return;

  element.classList.add("error");

  // Remove existing error message
  const existingError = element.parentElement.querySelector(".error-message");
  if (existingError) existingError.remove();

  // Add new error message
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

  if (
    element.classList.contains("checkbox-group") ||
    element.classList.contains("radio-group")
  ) {
    element.appendChild(errorDiv);
  } else {
    element.parentElement.appendChild(errorDiv);
  }
}

function clearError(element) {
  if (!element) return;

  element.classList.remove("error");
  const errorDiv = element.parentElement.querySelector(".error-message");
  if (errorDiv) errorDiv.remove();
}

// ==================== REVIEW CONTENT ====================

function generateReviewContent() {
  const reviewLoading = document.getElementById("reviewLoading");
  const reviewContent = document.getElementById("reviewContent");
  const reviewActions = document.getElementById("reviewActions");

  reviewLoading.style.display = "block";
  reviewContent.style.display = "none";
  reviewActions.style.display = "none";

  setTimeout(() => {
    const formData = collectFormData();
    reviewContent.innerHTML = createReviewHTML(formData);
    reviewLoading.style.display = "none";
    reviewContent.style.display = "block";
    reviewActions.style.display = "block";

    // Scroll to review content
    reviewContent.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 500);
}

function createReviewHTML(formData) {
  function formatDateDisplay(dateStr) {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  function formatCheckboxes(value) {
    if (!value) return "-";
    const values = value.split(",");
    return values
      .map((v) => `<span class="badge bg-primary me-1">${v}</span>`)
      .join("");
  }

  function formatRadio(value) {
    if (!value) return "-";
    const color = value === "disetujui" ? "success" : "danger";
    return `<span class="badge bg-${color}">${value}</span>`;
  }

  function formatSignatureStatus(signatureData) {
    if (!signatureData || !signatureData.startsWith("data:image")) {
      return '<span class="text-danger"><i class="fas fa-times-circle"></i> Belum ada</span>';
    }
    return '<span class="text-success"><i class="fas fa-check-circle"></i> Tersedia</span>';
  }

  return `
        <div class="review-summary">
            <h3><i class="fas fa-file-alt"></i> Ringkasan Usulan</h3>
            <div class="review-grid">
                <div class="review-item">
                    <label>No. Dokumen:</label>
                    <span class="highlight">${formData.no_dokumen || "-"}</span>
                </div>
                <div class="review-item">
                    <label>Status:</label>
                    <span class="status-badge review"><i class="fas fa-hourglass-half"></i> Dalam Review</span>
                </div>
                <div class="review-item">
                    <label>Dibuat oleh:</label>
                    <span>${formData.diminta_oleh || "-"}</span>
                </div>
                <div class="review-item">
                    <label>Tanggal Usulan:</label>
                    <span>${formatDateDisplay(formData.tanggal)}</span>
                </div>
            </div>
        </div>
        
        <div class="review-details">
            <!-- A. USULAN PERUBAHAN -->
            <div class="review-section">
                <h4><i class="fas fa-id-card"></i> A. USULAN PERUBAHAN</h4>
                <table class="review-table">
                    <tr>
                        <td>No. Dokumen</td>
                        <td>${formData.no_dokumen || "-"}</td>
                    </tr>
                    <tr>
                        <td>Revisi</td>
                        <td>${formData.revisi || "00"}</td>
                    </tr>
                    <tr>
                        <td>Tgl. Efektif</td>
                        <td>${formatDateDisplay(formData.tgl_efektif)}</td>
                    </tr>
                    <tr>
                        <td>Tanggal Usulan</td>
                        <td>${formatDateDisplay(formData.tanggal)}</td>
                    </tr>
                    <tr>
                        <td>Diminta Oleh</td>
                        <td>${formData.diminta_oleh || "-"}</td>
                    </tr>
                    <tr>
                        <td>Jabatan</td>
                        <td>${formData.jabatan || "-"}</td>
                    </tr>
                    <tr>
                        <td>Deskripsi Perubahan</td>
                        <td><div class="text-data">${formData.deskripsi_perubahan || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Hasil Dibutuhkan</td>
                        <td>${formatDateDisplay(formData.hasil_dibutuhkan_tgl)}</td>
                    </tr>
                    <tr>
                        <td>Alasan Perubahan</td>
                        <td><div class="text-data">${formData.alasan_perubahan || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Tanda Tangan Pemohon</td>
                        <td>${formatSignatureStatus(formData.signature_data)}</td>
                    </tr>
                </table>
            </div>
            
            <!-- B. EVALUASI DAMPAK PERUBAHAN -->
            <div class="review-section">
                <h4><i class="fas fa-clipboard-check"></i> B. EVALUASI DAMPAK PERUBAHAN</h4>
                <table class="review-table">
                    <tr>
                        <td>Tipe Perubahan</td>
                        <td>${formatCheckboxes(formData.tipe_perubahan)}</td>
                    </tr>
                    <tr>
                        <td>Prioritas Perubahan</td>
                        <td>${formData.prioritas ? `<span class="badge ${formData.prioritas === "Emergency" ? "bg-danger" : "bg-warning"}">${formData.prioritas}</span>` : "-"}</td>
                    </tr>
                    <tr>
                        <td>Dampak Lingkungan</td>
                        <td><div class="text-data">${formData.dampak_lingkungan || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Upaya Diperlukan</td>
                        <td><div class="text-data">${formData.upaya_diperlukan || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Kebutuhan Sumber Daya</td>
                        <td><div class="text-data">${formData.kebutuhan_sumber_daya || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Rencana Pengujian</td>
                        <td><div class="text-data">${formData.rencana_pengujian || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Catatan Evaluator</td>
                        <td>${formData.catatan_evaluator || "-"}</td>
                    </tr>
                    <tr>
                        <td>Tanggal Evaluasi</td>
                        <td>${formatDateDisplay(formData.tanggal_evaluasi)}</td>
                    </tr>
                </table>
            </div>
            
            <!-- C. PERSETUJUAN PERUBAHAN -->
            <div class="review-section">
                <h4><i class="fas fa-check-circle"></i> C. PERSETUJUAN PERUBAHAN</h4>
                <table class="review-table">
                    <tr>
                        <td>Status</td>
                        <td>${formatRadio(formData.status_persetujuan)}</td>
                    </tr>
                    ${
                      formData.status_persetujuan === "disetujui"
                        ? `
                        <tr>
                            <td>Tanggal Pelaksanaan</td>
                            <td>${formatDateDisplay(formData.tanggal_pelaksanaan)}</td>
                        </tr>
                        <tr>
                            <td>PIC Pelaksana</td>
                            <td>${formData.pic_pelaksana || "-"}</td>
                        </tr>
                        <tr>
                            <td>Catatan Persetujuan</td>
                            <td>${formData.catatan_persetujuan || "-"}</td>
                        </tr>
                    `
                        : `
                        <tr>
                            <td>Alasan Penolakan</td>
                            <td><div class="text-data">${formData.catatan_penolakan || "-"}</div></td>
                        </tr>
                    `
                    }
                    <tr>
                        <td>Tanggal Persetujuan</td>
                        <td>${formatDateDisplay(formData.tanggal_persetujuan)}</td>
                    </tr>
                    <tr>
                        <td>Tanda Tangan Persetujuan</td>
                        <td>${formatSignatureStatus(formData.signature_approval)}</td>
                    </tr>
                </table>
            </div>
            
            <!-- D. IMPLEMENTASI PERUBAHAN -->
            <div class="review-section">
                <h4><i class="fas fa-tools"></i> D. IMPLEMENTASI PERUBAHAN</h4>
                <table class="review-table">
                    <tr>
                        <td>Hasil Tahapan Perubahan</td>
                        <td><div class="text-data">${formData.hasil_tahapan || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Hasil Pengujian</td>
                        <td><div class="text-data">${formData.hasil_pengujian || "-"}</div></td>
                    </tr>
                    <tr>
                        <td>Tanggal Rilis</td>
                        <td>${formatDateDisplay(formData.tanggal_rilis)}</td>
                    </tr>
                    <tr>
                        <td>Catatan Implementasi</td>
                        <td>${formData.catatan_implementasi || "-"}</td>
                    </tr>
                    <tr>
                        <td>Tanggal Implementasi</td>
                        <td>${formatDateDisplay(formData.tanggal_implementasi)}</td>
                    </tr>
                    <tr>
                        <td>Tanda Tangan Pelaksana</td>
                        <td>${formatSignatureStatus(formData.signature_implementation)}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}

// ==================== UTILITY FUNCTIONS ====================

function collectFormData() {
  console.log("📝 collectFormData called");

  const form = document.getElementById("twoStepForm");
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
  console.log("  • Basic info:", {
    no_dokumen: data.no_dokumen || "MISSING",
    diminta_oleh: data.diminta_oleh || "MISSING",
    jabatan: data.jabatan || "MISSING",
    status: data.status_persetujuan || "MISSING",
  });

  console.log("  • Signatures:", {
    pemohon: signatures.pemohon ? "✓" : "✗",
    approval: signatures.approval ? "✓" : "✗",
    implementation: signatures.implementation ? "✓" : "✗",
  });

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

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toastId = "toast-" + Date.now();
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type === "error" ? "danger" : type === "success" ? "success" : type === "warning" ? "warning" : "primary"} border-0`;
  toast.id = toastId;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${type === "error" ? "exclamation-circle" : type === "success" ? "check-circle" : type === "warning" ? "exclamation-triangle" : "info-circle"} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

  toastContainer.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: 3000,
  });

  bsToast.show();

  // Remove toast after hiding
  toast.addEventListener("hidden.bs.toast", function () {
    toast.remove();
  });
}

// ==================== GLOBAL EXPORTS ====================

window.goToStep = goToStep;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showToast = showToast;
