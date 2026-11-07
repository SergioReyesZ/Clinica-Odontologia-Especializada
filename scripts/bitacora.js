(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  const notice = (message, type = 'info') => {
    const element = $('#notice');
    if (!element) return;

    element.textContent = message;
    element.className = type === 'error' ? 'notice error' : 'notice';
    element.style.display = message ? 'block' : 'none';
  };

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);

    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const fullName = (user) => {
    if (!user) return 'Usuario no disponible';
    return [user.nombre, user.apellido].filter(Boolean).join(' ') || 'Usuario sin nombre';
  };

  const renderEmpty = (message) => {
    const body = $('#auditBody');
    if (body) {
      body.innerHTML = `<tr><td colspan="5" class="emptymsg">${esc(message)}</td></tr>`;
    }
  };

  async function cargarBitacora() {
    const body = $('#auditBody');
    if (!body) return;

    if (typeof client === 'undefined' || !client) {
      renderEmpty('No se encontró la conexión con Supabase.');
      notice('Verifica que app.js se cargue antes que bitacora.js.', 'error');
      return;
    }

    body.innerHTML = '<tr><td colspan="5" class="emptymsg">Cargando movimientos...</td></tr>';
    notice('');

    try {
      // Primero se consultan los movimientos de la tabla Bitacora.
      const { data: movimientos, error: errorBitacora } = await client
        .from('Bitacora')
        .select('id, fecha_movimiento, accion_realizada, descripcion, usuario, cita')
        .order('fecha_movimiento', { ascending: false });

      if (errorBitacora) throw errorBitacora;

      if (!movimientos || movimientos.length === 0) {
        renderEmpty('Todavía no hay movimientos registrados.');
        return;
      }

      // Se consultan los nombres de los usuarios que aparecen en la bitácora.
      const usuarioIds = [...new Set(
        movimientos.map((item) => item.usuario).filter(Boolean)
      )];

      let usuarios = [];
      if (usuarioIds.length) {
        const { data, error } = await client
          .from('Usuarios')
          .select('id, nombre, apellido')
          .in('id', usuarioIds);

        if (error) throw error;
        usuarios = data || [];
      }

      const usuariosPorId = new Map(
        usuarios.map((usuario) => [String(usuario.id), usuario])
      );

      body.innerHTML = movimientos.map((movimiento) => {
        const usuario = usuariosPorId.get(String(movimiento.usuario));
        const folio = movimiento.cita ? `#${movimiento.cita}` : '—';

        return `
          <tr>
            <td>${esc(formatDate(movimiento.fecha_movimiento))}</td>
            <td>${esc(movimiento.accion_realizada || '—')}</td>
            <td>${esc(folio)}</td>
            <td>${esc(movimiento.descripcion || '—')}</td>
            <td>${esc(fullName(usuario))}</td>
          </tr>
        `;
      }).join('');

      notice(`Se cargaron ${movimientos.length} movimiento(s).`);
    } catch (error) {
      console.error('Error al cargar la bitácora:', error);
      renderEmpty('No se pudieron cargar los movimientos.');
      notice(
        `Error al consultar la bitácora: ${error?.message || 'Error desconocido'}`,
        'error'
      );
    }
  }

  // Espera a que el documento esté listo y carga los registros reales.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarBitacora, { once: true });
  } else {
    cargarBitacora();
  }

  // Permite actualizar los registros al regresar a esta pestaña.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) cargarBitacora();
  });
})();
