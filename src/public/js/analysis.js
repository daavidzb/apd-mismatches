let dataTable = null;

document.addEventListener("DOMContentLoaded", function () {
  const months = getLastTwelveMonths();
  const analysisMonth = document.getElementById("analysisMonth");

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

  initializeTable = async function (month, keepFilter = false) {
    try {
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

      if (dataTable) {
        dataTable.destroy();
        $(".filter-buttons").empty();
      }

      const applyFilter = (filterFunction) => {
        if (dataTable) {
          dataTable.settings()[0].clearCache = true;
          $.fn.dataTable.ext.search = [filterFunction];
          dataTable.draw();
        }
      };

      // Remover tooltips innecesarios
      dataTable = new DataTable("#analysisTable", {
        data: responseData.analysis || [],
        language: dataTableEsES,
        columns: [
          {
            data: "fecha_ultimo_reporte",
            title: "Fecha",
            width: "100px",
            render: function (data) {
              return new Date(data).toLocaleDateString();
            },
          },
          {
            data: "codigo_med",
            title: "Código",
            width: "90px",
          },
          {
            data: "descripcion",
            title: "Descripción",
            width: "300px",
            render: function (data) {
              return `<span class="text-truncate">${data}</span>`;
            },
          },
          {
            data: "ultimo_descuadre",
            title: "Diferencia",
            width: "100px",
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
            width: "130px",
            className: "text-center",
            render: function (data, type, row) {
              console.log("Estado actual:", data);
              console.log("Datos completos de la fila:", row);
              
              let badgeClass = getBadgeClass(data);
              let icon = "";
              let tooltip = "";
            
              // Si hay un estado de gestión, úsalo
              if (data && data !== 'Pendiente') {
                console.log("Entrando en estado de gestión:", data.toLowerCase());
                switch(data.toLowerCase()) {
                  case 'regularizar':
                    icon = "bi bi-arrow-repeat";
                    tooltip = "Medicamento marcado para regularizar";
                    badgeClass = "bg-info";
                    break;
                  case 'corregido':
                    icon = "bi bi-check-circle";
                    tooltip = "Medicamento corregido";
                    badgeClass = "bg-success";
                    break;
                  case 'en proceso':
                    icon = "bi bi-hourglass-split";
                    tooltip = "En proceso de gestión";
                    badgeClass = "bg-warning";
                    break;
                }
              } else {
                // Si no hay estado, mostrar el patrón
                switch (row.tipo_patron) {
                  case "regular":
                    tooltip = "Mantiene un patrón constante - Considerar regularizar";
                    icon = "bi bi-arrow-repeat";
                    break;
                  case "temporal":
                    tooltip = "Descuadre temporal - Puede resolverse solo";
                    icon = "bi bi-clock-history";
                    break;
                  case "cambios":
                    tooltip = "Presenta cambios significativos - Requiere revisión";
                    icon = "bi bi-exclamation-triangle";
                    break;
                }
              }

              return `
                <div class="d-inline-flex align-items-center">
                  <span class="badge ${badgeClass}" 
                        data-bs-toggle="tooltip"
                        data-bs-placement="left"
                        data-bs-custom-class="custom-tooltip"
                        data-bs-html="true"
                        title="<i class='${icon} me-2'></i>${tooltip}">
                    ${data || "Pendiente"}
                  </span>
                </div>`;
            },
          },
          {
            data: null,
            title: "Acciones",
            width: "100px",
            className: "text-center",
            orderable: false,
            render: function (data) {
              return `
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary btn-sm ver-detalle" 
                          data-codigo="${data.codigo_med}"
                          title="Ver histórico">
                    <i class="bi bi-graph-up"></i>
                  </button>
                  <button class="btn btn-outline-success btn-sm gestionar" 
                          data-codigo="${data.codigo_med}" 
                          data-descripcion="${data.descripcion}"
                          title="Gestionar">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                </div>`;
            },
          },
        ],
        order: [[0, "desc"]], // Ordenar por fecha descendente
        dom: `
              <"row mb-3"
                <"col-sm-12 col-md-4"l>
                <"col-sm-12 col-md-4 text-center"<"month-filter">>
                <"col-sm-12 col-md-4"f>
              >
              <"row mb-3"
                <"col-12 text-center"<"filter-buttons">>
              >
              <"row"<"col-12"t>>
              <"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>
            `,
        drawCallback: function () {
          $('[data-bs-toggle="tooltip"]').tooltip("dispose");

          $('[data-bs-toggle="tooltip"]').tooltip({
            container: "body",
            html: true,
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

          $(".filter-all").on("click", function () {
            applyFilter(() => true);
          });

          $(".filter-changes").on("click", function () {
            applyFilter((settings, searchData, index) => {
              const row = dataTable.row(index).data();
              // Mostrar descuadres con cambios significativos sin importar su estado
              return (
                row &&
                (row.tipo_patron === "cambios" || // Tiene cambios significativos
                  row.tiene_cambios_tendencia) // o presenta cambios en su tendencia
              );
            });
          });
          $(".filter-regular").on("click", function () {
            applyFilter((settings, searchData, index) => {
              const row = dataTable.row(index).data();
              return (
                row &&
                (row.tipo_patron === "regular" || // Tiene patrón regular
                 row.estado_gestion === "Regularizar") // está en estado Regularizar
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

          const filterBtns = $(".filter-buttons button");
          filterBtns.on("click", function () {
            filterBtns.removeClass("active");
            $(this).addClass("active");
          });

          filterBtns.each(function () {
            new bootstrap.Tooltip(this, {
              placement: "top",
              trigger: "hover",
            });
          });

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
              gestionarMedicamento(codigo, descripcion, data);
            } catch (error) {
              showNotification(
                "error",
                "Error al cargar datos del medicamento"
              );
            }
          });
          if (keepFilter && activeFilter) {
            $(`.${activeFilter}`).trigger("click");
          }
        },
      });
      $('[data-bs-toggle="tooltip"]').tooltip();
    } catch (error) {
      console.error("Error:", error);
      showNotification("error", `Error al cargar los datos: ${error.message}`);
    }
  };

  initializeTable(analysisMonth.value);
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

async function showMedicineDetails(codigo, month) {
  try {
    Swal.fire({
      title: "Cargando...",
      html: `
        <div class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    const [detailResponse, historyResponse] = await Promise.all([
      fetch(`/api/analysis/detail/${month}/${codigo}`),
      fetch(`/api/analysis/history/${codigo}/${month}`),
    ]);

    if (!detailResponse.ok || !historyResponse.ok) {
      throw new Error("Error al obtener los datos");
    }

    const detailData = await detailResponse.json();
    const historyData = await historyResponse.json();

    const chartData = historyData.map((item) => ({
      x: new Date(item.fecha_reporte).getTime(),
      y: item.descuadre,
    }));

    const stats = {
      totalRegistros: historyData.length,
      cambiosGestion: historyData.filter(
        (item, i, arr) =>
          i > 0 && item.estado !== arr[i - 1].estado && item.estado !== null
      ).length,
      esRegularizable:
        historyData.length > 1 &&
        historyData.every(
          (item, i, arr) => i === 0 || item.descuadre === arr[i - 1].descuadre
        ),
      esTemporal: historyData.length === 1,
      ultimoDescuadre: historyData[0]?.descuadre || 0,
      maxDescuadre: Math.max(
        ...historyData.map((item) => Math.abs(item.descuadre))
      ),
      minDescuadre: Math.min(
        ...historyData.map((item) => Math.abs(item.descuadre))
      ),
      promDescuadre: (
        historyData.reduce((sum, item) => sum + item.descuadre, 0) /
        historyData.length
      ).toFixed(2),
      totalGestiones: historyData.filter((item) => item.estado !== null).length,
      cambiosEstado: historyData.filter(
        (item, i, arr) => i > 0 && item.estado !== arr[i - 1].estado
      ).length,
      diasConDescuadre: historyData.length,
    };

    const statsCards = `
  <div class="row g-3">
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-body">
          <h6 class="card-title mb-3">Estado Actual</h6>
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-muted">Apariciones:</span>
            <strong>${stats.totalRegistros} ${
      stats.totalRegistros === 1 ? "vez" : "veces"
    }</strong>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <span class="text-muted">Cambios de estado:</span>
            <strong>${stats.cambiosGestion}</strong>
          </div>
        </div>
      </div>
    </div>
    
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-body">
          <h6 class="card-title mb-3">Análisis de Tendencia</h6>
          ${
            stats.esTemporal
              ? `
            <div class="alert alert-info mb-0">
              <i class="bi bi-info-circle me-2"></i>
              <small>Este medicamento solo ha aparecido una vez, podría ser temporal</small>
            </div>
          `
              : stats.esRegularizable
              ? `
            <div class="alert alert-warning mb-0">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <small>Mantiene un patrón constante, considerar regularizar</small>
            </div>
          `
              : detailData.analisis.tiene_cambios_significativos
              ? `
            <div class="alert alert-danger mb-0">
              <i class="bi bi-graph-up-arrow me-2"></i>
              <small>Presenta cambios significativos que requieren atención</small>
            </div>
          `
              : `
            <div class="alert alert-success mb-0">
              <i class="bi bi-check-circle me-2"></i>
              <small>No presenta cambios significativos</small>
            </div>
          `
          }
        </div>
      </div>
    </div>
  </div>`;

    await Swal.fire({
      title: false,
      width: "900px",
      customClass: {
        container: "modal-backdrop-fix",
        popup: "modal-content-scrollable",
      },
      html: `
        <div class="modal-header border-bottom">
          <div class="d-flex align-items-center w-100">
            <div class="bg-light rounded-circle p-3 me-3">
              <i class="bi bi-capsule fs-4 text-primary"></i>
            </div>
            <div class="flex-grow-1">
              <h4 class="mb-1 text-dark">${detailData.medicina.descripcion}</h4>
              <div class="badge bg-light text-dark fs-6">
                <i class="bi bi-upc-scan me-2"></i>${
                  detailData.medicina.codigo_med
                }
              </div>
            </div>
          </div>
        </div>

        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item">
            <a class="nav-link active" data-bs-toggle="tab" href="#stats" role="tab">
              <i class="bi bi-graph-up me-2"></i>Estadísticas
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" data-bs-toggle="tab" href="#history" role="tab">
              <i class="bi bi-clock-history me-2"></i>Histórico
            </a>
          </li>
        </ul>

        <div class="tab-content p-3">
          <div class="tab-pane fade show active" id="stats" role="tabpanel">
            <div id="evolutionChart" class="mb-6"></div>
            <div class="row g-3">
              <!-- Stats Cards -->
              <div class="col-md-6">
                <div class="card h-100">
                  <div class="card-body">
                    <h6 class="card-title mb-3">Resumen de Gestión</h6>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="text-muted">Cambios de estado:</span>
                      <strong>${stats.cambiosEstado}</strong>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="text-muted">Días con descuadre:</span>
                      <strong>${stats.diasConDescuadre}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card h-100">
                  <div class="card-body">
                    <h6 class="card-title mb-3">Análisis de Tendencia</h6>
                    <p class="mb-2">
                      ${
                        detailData.analisis.tiene_cambios_significativos
                          ? '<span class="text-warning"><i class="bi bi-exclamation-triangle me-2"></i>Presenta cambios significativos</span>'
                          : '<span class="text-success"><i class="bi bi-check-circle me-2"></i>Patrón estable</span>'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="tab-pane fade" id="history" role="tabpanel">
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="sticky-top bg-white">
                  <tr>
                    <th>Fecha</th>
                    <th class="text-end">Diferencia</th>
                    <th>Estado</th>
                    <th>Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  ${historyData
                    .map((item, index) => {
                      const prevItem =
                        index > 0 ? historyData[index - 1] : null;
                      const cambio = prevItem
                        ? item.descuadre - prevItem.descuadre
                        : 0;
                      const hayCambio = prevItem && Math.abs(cambio) > 0;

                      return `
                      <tr ${hayCambio ? 'class="table-warning"' : ""}>
                        <td>${new Date(
                          item.fecha_reporte
                        ).toLocaleDateString()}</td>
                        <td class="text-end ${
                          item.descuadre > 0 ? "text-success" : "text-danger"
                        }">
                          <strong>${item.descuadre}</strong>
                        </td>
                        <td>
                          ${
                            item.estado
                              ? `<span class="badge ${getBadgeClass(
                                  item.estado
                                )}">${item.estado}</span>`
                              : '<span class="badge bg-secondary">Pendiente</span>'
                          }
                        </td>
                        <td>
                          ${
                            hayCambio
                              ? `
                              <small class="${
                                cambio > 0 ? "text-success" : "text-danger"
                              }">
                                <i class="bi bi-arrow-${
                                  cambio > 0 ? "up" : "down"
                                }"></i>
                                ${Math.abs(cambio)}
                              </small>
                            `
                              : ""
                          }
                        </td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: "Cerrar",
      confirmButtonColor: "#00549F",
      didOpen: () => {
        // Inicializar gráfico
        const options = {
          series: [
            {
              name: "Descuadre",
              data: chartData,
            },
          ],
          chart: {
            type: "line",
            height: 350,
            toolbar: {
              show: true,
            },
            zoom: {
              enabled: true,
            },
          },
          xaxis: {
            type: "datetime",
            labels: {
              datetimeFormatter: {
                year: "yyyy",
                month: "MMM 'yy",
                day: "dd MMM",
                hour: "HH:mm",
              },
            },
          },
          yaxis: {
            title: {
              text: "Diferencia",
            },
          },
          tooltip: {
            x: {
              format: "dd/MM/yy",
            },
          },
          markers: {
            size: 5,
          },
        };

        new ApexCharts(
          document.querySelector("#evolutionChart"),
          options
        ).render();
      },
    });
  } catch (error) {
    console.error("Error:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudieron cargar los detalles",
      confirmButtonColor: "#00549F",
    });
  }
}

function getBadgeClass(estado) {
  switch (estado?.toLowerCase()) {
    case "resuelto":
    case "corregido":
      return "bg-success";
    case "en proceso":
      return "bg-warning";
    case "regularizar":
      return "bg-info"; // Asegurarnos que este caso esté bien definido
    case "pendiente":
      return "bg-secondary";
    default:
      return "bg-secondary";
  }
}

// Función para gestionar medicamento
async function gestionarMedicamento(codigo, descripcion, data) {
  try {
    console.log("Iniciando gestión para:", codigo, descripcion);

    if (!data) {
      const response = await fetch(`/api/analysis/manage/${codigo}`);
      if (!response.ok)
        throw new Error("Error al obtener datos del medicamento");
      data = await response.json();
      console.log("Datos obtenidos:", data);
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
              <option value="">Seleccionar estado...</option>
              ${data.estados
                .map(
                  (estado) => `
                <option value="${estado.id_estado}">${estado.nombre}</option>
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
                  (categoria) => `
                <option value="${categoria.id_categoria}">${categoria.nombre}</option>
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
          </div>
          <div class="mb-3">
            <label class="form-label">Observaciones</label>
            <textarea class="form-control" id="observaciones" rows="3"></textarea>
          </div>
          <div id="motivosData" data-motivos='${JSON.stringify(
            data.motivos
          )}'></div>
        </div>`,
      confirmButtonText: "Guardar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#00549F",
      preConfirm: () => {
        const estado = document.getElementById("estado").value;
        const categoria = document.getElementById("categoria").value;
        const motivo = document.getElementById("motivo").value;
        const observaciones = document.getElementById("observaciones").value;

        if (!estado || !categoria || !motivo) {
          Swal.showValidationMessage("Por favor complete todos los campos");
          return false;
        }

        return {
          id_estado: estado,
          id_categoria: categoria,
          id_motivo: motivo,
          observaciones: observaciones,
        };
      },
    });

    // console.log("Resultado del modal:", result);

    if (result.isConfirmed && result.value) {
      console.log("Datos a enviar:", result.value);

      const saveResponse = await fetch(`/api/analysis/manage/${codigo}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.value),
      });

      console.log("Respuesta del servidor:", saveResponse);
      const responseData = await saveResponse.json();
      console.log("Datos de respuesta:", responseData);

      if (!saveResponse.ok) {
        if (responseData.isAlreadyManaged) {
          showNotification(
            "warning",
            `${descripcion.split(" ")[0]} está siendo gestionado por ${
              responseData.managedBy
            }`,
            "top-end"
          );
          return;
        }
        throw new Error(responseData.error || "Error al guardar la gestión");
      }

      const currentMonth = document.getElementById("analysisMonth").value;
      const tableResponse = await fetch(`/api/analysis/${currentMonth}`);
      const tableData = await tableResponse.json();

      if (dataTable) {
        console.log("Actualizando DataTable...");
        dataTable.clear();
        dataTable.rows.add(tableData.analysis);
        dataTable.draw();
      }

      showNotification(
        "success",
        `El medicamento ${
          descripcion.split(" ")[0]
        } ha sido actualizado correctamente`,
        "top-end"
      );
    }
  } catch (error) {
    console.error("Error detallado:", error);
    showNotification(
      "error",
      `Error al gestionar ${descripcion.split(" ")[0]}: ${error.message}`,
      "top-end"
    );
  }
}

document.addEventListener("DOMContentLoaded", function () {
  $(document).on("click", ".gestionar", function () {
    const codigo = $(this).data("codigo");
    const descripcion = $(this).data("descripcion");
    gestionarMedicamento(codigo, descripcion);
  });
});

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

async function actualizarGestionMedicamento(codigo, datos) {
  try {
    // Mostrar loader mientras se procesa
    Swal.fire({
      title: "Actualizando...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

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

    // Forzar recarga de datos con el estado actualizado
    const currentMonth = document.getElementById("analysisMonth").value;
    const freshData = await fetch(`/api/analysis/${currentMonth}`);
    const tableData = await freshData.json();

    if (dataTable) {
      // Destruir la tabla existente
      dataTable.destroy();
      $('#analysisTable tbody').empty();
      
      // Recrear la tabla con los datos actualizados
      dataTable = $('#analysisTable').DataTable({
        data: tableData.analysis,
        columns: [/* tu configuración de columnas */],
        language: dataTableEsES,
        // ... resto de la configuración
      });

      // Reinicializar tooltips
      $('[data-bs-toggle="tooltip"]').tooltip('dispose');
      $('[data-bs-toggle="tooltip"]').tooltip({
        container: 'body',
        html: true
      });

      // Reactivar el filtro actual
      const activeFilter = $('.filter-buttons .btn.active').attr('class').match(/filter-\w+/)[0];
      if (activeFilter) {
        $(`.${activeFilter}`).trigger('click');
      }
    }

    // Mostrar notificación de éxito
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
      customClass: {
        popup: "swal2-toast-custom",
        title: "swal2-toast-title",
        icon: "swal2-toast-icon",
      },
    });

    await Toast.fire({
      icon: "success",
      title: "Cambios guardados correctamente",
    });
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

async function actualizarGestionMedicamento(codigo, datos) {
  try {
    // Mostrar loader mientras se procesa
    Swal.fire({
      title: "Actualizando...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

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

    // Forzar recarga de datos con el estado actualizado
    const currentMonth = document.getElementById("analysisMonth").value;
    const freshData = await fetch(`/api/analysis/${currentMonth}`);
    const tableData = await freshData.json();

    console.log("Datos frescos recibidos:", tableData);

    if (dataTable) {
      console.log("Estado antes de actualizar:", dataTable.rows().data());
      
      // Destruir y recrear completamente
      dataTable.destroy();
      $('#analysisTable tbody').empty();
      
      dataTable = $('#analysisTable').DataTable({
        data: tableData.analysis,
        columns: [/* tu configuración de columnas */],
        language: dataTableEsES,
      });

      console.log("Estado después de actualizar:", dataTable.rows().data());

      // Reactivar el filtro actual si existe
      const activeFilter = $('.filter-buttons .btn.active').attr('class')?.match(/filter-\w+/)?.[0];
      if (activeFilter) {
        console.log("Reactivando filtro:", activeFilter);
        $(`.${activeFilter}`).trigger('click');
      }
    }
  } catch (error) {
    console.error("Error en actualización:", error);
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

  const oldStats = $(".card.border-0.bg-light").closest(".row");
  oldStats.replaceWith(statsHtml);
}

function verifyMedicineState(codigo) {
  return fetch(`/api/analysis/detail/${codigo}`)
    .then(res => res.json())
    .then(data => {
      console.log("Estado actual del medicamento:", {
        codigo,
        estado: data.estado_gestion,
        ultimaGestion: data.ultima_gestion
      });
      return data;
    });
}