document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: document.querySelector('[name="username"]').value,
                password: document.querySelector('[name="password"]').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: data.message,
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.href = '/';
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
            text: 'Error al iniciar sesión',
            confirmButtonColor: '#00549F'
        });
    }
});