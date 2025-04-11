document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content-wrapper');
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.sidebar .nav-link, .navbar .nav-link');

    if (!sidebarToggle || !sidebar || !navbar) {
        console.error('Elementos necesarios no encontrados');
        return;
    }

    // Agregar títulos para tooltips
    navLinks.forEach(link => {
        const span = link.querySelector('span');
        if (span) {
            link.setAttribute('data-title', span.textContent.trim());
            link.setAttribute('data-bs-toggle', 'tooltip');
            link.setAttribute('data-bs-placement', 'right');
        }
    });

    // Inicializar tooltips para todos los elementos del navbar
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function(tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl, {
            placement: 'right',
            trigger: 'hover',
            container: 'body'
        });
    });

    function toggleSidebar() {
        sidebar.classList.toggle('sidebar-collapsed');
        content.classList.toggle('content-wrapper-collapsed');
        navbar.classList.toggle('navbar-collapsed');

        // Al colapsar, reinicializar tooltips
        if (sidebar.classList.contains('sidebar-collapsed')) {
            tooltipTriggerList.forEach(function(tooltipTriggerEl) {
                const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                if (tooltip) {
                    tooltip.dispose();
                }
                new bootstrap.Tooltip(tooltipTriggerEl, {
                    placement: 'right',
                    trigger: 'hover',
                    container: 'body'
                });
            });
        }

        const icon = sidebarToggle.querySelector('i');
        if (sidebar.classList.contains('sidebar-collapsed')) {
            icon.classList.remove('bi-list');
            icon.classList.add('bi-list-nested');
        } else {
            icon.classList.remove('bi-list-nested');
            icon.classList.add('bi-list');
            // Destruir tooltips cuando se expande
            tooltipTriggerList.forEach(function(tooltipTriggerEl) {
                const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                if (tooltip) {
                    tooltip.dispose();
                }
            });
        }

        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('sidebar-collapsed'));
    }

    // Recuperar estado guardado
    const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isSidebarCollapsed) {
        toggleSidebar();
    }

    // Event listener para el botón
    sidebarToggle.addEventListener('click', toggleSidebar);
});