document.addEventListener("DOMContentLoaded", function () {
  // Cargar gráficos en paralelo
  Promise.all([initializeTrendChart(), initializeStateChart()]).catch(
    (error) => {
      console.error("Error al cargar los gráficos:", error);
    }
  );
});

async function initializeTrendChart() {
  try {
    const response = await fetch("/api/dashboard/trend");
    const data = await response.json();

    const options = {
      series: [
        {
          name: "Descuadres",
          data: data.map((item) => ({
            x: new Date(item.fecha).getTime(),
            y: item.total,
          })),
        },
      ],
      chart: {
        type: "area",
        height: 400,
        toolbar: {
          show: true,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
      },
      xaxis: {
        type: "datetime",
        labels: {
          formatter: function (val) {
            return new Date(val).toLocaleDateString("es-ES");
          },
        },
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return Math.round(val);
          },
        },
      },
      title: {
        text: "(Últimos 30 días)",
        align: "left",
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.9,
          stops: [0, 100],
        },
      },
    };

    const chart = new ApexCharts(
      document.querySelector("#trendChart"),
      options
    );
    chart.render();
  } catch (error) {
    console.error("Error:", error);
  }
}

async function initializeStateChart() {
  try {
    const response = await fetch("/api/dashboard/states");
    const data = await response.json();

    // Configuración simplificada con los estados exactos
    const estadosConfig = [
      { nombre: "Pendiente", color: "#dc3545" }, // Rojo
      { nombre: "En proceso", color: "#ffc107" }, // Amarillo
      { nombre: "Resuelto", color: "#198754" }, // Verde
      { nombre: "Regularizar", color: "#00b8d4" }, // turquesa
    ];

    const datosOrdenados = data
      .map((item) => {
        const config = estadosConfig.find((c) => c.nombre === item.nombre);
        return {
          ...item,
          color: config?.color || "#dc3545",
        };
      })
      .sort((a, b) => {
        const orden = {
          Pendiente: 1,
          "En proceso": 2,
          Resuelto: 3,
          Regularizar: 4,
        };
        return (orden[a.nombre] || 99) - (orden[b.nombre] || 99);
      });

    const options = {
      series: datosOrdenados.map((item) => item.total),
      chart: {
        type: "donut",
        height: 350,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
      labels: datosOrdenados.map((item) => item.nombre),
      colors: datosOrdenados.map((item) => item.color),
      title: {
        text: "Hospital Universitario Niño Jesús",
        align: "left",
        style: {
          fontSize: "16px",
          fontWeight: "500",
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total",
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                },
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: function (val, opts) {
          const total = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const value = opts.w.globals.series[opts.seriesIndex];
          const percentage = Math.round((value * 100) / total);
          return `${value} (${percentage}%)`;
        },
      },
      legend: {
        position: "bottom",
        formatter: function (seriesName, opts) {
          const total = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
          const value = opts.w.globals.series[opts.seriesIndex];
          const percentage = Math.round((value * 100) / total);
          return `${seriesName}: ${value} (${percentage}%)`;
        },
      },
      tooltip: {
        y: {
          formatter: function (value) {
            return `${value} medicamentos`;
          },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 300,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
    };

    // Limpiar contenedor existente
    document.querySelector("#stateChart").innerHTML = "";

    // Renderizar nuevo gráfico
    const chart = new ApexCharts(
      document.querySelector("#stateChart"),
      options
    );
    await chart.render();
  } catch (error) {
    console.error("Error al cargar distribución de estados:", error);
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

// Y usar en las inicializaciones de DataTables:
$("#miTabla").DataTable({
  language: dataTableEsES,
  // ... resto de opciones
});
