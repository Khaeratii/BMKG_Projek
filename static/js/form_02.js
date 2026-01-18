/* ================================================
   FORM SCRIPT - BMKG WILAYAH VI MAKASSAR
   ================================================ */

// Global variables
let currentStep = 1;
let isSignatureSaved = false;
let canvas, ctx;
let drawing = false;
let lastX = 0;
let lastY = 0;

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 DOM Content Loaded - Form 02");
  initSignaturePad();
  updateProgressSteps();
  setupButtonListeners();
  loadDraft();
  setupFormValidation();

  // Debug: Cek semua field
  debugInitialFormState();

  // Auto-save draft setiap 30 detik
  setInterval(autoSaveDraft, 30000);
});

// ===== DEBUG INITIAL STATE =====
function debugInitialFormState() {
  console.log("🔍 Initial Form State Debug:");

  // Cek semua required fields
  const requiredFields = [
    { id: "nama", name: "Nama" },
    { id: "nip", name: "NIP" },
    { id: "instansi", name: "Instansi" },
    { id: "kegiatan", name: "Kegiatan" },
    { id: "periode", name: "Periode" },
  ];

  requiredFields.forEach((field) => {
    const element = document.getElementById(field.id);
    console.log(
      `  ${field.name}: ${element ? element.value || "empty" : "not found"}`
    );
  });

  // Cek signature
  const ttdInput = document.getElementById("ttd_base64");
  console.log(
    `  Signature: ${ttdInput ? ttdInput.value.length + " chars" : "not found"}`
  );

  // Cek agreement checkbox
  const agreeCheckbox = document.getElementById("agreeTerms");
  console.log(
    `  Agreement: ${
      agreeCheckbox
        ? agreeCheckbox.checked
          ? "checked"
          : "unchecked"
        : "not found"
    }`
  );
}

