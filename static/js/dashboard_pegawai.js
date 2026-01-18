/**
 * Dashboard Pegawai JavaScript
 * BMKG Change Proposal System
 */

document.addEventListener("DOMContentLoaded", function () {
  // Format tanggal Indonesia
  formatIndonesianDates();

  // Initialize tooltips
  initTooltips();

  // Initialize event listeners
  initEventListeners();

  // Update stats counters
  updateLiveStats();

  // Auto-refresh data every 30 seconds
  setInterval(refreshProposalsData, 30000);
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
        // Coba parse berbagai format tanggal
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
          // Format lain, gunakan Date.parse
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
        // Tetap tampilkan tanggal asli jika parsing gagal
      }
    }
  });
}

/**
 * Initialize tooltips
 */
function initTooltips() {
  // Tooltip sudah dihandle oleh CSS/HTML data-tooltip
  // Ini untuk kompatibilitas jika ada tooltip custom
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Quick Guide Modal
  const quickGuideBtn = document.getElementById("quickGuideBtn");
  const guideModal = document.getElementById("guideModal");

  if (quickGuideBtn) {
    quickGuideBtn.addEventListener("click", function () {
      guideModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    });
  }

  // Refresh table button
  const refreshBtn = document.getElementById("refreshTable");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      refreshProposalsData();
      showToast("Data usulan diperbarui", "success");
    });
  }

  // Export PDF button
  const exportBtn = document.getElementById("exportPdf");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      exportTableToPDF();
    });
  }

  // Filter sidebar links
  const sidebarLinks = document.querySelectorAll(".sidebar-submenu");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const filter = this.getAttribute("href").substring(1);
      filterProposals(filter);
    });
  });
}

/**
 * Update live statistics
 */
function updateLiveStats() {
  const stats = {
    draft: document.getElementById("statDraft"),
    evaluasi: document.getElementById("statEvaluasi"),
    process: document.getElementById("statProcess"),
    completed: document.getElementById("statCompleted"),
  };

  // Animate count up
  Object.values(stats).forEach((stat) => {
    if (stat) {
      const targetValue = parseInt(stat.textContent) || 0;
      animateCount(stat, targetValue);
    }
  });
}

/**
 * Animate count up
 */
function animateCount(element, target) {
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 20);
}

/**
 * ================================================
 * FUNGSI TOMBOL AKSI UTAMA
 * ================================================
 */

/**
 * Edit proposal (draft only)
 */
function editProposal(id) {
  console.log("[EDIT] Tombol edit diklik, ID:", id, "Type:", typeof id);

  try {
    // Validasi ID
    if (!id) {
      console.error("[ERROR] ID kosong");
      alert("ID draft tidak valid");
      return false;
    }

    // Pastikan ID adalah string
    const proposalId = String(id).trim();
    console.log("[EDIT] Proposal ID:", proposalId);

    // Cek jika ID mengandung "draft_"
    if (!proposalId.includes("draft_") && !proposalId.includes("DRAFT_")) {
      console.warn("[WARN] ID bukan format draft:", proposalId);
    }

    // Buat URL
    const url = `/pegawai/edit-proposal/${proposalId}`;
    console.log("[EDIT] Redirect ke URL:", url);

    // Debug: coba buka URL manual
    console.log("[DEBUG] Coba buka URL ini di browser baru:");
    console.log(`http://localhost:5000/pegawai/edit-proposal/${proposalId}`);

    // Redirect
    window.location.href = url;
    return false;
  } catch (error) {
    console.error("[ERROR] Gagal redirect:", error);
    alert("Terjadi kesalahan: " + error.message);
    return false;
  }
}

/**
 * Delete proposal (draft only)
 */
