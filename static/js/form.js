/**
 * Form Complete - BMKG
 * JavaScript untuk form lengkap semua tahap (5 Steps)
 * Versi: 2.1 - With Editable Fields
 */

// ==================== GLOBAL VARIABLES ====================
let currentStep = 1;
const totalSteps = 5;
const signatures = {
  pemohon: null,
  approval: null,
  implementation: null,
};
let currentDraftId = null;

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", function () {
  console.log("Form Complete JavaScript loaded");

  // Initialize core components
  initializeForm();
  initializeSignatures();
  setupEventListeners();
  setupDraftManagement();
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

  // Setup form submission - PASTIKAN INI DIPANGGIL
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

// ==================== TOAST NOTIFICATION ====================

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

// ==================== DRAFT MANAGEMENT ====================

// ==================== DRAFT MANAGEMENT ====================

// ==================== DRAFT MANAGEMENT ====================

// ==================== DRAFT MANAGEMENT ====================

function setupDraftManagement() {
  console.log("Setting up draft management...");

  const saveAsDraftBtn = document.getElementById("saveAsDraftBtn");
  const loadDraftBtn = document.getElementById("loadDraftFromReviewBtn");

  if (saveAsDraftBtn) {
    saveAsDraftBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      console.log("💾 Save as draft button clicked");

      // Validasi step 1 minimal
      if (currentStep < 1 || !validateStep(1)) {
        showToast(
          "⚠️ Harap lengkapi data usulan (Step 1) terlebih dahulu!",
          "warning",
        );
        goToStep(1);
        return;
      }

      // Simpan draft langsung
      await saveDraftDirect();
    });
  }

  if (loadDraftBtn) {
    // HAPUS modal, ganti dengan alert atau langsung load draft terakhir
    loadDraftBtn.addEventListener("click", () => {
      console.log("Load draft button clicked");
      showToast("Fitur muat draft sedang dalam pengembangan", "info");
      // Atau bisa langsung load draft terakhir
      // loadLastDraft();
    });
  }

  console.log("Draft management setup complete");
}
// ==================== SAVE DRAFT DIRECTLY ====================

// ==================== SAVE DRAFT DIRECTLY ====================

