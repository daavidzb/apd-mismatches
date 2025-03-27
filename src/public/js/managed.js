// Configuración de idioma para DataTables
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
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Configuración base para todas las tablas
    const configBase = {
        language: dataTableEsES,
        processing: true,
        pageLength: 10,
        responsive: true,
        scrollX: false,
        autoWidth: false,
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        drawCallback: function() {
            // Reinicializar tooltips después de cada redibujado
            const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltips.forEach(tooltip => {
                new bootstrap.Tooltip(tooltip);
            });
        }
    };

    // Columnas base para todas las tablas
    const columnasBase = [
        { 
            data: 'codigo_med', 
            title: 'Código',
            width: '10%'
        },
        { 
            data: 'descripcion', 
            title: 'Descripción',
            width: '35%',
            render: function(data) {
                // Solo acortar la descripción en la tabla
                const shortDesc = data.length > 30 ? data.substring(0, 30) + '...' : data;
                return `<span title="${data}" data-bs-toggle="tooltip">${shortDesc}</span>`;
            }
        },
        { 
            data: 'categoria', 
            title: 'Categoría',
            width: '20%'
        },
        {
            data: 'fecha_gestion',
            title: 'Última gestión',
            width: '20%',
            render: function(data) {
                return data ? new Date(data).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }) : 'N/A';
            }
        },
        {
            data: null,
            title: 'Acciones',
            width: '15%',
            className: 'text-center',
            render: function(data) {
                return `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm ver-detalle"
                                data-codigo="${data.codigo_med}"
                                title="Ver detalles">
                            <i class="bi bi-info-circle"></i>
                        </button>
                        <button class="btn btn-outline-success btn-sm gestionar"
                                data-codigo="${data.codigo_med}"
                                data-descripcion="${data.descripcion}"
                                title="Gestionar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                    </div>`;
            }
        }
    ];

    // Objeto para almacenar las instancias de las tablas
    const tables = {};

    // Función para inicializar tabla
    function initTable(tabId, status) {
        if (tables[tabId]) {
            tables[tabId].destroy();
        }

        tables[tabId] = new DataTable(`#${tabId}`, {
            ...configBase,
            ajax: {
                url: `/api/managed/${status}`,
                dataSrc: 'managed'
            },
            columns: columnasBase
        });

        // Event listeners para los botones de cada tabla
        $(`#${tabId}`).on('click', '.ver-detalle', function() {
            const codigo = $(this).data('codigo');
            showMedicineDetails(codigo);
        });

        $(`#${tabId}`).on('click', '.gestionar', function() {
            const codigo = $(this).data('codigo');
            const descripcion = $(this).data('descripcion');
            gestionarDescuadre(codigo, descripcion, tables);
        });
    }

    // Inicializar todas las tablas
    const tablesToInit = [
        { id: 'tablaEnProceso', status: 2, title: 'En Seguimiento' },
        { id: 'tablaGestionados', status: 3, title: 'Resueltos' }
    ];

    tablesToInit.forEach(table => {
        initTable(table.id, table.status);
    });

    // Cargar categorías para el filtro
    loadCategorias();

    // Event listener para filtro de categorías
    const categoriaFilter = document.getElementById('categoriaFilter');
    if (categoriaFilter) {
        categoriaFilter.addEventListener('change', function() {
            const categoria = this.value;
            Object.values(tables).forEach(table => {
                table.column(3).search(categoria).draw();
            });
        });
    }
});

