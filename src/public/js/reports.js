document.addEventListener("DOMContentLoaded", function () {
  const months = getLastTwelveMonths();
  populateMonthSelectors(months);

  const categoriesMonth = document.querySelector("#categoriesMonth");
  if (categoriesMonth) {
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Todos los períodos";
    categoriesMonth.appendChild(allOption);

    months.forEach((month) => {
      const option = new Option(month.label, month.value);
      categoriesMonth.add(option);
    });
  }

  initializeSummaryChart();
  loadTopMedicines();
  initializeEvolutionChart();
  initializeCompareChart();
  loadCategoriesReport();
});

function getLastTwelveMonths() {
  const months = [];
  const date = new Date();
  for (let i = 0; i < 12; i++) {
    const month = date.getMonth() - i;
    const year = date.getFullYear() - (month < 0 ? 1 : 0);
    const adjustedMonth = month < 0 ? 12 + month : month;
    months.push({
      value: `${year}-${String(adjustedMonth + 1).padStart(2, "0")}`,
      label: new Date(year, adjustedMonth).toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      }),
    });
  }
  return months;
}

function populateMonthSelectors(months) {
    const selectors = [
        "#summaryMonth",
        "#topMedsMonth",
        "#compareMonth1",
        "#compareMonth2"
    ];

    selectors.forEach((selector) => {
        const select = document.querySelector(selector);
        if (select) {
            // Agregar opción "Todos los períodos" (excepto para los selectores de comparación)
            if (!selector.includes('compare')) {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'Todos los períodos';
                select.appendChild(allOption);
            }

            // Agregar los meses
            months.forEach((month) => {
                const option = new Option(month.label, month.value);
                select.add(option);
            });
        }
    });
}

