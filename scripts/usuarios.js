(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  const ROLES_FALLBACK = [
    { id: 1, nombre: 'Cliente' },
    { id: 2, nombre: 'Administrador' },
    { id: 3, nombre: 'Odontólogo' }
  ];

  let usuarios = [];
  let roles = ROLES_FALLBACK;
  let cargando = false;
  let tieneEmailEnUsuarios = false;

  function aviso(mensaje, error = false) {
    const el = $('#notice');
    if (!el) return;
    el.textContent = mensaje || '';
    el.classList.toggle('notice-error', error);
  }

  function nombreCompleto(usuario) {
    return `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre';
  }

  function nombreRol(id, nombre) {
    return nombre || roles.find(r => Number(r.id) === Number(id))?.nombre || 'Sin rol';
  }

  async function cargarAvatarAdmin() {
    const imagen = document.querySelector('.btn-perfil .pfp');
    if (!imagen) return;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { data } = await client
      .from('Usuarios')
      .select('avatar')
      .eq('id', user.id)
      .single();

    if (data?.avatar) {
      imagen.src = data.avatar;
    }
  }

  // Carga por bloques para no depender del límite de filas de Supabase.
  async function traerTodosUsuarios() {
    const acumulados = [];
    const limite = 1000;
    for (let desde = 0; ; desde += limite) {
      let respuesta = await client.from('Usuarios')
        .select('id,nombre,apellido,email,telefono,rol,avatar')
        .order('created_at', { ascending: false })
        .range(desde, desde + limite - 1);

      // En el esquema actual email puede no existir en Usuarios; se reintenta sin esa columna.
      if (respuesta.error && /email|column/i.test(respuesta.error.message || '')) {
        tieneEmailEnUsuarios = false;
        respuesta = await client.from('Usuarios')
          .select('id,nombre,apellido,telefono,rol,avatar')
          .order('created_at', { ascending: false })
          .range(desde, desde + limite - 1);
      } else if (!respuesta.error) {
        tieneEmailEnUsuarios = true;
      }

      if (respuesta.error) throw respuesta.error;
      const bloque = respuesta.data || [];
      acumulados.push(...bloque);
      if (bloque.length < limite) break;
    }
    return acumulados;
  }

  async function cargarRoles() {
    const { data, error } = await client.from('Roles').select('id,Nombre').order('id');
    if (!error && data?.length) {
      roles = data.map(r => ({ id: Number(r.id), nombre: r.Nombre }));
    }
  }

  async function cargarUsuarios() {
    if (typeof client === 'undefined' || !client) {
      aviso('No se encontró la conexión con Supabase. Revisa app.js.', true);
      return;
    }

    cargando = true;
    renderUsuarios();
    try {
      await cargarRoles();
      const data = await traerTodosUsuarios();
      usuarios = data.map(u => ({
        ...u,
        rol: Number(u.rol),
        email: u.email || '',
        rol_nombre: nombreRol(u.rol)
      }));
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      usuarios = [];
      aviso('No se pudieron cargar los usuarios: ' + (error.message || 'Error desconocido.'), true);
    } finally {
      cargando = false;
      renderUsuarios();
    }
  }

  function renderUsuarios() {
    const tbody = $('#usersBody');
    if (!tbody) return;

    const busqueda = ($('#searchUser')?.value || '').trim().toLocaleLowerCase('es-MX');
    const rolFiltro = $('#filterRole')?.value || '';

    const filtrados = usuarios.filter(u => {
      const rolNombre = nombreRol(u.rol, u.rol_nombre);
      const coincideRol = !rolFiltro || String(u.rol) === rolFiltro || rolNombre.toLocaleLowerCase('es-MX') === rolFiltro.toLocaleLowerCase('es-MX');
      const texto = [u.nombre, u.apellido, nombreCompleto(u), u.email, u.telefono]
        .join(' ').toLocaleLowerCase('es-MX');
      return coincideRol && texto.includes(busqueda);
    });

    tbody.innerHTML = filtrados.map(u => `
      <tr>
        <td>
          <div class="usuario-identidad">
            <span class="usuario-avatar">
  ${u.avatar
        ? `<img src="${esc(u.avatar)}" alt="Avatar">`
        : '<i class="bi bi-person-fill"></i>'}
</span>
            <div><b>${esc(nombreCompleto(u))}</b><small>${esc(u.telefono || 'Sin teléfono')}</small></div>
          </div>
        </td>
        <td>${esc(u.email || 'No disponible en Usuarios')}</td>
        <td><span class="pill rol-${Number(u.rol)}">${esc(nombreRol(u.rol, u.rol_nombre))}</span></td>
        <td><div class="actions">
          <button type="button" class="btn-editar-usuario" data-action="edit" data-id="${esc(u.id)}">
            <i class="bi bi-pencil-square"></i> Editar
          </button>
          <button type="button" class="btn-eliminar-usuario" data-action="delete" data-id="${esc(u.id)}">
            <i class="bi bi-trash3"></i> Eliminar
          </button>
        </div></td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="emptymsg">${cargando ? 'Cargando usuarios...' : 'No se encontraron usuarios.'}</td></tr>`;

    // Mantiene el filtro de roles sincronizado con los IDs reales de la tabla Roles.
    const filtro = $('#filterRole');
    if (filtro && filtro.dataset.rolesCargados !== '1') {
      const valorActual = filtro.value;
      filtro.innerHTML = '<option value="">Todos los roles</option>' + roles.map(r =>
        `<option value="${r.id}">${esc(r.nombre)}</option>`
      ).join('');
      filtro.value = valorActual;
      filtro.dataset.rolesCargados = '1';
    }
  }

  function abrirModalEditar(id) {
    const usuario = usuarios.find(u => String(u.id) === String(id));
    if (!usuario) return aviso('No se encontró el usuario seleccionado.', true);

    $('#modalTitle').textContent = 'Editar usuario';
    $('#modalContent').innerHTML = `
      <form id="formEditarUsuario" class="formulario-usuario" data-id="${esc(usuario.id)}">
        <div class="usuario-modal-identidad">
        <span class="usuario-avatar grande">
          ${usuario.avatar
        ? `<img src="${esc(usuario.avatar)}" alt="Foto de usuario">`
        : '<i class="bi bi-person-fill"></i>'}
        </span>          
        <div><strong>${esc(nombreCompleto(usuario))}</strong><small>Actualiza la información de esta cuenta</small></div>
        </div>
        <h3 class="titulo-form-usuario">Información personal</h3>
        <div class="campos-usuario-dobles">
          <label class="campo-usuario">Nombre(s)<input type="text" name="nombre" value="${esc(usuario.nombre)}" maxlength="29" required></label>
          <label class="campo-usuario">Apellidos<input type="text" name="apellido" value="${esc(usuario.apellido)}" maxlength="29" required></label>
        </div>
        <label class="campo-usuario">Teléfono celular<input type="tel" name="telefono" value="${esc(usuario.telefono || '')}" maxlength="30" placeholder="Teléfono (opcional)"></label>
        <hr class="linea-usuario">
        <h3 class="titulo-form-usuario">Credenciales y permisos</h3>
        <label class="campo-usuario">Correo electrónico
          <input type="email" value="${esc(usuario.email || '')}" disabled>
          <small>El correo se administra desde Supabase Auth.</small>
        </label>
        <label class="campo-usuario">Rol del usuario
          <select name="rol" required>${roles.map(r => `<option value="${r.id}" ${Number(usuario.rol) === r.id ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}</select>
        </label>
        <p class="ayuda-usuario-modal" id="feedbackUsuario">Los cambios se guardarán en Usuarios.</p>
        <div class="acciones-usuario-modal">
          <button type="button" class="btn-cancelar-usuario" id="cancelarEdicionUsuario">Cancelar</button>
          <button type="submit" class="btn-guardar-usuario" id="guardarEdicionUsuario"><i class="bi bi-check-lg"></i> Guardar cambios</button>
        </div>
      </form>`;
    $('#modal').classList.remove('hidden');
    $('#cancelarEdicionUsuario').addEventListener('click', cerrarModal);
  }

  function abrirModalNuevo() {
    $('#modalTitle').textContent = 'Registrar nuevo usuario';
    $('#modalContent').innerHTML = `
      <form id="formNuevoUsuario" class="formulario-usuario">
        <div class="usuario-modal-identidad">
          <span class="usuario-avatar grande"><i class="bi bi-person-plus-fill"></i></span>
          <div><strong>Nueva cuenta</strong><small>Se creará el acceso y su registro en Usuarios.</small></div>
        </div>
        <h3 class="titulo-form-usuario">Información personal</h3>
        <div class="campos-usuario-dobles">
          <label class="campo-usuario">Nombre(s)<input name="nombre" maxlength="29" required autocomplete="given-name"></label>
          <label class="campo-usuario">Apellidos<input name="apellido" maxlength="29" required autocomplete="family-name"></label>
        </div>
        <label class="campo-usuario">Correo electrónico<input type="email" name="email" required autocomplete="email" placeholder="correo@ejemplo.com"></label>
        <div class="campos-usuario-dobles">
          <label class="campo-usuario">Contraseña<input type="password" name="password" minlength="6" required autocomplete="new-password" placeholder="Mínimo 6 caracteres"></label>
          <label class="campo-usuario">Teléfono celular<input type="tel" name="telefono" maxlength="30" placeholder="Opcional"></label>
        </div>
        <label class="campo-usuario">Rol del usuario
          <select name="rol" required>${roles.map(r => `<option value="${r.id}">${esc(r.nombre)}</option>`).join('')}</select>
        </label>
        <p class="ayuda-usuario-modal" id="feedbackUsuario">La cuenta se registra en Supabase Auth y sus datos en la tabla Usuarios.</p>
        <div class="acciones-usuario-modal">
          <button type="button" class="btn-cancelar-usuario" id="cancelarNuevoUsuario">Cancelar</button>
          <button type="submit" class="btn-guardar-usuario" id="guardarNuevoUsuario"><i class="bi bi-person-plus"></i> Registrar usuario</button>
        </div>
      </form>`;
    $('#modal').classList.remove('hidden');
    $('#cancelarNuevoUsuario').addEventListener('click', cerrarModal);
  }

  function abrirModalEliminar(id) {
    const usuario = usuarios.find(u => String(u.id) === String(id));
    if (!usuario) return aviso('No se encontró el usuario seleccionado.', true);
    $('#modalTitle').textContent = 'Eliminar usuario';
    $('#modalContent').innerHTML = `
      <div class="confirmar-eliminar-usuario">
        <i class="bi bi-exclamation-circle"></i>
        <h3>¿Deseas eliminar este usuario?</h3>
        <p>Se eliminará el registro de <strong>${esc(nombreCompleto(usuario))}</strong> de la tabla Usuarios. Esta acción no se puede deshacer.</p>
        <div class="acciones-usuario-modal">
          <button type="button" class="btn-cancelar-usuario" id="cancelarEliminarUsuario">No</button>
          <button type="button" class="btn-confirmar-eliminar-usuario" id="confirmarEliminarUsuario" data-id="${esc(usuario.id)}"><i class="bi bi-trash3"></i> Eliminar</button>
        </div>
        <p class="ayuda-usuario-modal" id="feedbackUsuario"></p>
      </div>`;
    $('#modal').classList.remove('hidden');
    $('#cancelarEliminarUsuario').addEventListener('click', cerrarModal);
    $('#confirmarEliminarUsuario').addEventListener('click', eliminarUsuario);
  }

  function cerrarModal() {
    $('#modal')?.classList.add('hidden');
    if ($('#modalContent')) $('#modalContent').innerHTML = '';
  }

  async function guardarUsuario(e) {
    e.preventDefault();
    const form = e.target;
    if (!['formEditarUsuario', 'formNuevoUsuario'].includes(form.id)) return;
    const esNuevo = form.id === 'formNuevoUsuario';
    const boton = esNuevo ? $('#guardarNuevoUsuario') : $('#guardarEdicionUsuario');
    const feedback = $('#feedbackUsuario');
    const datos = new FormData(form);
    boton.disabled = true;
    boton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Guardando...';
    feedback.textContent = 'Guardando información...';
    feedback.classList.remove('error');

    try {
      const nombre = String(datos.get('nombre') || '').trim();
      const apellido = String(datos.get('apellido') || '').trim();
      const telefono = String(datos.get('telefono') || '').trim();
      const rol = Number(datos.get('rol'));
      if (!nombre || !apellido || nombre.length >= 30 || apellido.length >= 30 ||
        !roles.some(r => Number(r.id) === rol)) {
        throw new Error('Revisa nombre, apellidos y rol. Nombre y apellidos deben tener menos de 30 caracteres.');
      }

      if (!esNuevo) {
        const { error } = await client.from('Usuarios').update({
          nombre, apellido, telefono: telefono || null, rol
        }).eq('id', form.dataset.id);
        if (error) throw error;
        cerrarModal();
        await cargarUsuarios();
        aviso('Los datos del usuario se actualizaron correctamente.');
        return;
      }

      const email = String(datos.get('email') || '').trim().toLowerCase();
      const password = String(datos.get('password') || '');
      if (!email || password.length < 6) throw new Error('Escribe un correo válido y una contraseña de al menos 6 caracteres.');

      // Cliente Auth aislado: evita reemplazar la sesión del administrador al registrar otra cuenta.
      if (!window.supabase?.createClient || !client.supabaseUrl || !client.supabaseKey) {
        throw new Error('No se pudo inicializar el registro aislado de Supabase Auth.');
      }
      const authTemporal = window.supabase.createClient(client.supabaseUrl, client.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      const { data: alta, error: errorAuth } = await authTemporal.auth.signUp({
        email, password,
        options: { data: { nombre, apellido } }
      });
      if (errorAuth) throw errorAuth;
      const nuevoId = alta?.user?.id;
      if (!nuevoId) throw new Error('Supabase no devolvió el identificador de la nueva cuenta.');

      const { data: usuarioActualizado, error: errorUsuario } = await client
        .from('Usuarios')
        .update({
          nombre,
          apellido,
          email,
          telefono: telefono || null,
          rol
        })
        .eq('id', nuevoId)
        .select('id')
        .maybeSingle();

      if (errorUsuario) {
        throw new Error(
          'La cuenta de autenticación se creó, pero no se pudo actualizar Usuarios: ' +
          errorUsuario.message
        );
      }

      if (!usuarioActualizado) {
        throw new Error(
          'La cuenta de autenticación se creó, pero no se encontró su registro en Usuarios. Revisa el trigger de registro.'
        );
      }

      cerrarModal();
      await cargarUsuarios();
      aviso(alta.user.identities?.length === 0
        ? 'Ese correo ya está registrado en Supabase Auth.'
        : 'Usuario registrado correctamente.');
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      feedback.textContent = error.message || 'Ocurrió un error al guardar.';
      feedback.classList.add('error');
    } finally {
      if (boton.isConnected) {
        boton.disabled = false;
        boton.innerHTML = esNuevo
          ? '<i class="bi bi-person-plus"></i> Registrar usuario'
          : '<i class="bi bi-check-lg"></i> Guardar cambios';
      }
    }
  }

  async function eliminarUsuario(e) {
    const boton = e.currentTarget;
    const id = boton?.dataset?.id;
    const feedback = document.querySelector('#feedbackUsuario');

    if (!id) {
      console.error('No se encontró el ID del usuario:', boton);
      if (feedback) {
        feedback.textContent = 'No se pudo identificar al usuario que deseas eliminar.';
        feedback.classList.add('error');
      }
      return;
    }

    boton.disabled = true;
    boton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Eliminando...';

    if (feedback) {
      feedback.textContent = 'Eliminando cuenta y registro...';
      feedback.classList.remove('error');
    }

    try {
      const { data, error } = await client.functions.invoke(
        'eliminar-usuario',
        {
          body: { userId: id }
        }
      );

      if (error) {
        let detalle = error.message;

        try {
          const respuesta = await error.context?.json();
          if (respuesta?.error) detalle = respuesta.error;
        } catch (_) { }

        throw new Error(detalle);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'No se pudo eliminar el usuario.');
      }

      cerrarModal();
      await cargarUsuarios();

      aviso('Usuario eliminado correctamente');

    } catch (error) {
      console.error('Error al eliminar usuario:', error);

      if (feedback) {
        feedback.textContent = 'No se pudo eliminar: ' + error.message;
        feedback.classList.add('error');
      }

      boton.disabled = false;
      boton.innerHTML = '<i class="bi bi-trash3"></i> Eliminar';
    }
  }

  function configurarEventos() {
    $('#searchUser')?.addEventListener('input', renderUsuarios);
    $('#filterRole')?.addEventListener('change', renderUsuarios);
    $('#closeModal')?.addEventListener('click', cerrarModal);
    $('#modal')?.addEventListener('click', e => { if (e.target.id === 'modal') cerrarModal(); });
    $('[data-action="newUser"]')?.addEventListener('click', abrirModalNuevo);
    $('#usersBody')?.addEventListener('click', e => {
      const boton = e.target.closest('[data-action]');
      if (!boton) return;
      if (boton.dataset.action === 'edit') abrirModalEditar(boton.dataset.id);
      if (boton.dataset.action === 'delete') abrirModalEliminar(boton.dataset.id);
    });
    $('#modalContent')?.addEventListener('submit', guardarUsuario);
    $('#btnCerrarSesion')?.addEventListener('click', async e => {
      e.preventDefault();
      const { error } = await client.auth.signOut();
      if (error) return aviso('No se pudo cerrar la sesión: ' + error.message, true);
      window.location.href = '../index.html';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    configurarEventos();
    cargarUsuarios();
    cargarAvatarAdmin();

  });
})();