// Función para gestionar descuadre
async function gestionarDescuadre(codigo, descripcion, tables) {
    try {
        // Primero obtener los detalles actuales del medicamento
        const detailsResponse = await fetch(`/api/managed/details/${codigo}`);
        if (!detailsResponse.ok) throw new Error('Error al obtener detalles del medicamento');
        const currentDetails = await detailsResponse.json();

        // Luego obtener las listas de estados, categorías y motivos
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
                                    ${currentDetails.id_estado === estado.id_estado ? 'selected' : ''}>
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
                                    ${currentDetails.id_categoria === cat.id_categoria ? 'selected' : ''}>
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
                        <div data-motivos='${JSON.stringify(data.motivos)}' style="display:none"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Observaciones</label>
                        <textarea class="form-control" id="observaciones" rows="3">${currentDetails.observaciones || ''}</textarea>
                    </div>
                </div>
            `,
            didOpen: () => {
                const categoriaSelect = document.getElementById('categoria');
                if (categoriaSelect.value) {
                    actualizarMotivos(categoriaSelect.value, currentDetails.id_motivo);
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
            const gestionData = {
                id_estado: document.getElementById('estado').value,
                id_categoria: document.getElementById('categoria').value,
                id_motivo: document.getElementById('motivo').value,
                observaciones: document.getElementById('observaciones').value
            };

            // Cambiar la ruta a la API de managed
            const updateResponse = await fetch(`/api/managed/update/${codigo}`, {
                method: 'PUT', // Cambiar a PUT para indicar actualización
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gestionData)
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.error || 'Error al actualizar');
            }

            await Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'El descuadre ha sido gestionado correctamente',
                timer: 1500,
                showConfirmButton: false
            });

            // Recargar todas las tablas después de un breve delay
            setTimeout(() => {
                Object.values(tables).forEach(table => {
                    if (table) {
                        table.ajax.reload();
                    }
                });
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al gestionar el descuadre: ' + error.message,
            confirmButtonColor: '#00549F'
        });
    }
}

// Función compartida para actualizar motivos
function actualizarMotivos(categoriaId, motivoSeleccionado = null) {
    const motivosSelect = document.getElementById('motivo');
    motivosSelect.disabled = true;
    motivosSelect.innerHTML = '<option value="">Seleccionar motivo...</option>';

    if (!categoriaId) {
        return;
    }

    const motivos = Array.from(document.querySelectorAll('#swal2-html-container [data-motivos]'))
        .find(el => el)?.dataset.motivos;

    if (motivos) {
        const motivosData = JSON.parse(motivos);
        const motivosFiltrados = motivosData.filter(m => m.id_categoria == categoriaId);

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
    }
}

// Función para mostrar detalles
async function showMedicineDetails(codigo) {
    try {
        const response = await fetch(`/api/managed/details/${codigo}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        const data = await response.json();

        if (!data) throw new Error('No se encontraron detalles');

        Swal.fire({
            title: 'Detalles del Medicamento',
            html: `
                <div class="text-start">
                    <h6 class="mb-3">
                        <i class="bi bi-capsule me-2"></i>${data.descripcion}
                        <br>
                        <small class="text-muted">
                            <i class="bi bi-upc-scan me-2"></i>Código: ${codigo}
                        </small>
                    </h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <tbody>
                                <tr>
                                    <th>Estado actual:</th>
                                    <td>
                                        <span class="badge" style="background-color: ${data.estado_color}">
                                            ${data.estado || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Categoría:</th>
                                    <td>${data.categoria || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <th>Motivo:</th>
                                    <td>${data.motivo || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <th>Observaciones:</th>
                                    <td>${data.observaciones || 'Sin observaciones'}</td>
                                </tr>
                                <tr>
                                    <th>Último descuadre:</th>
                                    <td class="${data.descuadre < 0 ? 'text-danger' : 'text-success'}">
                                        <strong>${data.descuadre}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Fecha última gestión:</th>
                                    <td>${new Date(data.fecha_gestion).toLocaleString('es-ES')}</td>
                                </tr>
                                <tr>
                                    <th>Gestionado por:</th>
                                    <td>${data.usuario || 'N/A'}</td>
                                </tr>
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

// Para actualización de estado
async function actualizarEstado(id, nuevoEstado) {
    try {
        showNotification('info', 'Actualizando estado...', 'top-center');
        
        const response = await fetch('/api/managed/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, estado: nuevoEstado })
        });

        if (!response.ok) {
            throw new Error('Error al actualizar el estado');
        }

        showNotification('success', 'Estado actualizado correctamente');
        // Recargar tabla
        if (dataTable) {
            dataTable.ajax.reload();
        }
    } catch (error) {
        console.error("Error:", error);
        showNotification('error', 'Error al actualizar el estado');
    }
}

// Cargar categorías para el filtro
async function loadCategorias() {
    try {
        const response = await fetch('/api/categorias');
        if (!response.ok) {
            throw new Error('Error al obtener categorías');
        }
        const data = await response.json();
        const select = document.getElementById('categoriaFilter');
        
        if (!select) {
            console.error('Elemento categoriaFilter no encontrado');
            return;
        }
        
        // Limpiar opciones existentes
        select.innerHTML = '<option value="">Todas las categorías</option>';
        
        // Agregar nuevas opciones
        if (data.categorias && Array.isArray(data.categorias)) {
            data.categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.nombre;
                option.textContent = cat.nombre;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Error al cargar categorías: ' + error.message);
    }
}

// Aplicar filtro por categoría
function aplicarFiltroCategorias() {
    const categoria = document.getElementById('categoriaFilter').value;
    Object.values(tables).forEach(table => {
        table.column(3).search(categoria).draw();
    });
}