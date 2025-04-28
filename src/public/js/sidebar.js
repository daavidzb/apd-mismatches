document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content-wrapper');
    const navbar = document.querySelector('.navbar');

    if (!sidebarToggle || !sidebar || !navbar) {
        console.error('Elementos necesarios no encontrados');
        return;
    }

    // Eliminar código de tooltips y simplificar
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-collapsed');
        content.classList.toggle('content-wrapper-collapsed');
        navbar.classList.toggle('navbar-collapsed');

        const icon = sidebarToggle.querySelector('i');
        if (sidebar.classList.contains('sidebar-collapsed')) {
            icon.classList.remove('bi-list');
            icon.classList.add('bi-list-nested');
        } else {
            icon.classList.remove('bi-list-nested');
            icon.classList.add('bi-list');
        }
    });
});