// ===== SETUP BUTTON LISTENERS =====
function setupButtonListeners() {
  console.log("🔧 Setting up button listeners...");

  // 1. Tombol Simpan Tanda Tangan
  const saveSignatureBtn = document.querySelector(".btn-save-signature");
  if (saveSignatureBtn) {
    saveSignatureBtn.addEventListener("click", saveSignature);
    console.log("✅ Save signature button listener added");
  } else {
    console.warn("⚠️ Save signature button not found!");
  }

  // 2. Tombol Hapus Tanda Tangan
  const clearSignatureBtn = document.querySelector(".btn-clear-signature");
  if (clearSignatureBtn) {
    clearSignatureBtn.addEventListener("click", clearSignature);
    console.log("✅ Clear signature button listener added");
  } else {
    console.warn("⚠️ Clear signature button not found!");
  }

  // 3. Tombol Reset Form
  const resetBtns = document.querySelectorAll("[onclick*='resetForm']");
  resetBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      resetForm();
    });
    console.log("✅ Reset button listener added");
  });

  // 4. Tombol Preview (Next)
  const previewBtns = document.querySelectorAll("[onclick*='goToStep(2)']");
  previewBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      goToStep(2);
    });
    console.log("✅ Preview button listener added");
  });

  // 5. Tombol Edit Data (Back to step 1)
  const editBtns = document.querySelectorAll("[onclick*='goToStep(1)']");
  editBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      goToStep(1);
    });
    console.log("✅ Edit button listener added");
  });

  // 6. Tombol Simpan Draft
  const draftBtns = document.querySelectorAll("[onclick*='saveDraftAndExit']");
  draftBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      saveDraftAndExit();
    });
    console.log("✅ Save draft button listener added");
  });

  // 7. Tombol Submit Form (utama) - PERBAIKAN UTAMA DI SINI
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("📤 Submit button clicked");

      // Debug sebelum submit
      debugFormData();

      // Validasi checkbox agreement terlebih dahulu
      const agreeCheckbox = document.getElementById("agreeTerms");
      if (!agreeCheckbox || !agreeCheckbox.checked) {
        showNotification(
          "❌ Harap setujui persyaratan terlebih dahulu!",
          "error"
        );

        // Scroll ke checkbox
        if (agreeCheckbox) {
          agreeCheckbox.scrollIntoView({ behavior: "smooth", block: "center" });
          agreeCheckbox.focus();
        }

        return;
      }

      // Jika validasi oke, lanjut submit
      submitForm(e);
    });
    console.log("✅ Submit button listener added");
  } else {
    console.warn("⚠️ Submit button not found!");
  }

  // 8. Tombol Checkbox Agreement - DIPERBAIKI
  const agreeCheckbox = document.getElementById("agreeTerms");
  if (agreeCheckbox) {
    agreeCheckbox.addEventListener("change", function () {
      console.log(
        `✅ Agreement checkbox: ${this.checked ? "checked" : "unchecked"}`
      );

      // Update tombol submit
      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn) {
        if (this.checked) {
          submitBtn.classList.remove("btn-disabled");
          submitBtn.title = "Klik untuk mengirim surat pernyataan";
        } else {
          submitBtn.classList.add("btn-disabled");
          submitBtn.title = "Harap centang persetujuan terlebih dahulu";
        }
      }
    });
    console.log("✅ Agreement checkbox listener added");
  }

  // 9. Tombol Real-time Validation pada Input Fields
  const formInputs = document.querySelectorAll(
    "#suratForm input, #suratForm textarea"
  );
  formInputs.forEach((input) => {
    // Validasi saat kehilangan fokus
    input.addEventListener("blur", function () {
      validateField(this);
    });

    // Validasi saat mengetik (untuk field tertentu)
    if (input.name === "nip") {
      input.addEventListener("input", function () {
        // Format NIP: hanya angka
        this.value = this.value.replace(/\D/g, "");
      });
    }

    // Auto-uppercase untuk nama dan instansi
    if (
      input.name === "nama" ||
      input.name === "instansi" ||
      input.name === "kota"
    ) {
      input.addEventListener("input", function () {
        this.value = this.value.toUpperCase();
      });
    }
  });
  console.log(
    `✅ Real-time validation added to ${formInputs.length} form fields`
  );

  // 10. Tombol untuk Test Database Connection (Debug)
  const testDBBtn = document.createElement("button");
  testDBBtn.innerHTML = '<i class="fas fa-database"></i> Test DB';
  testDBBtn.className = "btn-secondary";
  testDBBtn.style.position = "fixed";
  testDBBtn.style.bottom = "20px";
  testDBBtn.style.left = "20px";
  testDBBtn.style.zIndex = "9999";
  testDBBtn.style.padding = "8px 12px";
  testDBBtn.style.fontSize = "12px";
  testDBBtn.style.borderRadius = "4px";
  testDBBtn.style.backgroundColor = "#6c757d";
  testDBBtn.style.color = "white";
  testDBBtn.style.border = "none";
  testDBBtn.style.cursor = "pointer";

  testDBBtn.addEventListener("click", async function () {
    console.log("🧪 Testing database connection...");

    // Show loading state
    const originalText = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    this.disabled = true;

    try {
      const response = await fetch("/surat-pernyataan/test-db");
      const result = await response.json();

      console.log("📊 Database test result:", result);

      if (result.status === "success") {
        showNotification("✅ Database connection successful!", "success");
      } else {
        showNotification(`❌ Database error: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("❌ Database test failed:", error);
      showNotification("Database test failed: " + error.message, "error");
    } finally {
      // Restore button state
      this.innerHTML = originalText;
      this.disabled = false;
    }
  });

  document.body.appendChild(testDBBtn);
  console.log("✅ Database test button added");

  // 11. Tombol Debug untuk melihat form data
  const debugBtn = document.createElement("button");
  debugBtn.innerHTML = '<i class="fas fa-bug"></i> Debug';
  debugBtn.className = "btn-warning";
  debugBtn.style.position = "fixed";
  debugBtn.style.bottom = "60px";
  debugBtn.style.left = "20px";
  debugBtn.style.zIndex = "9999";
  debugBtn.style.padding = "8px 12px";
  debugBtn.style.fontSize = "12px";
  debugBtn.style.borderRadius = "4px";
  debugBtn.style.backgroundColor = "#ffc107";
  debugBtn.style.color = "#212529";
  debugBtn.style.border = "none";
  debugBtn.style.cursor = "pointer";

  debugBtn.addEventListener("click", debugFormData);

  document.body.appendChild(debugBtn);
  console.log("✅ Debug button added");

  // 12. Keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Ctrl/Cmd + S untuk save draft
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      console.log("⌨️ Keyboard shortcut: Ctrl+S (Save Draft)");
      saveDraft(true);
      showNotification("Draft disimpan dengan keyboard shortcut", "success");
    }

    // Ctrl/Cmd + Enter untuk submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      console.log("⌨️ Keyboard shortcut: Ctrl+Enter (Submit)");

      if (currentStep === 2) {
        const submitBtn = document.getElementById("submitBtn");
        if (submitBtn && !submitBtn.disabled) {
          // Cek agreement dulu
          const agreeCheckbox = document.getElementById("agreeTerms");
          if (!agreeCheckbox || !agreeCheckbox.checked) {
            showNotification(
              "Harap centang persetujuan terlebih dahulu!",
              "error"
            );
            return;
          }
          submitForm(new Event("submit"));
        }
      } else {
        goToStep(2);
      }
    }

    // Esc untuk kembali ke step sebelumnya
    if (e.key === "Escape" && currentStep > 1) {
      e.preventDefault();
      console.log("⌨️ Keyboard shortcut: ESC (Go Back)");
      goToStep(currentStep - 1);
    }
  });

  console.log("✅ Keyboard shortcuts enabled");

  // 13. Handle form submission dengan Enter di field
  const form = document.getElementById("suratForm");
  if (form) {
    form.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && e.target.type !== "textarea") {
        e.preventDefault();

        if (currentStep === 1) {
          goToStep(2);
        }
      }
    });
    console.log("✅ Form enter key handler added");
  }

  // 14. Handle browser back/forward buttons
  window.addEventListener("popstate", function (e) {
    console.log("📍 Popstate event triggered");

    // Cek URL untuk menentukan step
    const urlStep = window.location.hash.replace("#step", "");
    if (urlStep && !isNaN(urlStep)) {
      const targetStep = parseInt(urlStep);
      if (targetStep >= 1 && targetStep <= 2 && targetStep !== currentStep) {
        goToStep(targetStep);
      }
    }
  });

  // 15. Update URL hash saat berpindah step
  function updateUrlHash() {
    window.history.pushState({ step: currentStep }, "", `#step${currentStep}`);
  }

  // Simpan fungsi ini untuk digunakan di goToStep
  window.updateUrlHash = updateUrlHash;

  console.log("✅ All button listeners setup complete");
}

// ===== DEBUG FORM DATA =====
function debugFormData() {
  const form = document.getElementById("suratForm");
  if (!form) {
    console.error("❌ Form not found!");
    return;
  }

  const formData = new FormData(form);
  console.log("🔍 === DEBUG FORM DATA ===");
  console.log("📋 Form Data Entries:");

  for (let [key, value] of formData.entries()) {
    if (key === "ttd_base64") {
      console.log(
        `  ${key}: ${
          value.length > 100
            ? "[BASE64_SIGNATURE] " + value.substring(0, 50) + "..."
            : "Empty or too short"
        }`
      );
    } else {
      console.log(`  ${key}: "${value}"`);
    }
  }

  // Log current state
  console.log("📊 Current State:");
  console.log(`  - currentStep: ${currentStep}`);
  console.log(`  - isSignatureSaved: ${isSignatureSaved}`);
  console.log(`  - canvas exists: ${!!canvas}`);
  console.log(
    `  - agreement checked: ${
      document.getElementById("agreeTerms")?.checked || false
    }`
  );

  // Test signature validation
  const ttd = document.getElementById("ttd_base64").value;
  console.log(`  - signature length: ${ttd.length}`);
  console.log(
    `  - signature valid: ${
      ttd && ttd.startsWith("data:image/png") ? "Yes" : "No"
    }`
  );

  // Validate form
  console.log("✅ Form validation result:", validateForm() ? "PASS" : "FAIL");

  // Cek khusus untuk agreement
  const agreeCheckbox = document.getElementById("agreeTerms");
  console.log(
    `  - Agreement checkbox: ${agreeCheckbox ? "found" : "not found"}`
  );
  if (agreeCheckbox) {
    console.log(
      `  - Agreement checked: ${
        agreeCheckbox.checked ? "YES" : "NO (THIS IS THE PROBLEM)"
      }`
    );
  }

  console.log("🔍 === END DEBUG ===");
}

// ===== STEP NAVIGATION =====
function goToStep(stepNumber) {
  console.log(`➡ Navigating to step ${stepNumber}`);

  // Validate current step before proceeding
  if (stepNumber > currentStep && !validateCurrentStep()) {
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

    // Special handling for step 2 (preview)
    if (stepNumber === 2) {
      loadReviewData();
    }
  }

  // Update current step
  currentStep = stepNumber;
  updateProgressSteps();

  // Scroll to top of form
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Auto-save draft
  autoSaveDraft();
}

function updateProgressSteps() {
  document.querySelectorAll(".step").forEach((step, index) => {
    const stepNumber = index + 1;

    // Remove all classes
    step.classList.remove("active", "completed");

    // Add appropriate class
    if (stepNumber === currentStep) {
      step.classList.add("active");
    } else if (stepNumber < currentStep) {
      step.classList.add("completed");
    }
  });
}

// ===== SIGNATURE PAD =====
function initSignaturePad() {
  canvas = document.getElementById("signature-pad");
  if (!canvas) {
    console.error("❌ Canvas element not found!");
    return;
  }

  ctx = canvas.getContext("2d");

  // Set canvas size
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Event listeners untuk mouse
  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);

  // Event listeners untuk touch (mobile)
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", stopDrawing);

  console.log("✅ Signature pad initialized");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  // Set canvas dimensions
  canvas.width = rect.width;
  canvas.height = rect.height;

  // Set drawing styles
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#003366";
  ctx.fillStyle = "#ffffff";

  // Clear dengan background putih
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  const pos = getCanvasPosition(e.clientX, e.clientY);
  lastX = pos.x;
  lastY = pos.y;

  // Start new path
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);

  // Hide placeholder
  document.getElementById("signaturePlaceholder").style.display = "none";
}

function handleTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const pos = getCanvasPosition(touch.clientX, touch.clientY);
    drawing = true;
    lastX = pos.x;
    lastY = pos.y;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    document.getElementById("signaturePlaceholder").style.display = "none";
  }
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();

  const pos = getCanvasPosition(e.clientX, e.clientY);

  // Draw line
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  // Update last position
  lastX = pos.x;
  lastY = pos.y;
}

