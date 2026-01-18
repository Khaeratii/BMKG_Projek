/**
 * Form Edit JavaScript - BMKG Wilayah IV
 * Script khusus untuk halaman edit usulan/draft
 */

// Global variables
let currentStep = 1;
let formData = {};

// Initialize form
function setupFormSteps() {
  // Set current step
  currentStep = 1;
  updateStepDisplay();

  // Setup date inputs
  setupDateInputs();

  // Setup event listeners
  setupEventListeners();
}

function setupDateInputs() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Set minimum dates
  const tanggalInput = document.getElementById("tanggalInput");
  const tglEfektif = document.getElementById("tglEfektif");
  const hasilDibutuhkan = document.getElementById("hasilDibutuhkan");

  if (tanggalInput && !tanggalInput.value) {
    tanggalInput.valueAsDate = today;
  }

  if (tglEfektif && !tglEfektif.value) {
    tglEfektif.min = tomorrow.toISOString().split("T")[0];
  }

  if (hasilDibutuhkan && !hasilDibutuhkan.value) {
    hasilDibutuhkan.min = tomorrow.toISOString().split("T")[0];
  }
}

function setupEventListeners() {
  // Date change listeners
  const tanggalInput = document.getElementById("tanggalInput");
  const tglEfektif = document.getElementById("tglEfektif");
  const hasilDibutuhkan = document.getElementById("hasilDibutuhkan");

  if (tanggalInput) {
    tanggalInput.addEventListener("change", function () {
      const selectedDate = new Date(this.value);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(selectedDate.getDate() + 1);

      if (tglEfektif) {
        tglEfektif.min = nextDay.toISOString().split("T")[0];
        if (new Date(tglEfektif.value) < nextDay) {
          tglEfektif.value = nextDay.toISOString().split("T")[0];
        }
      }

      if (hasilDibutuhkan) {
        hasilDibutuhkan.min = nextDay.toISOString().split("T")[0];
        if (new Date(hasilDibutuhkan.value) < nextDay) {
          hasilDibutuhkan.value = nextDay.toISOString().split("T")[0];
        }
      }

      updateReviewPreview();
    });
  }

  if (tglEfektif) {
    tglEfektif.addEventListener("change", updateReviewPreview);
  }

  if (hasilDibutuhkan) {
    hasilDibutuhkan.addEventListener("change", updateReviewPreview);
  }

  // Textarea listeners
  const deskripsiInput = document.getElementById("deskripsiInput");
  const alasanInput = document.getElementById("alasanInput");

  if (deskripsiInput) {
    deskripsiInput.addEventListener("input", function () {
      updateCharacterCounter(this, "deskripsi");
      updateReviewPreview();
    });
  }

  if (alasanInput) {
    alasanInput.addEventListener("input", function () {
      updateCharacterCounter(this, "alasan");
      updateReviewPreview();
    });
  }
}

function setupCharacterCounters() {
  const deskripsiInput = document.getElementById("deskripsiInput");
  const alasanInput = document.getElementById("alasanInput");

  if (deskripsiInput) {
    updateCharacterCounter(deskripsiInput, "deskripsi");
  }

  if (alasanInput) {
    updateCharacterCounter(alasanInput, "alasan");
  }
}

function updateCharacterCounter(textarea, type) {
  const counter = document.getElementById(`${type}Counter`);
  if (!counter) return;

  const length = textarea.value.length;
  counter.textContent = `${length} karakter`;

  if (length < 50) {
    counter.className = "char-counter error";
  } else if (length < 100) {
    counter.className = "char-counter warning";
  } else {
    counter.className = "char-counter";
  }
}

function setupDateValidation() {
  const tglEfektif = document.getElementById("tglEfektif");
  const hasilDibutuhkan = document.getElementById("hasilDibutuhkan");

  if (tglEfektif && hasilDibutuhkan) {
    tglEfektif.addEventListener("change", function () {
      const efektifDate = new Date(this.value);
      const hasilDate = new Date(hasilDibutuhkan.value);

      if (hasilDate < efektifDate) {
        hasilDibutuhkan.value = this.value;
      }
    });
  }
}

function setupFormSubmission() {
  const form = document.getElementById("proposalForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    if (!validateForm()) {
      e.preventDefault();
      showToast("Harap periksa kembali data yang diisi", "error");
      return false;
    }

    // Show loading
    showLoading(true);

    // Disable buttons
    const buttons = form.querySelectorAll('button[type="submit"]');
    buttons.forEach((button) => {
      button.disabled = true;
    });

    // Form akan submit secara normal
    return true;
  });
}

// Step navigation
function goToStep(stepNumber) {
  if (!validateCurrentStep()) {
    showToast("Harap lengkapi data pada langkah ini", "warning");
    return;
  }

  // Hide current step
  const currentStepElement = document.getElementById(`step${currentStep}`);
  if (currentStepElement) {
    currentStepElement.classList.remove("active");
  }

  // Remove active class from current step indicator
  const currentStepIndicator = document.querySelector(
    `.step:nth-child(${currentStep})`
  );
  if (currentStepIndicator) {
    currentStepIndicator.classList.remove("active");
  }

  // Update current step
  currentStep = stepNumber;

  // Show new step
  const newStepElement = document.getElementById(`step${currentStep}`);
  if (newStepElement) {
    newStepElement.classList.add("active");
  }

  // Add active class to new step indicator
  const newStepIndicator = document.querySelector(
    `.step:nth-child(${currentStep})`
  );
  if (newStepIndicator) {
    newStepIndicator.classList.add("active");
  }

  // Update review preview jika masuk ke step 3
  if (currentStep === 3) {
    updateReviewPreview();
  }

  updateStepDisplay();
}

