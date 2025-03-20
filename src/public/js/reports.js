document.addEventListener('DOMContentLoaded', function() {
    
    const months = getLastTwelveMonths();
    populateMonthSelectors(months);

    initializeSummaryChart();
    loadTopMedicines();
    initializeEvolutionChart();
    initializeCompareChart();
});

function getLastTwelveMonths() {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
        const month = date.getMonth() - i;
        const year = date.getFullYear() - (month < 0 ? 1 : 0);
        const adjustedMonth = month < 0 ? 12 + month : month;
        months.push({
            value: `${year}-${String(adjustedMonth + 1).padStart(2, '0')}`,
            label: new Date(year, adjustedMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        });
    }
    return months;
}

function populateMonthSelectors(months) {
    const selectors = ['#summaryMonth', '#topMedsMonth', '#compareMonth1', '#compareMonth2'];
    selectors.forEach(selector => {
        const select = document.querySelector(selector);
        months.forEach(month => {
            const option = new Option(month.label, month.value);
            select.add(option);
        });
    });
}

async function initializeSummaryChart() {
    const summaryMonth = document.querySelector('#summaryMonth');
    let chart = null;

    summaryMonth.addEventListener('change', async () => {
        try {
            const response = await fetch(`/api/reports/summary/${summaryMonth.value}`);
            const data = await response.json();
            
            // Formatear datos para el gráfico
            const formattedData = data.daily.map(item => ({
                x: new Date(item.fecha).getTime(),
                y: parseInt(item.total)
            }));

            const options = {
                series: [{
                    name: 'Descuadres',
                    data: formattedData
                }],
                chart: {
                    type: 'area',
                    height: 500, 
                    toolbar: {
                        show: true,
                        tools: {
                            download: true,
                            selection: true,
                            zoom: true,
                            zoomin: true,
                            zoomout: true,
                            pan: true,
                            reset: true
                        }
                    }
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
                    title: {
                        text: 'Número de descuadres'
                    }
                },
                title: {
                    text: `Resumen de Descuadres - ${new Date(summaryMonth.value + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
                    align: 'left'
                }
            };

            
            if (chart) {
                chart.destroy();
            }

            // Crear nuevo gráfico
            chart = new ApexCharts(document.querySelector("#summaryChart"), options);
            chart.render();
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar el resumen mensual',
                confirmButtonColor: '#00549F'
            });
        }
    });

    
    summaryMonth.dispatchEvent(new Event('change'));
}

async function loadTopMedicines() {
    const topMedsMonth = document.querySelector('#topMedsMonth');
    const topMedsTable = document.querySelector('#topMedsTable tbody');

    async function updateTable() {
        try {
            
            topMedsTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                    </td>
                </tr>
            `;

            console.log('Fetching data for:', topMedsMonth.value); // log
            const response = await fetch(`/api/reports/top-medicines/${topMedsMonth.value}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('data:', data); // log

            topMedsTable.innerHTML = '';
            
            if (data.medicines && data.medicines.length > 0) {
                data.medicines.forEach(med => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${med.codigo_med || 'N/A'}</td>
                        <td>${med.descripcion || 'N/A'}</td>
                        <td class="text-end">${med.total_descuadres || 0}</td>
                        <td class="text-end">${typeof med.frecuencia === 'number' ? med.frecuencia.toFixed(2) : '0.00'}%</td>
                    `;
                    topMedsTable.appendChild(row);
                });
            } else {
                topMedsTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">
                            No hay datos para mostrar en este período
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error loading top medicines:', error);
            topMedsTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        Error al cargar los datos: ${error.message}
                    </td>
                </tr>
            `;
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar los medicamentos más frecuentes',
                confirmButtonColor: '#00549F'
            });
        }
    }
    
    topMedsMonth.addEventListener('change', updateTable);
    await updateTable();
}

async function initializeEvolutionChart() {
    const medicineSearch = document.querySelector('#medicineSearch');
    const searchResults = document.querySelector('#searchResults');
    const selectedMedicineCode = document.querySelector('#selectedMedicineCode');
    let chart = null;
    let medicines = [];

    try {
        const response = await fetch('/api/reports/medicines');
        const data = await response.json();
        medicines = data.medicines;
    } catch (error) {
        console.error('Error loading medicines:', error);
    }

    // Función de búsqueda
    function searchMedicines(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        return medicines.filter(med => 
            med.codigo_med.toLowerCase().includes(searchTerm) ||
            med.descripcion.toLowerCase().includes(searchTerm)
        ).slice(0, 10); 
    }

    
    async function updateChart(medicineCode) {
        if (!medicineCode) return;

        try {
            const response = await fetch(`/api/reports/evolution/${medicineCode}`);
            const data = await response.json();

            const options = {
                series: [{
                    name: 'Descuadre diario',
                    type: 'column',
                    data: data.evolution.map(item => ({
                        x: new Date(item.fecha).getTime(),
                        y: item.descuadre
                    }))
                }],
                chart: {
                    height: 500,
                    type: 'bar',
                    toolbar: {
                        show: true,
                        tools: {
                            download: true,
                            selection: true,
                            zoom: true,
                            zoomin: true,
                            zoomout: true,
                            pan: true,
                            reset: true
                        }
                    }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 3,
                        dataLabels: {
                            position: 'top'
                        }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) {
                        return val;
                    },
                    offsetY: -20,
                    style: {
                        fontSize: '12px',
                        colors: ["#304758"]
                    }
                },
                colors: ['#00549F'],
                xaxis: {
                    type: 'datetime',
                    labels: {
                        formatter: function(val) {
                            return new Date(val).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short'
                            });
                        },
                        rotate: -45,
                        style: {
                            fontSize: '12px'
                        }
                    }
                },
                yaxis: {
                    title: {
                        text: 'Descuadre'
                    }
                },
                title: {
                    text: `Evolución de descuadres - ${data.evolution[0]?.descripcion || ''}`,
                    align: 'left'
                },
                tooltip: {
                    x: {
                        format: 'dd MMM yyyy'
                    },
                    y: {
                        formatter: function(val) {
                            return `${val} unidades`;
                        }
                    }
                }
            };

            if (chart) {
                chart.destroy();
            }

            chart = new ApexCharts(document.querySelector("#evolutionChart"), options);
            chart.render();
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar los datos de evolución',
                confirmButtonColor: '#00549F'
            });
        }
    }

    
    medicineSearch.addEventListener('input', function() {
        const searchTerm = this.value;
        if (searchTerm.length < 2) {
            searchResults.classList.add('d-none');
            return;
        }

        const matches = searchMedicines(searchTerm);
        if (matches.length > 0) {
            searchResults.innerHTML = matches.map(med => `
                <div class="p-2 search-item" style="cursor: pointer; hover:background-color: #f8f9fa;" 
                     data-code="${med.codigo_med}">
                    <strong>${med.codigo_med}</strong> - ${med.descripcion}
                </div>
            `).join('');
            searchResults.classList.remove('d-none');
        } else {
            searchResults.innerHTML = '<div class="p-2">No se encontraron resultados</div>';
            searchResults.classList.remove('d-none');
        }
    });

    // Event listener - seleccionar un medicamento
    searchResults.addEventListener('click', function(e) {
        const item = e.target.closest('.search-item');
        if (item) {
            const code = item.dataset.code;
            const medicine = medicines.find(m => m.codigo_med === code);
            medicineSearch.value = `${medicine.codigo_med} - ${medicine.descripcion}`;
            selectedMedicineCode.value = code;
            searchResults.classList.add('d-none');
            updateChart(code);
        }
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!medicineSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('d-none');
        }
    });
}

async function initializeCompareChart() {
    const compareMonth1 = document.querySelector('#compareMonth1');
    const compareMonth2 = document.querySelector('#compareMonth2');
    let summaryChart = null;
    let detailChart = null;

    async function updateCompareChart() {
        try {
            if (!compareMonth1.value || !compareMonth2.value) return;

            const response = await fetch(`/api/reports/compare/${compareMonth1.value}/${compareMonth2.value}`);
            if (!response.ok) throw new Error('Error en la petición');
            
            const data = await response.json();

            // Gráfico de resumen mensual
            const summaryOptions = {
                series: [{
                    name: 'Total Descuadres',
                    data: [
                        data.totals.month1.total_descuadres,
                        data.totals.month2.total_descuadres
                    ]
                }],
                chart: {
                    type: 'bar',
                    height: 200
                },
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        horizontal: true,
                        barHeight: '50%'
                    }
                },
                dataLabels: {
                    enabled: true
                },
                xaxis: {
                    categories: [data.labels.month1, data.labels.month2]
                },
                title: {
                    text: 'Comparativa General de Descuadres',
                    align: 'left'
                },
                colors: ['#00549F']
            };

            // Gráfico detallado de medicamentos
            const detailOptions = {
                series: [
                    {
                        name: data.labels.month1,
                        data: data.topMedicines.map(item => item.mes1_total)
                    },
                    {
                        name: data.labels.month2,
                        data: data.topMedicines.map(item => item.mes2_total)
                    }
                ],
                chart: {
                    type: 'bar',
                    height: 400,
                    stacked: false
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                        endingShape: 'rounded'
                    }
                },
                dataLabels: {
                    enabled: true
                },
                xaxis: {
                    categories: data.topMedicines.map(item => item.descripcion),
                    labels: {
                        rotate: -45,
                        trim: true,
                        style: {
                            fontSize: '12px'
                        }
                    }
                },
                title: {
                    text: 'Comparativa por Medicamento',
                    align: 'left'
                },
                colors: ['#00549F', '#217346']
            };

            // Actualizar gráficos
            if (summaryChart) summaryChart.destroy();
            if (detailChart) detailChart.destroy();

            summaryChart = new ApexCharts(document.querySelector("#compareSummaryChart"), summaryOptions);
            detailChart = new ApexCharts(document.querySelector("#compareDetailChart"), detailOptions);

            summaryChart.render();
            detailChart.render();
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar la comparativa',
                confirmButtonColor: '#00549F'
            });
        }
    }

    compareMonth1.addEventListener('change', updateCompareChart);
    compareMonth2.addEventListener('change', updateCompareChart);
}