function handleTouchMove(e) {
  if (!drawing) return;
  e.preventDefault();

  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const pos = getCanvasPosition(touch.clientX, touch.clientY);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
  }
}

function stopDrawing() {
  if (drawing) {
    drawing = false;
    ctx.closePath();
  }
}

function clearSignature() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill dengan background putih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Reset drawing styles
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#003366";

  // Reset state
  document.getElementById("ttd_base64").value = "";
  document.getElementById("signaturePreview").style.display = "none";
  document.getElementById("signaturePlaceholder").style.display = "block";
  isSignatureSaved = false;

  console.log("🗑️ Signature cleared");
  showNotification("Tanda tangan telah dihapus", "info");
}

function saveSignature() {
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

  try {
    // Get signature data
    const signatureData = canvas.toDataURL("image/png");

    // Save to hidden input
    document.getElementById("ttd_base64").value = signatureData;

    // Update preview
    const previewImg = document.getElementById("previewImage");
    previewImg.src = signatureData;
    document.getElementById("signaturePreview").style.display = "block";

    // Update state
    isSignatureSaved = true;

    console.log("✅ Signature saved successfully");
    showNotification("✓ Tanda tangan berhasil disimpan", "success");
  } catch (error) {
    console.error("❌ Error saving signature:", error);
    showNotification("Gagal menyimpan tanda tangan", "error");
  }
}