async function deleteProposal(id) {
  if (!id) {
    showToast("ID usulan tidak valid", "error");
    return;
  }

  // Konfirmasi penghapusan
  if (
    !confirm(
      "Apakah Anda yakin ingin menghapus usulan ini?\n\nUsulan yang sudah dihapus tidak dapat dikembalikan."
    )
  ) {
    return;
  }

  showToast("Menghapus usulan...", "info");

  try {
    const response = await fetch(`/api/proposal/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message || "Usulan berhasil dihapus", "success");

      // Hapus baris dari tabel
      removeProposalRow(id);

      // Update stats
      updateStatsAfterDelete();
    } else {
      showToast(result.message || "Gagal menghapus usulan", "error");
    }
  } catch (error) {
    console.error("Error deleting proposal:", error);
    showToast("Terjadi kesalahan saat menghapus usulan", "error");
  }
}

/**
 * View proposal details
 */
function viewProposal(id) {
  if (!id) {
    showToast("ID usulan tidak valid", "error");
    return;
  }

  // Redirect ke halaman detail proposal
  window.location.href = `/proposal/view/${id}`;
}

/**
 * Download proposal PDF
 */
function downloadPdf(id) {
  if (!id) {
    showToast("ID usulan tidak valid", "error");
    return;
  }

  showToast("Mempersiapkan dokumen PDF...", "info");

  // Buka tab baru untuk download PDF
  const pdfUrl = `/api/proposal/pdf/${id}`;

  // Coba download langsung
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.target = "_blank";
  link.download = `Usulan_BMKG_${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Fallback: buka di tab baru
  setTimeout(() => {
    window.open(pdfUrl, "_blank");
  }, 1000);
}

/**
 * ================================================
 * FUNGSI HELPER TOMBOL AKSI
 * ================================================
 */

/**
 * Remove proposal row from table
 */
function removeProposalRow(proposalId) {
  const rows = document.querySelectorAll("#proposalsTable tbody tr");

  rows.forEach((row) => {
    // Cari tombol edit/delete di baris ini
    const editBtn = row.querySelector(".btn-edit");
    const deleteBtn = row.querySelector(".btn-delete");

    // Cek apakah tombol ini memiliki onclick dengan ID yang sesuai
    if (editBtn && editBtn.getAttribute("onclick")) {
      const onclickAttr = editBtn.getAttribute("onclick");
      const matches = onclickAttr.match(/editProposal\((\d+)\)/);

      if (matches && matches[1] == proposalId) {
        // Hapus baris dengan animasi
        row.style.transition = "all 0.3s ease";
        row.style.opacity = "0";
        row.style.transform = "translateX(-100%)";

        setTimeout(() => {
          row.remove();

          // Cek jika tabel kosong
          checkIfTableEmpty();
        }, 300);
        return;
      }
    }

    // Cek untuk tombol delete juga
    if (deleteBtn && deleteBtn.getAttribute("onclick")) {
      const onclickAttr = deleteBtn.getAttribute("onclick");
      const matches = onclickAttr.match(/deleteProposal\((\d+)\)/);

      if (matches && matches[1] == proposalId) {
        // Hapus baris dengan animasi
        row.style.transition = "all 0.3s ease";
        row.style.opacity = "0";
        row.style.transform = "translateX(-100%)";

        setTimeout(() => {
          row.remove();

          // Cek jika tabel kosong
          checkIfTableEmpty();
        }, 300);
        return;
      }
    }
  });
}

/**
 * Update statistics after delete
 */
function updateStatsAfterDelete() {
  // Update draft count
  const draftCountElement = document.getElementById("draftCount");
  const statDraftElement = document.getElementById("statDraft");

  if (draftCountElement && statDraftElement) {
    let currentCount = parseInt(draftCountElement.textContent) || 0;
    currentCount = Math.max(0, currentCount - 1);

    draftCountElement.textContent = currentCount;
    statDraftElement.textContent = currentCount;

    // Animate count down
    animateCount(statDraftElement, currentCount);
  }

  // Update total stats
  updateLiveStats();
}

/**
 * Check if table is empty and show empty state
 */
function checkIfTableEmpty() {
  const tableBody = document.querySelector("#proposalsTable tbody");
  const emptyState = document.querySelector(".empty-state");
  const tableResponsive = document.querySelector(".table-responsive");

  if (!tableBody || !tableResponsive) return;

  const rows = tableBody.querySelectorAll("tr");
  const visibleRows = Array.from(rows).filter(
    (row) => row.style.display !== "none"
  );

  if (visibleRows.length === 0 && !emptyState) {
    // Show empty state
    const emptyHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <h3 class="empty-title">Belum ada usulan</h3>
                <p class="empty-description">
                    Mulai dengan membuat usulan perubahan baru untuk sistem BMKG.
                </p>
                <a href="/pegawai/usulan-baru" class="btn-primary">
                    <i class="fas fa-plus"></i>
                    Buat Usulan Pertama
                </a>
            </div>
        `;

    tableResponsive.innerHTML = emptyHTML;
  }
}

/**
 * Filter proposals by status
 */
function filterProposals(filter) {
  const rows = document.querySelectorAll("#proposalsTable tbody tr");
  let visibleCount = 0;

  rows.forEach((row) => {
    const statusBadge = row.querySelector(".status-badge");
    const status = getStatusFromBadge(statusBadge);

    let show = false;

    switch (filter) {
      case "draft":
        show = status === "draft";
        break;
      case "proses":
        show = ["evaluasi", "approval", "implementation"].includes(status);
        break;
      case "selesai":
        show = status === "completed";
        break;
      default:
        show = true;
    }

    row.style.display = show ? "" : "none";
    if (show) visibleCount++;
  });

  // Update active filter in sidebar
  updateActiveFilter(filter);

  // Show message if no results
  showFilterMessage(visibleCount, filter);
}

/**
 * Get status from badge class
 */
function getStatusFromBadge(badge) {
  if (!badge) return "";

  if (badge.classList.contains("badge-draft")) return "draft";
  if (badge.classList.contains("badge-evaluasi")) return "evaluasi";
  if (badge.classList.contains("badge-approval")) return "approval";
  if (badge.classList.contains("badge-implementation")) return "implementation";
  if (badge.classList.contains("badge-completed")) return "completed";
  return "";
}

/**
 * Update active filter in sidebar
 */
function updateActiveFilter(filter) {
  const links = document.querySelectorAll(".sidebar-submenu");

  links.forEach((link) => {
    const linkFilter = link.getAttribute("href").substring(1);
    if (linkFilter === filter) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/**
 * Show filter message
 */
function showFilterMessage(count, filter) {
  // Remove existing message
  const existingMsg = document.querySelector(".filter-message");
  if (existingMsg) existingMsg.remove();

  if (count === 0) {
    const tableBody = document.querySelector("#proposalsTable tbody");
    if (!tableBody) return;

    const message = document.createElement("tr");
    message.className = "filter-message";
    message.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div class="empty-state" style="max-width: 400px; margin: 0 auto;">
                    <div class="empty-icon" style="font-size: 3rem;">
                        <i class="fas fa-filter"></i>
                    </div>
                    <h3 class="empty-title">Tidak ada usulan dengan status ini</h3>
                    <p class="empty-description">
                        Tidak ditemukan usulan dengan status "${getFilterName(
                          filter
                        )}"
                    </p>
                    <button onclick="clearFilter()" class="btn-secondary">
                        <i class="fas fa-times"></i>
                        Hapus Filter
                    </button>
                </div>
            </td>
        `;
    tableBody.appendChild(message);
  }
}

/**
 * Get filter name in Bahasa
 */
function getFilterName(filter) {
  const filters = {
    draft: "Draft",
    proses: "Sedang Diproses",
    selesai: "Selesai",
  };
  return filters[filter] || filter;
}

/**
 * Clear filter
 */
function clearFilter() {
  const rows = document.querySelectorAll("#proposalsTable tbody tr");
  rows.forEach((row) => {
    row.style.display = "";
  });

  const links = document.querySelectorAll(".sidebar-submenu");
  links.forEach((link) => link.classList.remove("active"));

  const filterMsg = document.querySelector(".filter-message");
  if (filterMsg) filterMsg.remove();
}

/**
 * Refresh proposals data from server
 */
async function refreshProposalsData() {
  try {
    showToast("Memperbarui data...", "info");

    const response = await fetch("/api/proposals/refresh", {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        updateStats(data.stats);
        showToast("Data berhasil diperbarui", "success");
      }
    }
  } catch (error) {
    console.error("Error refreshing data:", error);
    showToast("Gagal memperbarui data", "error");
  }
}

/**
 * Update statistics
 */
function updateStats(stats) {
  if (!stats) return;

  const elements = {
    draft: document.getElementById("statDraft"),
    evaluasi: document.getElementById("statEvaluasi"),
    process: document.getElementById("statProcess"),
    completed: document.getElementById("statCompleted"),
    draftCount: document.getElementById("draftCount"),
    processCount: document.getElementById("processCount"),
    completedCount: document.getElementById("completedCount"),
  };

  for (const [key, element] of Object.entries(elements)) {
    if (element && stats[key] !== undefined) {
      const currentValue = parseInt(element.textContent) || 0;
      const newValue = stats[key];

      if (currentValue !== newValue) {
        animateCount(element, newValue);

        // Update badge counts too
        if (key === "draft" && elements.draftCount) {
          elements.draftCount.textContent = newValue;
        }
        if (key === "process" && elements.processCount) {
          elements.processCount.textContent = newValue;
        }
        if (key === "completed" && elements.completedCount) {
          elements.completedCount.textContent = newValue;
        }
      }
    }
  }
}

/**
 * Export table to PDF
 */
function exportTableToPDF() {
  showToast("Menyiapkan laporan PDF...", "info");

  // Simulasi export
  setTimeout(() => {
    showToast("Laporan PDF berhasil diunduh", "success");

    // Untuk implementasi nyata, gunakan:
    // window.open('/api/export/pdf', '_blank');
  }, 1500);
}

/**
 * Close quick guide modal
 */
function closeGuide() {
  const guideModal = document.getElementById("guideModal");
  if (guideModal) {
    guideModal.style.display = "none";
    document.body.style.overflow = "auto";
  }
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

  // Add styles if not already added
  if (!document.querySelector("#toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
            .custom-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                font-family: 'Roboto', sans-serif;
            }
            
            .toast-success {
                background: #10b981;
                color: white;
                border-left: 4px solid #059669;
            }
            
            .toast-error {
                background: #ef4444;
                color: white;
                border-left: 4px solid #dc2626;
            }
            
            .toast-warning {
                background: #f59e0b;
                color: white;
                border-left: 4px solid #d97706;
            }
            
            .toast-info {
                background: #3b82f6;
                color: white;
                border-left: 4px solid #1d4ed8;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .custom-toast .toast-content {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .custom-toast .toast-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0;
                font-size: 14px;
                opacity: 0.8;
                transition: opacity 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 50%;
            }
            
            .custom-toast .toast-close:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.1);
            }
        `;
    document.head.appendChild(style);
  }

  // Set background color based on type
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  toast.style.background = colors[type] || "#3b82f6";
  toast.style.color = "white";
  toast.style.borderLeft = `4px solid ${
    colors[type] ? colors[type].replace(/[^,]+(?=\))/, "0.8") : "#1d4ed8"
  }`;

  document.body.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = "slideOut 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
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

// Close modal when clicking outside
document.addEventListener("click", function (e) {
  const guideModal = document.getElementById("guideModal");
  if (guideModal && guideModal.style.display === "flex") {
    if (e.target === guideModal) {
      closeGuide();
    }
  }
});

// Close modal with ESC key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeGuide();
  }
});
