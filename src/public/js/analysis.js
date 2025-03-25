document.addEventListener('DOMContentLoaded', function() {
    const months = getLastTwelveMonths();
    const analysisMonth = document.getElementById('analysisMonth');
    let dataTable = null;

    // Poblar selector de meses
    const option = document.createElement('option');
    option.value = 'all';
    option.textContent = 'Todos los períodos';
    analysisMonth.appendChild(option);

    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.label;
        analysisMonth.appendChild(option);
    });

    // Inicializar tabla
    initializeTable(analysisMonth.value);

    // Evento cambio de mes
    analysisMonth.addEventListener('change', function() {
        initializeTable(this.value);
    });

    async function initializeTable(month) {
        if (dataTable) {
            dataTable.destroy();
        }

        try {
            const response = await fetch(`/api/analysis/${month}`);
            if (!response.ok) throw new Error('Error al obtener datos');
            const data = await response.json();

            dataTable = new DataTable('#analysisTable', {
                data: data.analysis,
                language: dataTableEsES,
                columns: [
                    { data: 'codigo_med', title: 'Código' },
                    { 
                        data: 'descripcion', 
                        title: 'Descripción',
                        render: function(data, type, row) {
                            const hasChanges = row.tiene_cambios_tendencia ?
                                '<i class="bi bi-exclamation-triangle-fill text-warning ms-2" title="Presenta cambios significativos"></i>' : '';
                            
                            let statusBadge = '';
                            if (row.estado_gestion === 'Pendiente') {
                                statusBadge = '<span class="badge bg-danger ms-2">Pendiente</span>';
                            } else if (row.estado_gestion === 'En proceso') {
                                statusBadge = '<span class="badge bg-warning ms-2">En proceso</span>';
                            } else if (row.estado_gestion === 'Corregido') {
                                statusBadge = '<span class="badge bg-success ms-2">Corregido</span>';
                            }

                            return `
                                <div class="d-flex align-items-center justify-content-between">
                                    <span>${data}</span>
                                    <div>
                                        ${hasChanges}
                                        ${statusBadge}
                                    </div>
                                </div>`;
                        }
                    },
                    { 
                        data: null,
                        title: 'Stock Actual',
                        render: function(data) {
                            return `
                                <div>
                                    <div>FarmaTools: ${data.ultima_cantidad_farmatools}</div>
                                    <div>APD: ${data.ultima_cantidad_armario_apd}</div>
                                    <div class="${data.ultimo_descuadre < 0 ? 'text-danger' : 'text-success'}">
                                        <strong>Diferencia: ${data.ultimo_descuadre}</strong>
                                    </div>
                                </div>`;
                        }
                    },
                    { 
                        data: 'moda',
                        title: 'Moda',
                        render: function(data) {
                            return `<span class="${data < 0 ? 'text-danger' : 'text-success'}">${data}</span>`;
                        }
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        className: 'text-center',
                        render: function(data) {
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
                        }
                    }
                ],
                responsive: true,
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip'
            });

            // Eventos de los botones
            $('#analysisTable').on('click', '.ver-detalle', function() {
                const codigo = $(this).data('codigo');
                showMedicineDetails(codigo, month);
            });

            $('#analysisTable').on('click', '.gestionar', function() {
                const codigo = $(this).data('codigo');
                const descripcion = $(this).data('descripcion');
                gestionarMedicamento(codigo, descripcion);
            });

        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar los datos',
                confirmButtonColor: '#00549F'
            });
        }
    }
});

function getLastTwelveMonths() {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const month = date.toLocaleString('es', { month: 'long' });
        const year = date.getFullYear();
        
        months.push({
            value: `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`
        });
    }
    
    return months;
}

