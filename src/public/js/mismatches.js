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

document.addEventListener("DOMContentLoaded", function () {
  // Inicializar DataTable
  const table = $("#descuadresTable").DataTable({
    language: dataTableEsES,
    order: [[0, "desc"]], // Ordenar por fecha descendente
    pageLength: 25,
    columnDefs: [
      { width: "130px", targets: 0 }, // Fecha
      { width: "100px", targets: 1 }, // Código
      { width: "300px", targets: 2 }, // Descripción
      { width: "100px", targets: 3 }, // Diferencia
      { width: "120px", targets: 4 }, // Estado
      { width: "80px", targets: 5 }, // Acciones
    ],
    dom:
      '<"row mb-3"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
      '<"row"<"col-sm-12"tr>>' +
      '<"row mt-3"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
    drawCallback: function () {
      // Reinicializar tooltips después de cada redibujado de la tabla
      const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
      tooltips.forEach((tooltip) => new bootstrap.Tooltip(tooltip));
    },
  });

  // Usar delegación de eventos en el contenedor de la tabla
  $("#descuadresTable").on("click", ".view-history", async function () {
    try {
      // Mostrar loader mientras carga
      Swal.fire({
        title: "Cargando historial...",
        didOpen: () => {
          Swal.showLoading();
        },
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
      });

      const code = this.dataset.code;
      const description = this.dataset.description;

      const response = await fetch(`/api/mismatches/history/${code}`);
      if (!response.ok) throw new Error("Error al obtener el historial");

      const historyData = await response.json();

      // Ordenar datos por fecha
      historyData.sort(
        (a, b) => new Date(a.fecha_reporte) - new Date(b.fecha_reporte)
      );

      // Preparar datos para el gráfico
      const chartData = historyData.map((item) => ({
        x: new Date(item.fecha_reporte).getTime(),
        farmaTool: item.cantidad_farmatools,
        apd: item.cantidad_armario_apd,
        descuadre: item.descuadre, // Asegurarnos de mapear el descuadre correctamente
      }));

      // Cerrar loader y mostrar modal con datos
      await Swal.fire({
        title: `Historial - ${description}`,
        html: `
          <div class="text-start">
            <div id="historyChart" class="mb-4"></div>
            <div class="table-responsive" style="max-height: 400px;">
              <table class="table table-sm table-hover">
                <thead class="sticky-top bg-white">
                  <tr>
                    <th style="min-width: 100px;">Fecha</th>
                    <th class="text-end" style="min-width: 100px;">FarmaTools</th>
                    <th class="text-end" style="min-width: 100px;">APD</th>
                    <th class="text-end" style="min-width: 100px;">Diferencia</th>
                    <th style="min-width: 120px;">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${historyData
                    .map(
                      (item) => `
                    <tr ${item.hasChange ? 'class="table-warning"' : ""}>
                      <td>
                        ${new Date(item.fecha_reporte).toLocaleDateString()}
                        ${
                          item.hasChange
                            ? `
                          <i class="bi bi-exclamation-triangle-fill text-warning ms-2" 
                             data-bs-toggle="tooltip" 
                             title="Cambio: ${item.change > 0 ? "+" : ""}${
                                item.change
                              }">
                          </i>`
                            : ""
                        }
                      </td>
                      <td class="text-end">${item.cantidad_farmatools}</td>
                      <td class="text-end">${item.cantidad_armario_apd}</td>
                      <td class="text-end ${
                        item.descuadre > 0 ? "text-success" : "text-danger"
                      }">
                        <strong>${item.descuadre}</strong>
                      </td>
                      <td>
                        ${
                          item.estado
                            ? `
                          <span class="badge ${getBadgeClass(item.estado)}">
                            ${item.estado}
                          </span>`
                            : '<span class="badge bg-secondary">Pendiente</span>'
                        }
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>`,
        width: "900px",
        confirmButtonText: "Cerrar",
        confirmButtonColor: "#00549F",
        didRender: () => {
          // Actualizar la configuración del gráfico
          new ApexCharts(document.querySelector("#historyChart"), {
            series: [
              {
                name: "FarmaTools",
                type: "line",
                data: chartData.map((d) => ({ x: d.x, y: d.farmaTool })),
              },
              {
                name: "APD",
                type: "line",
                data: chartData.map((d) => ({ x: d.x, y: d.apd })),
              },
              {
                name: "Diferencia",
                type: "line",
                data: chartData.map((d) => ({ x: d.x, y: d.descuadre })), // Usar d.descuadre
              },
            ],
            chart: {
              height: 350,
              type: "line",
              zoom: { enabled: true },
            },
            stroke: {
              width: [2, 2, 3],
              curve: "smooth",
              dashArray: [0, 0, 0],
            },
            xaxis: {
              type: "datetime",
              labels: {
                datetimeUTC: false,
                format: "dd/MM/yy",
              },
            },
            yaxis: {
              title: {
                text: "Cantidad",
              },
            },
            colors: ["#00549F", "#28a745", "#dc3545"],
            markers: {
              size: [4, 4, 6],
              hover: {
                size: 8,
              },
            },
            tooltip: {
              shared: true,
              intersect: false,
              y: {
                formatter: function (value, { seriesIndex }) {
                  if (seriesIndex === 2) {
                    const color = value < 0 ? "text-danger" : "text-success";
                    return `<span class="${color}">${value}</span>`;
                  }
                  return value;
                },
              },
            },
            legend: {
              position: "top",
              horizontalAlign: "left",
            },
          }).render();

          // Inicializar tooltips
          const tooltips = document.querySelectorAll(
            '[data-bs-toggle="tooltip"]'
          );
          tooltips.forEach((tooltip) => new bootstrap.Tooltip(tooltip));
        },
      });
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el historial",
        confirmButtonColor: "#00549F",
      });
    }
  });
});

function getBadgeClass(estado) {
  switch (estado?.toLowerCase()) {
    case "resuelto":
    case "corregido":
      return "bg-success"; // Verde
    case "en proceso":
      return "bg-warning"; // Amarillo
    case "regularizar":
      return "bg-purple"; // Morado para regularizar
    case "temporal":
      return "bg-info"; // Azul claro
    case "pendiente":
      return "bg-secondary"; // Gris
    default:
      return "bg-secondary";
  }
}