// ===== FORM VALIDATION =====
function setupFormValidation() {
  // Real-time validation untuk required fields
  const requiredInputs = document.querySelectorAll(
    "input[required], textarea[required]"
  );
  requiredInputs.forEach((input) => {
    input.addEventListener("blur", function () {
      validateField(this);
    });
  });
}

function validateCurrentStep() {
  let isValid = true;

  // Validasi semua required fields
  const requiredFields = document.querySelectorAll(
    ".form-section.active input[required], .form-section.active textarea[required]"
  );

  requiredFields.forEach((field) => {
    if (!validateField(field)) {
      isValid = false;
    }
  });

  // Validasi khusus untuk tanda tangan (hanya di step 1)
  if (currentStep === 1) {
    const signatureData = document.getElementById("ttd_base64").value;
    if (!signatureData || signatureData.trim() === "") {
      showNotification(
        "Harap buat dan simpan tanda tangan terlebih dahulu",
        "warning"
      );
      isValid = false;
    }
  }

  return isValid;
}

function validateField(field) {
  const value = field.value.trim();
  const parent = field.parentElement;

  // Remove existing error messages
  const existingError = parent.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  // Remove error class
  field.classList.remove("error");

  // Validate berdasarkan tipe field
  if (!value) {
    showFieldError(field, "Field ini wajib diisi");
    return false;
  }

  // Validasi tambahan untuk NIP
  if (field.name === "nip" && !/^\d+$/.test(value)) {
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

// ===== REVIEW STEP FUNCTIONS =====
function loadReviewData() {
  console.log("📋 Loading review data...");

  // Show loading
  document.getElementById("reviewLoading").style.display = "flex";
  document.getElementById("reviewContent").style.display = "none";

  // Simulate loading delay
  setTimeout(() => {
    try {
      // Get form data
      const form = document.getElementById("suratForm");
      const formData = new FormData(form);

      // Update review fields
      document.getElementById("reviewNama").textContent =
        formData.get("nama") || "-";
      document.getElementById("reviewNip").textContent =
        formData.get("nip") || "-";
      document.getElementById("reviewInstansi").textContent =
        formData.get("instansi") || "-";
      document.getElementById("reviewKegiatan").textContent =
        formData.get("kegiatan") || "-";
      document.getElementById("reviewPeriode").textContent =
        formData.get("periode") || "-";
      document.getElementById("reviewKota").textContent =
        formData.get("kota") || "-";

      // Update signature preview
      const signatureData = formData.get("ttd_base64");
      if (signatureData) {
        document.getElementById("reviewSignatureImage").src = signatureData;
      }

      // Show review content
      document.getElementById("reviewLoading").style.display = "none";
      document.getElementById("reviewContent").style.display = "block";

      console.log("✅ Review data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading review data:", error);
      showNotification("Gagal memuat data review", "error");
    }
  }, 300);
}

// ===== DRAFT FUNCTIONS =====
let autoSaveTimeout;
function autoSaveDraft() {
  // Debounce function
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    saveDraft(false); // false = auto save
  }, 1000);
}

