
document.addEventListener('DOMContentLoaded', async () => {

    const $ = (id) => document.getElementById(id);

    document.querySelectorAll('.campo-contrasena .ojo').forEach(boton => {
        boton.addEventListener('click', () => {
            const input = boton.closest('.campo-contrasena').querySelector('input');
            const mostrar = input.type === 'password';

            input.type = mostrar ? 'text' : 'password';
            boton.querySelector('.bi-eye').style.display = mostrar ? 'none' : 'inline';
            boton.querySelector('.bi-eye-slash').style.display = mostrar ? 'inline' : 'none';
        });
    });


    // ==========================================
    // VALIDACIONES DE NOMBRE, APELLIDO Y TELÉFONO
    // ==========================================

    const camposTexto = [
        $('perfil-nombre'),
        $('perfil-apellido')
    ];

    camposTexto.forEach(input => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(
                /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g,
                ''
            );
        });
    });

    const inputTelefono = $('perfil-telefono');

    inputTelefono.addEventListener('input', () => {
        inputTelefono.value = inputTelefono.value.replace(/[^0-9]/g, '');
    });

    function esTelefonoValido(tel) {
        const regexBase = /^[2-9]\d{9}$/;

        if (!regexBase.test(tel)) return false;
        if (/^(\d)\1{9}$/.test(tel)) return false;

        const falsosComunes = [
            "1234567890",
            "0123456789",
            "9876543210",
            "1231231234",
            "1234567891",
            "0000000000"
        ];

        return !falsosComunes.includes(tel);
    }

    const avatarPreview = $('avatarPreview');
    const inputAvatar = $('inputAvatar');
    const modalFoto = $('modalFoto');
    const modalError = $('modalError');

    let usuarioActual = null;

    function mostrarError(mensaje) {
        modalError.querySelector('h3').textContent = mensaje;
        modalError.classList.add('activo');
    }

    function mostrarModalFoto() {
        modalFoto.classList.add('activo');
        setTimeout(() => modalFoto.classList.remove('activo'), 2000);
    }

    // ==========================================
    // 1. OBTENER USUARIO AUTENTICADO
    // ==========================================

    const { data: { user }, error: authError } =
        await client.auth.getUser();

    if (authError || !user) {
        window.location.replace('../index.html');
        return;
    }

    // ==========================================
    // 2. CONSULTAR DATOS DEL USUARIO
    // ==========================================

    const { data: userData, error: userError } = await client
        .from('Usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

    if (userError || !userData) {
        console.error('Error al consultar el perfil:', userError);
        mostrarError('No se pudieron cargar tus datos.');
        return;
    }

    usuarioActual = user;

    // ==========================================
    // 3. CARGAR INFORMACIÓN PERSONAL
    // ==========================================

    $('perfil-nombre').value = userData.nombre || '';
    $('perfil-apellido').value = userData.apellido || '';
    $('perfil-telefono').value = userData.telefono || '';
    $('perfil-fecha-nac').value = userData.fecha_nac || '';
    $('perfil-correo').value = user.email || '';

    $('perfil-nombre-display').textContent =
        `${userData.nombre || ''} ${userData.apellido || ''}`.trim();

    if (userData.avatar) {
        avatarPreview.src = userData.avatar;
    }

    // ==========================================
    // 4. MOSTRAR ROL CORRECTAMENTE
    // ==========================================

    // Compatible con la columna "rol" o "id_rol"
    const rolId = Number(userData.rol ?? userData.id_rol);

    const roles = {
        1: 'Cliente',
        2: 'Administrador',
        3: 'Odontólogo'
    };

    $('perfil-rol-display').textContent =
        roles[rolId] || 'Rol no identificado';

    console.log('ID del rol:', rolId);

    // ==========================================
    // 5. ACTUALIZAR FOTO DE PERFIL CON RECORTE
    // ==========================================

    const modalCropper = $('modalCropper');
    const imagenCropper = $('imagenCropper');
    const zoomCropper = $('zoomCropper');

    const btnAceptarCropper = $('aceptarCropper');
    const btnCancelarCropper = $('cancelarCropper');
    const btnCerrarCropper = $('cerrarCropper');

    let cropper = null;
    let imagenTemporal = null;
    let archivoSeleccionado = null;
    let ultimoZoom = 50;

    // Destruir recortador y liberar imagen temporal
    function cerrarCropper() {

        modalCropper.classList.remove('activo');

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        if (imagenTemporal) {
            URL.revokeObjectURL(imagenTemporal);
            imagenTemporal = null;
        }

        imagenCropper.removeAttribute('src');
        archivoSeleccionado = null;
        inputAvatar.value = '';
        zoomCropper.value = 50;
        ultimoZoom = 50;

        btnAceptarCropper.disabled = false;
        btnAceptarCropper.innerHTML =
            '<i class="bi bi-check-lg"></i> Aceptar cambios';
    }

    // Abrir selector de fotografía
    inputAvatar.addEventListener('change', (e) => {

        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            mostrarError('Selecciona una imagen válida.');
            inputAvatar.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            mostrarError('La imagen no debe superar los 2 MB.');
            inputAvatar.value = '';
            return;
        }

        archivoSeleccionado = file;

        imagenTemporal = URL.createObjectURL(file);

        modalCropper.classList.add('activo');

        imagenCropper.onload = () => {

            if (cropper) {
                cropper.destroy();
            }

            cropper = new Cropper(imagenCropper, {

                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',

                autoCropArea: 0.85,

                movable: true,
                zoomable: true,
                zoomOnWheel: true,
                zoomOnTouch: true,

                cropBoxMovable: false,
                cropBoxResizable: false,

                guides: true,
                center: true,
                background: false,
                responsive: true,

                ready() {
                    zoomCropper.value = 50;
                    ultimoZoom = 50;
                }

            });
        };

        imagenCropper.src = imagenTemporal;

    });

    // Control de zoom
    zoomCropper.addEventListener('input', () => {

        if (!cropper) return;

        const nuevoZoom = Number(zoomCropper.value);

        const diferencia = (nuevoZoom - ultimoZoom) / 100;

        cropper.zoom(diferencia);

        ultimoZoom = nuevoZoom;

    });

    // Cancelar recorte
    btnCancelarCropper.addEventListener('click', cerrarCropper);
    btnCerrarCropper.addEventListener('click', cerrarCropper);

    // Aceptar recorte y guardar
    btnAceptarCropper.addEventListener('click', async () => {

        if (!cropper || !archivoSeleccionado) return;

        btnAceptarCropper.disabled = true;
        btnAceptarCropper.innerHTML =
            '<i class="bi bi-arrow-repeat"></i> Guardando...';

        try {

            // Obtener imagen cuadrada de 512 x 512
            const canvas = cropper.getCroppedCanvas({

                width: 512,
                height: 512,

                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'

            });

            // Convertir recorte a archivo JPEG
            const blob = await new Promise((resolve, reject) => {

                canvas.toBlob((resultado) => {

                    if (resultado) {
                        resolve(resultado);
                    } else {
                        reject(new Error('No se pudo procesar la imagen.'));
                    }

                }, 'image/jpeg', 0.90);

            });

            const archivoRecortado = new File(
                [blob],
                'avatar.jpg',
                { type: 'image/jpeg' }
            );

            // Guardar URL anterior
            const avatarAnterior = userData.avatar;

            // Crear ruta nueva
            const nuevoPath =
                `${usuarioActual.id}/${Date.now()}.jpg`;

            // 1. Subir fotografía recortada
            const { error: uploadError } = await client.storage
                .from('avatares')
                .upload(nuevoPath, archivoRecortado, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: publicData } = client.storage
                .from('avatares')
                .getPublicUrl(nuevoPath);

            const avatarURL = publicData.publicUrl;

            // 2. Actualizar base de datos
            const { error: updateError } = await client
                .from('Usuarios')
                .update({ avatar: avatarURL })
                .eq('id', usuarioActual.id);

            if (updateError) {

                // Si falla la BD, eliminar la imagen nueva
                await client.storage
                    .from('avatares')
                    .remove([nuevoPath]);

                throw updateError;
            }

            // 3. Actualizar información local
            userData.avatar = avatarURL;
            avatarPreview.src = avatarURL;

            // 4. Eliminar fotografía anterior
            if (avatarAnterior) {

                const marcador =
                    '/storage/v1/object/public/avatares/';

                if (avatarAnterior.includes(marcador)) {

                    const rutaAnterior = decodeURIComponent(
                        avatarAnterior.split(marcador)[1].split('?')[0]
                    );

                    if (rutaAnterior !== nuevoPath) {

                        const { error: deleteError } = await client.storage
                            .from('avatares')
                            .remove([rutaAnterior]);

                        if (deleteError) {
                            console.error(
                                'No se pudo eliminar la foto anterior:',
                                deleteError
                            );
                        }
                    }
                }
            }

            // Cerrar recortador
            cerrarCropper();

            // Mostrar confirmación
            mostrarModalFoto();

        } catch (error) {

            console.error('Error al guardar fotografía:', error);

            btnAceptarCropper.disabled = false;
            btnAceptarCropper.innerHTML =
                '<i class="bi bi-check-lg"></i> Aceptar cambios';

            mostrarError(
                `No se pudo guardar la fotografía: ${error.message || 'Error desconocido'}`
            );

        }

    });


    // ==========================================
    // 6. GUARDAR CAMBIOS DEL PERFIL
    // ==========================================



    $('formPerfil').addEventListener('submit', evitarDobleEnvio(async (e) => {
        e.preventDefault();

        const passActual = $('perfil-password-actual').value;
        const pass1 = $('perfil-password').value;
        const pass2 = $('perfil-password-confirm').value;

        const nombre = $('perfil-nombre').value.trim();
        const apellido = $('perfil-apellido').value.trim();
        const telefono = $('perfil-telefono').value.trim();

        // Validar nombre y apellidos
        const regexNombre = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]{2,30}$/;

        if (!regexNombre.test(nombre) || !regexNombre.test(apellido)) {
            mostrarError('El nombre y los apellidos deben contener únicamente letras.');
            return;
        }

        // Validar teléfono si fue proporcionado
        if (telefono && !esTelefonoValido(telefono)) {
            mostrarError('Ingresa un número de teléfono válido de 10 dígitos.');
            $('perfil-telefono').focus();
            return;
        }

        // Si se intenta cambiar la contraseña, deben llenarse los tres campos
        if (passActual || pass1 || pass2) {

            if (!passActual || !pass1 || !pass2) {
                mostrarError('Para cambiar tu contraseña, completa los tres campos.');
                return;
            }

            if (pass1.length < 6) {
                mostrarError('La nueva contraseña debe tener al menos 6 caracteres.');
                return;
            }

            if (pass1 !== pass2) {
                mostrarError('La nueva contraseña y su confirmación no coinciden.');
                return;
            }

            if (passActual === pass1) {
                mostrarError('La nueva contraseña debe ser diferente a la actual.');
                return;
            }
        }

        try {

            // 1. Verificar contraseña actual antes de cambiarla
            if (pass1) {

                const { error: verificacionError } =
                    await client.auth.signInWithPassword({
                        email: usuarioActual.email,
                        password: passActual
                    });

                if (verificacionError) {
                    throw new Error('La contraseña actual es incorrecta.');
                }
            }

            // 2. Comprobar si el teléfono pertenece a otro usuario
            if (telefono) {

                const { data: telefonoExistente, error: consultaError } =
                    await client
                        .from('Usuarios')
                        .select('id')
                        .eq('telefono', telefono)
                        .neq('id', usuarioActual.id)
                        .maybeSingle();

                if (consultaError) throw consultaError;

                if (telefonoExistente) {
                    throw new Error(
                        'Este número de teléfono ya está registrado en otra cuenta. Utiliza uno diferente.'
                    );
                }
            }

            // 3. Actualizar información personal
            const { error: updateError } = await client
                .from('Usuarios')
                .update({
                    nombre,
                    apellido,
                    telefono: telefono || null
                })
                .eq('id', usuarioActual.id);

            if (updateError) throw updateError;

            // 4. Actualizar contraseña si se solicitó
            if (pass1) {

                const { error: passwordError } =
                    await client.auth.updateUser({
                        password: pass1
                    });

                if (passwordError) throw passwordError;
            }

            // 5. Actualizar información visual
            $('perfil-nombre-display').textContent =
                `${nombre} ${apellido}`.trim();

            $('perfil-password-actual').value = '';
            $('perfil-password').value = '';
            $('perfil-password-confirm').value = '';

            $('modalExito').classList.add('activo');

            setTimeout(() => {
                $('modalExito').classList.remove('activo');
            }, 2000);

            return false;

        } catch (error) {

            console.error('Error al guardar perfil:', error);

            mostrarError(
                `No se pudieron guardar los cambios: ${error.message || 'Error desconocido'}`
            );

            return false;
        }

        }, '#btnGuardarPerfil')
    );

});


// ==========================================
// CERRAR MODALES
// ==========================================

window.cerrarModal = function (id) {
    document.getElementById(id).classList.remove('activo');
};
