/**
 * Dokumen Saya - JavaScript
 * BMKG Change Proposal System
 */

document.addEventListener("DOMContentLoaded", function () {
  // Format tanggal Indonesia
  formatIndonesianDates();

  // Initialize event listeners
  initEventListeners();

  // Initialize tooltips
  initTooltips();

  // Initialize filter functionality
  initFilter();

  // Apply initial filter jika ada parameter URL
  checkUrlFilter();
});

/**
 * Format tanggal menjadi format Indonesia
 */
function formatIndonesianDates() {
  const dateElements = document.querySelectorAll(".tanggal-indonesia");

  dateElements.forEach((element) => {
    const originalDate = element.textContent.trim();
    if (originalDate && originalDate !== "-") {
      try {
        let date;
        if (originalDate.includes("-")) {
          // Format YYYY-MM-DD
          const parts = originalDate.split("-");
          if (parts.length === 3) {
            date = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            date = new Date(originalDate);
          }
        } else if (originalDate.includes("/")) {
          // Format DD/MM/YYYY
          const parts = originalDate.split("/");
          date = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
          date = new Date(originalDate);
        }

        if (!isNaN(date.getTime())) {
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const year = date.getFullYear();
          element.textContent = `${day}-${month}-${year}`;
        }
      } catch (error) {
        console.error("Error formatting date:", error);
      }
    }
  });
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Enter key untuk search
  const searchInput = document.getElementById("searchDoc");
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        applyFilter();
      }
    });
  }

  // Double click pada stat cards untuk filter
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((card) => {
    card.addEventListener("dblclick", function () {
      const status = this.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
      if (status) {
        filterByStatus(status);
      }
    });
  });
}

/**
 * Initialize tooltips
 */
function initTooltips() {
  const tooltipElements = document.querySelectorAll("[data-tooltip]");

  tooltipElements.forEach((element) => {
    element.addEventListener("mouseenter", function (e) {
      const tooltipText = this.getAttribute("data-tooltip");
      if (!tooltipText) return;

      const tooltip = document.createElement("div");
      tooltip.className = "custom-tooltip";
      tooltip.textContent = tooltipText;
      document.body.appendChild(tooltip);

      const rect = this.getBoundingClientRect();
      tooltip.style.position = "absolute";
      tooltip.style.left = rect.left + "px";
      tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + "px";

      this.tooltipElement = tooltip;
    });

    element.addEventListener("mouseleave", function () {
      if (this.tooltipElement) {
        this.tooltipElement.remove();
        this.tooltipElement = null;
      }
    });
  });
}

/**
 * Initialize filter functionality
 */
