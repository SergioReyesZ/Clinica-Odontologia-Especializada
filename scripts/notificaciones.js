
/* =====================================================
   SISTEMA DE NOTIFICACIONES - DASHBOARD
===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const btnNotificaciones = document.getElementById('btnNotificacionesDropdown');
    const dropdownNotificaciones = document.getElementById('dropdownNotificaciones');
    const listaNotificaciones = document.getElementById('listaNotificaciones');
    const contadorNotificaciones = document.getElementById('contadorNotificaciones');

    if (!btnNotificaciones || !dropdownNotificaciones || !listaNotificaciones) {
        return;
    }

    // Abrir y cerrar el desplegable
    btnNotificaciones.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownNotificaciones.classList.toggle('activo');
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (
            !dropdownNotificaciones.contains(e.target) &&
            !btnNotificaciones.contains(e.target)
        ) {
            dropdownNotificaciones.classList.remove('activo');
        }
    });

    // Consultar notificaciones de la sesión actual
    cargarNotificacionesDashboard();

    async function cargarNotificacionesDashboard() {
        try {
            const { data: { user }, error: authError } = await client.auth.getUser();

            if (authError) throw authError;

            if (!user) {
                listaNotificaciones.innerHTML =
                    '<p class="sin-notificaciones">Inicia sesión para consultar tus notificaciones.</p>';
                return;
            }

            const { data: notificaciones, error } = await client
                .from('Notificaciones')
                .select('id, usuario_id, cita_id, tipo, mensaje, leida, fecha_creacion')
                .eq('usuario_id', user.id)
                .order('fecha_creacion', { ascending: false })
                .limit(20);

            if (error) throw error;

            mostrarNotificaciones(notificaciones || []);

        } catch (error) {
            console.error('Error al cargar notificaciones:', error);

            listaNotificaciones.innerHTML =
                '<p class="sin-notificaciones">No se pudieron cargar las notificaciones.</p>';
        }
    }

    function mostrarNotificaciones(notificaciones) {
        listaNotificaciones.innerHTML = '';

        const noLeidas = notificaciones.filter(n => !n.leida).length;

        // Actualizar contador de la campana
        if (noLeidas > 0) {
            contadorNotificaciones.textContent = noLeidas > 99 ? '99+' : noLeidas;
            contadorNotificaciones.style.display = 'flex';
        } else {
            contadorNotificaciones.style.display = 'none';
        }

        if (notificaciones.length === 0) {
            listaNotificaciones.innerHTML = `
                <p class="sin-notificaciones">
                    <i class="bi bi-bell-slash"></i>
                    No tienes notificaciones por el momento.
                </p>
            `;
            return;
        }

        notificaciones.forEach(notificacion => {
            const elemento = document.createElement('a');

            elemento.className = `dropdown-item notificacion-item ${notificacion.leida ? '' : 'no-leida'
                }`;

            // Las notificaciones de citas llevan a la página de citas
            elemento.href = notificacion.cita_id
                ? rutaCitas
                : '#';

            const iconos = {
                CONFIRMACION: 'bi-calendar-check',
                CANCELACION: 'bi-calendar-x',
                RECORDATORIO: 'bi-clock-history'
            };

            const icono = iconos[notificacion.tipo] || 'bi-bell';

            const mensaje = document.createElement('span');
            mensaje.className = 'notificacion-mensaje';
            mensaje.textContent = notificacion.mensaje;

            const iconoElemento = document.createElement('i');
            iconoElemento.className = `bi ${icono}`;

            const fecha = document.createElement('small');
            fecha.className = 'notificacion-fecha';

            fecha.textContent = new Date(notificacion.fecha_creacion)
                .toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });

            elemento.appendChild(iconoElemento);
            elemento.appendChild(mensaje);
            elemento.appendChild(fecha);

            elemento.addEventListener('click', async (e) => {
                if (notificacion.leida) return;

                e.preventDefault();

                const { error } = await client
                    .from('Notificaciones')
                    .update({ leida: true })
                    .eq('id', notificacion.id)
                    .eq('usuario_id', (await client.auth.getUser()).data.user.id);

                if (error) {
                    console.error('Error al marcar notificación como leída:', error);
                    return;
                }

                notificacion.leida = true;
                elemento.classList.remove('no-leida');

                const pendientes = notificaciones.filter(n => !n.leida).length;

                if (pendientes > 0) {
                    contadorNotificaciones.textContent = pendientes > 99 ? '99+' : pendientes;
                    contadorNotificaciones.style.display = 'flex';
                } else {
                    contadorNotificaciones.style.display = 'none';
                }

                // Continuar hacia la página de citas
                if (notificacion.cita_id) {
                    window.location.href = rutaCitas;
                }
            });

            listaNotificaciones.appendChild(elemento);
        });
    }
});

const rutaCitas = window.location.pathname.includes('/recursos/')
    ? './cliCitas.html'
    : './recursos/cliCitas.html';