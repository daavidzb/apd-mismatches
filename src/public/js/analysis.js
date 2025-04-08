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
              const shortDesc =
                data.length > 35 ? data.substring(0, 35) + "..." : data;
              return `<span class="text-truncate" title="${data}" data-bs-toggle="tooltip">${shortDesc}</span>`;
            },
          },
          {
            data: "ultimo_descuadre",
            title: "Diferencia",
            width: "100px",
            className: "text-end",
            render: function(data) {
              const value = data || 0;
              const colorClass = value < 0 ? "text-danger" : "text-success";
              return `<strong class="${colorClass}">${value}</strong>`;
            }
          },
          {
            data: "estado_gestion",
            title: "Estado",
            width: "130px",
            className: "text-center",
            render: function(data, type, row) {
              let badgeClass = getBadgeClass(data);
              let icon = "";
              let tooltip = "";

              switch(row.tipo_patron) {
                case "regular":
                  tooltip = "Mantiene un patrón constante";
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

              return `
                <div class="d-inline-flex align-items-center">
                  <span class="badge ${badgeClass}" 
                        data-bs-toggle="tooltip"
                        data-bs-placement="left"
                        data-bs-custom-class="custom-tooltip"
                        data-bs-html="true"
                        title="<i class='${icon} me-2'></i>${tooltip}">
                    ${data || 'Pendiente'}
                  </span>
                </div>`;
            }
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
                  row.tiene_cambios_tendencia) // O presenta cambios en su tendencia
              );
            });
          });
          $(".filter-regular").on("click", function () {
            applyFilter((settings, searchData, index) => {
              const row = dataTable.row(index).data();
              return (
                row &&
                (row.tipo_patron === "regular" || // Tiene patrón regular
                  row.estado_gestion === "Regularizar") // O está en estado Regularizar
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

// Modificar la función showMedicineDetails para medicamentos con cambios significativos
async function showMedicineDetails(codigo, month) {
  try {
    const [detailResponse, historyResponse] = await Promise.all([
      fetch(`/api/analysis/detail/${month}/${codigo}`),
      fetch(`/api/analysis/history/${codigo}/${month}`),
    ]);

    const detailData = await detailResponse.json();
    const historyData = await historyResponse.json();

    Swal.fire({
      title: false,
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

        <div class="p-4">
          <ul class="nav nav-tabs mb-3" role="tablist">
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

          <div class="tab-content">
            <!-- Estadísticas Tab -->
            <div class="tab-pane fade show active" id="stats" role="tabpanel">
              <div class="row g-3 mb-4">
                <div class="col-md-3">
                  <div class="card h-100">
                    <div class="card-body text-center">
                      <div class="text-muted small mb-2">Total registros</div>
                      <h3 class="mb-0">${historyData.length}</h3>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card h-100">
                    <div class="card-body text-center">
                      <div class="text-muted small mb-2">Promedio</div>
                      <h3 class="mb-0">${Math.round(
                        historyData.reduce(
                          (acc, curr) => acc + curr.descuadre,
                          0
                        ) / historyData.length
                      )}</h3>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card h-100">
                    <div class="card-body text-center">
                      <div class="text-muted small mb-2">Máx. diferencia</div>
                      <h3 class="mb-0">${Math.max(
                        ...historyData.map((i) => Math.abs(i.descuadre))
                      )}</h3>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card h-100">
                    <div class="card-body text-center">
                      <div class="text-muted small mb-2">Últ. descuadre</div>
                      <h3 class="mb-0 ${
                        historyData[0]?.descuadre > 0
                          ? "text-success"
                          : "text-danger"
                      }">
                        ${historyData[0]?.descuadre || 0}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
              
              <div id="evolutionChart"></div>
            </div>

            <!-- Histórico Tab -->
            <div class="tab-pane fade" id="history" role="tabpanel">
              <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-sm table-hover">
                  <thead class="sticky-top bg-white">
                    <tr>
                      <th>Fecha</th>
                      <th class="text-center">Diferencia</th>
                      <th>Estado</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${historyData
                      .map(
                        (item) => `
                      <tr>
                        <td>${new Date(
                          item.fecha_reporte
                        ).toLocaleDateString()}</td>
                        <td class="text-center">
                          <span class="${
                            item.descuadre > 0 ? "text-success" : "text-danger"
                          }">
                            <strong>${item.descuadre}</strong>
                          </span>
                          ${
                            item.hasChange
                              ? `
                            <i class="bi bi-arrow-${
                              item.change > 0 ? "up" : "down"
                            } text-${
                                  item.change > 0 ? "success" : "danger"
                                } ms-1" 
                               data-bs-toggle="tooltip" 
                               title="Cambio: ${item.change}"></i>
                          `
                              : ""
                          }
                        </td>
                        <td>
                          <span class="badge ${getBadgeClass(item.estado)}">
                            ${item.estado || "Pendiente"}
                          </span>
                        </td>
                        <td class="text-wrap">${item.observaciones || "-"}</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>`,
      width: "900px",
      padding: 0,
      customClass: {
        container: "modal-backdrop-fix",
        popup: "modal-content-scrollable",
      },
      confirmButtonText: "Cerrar",
      confirmButtonColor: "#00549F",
    });

    // Inicializar tooltips y gráfico después de que el modal esté visible
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach((t) => new bootstrap.Tooltip(t));

    new ApexCharts(document.querySelector("#evolutionChart"), {
      series: [
        {
          name: "Diferencia",
          data: historyData.map((item) => ({
            x: new Date(item.fecha_reporte).getTime(),
            y: item.descuadre,
          })),
        },
      ],
      chart: {
        type: "line",
        height: 300,
        toolbar: { show: true },
        animations: { enabled: true },
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      markers: { size: 4 },
      xaxis: {
        type: "datetime",
        labels: { format: "dd/MM/yy" },
      },
      yaxis: {
        title: { text: "Diferencia" },
      },
      tooltip: {
        x: { format: "dd MMM yyyy" },
      },
      colors: ["#00549F"],
    }).render();
  } catch (error) {
    console.error("Error:", error);
    showNotification("error", "No se pudieron cargar los detalles");
  }
}

function getBadgeClass(estado) {
  switch (estado?.toLowerCase()) {
    case "resuelto":
    case "corregido":
      return "bg-success"; // Verde
    case "en proceso":
      return "bg-warning"; // Amarillo
    case "regularizar":
      return "bg-info"; // Azul info
    case "pendiente":
      return "bg-secondary"; // Gris
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

    console.log("Resultado del modal:", result);

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

      // Recargar tabla manteniendo filtro
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
  const oldStats = $(".card.border-0.bg-light").closest(".row");
  oldStats.replaceWith(statsHtml);
}