function initFilter() {
  // Tambahkan style untuk filter
  if (!document.querySelector("#filter-styles")) {
    const style = document.createElement("style");
    style.id = "filter-styles";
    style.textContent = `
      .doc-row.hidden {
        display: none !important;
      }
      
      .filter-active {
        background: rgba(0, 85, 164, 0.1) !important;
        border-color: #0055a4 !important;
      }
      
      .highlight {
        background-color: #fff3cd !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Check URL for filter parameters
 */
function checkUrlFilter() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");

  if (status) {
    const select = document.getElementById("filterStatus");
    if (select) {
      select.value = status;
      filterByStatus(status);
    }
  }
}

/**
 * Refresh page
 */
function refreshPage() {
  showToast("Memperbarui halaman...", "info");
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

/**
 * Apply filter
 */
function applyFilter() {
  const status = document.getElementById("filterStatus").value;
  const searchTerm = document.getElementById("searchDoc").value.toLowerCase();

  const rows = document.querySelectorAll("#docsTable tbody tr");
  let visibleCount = 0;

  rows.forEach((row) => {
    const rowStatus = row.getAttribute("data-status");
    const docNumber = row.cells[0].textContent.toLowerCase();
    const description = row.cells[1].textContent.toLowerCase();

    let statusMatch = status === "all" || rowStatus === status;
    let searchMatch =
      !searchTerm ||
      docNumber.includes(searchTerm) ||
      description.includes(searchTerm);

    if (statusMatch && searchMatch) {
      row.classList.remove("hidden");
      visibleCount++;

      // Highlight search term
      if (searchTerm) {
        highlightText(row, searchTerm);
      }
    } else {
      row.classList.add("hidden");
      row.classList.remove("highlight");
    }
  });

  updateResultCount(visibleCount);
  updateActiveFilter(status);
}

/**
 * Reset filter
 */
function resetFilter() {
  document.getElementById("filterStatus").value = "all";
  document.getElementById("searchDoc").value = "";

  const rows = document.querySelectorAll("#docsTable tbody tr");
  rows.forEach((row) => {
    row.classList.remove("hidden");
    row.classList.remove("highlight");
  });

  updateResultCount(rows.length);
  removeHighlight();
  updateActiveFilter("all");

  showToast("Filter direset", "info");
}

/**
 * Filter by status (dari stat card)
 */
function filterByStatus(status) {
  document.getElementById("filterStatus").value = status;
  document.getElementById("searchDoc").value = "";

  applyFilter();

  // Update stat card active state
  const statCards = document.querySelectorAll(".stat-card");
  statCards.forEach((card) => {
    card.classList.remove("filter-active");
    const cardStatus = card.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
    if (cardStatus === status) {
      card.classList.add("filter-active");
    }
  });

  showToast(
    `Menampilkan dokumen dengan status: ${getStatusName(status)}`,
    "info"
  );
}

/**
 * Get status name in Bahasa
 */
function getStatusName(status) {
  const statusNames = {
    all: "Semua",
    draft: "Draft",
    evaluasi: "Evaluasi",
    approval: "Approval",
    implementation: "Implementasi",
    completed: "Selesai",
  };
  return statusNames[status] || status;
}

/**
 * Update result count
 */
function updateResultCount(count) {
  let counter = document.getElementById("resultCounter");
  if (!counter) {
    const tableHeader = document.querySelector(".table-header");
    if (tableHeader) {
      counter = document.createElement("div");
      counter.id = "resultCounter";
      counter.className = "result-counter";
      counter.style.fontSize = "0.75rem";
      counter.style.color = "#6b7280";
      counter.style.marginTop = "0.5rem";
      tableHeader.appendChild(counter);
    }
  }

  if (counter) {
    const totalRows = document.querySelectorAll("#docsTable tbody tr").length;
    counter.textContent = `Menampilkan ${count} dari ${totalRows} dokumen`;
  }

  // Show no results message
  if (count === 0) {
    showNoResultsMessage();
  } else {
    hideNoResultsMessage();
  }
}

/**
 * Show no results message
 */
function showNoResultsMessage() {
  const tableBody = document.querySelector("#docsTable tbody");
  if (!tableBody) return;

  // Cek apakah sudah ada message
  if (document.querySelector(".no-results-row")) return;

  const row = document.createElement("tr");
  row.className = "no-results-row";
  row.innerHTML = `
    <td colspan="5">
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h4>Tidak ada dokumen ditemukan</h4>
        <p>Ubah filter atau kata kunci pencarian</p>
        <button onclick="resetFilter()" class="btn-secondary" style="padding: 0.5rem 1rem;">
          <i class="fas fa-redo"></i> Reset Filter
        </button>
      </div>
    </td>
  `;

  tableBody.appendChild(row);
}

/**
 * Hide no results message
 */
function hideNoResultsMessage() {
  const noResultsRow = document.querySelector(".no-results-row");
  if (noResultsRow) {
    noResultsRow.remove();
  }
}

/**
 * Highlight search term in table
 */
function highlightText(row, searchTerm) {
  const cells = row.querySelectorAll("td");
  cells.forEach((cell) => {
    const originalText = cell.textContent;
    if (originalText.toLowerCase().includes(searchTerm)) {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      const highlighted = originalText.replace(regex, "<mark>$1</mark>");

      // Simpan original text
      if (!cell.hasAttribute("data-original")) {
        cell.setAttribute("data-original", originalText);
      }

      cell.innerHTML = highlighted;
      row.classList.add("highlight");
    }
  });
}

/**
 * Remove highlight
 */
function removeHighlight() {
  const rows = document.querySelectorAll("#docsTable tbody tr");
  rows.forEach((row) => {
    row.classList.remove("highlight");
    const cells = row.querySelectorAll("td[data-original]");
    cells.forEach((cell) => {
      const originalText = cell.getAttribute("data-original");
      cell.textContent = originalText;
      cell.removeAttribute("data-original");
    });
  });
}

/**
 * Update active filter in UI
 */
function updateActiveFilter(status) {
  // Update URL tanpa reload
  const url = new URL(window.location);
  if (status === "all") {
    url.searchParams.delete("status");
  } else {
    url.searchParams.set("status", status);
  }
  window.history.replaceState({}, "", url);
}

/**
 * Refresh table
 */
function refreshTable() {
  showToast("Memperbarui data dokumen...", "info");

  // Simulasi refresh
  setTimeout(() => {
    const rows = document.querySelectorAll("#docsTable tbody tr");
    rows.forEach((row) => {
      row.style.opacity = "0.5";
      setTimeout(() => {
        row.style.opacity = "1";
      }, 300);
    });

    // Update stat cards dengan animasi
    updateStatCardsAnimation();

    showToast("Data dokumen diperbarui", "success");
  }, 800);
}

/**
 * Update stat cards with animation
 */
function updateStatCardsAnimation() {
  const statValues = document.querySelectorAll(".stat-value");
  statValues.forEach((value) => {
    const originalValue = parseInt(value.textContent);
    value.style.transform = "scale(1.1)";
    value.style.color = "#0055a4";

    setTimeout(() => {
      value.style.transform = "scale(1)";
      value.style.color = "";
    }, 500);
  });
}

/**
 * Export to Excel
 */
function exportToExcel() {
  showToast("Menyiapkan data untuk export...", "info");

  // Simulasi export
  setTimeout(() => {
    const table = document.getElementById("docsTable");
    if (!table) {
      showToast("Tidak ada data untuk diexport", "warning");
      return;
    }

    // Buat data CSV
    let csv = [];
    const rows = table.querySelectorAll("tr");

    rows.forEach((row) => {
      if (!row.classList.contains("hidden")) {
        const rowData = [];
        const cells = row.querySelectorAll("th, td");

        cells.forEach((cell) => {
          // Hilangkan tag HTML dan ambil teks saja
          let text = cell.textContent.trim();
          // Escape quotes
          text = text.replace(/"/g, '""');
          // Add quotes if contains comma
          if (text.includes(",") || text.includes('"')) {
            text = '"' + text + '"';
          }
          rowData.push(text);
        });

        csv.push(rowData.join(","));
      }
    });

    // Download file
    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `dokumen_saya_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Export berhasil. File CSV telah diunduh.", "success");
  }, 1000);
}

