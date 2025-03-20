document.addEventListener('DOMContentLoaded', function() {
    const configBase = {
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        processing: true,
        pageLength: 10,
        responsive: true,
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip'
    };

    const columnasBase = [
        { data: 'codigo_med', title: 'Código' },
        { data: 'descripcion', title: 'Descripción' },
        { 
            data: 'descuadre',
            title: 'Descuadre',
            render: function(data) {
                const colorClass = data < 0 ? 'text-danger' : 'text-success';
                return `<span class="${colorClass}">${data}</span>`;
            }
        },
        { 
            data: 'fecha_gestion',
            title: 'Fecha gestión',
            render: function(data) {
                return data ? new Date(data).toLocaleString('es-ES') : '-';
            }
        },
        { data: 'usuario', title: 'Gestionado por', defaultContent: '-' },
        { data: 'categoria', title: 'Categoría', defaultContent: '-' },
        { data: 'motivo', title: 'Motivo', defaultContent: '-' },
        { 
            data: 'observaciones',
            title: 'Observaciones',
            render: function(data) {
                return data || '-';
            }
        },
        {
            data: null,
            title: 'Acciones',
            render: function(data) {
                return `
                    <button class="btn btn-primary btn-sm gestionar"
                            data-codigo="${data.codigo_med}"
                            data-descripcion="${data.descripcion}">
                        <i class="bi bi-pencil-square"></i> Gestionar
                    </button>`;
            }
        }
    ];

    let tables = {};

    // Función para inicializar tabla
    function initTable(tabId, status) {
        if (tables[tabId]) {
            tables[tabId].destroy();
        }

        tables[tabId] = new DataTable(`#${tabId}`, {
            ...configBase,
            ajax: {
                url: `/api/managed/${status}`,
                dataSrc: 'managed',
                beforeSend: function() {
                    $(`#${tabId}`).closest('.tab-pane').find('.loader-container').show();
                },
                complete: function() {
                    $(`#${tabId}`).closest('.tab-pane').find('.loader-container').hide();
                }
            },
            columns: columnasBase,
            drawCallback: function() {
                this.api().columns.adjust();
            }
        });

        // Agregar evento de gestionar para cada tabla
        $(`#${tabId}`).on('click', '.gestionar', function() {
            const codigo = $(this).data('codigo');
            const descripcion = $(this).data('descripcion');
            gestionarDescuadre(codigo, descripcion);
        });
    }

    // Inicializar todas las tablas al cargar
    const tablesToInit = [
        { id: 'tablaPendientes', status: 1 },
        { id: 'tablaEnProceso', status: 2 },
        { id: 'tablaGestionados', status: 3 }
    ];

    tablesToInit.forEach(table => {
        initTable(table.id, table.status);
    });

    // Manejar cambios de pestaña
    $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function(e) {
        const target = $(e.target).attr('data-bs-target').substring(1);
        let tableId;

        switch(target) {
            case 'descuadres':
                tableId = 'tablaPendientes';
                break;
            case 'enProceso':
                tableId = 'tablaEnProceso';
                break;
            case 'gestionados':
                tableId = 'tablaGestionados';
                break;
        }

        if (tables[tableId]) {
            tables[tableId].columns.adjust();
            tables[tableId].ajax.reload(null, false);
        }
    });

    // Actualizar tablas cada 5 minutos
    setInterval(() => {
        Object.values(tables).forEach(table => {
            if (table) {
                table.ajax.reload(null, false);
            }
        });
    }, 300000);
});

// Función para gestionar descuadre
async function gestionarDescuadre(codigo, descripcion) {
    try {
        const response = await fetch(`/api/managed/details/${codigo}`);
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
            const formData = {
                id_estado: document.getElementById('estado').value,
                id_categoria: document.getElementById('categoria').value,
                observaciones: document.getElementById('observaciones').value
            };

            const saveResponse = await fetch(`/api/managed/update/${codigo}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (saveResponse.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: 'El descuadre ha sido gestionado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Recargar todas las tablas
                Object.values(tables).forEach(table => {
                    if (table) {
                        table.ajax.reload();
                    }
                });
            }
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