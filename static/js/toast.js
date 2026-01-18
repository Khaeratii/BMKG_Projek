// Toast Notification System
function showToast(message, type = "info", duration = 4000) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".toast-notification");
  existingToasts.forEach((toast) => {
    toast.remove();
  });

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${type}`;

  // Set icon based on type
  let icon = "info-circle";
  switch (type) {
    case "success":
      icon = "check-circle";
      break;
    case "error":
      icon = "times-circle";
      break;
    case "warning":
      icon = "exclamation-triangle";
      break;
    case "info":
      icon = "info-circle";
      break;
  }

  toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

  // Add to DOM
  document.body.appendChild(toast);

  // Show with animation
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Auto remove
  const autoRemove = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, duration);

  // Close button
  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => {
    clearTimeout(autoRemove);
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  });
}