async function initializeSummaryChart() {
    const summaryMonth = document.querySelector("#summaryMonth");
    let chart = null;

    summaryMonth.addEventListener("change", async () => {
        try {
            const response = await fetch(`/api/reports/month/${summaryMonth.value}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Verificar que data tenga las propiedades necesarias
            if (!data) {
                throw new Error('No se recibieron datos del servidor');
            }

            const options = {
                series: [{
                    name: "Descuadres",
                    data: [
                        { x: "Pendientes", y: data.pendientes || 0 },
                        { x: "En Proceso", y: data.en_proceso || 0 },
                        { x: "Resueltos", y: data.resueltos || 0 }
                    ]
                }],
                chart: {
                    type: "bar",
                    height: 350
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                        distributed: true,
                        barHeight: "50%",
                        dataLabels: {
                            position: 'bottom'
                        }
                    }
                },
                colors: ['#dc3545', '#ffc107', '#198754'],
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val;
                    },
                    textAnchor: 'start',
                    offsetX: 0
                },
                xaxis: {
                    categories: ["Pendientes", "En Proceso", "Resueltos"],
                    labels: {
                        formatter: function(val) {
                            return Math.round(val);
                        }
                    }
                },
                yaxis: {
                    title: {
                        text: "Estado"
                    }
                },
                title: {
                    text: `Resumen de Descuadres - ${summaryMonth.value === 'all' ? 
                        'Todos los períodos' : 
                        new Date(summaryMonth.value + "-01").toLocaleDateString("es-ES", {
                            month: "long",
                            year: "numeric"
                        })}`,
                    align: "left"
                }
            };

            if (chart) {
                chart.destroy();
            }

            chart = new ApexCharts(document.querySelector("#summaryChart"), options);
            await chart.render();
        } catch (error) {
            console.error("Error:", error);
            const container = document.querySelector("#summaryChart");
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error al cargar el resumen mensual: ${error.message}
                </div>
            `;
        }
    });

    // Disparar el evento change inicial
    summaryMonth.dispatchEvent(new Event("change"));
}

async function loadTopMedicines() {
    const topMedsMonth = document.querySelector("#topMedsMonth");
    const topMedsTable = document.querySelector("#topMedsTable tbody");

    async function updateTable() {
        try {
            // Mostrar spinner
            topMedsTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                    </td>
                </tr>
            `;

            const response = await fetch(`/api/reports/top-medicines/${topMedsMonth.value}`);
            if (!response.ok) throw new Error(`Error HTTP status: ${response.status}`);
            
            const data = await response.json();
            topMedsTable.innerHTML = "";

            if (data.medicines && data.medicines.length > 0) {
                data.medicines.forEach((med) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${med.codigo_med}</td>
                        <td>${med.descripcion}</td>
                        <td class="text-end">${med.dias_con_descuadre}</td>
                        <td class="text-end">${Math.round((med.dias_con_descuadre/med.total_dias_mes)*100)}%</td>
                        <td class="text-end">${med.min_descuadre}</td>
                        <td class="text-end">${med.max_descuadre}</td>
                        <td class="text-end">${med.promedio_descuadre.toFixed(2)}</td>
                    `;
                    topMedsTable.appendChild(row);
                });
            } else {
                topMedsTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">No hay datos para mostrar en este período</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error("Error loading top medicines:", error);
            topMedsTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">Error al cargar los datos</td>
                </tr>
            `;
        }
    }

    topMedsMonth.addEventListener("change", updateTable);
    await updateTable();
}

async function initializeEvolutionChart() {
  const medicineSearch = document.querySelector("#medicineSearch");
  const searchResults = document.querySelector("#searchResults");
  const selectedMedicineCode = document.querySelector("#selectedMedicineCode");
  let chart = null;
  let medicines = [];

  try {
    const response = await fetch("/api/reports/medicines");
    const data = await response.json();
    medicines = data.medicines;
  } catch (error) {
    console.error("Error loading medicines:", error);
  }

  // Función de búsqueda
  function searchMedicines(searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    return medicines
      .filter(
        (med) =>
          med.codigo_med.toLowerCase().includes(searchTerm) ||
          med.descripcion.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10);
  }

  async function updateChart(medicineCode) {
    if (!medicineCode) {
      document.querySelector("#evolutionChart").innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h4>Busca un medicamento para ver su evolución</h4>
                    <p>Escribe el código o nombre del medicamento en el buscador superior para visualizar el histórico de sus descuadres.</p>
                </div>
            `;
      return;
    }

    try {
      const response = await fetch(`/api/reports/evolution/${medicineCode}`);
      const data = await response.json();

      const options = {
        series: [
          {
            name: "Descuadre diario",
            type: "column",
            data: data.evolution.map((item) => ({
              x: new Date(item.fecha).getTime(),
              y: item.descuadre,
            })),
          },
        ],
        chart: {
          height: 500,
          type: "bar",
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true,
            },
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 3,
            dataLabels: {
              position: "top",
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: function (val) {
            return val;
          },
          offsetY: -20,
          style: {
            fontSize: "12px",
            colors: ["#304758"],
          },
        },
        colors: ["#00549F"],
        xaxis: {
          type: "datetime",
          labels: {
            formatter: function (val) {
              return new Date(val).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              });
            },
            rotate: -45,
            style: {
              fontSize: "12px",
            },
          },
        },
        yaxis: {
          title: {
            text: "Descuadre",
          },
        },
        title: {
          text: `Evolución de descuadres - ${
            data.evolution[0]?.descripcion || ""
          }`,
          align: "left",
        },
        tooltip: {
          x: {
            format: "dd MMM yyyy",
          },
          y: {
            formatter: function (val) {
              return `${val} unidades`;
            },
          },
        },
      };

      if (chart) {
        chart.destroy();
      }

      chart = new ApexCharts(
        document.querySelector("#evolutionChart"),
        options
      );
      chart.render();
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al cargar los datos de evolución",
        confirmButtonColor: "#00549F",
      });
    }
  }

  medicineSearch.addEventListener("input", function () {
    const searchTerm = this.value;
    if (searchTerm.length < 2) {
      searchResults.classList.add("d-none");
      return;
    }

    const matches = searchMedicines(searchTerm);
    if (matches.length > 0) {
      searchResults.innerHTML = matches
        .map(
          (med) => `
                <div class="p-2 search-item" style="cursor: pointer; hover:background-color: #f8f9fa;" 
                     data-code="${med.codigo_med}">
                    <strong>${med.codigo_med}</strong> - ${med.descripcion}
                </div>
            `
        )
        .join("");
      searchResults.classList.remove("d-none");
    } else {
      searchResults.innerHTML =
        '<div class="p-2">No se encontraron resultados</div>';
      searchResults.classList.remove("d-none");
    }
  });

  // Event listener - seleccionar un medicamento
  searchResults.addEventListener("click", function (e) {
    const item = e.target.closest(".search-item");
    if (item) {
      const code = item.dataset.code;
      const medicine = medicines.find((m) => m.codigo_med === code);
      medicineSearch.value = `${medicine.codigo_med} - ${medicine.descripcion}`;
      selectedMedicineCode.value = code;
      searchResults.classList.add("d-none");
      updateChart(code);
    }
  });
  document.addEventListener("click", function (e) {
    if (
      !medicineSearch.contains(e.target) &&
      !searchResults.contains(e.target)
    ) {
      searchResults.classList.add("d-none");
    }
  });
}
async function initializeCompareChart() {
  const compareMonth1 = document.querySelector("#compareMonth1");
  const compareMonth2 = document.querySelector("#compareMonth2");
  let summaryChart = null;
  let detailChart = null;

  async function updateCompareChart() {
    if (!compareMonth1.value || !compareMonth2.value) {
      const container = document.querySelector(
        "#compareSummaryChart"
      ).parentElement;
      container.innerHTML = `
                <div class="empty-state compare">
                    <div class="content">
                        <div class="months-icon">
                            <i class="bi bi-calendar-month"></i>
                            <i class="bi bi-arrow-left-right"></i>
                            <i class="bi bi-calendar-month"></i>
                        </div>
                        <h4>Selecciona dos meses para comparar</h4>
                        <p>Utiliza los selectores superiores para elegir los meses que deseas comparar y visualizar sus diferencias en descuadres.</p>
                    </div>
                </div>
            `;
      document.querySelector("#compareDetailChart").innerHTML = "";
      return;
    }
    try {
      if (!compareMonth1.value || !compareMonth2.value) return;
      const response = await fetch(
        `/api/reports/compare/${compareMonth1.value}/${compareMonth2.value}`
      );
      if (!response.ok) throw new Error("Error en la petición");
      const data = await response.json();
      // Gráfico de resumen mensual
      const summaryOptions = {
        series: [
          {
            name: "Total Descuadres",
            data: [
              data.totals.month1.total_descuadres,
              data.totals.month2.total_descuadres,
            ],
          },
        ],
        chart: {
          type: "bar",
          height: 200,
        },
        plotOptions: {
          bar: {
            borderRadius: 4,
            horizontal: true,
            barHeight: "50%",
          },
        },
        dataLabels: {
          enabled: true,
        },
        xaxis: {
          categories: [data.labels.month1, data.labels.month2],
        },
        title: {
          text: "Comparativa General de Descuadres",
          align: "left",
        },
        colors: ["#00549F"],
      };
      const detailOptions = {
        series: [
          {
            name: data.labels.month1,
            data: data.topMedicines.map((item) => item.mes1_total),
          },
          {
            name: data.labels.month2,
            data: data.topMedicines.map((item) => item.mes2_total),
          },
        ],
        chart: {
          type: "bar",
          height: 400,
          stacked: false,
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "55%",
            endingShape: "rounded",
          },
        },
        dataLabels: {
          enabled: true,
        },
        xaxis: {
          categories: data.topMedicines.map((item) => item.descripcion),
          labels: {
            rotate: -45,
            trim: true,
            style: {
              fontSize: "12px",
            },
          },
        },
        title: {
          text: "Comparativa por Medicamento",
          align: "left",
        },
        colors: ["#00549F", "#217346"],
      };
      // Actualizar gráficos
      if (summaryChart) summaryChart.destroy();
      if (detailChart) detailChart.destroy();
      summaryChart = new ApexCharts(
        document.querySelector("#compareSummaryChart"),
        summaryOptions
      );
      detailChart = new ApexCharts(
        document.querySelector("#compareDetailChart"),
        detailOptions
      );
      summaryChart.render();
      detailChart.render();
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al cargar la comparativa",
        confirmButtonColor: "#00549F",
      });
    }
  }
  compareMonth1.addEventListener("change", updateCompareChart);
  compareMonth2.addEventListener("change", updateCompareChart);
  updateCompareChart();
}

