// centralized DOM element references
// uses getters so elements are looked up when accessed after DOM is ready

export const dom = {
  get standingsBody() {
    return document.getElementById("standings-body");
  },
  get statsBody() {
    return document.getElementById("stats-body");
  },
  get statsTitle() {
    return document.getElementById("stats-title");
  },
  get statColumn() {
    return document.getElementById("stat-column");
  },
  get searchResults() {
    return document.getElementById("search-results");
  },
  get siteSearch() {
    return document.getElementById("site-search");
  },
  get searchForm() {
    return document.getElementById("search-form");
  },
  get toggleBtn() {
    return document.getElementById("toggle-stat");
  },
  get modal() {
    return document.getElementById("detail-modal");
  },
  get modalTitle() {
    return document.getElementById("modal-title");
  },
  get modalContent() {
    return document.getElementById("modal-dynamic-content");
  },
  get modalBackBtn() {
    return document.getElementById("modal-back-btn");
  },
  get closeModalBtn() {
    return document.getElementById("close-modal");
  },
};
