document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: document.querySelector('[name="username"]').value,
                password: document.querySelector('[name="password"]').value,
                nombre: document.querySelector('[name="nombre"]').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Registro exitoso!',
                text: data.message,
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.href = '/auth/login';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message,
                confirmButtonColor: '#00549F'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al registrar usuario',
            confirmButtonColor: '#00549F'
        });
    }
});