let dataTable = null;

document.addEventListener("DOMContentLoaded", function () {
  const months = getLastTwelveMonths();
  const analysisMonth = document.getElementById("analysisMonth");

  // Poblar selector de meses primero
  const option = document.createElement("option");
  option.value = "all";
  option.textContent = "Todos los períodos";
  analysisMonth.appendChild(option);

  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month.value;
    option.textContent = month.label;
    analysisMonth.appendChild(option);
  });

  // Definir la función de inicialización
  initializeTable = async function (month, keepFilter = false) {
    try {
      // Guardar el filtro activo actual si keepFilter es true
      let activeFilter = null;
      if (keepFilter && dataTable) {
        activeFilter = $(".filter-buttons .btn.active")
          .attr("class")
          .match(/filter-\w+/)[0];
      }

      const response = await fetch(`/api/analysis/${month}`);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const responseData = await response.json();

      // Destruir tabla existente si existe
      if (dataTable) {
        dataTable.destroy();
        $(".filter-buttons").empty();
      }

      // Función para aplicar filtros
      const applyFilter = (filterFunction) => {
        if (dataTable) {
          dataTable.settings()[0].clearCache = true;
          $.fn.dataTable.ext.search = [filterFunction];
          dataTable.draw();
        }
      };

      // Inicializar nueva tabla
      dataTable = new DataTable("#analysisTable", {
        data: responseData.analysis || [],
        language: dataTableEsES,
        columns: [
          {
            data: "codigo_med",
            title: "Código",
          },
          {
            data: "descripcion",
            title: "Descripción",
            render: function (data, type, row) {
              if (type === "display") {
                let icon = "";
                if (row.tipo_patron === "temporal") {
                  icon = `<i class="bi bi-clock-history text-purple ms-2" 
                                        data-bs-toggle="tooltip" 
                                        data-bs-placement="right" 
                                        title="Este medicamento solo ha aparecido una vez (Temporal)"></i>`;
                } else if (row.tipo_patron === "regular") {
                  icon = `<i class="bi bi-arrow-repeat text-info ms-2" 
                                        data-bs-toggle="tooltip" 
                                        data-bs-placement="right" 
                                        title="Este medicamento mantiene un patrón regular"></i>`;
                } else if (row.tipo_patron === "cambios") {
                  icon = `<i class="bi bi-exclamation-triangle-fill text-warning ms-2" 
                                        data-bs-toggle="tooltip" 
                                        data-bs-placement="right" 
                                        title="Este medicamento presenta cambios significativos"></i>`;
                }
                return `<span>${data}</span>${icon}`;
              }
              return data;
            },
          },
          {
            data: "ultimo_descuadre",
            title: "Diferencia",
            defaultContent: "0",
            className: "text-end",
            render: function (data) {
              const value = data || 0;
              const colorClass = value < 0 ? "text-danger" : "text-success";
              return `<strong class="${colorClass}">${value}</strong>`;
            },
          },
          {
            data: "estado_gestion",
            title: "Estado",
            defaultContent: "Pendiente",
            className: "text-center",
            render: function (data) {
              let badgeClass = "bg-secondary";
              let tooltipText = "";

              switch (data) {
                case "Pendiente":
                  badgeClass = "bg-danger";
                  tooltipText = "Este medicamento está pendiente de gestión";
                  break;
                case "En proceso":
                  badgeClass = "bg-warning";
                  tooltipText = "Este medicamento está siendo gestionado";
                  break;
                case "Corregido":
                  badgeClass = "bg-success";
                  tooltipText = "Este medicamento ha sido corregido";
                  break;
                case "Regularizar":
                  badgeClass = "bg-info";
                  tooltipText =
                    "Este medicamento mantiene un patrón constante de descuadre";
                  break;
                default:
                  badgeClass = "bg-secondary";
                  tooltipText = "Estado no definido";
              }

              return `<span class="badge ${badgeClass}" 
                                                data-bs-toggle="tooltip" 
                                                data-bs-placement="top" 
                                                title="${tooltipText}">${data}</span>`;
            },
          },
          {
            data: null,
            title: "Acciones",
            className: "text-center",
            orderable: false,
            render: function (data) {
              return `
                                                <div class="btn-group">
                                                    <button class="btn btn-primary btn-sm ver-detalle" 
                                                            data-codigo="${data.codigo_med}"
                                                            title="Ver histórico y tendencias">
                                                        <i class="bi bi-graph-up"></i> Ver Detalle
                                                    </button>
                                                    <button class="btn btn-success btn-sm ms-2 gestionar" 
                                                            data-codigo="${data.codigo_med}" 
                                                            data-descripcion="${data.descripcion}"
                                                            title="Gestionar descuadre">
                                                        <i class="bi bi-pencil-square"></i> Gestionar
                                                    </button>
                                                </div>`;
            },
          },
        ],
        order: [[1, "asc"]],
        dom: '<"row mb-3"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"row mb-3"<"col-12 text-center"<"filter-buttons">>><"row"<"col-12"t>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        drawCallback: function () {
          const tooltips = document.querySelectorAll(
            '[data-bs-toggle="tooltip"]'
          );
          tooltips.forEach((tooltip) => {
            new bootstrap.Tooltip(tooltip);
          });
        },
        initComplete: function () {
          const filterButtons = $(".filter-buttons");
          filterButtons.html(`
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-primary filter-all active" 
                                    title="Mostrar todos los registros">
                                <i class="bi bi-grid-3x3"></i> Todos
                            </button>
                            <button type="button" class="btn btn-outline-warning filter-changes" 
                                    title="Mostrar medicamentos que requieren atención inmediata">
                                <i class="bi bi-exclamation-triangle"></i> Cambios significativos
                            </button>
                            <button type="button" class="btn btn-outline-info filter-regular" 
                                    title="Mostrar medicamentos con patrón constante">
                                <i class="bi bi-arrow-repeat"></i> Regularizar
                            </button>
                            <button type="button" class="btn btn-outline-purple filter-temporal" 
                                    title="Mostrar solo descuadres temporales">
                                <i class="bi bi-clock-history"></i> Temporales
                            </button>
                            <button type="button" class="btn btn-outline-danger filter-pending" 
                                    title="Mostrar medicamentos pendientes">
                                <i class="bi bi-exclamation-circle"></i> Pendientes
                            </button>
                        </div>
                    `);

          // Event listeners para los filtros
          $(".filter-all").on("click", function () {
            applyFilter(() => true);
          });

          $(".filter-changes").on("click", function () {
            applyFilter((settings, searchData, index) => {
              const row = dataTable.row(index).data();
              return row && row.tipo_patron === "cambios";
            });
          });

          $(".filter-regular").on("click", function () {
            applyFilter((settings, searchData, index) => {
              const row = dataTable.row(index).data();
              return (
                row &&
                row.tipo_patron === "regular" &&
                row.valores_unicos === 1 &&
                row.total_apariciones >= 2 &&
                row.estado_gestion === "Pendiente"
              );
            });
          });

          $(".filter-temporal").on("click", function () {
            applyFilter((settings, searchData, index) => {
              const row = dataTable.row(index).data();
              return row && row.tipo_patron === "temporal";
            });
          });

          $(".filter-pending").on("click", function () {
            applyFilter((settings, searchData, index) => {
              const row = dataTable.row(index).data();
              return row && row.estado_gestion === "Pendiente";
            });
          });

          // Agregar estados activos a los botones y tooltips
          const filterBtns = $(".filter-buttons button");
          filterBtns.on("click", function () {
            filterBtns.removeClass("active");
            $(this).addClass("active");
          });

          // Inicializar tooltips para los botones
          filterBtns.each(function () {
            new bootstrap.Tooltip(this, {
              placement: "top",
              trigger: "hover",
            });
          });

          // Agregar resumen de estadísticas
          if (dataTable) {
            const data = dataTable.rows().data();
            const stats = {
              total: data.length,
              cambios: data.filter((row) => row.tipo_patron === "cambios")
                .length,
              regulares: data.filter((row) => row.tipo_patron === "regular")
                .length,
              temporales: data.filter((row) => row.tipo_patron === "temporal")
                .length,
              pendientes: data.filter(
                (row) => row.estado_gestion === "Pendiente"
              ).length,
            };

            const statsHtml = `
                            <div class="row mb-4 mt-2">
                                <div class="col">
                                    <div class="card border-0 bg-light">
                                        <div class="card-body p-3">
                                            <div class="row text-center">
                                                <div class="col">
                                                    <h6 class="mb-0 text-muted">Total</h6>
                                                    <h3 class="mb-0">${stats.total}</h3>
                                                </div>
                                                <div class="col">
                                                    <h6 class="mb-0 text-warning">Cambios</h6>
                                                    <h3 class="mb-0">${stats.cambios}</h3>
                                                </div>
                                                <div class="col">
                                                    <h6 class="mb-0 text-info">Regulares</h6>
                                                    <h3 class="mb-0">${stats.regulares}</h3>
                                                </div>
                                                <div class="col">
                                                    <h6 class="mb-0 text-purple">Temporales</h6>
                                                    <h3 class="mb-0">${stats.temporales}</h3>
                                                </div>
                                                <div class="col">
                                                    <h6 class="mb-0 text-danger">Pendientes</h6>
                                                    <h3 class="mb-0">${stats.pendientes}</h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;

            $(statsHtml).insertBefore(dataTable.table().container());
          }

          // Agregar los event listeners después de inicializar la tabla
          $("#analysisTable").on("click", ".ver-detalle", function () {
            const codigo = $(this).data("codigo");
            showMedicineDetails(codigo, month);
          });

          $("#analysisTable").on("click", ".gestionar", async function () {
            const codigo = $(this).data("codigo");
            const descripcion = $(this).data("descripcion");

            try {
              const response = await fetch(`/api/analysis/manage/${codigo}`);
              if (!response.ok)
                throw new Error("Error al obtener datos del medicamento");
              const data = await response.json();

              // Mostrar modal de gestión
              gestionarMedicamento(codigo, descripcion, data);
            } catch (error) {
              showNotification(
                "error",
                "Error al cargar datos del medicamento"
              );
            }
          });

          // Si hay un filtro activo que mantener, reactivarlo
          if (keepFilter && activeFilter) {
            $(`.${activeFilter}`).trigger("click");
          }
        },
      });

      // Inicializar tooltips después de que la tabla esté lista
      $('[data-bs-toggle="tooltip"]').tooltip();
    } catch (error) {
      console.error("Error:", error);
      showNotification("error", `Error al cargar los datos: ${error.message}`);
    }
  };

  // Inicializar tabla con el valor actual del selector
  initializeTable(analysisMonth.value);

  // Evento de cambio de mes
  analysisMonth.addEventListener("change", function () {
    initializeTable(this.value);
  });
});

function getLastTwelveMonths() {
  const months = [];
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = date.toLocaleString("es", { month: "long" });
    const year = date.getFullYear();

    months.push({
      value: `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`,
    });
  }

  return months;
}

// Modificar la función showMedicineDetails para medicamentos con cambios significativos
async function showMedicineDetails(codigo, month) {
  try {
    const response = await fetch(`/api/analysis/detail/${month}/${codigo}`);
    if (!response.ok) {
      showNotification("error", "Error al obtener detalles del medicamento");
      return;
    }

    const data = await response.json();

    // Preparar los datos para la gráfica
    const chartData = data.details.map((detail) => ({
      x: new Date(detail.fecha).getTime(),
      y: detail.descuadre,
      cambio: detail.cambio_tendencia,
    }));

    Swal.fire({
      title: `<i class="bi bi-capsule me-2"></i>${data.medicina.descripcion}`,
      html: `
                <div class="text-start">
                    <div class="text-muted mb-2">
                        <i class="bi bi-upc-scan me-2"></i>Código: ${codigo}
                    </div>
                    <div class="table-responsive mb-4">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th class="text-end">Descuadre</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.details
                                  .map(
                                    (detail) => `
                                    <tr class="${
                                      detail.cambio_tendencia
                                        ? "table-warning"
                                        : ""
                                    }">
                                        <td>
                                            ${
                                              detail.cambio_tendencia
                                                ? '<i class="bi bi-exclamation-triangle-fill text-warning me-2" title="Cambio significativo"></i>'
                                                : '<i class="bi bi-dot me-2"></i>'
                                            }
                                            ${new Date(
                                              detail.fecha
                                            ).toLocaleDateString("es-ES")}
                                        </td>
                                        <td class="text-end ${
                                          detail.descuadre < 0
                                            ? "text-danger"
                                            : "text-success"
                                        }">
                                            <strong>${detail.descuadre}</strong>
                                        </td>
                                    </tr>
                                `
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </div>
                    <div id="descuadresChart" style="height: 300px;"></div>
                </div>
            `,
      width: "600px",
      didOpen: () => {
        // Inicializar gráfica de evolución con diseño mejorado
        const chart = new ApexCharts(
          document.querySelector("#descuadresChart"),
          {
            series: [
              {
                name: "Descuadre",
                data: chartData,
              },
            ],
            chart: {
              type: "line",
              height: 300,
              animations: {
                enabled: true,
                easing: "easeinout",
              },
            },
            markers: {
              size: 6,
              colors: chartData.map((point) =>
                point.cambio ? "#ffc107" : "#00549F"
              ),
              strokeWidth: 0,
            },
            stroke: {
              curve: "smooth",
              width: 3,
            },
            xaxis: {
              type: "datetime",
              labels: {
                datetimeFormatter: {
                  year: "yyyy",
                  month: "MMM yyyy",
                  day: "dd MMM",
                },
              },
            },
            yaxis: {
              title: {
                text: "Unidades",
              },
            },
            tooltip: {
              x: {
                format: "dd MMM yyyy",
              },
              y: {
                title: {
                  formatter: () => "Descuadre:",
                },
              },
            },
            grid: {
              borderColor: "#f1f1f1",
            },
          }
        );

        chart.render();
      },
      confirmButtonColor: "#00549F",
    });
  } catch (error) {
    console.error("Error:", error);
    showNotification("error", "Error al procesar los detalles");
  }
}

// Función para gestionar medicamento
async function gestionarMedicamento(codigo, descripcion, data) {
  try {
    if (!data) {
      const response = await fetch(`/api/analysis/manage/${codigo}`);
      if (!response.ok) {
        throw new Error("Error al obtener datos del medicamento");
      }
      data = await response.json();
    }

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
                      ${data.estados.map(estado => `
                          <option value="${estado.id_estado}"
                              ${data.medicamento?.id_estado === estado.id_estado ? 'selected' : ''}>
                              ${estado.nombre}
                          </option>
                      `).join('')}
                  </select>
              </div>
              <div class="mb-3">
                  <label class="form-label">Categoría</label>
                  <select class="form-select" id="categoria" onchange="actualizarMotivos(this.value)">
                      <option value="">Seleccionar categoría...</option>
                      ${data.categorias.map(cat => `
                          <option value="${cat.id_categoria}"
                              ${data.medicamento?.id_categoria === cat.id_categoria ? 'selected' : ''}>
                              ${cat.nombre}
                          </option>
                      `).join('')}
                  </select>
              </div>
              <div class="mb-3">
                  <label class="form-label">Motivo</label>
                  <select class="form-select" id="motivo" disabled>
                      <option value="">Seleccionar motivo...</option>
                  </select>
                  <div id="motivosData" data-motivos='${JSON.stringify(data.motivos)}' style="display:none"></div>
              </div>
              <div class="mb-3">
                  <label class="form-label">Observaciones</label>
                  <textarea class="form-control" id="observaciones" rows="3">${data.medicamento?.observaciones || ''}</textarea>
              </div>
          </div>
      `,
      didOpen: () => {
          const categoriaSelect = document.getElementById('categoria');
          if (categoriaSelect.value) {
              actualizarMotivos(categoriaSelect.value, data.medicamento?.id_motivo);
          }
      },
      preConfirm: () => {
          const categoria = document.getElementById('categoria').value;
          const motivo = document.getElementById('motivo').value;

          if (!categoria) {
              Swal.showValidationMessage('Debes seleccionar una categoría');
              return false;
          }
          if (!motivo) {
              Swal.showValidationMessage('Debes seleccionar un motivo');
              return false;
          }
          return {
              id_estado: document.getElementById('estado').value,
              id_categoria: categoria,
              id_motivo: motivo,
              observaciones: document.getElementById('observaciones').value
          };
      },
      confirmButtonText: "Guardar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#00549F",
  });

  if (result.isConfirmed) {
    showNotification("info", "Guardando cambios...", "top-center");

    const saveResponse = await fetch(`/api/analysis/update/${codigo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.value),
    });

    const responseData = await saveResponse.json();

    if (!saveResponse.ok) {
      if (responseData.isAlreadyManaged) {
        await Swal.fire({
          icon: "warning",
          title: "Medicamento en gestión",
          text: `Este medicamento está siendo gestionado por ${responseData.managedBy}`,
          confirmButtonColor: "#00549F",
        });
        return;
      }
      throw new Error(responseData.error || "Error al guardar la gestión");
    }

    showNotification("success", "Medicamento gestionado correctamente");

    // Obtener el filtro activo actual
    const activeFilter = $('.filter-buttons .btn.active').attr('class').match(/filter-\w+/)[0];
    
    // Recargar datos manteniendo el estado actual
    try {
        const currentMonth = document.getElementById("analysisMonth").value;
        const response = await fetch(`/api/analysis/${currentMonth}`);
        if (!response.ok) throw new Error("Error al obtener datos actualizados");
        const newData = await response.json();

        // Usar la variable global dataTable
        if (dataTable) {
            dataTable.clear();
            dataTable.rows.add(newData.analysis);
            dataTable.draw();

            // Reactivar el filtro
            if (activeFilter) {
                $(`.${activeFilter}`).trigger('click');
            }

            // Actualizar estadísticas
            const stats = {
                total: newData.analysis.length,
                cambios: newData.analysis.filter(row => row.tipo_patron === 'cambios').length,
                regulares: newData.analysis.filter(row => row.tipo_patron === 'regular').length,
                temporales: newData.analysis.filter(row => row.tipo_patron === 'temporal').length,
                pendientes: newData.analysis.filter(row => row.estado_gestion === 'Pendiente').length
            };

            // Actualizar el panel de estadísticas
            updateStatsPanel(stats);
        }

        // Reinicializar tooltips
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            const bsTooltip = bootstrap.Tooltip.getInstance(tooltip);
            if (bsTooltip) {
                bsTooltip.dispose();
            }
            new bootstrap.Tooltip(tooltip);
        });
    } catch (error) {
        console.error("Error al recargar datos:", error);
        showNotification("error", "Error al actualizar la tabla");
    }
}
} catch (error) {
  console.error("Error:", error);
  showNotification("error", "Error al gestionar el medicamento: " + error.message);
}
}

// Asegurar que el event listener está correctamente configurado
document.addEventListener("DOMContentLoaded", function () {
  // Event listener para el botón gestionar
  $(document).on("click", ".gestionar", function () {
    const codigo = $(this).data("codigo");
    const descripcion = $(this).data("descripcion");
    gestionarMedicamento(codigo, descripcion);
  });
});

// Función para actualizar los motivos según la categoría seleccionada
function actualizarMotivos(categoriaId, motivoSeleccionado = null) {
  const motivosSelect = document.getElementById("motivo");
  motivosSelect.disabled = true;
  motivosSelect.innerHTML = '<option value="">Seleccionar motivo...</option>';

  if (!categoriaId) {
    return;
  }

  const motivosData = document.getElementById("motivosData");
  if (!motivosData) {
    console.error("No se encontró el contenedor de motivos");
    return;
  }

  try {
    const motivos = JSON.parse(motivosData.dataset.motivos);
    const motivosFiltrados = motivos.filter(
      (m) => m.id_categoria == categoriaId
    );

    if (motivosFiltrados.length === 0) {
      console.log("No hay motivos para esta categoría");
      return;
    }

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
  } catch (error) {
    console.error("Error al procesar motivos:", error);
  }
}

// Modificar la función actualizarGestionMedicamento
async function actualizarGestionMedicamento(codigo, datos) {
  try {
    const response = await fetch(`/api/analysis/update/${codigo}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datos),
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.isAlreadyManaged) {
        await Swal.fire({
          icon: "warning",
          title: "Medicamento en gestión",
          text: `Este medicamento está siendo gestionado por ${result.managedBy}`,
          confirmButtonColor: "#00549F",
        });
        return;
      }
      throw new Error(result.error || "Error al actualizar");
    }

    await Swal.fire({
      icon: "success",
      title: "Actualizado",
      text: "Los cambios se han guardado correctamente",
      timer: 1500,
      showConfirmButton: false,
    });

    // Esperar un momento antes de recargar la tabla
    setTimeout(async () => {
      try {
        const currentMonth = document.getElementById("analysisMonth").value;
        const response = await fetch(`/api/analysis/${currentMonth}`);
        if (!response.ok) throw new Error("Error al obtener datos");
        const data = await response.json();

        if (dataTable) {
          dataTable.clear();
          dataTable.rows.add(data.analysis);
          dataTable.draw();
        }

        // Reinicializar tooltips
        const tooltips = document.querySelectorAll(
          '[data-bs-toggle="tooltip"]'
        );
        tooltips.forEach((tooltip) => {
          const bsTooltip = bootstrap.Tooltip.getInstance(tooltip);
          if (bsTooltip) {
            bsTooltip.dispose();
          }
          new bootstrap.Tooltip(tooltip);
        });
      } catch (error) {
        console.error("Error al recargar la tabla:", error);
      }
    }, 500);
  } catch (error) {
    console.error("Error:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message || "Error al actualizar el medicamento",
      confirmButtonColor: "#00549F",
    });
  }
}

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
  aria: {
    sortAscending: ": activar para ordenar ascendentemente",
    sortDescending: ": activar para ordenar descendentemente",
  },
};

