document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      state.currentView = tab.dataset.view;
      saveState();
      render();
    });
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (confirm("¿Seguro que quieres resetear todo?")) {
      resetState();
    }
  });

  render();
});