// Configuración de idioma para DataTables
const dataTableEsES = {
  decimal: "",
  emptyTable: "No hay datos disponibles",
  info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
  infoEmpty: "Mostrando 0 a 0 de 0 registros",
  infoFiltered: "(filtrado de _MAX_ registros totales)",
  infoPostFix: "",
  thousands: ",",
  lengthMenu: "Mostrar _MENU_ registros",
  loadingRecords: "Cargando...",
  processing: "Procesando...",
  search: "Buscar:",
  zeroRecords: "No se encontraron coincidencias",
  paginate: {
    first: "Primero",
    last: "Último",
    next: "Siguiente",
    previous: "Anterior",
  },
};

document.addEventListener("DOMContentLoaded", function () {
  // Configuración base para todas las tablas
  const configBase = {
    language: dataTableEsES,
    processing: true,
    pageLength: 10,
    responsive: true,
    scrollX: false,
    autoWidth: false,
    dom: '<"row mb-3"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>>rtip',
    buttons: [
      {
        extend: "excel",
        className: "btn btn-success",
        text: '<i class="bi bi-file-earmark-excel me-2"></i>Exportar Excel',
        filename: function () {
          const tableId = $(this.element).closest("table").attr("id");
          const estado = {
            tablaPendientes: "Medicamentos Pendientes",
            tablaRegularizar: "Medicamentos Por Regularizar",
            tablaEnProceso: "Medicamentos En Proceso",
            tablaResueltos: "Medicamentos Resueltos",
          }[tableId] || "Medicamentos";

          return `${estado} - ${new Date().toLocaleDateString()}`;
        },
        autoFilter: true,
        exportOptions: {
          columns: [0, 1, 2, 3, 4],
          format: {
            body: function (data, row, column) {
              // Remover HTML tags
              if (typeof data === "string") {
                // Para descripción, usar el texto completo sin truncar
                if (column === 1) {
                  const el = $(data);
                  return el.attr("title") || el.text();
                }
                // Para estado, solo el texto
                if (column === 3) {
                  return $(data).text();
                }
                // Para el resto, limpiar HTML
                return data.replace(/<[^>]+>/g, "");
              }
              return data;
            },
          },
        },
        customize: function (xlsx) {
          const sheet = xlsx.xl.worksheets["sheet1.xml"];

          // Estilos para la cabecera
          $("row:first c", sheet).attr("s", "2");

          // Estilos para las columnas
          $("row:not(:first) c[r^='A']", sheet).attr("s", "55"); // Código
          $("row:not(:first) c[r^='C']", sheet).attr("s", "62"); // Descuadre

          // Anchos de columna
          const colWidths = [15, 50, 15, 20, 25];
          const cols = sheet.getElementsByTagName("col");
          colWidths.forEach((width, i) => {
            if (cols[i]) cols[i].setAttribute("width", width);
          });
        },
      },
    ],
    columns: [
      {
        data: "codigo_med",
        title: "Código",
        width: "10%",
      },
      {
        data: "descripcion",
        title: "Descripción",
        width: "30%",
        render: function (data) {
          const shortDesc =
            data.length > 30 ? data.substring(0, 30) + "..." : data;
          return `<span title="${data}" data-bs-toggle="tooltip">${shortDesc}</span>`;
        },
      },
      {
        data: "descuadre",
        title: "Descuadre",
        width: "15%",
        className: "text-end",
        render: function (data) {
          return `<span class="${data < 0 ? "text-danger" : "text-success"}">${data}</span>`;
        },
      },
      {
        data: "estado",
        title: "Estado",
        width: "20%",
        render: function (data, type, row) {
          return `<span class="badge" style="background-color: ${row.estado_color || '#6c757d'}">
            ${row.estado || 'Pendiente'}
          </span>`;
        },
      },
      {
        data: "fecha_gestion",
        title: "Última gestión",
        width: "15%",
        render: function (data) {
          return data ? new Date(data).toLocaleString("es-ES") : "N/A";
        },
      },
      {
        data: null,
        title: "Acciones",
        width: "10%",
        orderable: false,
        render: function (data) {
          return `<div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary ver-detalle" 
                    data-codigo="${data.codigo_med}" 
                    title="Ver detalles">
              <i class="bi bi-info-circle"></i>
            </button>
            <button class="btn btn-outline-success gestionar" 
                    data-codigo="${data.codigo_med}" 
                    data-descripcion="${data.descripcion}" 
                    title="Gestionar">
              <i class="bi bi-pencil-square"></i>
            </button>
          </div>`;
        },
      },
    ],
    drawCallback: function () {
      const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      tooltips.forEach((tooltip) => new bootstrap.Tooltip(tooltip));
    },
  };

  // Configuración específica para cada tabla
  const tabsConfig = [
    { id: "tablaPendientes", status: 1, title: "Pendientes" },
    { id: "tablaRegularizar", status: 4, title: "Por Regularizar" },
    { id: "tablaEnProceso", status: 2, title: "En Proceso" },
    { id: "tablaResueltos", status: 3, title: "Resueltos" },
  ];

  // Actualizar el HTML de los tabs primero
  const tabsContainer = document.createElement("div");
  tabsContainer.innerHTML = `
    <div class="filters-section mb-4">
      <div class="row g-3">
        <div class="col-md-4">
          <select class="form-select" id="categoriaFilter">
            <option value="">Filtrar por categoría...</option>
          </select>
        </div>
        <div class="col-md-4">
          <input type="text" class="form-control" id="searchFilter" placeholder="Buscar medicamento...">
        </div>
      </div>
    </div>

    <ul class="nav nav-tabs mb-3" role="tablist">
      ${tabsConfig
        .map(
          (tab, i) => `
        <li class="nav-item" role="presentation">
          <button class="nav-link ${i === 0 ? "active" : ""}" 
                  data-bs-toggle="tab" 
                  data-bs-target="#${tab.id}-tab" 
                  type="button">
            ${tab.title}
            <span class="badge bg-secondary ms-2" id="count-${tab.id}">0</span>
          </button>
        </li>
      `
        )
        .join("")}
    </ul>

    <div class="tab-content">
      ${tabsConfig
        .map(
          (tab, i) => `
        <div class="tab-pane fade ${i === 0 ? "show active" : ""}" 
             id="${tab.id}-tab">
          <div class="table-responsive">
            <table id="${tab.id}" class="table table-striped">
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  document.querySelector(".card-body").appendChild(tabsContainer);

  // Inicializar las tablas después de crear el HTML
  const tables = {};
  tabsConfig.forEach((tab) => {
    tables[tab.id] = $(`#${tab.id}`).DataTable({
      ...configBase,
      ajax: {
        url: "/api/analysis/all",
        dataSrc: function (json) {
          const data = Array.isArray(json) ? json : json.analysis || [];

          // Filtrar por estado
          return data.filter((item) => {
            const estadoActual = (item.estado_gestion || "pendiente").toLowerCase();

            switch (tab.status) {
              case 1: // Pendientes
                return estadoActual === "pendiente" || !item.estado_gestion;
              case 2: // En Proceso
                return estadoActual === "en proceso";
              case 3: // Resueltos
                return estadoActual === "resuelto" || estadoActual === "corregido";
              case 4: // Por Regularizar
                return estadoActual === "regularizar";
              default:
                return false;
            }
          });
        },
      },
    });

    // Actualizar contador cuando la tabla se dibuja
    tables[tab.id].on("draw", function () {
      const count = tables[tab.id].rows().count();
      $(`#count-${tab.id}`).text(count);
      console.log(`Tab ${tab.id}: ${count} registros`);
    });

    // Event handlers para acciones
    $(`#${tab.id}`).on("click", ".ver-detalle", function () {
      const codigo = $(this).data("codigo");
      showMedicineDetails(codigo);
    });

    $(`#${tab.id}`).on("click", ".gestionar", function () {
      const codigo = $(this).data("codigo");
      const descripcion = $(this).data("descripcion");
      gestionarDescuadre(codigo, descripcion, tables);
    });
  });

  // Event listener para filtro de categorías
  const categoriaFilter = document.getElementById("categoriaFilter");
  if (categoriaFilter) {
    categoriaFilter.addEventListener("change", function () {
      const categoria = this.value;
      Object.values(tables).forEach((table) => {
        table.column(3).search(categoria).draw();
      });
    });
  }

  // Añadir búsqueda global
  document.getElementById("searchFilter").addEventListener("input", function (e) {
    const searchTerm = e.target.value;
    Object.values(tables).forEach((table) => {
      table.search(searchTerm).draw();
    });
  });
});