function saveDraft(isManual = false) {
  try {
    const formData = new FormData(document.getElementById("suratForm"));
    const draftData = {};

    // Convert FormData ke object
    for (let [key, value] of formData.entries()) {
      draftData[key] = value;
    }

    // Add metadata
    draftData.savedAt = new Date().toISOString();
    draftData.currentStep = currentStep;
    draftData.isSignatureSaved = isSignatureSaved;

    // Save ke localStorage
    localStorage.setItem("suratDraft", JSON.stringify(draftData));

    if (isManual) {
      showNotification("✓ Draft berhasil disimpan", "success");
    }

    console.log("💾 Draft saved" + (isManual ? " (manual)" : " (auto)"));
  } catch (error) {
    console.error("❌ Error saving draft:", error);
    if (isManual) {
      showNotification("Gagal menyimpan draft", "error");
    }
  }
}

function saveDraftAndExit() {
  // Validasi form terlebih dahulu
  if (!validateCurrentStep()) {
    showNotification(
      "Harap lengkapi semua data sebelum menyimpan draft",
      "warning"
    );
    return;
  }

  // Simpan draft
  saveDraft(true);

  // Tampilkan konfirmasi
  if (
    confirm("Draft berhasil disimpan. Apakah Anda ingin kembali ke dashboard?")
  ) {
    window.location.href = "/dashboard";
  }
}