/**
 * View document
 */
function viewDoc(id) {
  if (!id) {
    showToast("ID dokumen tidak valid", "error");
    return;
  }

  showToast("Membuka dokumen...", "info");
  window.location.href = `/proposal/view/${id}`;
}

/**
 * Edit document
 */
function editDoc(id) {
  if (!id) {
    showToast("ID dokumen tidak valid", "error");
    return;
  }

  showToast("Membuka editor...", "info");
  window.location.href = `/proposal/edit/${id}`;
}

/**
 * Download PDF
 */
function downloadPDF(id) {
  if (!id) {
    showToast("ID dokumen tidak valid", "error");
    return;
  }

  showToast("Mempersiapkan dokumen PDF...", "info");

  // Buka tab baru untuk download PDF
  const pdfUrl = `/api/proposal/pdf/${id}`;
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.target = "_blank";
  link.download = `Dokumen_${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Fallback
  setTimeout(() => {
    window.open(pdfUrl, "_blank");
  }, 1000);
}

/**
 * Show toast notification
 */
function showToast(message, type = "info") {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".custom-toast");
  existingToasts.forEach((toast) => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  });

  const toast = document.createElement("div");
  toast.className = `custom-toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${getToastIcon(type)}"></i>
      <span>${message}</span>
    </div>
    <button onclick="this.parentElement.remove()" class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `;

  // Gunakan style yang sudah ada dari dashboard_pegawai.css
  document.body.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = "slideOut 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, 3000);
}

/**
 * Get toast icon based on type
 */
function getToastIcon(type) {
  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  return icons[type] || "fa-info-circle";
}

// Close modal when clicking outside (if exists)
document.addEventListener("click", function (e) {
  const guideModal = document.getElementById("guideModal");
  if (guideModal && guideModal.style.display === "flex") {
    if (e.target === guideModal) {
      closeGuide();
    }
  }
});

// Close modal with ESC key (if exists)
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const guideModal = document.getElementById("guideModal");
    if (guideModal && guideModal.style.display === "flex") {
      closeGuide();
    }
  }
});

function closeGuide() {
  const guideModal = document.getElementById("guideModal");
  if (guideModal) {
    guideModal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}
