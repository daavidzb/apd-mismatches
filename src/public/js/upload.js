// Helper functions - definidas fuera del DOMContentLoaded
function getFileDetailClass(file) {
    if (file.error) return 'border-start border-4 border-danger bg-light';
    if (file.medicamentosValidos === 0) return 'border-start border-4 border-warning bg-light';
    return 'border-start border-4 border-success bg-light';
}

function getStatusBadge(file) {
    if (file.error) {
        return `<span class="badge bg-danger">Error</span>`;
    }
    if (file.medicamentosValidos === 0) {
        return `<span class="badge bg-warning">Sin datos válidos</span>`;
    }
    return `<span class="badge bg-success">Procesado</span>`;
}

function getFileDetails(file) {
    if (file.error) {
        return `
            <div class="mt-3">
                <p class="text-danger mb-1">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${file.razon}
                </p>
                ${file.detalles ? `<small class="text-muted">${file.detalles}</small>` : ''}
            </div>
        `;
    }

    return `
        <div class="mt-3">
            <p class="mb-1">
                <i class="bi bi-calendar me-2"></i>
                Fecha: ${new Date(file.fecha).toLocaleDateString()}
            </p>
            <p class="mb-1">
                <i class="bi bi-check-circle me-2"></i>
                Medicamentos válidos: ${file.medicamentosValidos}
            </p>
            ${file.medicamentosInvalidos?.length ? `
                <div class="mt-2">
                    <p class="mb-1 text-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Medicamentos no procesados: ${file.medicamentosInvalidos.length}
                    </p>
                    <div class="small text-muted">
                        ${file.medicamentosInvalidos.map(med => `
                            <div>
                                <strong>${med.codigo || 'Sin código'}</strong> - 
                                ${med.descripcion || 'Sin descripción'} 
                                (${med.razon})
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function displayResults(results) {
    const resultsContainer = document.getElementById('uploadResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = results.map(file => `
        <div class="card mb-3 ${getFileDetailClass(file)}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-file-earmark-excel me-2"></i>
                        ${file.filename}
                    </h5>
                    ${getStatusBadge(file)}
                </div>
                ${getFileDetails(file)}
            </div>
        </div>
    `).join('');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const fileListDiv = document.getElementById('fileList');

    if (!uploadForm || !fileInput) {
        console.error('No se encontraron los elementos necesarios del formulario');
        return;
    }

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('1. Iniciando subida de archivo');
        const files = fileInput.files;
        
        if (!files.length) {
            showNotification('warning', 'Por favor seleccione un archivo');
            return;
        }

        try {
            const formData = new FormData();
            console.log('2. Preparando archivos para subida');
            
            for (let file of files) {
                console.log('   Archivo:', file.name);
                console.log('   Tipo:', file.type);
                console.log('   Tamaño:', file.size, 'bytes');
                formData.append('files', file);
            }

            console.log('3. Enviando archivos al servidor...');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al subir el archivo');
            }

            const result = await response.json();
            console.log('4. Respuesta del servidor:', result);

            showNotification('success', 'Archivo procesado correctamente');
            
            // Mostrar resultados
            if (result.results) {
                displayResults(result.results);
            }

        } catch (error) {
            console.error('Error:', error);
            showNotification('error', `Error al procesar el archivo: ${error.message}`);
        }
    });

    // File input validation
    fileInput.addEventListener('change', function() {
        const files = Array.from(this.files);
        if (files.length) {
            const invalidFiles = files.filter(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                return ext !== 'xlsx' && ext !== 'xls';
            });

            if (invalidFiles.length) {
                showNotification('warning', 'Solo se permiten archivos Excel (.xlsx, .xls)');
                this.value = '';
                fileListDiv.innerHTML = '';
                return;
            }

            fileListDiv.innerHTML = `
                <div class="selected-files-preview">
                    <div class="file-count-badge">
                        <i class="bi bi-file-earmark-excel"></i>
                        <span class="file-count">${files.length}</span>
                        <span class="file-text">${files.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}</span>
                    </div>
                </div>`;
        } else {
            fileListDiv.innerHTML = '';
        }
    });
});

function showFileDetails(filename, fileData) {
    Swal.fire({
        title: `Detalles de ${filename}`,
        html: `
            <div class="text-start">
                <h6 class="mb-3">Medicamentos no válidos:</h6>
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descripción</th>
                                <th>Razón</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fileData.medicamentosInvalidos.map(med => `
                                <tr>
                                    <td>${med.codigo}</td>
                                    <td>${med.descripcion}</td>
                                    <td><span class="badge bg-warning">${med.razon}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `,
        width: '800px',
        showClass: {
            popup: 'animate__animated animate__fadeIn'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOut'
        },
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#00549F',
        didOpen: () => {
            Swal.getPopup().style.zIndex = 1500;
        }
    }).then(() => {
        const mainModal = document.querySelector('.swal2-container');
        if (mainModal) {
            mainModal.style.display = 'flex';
        }
    });
}