// Función para gestionar descuadre
async function gestionarDescuadre(codigo, descripcion, tables) {
  try {
    // Primero obtener los detalles actuales del medicamento
    const detailsResponse = await fetch(`/api/managed/details/${codigo}`);
    if (!detailsResponse.ok)
      throw new Error("Error al obtener detalles del medicamento");
    const currentDetails = await detailsResponse.json();

    // Luego obtener las listas de estados, categorías y motivos
    const response = await fetch(`/api/analysis/manage/${codigo}`);
    if (!response.ok) throw new Error("Error al obtener datos del medicamento");
    const data = await response.json();

    const result = await Swal.fire({
      title: "Gestionar Medicamento",
      html: `
                <div class="text-start">
                    <h6 class="mb-3">
                        <i class="bi bi-capsule me-2"></i>${descripcion}
                        <br>
                        <small class="text-muted">
                            <i class="bi bi-upc-scan me-2"></i>Código: ${codigo}
                        </small>
                    </h6>
                    <div class="mb-3">
                        <label class="form-label">Estado</label>
                        <select class="form-select" id="estado">
                            ${data.estados
                              .map(
                                (estado) => `
                                <option value="${estado.id_estado}" 
                                    ${
                                      currentDetails.id_estado ===
                                      estado.id_estado
                                        ? "selected"
                                        : ""
                                    }>
                                    ${estado.nombre}
                                </option>
                            `
                              )
                              .join("")}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Categoría</label>
                        <select class="form-select" id="categoria" onchange="actualizarMotivos(this.value)">
                            <option value="">Seleccionar categoría...</option>
                            ${data.categorias
                              .map(
                                (cat) => `
                                <option value="${cat.id_categoria}"
                                    ${
                                      currentDetails.id_categoria ===
                                      cat.id_categoria
                                        ? "selected"
                                        : ""
                                    }>
                                    ${cat.nombre}
                                </option>
                            `
                              )
                              .join("")}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Motivo</label>
                        <select class="form-select" id="motivo" disabled>
                            <option value="">Seleccionar motivo...</option>
                        </select>
                        <div data-motivos='${JSON.stringify(
                          data.motivos
                        )}' style="display:none"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Observaciones</label>
                        <textarea class="form-control" id="observaciones" rows="3">${
                          currentDetails.observaciones || ""
                        }</textarea>
                    </div>
                </div>
            `,
      didOpen: () => {
        const categoriaSelect = document.getElementById("categoria");
        if (categoriaSelect.value) {
          actualizarMotivos(categoriaSelect.value, currentDetails.id_motivo);
        }
      },
      preConfirm: () => {
        const categoria = document.getElementById("categoria").value;
        const motivo = document.getElementById("motivo").value;

        if (!categoria) {
          Swal.showValidationMessage("Debes seleccionar una categoría");
          return false;
        }
        if (!motivo) {
          Swal.showValidationMessage("Debes seleccionar un motivo");
          return false;
        }
        return true;
      },
      confirmButtonText: "Guardar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#00549F",
    });

    if (result.isConfirmed) {
      const gestionData = {
        id_estado: document.getElementById("estado").value,
        id_categoria: document.getElementById("categoria").value,
        id_motivo: document.getElementById("motivo").value,
        observaciones: document.getElementById("observaciones").value,
      };

      const updateResponse = await fetch(`/api/managed/update/${codigo}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gestionData),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || "Error al actualizar");
      }

      await Swal.fire({
        icon: "success",
        title: "Guardado",
        text: "El descuadre ha sido gestionado correctamente",
        timer: 1500,
        showConfirmButton: false,
      });

      setTimeout(() => {
        Object.values(tables).forEach((table) => {
          if (table) {
            table.ajax.reload();
          }
        });
      }, 500);
    }
  } catch (error) {
    console.error("Error:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al gestionar el descuadre: " + error.message,
      confirmButtonColor: "#00549F",
    });
  }
}

// Función compartida para actualizar motivos
function actualizarMotivos(categoriaId, motivoSeleccionado = null) {
  const motivosSelect = document.getElementById("motivo");
  motivosSelect.disabled = true;
  motivosSelect.innerHTML = '<option value="">Seleccionar motivo...</option>';

  if (!categoriaId) {
    return;
  }

  const motivos = Array.from(
    document.querySelectorAll("#swal2-html-container [data-motivos]")
  ).find((el) => el)?.dataset.motivos;

  if (motivos) {
    const motivosData = JSON.parse(motivos);
    const motivosFiltrados = motivosData.filter(
      (m) => m.id_categoria == categoriaId
    );

    motivosFiltrados.forEach((motivo) => {
      const option = document.createElement("option");
      option.value = motivo.id_motivo;
      option.textContent = motivo.nombre;
      if (motivoSeleccionado && motivo.id_motivo == motivoSeleccionado) {
        option.selected = true;
      }
      motivosSelect.appendChild(option);
    });

    motivosSelect.disabled = false;
  }
}

// Función para mostrar detalles
async function showMedicineDetails(codigo) {
  try {
    const response = await fetch(`/api/managed/details/${codigo}`);
    if (!response.ok) throw new Error("Error al obtener detalles");
    const data = await response.json();

    if (!data) throw new Error("No se encontraron detalles");

    Swal.fire({
      title: "Detalles del Medicamento",
      html: `
                <div class="text-start">
                    <h6 class="mb-3">
                        <i class="bi bi-capsule me-2"></i>${data.descripcion}
                        <br>
                        <small class="text-muted">
                            <i class="bi bi-upc-scan me-2"></i>Código: ${codigo}
                        </small>
                    </h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <tbody>
                                <tr>
                                    <th>Estado actual:</th>
                                    <td>
                                        <span class="badge" style="background-color: ${
                                          data.estado_color
                                        }">
                                            ${data.estado || "N/A"}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Categoría:</th>
                                    <td>${data.categoria || "N/A"}</td>
                                </tr>
                                <tr>
                                    <th>Motivo:</th>
                                    <td>${data.motivo || "N/A"}</td>
                                </tr>
                                <tr>
                                    <th>Observaciones:</th>
                                    <td>${
                                      data.observaciones || "Sin observaciones"
                                    }</td>
                                </tr>
                                <tr>
                                    <th>Último descuadre:</th>
                                    <td class="${
                                      data.descuadre < 0
                                        ? "text-danger"
                                        : "text-success"
                                    }">
                                        <strong>${data.descuadre}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Fecha última gestión:</th>
                                    <td>${new Date(
                                      data.fecha_gestion
                                    ).toLocaleString("es-ES")}</td>
                                </tr>
                                <tr>
                                    <th>Gestionado por:</th>
                                    <td>${data.usuario || "N/A"}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
      width: "600px",
      confirmButtonColor: "#00549F",
    });
  } catch (error) {
    console.error("Error:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Error al cargar los detalles",
      confirmButtonColor: "#00549F",
    });
  }
}

