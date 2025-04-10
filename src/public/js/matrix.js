document.addEventListener("DOMContentLoaded", async function() {
  const table = document.querySelector(".matrix-table");
  const searchInput = document.getElementById("searchMedicine");
  const viewTypeSelect = document.getElementById("viewType");
  const timeRangeSelect = document.getElementById("timeRange");
  
  let matrixData = [];
  
  async function loadData() {
    try {
      const loading = document.createElement('div');
      loading.className = 'text-center p-4';
      loading.innerHTML = `
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      `;
      table.querySelector('tbody').innerHTML = '';
      table.querySelector('tbody').appendChild(loading);

      const response = await fetch("/api/mismatches/matrix");
      if (!response.ok) throw new Error('Error al cargar los datos');
      
      const data = await response.json();
      if (!data.matrix) throw new Error('Formato de datos inválido');
      
      matrixData = data.matrix;
      renderTable();
    } catch (error) {
      console.error("Error:", error);
      table.querySelector('tbody').innerHTML = `
        <tr>
          <td colspan="100" class="text-center text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Error al cargar los datos: ${error.message}
          </td>
        </tr>
      `;
    }
  }

  function renderTable() {
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

    // Renderizar filas
    tbody.innerHTML = matrixData
      .filter(medicine => {
        const searchTerm = searchInput.value.toLowerCase();
        const viewType = viewTypeSelect.value;
        
        const matchesSearch = 
          medicine.codigo_med.toLowerCase().includes(searchTerm) ||
          medicine.descripcion.toLowerCase().includes(searchTerm);
          
        if (!matchesSearch) return false;
        
        if (viewType === 'changes') {
          return medicine.historial.some(h => h.hasChange);
        }
        if (viewType === 'active') {
          return medicine.historial.some(h => h.descuadre !== 0);
        }
        return true;
      })
      .map(medicine => `
        <tr>
          <td style="position: sticky; left: 0; background: white; z-index: 1">
            <div>
              <strong>${medicine.codigo_med}</strong>
              <br>
              <small class="text-muted">${medicine.descripcion}</small>
            </div>
          </td>
          ${dates.map(date => {
            const dayData = medicine.historial.find(h => h.fecha === date);
            if (!dayData) return '<td></td>';
            
            return `
              <td class="text-center ${dayData.hasChange ? 'has-change' : ''}"
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  title="FarmaTools: ${dayData.farmatools} | APD: ${dayData.apd}">
                <span class="${dayData.descuadre < 0 ? 'text-danger' : 'text-success'}">
                  <strong>${dayData.descuadre}</strong>
                </span>
                ${dayData.hasChange ? `
                  <i class="bi bi-arrow-repeat text-warning ms-1"></i>
                ` : ''}
              </td>
            `;
          }).join('')}
        </tr>
      `).join('');

    // Inicializar tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(t => new bootstrap.Tooltip(t));
  }

  // Event listeners
  searchInput.addEventListener('input', renderTable);
  viewTypeSelect.addEventListener('change', renderTable);
  timeRangeSelect.addEventListener('change', loadData);

  // Inicializar
  await loadData();
});