async function loadCategoriesReport() {
  const categoriesMonth = document.querySelector("#categoriesMonth");
  let categoriesChart = null;
  let motivesChart = null;

  async function updateCharts() {
    try {
      const response = await fetch(
        `/api/reports/categories/${categoriesMonth.value}`
      );
      if (!response.ok) throw new Error("Error al obtener datos");
      const data = await response.json();
      // Gráfico de categorías
      const categoriesOptions = {
        series: [
          {
            name: "Descuadres",
            data: Object.values(data.categories),
          },
        ],
        chart: {
          type: "bar",
          height: 350,
          toolbar: {
            show: true,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 4,
            horizontal: true,
            distributed: true,
          },
        },
        colors: ["#00549F", "#217346", "#ffc107", "#dc3545", "#6f42c1"],
        dataLabels: {
          enabled: true,
          formatter: function (val) {
            return val.toFixed(0);
          },
        },
        xaxis: {
          categories: Object.keys(data.categories),
        },
        title: {
          text: "Distribución por Categorías",
          align: "left",
        },
      };
      // Gráfico de motivos
      const motivesOptions = {
        series: [
          {
            name: "Descuadres",
            data: Object.values(data.motives),
          },
        ],
        chart: {
          type: "bar",
          height: 350,
          toolbar: {
            show: true,
          },
        },
        plotOptions: {
          bar: {
            borderRadius: 4,
            horizontal: true,
            distributed: true,
          },
        },
        colors: ["#00549F", "#217346", "#ffc107", "#dc3545", "#6f42c1"],
        dataLabels: {
          enabled: true,
          formatter: function (val) {
            return val.toFixed(0);
          },
        },
        xaxis: {
          categories: Object.keys(data.motives),
        },
        title: {
          text: "Distribución por Motivos",
          align: "left",
        },
      };

      // Actualizar o crear gráficos
      if (categoriesChart) categoriesChart.destroy();
      if (motivesChart) motivesChart.destroy();

      categoriesChart = new ApexCharts(
        document.querySelector("#categoriesChart"),
        categoriesOptions
      );
      motivesChart = new ApexCharts(
        document.querySelector("#motivesChart"),
        motivesOptions
      );

      categoriesChart.render();
      motivesChart.render();
    } catch (error) {
      console.error("Error:", error);
      showNotification("error", "Error al cargar el reporte de categorías");
    }
  }

  // Event listener para cambios en el selector de mes
  categoriesMonth.addEventListener("change", updateCharts);
  await updateCharts();
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

$("#miTabla").DataTable({
  language: dataTableEsES,
});

$("#reportsTable").DataTable({
  language: dataTableEsES,
});