function nextStep() {
  if (currentStep < 3) {
    goToStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) {
    goToStep(currentStep - 1);
  }
}

function updateStepDisplay() {
  // Update step indicators
  const steps = document.querySelectorAll(".step");
  steps.forEach((step, index) => {
    const stepNumber = index + 1;
    if (stepNumber < currentStep) {
      step.classList.add("completed");
      step.classList.remove("active");
    } else if (stepNumber === currentStep) {
      step.classList.add("active");
      step.classList.remove("completed");
    } else {
      step.classList.remove("active", "completed");
    }
  });
}

// Form validation
function validateCurrentStep() {
  const currentStepElement = document.getElementById(`step${currentStep}`);
  if (!currentStepElement) return true;

  const requiredInputs = currentStepElement.querySelectorAll("[required]");
  let isValid = true;

  requiredInputs.forEach((input) => {
    if (!validateField(input)) {
      isValid = false;
      markFieldError(input, true);
    } else {
      markFieldError(input, false);
    }
  });

  return isValid;
}

function validateForm() {
  let isValid = true;

  // Check all steps
  for (let i = 1; i <= 3; i++) {
    const stepElement = document.getElementById(`step${i}`);
    if (stepElement) {
      const requiredInputs = stepElement.querySelectorAll("[required]");
      requiredInputs.forEach((input) => {
        if (!validateField(input)) {
          isValid = false;
          markFieldError(input, true);
        }
      });
    }
  }

  return isValid;
}

function validateField(field) {
  if (!field.required) return true;

  const value = field.value.trim();

  if (!value) {
    return false;
  }

  // Additional validation based on field type
  if (field.type === "date") {
    const dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) {
      return false;
    }
  }

  if (field.type === "textarea") {
    if (value.length < 10) {
      return false;
    }
  }

  return true;
}

function markFieldError(field, hasError) {
  if (hasError) {
    field.classList.add("error");
  } else {
    field.classList.remove("error");
  }
}

function markRequiredFields() {
  const requiredFields = document.querySelectorAll("[required]");
  requiredFields.forEach((field) => {
    const label = field.closest(".form-group")?.querySelector(".form-label");
    if (label && !label.classList.contains("required")) {
      label.classList.add("required");
    }
  });
}

// Review preview
function updateReviewPreview() {
  if (currentStep !== 3) return;

  // Tanggal
  const tanggalInput = document.getElementById("tanggalInput");
  const tglEfektif = document.getElementById("tglEfektif");
  const hasilDibutuhkan = document.getElementById("hasilDibutuhkan");
  const deskripsiInput = document.getElementById("deskripsiInput");
  const alasanInput = document.getElementById("alasanInput");

  // Format dates
  function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // Update review display
  if (tanggalInput) {
    document.getElementById("reviewTanggal").textContent = formatDate(
      tanggalInput.value
    );
  }

  if (tglEfektif) {
    document.getElementById("reviewEfektif").textContent = formatDate(
      tglEfektif.value
    );
  }

  if (hasilDibutuhkan) {
    document.getElementById("reviewDibutuhkan").textContent = formatDate(
      hasilDibutuhkan.value
    );
  }

  if (deskripsiInput) {
    const deskripsi = deskripsiInput.value.trim() || "-";
    document.getElementById("reviewDeskripsi").textContent = deskripsi;
    document.getElementById("reviewDeskripsi").style.whiteSpace = "pre-wrap";
  }

  if (alasanInput) {
    const alasan = alasanInput.value.trim() || "-";
    document.getElementById("reviewAlasan").textContent = alasan;
    document.getElementById("reviewAlasan").style.whiteSpace = "pre-wrap";
  }
}

// Toast notification
function showToast(message, type = "info") {
  // Remove existing toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  // Icons based on type
  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };

  toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Auto hide after 5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, 5000);
}

// Loading overlay
function showLoading(show) {
  let overlay = document.getElementById("loadingOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
  }

  if (show) {
    overlay.classList.add("active");
  } else {
    overlay.classList.remove("active");
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Initialize form
  setupFormSteps();

  // Update initial review preview
  updateReviewPreview();

  // Add window event listeners
  window.addEventListener("beforeunload", function (e) {
    // Optional: Warn user about unsaved changes
    // const form = document.getElementById('proposalForm');
    // if (form && form.checkValidity()) {
    //     e.preventDefault();
    //     e.returnValue = '';
    // }
  });
});

// Utility functions
function formatDateToInput(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
}

function getFormData() {
  const form = document.getElementById("proposalForm");
  const data = new FormData(form);
  const result = {};

  for (const [key, value] of data.entries()) {
    result[key] = value;
  }

  return result;
}
