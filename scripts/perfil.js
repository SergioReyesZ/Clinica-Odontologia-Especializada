document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener usuario autenticado
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return window.location.href = '../index.html';

    // 2. Traer datos de la base de datos
    const { data: userData } = await client.from('Usuarios').select('*').eq('id', user.id).single();

    if (userData) {
        // Cargar inputs
        document.getElementById('perfil-nombre').value = userData.nombre || '';
        document.getElementById('perfil-apellido').value = userData.apellido || '';
        document.getElementById('perfil-telefono').value = userData.telefono || '';
        document.getElementById('perfil-fecha-nac').value = userData.fecha_nac || '';
        document.getElementById('perfil-correo').value = user.email || '';
        
        // Cargar tarjeta izquierda
        document.getElementById('perfil-nombre-display').textContent = `${userData.nombre || ''} ${userData.apellido || ''}`;
        if (userData.avatar) document.getElementById('avatarPreview').src = userData.avatar;

        // Asignar el Rol basado en el ID
        const roles = { 1: 'Administrador', 2: 'Odontólogo', 3: 'Recepcionista' };
        document.getElementById('perfil-rol-display').textContent = roles[userData.id_rol] || 'Cliente';
    }

    // 3. Subir y cambiar foto de perfil en caliente
    document.getElementById('inputAvatar').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Mostrar la previsualización al instante
        document.getElementById('avatarPreview').src = URL.createObjectURL(file);

        // Subir a Storage (Asegúrate de tener un bucket público llamado 'avatares' en Supabase)
        const filePath = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await client.storage.from('avatares').upload(filePath, file);

        if (!uploadError) {
            // Actualizar la URL en la tabla Usuarios
            const { data } = client.storage.from('avatares').getPublicUrl(filePath);
            await client.from('Usuarios').update({ avatar: data.publicUrl }).eq('id', user.id);
            
            document.getElementById('modalFoto').classList.add('activo');
            setTimeout(() => document.getElementById('modalFoto').classList.remove('activo'), 2000);
        }
    });

    // 4. Guardar los cambios del formulario
    document.getElementById('formPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pass1 = document.getElementById('perfil-password').value;
        const pass2 = document.getElementById('perfil-password-confirm').value;

        // Comprobación rápida de contraseñas
        if (pass1 && pass1 !== pass2) {
            document.getElementById('modalError').querySelector('h3').textContent = 'Las contraseñas no coinciden';
            document.getElementById('modalError').classList.add('activo');
            return;
        }

        const btn = document.getElementById('btnGuardarPerfil');
        btn.disabled = true;

        try {
            // Actualizar tabla Usuarios
            await client.from('Usuarios').update({
                nombre: document.getElementById('perfil-nombre').value.trim(),
                apellido: document.getElementById('perfil-apellido').value.trim(),
                telefono: document.getElementById('perfil-telefono').value.trim()
            }).eq('id', user.id);

            // Actualizar contraseña en Auth (solo si escribió algo)
            if (pass1) {
                await client.auth.updateUser({ password: pass1 });
            }

            document.getElementById('modalExito').classList.add('activo');
            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            document.getElementById('modalError').classList.add('activo');
        } finally {
            btn.disabled = false;
        }
    });
});

// Función para cerrar el modal de error
window.cerrarModal = function(id) {
    document.getElementById(id).classList.remove('activo');
};