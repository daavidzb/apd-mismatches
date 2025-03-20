document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('excelFiles');
    const fileListDiv = document.getElementById('fileList');

    fileInput.addEventListener('change', function(event) {
        fileListDiv.innerHTML = '';
        const fileCount = event.target.files.length;
        
        if (fileCount > 0) {
            const fileIcon = document.createElement('div');
            fileIcon.classList.add('file-icon');
            fileIcon.innerHTML = '<i class="bi bi-file-earmark-excel-fill"></i>';
            
            const fileText = document.createElement('span');
            fileText.textContent = `${fileCount} archivo(s) seleccionado(s)`;
            
            fileListDiv.appendChild(fileIcon);
            fileListDiv.appendChild(fileText);
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
                const totalMedicamentos = result.results.reduce((sum, file) => sum + file.totalMedicamentos, 0);

                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    html: `
                        <div class="text-start">
                            <p><strong>Archivos procesados:</strong> ${totalArchivos}</p>
                            <p><strong>Total medicamentos válidos:</strong> ${totalMedicamentos}</p>
                            <p class="text-muted small">(Se han excluido los medicamentos donde FarmaTools o ArmarioAPD son "No existe")</p>
                            <hr>
                            <p><strong>Detalle por archivo:</strong></p>
                            ${result.results.map(file => `
                                <div class="mb-2">
                                    <p class="mb-1"><strong>${file.filename}</strong></p>
                                    <p class="mb-0 small">Medicamentos válidos: ${file.totalMedicamentos}</p>
                                    <p class="mb-0 small text-muted">Fecha: ${new Date(file.fecha).toLocaleString()}</p>
                                </div>
                            `).join('')}
                        </div>
                    `,
                    confirmButtonColor: '#00549F',
                    width: '600px'
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