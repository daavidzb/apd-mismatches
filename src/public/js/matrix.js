document.addEventListener("DOMContentLoaded", async function() {
  const TABLE_PAGE_SIZE = 20;
  let currentPage = 0;
  let matrixData = [];
  let filteredData = [];
  let isLoading = false;

  const table = document.querySelector(".matrix-table");
  const searchInput = document.getElementById("searchMedicine");
  const viewTypeSelect = document.getElementById("viewType");
  const timeRangeSelect = document.getElementById("timeRange");
  
  function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'text-center p-4';
    loader.id = 'matrixLoader';
    loader.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    `;
    table.querySelector('tbody').innerHTML = '';
    table.querySelector('tbody').appendChild(loader);
  }

  function hideLoader() {
    const loader = document.getElementById('matrixLoader');
    if (loader) {
      loader.remove();
    }
  }
  
  async function loadData() {
    try {
      showLoader();
      const response = await fetch("/api/mismatches/matrix");
      if (!response.ok) throw new Error('Error al cargar los datos');
      
      const data = await response.json();
      if (!data.matrix) throw new Error('Formato de datos inválido');
      
      matrixData = data.matrix;
      filteredData = [...matrixData];
      currentPage = 0;
      renderTablePage();
      hideLoader();
    } catch (error) {
      console.error("Error:", error);
      showError(error.message);
    }
  }

  function renderTablePage() {
    const start = currentPage * TABLE_PAGE_SIZE;
    const end = start + TABLE_PAGE_SIZE;
    const pageData = filteredData.slice(start, end);
    
    if (currentPage === 0) {
      renderTableHeader();
      table.querySelector('tbody').innerHTML = '';
    }

    const tbody = table.querySelector('tbody');
    const fragment = document.createDocumentFragment();

    pageData.forEach(medicine => {
      const tr = document.createElement('tr');
      tr.innerHTML = createRowHTML(medicine);
      fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
    initializeTooltips();

    // Intersection Observer para carga infinita
    if (end < filteredData.length) {
      observeLastRow();
    }
  }

  function observeLastRow() {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoading) {
          loadMoreRows();
        }
      });
    }, options);

    const lastRow = table.querySelector('tbody tr:last-child');
    if (lastRow) {
      observer.observe(lastRow);
    }
  }

  async function loadMoreRows() {
    isLoading = true;
    currentPage++;
    await renderTablePage();
    isLoading = false;
  }

  function renderTableHeader() {
    if (!matrixData.length) {
      table.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="100" class="text-center">
            No hay datos disponibles
          </td>
        </tr>
      `;
      return;
    }

    // Crear thead si no existe
    let thead = table.querySelector("thead");
    if (!thead) {
      thead = document.createElement("thead");
      table.appendChild(thead);
    }

    // Crear tr si no existe
    let theadRow = thead.querySelector("tr");
    if (!theadRow) {
      theadRow = document.createElement("tr");
      thead.appendChild(theadRow);
    }

    // Crear tbody si no existe
    let tbody = table.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      table.appendChild(tbody);
    }
    
    // Obtener fechas únicas
    const dates = [...new Set(
      matrixData.flatMap(m => m.historial.map(h => h.fecha))
    )].sort((a, b) => new Date(b) - new Date(a));

    // Renderizar encabezados
    theadRow.innerHTML = `
      <th style="min-width: 300px; position: sticky; left: 0; background: white; z-index: 2">
        <div class="d-flex align-items-center">
          <span>Medicamento</span>
          <i class="bi bi-search ms-2 text-muted small"></i>
        </div>
      </th>
      ${dates.map(date => `
        <th class="text-center" style="min-width: 100px">
          ${new Date(date).toLocaleDateString()}
        </th>
      `).join('')}
    `;
  }

  function createRowHTML(medicine) {
    const dates = [...new Set(
      matrixData.flatMap(m => m.historial.map(h => h.fecha))
    )].sort((a, b) => new Date(b) - new Date(a));

    // Detectar patrones
    const historyValues = medicine.historial.map(h => h.descuadre);
    const isConstant = historyValues.every(v => v === historyValues[0]);
    const hasIncreasingTrend = historyValues.every((v, i) => i === 0 || v >= historyValues[i - 1]);
    const hasDecreasingTrend = historyValues.every((v, i) => i === 0 || v <= historyValues[i - 1]);

    let patternBadge = '';
    if (isConstant) {
      patternBadge = `<span class="badge bg-info ms-2" data-bs-toggle="tooltip" title="Descuadre constante">
        <i class="bi bi-arrow-repeat"></i>
      </span>`;
    } else if (hasIncreasingTrend) {
      patternBadge = `<span class="badge bg-danger ms-2" data-bs-toggle="tooltip" title="Tendencia creciente">
        <i class="bi bi-graph-up"></i>
      </span>`;
    } else if (hasDecreasingTrend) {
      patternBadge = `<span class="badge bg-success ms-2" data-bs-toggle="tooltip" title="Tendencia decreciente">
        <i class="bi bi-graph-down"></i>
      </span>`;
    }

    return `
      <tr>
        <td style="position: sticky; left: 0; background: white; z-index: 1">
          <div class="d-flex align-items-center">
            <div>
              <strong>${medicine.codigo_med}</strong>
              <small class="text-muted d-block">${medicine.descripcion}</small>
            </div>
            ${patternBadge}
          </div>
        </td>
        ${dates.map(date => {
          const dayData = medicine.historial.find(h => h.fecha === date);
          if (!dayData) return '<td></td>';
          
          const tooltipContent = `
            <div class='text-start'>
              <div class='mb-1'><b>${new Date(date).toLocaleDateString()}</b></div>
              <div class='d-flex justify-content-between gap-3'>
                <span>FarmaTools:</span>
                <span>${dayData.farmatools}</span>
              </div>
              <div class='d-flex justify-content-between gap-3'>
                <span>APD:</span>
                <span>${dayData.apd}</span>
              </div>
              <div class='d-flex justify-content-between gap-3 fw-bold'>
                <span>Diferencia:</span>
                <span class='${dayData.descuadre < 0 ? 'text-danger' : 'text-success'}'>${dayData.descuadre}</span>
              </div>
            </div>
          `;
          
          return `
            <td class="text-center position-relative ${dayData.hasChange ? 'has-change' : ''}"
                data-bs-toggle="tooltip"
                data-bs-custom-class="matrix-tooltip"
                data-bs-html="true"
                title="${tooltipContent}">
              <span class="${dayData.descuadre < 0 ? 'text-danger' : 'text-success'}">
                <strong>${dayData.descuadre}</strong>
              </span>
              ${dayData.hasChange ? `
                <div class="change-indicator"></div>
              ` : ''}
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }

  function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(t => new bootstrap.Tooltip(t));
  }

  function showError(message) {
    table.querySelector('tbody').innerHTML = `
      <tr>
        <td colspan="100" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Error al cargar los datos: ${message}
        </td>
      </tr>
    `;
  }

  // Event listeners
  searchInput.addEventListener('input', () => {
    filteredData = matrixData.filter(medicine => {
      const searchTerm = searchInput.value.toLowerCase();
      return medicine.codigo_med.toLowerCase().includes(searchTerm) ||
             medicine.descripcion.toLowerCase().includes(searchTerm);
    });
    currentPage = 0;
    renderTablePage();
  });

  viewTypeSelect.addEventListener('change', () => {
    // Lógica para cambiar el tipo de vista
  });

  timeRangeSelect.addEventListener('change', () => {
    // Lógica para cambiar el rango de tiempo
  });

  // Cargar datos iniciales
  await loadData();
});