function loadDraft() {
  try {
    const draftData = localStorage.getItem("suratDraft");
    if (!draftData) {
      console.log("📭 No draft found");
      return;
    }

    console.log("📂 Loading draft from localStorage...");
    const data = JSON.parse(draftData);

    // Populate form fields
    Object.keys(data).forEach((key) => {
      const element = document.querySelector(`[name="${key}"]`);
      if (
        element &&
        data[key] &&
        !["savedAt", "currentStep", "isSignatureSaved"].includes(key)
      ) {
        element.value = data[key];
      }
    });

    // Restore signature jika ada
    if (data.ttd_base64 && data.ttd_base64.startsWith("data:image/png")) {
      console.log("🎨 Restoring signature from draft...");

      const img = new Image();
      img.onload = function () {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Update state
        document.getElementById("ttd_base64").value = data.ttd_base64;
        document.getElementById("signaturePlaceholder").style.display = "none";
        isSignatureSaved = data.isSignatureSaved || false;

        // Show preview
        const previewImg = document.getElementById("previewImage");
        previewImg.src = data.ttd_base64;
        document.getElementById("signaturePreview").style.display = "block";

        console.log("✅ Signature restored from draft");
      };

      img.onerror = function () {
        console.error("❌ Failed to load signature image from draft");
      };

      img.src = data.ttd_base64;
    }

    // Restore step jika ada
    if (data.currentStep && data.currentStep > 1) {
      setTimeout(() => {
        goToStep(data.currentStep);
      }, 500);
    }

    console.log("✅ Draft loaded successfully");
  } catch (error) {
    console.error("❌ Error loading draft:", error);
    localStorage.removeItem("suratDraft");
  }
}

