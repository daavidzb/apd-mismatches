document.addEventListener('DOMContentLoaded', async function() {
    await initializeTrendChart();
    await initializeStateChart();
});

async function initializeTrendChart() {
    try {
        const response = await fetch('/api/dashboard/trend');
        const data = await response.json();

        const options = {
            series: [{
                name: 'Descuadres',
                data: data.map(item => ({
                    x: new Date(item.fecha).getTime(),
                    y: item.total
                }))
            }],
            chart: {
                type: 'area',
                height: 400,
                toolbar: {
                    show: true
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                curve: 'smooth'
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    formatter: function(val) {
                        return new Date(val).toLocaleDateString('es-ES');
                    }
                }
            },
            yaxis: {
                labels: {
                    formatter: function(val) {
                        return Math.round(val);
                    }
                }
            },
            title: {
                text: 'Tendencia de Descuadres (Últimos 30 días)',
                align: 'left'
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.9,
                    stops: [0, 100]
                }
            }
        };

        const chart = new ApexCharts(document.querySelector("#trendChart"), options);
        chart.render();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function initializeStateChart() {
    try {
        const response = await fetch('/api/dashboard/states');
        const data = await response.json();
        
        // Ordenar los estados en el orden deseado
        const ordenEstados = ['Pendiente', 'En proceso', 'Corregido', 'Regularizar'];
        data.sort((a, b) => ordenEstados.indexOf(a.nombre) - ordenEstados.indexOf(b.nombre));
        
        const options = {
            series: data.map(item => item.total),
            chart: {
                type: 'donut',
                height: 350
            },
            labels: data.map(item => item.nombre),
            colors: ['#dc3545', '#ffc107', '#198754', '#0dcaf0'], // Rojo (Pendiente), Naranja (En proceso), Verde (Corregido), Azul (Regularizar)
            title: {
                text: 'Distribución por Estado',
                align: 'left',
                style: {
                    fontSize: '16px'
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function (w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                }
                            }
                        }
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: function (val, opts) {
                    return opts.w.config.series[opts.seriesIndex] + ' (' + Math.round(val) + '%)';
                }
            },
            legend: {
                position: 'bottom',
                formatter: function(seriesName, opts) {
                    return seriesName + ' - ' + opts.w.globals.series[opts.seriesIndex];
                }
            }
        };

        const chart = new ApexCharts(document.querySelector("#stateChart"), options);
        chart.render();

    } catch (error) {
        console.error('Error:', error);
    }
}

function initStateDistribution() {
    fetch('/api/state-distribution')
        .then(response => response.json())
        .then(data => {
            const options = {
                series: data.map(item => item.total),
                labels: data.map(item => item.nombre),
                chart: {
                    type: 'donut',
                    height: 400
                },
                colors: ['#dc3545', '#ffc107', '#28a745'], // Rojo, Naranja, Verde
                legend: {
                    position: 'bottom'
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '70%'
                        }
                    }
                }
            };

            const chart = new ApexCharts(document.querySelector("#stateChart"), options);
            chart.render();
        });
}

const dataTableEsES = {
    "decimal": "",
    "emptyTable": "No hay datos disponibles",
    "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
    "infoEmpty": "Mostrando 0 a 0 de 0 registros",
    "infoFiltered": "(filtrado de _MAX_ registros totales)",
    "infoPostFix": "",
    "thousands": ",",
    "lengthMenu": "Mostrar _MENU_ registros",
    "loadingRecords": "Cargando...",
    "processing": "Procesando...",
    "search": "Buscar:",
    "zeroRecords": "No se encontraron coincidencias",
    "paginate": {
        "first": "Primero",
        "last": "Último",
        "next": "Siguiente",
        "previous": "Anterior"
    },
    "aria": {
        "sortAscending": ": activar para ordenar ascendentemente",
        "sortDescending": ": activar para ordenar descendentemente"
    }
};

// Y usar en las inicializaciones de DataTables:
$('#miTabla').DataTable({
    language: dataTableEsES,
    // ... resto de opciones
});