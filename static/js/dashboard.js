// ================================================
// DASHBOARD JAVASCRIPT - PEGAWAI
// ================================================

document.addEventListener("DOMContentLoaded", function () {
  // Format tanggal Indonesia
  formatTanggalIndonesia();

  // Confirm delete actions
  setupDeleteConfirmation();

  // Setup table sorting (jika ada)
  setupTableSorting();

  // Update real-time stats
  updateStats();
});

function formatTanggalIndonesia() {
  document.querySelectorAll(".tanggal-indonesia").forEach((element) => {
    const dateString = element.textContent.trim();
    if (dateString) {
      try {
        const date = new Date(dateString);
        const options = {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        };
        element.textContent = date.toLocaleDateString("id-ID", options);
      } catch (e) {
        // Tetap tampilkan string asli jika error
      }
    }
  });
}

function setupDeleteConfirmation() {
  document.querySelectorAll(".btn-delete").forEach((button) => {
    button.addEventListener("click", function (e) {
      if (!confirm("Apakah Anda yakin ingin menghapus usulan ini?")) {
        e.preventDefault();
      }
    });
  });
}

function setupTableSorting() {
  const tableHeaders = document.querySelectorAll(".data-table th[data-sort]");
  tableHeaders.forEach((header) => {
    header.style.cursor = "pointer";
    header.addEventListener("click", function () {
      const table = this.closest("table");
      const columnIndex = Array.from(this.parentElement.children).indexOf(this);
      const sortOrder =
        this.getAttribute("data-sort-order") === "asc" ? "desc" : "asc";

      // Reset semua header
      table.querySelectorAll("th[data-sort]").forEach((th) => {
        th.removeAttribute("data-sort-order");
      });

      // Set sort order pada header ini
      this.setAttribute("data-sort-order", sortOrder);

      // Tambahkan icon sort
      this.innerHTML =
        this.textContent +
        (sortOrder === "asc"
          ? ' <i class="fas fa-sort-up"></i>'
          : ' <i class="fas fa-sort-down"></i>');

      // Implement sorting logic disini jika diperlukan
      console.log(`Sort column ${columnIndex} in ${sortOrder} order`);
    });
  });
}

function updateStats() {
  // Update waktu real-time jika diperlukan
  const now = new Date();
  document.querySelectorAll(".current-time").forEach((element) => {
    element.textContent = now.toLocaleTimeString("id-ID");
  });

  // Update countdown jika ada
  updateCountdowns();
}

function updateCountdowns() {
  document.querySelectorAll(".countdown").forEach((element) => {
    const targetDate = new Date(element.getAttribute("data-date"));
    const now = new Date();
    const diff = targetDate - now;

    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      element.textContent = `${days} hari lagi`;
    } else {
      element.textContent = "Tenggat waktu terlewat";
      element.classList.add("text-danger");
    }
  });
}

// Export functions jika diperlukan
window.dashboardUtils = {
  formatTanggalIndonesia,
  updateStats,
};
