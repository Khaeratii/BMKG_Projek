// ===============================
// SIGNATURE SYSTEM (DIPERBAIKI UNTUK 5 TANDA TANGAN)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🖋️ Initializing 5 signature pads...");

  // Generate nomor permohonan
  function genNoPermohonan() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const sec = String(now.getSeconds()).padStart(2, "0");
    return `INS-${y}${m}${d}-${h}${min}${sec}`;
  }

  const noPermEl = document.getElementById("no_permohonan");
  if (noPermEl && !noPermEl.value) {
    noPermEl.value = genNoPermohonan();
  }

  // Resize canvas
  function resizeCanvas(canvas, pad) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    // Preserve existing drawing
    const data = pad.toData();
    pad.clear();
    if (data && data.length > 0) {
      pad.fromData(data);
    }
  }

  // Create signature pad - DIPERBAIKI
  function createPad(
    canvasId,
    previewId,
    dataId,
    clearBtnId,
    saveBtnId,
    nameInputId,
    isRequired = false
  ) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`⚠️ Canvas ${canvasId} not found`);
      return null;
    }

    console.log(`✅ Initializing ${canvasId}`);

    // Ensure canvas has proper dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const pad = new SignaturePad(canvas, {
      backgroundColor: "#ffffff",
      penColor: "#000000",
      minWidth: 1.3,
      maxWidth: 2.6,
      velocityFilterWeight: 0.7,
      throttle: 16,
      minPointDistance: 3,
    });

    // Initial resize
    resizeCanvas(canvas, pad);

    // Handle window resize
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resizeCanvas(canvas, pad);
      }, 250);
    });

    // Clear button
    const clearBtn = document.getElementById(clearBtnId);
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        pad.clear();
        const preview = document.getElementById(previewId);
        if (preview) {
          preview.innerHTML = "";
        }
        const dataInput = document.getElementById(dataId);
        if (dataInput) {
          dataInput.value = "";
        }
        console.log(`🧹 Cleared ${canvasId}`);
      });
    }

    // Save button
    const saveBtn = document.getElementById(saveBtnId);
    const nameInput = document.getElementById(nameInputId);

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const nama = nameInput ? nameInput.value.trim() : "";

        // Jika required, validasi nama
        if (isRequired && !nama) {
          alert("Nama penanda tangan wajib diisi!");
          if (nameInput) nameInput.focus();
          return;
        }

        const preview = document.getElementById(previewId);
        const dataInput = document.getElementById(dataId);

        if (!pad.isEmpty()) {
          const imgData = pad.toDataURL();

          if (preview) {
            preview.innerHTML = `
              <div class="preview-container">
                <img src="${imgData}" style="max-width: 100%; max-height: 80px; display: block; border: 1px solid #ddd;">
                <div style="margin-top: 5px; font-weight: bold;">${
                  nama || "Belum diisi"
                }</div>
              </div>
            `;
          }

          if (dataInput) {
            dataInput.value = imgData;
          }

          console.log(`💾 Saved ${canvasId} - ${nama || "No name"}`);
          showNotification(
            `Tanda tangan ${getSignatureLabel(canvasId)} disimpan!`,
            "success"
          );
        } else {
          // Jika tanda tangan kosong tapi nama diisi
          if (nama && !isRequired) {
            if (preview) {
              preview.innerHTML = `
                <div style="padding: 10px; background: #f8f9fa; border: 1px dashed #ccc;">
                  <b>${nama}</b><br>
                  <small><i>(Manual - tanpa tanda tangan)</i></small>
                </div>
              `;
            }

            if (dataInput) {
              dataInput.value = "manual";
            }

            console.log(`📝 ${canvasId} - Manual: ${nama}`);
            showNotification(
              `Nama ${getSignatureLabel(canvasId)} disimpan (manual)`,
              "info"
            );
          } else {
            alert(
              "Harap buat tanda tangan terlebih dahulu atau isi nama untuk tanda tangan manual!"
            );
          }
        }
      });
    }

    return pad;
  }

  // Helper function untuk label
  function getSignatureLabel(canvasId) {
    const labels = {
      signatureCanvas1: "Pelapor",
      signatureCanvas2: "Atasan",
      signatureCanvas3: "SMKI",
      signatureCanvas4: "Ketua",
      signatureCanvas5: "SMKI 2",
    };
    return labels[canvasId] || canvasId;
  }

  // Notification system
  function showNotification(message, type = "info") {
    // Coba gunakan notification dari form_03.js jika ada
    if (typeof window.showNotification === "function") {
      window.showNotification(message, type);
      return;
    }

    // Fallback: buat notifikasi sederhana
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        type === "success"
          ? "#28a745"
          : type === "error"
          ? "#dc3545"
          : "#007bff"
      };
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
      <i class="fas fa-${
        type === "success"
          ? "check-circle"
          : type === "error"
          ? "exclamation-circle"
          : "info-circle"
      }"></i>
      ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Add CSS for animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // ===============================
  // INITIALIZE ALL 5 SIGNATURE PADS
  // ===============================

  // Store all pads for easy access
  window.signaturePads = {};

  // Pad 1: Pelapor (WAJIB)
  window.signaturePads.pelapor = createPad(
    "signatureCanvas1",
    "previewSignature1",
    "signatureData1",
    "clearSignatureBtn1",
    "saveSignatureBtn1",
    "nama_ttd_pelapor",
    true // Required
  );

  // Pad 2: Atasan (OPSIONAL)
  window.signaturePads.atasan = createPad(
    "signatureCanvas2",
    "previewSignature2",
    "signatureData2",
    "clearSignatureBtn2",
    "saveSignatureBtn2",
    "nama_ttd_atasan",
    false
  );

  // Pad 3: SMKI (OPSIONAL) - INI YANG TIDAK DIINISIALISASI!
  window.signaturePads.smki = createPad(
    "signatureCanvas3",
    "previewSignature3",
    "signatureData3",
    "clearSignatureBtn3",
    "saveSignatureBtn3",
    "nama_ttd_smki",
    false
  );

  // Pad 4: Ketua (OPSIONAL) - INI YANG TIDAK DIINISIALISASI!
  window.signaturePads.ketua = createPad(
    "signatureCanvas4",
    "previewSignature4",
    "signatureData4",
    "clearSignatureBtn4",
    "saveSignatureBtn4",
    "nama_ttd_ketua",
    false
  );

  // Pad 5: SMKI 2 (OPSIONAL) - INI YANG TIDAK DIINISIALISASI!
  window.signaturePads.smki2 = createPad(
    "signatureCanvas5",
    "previewSignature5",
    "signatureData5",
    "clearSignatureBtn5",
    "saveSignatureBtn5",
    "nama_ttd_smki2",
    false
  );

  // Debug info
  console.log(
    `✅ Total signature pads initialized: ${
      Object.keys(window.signaturePads).length
    }`
  );

  // Verify each canvas
  setTimeout(() => {
    console.log("🔍 Verifying canvas initialization...");
    for (let i = 1; i <= 5; i++) {
      const canvas = document.getElementById(`signatureCanvas${i}`);
      const ctx = canvas ? canvas.getContext("2d") : null;
      console.log(
        `  Canvas ${i}: ${canvas ? "Found" : "Missing"}, Context: ${
          ctx ? "OK" : "FAIL"
        }`
      );

      // Jika canvas ditemukan tapi tidak bisa draw, coba fix
      if (
        canvas &&
        !window.signaturePads[
          getSignatureLabel(`signatureCanvas${i}`).toLowerCase()
        ]
      ) {
        console.warn(
          `⚠️ Canvas ${i} found but pad not initialized - attempting fix...`
        );

        // Reinitialize secara manual
        const label = getSignatureLabel(`signatureCanvas${i}`);
        const isRequired = i === 1; // Hanya pelapor yang wajib

        window.signaturePads[label.toLowerCase()] = createPad(
          `signatureCanvas${i}`,
          `previewSignature${i}`,
          `signatureData${i}`,
          `clearSignatureBtn${i}`,
          `saveSignatureBtn${i}`,
          `nama_ttd_${label.toLowerCase().replace(" ", "")}`,
          isRequired
        );
      }
    }
  }, 1000);

  // ===============================
  // UTILITY FUNCTIONS
  // ===============================

  // Function to get all signature data
  window.getAllSignatureData = function () {
    const signatures = {};
    for (let i = 1; i <= 5; i++) {
      const dataInput = document.getElementById(`signatureData${i}`);
      const nameInput = document.getElementById(
        `nama_ttd_${getSignatureLabel(`signatureCanvas${i}`)
          .toLowerCase()
          .replace(" ", "")}`
      );

      signatures[`ttd_${i}`] = {
        data: dataInput ? dataInput.value : "",
        name: nameInput ? nameInput.value : "",
        label: getSignatureLabel(`signatureCanvas${i}`),
      };
    }
    return signatures;
  };

  // Function to clear all signatures
  window.clearAllSignatures = function () {
    for (const padName in window.signaturePads) {
      if (
        window.signaturePads[padName] &&
        typeof window.signaturePads[padName].clear === "function"
      ) {
        window.signaturePads[padName].clear();
      }
    }

    // Clear all hidden inputs
    for (let i = 1; i <= 5; i++) {
      const dataInput = document.getElementById(`signatureData${i}`);
      if (dataInput) dataInput.value = "";

      const preview = document.getElementById(`previewSignature${i}`);
      if (preview) preview.innerHTML = "";
    }

    console.log("🧹 All signatures cleared");
    showNotification("Semua tanda tangan telah dihapus", "info");
  };

  console.log("🎉 Signature system fully loaded!");
});
