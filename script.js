// =======================
// EXCEL LOADING & PROCESSING
// =======================

let DATASETS = [];

// Helper function to split semicolon-separated strings
function splitSemicolon(str) {
  if (!str || str === '') return [];
  return str.split(';').map(s => s.trim()).filter(s => s.length > 0);
}

// Load and process Excel file
async function loadExcelData() {
  try {
    const response = await fetch('datasets.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Process each row
    DATASETS = rawData.map(row => {
      // Split semicolon-separated fields into arrays
      const categories = splitSemicolon(row.categories);
      const region = splitSemicolon(row.region);
      const tags = splitSemicolon(row.tags);
      const invisibleTags = splitSemicolon(row.invisibleTags);

      // Convert Markdown to HTML in additionalInfo
      let additionalInfo = row.additionalInfo || '';
      if (additionalInfo) {
        additionalInfo = marked.parse(additionalInfo);
        // Remove newlines for consistency
        additionalInfo = additionalInfo.replace(/\n/g, '');
      }

      return {
        id: String(row.id || ''),
        name: String(row.name || ''),
        description: String(row.description || ''),
        url: String(row.url || ''),
        categories: categories,
        source: String(row.source || ''),
        region: region,
        type: String(row.type || ''),
        yearStart: String(row.yearStart || ''),
        yearEnd: String(row.yearEnd || ''),
        tags: tags,
        invisibleTags: invisibleTags,
        additionalInfo: additionalInfo,
        dateAdded: row.dateAdded ? String(row.dateAdded) : undefined
      };
    });

    console.log(`Loaded ${DATASETS.length} datasets from Excel file`);
    return DATASETS;

  } catch (error) {
    console.error('Error loading Excel file:', error);
    const errorMsg = 'Unable to load datasets.xlsx. Please ensure the file is in the same directory as index.html.';
    alert(errorMsg);
    document.getElementById('resultCounter').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading Excel file';
    return [];
  }
}

// =======================
// MAIN APPLICATION
// =======================

async function initializeApp() {
  // Load data first
  await loadExcelData();

  // If no data loaded, stop here
  if (!DATASETS || DATASETS.length === 0) {
    document.getElementById('resultCounter').innerHTML = '<i class="fas fa-exclamation-triangle"></i> No data loaded';
    document.getElementById('datasetGrid').innerHTML = '<p style="padding: 2rem; text-align: center;">Unable to load datasets. Please check the browser console for errors.</p>';
    return;
  }

  // Now initialize the app with loaded data
  const grid          = document.getElementById("datasetGrid");
  const searchEl      = document.getElementById("searchInput");
  const dateStartEl   = document.getElementById("dateStart");
  const dateEndEl     = document.getElementById("dateEnd");
  const clearBtn      = document.getElementById("clearFilters");
  const categoryPills = document.getElementById("categoryPills");
  const resultCounter = document.getElementById("resultCounter");
  const exportCsvBtn  = document.getElementById("exportCsvBtn");
  const filterToggleBtn = document.getElementById("filterToggleBtn");
  const filterPanel = document.getElementById("filterPanel");
  const filterOverlay = document.getElementById("filterOverlay");

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
  let activeFilters   = { tags: new Set(), type: new Set(['Dataset', 'Database']), region: new Set() };  // Initialize with both types checked
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

    // Check if recently added (within last 30 days)
    let recentlyAddedBadge = '';
    if (ds.dateAdded) {
      const addedDate = new Date(ds.dateAdded);
      const today = new Date();
      const daysDiff = Math.floor((today - addedDate) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff <= 30) {
        recentlyAddedBadge = '<span class="recently-added-badge">Recently Added</span>';
      }
    }

    el.innerHTML = `
      ${recentlyAddedBadge}
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

    // Update result counter
    const count = subset.length;
    const plural = count === 1 ? 'dataset' : 'datasets';
    resultCounter.textContent = `${count} ${plural} found`;

    grid.innerHTML = "";
    if (!subset.length) {
      grid.innerHTML = "<p>No datasets match your criteria.</p>";
    } else {
      subset.forEach(ds => grid.appendChild(buildCard(ds)));
    }

    // Store current filtered results for CSV export
    window.currentFilteredResults = subset;
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

  // --- CSV EXPORT FUNCTIONALITY ---
  function exportToCSV() {
    const results = window.currentFilteredResults || DATASETS;
    if (!results.length) {
      alert("No datasets to export.");
      return;
    }

    // Define CSV headers
    const headers = ['ID', 'Name', 'Description', 'URL', 'Categories', 'Source', 'Region', 'Type', 'Year Start', 'Year End', 'Tags'];

    // Convert data to CSV rows
    const rows = results.map(ds => {
      return [
        ds.id,
        `"${(ds.name || '').replace(/"/g, '""')}"`,
        `"${(ds.description || '').replace(/"/g, '""')}"`,
        ds.url || '',
        `"${(ds.categories || []).join('; ')}"`,
        ds.source || '',
        `"${(ds.region || []).join('; ')}"`,
        ds.type || '',
        ds.yearStart || '',
        ds.yearEnd || '',
        `"${(ds.tags || []).join('; ')}"`,
      ].join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `triosphere-datasets-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportToCSV);
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

  // --- STICKY PILLS ENHANCEMENT ---
  const pillsContainer = document.querySelector('.search-category-container');
  if (pillsContainer) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 1) {
          pillsContainer.classList.add('is-sticky');
        } else {
          pillsContainer.classList.remove('is-sticky');
        }
      },
      { threshold: [1], rootMargin: '-57px 0px 0px 0px' }
    );
    observer.observe(pillsContainer);
  }

  // --- MOBILE FILTER TOGGLE ---
  function openFilterPanel() {
    filterPanel.classList.add('open');
    filterOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    filterToggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeFilterPanel() {
    filterPanel.classList.remove('open');
    filterOverlay.classList.remove('active');
    document.body.style.overflow = '';
    filterToggleBtn.setAttribute('aria-expanded', 'false');
  }

  if (filterToggleBtn) {
    filterToggleBtn.addEventListener('click', () => {
      if (filterPanel.classList.contains('open')) {
        closeFilterPanel();
      } else {
        openFilterPanel();
      }
    });
  }

  if (filterOverlay) {
    filterOverlay.addEventListener('click', closeFilterPanel);
  }
}

// =======================
// START THE APP
// =======================

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});
