// Helper functions - definidas fuera del DOMContentLoaded
function getFileDetailClass(file) {
  if (file.error) return "border-start border-4 border-danger bg-light";
  if (file.medicamentosValidos === 0)
    return "border-start border-4 border-warning bg-light";
  return "border-start border-4 border-success bg-light";
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
                ${
                  file.detalles
                    ? `<small class="text-muted">${file.detalles}</small>`
                    : ""
                }
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
            ${
              file.medicamentosInvalidos?.length
                ? `
                <div class="mt-2">
                    <p class="mb-1 text-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Medicamentos no procesados: ${
                          file.medicamentosInvalidos.length
                        }
                    </p>
                    <div class="small text-muted">
                        ${file.medicamentosInvalidos
                          .map(
                            (med) => `
                            <div>
                                <strong>${
                                  med.codigo || "Sin código"
                                }</strong> - 
                                ${med.descripcion || "Sin descripción"} 
                                (${med.razon})
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;
}

function displayResults(results) {
  const resultsContainer = document.getElementById("uploadResults");
  if (!resultsContainer) return;

  resultsContainer.innerHTML = results
    .map(
      (file) => `
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
    `
    )
    .join("");
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function () {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const uploadForm = document.getElementById("uploadForm");
  const selectedFilesContainer = document.getElementById("selectedFiles");
  const filesList = document.getElementById("filesList");
  const uploadButton = document.getElementById("uploadButton");
  let files = new Set();

  if (!dropZone || !fileInput || !uploadForm || !selectedFilesContainer || !filesList || !uploadButton) {
    console.error('No se encontraron todos los elementos necesarios');
    return;
  }

  // Hacer clic en la zona activa el input
  dropZone.addEventListener("click", (e) => {
    if (e.target === dropZone || e.target.closest('.drop-icon')) {
      fileInput.click();
    }
  });

  // Funciones auxiliares
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const updateFileList = () => {
    const filesList = document.getElementById('filesList');
    const emptyState = document.getElementById('emptyState');
    const filesContainer = document.querySelector('.selected-files-container');
    const fileCount = document.getElementById('fileCount');
    const uploadButton = document.getElementById('uploadButton');
  
    if (files.size === 0) {
      filesList.classList.add('d-none');
      emptyState.classList.remove('d-none');
      uploadButton.disabled = true;
      return;
    }
  
    filesList.classList.remove('d-none');
    emptyState.classList.add('d-none');
    uploadButton.disabled = false;
    
    fileCount.textContent = files.size;
    filesContainer.innerHTML = Array.from(files)
      .map(file => `
        <div class="file-item" data-filename="${file.name}">
          <div class="file-icon">
            <i class="bi bi-file-earmark-excel text-success"></i>
          </div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
          </div>
          <button class="btn btn-link remove-file p-2" data-filename="${file.name}">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      `).join('');
  };

  const handleFiles = (fileList) => {
    const validFiles = Array.from(fileList).filter((file) => {
        // Lista de tipos MIME válidos
        const validMimeTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/excel',
            'application/x-excel',
            'application/x-msexcel'
        ];

        // Verificar extensión
        const ext = file.name.toLowerCase().split('.').pop();
        const isValidExt = ['xlsx', 'xls'].includes(ext);

        // Verificar tipo MIME o extensión
        const isValid = validMimeTypes.includes(file.type) || isValidExt;

        if (!isValid) {
            Swal.fire({
                icon: "error",
                title: "Archivo no válido",
                text: `${file.name} no es un archivo Excel válido (.xlsx, .xls)`,
                confirmButtonColor: "#00549F"
            });
        }
        return isValid;
    });

    validFiles.forEach((file) => files.add(file));
    updateFileList();
  };

  // Event Listeners para Drag & Drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  // Event Listener para selección manual
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  // Event Listener para eliminar archivos
  filesList.addEventListener("click", (e) => {
    const removeButton = e.target.closest(".remove-file");
    if (removeButton) {
      const fileName = removeButton.dataset.filename;
      files = new Set([...files].filter((file) => file.name !== fileName));
      updateFileList();
    }
  });

  // Event Listener para el formulario
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (files.size === 0) {
        Swal.fire({
            icon: "warning",
            title: "Sin archivos",
            text: "Por favor, selecciona al menos un archivo para subir",
            confirmButtonColor: "#00549F"
        });
        return;
    }

    try {
        uploadButton.disabled = true;
        uploadButton.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Procesando...
        `;

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file); // Cambiar a 'files' sin corchetes
        });

        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al procesar los archivos');
        }

        const result = await response.json();

        // Procesar resultados
        const successful = result.results.filter(r => r.status === 'success');
        const duplicates = result.results.filter(r => r.status === 'duplicate');
        const errors = result.results.filter(r => r.status === 'error');

        // Mostrar resultados
        await Swal.fire({
            title: 'Resultado del procesamiento',
            html: `
                <div class="text-start">
                    ${successful.length > 0 ? `
                        <div class="mb-3">
                            <h6 class="text-success">
                                <i class="bi bi-check-circle me-2"></i>
                                Archivos procesados (${successful.length})
                            </h6>
                            <ul class="list-unstyled">
                                ${successful.map(file => `
                                    <li>
                                        <small>${file.fileName}</small>
                                        ${file.detalles ? `
                                            <span class="text-muted">- ${file.detalles}</span>
                                        ` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${duplicates.length > 0 ? `
                        <div class="mb-3">
                            <h6 class="text-warning">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                Archivos duplicados (${duplicates.length})
                            </h6>
                            <ul class="list-unstyled">
                                ${duplicates.map(file => `
                                    <li>
                                        <small>${file.fileName}</small>
                                        ${file.detalles ? `
                                            <span class="text-muted">- ${file.detalles}</span>
                                        ` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${errors.length > 0 ? `
                        <div>
                            <h6 class="text-danger">
                                <i class="bi bi-x-circle me-2"></i>
                                Archivos con errores (${errors.length})
                            </h6>
                            <ul class="list-unstyled">
                                ${errors.map(file => `
                                    <li>
                                        <small>${file.fileName}</small>
                                        <span class="text-danger">- ${file.razon || 'Error desconocido'}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `,
            icon: errors.length > 0 ? 'error' : duplicates.length > 0 ? 'warning' : 'success',
            confirmButtonColor: '#00549F',
            width: '600px'
        });

        // Limpiar solo los archivos procesados exitosamente
        if (successful.length > 0) {
            files = new Set([...files].filter(file => 
                !successful.some(s => s.fileName === file.name)
            ));
            updateFileList();
        }

    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al procesar los archivos',
            confirmButtonColor: '#00549F'
        });
    } finally {
        uploadButton.disabled = false;
        uploadButton.innerHTML = '<i class="bi bi-upload me-2"></i>Subir archivos';
    }
  });

  // Inicialización
  updateFileList();
});

// Función para mostrar resultados de la subida
function showUploadResults(successful, duplicates) {
    return Swal.fire({
        title: 'Resultado del procesamiento',
        html: `
            <div class="text-start">
                ${successful.length > 0 ? `
                    <div class="mb-3">
                        <h6 class="text-success">
                            <i class="bi bi-check-circle me-2"></i>
                            Archivos procesados (${successful.length})
                        </h6>
                        <ul class="list-unstyled">
                            ${successful.map(file => `
                                <li><small>${file.fileName}</small></li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${duplicates.length > 0 ? `
                    <div>
                        <h6 class="text-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Archivos duplicados (${duplicates.length})
                        </h6>
                        <ul class="list-unstyled">
                            ${duplicates.map(file => `
                                <li>
                                    <small>
                                        ${file.fileName} 
                                        <span class="text-muted">
                                            (existente del ${new Date(file.date).toLocaleDateString()})
                                        </span>
                                    </small>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `,
        icon: duplicates.length > 0 ? 'warning' : 'success',
        confirmButtonColor: '#00549F',
        width: '500px'
    });
}

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
                            ${fileData.medicamentosInvalidos
                              .map(
                                (med) => `
                                <tr>
                                    <td>${med.codigo}</td>
                                    <td>${med.descripcion}</td>
                                    <td><span class="badge bg-warning">${med.razon}</span></td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `,
    width: "800px",
    showClass: {
      popup: "animate__animated animate__fadeIn",
    },
    hideClass: {
      popup: "animate__animated animate__fadeOut",
    },
    confirmButtonText: "Cerrar",
    confirmButtonColor: "#00549F",
    didOpen: () => {
      Swal.getPopup().style.zIndex = 1500;
    },
  }).then(() => {
    const mainModal = document.querySelector(".swal2-container");
    if (mainModal) {
      mainModal.style.display = "flex";
    }
  });
}

document.addEventListener("DOMContentLoaded", function() {
  // Elementos del DOM
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const uploadForm = document.getElementById("uploadForm");
  const filesList = document.getElementById("filesList");
  const emptyState = document.getElementById("emptyState");
  const uploadButton = document.getElementById("uploadButton");
  const filesContainer = document.querySelector(".selected-files-container");
  const fileCount = document.getElementById("fileCount");
  
  let files = new Set();

  // Funciones auxiliares
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const updateFileList = () => {
    if (files.size === 0) {
      filesList.classList.add('d-none');
      emptyState.classList.remove('d-none');
      uploadButton.disabled = true;
      return;
    }

    filesList.classList.remove('d-none');
    emptyState.classList.add('d-none');
    uploadButton.disabled = false;
    
    fileCount.textContent = files.size;
    filesContainer.innerHTML = Array.from(files)
      .map(file => `
        <div class="file-item" data-filename="${file.name}">
          <div class="file-icon">
            <i class="bi bi-file-earmark-excel text-success"></i>
          </div>
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
          </div>
          <button class="btn btn-link remove-file p-2" data-filename="${file.name}">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      `).join('');
  };

  const handleFiles = (fileList) => {
    const validFiles = Array.from(fileList).filter(file => {
      const validMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      const ext = file.name.toLowerCase().split('.').pop();
      const isValidExt = ['xlsx', 'xls'].includes(ext);
      
      if (!validMimeTypes.includes(file.type) && !isValidExt) {
        Swal.fire({
          icon: "error",
          title: "Archivo no válido",
          text: `${file.name} no es un archivo Excel válido (.xlsx, .xls)`,
          confirmButtonColor: "#00549F"
        });
        return false;
      }
      return true;
    });

    validFiles.forEach(file => files.add(file));
    updateFileList();
  };

  // Event listeners
  dropZone.addEventListener("click", (e) => {
    if (e.target === dropZone || e.target.closest('.drop-icon')) {
      fileInput.click();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  filesList.addEventListener("click", (e) => {
    const removeButton = e.target.closest(".remove-file");
    if (removeButton) {
      const fileName = removeButton.dataset.filename;
      files = new Set([...files].filter(file => file.name !== fileName));
      updateFileList();
    }
  });

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (files.size === 0) {
      Swal.fire({
        icon: "warning",
        title: "Sin archivos",
        text: "Por favor, selecciona al menos un archivo para subir",
        confirmButtonColor: "#00549F"
      });
      return;
    }

    try {
      uploadButton.disabled = true;
      uploadButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Procesando...
      `;

      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar los archivos');
      }

      const result = await response.json();
      const successful = result.results.filter(r => r.status === 'success');
      const duplicates = result.results.filter(r => r.status === 'duplicate');
      const errors = result.results.filter(r => r.status === 'error');

      await showResults(successful, duplicates, errors);

      if (successful.length > 0) {
        files = new Set([...files].filter(file => 
          !successful.some(s => s.fileName === file.name)
        ));
        updateFileList();
      }

    } catch (error) {
      console.error('Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al procesar los archivos',
        confirmButtonColor: '#00549F'
      });
    } finally {
      uploadButton.disabled = false;
      uploadButton.innerHTML = '<i class="bi bi-upload me-2"></i>Procesar archivos';
    }
  });
});

function showResults(successful, duplicates, errors) {
  let totalMedicamentos = 0;
  successful.forEach(file => {
    totalMedicamentos += file.medicamentosValidos || 0;
  });

  return Swal.fire({
    title: 'Resultado del procesamiento',
    html: `
      <div class="text-start p-3">
        <div class="alert alert-success mb-4">
          <div class="d-flex align-items-center">
            <i class="bi bi-check-circle-fill fs-4 me-3"></i>
            <div>
              <h6 class="mb-1">Resumen del proceso</h6>
              <div>Total medicamentos procesados: ${totalMedicamentos}</div>
            </div>
          </div>
        </div>

        ${successful.length > 0 ? `
          <div class="mb-4">
            <h6 class="text-success d-flex align-items-center">
              <i class="bi bi-check-circle me-2"></i>
              Archivos procesados (${successful.length})
            </h6>
            <div class="list-group">
              ${successful.map(file => `
                <div class="list-group-item bg-light border-0 py-2">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <i class="bi bi-file-earmark-excel text-success me-2"></i>
                      <small>${file.fileName}</small>
                    </div>
                    <span class="badge bg-success rounded-pill">
                      ${file.medicamentosValidos || 0} medicamentos
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${duplicates.length > 0 ? `
          <div class="mb-4">
            <h6 class="text-warning d-flex align-items-center">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Archivos duplicados (${duplicates.length})
            </h6>
            <div class="list-group">
              ${duplicates.map(file => `
                <div class="list-group-item bg-light border-0 py-2">
                  <small>${file.fileName} - ${file.detalles || ''}</small>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${errors.length > 0 ? `
          <div>
            <h6 class="text-danger d-flex align-items-center">
              <i class="bi bi-x-circle me-2"></i>
              Archivos con errores (${errors.length})
            </h6>
            <div class="list-group">
              ${errors.map(file => `
                <div class="list-group-item bg-light border-0 py-2">
                  <div class="d-flex justify-content-between align-items-start">
                    <small>${file.fileName}</small>
                    <small class="text-danger">${file.razon || 'Error desconocido'}</small>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `,
    icon: 'success', // Siempre success ya que el proceso se completó
    confirmButtonColor: '#00549F',
    width: '600px',
    padding: '2rem'
  });
}