// Para actualización de estado
async function actualizarEstado(id, nuevoEstado) {
  try {
    showNotification("info", "Actualizando estado...", "top-center");

    const response = await fetch("/api/managed/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado: nuevoEstado }),
    });

    if (!response.ok) {
      throw new Error("Error al actualizar el estado");
    }

    showNotification("success", "Estado actualizado correctamente");
    // Recargar tabla
    if (dataTable) {
      dataTable.ajax.reload();
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("error", "Error al actualizar el estado");
  }
}

// Cargar categorías para el filtro
async function loadCategorias() {
  try {
    const response = await fetch("/api/managed/categorias");
    if (!response.ok) {
      throw new Error("Error al obtener categorías");
    }
    const data = await response.json();
    const select = document.getElementById("categoriaFilter");

    if (!select) {
      console.error("Elemento categoriaFilter no encontrado");
      return;
    }

    // Limpiar opciones existentes
    select.innerHTML = '<option value="">Todas las categorías</option>';

    // Agregar nuevas opciones
    if (data.categorias && Array.isArray(data.categorias)) {
      data.categorias.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.nombre;
        option.textContent = cat.nombre;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("error", "Error al cargar categorías: " + error.message);
  }
}

// Aplicar filtro por categoría
function aplicarFiltroCategorias() {
  const categoria = document.getElementById("categoriaFilter").value;
  Object.values(tables).forEach((table) => {
    table.column(3).search(categoria).draw();
  });
}
