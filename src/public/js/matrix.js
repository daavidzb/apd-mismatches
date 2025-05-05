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
    // Ordenar los datos por relevancia
    filteredData.sort((a, b) => {
      // Obtener último descuadre no nulo de cada medicamento
      const getLastMismatch = (medicine) => {
        return medicine.historial
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .find(h => h.descuadre !== 0);
      };

      const lastA = getLastMismatch(a);
      const lastB = getLastMismatch(b);

      if (!lastA) return 1;  // Sin descuadre al final
      if (!lastB) return -1; // Sin descuadre al final

      // Priorizar por:
      // 1. Descuadres con cambios recientes
      // 2. Fecha del último descuadre
      // 3. Magnitud del descuadre
      if (a.historial.some(h => h.hasChange) && !b.historial.some(h => h.hasChange)) return -1;
      if (!a.historial.some(h => h.hasChange) && b.historial.some(h => h.hasChange)) return 1;

      const dateA = new Date(lastA.fecha);
      const dateB = new Date(lastB.fecha);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;

      return Math.abs(lastB.descuadre) - Math.abs(lastA.descuadre);
    });

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
    const thead = table.querySelector("thead") || document.createElement("thead");
    const tbody = table.querySelector("tbody") || document.createElement("tbody");
    
    // Limpiar tabla si estamos en la primera página
    if (currentPage === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = '';
    }

    // Obtener fechas únicas y ordenarlas de más reciente a más antigua
    const dates = [...new Set(
      matrixData.flatMap(m => m.historial.map(h => h.fecha))
    )].sort((a, b) => new Date(b) - new Date(a));

    // Renderizar encabezados
    const theadRow = document.createElement("tr");
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
    thead.appendChild(theadRow);
    table.appendChild(thead);
    table.appendChild(tbody);
  }

  function createRowHTML(medicine) {
    const dates = [...new Set(
      matrixData.flatMap(m => m.historial.map(h => h.fecha))
    )].sort((a, b) => new Date(b) - new Date(a));

    // Obtener el último descuadre no nulo
    const lastNonZeroMismatch = medicine.historial
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .find(h => h.descuadre !== 0);

    if (!lastNonZeroMismatch) return '';

    // Generar las celdas para cada fecha
    const dateCells = dates.map(date => {
      const dayData = medicine.historial.find(h => h.fecha === date);
      if (!dayData || dayData.descuadre === 0) {
        return '<td class="text-center text-muted">-</td>';
      }

      const cellClass = dayData.hasChange ? 'table-warning' : '';
      const valueClass = dayData.descuadre > 0 ? 'text-success' : 'text-danger';
      
      // Crear tooltip con información detallada
      const tooltipContent = `
        <div class='text-start'>
          <div class='mb-1'><strong>Fecha:</strong> ${new Date(date).toLocaleDateString()}</div>
          <div class='mb-1'><strong>FarmaTools:</strong> ${dayData.cantidad_farmatools}</div>
          <div class='mb-1'><strong>APD:</strong> ${dayData.cantidad_armario_apd}</div>
          <div><strong>Diferencia:</strong> <span class='${valueClass}'>${dayData.descuadre}</span></div>
        </div>
      `;

      return `
        <td class="text-center ${cellClass}" 
            data-bs-toggle="tooltip" 
            data-bs-html="true"
            data-bs-custom-class="custom-tooltip"
            title="${tooltipContent.replace(/"/g, '&quot;')}">
          <span class="${valueClass}">
            <strong>${dayData.descuadre}</strong>
            ${dayData.hasChange ? 
              `<i class="bi bi-exclamation-triangle-fill text-warning ms-1" style="font-size: 0.75rem;"></i>` 
              : ''}
          </span>
        </td>`;
    }).join('');

    return `
      <tr>
        <td style="position: sticky; left: 0; background: white; z-index: 1">
          <div class="d-flex align-items-center">
            <div>
              <strong class="text-primary">${medicine.codigo_med}</strong>
              <small class="text-muted d-block text-truncate" style="max-width: 250px;" 
                     title="${medicine.descripcion}">
                ${medicine.descripcion}
              </small>
            </div>
            ${getPatternBadge(medicine)}
          </div>
        </td>
        ${dateCells}
      </tr>`;
  }

  // Función auxiliar para obtener el badge de patrón
  function getPatternBadge(medicine) {
    const historyValues = medicine.historial
      .filter(h => h.descuadre !== 0)
      .map(h => h.descuadre);

    const isConstant = historyValues.length > 1 && 
      historyValues.every(v => v === historyValues[0]);
    const hasIncreasingTrend = historyValues.length > 1 && 
      historyValues.every((v, i) => i === 0 || v >= historyValues[i - 1]);

    if (isConstant) {
      return `
        <span class="badge bg-info-subtle text-info ms-2" data-bs-toggle="tooltip" 
              title="Descuadre constante - Considerar regularizar">
          <i class="bi bi-arrow-repeat"></i>
        </span>`;
    } 
    if (hasIncreasingTrend) {
      return `
        <span class="badge bg-danger-subtle text-danger ms-2" data-bs-toggle="tooltip" 
              title="Tendencia creciente - Requiere atención">
          <i class="bi bi-graph-up"></i>
        </span>`;
    }
    return '';
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
    const viewType = viewTypeSelect.value;
    const timeRange = parseInt(timeRangeSelect.value);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);

    filteredData = matrixData.filter(medicine => {
      const hasMismatch = medicine.historial.some(h => h.descuadre !== 0);
      if (!hasMismatch) return false;

      const recentMismatches = medicine.historial.filter(h => 
        new Date(h.fecha) >= cutoffDate && h.descuadre !== 0
      );

      switch(viewType) {
        case 'changes':
          return recentMismatches.some(h => h.hasChange);
        case 'active':
          return recentMismatches.length > 0;
        default:
          return true;
      }
    });

    currentPage = 0;
    renderTablePage();
  });

  timeRangeSelect.addEventListener('change', () => {
    viewTypeSelect.dispatchEvent(new Event('change'));
  });

  // Cargar datos iniciales
  await loadData();
});