// Agregar esta función auxiliar para actualizar el panel de estadísticas
function updateStatsPanel(stats) {
  const statsHtml = `
      <div class="row mb-4 mt-2">
          <div class="col">
              <div class="card border-0 bg-light">
                  <div class="card-body p-3">
                      <div class="row text-center">
                          <div class="col">
                              <h6 class="mb-0 text-muted">Total</h6>
                              <h3 class="mb-0">${stats.total}</h3>
                          </div>
                          <div class="col">
                              <h6 class="mb-0 text-warning">Cambios</h6>
                              <h3 class="mb-0">${stats.cambios}</h3>
                          </div>
                          <div class="col">
                              <h6 class="mb-0 text-info">Regulares</h6>
                              <h3 class="mb-0">${stats.regulares}</h3>
                          </div>
                          <div class="col">
                              <h6 class="mb-0 text-purple">Temporales</h6>
                              <h3 class="mb-0">${stats.temporales}</h3>
                          </div>
                          <div class="col">
                              <h6 class="mb-0 text-danger">Pendientes</h6>
                              <h3 class="mb-0">${stats.pendientes}</h3>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  `;

  // Actualizar el panel de estadísticas
  const oldStats = $('.card.border-0.bg-light').closest('.row');
  oldStats.replaceWith(statsHtml);
}