// ===== FORM SUBMISSION =====
async function submitForm(event) {
  event.preventDefault();

  console.log("[INFO] Submitting form to /surat-pernyataan/generate...");

  // Validasi form terlebih dahulu - PERBAIKAN: JANGAN PERCAYA validateForm() SAJA
  const validationResult = validateForm();
  if (!validationResult) {
    console.error("❌ Form validation failed");
    return false;
  }

  // Validasi tambahan untuk agreement checkbox
  const agreeCheckbox = document.getElementById("agreeTerms");
  if (!agreeCheckbox || !agreeCheckbox.checked) {
    showNotification("❌ Harap setujui persyaratan terlebih dahulu!", "error");

    // Scroll dan focus ke checkbox
    if (agreeCheckbox) {
      agreeCheckbox.scrollIntoView({ behavior: "smooth", block: "center" });
      agreeCheckbox.focus();
      agreeCheckbox.parentElement.style.border = "2px solid #dc3545";
      setTimeout(() => {
        agreeCheckbox.parentElement.style.border = "";
      }, 3000);
    }

    return false;
  }

  // Disable submit button
  const submitBtn = document.getElementById("submitBtn");
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

  // Show loading notification
  showNotification("Menyimpan data ke database dan membuat PDF...", "info");

  try {
    // Kumpulkan data form menggunakan FormData
    const formData = new FormData();

    // Ambil semua data dari form
    const form = document.getElementById("suratForm");
    const inputs = form.querySelectorAll("input, textarea, select");

    inputs.forEach((input) => {
      if (input.type !== "checkbox" || input.checked) {
        formData.append(input.name, input.value);
      }
    });

    // DEBUG: Log data yang akan dikirim
    console.log("📤 Data to be sent:");
    for (let [key, value] of formData.entries()) {
      if (key === "ttd_base64") {
        console.log(`  ${key}: ${value.substring(0, 50)}...`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    // Kirim ke server dengan AJAX header
    console.log("🚀 Sending POST request to /surat-pernyataan/generate");

    const response = await fetch("/surat-pernyataan/generate", {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest", // Penting untuk deteksi AJAX
      },
    });

    // Check response status
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Server error response:", errorText.substring(0, 500));
      throw new Error(
        `Server error: ${response.status} ${response.statusText}`
      );
    }

    // Parse response as text first
    const responseText = await response.text();
    console.log(
      "📥 Raw response (first 500 chars):",
      responseText.substring(0, 500)
    );

    // Coba parse sebagai JSON
    try {
      const result = JSON.parse(responseText);
      console.log("📊 Parsed JSON response:", result);

      if (result.status === "success") {
        // Success - redirect ke main dashboard
        showNotification(
          "✅ Data berhasil disimpan! Mengarahkan ke dashboard...",
          "success"
        );

        // Clear draft
        localStorage.removeItem("suratDraft");

        // Redirect ke main_dashboard setelah berhasil
        setTimeout(() => {
          if (result.redirect) {
            console.log("↪️ Redirecting to:", result.redirect);
            window.location.href = result.redirect;
          } else {
            console.log("↪️ Redirecting to main dashboard");
            window.location.href = "/dashboard";
          }
        }, 1500);

        return true;
      } else if (result.status === "partial_success") {
        // Partial success - PDF dibuat tapi DB error
        showNotification(
          result.message || "PDF berhasil dibuat tapi ada masalah database",
          "warning"
        );

        // Tetap redirect ke dashboard
        setTimeout(() => {
          console.log("↪️ Redirecting to main dashboard (partial success)");
          window.location.href = "/dashboard";
        }, 1500);

        return true;
      } else {
        // Error dari server
        showNotification(
          result.message || result.error || "Gagal menyimpan data",
          "error"
        );
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return false;
      }
    } catch (jsonError) {
      // Bukan JSON - mungkin HTML (redirect atau error page)
      console.warn("⚠️ Response is not JSON, checking for redirect...");

      if (
        responseText.includes("window.location") ||
        responseText.includes("Redirecting") ||
        responseText.includes("/dashboard")
      ) {
        // Tampaknya ada redirect di HTML
        console.log("✅ HTML response contains redirect, going to dashboard");

        showNotification(
          "✅ Data berhasil disimpan! Mengarahkan ke dashboard...",
          "success"
        );

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);

        return true;
      } else {
        // Error HTML page
        console.error("❌ Server returned HTML error page");

        // Extract error message from HTML jika ada
        const errorMatch =
          responseText.match(
            /<div class="[^"]*error[^"]*"[^>]*>([^<]+)<\/div>/i
          ) || responseText.match(/<p[^>]*>([^<]+)<\/p>/i);

        const errorMessage = errorMatch
          ? errorMatch[1]
          : "Server mengembalikan halaman error";
        showNotification(`❌ ${errorMessage}`, "error");

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return false;
      }
    }
  } catch (error) {
    console.error("[ERROR] Submit error:", error);
    console.error("[ERROR] Stack:", error.stack);

    let errorMessage = "Terjadi kesalahan: ";
    if (error.message.includes("Network") || error.message.includes("fetch")) {
      errorMessage +=
        "Koneksi jaringan bermasalah. Periksa koneksi internet Anda.";
    } else {
      errorMessage += error.message;
    }

    showNotification(errorMessage, "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    return false;
  }
}

// ===== VALIDATE FORM FUNCTION (DIPERBAIKI) =====
function validateForm() {
  console.log("🔍 Validating form for submission...");

  let isValid = true;
  const errors = [];

  // Check all required fields
  const requiredFields = document.querySelectorAll(
    "input[required], textarea[required]"
  );

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      isValid = false;
      errors.push(`${field.name || field.id} wajib diisi`);
      showFieldError(field, "Field ini wajib diisi");
    } else {
      // Clear error jika ada
      field.classList.remove("error");
      const errorDiv = field.parentElement.querySelector(".error-message");
      if (errorDiv) errorDiv.remove();
    }
  });

  // Check signature
  const signatureData = document.getElementById("ttd_base64").value;
  if (!signatureData || signatureData.trim() === "") {
    isValid = false;
    errors.push("Tanda tangan wajib dibuat");
    showNotification(
      "Harap buat dan simpan tanda tangan terlebih dahulu",
      "error"
    );
  }

  // Check agreement - INI YANG PERLU DICEK TAPI TIDAK MENGHENTIKAN VALIDASI AWAL
  const agreeCheckbox = document.getElementById("agreeTerms");
  if (!agreeCheckbox || !agreeCheckbox.checked) {
    // Ini warning, bukan error untuk validasi form
    console.log(
      "⚠️ Agreement checkbox not checked (will be checked in submitForm)"
    );
  }

  if (!isValid) {
    console.log("❌ Form validation failed. Errors:", errors);

    // Scroll ke error pertama
    const firstErrorField = document.querySelector(".error");
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      firstErrorField.focus();
    }
  } else {
    console.log("✅ Form validation passed");
  }

  return isValid;
}

