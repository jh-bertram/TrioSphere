document.addEventListener("DOMContentLoaded", () => {
  const DATASETS      = window.DATASETS;
  const grid          = document.getElementById("datasetGrid");
  const searchEl      = document.getElementById("searchInput");
  const dateStartEl   = document.getElementById("dateStart");
  const dateEndEl     = document.getElementById("dateEnd");
  const clearBtn      = document.getElementById("clearFilters");
  const categoryPills = document.getElementById("categoryPills");

  // Info Modal elements
  const modal         = document.getElementById("infoModal");
  const modalTitle    = document.getElementById("modalTitle");
  const modalBody     = document.getElementById("modalBody");
  const modalDownload = document.getElementById("modalDownload");
  const modalClose    = document.getElementById("modalClose");

  // Suggestion Modal elements
  const openSuggestionBtn = document.getElementById("openSuggestionModalBtn");
  const suggestionModal = document.getElementById("suggestionModal");
  const suggestionModalClose = document.getElementById("suggestionModalClose");
  const suggestionForm = document.getElementById("suggestionForm");
  const suggestionText = document.getElementById("suggestionText");

  // State
  let activeSearch    = "";
  let activeFilters   = { tags: new Set(), type: new Set(), region: new Set() };
  let activeDateFrom  = null;
  let activeDateTo    = null;
  let selectedPills   = new Set();

  // --- DYNAMICALLY GENERATE TAG FILTERS ---
  const tagFiltersContainer = document.getElementById("tagFiltersContainer");
  const allTags = new Set();
  DATASETS.forEach(ds => {
    ds.tags.forEach(tag => allTags.add(tag));
  });
  const sortedTags = [...allTags].sort((a, b) => a.localeCompare(b));
  tagFiltersContainer.innerHTML = sortedTags.map(tag => `
    <div><label><input type="checkbox" class="filter-checkbox" data-filter-group="tags" value="${tag}"> ${tag}</label></div>
  `).join('');

  // --- DYNAMICALLY GENERATE REGION (region) FILTERS ---
  const regionFiltersContainer = document.getElementById("regionFiltersContainer");
  const allregions = new Set();
  DATASETS.forEach(ds => {
    if (ds.region) {
      ds.region.forEach(loc => allregions.add(loc));
    }
  });
  const sortedregions = [...allregions].sort((a, b) => a.localeCompare(b));
  regionFiltersContainer.innerHTML = sortedregions.map(loc => `
    <div><label><input type="checkbox" class="filter-checkbox" data-filter-group="region" value="${loc}"> ${loc}</label></div>
  `).join('');

  const filters = document.querySelectorAll(".filter-checkbox");

  // Helpers
  const normalize = str => str.trim().toLowerCase();

  function passSearch(ds) {
    if (!activeSearch) return true;
    const haystack = [
      ds.name, ds.description,
      ...ds.tags,
      ...(ds.region || []),
      ...(ds.invisibleTags || [])
    ].join(" ").toLowerCase();
    return haystack.includes(activeSearch);
  }

  function passFilters(ds) {
    if (selectedPills.size) {
      if (!ds.categories?.some(c => selectedPills.has(c))) return false;
    }
    if (activeFilters.tags.size) {
      if (!ds.tags.some(t => activeFilters.tags.has(t))) return false;
    }
    if (activeFilters.type.size) {
      const isDatabase = ds.source?.toLowerCase().includes('database');
      const actualType = isDatabase ? 'Database' : 'Dataset';
      if (!activeFilters.type.has(actualType)) return false;
    }
    if (activeFilters.region.size) {
      if (!ds.region || !ds.region.some(loc => activeFilters.region.has(loc))) return false;
    }
    const start = Number(ds.yearStart), end = Number(ds.yearEnd);
    if (activeDateFrom !== null && end < activeDateFrom) return false;
    if (activeDateTo   !== null && start > activeDateTo)   return false;
    return true;
  }

  function buildCard(ds) {
    const el = document.createElement("article");
    el.className = "card";
    if (ds.source && ds.source.toLowerCase().includes('database')) {
      el.classList.add("card-database");
    }
    el.innerHTML = `
      <h3>${ds.name}</h3>
      <p>${ds.description}</p>
      <div class="taglist">
        ${ds.tags.map(t => `<span class="tag">${t}</span>`).join("")}
      </div>
      <button type="button" class="btn more-info">More Info</button>
    `;
    el.querySelector(".more-info")
      .addEventListener("click", () => showModal(ds));
    return el;
  }

  function showModal(ds) {
    modalTitle.textContent = ds.name;
    modalBody.innerHTML    = ds.additionalInfo;
    modalDownload.onclick  = () => window.open(ds.url, "_blank");
    modal.classList.remove("hidden");
  }

  function hideModal() {
    modal.classList.add("hidden");
  }

  modalClose.addEventListener("click", hideModal);
  modal.addEventListener("click", e => {
    if (e.target === modal) hideModal();
  });

  function render() {
    const subset = DATASETS.filter(ds => passSearch(ds) && passFilters(ds));
    grid.innerHTML = "";
    if (!subset.length) {
      grid.innerHTML = "<p>No datasets match your criteria.</p>";
    } else {
      subset.forEach(ds => grid.appendChild(buildCard(ds)));
    }
  }

  // Wire up event listeners
  searchEl.addEventListener("input", e => {
    activeSearch = normalize(e.target.value);
    render();
  });

  filters.forEach(cb => {
    cb.addEventListener("change", () => {
      const group = cb.dataset.filterGroup;
      cb.checked ? activeFilters[group].add(cb.value)
                 : activeFilters[group].delete(cb.value);
      render();
    });
  });

  [dateStartEl, dateEndEl].forEach(inp => {
    inp.addEventListener("input", () => {
      const v = parseInt(inp.value) || null;
      if (inp === dateStartEl) activeDateFrom = v;
      else                      activeDateTo   = v;
      render();
    });
  });

  clearBtn.addEventListener("click", () => {
    activeSearch = "";
    searchEl.value = "";
    activeFilters.tags.clear();
    activeFilters.type.clear();
    activeFilters.region.clear();
    selectedPills.clear();
    activeDateFrom = activeDateTo = null;
    filters.forEach(c => c.checked = false);
    categoryPills.querySelectorAll(".pill")
      .forEach(p => p.classList.remove("active"));
    dateStartEl.value = dateEndEl.value = "";
    render();
  });

  categoryPills.addEventListener("click", e => {
    if (!e.target.matches(".pill")) return;
    const cat = e.target.dataset.value;
    if (selectedPills.has(cat)) {
      selectedPills.delete(cat);
      e.target.classList.remove("active");
    } else {
      selectedPills.add(cat);
      e.target.classList.add("active");
    }
    render();
  });

  // --- NEW: SUGGESTION MODAL LOGIC ---
  function showSuggestionModal() {
    suggestionModal.classList.remove("hidden");
  }

  function hideSuggestionModal() {
    suggestionModal.classList.add("hidden");
  }

  if (openSuggestionBtn) {
    openSuggestionBtn.addEventListener("click", showSuggestionModal);
  }

  if (suggestionModalClose) {
    suggestionModalClose.addEventListener("click", hideSuggestionModal);
  }

  if (suggestionModal) {
    suggestionModal.addEventListener("click", e => {
      if (e.target === suggestionModal) {
        hideSuggestionModal();
      }
    });
  }

  if (suggestionForm) {
    suggestionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const feedback = suggestionText.value.trim();
      if (feedback) {
        alert("Thank you for your feedback!");
        suggestionText.value = "";
        hideSuggestionModal();
      } else {
        alert("Please enter your feedback before submitting.");
      }
    });
  }

  // Initial draw
  render();

  // --- HIGHLIGHT ACTIVE NAVIGATION LINK ---
  document.querySelectorAll('.menu a').forEach(a => {
    if (a.pathname.split('/').pop() === window.location.pathname.split('/').pop()) {
      a.style.fontWeight = '700';
      a.style.color = 'var(--clr-primary-dark)';
    }
  });

});