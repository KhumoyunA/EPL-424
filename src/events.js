import { dom } from "./dom.js";
import { toggleStatType, getStatType, setSearchQuery } from "./state.js";
import {
  renderStats,
  handleSearch,
  clearSearchResults,
  closeModal,
  handleOutsideClick,
  handleFocusTrap,
} from "./render.js";

export function attachEventListeners() {
  // toggle goals/assists
  dom.toggleBtn.addEventListener("click", () => {
    toggleStatType();

    const type = getStatType();
    const label = dom.toggleBtn.querySelector(".stat-label");

    if (type === "goals") {
      label.textContent = "Top Scorers";
      dom.toggleBtn.setAttribute("aria-pressed", "false");
    } else {
      label.textContent = "Top Assists";
      dom.toggleBtn.setAttribute("aria-pressed", "true");
    }

    renderStats();
  });

  // search
  dom.searchForm.addEventListener("submit", handleSearch);
  dom.siteSearch.addEventListener("input", () => {
    if (dom.siteSearch.value === "") {
      clearSearchResults();
    }
  });

  // bug 3 fix: dismiss search dropdown on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      if (dom.siteSearch.value !== "") {
        dom.siteSearch.value = "";
        clearSearchResults();
      }
    }
  });

  // modal close + focus trap
  dom.closeModalBtn.addEventListener("click", closeModal);
  dom.modal.addEventListener("click", handleOutsideClick);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
    handleFocusTrap(e);
  });
}