// Función para mostrar detalles
async function showMedicineDetails(codigo, month) {
    try {
        const response = await fetch(`/api/analysis/detail/${month}/${codigo}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        
        const data = await response.json();
        
        Swal.fire({
            title: `<i class="bi bi-capsule me-2"></i>${data.medicina.descripcion}`,
            html: `
                <div class="text-start">
                    <div class="text-muted mb-2">
                        <i class="bi bi-upc-scan me-2"></i>Código: ${codigo}
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Descuadre</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.details.map(detail => `
                                    <tr class="${detail.cambio_tendencia ? 'table-warning' : ''}">
                                        <td>${new Date(detail.fecha).toLocaleDateString('es-ES')}</td>
                                        <td class="${detail.descuadre < 0 ? 'text-danger' : 'text-success'}">
                                            <strong>${detail.descuadre}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
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
            text: 'Error al cargar los detalles',
            confirmButtonColor: '#00549F'
        });
    }
}

// Función para gestionar medicamento
async function gestionarMedicamento(codigo, descripcion) {
    try {
        const response = await fetch(`/api/analysis/manage/${codigo}`);
        if (!response.ok) throw new Error('Error al obtener datos del medicamento');
        
        const data = await response.json();
        
        const result = await Swal.fire({
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
                                <option value="${estado.id_estado}"
                                    ${data.medicamento.id_estado === estado.id_estado ? 'selected' : ''}>
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
                                    ${data.medicamento.id_categoria === cat.id_categoria ? 'selected' : ''}>
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
                        <textarea class="form-control" id="observaciones" rows="3">${data.medicamento.observaciones || ''}</textarea>
                    </div>
                </div>
            `,
            didOpen: () => {
                const categoriaSelect = document.getElementById('categoria');
                if (categoriaSelect.value) {
                    actualizarMotivos(categoriaSelect.value, data.medicamento.id_motivo);
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
                return true;
            },
            confirmButtonText: 'Guardar',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#00549F'
        });

        if (result.isConfirmed) {
            const datos = {
                id_estado: document.getElementById('estado').value,
                id_categoria: document.getElementById('categoria').value,
                id_motivo: document.getElementById('motivo').value,
                observaciones: document.getElementById('observaciones').value
            };
            await actualizarGestionMedicamento(codigo, datos);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al gestionar el medicamento',
            confirmButtonColor: '#00549F'
        });
    }
}

// Función para actualizar los motivos según la categoría seleccionada
function actualizarMotivos(categoriaId, motivoSeleccionado = null) {
    const motivosSelect = document.getElementById('motivo');
    motivosSelect.disabled = true;
    motivosSelect.innerHTML = '<option value="">Seleccionar motivo...</option>';

    if (!categoriaId) {
        return;
    }

    const motivosData = document.getElementById('motivosData');
    if (!motivosData) {
        console.error('No se encontró el contenedor de motivos');
        return;
    }

    try {
        const motivos = JSON.parse(motivosData.dataset.motivos);
        const motivosFiltrados = motivos.filter(m => m.id_categoria == categoriaId);

        if (motivosFiltrados.length === 0) {
            console.log('No hay motivos para esta categoría');
            return;
        }

        motivosFiltrados.forEach(motivo => {
            const option = document.createElement('option');
            option.value = motivo.id_motivo;
            option.textContent = motivo.nombre;
            if (motivoSeleccionado && motivo.id_motivo == motivoSeleccionado) {
                option.selected = true;
            }
            motivosSelect.appendChild(option);
        });

        motivosSelect.disabled = false;
    } catch (error) {
        console.error('Error al procesar motivos:', error);
    }
}

async function actualizarGestionMedicamento(codigo, datos) {
    try {
        const response = await fetch(`/api/analysis/update/${codigo}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.isAlreadyManaged) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Medicamento en gestión',
                    text: `Este medicamento está siendo gestionado por ${result.managedBy}`,
                    confirmButtonColor: '#00549F'
                });
                return;
            }
            throw new Error(result.error || 'Error al actualizar');
        }

        await Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Los cambios se han guardado correctamente',
            timer: 1500,
            showConfirmButton: false
        });

        window.location.href = '/analysis';
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al actualizar el medicamento',
            confirmButtonColor: '#00549F'
        });
    }
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