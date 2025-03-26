// Función para mostrar notificaciones
function showNotification(type, message, position = 'top-end') {
    const Toast = Swal.mixin({
        toast: true,
        position: position,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#fff',
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        },
        // Eliminar el overlay oscuro
        backdrop: false,
        // Ajustar el z-index para que aparezca por encima sin el overlay
        customClass: {
            container: 'position-fixed',
            popup: 'swal2-toast-custom'
        }
    });

    Toast.fire({
        icon: type,
        title: message
    });
}

// Ejemplo de uso:
// showNotification('success', 'Datos guardados correctamente');
// showNotification('error', 'Error al procesar la solicitud');
// showNotification('warning', 'Archivo no soportado');
// showNotification('info', 'Procesando datos...');