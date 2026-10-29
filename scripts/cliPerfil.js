// Funciones auxiliares para abrir y cerrar modales
    function mostrarModal(id) {
        document.getElementById(id).classList.add('activo');
    }
    
    function cerrarModal(id) {
        document.getElementById(id).classList.remove('activo');
    }

    document.querySelector('.formulario-perfil').addEventListener('submit', function(e) {
        e.preventDefault(); // Evitamos que la página se recargue

        const exitoEnBackend = true; 

        if (exitoEnBackend) {
            mostrarModal('modalExito');
            
            // Espera 2.5 segundos y luego te regresa al dashboard
            setTimeout(() => {
                window.location.href = '../dashboard.html';
            }, 2500);
        } else {
            mostrarModal('modalError');
        }
    });

    // 2. Lógica para el cambio de fotografía
    document.getElementById('inputAvatar').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Actualiza la foto grande
                document.getElementById('avatarPreview').src = e.target.result;
                
                // Intenta actualizar la miniatura del header si existe
                const avatarHeader = document.getElementById('avatarHeader');
                if (avatarHeader) avatarHeader.src = e.target.result;
                
                // Muestra la notificación de que la foto se cambió
                mostrarModal('modalFoto');
                
                // Cierra la notificación automáticamente después de 2 segundos
                setTimeout(() => {
                    cerrarModal('modalFoto');
                }, 2000);
            }
            reader.readAsDataURL(file);
        }
    });