// ===== FORM RESET =====
function resetForm() {
  if (
    confirm(
      "Apakah Anda yakin ingin mengosongkan semua data? Draft yang tersimpan juga akan dihapus."
    )
  ) {
    // Reset form
    document.getElementById("suratForm").reset();

    // Clear signature
    clearSignature();

    // Clear draft
    localStorage.removeItem("suratDraft");

    // Reset agreement checkbox
    const agreeCheckbox = document.getElementById("agreeTerms");
    if (agreeCheckbox) agreeCheckbox.checked = false;

    // Go to step 1
    goToStep(1);

    showNotification("Form telah direset", "info");
  }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = "info") {
  console.log(`📢 Notification [${type}]: ${message}`);

  // Coba gunakan element notification jika ada
  const notification = document.getElementById("notification");
  const messageElement = document.getElementById("notificationMessage");
  const icon = notification?.querySelector("i");

  if (notification && messageElement && icon) {
    // Set message and type
    messageElement.textContent = message;
    notification.className = `notification ${type}`;

    // Set icon berdasarkan type
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

    // Show notification
    notification.style.display = "flex";

    // Auto-hide setelah 5 detik
    setTimeout(() => {
      notification.style.display = "none";
    }, 5000);
  } else {
    // Fallback ke alert atau console
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

function hideNotification() {
  const notification = document.getElementById("notification");
  if (notification) {
    notification.style.display = "none";
  }
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener("keydown", function (e) {
  // Ctrl + S untuk save draft
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveDraft(true);
  }

  // Ctrl + Enter untuk submit
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (currentStep === 2) {
      // Validasi agreement dulu
      const agreeCheckbox = document.getElementById("agreeTerms");
      if (!agreeCheckbox || !agreeCheckbox.checked) {
        showNotification("Harap centang persetujuan terlebih dahulu!", "error");
        return;
      }

      const submitBtn = document.getElementById("submitBtn");
      if (submitBtn && !submitBtn.disabled) {
        submitForm(new Event("submit"));
      }
    } else {
      goToStep(2);
    }
  }
});

// ===== EXPORT FUNCTIONS FOR DEBUGGING =====
window.debugForm = debugFormData;

window.testSubmit = async function () {
  console.log("🧪 Testing submit with dummy data...");

  // Buat data dummy
  const testData = new FormData();
  testData.append("nama", "TEST USER");
  testData.append("nip", "12345678");
  testData.append("instansi", "BMKG TEST");
  testData.append("kegiatan", "Testing System");
  testData.append("periode", "Januari 2024");
  testData.append("kota", "Makassar");
  testData.append("agreeTerms", "on");
  testData.append(
    "ttd_base64",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
  );

  try {
    const response = await fetch("/surat-pernyataan/generate", {
      method: "POST",
      body: testData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const text = await response.text();
    console.log("🧪 Test response status:", response.status);
    console.log("🧪 Test response (first 300 chars):", text.substring(0, 300));

    try {
      const json = JSON.parse(text);
      console.log("🧪 Parsed JSON:", json);
    } catch (e) {
      console.log("🧪 Response is not JSON");
    }
  } catch (err) {
    console.error("🧪 Test error:", err);
  }
};

// Tambahkan test button
document.addEventListener("DOMContentLoaded", function () {
  const testBtn = document.createElement("button");
  testBtn.innerHTML = '<i class="fas fa-vial"></i> Test Submit';
  testBtn.style.position = "fixed";
  testBtn.style.bottom = "100px";
  testBtn.style.left = "20px";
  testBtn.style.zIndex = "9999";
  testBtn.style.padding = "8px 12px";
  testBtn.style.fontSize = "12px";
  testBtn.style.borderRadius = "4px";
  testBtn.style.backgroundColor = "#17a2b8";
  testBtn.style.color = "white";
  testBtn.style.border = "none";
  testBtn.style.cursor = "pointer";
  testBtn.title = "Test submit dengan data dummy";
  testBtn.onclick = window.testSubmit;

  document.body.appendChild(testBtn);
  console.log("✅ Test submit button added");
});
