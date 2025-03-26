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

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            showNotification('info', 'Procesando archivo...', 'top-center');
            
            const formData = new FormData(this);
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            const result = await response.json();
            showNotification('success', 'Archivo procesado correctamente');
            
            // Actualizar la tabla si existe
            if (typeof loadReports === 'function') {
                loadReports();
            }
        } catch (error) {
            console.error("Error:", error);
            showNotification('error', `Error al procesar el archivo: ${error.message}`);
        }
    });

    // Para validación de archivo
    fileInput.addEventListener('change', function() {
        if (this.files[0]) {
            const file = this.files[0];
            if (!file.name.endsWith('.xlsx')) {
                showNotification('warning', 'El archivo debe ser de formato Excel (.xlsx)');
                this.value = '';
            }
        }
    });

    // Helper functions
    function getFileDetailClass(file) {
        if (file.error) return 'border-start border-4 border-danger bg-light';
        if (file.medicamentosValidos === 0) return 'border-start border-4 border-warning bg-light';
        return '';
    }

    function getStatusBadge(file) {
        if (file.error) {
            return `
                <span class="badge bg-danger">
                    <i class="bi bi-x-circle-fill"></i>
                    Error
                </span>`;
        }
        if (file.medicamentosValidos === 0) {
            return `
                <span class="badge bg-warning">
                    <i class="bi bi-exclamation-circle-fill"></i>
                    No procesado
                </span>`;
        }
        return `
            <span class="badge bg-success">
                <i class="bi bi-check-circle-fill"></i>
                Procesado
            </span>`;
    }

    function getFileDetails(file) {
        if (file.error) {
            return `<i class="bi bi-info-circle me-1"></i>${file.razon}: ${file.detalles}`;
        }
        if (file.medicamentosValidos === 0) {
            return `<i class="bi bi-info-circle me-1"></i>No se encontraron medicamentos válidos para procesar`;
        }
        return `Medicamentos procesados: ${file.medicamentosValidos}`;
    }
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
