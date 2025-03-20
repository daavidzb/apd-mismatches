document.addEventListener('DOMContentLoaded', function() {
    const months = getLastTwelveMonths();
    populateMonthSelector(months);
    initializeAnalysisTable();
});

function getLastTwelveMonths() {
    const months = [];
    const date = new Date();
    
    for (let i = 0; i < 12; i++) {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        months.unshift({
            value: `${year}-${month.toString().padStart(2, '0')}`,
            label: new Date(year, month - 1).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long' 
            })
        });
        date.setMonth(date.getMonth() - 1);
    }
    
    return months;
}

function populateMonthSelector(months) {
    const analysisMonth = document.querySelector('#analysisMonth');
    const allOption = new Option('Todos los descuadres', 'all');
    analysisMonth.add(allOption);
    
    months.forEach(month => {
        const option = new Option(month.label, month.value);
        analysisMonth.add(option);
    });

    analysisMonth.value = 'all';
}

async function initializeAnalysisTable() {
    const analysisMonth = document.querySelector('#analysisMonth');
    let dataTable = null;
    let currentRequest = null;

    async function showMedicineDetails(codigo, month) {
        try {
            const response = await fetch(`/api/analysis/detail/${month}/${codigo}`);
            if (!response.ok) throw new Error('Error al obtener los detalles');
            
            const data = await response.json();
            
            Swal.fire({
                title: `<i class="bi bi-capsule me-2"></i>${data.medicina.descripcion}`,
                html: `
                    <div class="mb-3">
                        <div class="text-muted mb-2">
                            <i class="bi bi-upc-scan me-2"></i>
                            <strong>Código:</strong> ${codigo}
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th>Fecha</th>
                                    <th>Descuadre</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.details.map(detail => `
                                    <tr class="${detail.cambio_tendencia ? 'table-warning' : ''}">
                                        <td>
                                            <i class="bi bi-calendar3 me-1"></i>
                                            ${new Date(detail.fecha).toLocaleDateString('es-ES')}
                                            ${detail.cambio_tendencia ? 
                                                '<i class="bi bi-exclamation-triangle-fill text-warning ms-2" title="Cambio de tendencia"></i>' : 
                                                ''}
                                        </td>
                                        <td class="${detail.descuadre < 0 ? 'text-danger' : 'text-success'}">
                                            <strong>${detail.descuadre}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `,
                width: '600px',
                confirmButtonColor: '#00549F'
            });
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar los detalles del medicamento',
                confirmButtonColor: '#00549F'
            });
        }
    }

    async function updateAnalysisTable() {
        const loader = document.getElementById('loader');
        const tableContainer = document.getElementById('tableContainer');
        
        try {
            // Cancelar petición anterior si existe
            if (currentRequest) {
                currentRequest.abort();
            }

            // Mostrar loader, ocultar tabla
            loader.style.display = 'flex';
            tableContainer.classList.add('content-hidden');
            
            // Crear nueva petición con AbortController
            const controller = new AbortController();
            currentRequest = controller;
            
            const response = await fetch(`/api/analysis/${analysisMonth.value || 'all'}`, {
                signal: controller.signal
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();

            if (dataTable) {
                dataTable.destroy();
            }

            // Crear nueva tabla
            dataTable = new DataTable('#analysisTable', {
                data: data.analysis,
                processing: true,
                serverSide: false,
                columns: [
                    { data: 'codigo_med', title: 'Código' },
                    { data: 'descripcion', title: 'Descripción' },
                    { 
                        data: 'ultimo_descuadre',
                        title: 'Último Descuadre',
                        render: function(data) {
                            const colorClass = data < 0 ? 'text-danger' : 'text-success';
                            return `<span class="${colorClass}">${data}</span>`;
                        }
                    },
                    { 
                        data: 'moda',
                        title: 'Moda',
                        render: function(data) {
                            const colorClass = data < 0 ? 'text-danger' : 'text-success';
                            return `<span class="${colorClass}">${data}</span>`;
                        }
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        render: function(data) {
                            return `
                                <div class="d-flex gap-2 justify-content-center">
                                    <button class="btn btn-primary btn-sm ver-detalle" data-codigo="${data.codigo_med}">
                                        <i class="bi bi-graph-up"></i> Ver Detalle
                                    </button>
                                    <button class="btn btn-success btn-sm gestionar" data-codigo="${data.codigo_med}" data-descripcion="${data.descripcion}">
                                        <i class="bi bi-pencil-square"></i> Gestionar
                                    </button>
                                </div>`;
                        }
                    }
                ],
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json',
                    processing: '<div class="loader"></div>'
                },
                order: [[2, 'desc']],
                pageLength: 20 
            });

            currentRequest = null;
            
            loader.style.display = 'none';
            tableContainer.classList.remove('content-hidden');

            $('#analysisTable').on('click', '.ver-detalle', function() {
                const codigo = $(this).data('codigo');
                showMedicineDetails(codigo, analysisMonth.value || 'all');
            });

            $('#analysisTable').on('click', '.gestionar', function() {
                const codigo = $(this).data('codigo');
                const descripcion = $(this).data('descripcion');
                gestionarMedicamento(codigo, descripcion);
            });

        } catch (error) {
            // Ignorar errores de abort
            if (error.name === 'AbortError') {
                console.log('Fetch abortado');
                return;
            }

            console.error('Error:', error);
            loader.style.display = 'none';
            tableContainer.classList.remove('content-hidden');
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar el análisis: ' + error.message,
                confirmButtonColor: '#00549F'
            });
        }
    }

    analysisMonth.addEventListener('change', updateAnalysisTable);
    updateAnalysisTable();
}

// Función para gestionar medicamento
async function gestionarMedicamento(codigo, descripcion) {
    try {
        const response = await fetch(`/api/analysis/manage/${codigo}`);
        if (!response.ok) throw new Error('Error al obtener datos del medicamento');
        
        const data = await response.json();
        
        Swal.fire({
            title: 'Gestionar Medicamento',
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
                                <option value="${estado.id_estado}" ${data.medicamento.id_estado == estado.id_estado ? 'selected' : ''}>
                                    ${estado.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Categoría</label>
                        <select class="form-select" id="categoria">
                            <option value="">Seleccionar categoría...</option>
                            ${data.categorias.map(cat => `
                                <option value="${cat.id_categoria}" ${data.medicamento.id_categoria == cat.id_categoria ? 'selected' : ''}>
                                    ${cat.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Motivo</label>
                        <select class="form-select" id="motivo" ${!data.medicamento.id_categoria ? 'disabled' : ''}>
                            <option value="">Seleccionar motivo...</option>
                            ${data.motivos.filter(m => m.id_categoria == data.medicamento.id_categoria).map(mot => `
                                <option value="${mot.id_motivo}" ${data.medicamento.id_motivo == mot.id_motivo ? 'selected' : ''}>
                                    ${mot.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Observaciones</label>
                        <textarea class="form-control" id="observaciones" rows="3">${data.medicamento.observaciones || ''}</textarea>
                    </div>
                </div>
            `,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            showCancelButton: true,
            width: '600px',
            confirmButtonColor: '#00549F',
            preConfirm: () => {
                return {
                    id_estado: document.getElementById('estado').value,
                    id_categoria: document.getElementById('categoria').value,
                    id_motivo: document.getElementById('motivo').value,
                    observaciones: document.getElementById('observaciones').value
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                actualizarGestionMedicamento(codigo, result.value);
            }
        });

        // Event listener para actualizar motivos cuando cambia la categoría
        document.getElementById('categoria').addEventListener('change', function(e) {
            const motivoSelect = document.getElementById('motivo');
            const motivos = data.motivos.filter(m => m.id_categoria == e.target.value);
            
            motivoSelect.innerHTML = '<option value="">Seleccionar motivo...</option>';
            motivoSelect.disabled = !e.target.value;
            
            motivos.forEach(mot => {
                motivoSelect.add(new Option(mot.nombre, mot.id_motivo));
            });
        });

    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar los datos del medicamento',
            confirmButtonColor: '#00549F'
        });
    }
}

async function actualizarGestionMedicamento(codigo, datos) {
    try {
        const response = await fetch(`/api/analysis/update/${codigo}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_categoria: datos.id_categoria || null,
                id_motivo: datos.id_motivo || null,
                id_estado: datos.id_estado || null,
                observaciones: datos.observaciones || ''
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Error al actualizar');

        // Mostrar mensaje de éxito y redirigir
        await Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Los cambios se han guardado correctamente',
            confirmButtonColor: '#00549F',
            timer: 1500,
            showConfirmButton: false
        });

        // Redirigir a la vista de gestionados
        window.location.href = '/managed';

    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al guardar los cambios: ' + error.message,
            confirmButtonColor: '#00549F'
        });
    }
}