/* ================================================
   FORM SCRIPT - SURAT PERNYATAAN BMKG
   VERSION: 4.0 - NO DRAFT POPUP, AUTO REDIRECT
   ================================================ */

// Global variables
let currentStep = 1;
let isSignatureSaved = false;
let canvas, ctx;
let drawing = false;
let lastX = 0;
let lastY = 0;
let formSubmitted = false;

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 DOM Content Loaded - Form Surat Pernyataan v4.0");

  // 1. CLEAR SEMUA DRAFT OTOMATIS - TIDAK ADA POPUP
  clearAllDrafts();

  // 2. Setup dasar
  initSignaturePad();
  setupButtonListeners();
  setupFormValidation();
  updateProgressSteps();

  // 3. Setup auto-save (draft dihapus, jadi tidak perlu)
  // setupAutoSave(); // DISABLED KARENA TIDAK ADA DRAFT

  console.log("✅ Form initialization complete - No draft system");
});

// ===== CLEAR ALL DRAFTS - TANPA POPUP =====
function clearAllDrafts() {
  console.log("🗑️ AUTOMATIC: Clearing ALL drafts without popup");
  localStorage.removeItem("suratDraft");

  // Juga clear sessionStorage jika ada
  sessionStorage.removeItem("suratDraft");

  // Reset form state otomatis
  resetFormState();

  // Hapus parameter dari URL jika ada
  const url = new URL(window.location);
  if (url.searchParams.has("new") || url.searchParams.has("clear")) {
    url.searchParams.delete("new");
    url.searchParams.delete("clear");
    window.history.replaceState({}, "", url.toString());
  }
}

// ===== SETUP BUTTON LISTENERS =====
function setupButtonListeners() {
  console.log("🔧 Setting up button listeners...");

  // 1. Signature buttons
  document.querySelectorAll(".btn-save-signature").forEach((btn) => {
    btn.addEventListener("click", saveSignature);
  });

  document.querySelectorAll(".btn-clear-signature").forEach((btn) => {
    btn.addEventListener("click", clearSignature);
  });

  // 2. Navigation buttons - FIXED
  document
    .querySelectorAll(".btn-next, [onclick*='goToStep(2)']")
    .forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("➡️ Next button clicked");
        goToStep(2);
      });
    });

  document.querySelectorAll("[onclick*='goToStep(1)']").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("⬅️ Back button clicked");
      goToStep(1);
    });
  });

  // 3. Form actions
  document.querySelectorAll("[onclick*='resetForm']").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      resetForm();
    });
  });

  // 4. TOMBOL SIMPAN DRAFT DIHAPUS - Redirect langsung ke dashboard
  document
    .querySelectorAll(".btn-draft, [onclick*='saveDraftAndExit']")
    .forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("🏠 Draft button clicked - Redirecting to dashboard");
        showNotification("Mengarahkan ke dashboard...", "info");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      });

      // Ganti text tombol
      btn.innerHTML = '<i class="fas fa-home"></i> Ke Dashboard';
      btn.className = btn.className.replace("btn-draft", "btn-secondary");
      btn.removeAttribute("onclick");
    });

  // 5. Submit button - PERBAIKAN UTAMA
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      console.log("📤 Submit button clicked - Template route");

      // Validasi cepat
      if (!validateCurrentStep()) {
        showNotification("Harap lengkapi semua data dengan benar", "error");
        return;
      }

      const agreeCheckbox = document.getElementById("agreeTerms");
      if (!agreeCheckbox || !agreeCheckbox.checked) {
        showNotification(
          "❌ Harap setujui persyaratan terlebih dahulu!",
          "error",
        );
        agreeCheckbox.scrollIntoView({ behavior: "smooth", block: "center" });
        agreeCheckbox.focus();
        return;
      }

      // Submit form
      await handleFormSubmission();
    });

    // Update text tombol submit
    submitBtn.innerHTML =
      '<i class="fas fa-file-pdf"></i> Simpan & Ke Dashboard';
  }

  // 6. Agreement checkbox
  const agreeCheckbox = document.getElementById("agreeTerms");
  if (agreeCheckbox) {
    agreeCheckbox.addEventListener("change", function () {
      console.log(`✅ Agreement: ${this.checked ? "checked" : "unchecked"}`);
    });
  }

  // 7. Real-time validation
  const formInputs = document.querySelectorAll(
    "#suratForm input, #suratForm textarea",
  );
  formInputs.forEach((input) => {
    input.addEventListener("blur", function () {
      validateField(this);
    });

    // Auto-uppercase untuk nama, instansi, kota
    if (["nama", "instansi", "kota"].includes(input.name)) {
      input.addEventListener("input", function () {
        this.value = this.value.toUpperCase();
      });
    }

    // Format NIP hanya angka
    if (input.name === "nip") {
      input.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "");
      });
    }
  });

  console.log(`✅ Button listeners setup complete`);
}

