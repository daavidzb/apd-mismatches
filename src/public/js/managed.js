document.addEventListener('DOMContentLoaded', function() {
    initializeManagedTables();
});

async function initializeManagedTables() {
    const pendingTable = initializeTable('pendingTable', 'Pendiente');
    const inprocessTable = initializeTable('inprocessTable', 'En proceso');
    const completedTable = initializeTable('completedTable', 'Corregido');

    
    await loadTableData(pendingTable, 'Pendiente');
    await loadTableData(inprocessTable, 'En proceso');
    await loadTableData(completedTable, 'Corregido');
}

function initializeTable(tableId, status) {
    return new DataTable(`#${tableId}`, {
        columns: [
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
            { data: 'categoria', title: 'Categoría' },
            { data: 'motivo', title: 'Motivo' },
            { 
                data: 'fecha_actualizacion',
                title: 'Última actualización',
                render: function(data) {
                    return new Date(data).toLocaleString('es-ES');
                }
            },
            {
                data: null,
                title: 'Acciones',
                render: function(data) {
                    return `
                        <button class="btn btn-primary btn-sm editar-gestion" data-codigo="${data.codigo_med}">
                            <i class="bi bi-pencil"></i> Editar
                        </button>`;
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        order: [[5, 'desc']]
    });
}

async function loadTableData(table, status) {
    try {
        const response = await fetch(`/api/managed/${status}`);
        if (!response.ok) throw new Error('Error al cargar los datos');
        
        const data = await response.json();
        table.clear().rows.add(data.mismatches).draw();
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