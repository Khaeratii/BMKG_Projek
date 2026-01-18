/**
 * JavaScript untuk halaman detail usulan
 */

document.addEventListener("DOMContentLoaded", function () {
  console.log("View Proposal page loaded");

  // Setup event listeners
  setupPrintButton();
  setupPdfButton();

  // Enhance signature display
  enhanceSignatureDisplay();
});

function setupPrintButton() {
  const printBtn = document.querySelector(".btn-secondary");
  if (printBtn) {
    printBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.print();
    });
  }
}

function setupPdfButton() {
  const pdfBtn = document.querySelector(".btn-success");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", function (e) {
      e.preventDefault();
      const proposalId = this.getAttribute("onclick")?.match(/\d+/)?.[0];
      if (proposalId) {
        downloadPdf(proposalId);
      }
    });
  }
}

function downloadPdf(id) {
  try {
    // Show loading indicator
    const originalText =
      document.querySelector(".btn-success i").parentNode.innerHTML;
    document.querySelector(".btn-success").innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    document.querySelector(".btn-success").disabled = true;

    // Open PDF in new tab
    const pdfUrl = `/api/proposal/pdf/${id}`;
    const newWindow = window.open(pdfUrl, "_blank");

    // Restore button after 2 seconds
    setTimeout(() => {
      document.querySelector(".btn-success").innerHTML = originalText;
      document.querySelector(".btn-success").disabled = false;
    }, 2000);

    // Focus on new window
    if (newWindow) {
      newWindow.focus();
    }
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert("Gagal membuka PDF. Silakan coba lagi.");

    // Restore button
    document.querySelector(".btn-success").innerHTML =
      '<i class="fas fa-file-pdf"></i> Download PDF';
    document.querySelector(".btn-success").disabled = false;
  }
}

function enhanceSignatureDisplay() {
  const signatureImages = document.querySelectorAll(".signature-image");

  signatureImages.forEach((img) => {
    // Add loading state
    img.addEventListener("load", function () {
      this.style.opacity = "1";
    });

    img.addEventListener("error", function () {
      console.warn("Signature image failed to load:", this.src);
      // Show fallback text
      const container = this.closest(".signature-container");
      if (container) {
        container.innerHTML = `
                    <div class="signature-fallback">
                        <i class="fas fa-signature fa-3x text-muted mb-3"></i>
                        <p>Tanda tangan tidak tersedia</p>
                        <p class="text-muted">Ditandatangani oleh: ${
                          document.querySelector(".detail-value").textContent
                        }</p>
                    </div>
                `;
      }
    });
  });
}

// Fallback alert function
function showAlert(message, type = "info") {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} fixed-alert`;
  alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${
              type === "success"
                ? "check-circle"
                : type === "error"
                ? "exclamation-circle"
                : "info-circle"
            }"></i>
            <span>${message}</span>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">&times;</button>
    `;

  document.body.appendChild(alertDiv);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
  }, 3000);
}

// Make functions available globally
window.downloadPdf = downloadPdf;
window.showAlert = showAlert;
