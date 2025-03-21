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

        const options = {
            series: data.map(item => item.total),
            chart: {
                type: 'donut',
                height: 400
            },
            labels: data.map(item => item.nombre),
            colors: ['#dc3545', '#ffc107', '#198754'],
            title: {
                text: 'Distribución por Estado',
                align: 'left'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };

        const chart = new ApexCharts(document.querySelector("#stateChart"), options);
        chart.render();
    } catch (error) {
        console.error('Error:', error);
    }
}