async function saveDraftDirect() {
  console.log("💾 saveDraftDirect called");

  // Validasi minimal step 1
  if (!validateStep(1)) {
    showToast(
      "⚠️ Harap lengkapi data usulan (Step 1) terlebih dahulu!",
      "warning",
    );
    return false;
  }

  // Kumpulkan data form
  const formData = collectFormData();

  // Generate nama draft otomatis
  let draftName = "Draft Usulan Perubahan";
  const now = new Date();
  const timestamp = now.toLocaleString("id-ID", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (formData.no_dokumen) {
    draftName = `Draft ${formData.no_dokumen} (${timestamp})`;
  } else if (formData.deskripsi_perubahan) {
    const desc = formData.deskripsi_perubahan.substring(0, 20);
    draftName = `Draft: ${desc}... (${timestamp})`;
  } else {
    draftName = `Draft ${timestamp}`;
  }

  const draftNotes = "Draft otomatis disimpan";

  console.log("📊 Saving draft:", draftName);

  // Show loading
  const saveBtn = document.getElementById("saveAsDraftBtn");
  if (saveBtn) {
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    saveBtn.disabled = true;

    try {
      const success = await saveDraftToServer(draftName, draftNotes);

      if (success) {
        console.log("✅ Draft saved successfully");
        showToast(`✅ Draft berhasil disimpan!`, "success");

        // Update tombol
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Tersimpan';
        saveBtn.classList.add("saved");

        // Kembalikan setelah 3 detik
        setTimeout(() => {
          saveBtn.innerHTML = originalText;
          saveBtn.classList.remove("saved");
          saveBtn.disabled = false;
        }, 3000);

        return true;
      } else {
        throw new Error("Gagal menyimpan draft");
      }
    } catch (error) {
      console.error("❌ Save draft failed:", error);
      showToast(`❌ Gagal menyimpan draft: ${error.message}`, "error");
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
      return false;
    }
  }

  return false;
}
// ==================== SERVER DRAFT MANAGEMENT ====================

// ==================== LOAD DRAFT FROM SERVER ====================

async function loadDraftFromServer(draftId) {
  console.log("📂 loadDraftFromServer called for:", draftId);

  try {
    const response = await fetch(`/api/load-draft/${draftId}`);
    console.log("📥 Load draft response status:", response.status);

    const result = await response.json();
    console.log("📊 Load draft result:", result);

    if (result.success) {
      const draft = result.draft;

      // Populate form with draft data
      populateFormWithDraft(draft.form_data);

      // Set current draft ID
      currentDraftId = draft.draft_id;

      // Update URL with draft ID
      updateUrlWithDraftId(draftId);

      // Update draft info display
      updateDraftInfoDisplay();

      showToast(
        `✅ Draft "${draft.draft_name || "tanpa nama"}" berhasil dimuat!`,
        "success",
      );

      return true;
    } else {
      throw new Error(result.message || "Gagal memuat draft");
    }
  } catch (error) {
    console.error("❌ Load draft error:", error);
    showToast(`❌ Gagal memuat draft: ${error.message}`, "error");
    return false;
  }
}

// ==================== DELETE DRAFT FROM SERVER ====================

async function deleteDraftFromServer(draftId) {
  console.log("deleteDraftFromServer called for:", draftId);

  if (!confirm("Apakah Anda yakin ingin menghapus draft ini dari server?")) {
    return;
  }

  try {
    const response = await fetch(`/api/delete-draft/${draftId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      showToast("Draft berhasil dihapus dari server!", "success");

      // If current draft is deleted, clear it
      if (currentDraftId === draftId) {
        currentDraftId = null;
        updateDraftInfoDisplay();
      }

      // Reload drafts list
      loadDraftsListFromServer();
    } else {
      throw new Error(result.message || "Gagal menghapus draft");
    }
  } catch (error) {
    console.error("Delete draft error:", error);
    showToast("Gagal menghapus draft: " + error.message, "error");
  }
}

// ==================== LOAD DRAFTS LIST FROM SERVER ====================

// ==================== UPDATE DRAFT INFO DISPLAY ====================

function updateDraftInfoDisplay() {
  console.log("updateDraftInfoDisplay called, currentDraftId:", currentDraftId);

  const draftInfo = document.getElementById("currentDraftInfo");
  const draftNameDisplay = document.getElementById("draftNameDisplay");

  if (!draftInfo || !draftNameDisplay) {
    console.log("Draft info elements not found");
    return;
  }

  if (currentDraftId) {
    // Try to get draft name from local storage first
    const draftData = localStorage.getItem(`draft_${currentDraftId}`);
    if (draftData) {
      try {
        const draft = JSON.parse(draftData);
        draftNameDisplay.textContent = draft.draft_name || "Draft Tanpa Nama";
      } catch (e) {
        draftNameDisplay.textContent = "Draft Aktif";
      }
    } else {
      // Try to get from server via API
      fetch(`/api/load-draft/${currentDraftId}`)
        .then((response) => response.json())
        .then((result) => {
          if (result.success && result.draft) {
            draftNameDisplay.textContent =
              result.draft.draft_name || "Draft Tanpa Nama";
          } else {
            draftNameDisplay.textContent = "Draft Aktif";
          }
        })
        .catch(() => {
          draftNameDisplay.textContent = "Draft Aktif";
        });
    }

    draftInfo.style.display = "block";
    console.log("Draft info displayed:", draftNameDisplay.textContent);
  } else {
    draftInfo.style.display = "none";
    console.log("No draft active, hiding draft info");
  }
}

function showDraftModal(tab) {
  const modal = document.getElementById("draftModal");
  modal.classList.add("active");
  document.body.classList.add("modal-open");

  // Activate selected tab
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
  document.getElementById(`${tab}Tab`).classList.add("active");
}

// ==================== SAVE DRAFT TO SERVER ====================
async function saveDraftToServer(draftName = "", draftNotes = "") {
  // <- BARIS INI SEKITAR 700
  console.log("💾 saveDraftToServer called with:", { draftName, draftNotes });

  // Jika parameter tidak diberikan, ambil dari form
  if (!draftName) {
    draftName =
      document.getElementById("draftName")?.value?.trim() || "Draft Tanpa Nama";
  }
  if (!draftNotes && draftNotes !== "") {
    draftNotes = document.getElementById("draftNotes")?.value?.trim() || "";
  }

  if (!validateStep(1)) {
    showToast(
      "⚠️ Harap lengkapi data usulan (Step 1) terlebih dahulu!",
      "warning",
    );
    throw new Error("Data usulan tidak lengkap");
  }

  const formData = collectFormData();

  console.log("📊 Draft data to save:", {
    draftName: draftName,
    currentDraftId: currentDraftId,
    hasSignature: !!formData.signature_data,
    fieldsCount: Object.keys(formData).filter((k) => formData[k]).length,
  });

  const draftData = {
    action: "draft",
    form_data: formData,
    draft_id: currentDraftId || null,
    draft_name: draftName,
    draft_notes: draftNotes,
  };

  try {
    console.log("📤 Sending draft to server...");
    const response = await fetch("/api/usulan-perubahan/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draftData),
    });

    console.log("📥 Response status:", response.status);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log("📊 Server response:", result);

    if (result.success) {
      currentDraftId = result.draft_id;

      // Simpan draft info ke localStorage untuk cache
      try {
        localStorage.setItem(
          `draft_cache_${currentDraftId}`,
          JSON.stringify({
            draft_name: draftName,
            draft_notes: draftNotes,
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (e) {
        console.warn("⚠️ Could not cache draft to localStorage:", e);
      }

      return true;
    } else {
      throw new Error(result.message || "Gagal menyimpan draft");
    }
  } catch (error) {
    console.error("❌ Save draft error:", error);
    throw error; // Re-throw error untuk ditangani di caller
  }
}

function loadDraftsList() {
  const draftsList = document.getElementById("draftsList");

  try {
    const draftList = JSON.parse(localStorage.getItem("draft_list") || "[]");

    if (draftList.length > 0) {
      let html = '<div class="drafts-grid">';

      draftList.reverse().forEach((draftId) => {
        const draftData = localStorage.getItem(`draft_${draftId}`);
        if (draftData) {
          try {
            const draft = JSON.parse(draftData);
            const formData = draft.form_data || {};
            const draftName = draft.draft_name || "Draft Tanpa Nama";

            html += `
                            <div class="draft-card" data-draft-id="${draftId}">
                                <div class="draft-header">
                                    <h4>${draftName}</h4>
                                    <span class="draft-date">${formatDateDisplay(
                                      draft.timestamp,
                                    )}</span>
                                </div>
                                <div class="draft-body">
                                    <p><strong>No. Dokumen:</strong> ${
                                      formData.no_dokumen || "Belum diisi"
                                    }</p>
                                    <p><strong>Diminta Oleh:</strong> ${
                                      formData.diminta_oleh || "Belum diisi"
                                    }</p>
                                    <p><strong>Jabatan:</strong> ${
                                      formData.jabatan || "Belum diisi"
                                    }</p>
                                    <p><strong>Deskripsi:</strong> ${
                                      formData.deskripsi_perubahan
                                        ? formData.deskripsi_perubahan.substring(
                                            0,
                                            100,
                                          ) + "..."
                                        : "Belum diisi"
                                    }</p>
                                    ${
                                      draft.draft_notes
                                        ? `<p><em>${draft.draft_notes}</em></p>`
                                        : ""
                                    }
                                </div>
                                <div class="draft-actions">
                                    <button class="btn-sm btn-primary load-draft-btn" data-id="${draftId}">
                                        <i class="fas fa-folder-open"></i> Muat
                                    </button>
                                    <button class="btn-sm btn-danger delete-draft-btn" data-id="${draftId}">
                                        <i class="fas fa-trash"></i> Hapus
                                    </button>
                                </div>
                            </div>
                        `;
          } catch (e) {
            console.error(`Error parsing draft ${draftId}:`, e);
          }
        }
      });

      html += "</div>";
      draftsList.innerHTML = html;

      // Add event listeners
      document.querySelectorAll(".load-draft-btn").forEach((btn) => {
        btn.addEventListener("click", () => loadDraft(btn.dataset.id));
      });

      document.querySelectorAll(".delete-draft-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (confirm("Apakah Anda yakin ingin menghapus draft ini?")) {
            deleteDraft(btn.dataset.id);
          }
        });
      });
    } else {
      draftsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>Belum ada draft tersimpan</p>
                </div>
            `;
    }
  } catch (e) {
    console.error("Error loading drafts:", e);
    draftsList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat draft</p>
            </div>
        `;
  }
}

function loadDraft(draftId) {
  const draftData = localStorage.getItem(`draft_${draftId}`);
  if (!draftData) {
    showToast("Draft tidak ditemukan", "error");
    return;
  }

  try {
    const draft = JSON.parse(draftData);
    const formData = draft.form_data || {};

    // Populate form
    populateFormWithDraft(formData);

    currentDraftId = draftId;
    updateDraftInfoDisplay();

    showToast("Draft berhasil dimuat!", "success");
    document.getElementById("draftModal").classList.remove("active");
    document.body.classList.remove("modal-open");
    goToStep(1);
  } catch (e) {
    showToast("Gagal memuat draft: " + e.message, "error");
  }
}

function deleteDraft(draftId) {
  try {
    localStorage.removeItem(`draft_${draftId}`);
    localStorage.removeItem(`draft_name_${draftId}`);

    let draftList = JSON.parse(localStorage.getItem("draft_list") || "[]");
    draftList = draftList.filter((id) => id !== draftId);
    localStorage.setItem("draft_list", JSON.stringify(draftList));

    loadDraftsList();

    if (currentDraftId === draftId) {
      currentDraftId = null;
      updateDraftInfoDisplay();
    }

    showToast("Draft berhasil dihapus!", "success");
  } catch (e) {
    showToast("Gagal menghapus draft: " + e.message, "error");
  }
}

function populateFormWithDraft(data) {
  // Helper function to set value
  function setValue(name, value) {
    const element = document.querySelector(`[name="${name}"]`);
    if (element && value !== undefined && value !== null) {
      if (element.type === "checkbox" || element.type === "radio") {
        if (Array.isArray(value)) {
          document.querySelectorAll(`[name="${name}"]`).forEach((cb) => {
            cb.checked = value.includes(cb.value);
          });
        } else {
          element.checked = element.value === value;
        }
      } else {
        element.value = value;
      }
    }
  }

  // Populate Step 1 (including editable fields)
  const step1Fields = [
    "no_dokumen",
    "revisi",
    "tgl_efektif",
    "tanggal",
    "diminta_oleh",
    "jabatan",
    "deskripsi_perubahan",
    "hasil_dibutuhkan_tgl",
    "alasan_perubahan",
  ];

  step1Fields.forEach((field) => setValue(field, data[field]));

  // Handle signature
  if (data.signature_data) {
    const signatureData = document.getElementById("signatureData");
    if (signatureData) {
      signatureData.value = data.signature_data;
      signatures.pemohon = data.signature_data;
    }
  }

  // Populate Step 2
  if (data.tipe_perubahan) {
    const tipePerubahan = Array.isArray(data.tipe_perubahan)
      ? data.tipe_perubahan
      : data.tipe_perubahan.split(",");
    document.querySelectorAll('[name="tipe_perubahan"]').forEach((cb) => {
      cb.checked = tipePerubahan.includes(cb.value);
    });
  }

  const step2Fields = [
    "prioritas",
    "dampak_lingkungan",
    "upaya_diperlukan",
    "kebutuhan_sumber_daya",
    "rencana_pengujian",
    "catatan_evaluator",
    "tanggal_evaluasi",
  ];
  step2Fields.forEach((field) => setValue(field, data[field]));

  // Populate Step 3
  const step3Fields = [
    "status_persetujuan",
    "tanggal_pelaksanaan",
    "pic_pelaksana",
    "catatan_persetujuan",
    "catatan_penolakan",
    "tanggal_persetujuan",
  ];
  step3Fields.forEach((field) => setValue(field, data[field]));

  if (data.signature_approval) {
    const signatureData2 = document.getElementById("signatureData2");
    if (signatureData2) {
      signatureData2.value = data.signature_approval;
      signatures.approval = data.signature_approval;
    }
  }

  // Populate Step 4
  const step4Fields = [
    "hasil_tahapan",
    "hasil_pengujian",
    "tanggal_rilis",
    "catatan_implementasi",
    "tanggal_implementasi",
  ];
  step4Fields.forEach((field) => setValue(field, data[field]));

  if (data.signature_implementation) {
    const signatureData3 = document.getElementById("signatureData3");
    if (signatureData3) {
      signatureData3.value = data.signature_implementation;
      signatures.implementation = data.signature_implementation;
    }
  }

  // Trigger approval status change if needed
  if (data.status_persetujuan) {
    const radio = document.querySelector(
      `input[name="status_persetujuan"][value="${data.status_persetujuan}"]`,
    );
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change"));
    }
  }

  // Update character counters
  setupCharacterCounters();
}

function updateDraftInfoDisplay() {
  const draftInfo = document.getElementById("currentDraftInfo");
  const draftNameDisplay = document.getElementById("draftNameDisplay");

  if (currentDraftId) {
    const draftName =
      localStorage.getItem(`draft_name_${currentDraftId}`) ||
      "Draft Tanpa Nama";
    if (draftNameDisplay) draftNameDisplay.textContent = draftName;
    if (draftInfo) draftInfo.style.display = "block";
  } else if (draftInfo) {
    draftInfo.style.display = "none";
  }
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

  const printBtn = document.getElementById("printReviewBtn");
  if (printBtn) {
    printBtn.addEventListener("click", printReview);
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
    draft_id: currentDraftId || null,
    draft_name: document.getElementById("draftName")?.value || "",
    draft_notes: document.getElementById("draftNotes")?.value || "",
  };

  console.log("📤 Preparing to send data to server...");
  console.log("  - Action:", submissionData.action);
  console.log("  - Draft ID:", submissionData.draft_id);
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
    console.log(
      "📥 Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    // Try to get response text for debugging
    const responseText = await response.text();
    console.log("📥 Response text:", responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("📊 Server response parsed:", result);
    } catch (parseError) {
      console.error("❌ Failed to parse JSON response:", parseError);
      throw new Error("Server returned invalid JSON");
    }

    if (!response.ok) {
      throw new Error(result.message || `Server error: ${response.status}`);
    }

    if (result.success) {
      showToast(
        result.message || "✅ Usulan perubahan berhasil dikirim!",
        "success",
      );

      // Clear current draft
      currentDraftId = null;

      // PERUBAHAN: Redirect ke main_dashboard setelah berhasil
      setTimeout(() => {
        // Priority: Use redirect from server, otherwise go to main_dashboard
        if (result.redirect) {
          console.log("↪️ Redirecting to:", result.redirect);
          window.location.href = result.redirect;
        } else {
          console.log("↪️ Redirecting to main dashboard");
          window.location.href = "/dashboard"; // <-- INI DIUBAH
        }
      }, 1500); // <-- Dikurangi dari 2000 menjadi 1500
    } else {
      throw new Error(result.message || "Gagal mengirim usulan");
    }
  } catch (error) {
    console.error("❌ Submission error:", error);
    console.error("❌ Error stack:", error.stack);

    let errorMessage = "Gagal mengirim usulan: ";
    if (error.message.includes("Network")) {
      errorMessage +=
        "Koneksi jaringan bermasalah. Periksa koneksi internet Anda.";
    } else if (error.message.includes("JSON")) {
      errorMessage += "Respons server tidak valid.";
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
      showToast(
        "Harap lengkapi data pada tahap implementasi terlebih dahulu",
        "warning",
      );
      return;
    }
    generateReviewContent();
  }

  // Validasi sebelum moving forward untuk step lain
  if (stepNumber > currentStep && stepNumber < 5) {
    if (!validateCurrentStep()) {
      showToast(
        "Harap lengkapi data pada tahap ini terlebih dahulu",
        "warning",
      );
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
    showToast("Harap lengkapi data pada tahap ini terlebih dahulu", "warning");
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

  // Form submission
  const form = document.getElementById("completeForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      console.log("Form submit triggered from step", currentStep);

      if (currentStep !== 5) {
        e.preventDefault();
        showToast(
          "Harap selesaikan review di step 5 sebelum submit",
          "warning",
        );
        goToStep(5);
        return false;
      }

      // Collect all signature data
      collectAllSignatureData();

      if (!validateAllSteps()) {
        e.preventDefault();
        showToast(
          "Harap lengkapi semua data dengan benar sebelum submit!",
          "error",
        );
        for (let i = 1; i <= totalSteps; i++) {
          if (!validateStep(i)) {
            goToStep(i);
            break;
          }
        }
        return false;
      }

      if (!document.getElementById("confirmReview").checked) {
        e.preventDefault();
        showToast("Harap centang konfirmasi review sebelum submit", "warning");
        return false;
      }

      if (
        !confirm(
          "Apakah Anda yakin ingin mengirim usulan perubahan ini?\nData yang sudah dikirim tidak dapat diedit.",
        )
      ) {
        e.preventDefault();
        return false;
      }

      console.log("Form submitted successfully");
      showToast("Usulan perubahan berhasil dikirim!", "success");
    });
  }
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
    5: validateStep5,
  };
  return validators[stepNumber] ? validators[stepNumber]() : true;
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

  // Validate critical fields
  criticalFields.forEach(({ name, label }) => {
    const element = document.querySelector(`[name="${name}"]`);
    if (element) {
      if (!element.value || element.value.trim() === "") {
        markError(element, `${label} wajib diisi`);
        isValid = false;
      } else {
        clearError(element);
      }
    }
  });

  // Field opsional - hanya warning jika kosong
  const optionalFields = [
    { name: "tgl_efektif", label: "Tanggal Efektif" },
    { name: "hasil_dibutuhkan_tgl", label: "Hasil Dibutuhkan Tanggal" },
    { name: "alasan_perubahan", label: "Alasan Perubahan" },
  ];

  optionalFields.forEach(({ name, label }) => {
    const element = document.querySelector(`[name="${name}"]`);
    if (element && (!element.value || element.value.trim() === "")) {
      console.log(`⚠️ ${label} kosong - diperbolehkan`);
      clearError(element); // Tidak error, hanya kosong
    }
  });

  // Validate signature - opsional untuk draft, wajib untuk submit
  const signatureData = document.getElementById("signatureData");
  const isReviewStep = currentStep === 5;

  if (
    isReviewStep &&
    (!signatureData ||
      !signatureData.value ||
      !signatureData.value.startsWith("data:image"))
  ) {
    showToast("Tanda tangan pemohon wajib diisi!", "error");
    isValid = false;
  } else if (
    signatureData &&
    signatureData.value &&
    signatureData.value.startsWith("data:image")
  ) {
    signatures.pemohon = signatureData.value;
  }

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

  console.log(`✅ Step 1 validation: ${isValid ? "PASS" : "FAIL"}`);
  return isValid;
}

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

  laporanKeys.forEach((key) => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`Key: ${key}, Type: ${typeof data}, Has data: ${!!data}`);
    } catch (e) {
      console.log(`Key: ${key}, Error parsing`);
    }
  });

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

// Panggil debug saat pindah ke step 3
function navigateToStep(stepNumber) {
  console.log(`🔄 [DEBUG] navigateToStep(${stepNumber}) called`);

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

  // Generate review if step 3
  if (stepNumber === 3) {
    console.log("🔄 [DEBUG] Step 3 detected, calling generateReview()");

    // Debug current state
    debugFormState();

    // Simpan data ke localStorage sebelum generate review
    try {
      const formData = collectFormData();
      localStorage.setItem(
        "laporanReviewData",
        JSON.stringify({
          data: formData,
          timestamp: new Date().toISOString(),
          step: 3,
        }),
      );
      console.log("✅ [DEBUG] Saved data to localStorage for review");
    } catch (e) {
      console.error("❌ [DEBUG] Failed to save to localStorage:", e);
    }

    setTimeout(generateReview, 500);
  }
}

function debugFormData() {
  const formData = collectFormData();

  console.group("🔍 FORM DATA DEBUG");
  console.log("Total fields:", Object.keys(formData).length);

  // Check each field
  const fieldsToCheck = [
    "no_dokumen",
    "revisi",
    "tgl_efektif",
    "tanggal",
    "diminta_oleh",
    "jabatan",
    "deskripsi_perubahan",
    "hasil_dibutuhkan_tgl",
    "alasan_perubahan",
    "tipe_perubahan",
    "prioritas",
    "status_persetujuan",
    "hasil_tahapan",
  ];

  fieldsToCheck.forEach((field) => {
    const value = formData[field];
    console.log(
      `  ${field}:`,
      value
        ? typeof value === "string"
          ? value.substring(0, 50) + "..."
          : value
        : "❌ MISSING",
    );
  });

  console.groupEnd();

  return formData;
}

function validateStep2() {
  let isValid = true;

  // Check at least one change type
  const changeTypes = document.querySelectorAll(
    'input[name="tipe_perubahan"]:checked',
  );
  if (changeTypes.length === 0) {
    showToast("Pilih minimal satu tipe perubahan", "error");
    isValid = false;
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
        showToast(`${label} wajib dipilih`, "error");
        isValid = false;
      }
    } else {
      const element = document.querySelector(`[name="${name}"]`);
      if (element && (!element.value || element.value.trim() === "")) {
        markError(element, `${label} wajib diisi`);
        isValid = false;
      } else if (element) {
        clearError(element);
      }
    }
  });

  return isValid;
}

function validateStep3() {
  let isValid = true;
  const approvalStatus = document.querySelector(
    'input[name="status_persetujuan"]:checked',
  );

  if (!approvalStatus) {
    showToast("Pilih status persetujuan (Disetujui/Ditolak)", "error");
    isValid = false;
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
    showToast("Tanda tangan pemberi persetujuan wajib diisi!", "error");
    isValid = false;
  } else {
    signatures.approval = signatureData2.value;
  }

  return isValid;
}

function validateStep4() {
  let isValid = true;
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
    }
  }

  // Validate signature
  const signatureData3 = document.getElementById("signatureData3");
  if (
    !signatureData3 ||
    !signatureData3.value ||
    !signatureData3.value.startsWith("data:image")
  ) {
    showToast("Tanda tangan pelaksana wajib diisi!", "error");
    isValid = false;
  } else {
    signatures.implementation = signatureData3.value;
  }

  return isValid;
}

function validateStep5() {
  const confirmCheckbox = document.getElementById("confirmReview");
  if (!confirmCheckbox || !confirmCheckbox.checked) {
    showToast("Harap centang konfirmasi review sebelum submit", "warning");
    return false;
  }
  return true;
}

function validateAllSteps() {
  for (let i = 1; i <= totalSteps; i++) {
    if (!validateStep(i)) {
      console.log(`Validation failed at step ${i}`);
      return false;
    }
  }
  return true;
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
// ===============================
// GENERATE REVIEW (DIPERBAIKI DENGAN DEBUG)
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
      console.error("❌ [ERROR] Stack trace:", error.stack);

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
  }, 1000); // Increased timeout for debugging
}

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
    updateDraftInfoDisplay();
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

// Di dalam collectFormData() di form.js, tambahkan:
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
  console.log("  - Basic Fields:");
  console.log(`    • no_dokumen: ${data.no_dokumen || "MISSING"}`);
  console.log(`    • diminta_oleh: ${data.diminta_oleh || "MISSING"}`);
  console.log(`    • jabatan: ${data.jabatan || "MISSING"}`);
  console.log(
    `    • deskripsi_perubahan: ${
      data.deskripsi_perubahan
        ? data.deskripsi_perubahan.substring(0, 30) + "..."
        : "MISSING"
    }`,
  );
  console.log(
    `    • alasan_perubahan: ${
      data.alasan_perubahan
        ? data.alasan_perubahan.substring(0, 30) + "..."
        : "MISSING"
    }`,
  );

  if (data.tipe_perubahan) {
    console.log(`  - Evaluation Fields:`);
    console.log(`    • tipe_perubahan: ${data.tipe_perubahan}`);
    console.log(`    • prioritas: ${data.prioritas || "MISSING"}`);
  }

  if (data.status_persetujuan) {
    console.log(`  - Approval Fields:`);
    console.log(`    • status_persetujuan: ${data.status_persetujuan}`);
    console.log(`    • pic_pelaksana: ${data.pic_pelaksana || "MISSING"}`);
  }

  if (data.hasil_tahapan) {
    console.log(`  - Implementation Fields:`);
    console.log(
      `    • hasil_tahapan: ${data.hasil_tahapan.substring(0, 30) + "..."}`,
    );
  }

  console.log(`  - Signatures:`);
  console.log(`    • pemohon: ${data.signature_data ? "✓" : "✗"}`);
  console.log(`    • approval: ${data.signature_approval ? "✓" : "✗"}`);
  console.log(
    `    • implementation: ${data.signature_implementation ? "✓" : "✗"}`,
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

function printReview() {
  const printWindow = window.open("", "_blank");
  const reviewContent = document.getElementById("reviewContent").innerHTML;

  printWindow.document.write(`
    <html>
      <head>
        <title>Review Usulan Perubahan</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h3 { color: #1e3c72; }
          .review-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .review-table td, .review-table th { border: 1px solid #ddd; padding: 8px; }
          .review-table tr:nth-child(even) { background-color: #f9f9f9; }
          .status-success { color: green; font-weight: bold; }
          .status-error { color: red; font-weight: bold; }
          .highlight { color: #1e3c72; font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .summary-item { display: flex; justify-content: space-between; padding: 5px 0; }
          @media print {
            body { margin: 0; padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h2><i class="fas fa-file-alt"></i> Review Usulan Perubahan</h2>
        <p>Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
        ${reviewContent}
        <div class="no-print" style="margin-top: 20px;">
          <button onclick="window.print()">Cetak Dokumen</button>
          <button onclick="window.close()">Tutup</button>
        </div>
        <script>
          setTimeout(() => window.print(), 500);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ==================== GLOBAL EXPORTS ====================

window.goToStep = goToStep;
window.nextStep = nextStep;
window.prevStep = prevStep;
// ==================== MODAL HELPER FUNCTIONS ====================

function showDraftModal(tab = "load") {
  console.log(`📋 Showing draft modal with tab: ${tab}`);

  const modal = document.getElementById("draftModal");
  if (!modal) {
    console.error("❌ Draft modal not found!");
    return;
  }

  // Show modal
  modal.classList.add("active");
  document.body.classList.add("modal-open");

  // Switch to requested tab
  const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
  if (tabBtn) {
    // Remove active class from all tabs
    document
      .querySelectorAll(".tab-btn")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    // Add active class to selected tab
    tabBtn.classList.add("active");
    document.getElementById(`${tab}Tab`).classList.add("active");

    // Load drafts if load tab
    if (tab === "load") {
      setTimeout(() => {
        loadDraftsListFromServer();
      }, 100);
    }
  }

  console.log("✅ Draft modal shown");
}

// ==================== URL PARAMETER MANAGEMENT ====================

function updateUrlWithDraftId(draftId) {
  if (draftId) {
    const url = new URL(window.location);
    url.searchParams.set("draft_id", draftId);
    window.history.replaceState({}, "", url);
  } else {
    // Remove draft_id from URL
    const url = new URL(window.location);
    url.searchParams.delete("draft_id");
    window.history.replaceState({}, "", url);
  }
}
// ==================== EDIT MODE SUPPORT ====================

function initializeFormForEditMode() {
  console.log("📝 Initializing form for edit mode");

  // Load existing signature data jika ada
  const signatureDataInput = document.getElementById("signatureData");
  if (signatureDataInput && signatureDataInput.value) {
    try {
      // Jika ada base64 signature, load ke canvas
      const canvas = document.getElementById("signatureCanvas");
      if (canvas && canvas.loadSignatureFromData) {
        canvas.loadSignatureFromData(signatureDataInput.value);
      }
    } catch (error) {
      console.error("Error loading signature:", error);
    }
  }

  // Setup edit mode validation (lebih ringan)
  setupEditModeValidation();

  // Update button texts
  const finalSubmitBtn = document.getElementById("finalSubmitBtn");
  if (finalSubmitBtn) {
    finalSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Update Draft';
  }

  // Skip draft modal for edit mode
  window.showDraftModal = function () {
    showToast(
      "Gunakan tombol Update di Step 5 untuk menyimpan perubahan",
      "info",
    );
  };
}

function setupEditModeValidation() {
  // Override validasi untuk edit mode
  window.validateAllSteps = function () {
    // Hanya validasi step 1 wajib untuk edit mode
    return validateStep(1);
  };

  // Kurangi requirement untuk signature di edit mode
  const originalValidateStep1 = window.validateStep1;
  window.validateStep1 = function () {
    let isValid = originalValidateStep1();

    // Untuk edit mode, signature tidak wajib (bisa menggunakan yang lama)
    const isEditMode = document.body.classList.contains("edit-mode");
    if (isEditMode) {
      const signatureData = document.getElementById("signatureData");
      if (!signatureData || !signatureData.value) {
        // Tidak error jika signature kosong di edit mode
        console.log("Signature optional in edit mode");
      }
    }

    return isValid;
  };
}

// Tambahkan di DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Cek apakah ini edit mode
  const isEditMode = document.body.classList.contains("edit-mode");

  if (isEditMode) {
    console.log("🔄 Running in EDIT MODE");
    initializeFormForEditMode();
  } else {
    console.log("🆕 Running in CREATE MODE");
    initializeForm();
  }

  // Common initialization
  initializeSignatures();
  setupEventListeners();
  setupReviewStep();

  // Set initial step
  showStep(1);
});
