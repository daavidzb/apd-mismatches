document.addEventListener('DOMContentLoaded', function() {
    const months = getLastTwelveMonths();
    const analysisMonth = document.getElementById('analysisMonth');
    let dataTable = null;

    // Poblar selector de meses
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
                columns: [
                    { data: 'codigo_med', title: 'Código' },
                    { 
                        data: null, 
                        title: 'Descripción',
                        render: function(data) {
                            const hasChanges = data.tiene_cambios_tendencia ? 
                                '<i class="bi bi-exclamation-triangle-fill text-warning ms-2" title="Presenta cambios significativos"></i>' : 
                                '';
                            return `<div class="d-flex align-items-center justify-content-between">
                                ${data.descripcion}
                                ${hasChanges}
                            </div>`;
                        }
                    },
                    { 
                        data: 'ultimo_descuadre',
                        title: 'Último Descuadre',
                        render: function(data) {
                            return `<span class="${data < 0 ? 'text-danger' : 'text-success'}">${data}</span>`;
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
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
                },
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
                                <option value="${estado.id_estado}">
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
                                <option value="${cat.id_categoria}">
                                    ${cat.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Motivo</label>
                        <select class="form-select" id="motivo">
                            <option value="">Seleccionar motivo...</option>
                            ${data.motivos.map(mot => `
                                <option value="${mot.id_motivo}">
                                    ${mot.nombre}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Observaciones</label>
                        <textarea class="form-control" id="observaciones" rows="3"></textarea>
                    </div>
                </div>
            `,
            confirmButtonText: 'Guardar',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#00549F',
            width: '600px'
        });

        if (result.isConfirmed) {
            const gestionData = {
                id_estado: document.getElementById('estado').value,
                id_categoria: document.getElementById('categoria').value,
                id_motivo: document.getElementById('motivo').value,
                observaciones: document.getElementById('observaciones').value
            };

            await actualizarGestionMedicamento(codigo, gestionData);
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

async function actualizarGestionMedicamento(codigo, datos) {
    try {
        const response = await fetch(`/api/analysis/update/${codigo}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (!response.ok) throw new Error('Error al actualizar');

        await Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Los cambios se han guardado correctamente',
            timer: 1500,
            showConfirmButton: false
        });

        window.location.href = '/managed';
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al actualizar el medicamento',
            confirmButtonColor: '#00549F'
        });
    }
}