// ===== HANDLE FORM SUBMISSION - REDIRECT KE DASHBOARD =====
async function handleFormSubmission() {
  if (formSubmitted) {
    console.log("⚠️ Form already submitted");
    return;
  }

  formSubmitted = true;

  const submitBtn = document.getElementById("submitBtn");
  const loadingDiv = document.getElementById("submitLoading");
  const errorDiv = document.getElementById("submitError");

  // UI Loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  }

  if (loadingDiv) loadingDiv.style.display = "block";
  if (errorDiv) errorDiv.style.display = "none";

  showNotification("Menyimpan data dan membuat dokumen...", "info");

  try {
    // Collect form data
    const form = document.getElementById("suratForm");
    const formData = new FormData(form);

    // Submit ke template route
    console.log("🚀 Submitting to /surat-pernyataan/generate-template");
    const response = await fetch("/surat-pernyataan/generate-template", {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    console.log(`📥 Response status: ${response.status}`);

    if (response.ok) {
      // PDF akan langsung di-download oleh browser
      console.log("✅ Dokumen berhasil dibuat");

      // Tampilkan notifikasi sukses
      showNotification(
        "✅ Data berhasil disimpan! Mengarahkan ke dashboard...",
        "success",
      );

      // **PERUBAHAN UTAMA: Redirect ke dashboard setelah 2 detik**
      setTimeout(() => {
        console.log("↪️ Redirecting to dashboard");
        window.location.href = "/dashboard";
      }, 2000);
    } else {
      // Handle error
      let errorMessage = "Server error";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status}`;
      }

      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("❌ Submission error:", error);

    // Show error
    if (errorDiv) {
      errorDiv.style.display = "block";
      const errorMsgElement = document.getElementById("errorMessage");
      if (errorMsgElement) errorMsgElement.textContent = error.message;
    }

    showNotification(`❌ ${error.message}`, "error");
    formSubmitted = false;

    // Reset button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-file-pdf"></i> Simpan & Ke Dashboard';
    }
  } finally {
    // Hide loading
    if (loadingDiv) loadingDiv.style.display = "none";
  }
}

// ===== SIGNATURE PAD FUNCTIONS =====
function initSignaturePad() {
  canvas = document.getElementById("signature-pad");
  if (!canvas) {
    console.error("❌ Canvas element not found!");
    return;
  }

  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Mouse events
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // Touch events
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", stopDrawing);

  console.log("✅ Signature pad initialized");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;

  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  ctx.scale(scale, scale);

  // Clear and set styles
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#003366";
}

function getCanvasPosition(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function startDrawing(e) {
  e.preventDefault();
  drawing = true;
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);

  if (!clientX || !clientY) return;

  const pos = getCanvasPosition(clientX, clientY);
  lastX = pos.x;
  lastY = pos.y;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);

  // Hide placeholder
  const placeholder = document.getElementById("signaturePlaceholder");
  if (placeholder) placeholder.style.display = "none";
}

function handleTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    startDrawing(e);
  }
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();

  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);

  if (!clientX || !clientY) return;

  const pos = getCanvasPosition(clientX, clientY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  lastX = pos.x;
  lastY = pos.y;
}

function handleTouchMove(e) {
  draw(e);
}

function stopDrawing() {
  if (drawing) {
    drawing = false;
    ctx.closePath();
  }
}

function clearSignature() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Reset styles
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#003366";

  // Reset state
  document.getElementById("ttd_base64").value = "";
  document.getElementById("signaturePreview").style.display = "none";
  document.getElementById("signaturePlaceholder").style.display = "block";
  isSignatureSaved = false;

  showNotification("Tanda tangan telah dihapus", "info");
}

function saveSignature() {
  try {
    // Check if canvas is empty
    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = canvas.width;
    blankCanvas.height = canvas.height;
    const blankCtx = blankCanvas.getContext("2d");
    blankCtx.fillStyle = "#ffffff";
    blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);

    const blankData = blankCanvas.toDataURL();
    const currentData = canvas.toDataURL();

    if (blankData === currentData) {
      showNotification("Harap buat tanda tangan terlebih dahulu", "warning");
      return;
    }

    // Save signature
    const signatureData = canvas.toDataURL("image/png");
    document.getElementById("ttd_base64").value = signatureData;

    // Update preview
    const previewImg = document.getElementById("previewImage");
    if (previewImg) previewImg.src = signatureData;

    const previewContainer = document.getElementById("signaturePreview");
    if (previewContainer) previewContainer.style.display = "block";

    isSignatureSaved = true;
    showNotification("✓ Tanda tangan berhasil disimpan", "success");
  } catch (error) {
    console.error("❌ Error saving signature:", error);
    showNotification("Gagal menyimpan tanda tangan", "error");
  }
}

// ===== FORM VALIDATION =====
function setupFormValidation() {
  const formInputs = document.querySelectorAll(
    "#suratForm input, #suratForm textarea",
  );
  console.log(`✅ Form validation setup for ${formInputs.length} fields`);
}

function validateCurrentStep() {
  let isValid = true;

  if (currentStep === 1) {
    // Validasi required fields
    const requiredFields = document.querySelectorAll(
      "#step1 input[required], #step1 textarea[required]",
    );

    requiredFields.forEach((field) => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    // Validasi tanda tangan
    const signatureData = document.getElementById("ttd_base64").value;
    if (!signatureData || !signatureData.startsWith("data:image")) {
      showNotification(
        "Harap buat dan simpan tanda tangan terlebih dahulu",
        "warning",
      );
      isValid = false;
    }
  }

  return isValid;
}

function validateField(field) {
  const value = field.value.trim();
  const parent = field.parentElement;

  // Remove existing error
  const existingError = parent.querySelector(".error-message");
  if (existingError) existingError.remove();

  field.classList.remove("error");

  // Validate required
  if (field.hasAttribute("required") && !value) {
    showFieldError(field, "Field ini wajib diisi");
    return false;
  }

  // Special validation for NIP
  if (field.name === "nip" && value && !/^\d+$/.test(value)) {
    showFieldError(field, "NIP/NIK harus berupa angka");
    return false;
  }

  return true;
}

function showFieldError(field, message) {
  field.classList.add("error");

  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

  field.parentElement.appendChild(errorDiv);
}

// ===== STEP NAVIGATION =====
function goToStep(stepNumber) {
  console.log(`➡️ Navigating to step ${stepNumber}`);

  // Validate sebelum pindah ke step 2
  if (stepNumber === 2 && !validateCurrentStep()) {
    console.log("❌ Validation failed, cannot proceed to step 2");
    return;
  }

  // Hide all steps
  document.querySelectorAll(".form-section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show target step
  const targetStep = document.getElementById(`step${stepNumber}`);
  if (targetStep) {
    targetStep.classList.add("active");

    if (stepNumber === 2) {
      loadReviewData();
    }
  }

  // Update current step
  currentStep = stepNumber;
  updateProgressSteps();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgressSteps() {
  document.querySelectorAll(".step").forEach((step, index) => {
    const stepNumber = index + 1;
    step.classList.remove("active", "completed");

    if (stepNumber === currentStep) {
      step.classList.add("active");
    } else if (stepNumber < currentStep) {
      step.classList.add("completed");
    }
  });
}

// ===== REVIEW DATA =====
function loadReviewData() {
  console.log("📋 Loading review data...");

  const loading = document.getElementById("reviewLoading");
  const content = document.getElementById("reviewContent");

  if (loading) loading.style.display = "flex";
  if (content) content.style.display = "none";

  setTimeout(() => {
    try {
      // Get form values
      const formData = {
        nama: document.getElementById("nama")?.value || "-",
        nip: document.getElementById("nip")?.value || "-",
        instansi: document.getElementById("instansi")?.value || "-",
        jabatan: document.getElementById("jabatan")?.value || "-",
        kegiatan: document.getElementById("kegiatan")?.value || "-",
        periode: document.getElementById("periode")?.value || "-",
        kota: document.getElementById("kota")?.value || "-",
        ttd_base64: document.getElementById("ttd_base64")?.value || "",
      };

      // Update review fields
      const updateField = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      };

      updateField("reviewNama", formData.nama);
      updateField("reviewNip", formData.nip);
      updateField("reviewInstansi", formData.instansi);
      updateField("reviewJabatan", formData.jabatan || "Tidak diisi");
      updateField("reviewKegiatan", formData.kegiatan);
      updateField("reviewPeriode", formData.periode);
      updateField("reviewKota", formData.kota);

      // Update signature preview
      if (formData.ttd_base64) {
        const imgElement = document.getElementById("reviewSignatureImage");
        if (imgElement) imgElement.src = formData.ttd_base64;
      }

      // Show content
      if (loading) loading.style.display = "none";
      if (content) content.style.display = "block";
    } catch (error) {
      console.error("❌ Error loading review data:", error);
      showNotification("Gagal memuat data review", "error");
    }
  }, 300);
}

// ===== FORM RESET =====
function resetFormState() {
  // Reset form fields
  const form = document.getElementById("suratForm");
  if (form) form.reset();

  // Clear signature
  if (canvas && ctx) {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  // Reset signature state
  document.getElementById("ttd_base64").value = "";
  const previewContainer = document.getElementById("signaturePreview");
  if (previewContainer) previewContainer.style.display = "none";

  const placeholder = document.getElementById("signaturePlaceholder");
  if (placeholder) placeholder.style.display = "block";

  isSignatureSaved = false;

  // Reset agreement
  const agreeCheckbox = document.getElementById("agreeTerms");
  if (agreeCheckbox) agreeCheckbox.checked = false;

  // Go to step 1
  currentStep = 1;
  updateProgressSteps();

  // Show only step 1
  document.querySelectorAll(".form-section").forEach((section, index) => {
    if (index === 0) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  });
}

function resetForm() {
  if (confirm("Apakah Anda yakin ingin mengosongkan semua data?")) {
    resetFormState();
    showNotification("Form telah direset", "info");
  }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = "info") {
  console.log(`📢 Notification [${type}]: ${message}`);

  const notification = document.getElementById("notification");
  const messageElement = document.getElementById("notificationMessage");

  if (!notification || !messageElement) {
    alert(message);
    return;
  }

  messageElement.textContent = message;
  notification.className = `notification ${type}`;

  const icon = notification.querySelector("i");
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

  notification.style.display = "flex";

  setTimeout(() => {
    notification.style.display = "none";
  }, 5000);
}

function hideNotification() {
  const notification = document.getElementById("notification");
  if (notification) {
    notification.style.display = "none";
  }
}

// ===== DEBUG FUNCTIONS =====
function debugFormData() {
  console.log("🔍 === DEBUG FORM DATA ===");

  const form = document.getElementById("suratForm");
  if (!form) {
    console.error("❌ Form not found");
    return;
  }

  const formData = new FormData(form);
  console.log("📋 Form Data:");

  for (let [key, value] of formData.entries()) {
    if (key === "ttd_base64") {
      console.log(
        `  ${key}: ${value ? "Present (" + value.length + " chars)" : "Empty"}`,
      );
    } else if (key === "agree_terms") {
      console.log(`  ${key}: ${value}`);
    } else {
      console.log(`  ${key}: "${value}"`);
    }
  }

  console.log("📊 Current State:");
  console.log(`  - currentStep: ${currentStep}`);
  console.log(`  - isSignatureSaved: ${isSignatureSaved}`);
  console.log(`  - formSubmitted: ${formSubmitted}`);
  console.log(
    `  - agreement checked: ${document.getElementById("agreeTerms")?.checked || false}`,
  );

  console.log("🔍 === END DEBUG ===");
}

// ===== EXPORT FUNCTIONS =====
window.debugFormData = debugFormData;
window.goToStep = goToStep;
window.saveSignature = saveSignature;
window.clearSignature = clearSignature;
window.resetForm = resetForm;
window.handleFormSubmission = handleFormSubmission;
window.validateCurrentStep = validateCurrentStep;

console.log(
  "✅ form_02.js v4.0 loaded - No draft system, auto redirect to dashboard",
);
