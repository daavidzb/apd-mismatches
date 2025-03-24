document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('excelFiles');
    const fileListDiv = document.getElementById('fileList');

    fileInput.addEventListener('change', function() {
        const files = this.files;
        
        if (files.length > 0) {
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

    uploadForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
        
        try {
            const formData = new FormData(this);
            const response = await fetch('/upload-files', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                const duplicatedFiles = result.results.filter(f => f.error && f.razon === "Ya existe un reporte para esta fecha");
                const processedFiles = result.results.filter(f => !f.error);
                
                await Swal.fire({
                    icon: duplicatedFiles.length > 0 ? 'warning' : 'success',
                    title: duplicatedFiles.length > 0 ? '¡Atención!' : '¡Archivos procesados!',
                    html: `
                        <div class="text-start">
                            ${duplicatedFiles.length > 0 ? `
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    Se encontraron ${duplicatedFiles.length} reportes duplicados
                                </div>
                            ` : ''}
                            <p><strong>Archivos procesados:</strong> ${processedFiles.length}</p>
                            <hr>
                            <div class="uploaded-files">
                                ${result.results.map(file => `
                                    <div class="file-detail ${file.error ? 'border-start border-4 border-warning bg-light' : ''}">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <strong>${file.filename}</strong>
                                            ${file.error ? 
                                                `<span class="badge bg-warning">
                                                    <i class="bi bi-exclamation-triangle-fill"></i>
                                                    Duplicado
                                                </span>` : 
                                                `<span class="badge bg-success">
                                                    <i class="bi bi-check-circle-fill"></i>
                                                    Procesado
                                                </span>`
                                            }
                                        </div>
                                        ${file.error ? 
                                            `<div class="small text-warning">
                                                <i class="bi bi-info-circle me-1"></i>
                                                ${file.detalles}
                                            </div>` :
                                            `<div class="small text-muted">
                                                Medicamentos procesados: ${file.medicamentosValidos}
                                            </div>`
                                        }
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `,
                    width: '600px',
                    confirmButtonColor: '#00549F'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al procesar los archivos',
                confirmButtonColor: '#00549F'
            });
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-cloud-upload"></i> Subir archivos';
            this.reset();
        }
    });
});

// Función para mostrar detalles de un archivo
function showFileDetails(filename, fileData) {
    // Modal secundario para detalles
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
            // Asegurar que este modal aparezca sobre el principal
            Swal.getPopup().style.zIndex = 1500;
        }
    }).then(() => {
        // Al cerrar el modal de detalles, aseguramos que el modal principal siga visible
        const mainModal = document.querySelector('.swal2-container');
        if (mainModal) {
            mainModal.style.display = 'flex';
        }
    });
}