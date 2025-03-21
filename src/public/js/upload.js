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
        
        Swal.fire({
            title: 'Procesando...',
            text: 'Por favor espere mientras se procesan los archivos',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const formData = new FormData(this);
            const response = await fetch('/upload-files', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (response.ok) {
                const totalArchivos = result.results.length;
                const totalMedicamentos = result.results.reduce((sum, file) => sum + file.medicamentosValidos, 0);
                const totalOmitidos = result.results.filter(f => f.medicamentosInvalidos?.length > 0).length;

                // Modal principal con resumen
                await Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    html: `
                        <div class="text-start">
                            <p><strong>Archivos procesados:</strong> ${totalArchivos}</p>
                            <p><strong>Total medicamentos válidos:</strong> ${totalMedicamentos}</p>
                            <p><strong>Archivos con omisiones:</strong> ${totalOmitidos}</p>
                            <hr>
                            <div class="uploaded-files">
                                ${result.results.map(file => `
                                    <div class="file-detail ${file.medicamentosInvalidos?.length > 0 ? 'has-invalid' : ''}">
                                        <p class="mb-1 d-flex justify-content-between align-items-center">
                                            <strong>${file.filename}</strong>
                                            ${file.medicamentosInvalidos?.length > 0 ? 
                                                `<button class="btn btn-link btn-sm text-warning p-0 view-details" 
                                                    data-filename="${file.filename}"
                                                    data-fileinfo='${JSON.stringify(file)}'>
                                                    <i class="bi bi-exclamation-triangle-fill"></i>
                                                    Ver ${file.medicamentosInvalidos.length} omisiones
                                                </button>` 
                                                : ''}
                                        </p>
                                        <p class="mb-0 small">Medicamentos válidos: ${file.medicamentosValidos}</p>
                                        <p class="mb-0 small text-muted">Fecha: ${new Date(file.fecha).toLocaleString()}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `,
                    width: '600px',
                    confirmButtonColor: '#00549F',
                    allowOutsideClick: false,
                    didOpen: () => {
                        // Agregar listeners para los botones de ver detalles
                        document.querySelectorAll('.view-details').forEach(button => {
                            button.addEventListener('click', (e) => {
                                e.preventDefault();
                                const fileData = JSON.parse(button.dataset.fileinfo);
                                showFileDetails(button.dataset.filename, fileData);
                            });
                        });
                    }
                });

                this.reset();
                fileListDiv.innerHTML = '';
            } else {
                throw new Error(result.error || 'Error al procesar los archivos');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                confirmButtonColor: '#00549F'
            });
        }
    });
});

// Función para mostrar detalles de un archivo
function showFileDetails(filename, fileData) {
    // Modal secundario para mostrar detalles
    Swal.fire({
        title: `Detalles de ${filename}`,
        html: `
            <div class="text-start">
                <h6 class="mb-3">Medicamentos no válidos:</h6>
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-sm">
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
            // Configurar que este modal se muestre sobre el modal principal
            Swal.getPopup().style.zIndex = 1500;
        }
    }).then(() => {
        // Al cerrar el modal de detalles, nos aseguramos que el modal principal siga visible
        const mainModal = document.querySelector('.swal2-container');
        if (mainModal) {
            mainModal.style.display = 'flex';
        }
    });
}