document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Ingresando...';
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/dashboard';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message,
                confirmButtonColor: '#00549F'
            });
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Ingresar';
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al iniciar sesión',
            confirmButtonColor: '#00549F'
        });
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Ingresar';
    }
});