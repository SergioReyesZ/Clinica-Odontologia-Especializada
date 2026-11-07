(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  let odontologos = [];
  let horarios = [];
  let guardando = false;

  function aviso(mensaje, error = false) {
    const notice = $('#notice');
    if (!notice) return;
    notice.textContent = mensaje;
    notice.style.background = error ? '#fef2f2' : '#e8f5e9';
    notice.style.color = error ? '#b91c1c' : '#256334';
    notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function normalizarDia(valor) {
    const texto = String(valor ?? '').trim().toLocaleLowerCase('es-MX')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const equivalencias = {
      domingo: 0, dom: 0, '0': 0,
      lunes: 1, lun: 1, '1': 1,
      martes: 2, mar: 2, '2': 2,
      miercoles: 3, mie: 3, mié: 3, '3': 3,
      jueves: 4, jue: 4, '4': 4,
      viernes: 5, vie: 5, '5': 5,
      sabado: 6, sab: 6, '6': 6
    };

    return Object.prototype.hasOwnProperty.call(equivalencias, texto)
      ? equivalencias[texto]
      : -1;
  }

  function horaInput(valor, predeterminada) {
    if (!valor) return predeterminada;
    return String(valor).slice(0, 5);
  }

  function nombreCompleto(usuario) {
    return [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || 'Odontólogo';
  }

  function obtenerHorariosDoctor(doctorId) {
    return horarios.filter(h => Number(h.odontologo) === Number(doctorId));
  }

  function render() {
    const contenedor = $('#schedules');
    if (!contenedor) return;

    if (!odontologos.length) {
      contenedor.innerHTML = '<p class="emptymsg">No hay odontólogos registrados. Primero registra un usuario con rol Odontólogo y crea su registro en la tabla Odontologos.</p>';
      return;
    }

    contenedor.innerHTML = odontologos.map(doctor => {
      const registros = obtenerHorariosDoctor(doctor.id);
      const diasSeleccionados = [...new Set(
        registros.map(h => normalizarDia(h.dia_semana)).filter(d => d >= 0)
      )];

      const primerHorario = registros[0];
      const entrada = horaInput(primerHorario?.hora_inicio, '16:30');
      const salida = horaInput(primerHorario?.hora_fin, '20:00');

      return `
        <div class="schedule-row">
          <h3>${esc(nombreCompleto(doctor.usuario))}</h3>
          <form class="scheduleForm" data-id="${Number(doctor.id)}">
            <div class="checkdays">
              ${DIAS.map((dia, indice) => `
                <label>
                  <input type="checkbox" name="day" value="${indice}"
                    ${diasSeleccionados.includes(indice) ? 'checked' : ''}>
                  ${dia.slice(0, 3)}
                </label>
              `).join('')}
            </div>
            <label>Entrada
              <input name="start" type="time" value="${esc(entrada)}" required>
            </label>
            <label>Salida
              <input name="end" type="time" value="${esc(salida)}" required>
            </label>
            <button class="primary" type="submit">Guardar horario</button>
          </form>
          <small class="muted">La jornada indicada se aplicará a todos los días seleccionados.</small>
        </div>
      `;
    }).join('');
  }

  async function cargarDatos() {
    const contenedor = $('#schedules');
    if (contenedor) contenedor.innerHTML = '<p class="emptymsg">Cargando odontólogos y horarios...</p>';

    if (typeof client === 'undefined' || !client) {
      throw new Error('No se encontró el cliente de Supabase. Verifica que app.js se cargue antes que horarios.js.');
    }

    // Primero se obtienen los registros reales de odontólogos.
    const { data: doctoresDB, error: errorDoctores } = await client
      .from('Odontologos')
      .select('id, Usuario')
      .order('id');

    if (errorDoctores) throw errorDoctores;

    const doctores = doctoresDB || [];
    if (!doctores.length) {
      odontologos = [];
      horarios = [];
      render();
      return;
    }

    // Los nombres y apellidos están en Usuarios, relacionados por Odontologos.Usuario.
    const idsUsuarios = doctores.map(d => d.Usuario).filter(Boolean);
    const { data: usuariosDB, error: errorUsuarios } = await client
      .from('Usuarios')
      .select('id, nombre, apellido')
      .in('id', idsUsuarios);

    if (errorUsuarios) throw errorUsuarios;

    const usuariosPorId = new Map((usuariosDB || []).map(u => [u.id, u]));

    odontologos = doctores.map(d => ({
      id: d.id,
      usuarioId: d.Usuario,
      usuario: usuariosPorId.get(d.Usuario) || null
    }));

    const idsOdontologos = doctores.map(d => d.id);
    const { data: horariosDB, error: errorHorarios } = await client
      .from('Horarios')
      .select('id, dia_semana, hora_inicio, hora_fin, odontologo')
      .in('odontologo', idsOdontologos)
      .order('id');

    if (errorHorarios) throw errorHorarios;

    horarios = horariosDB || [];
    render();
  }

  async function guardarHorario(form) {
    if (guardando) return;
    guardando = true;

    const boton = form.querySelector('button[type="submit"]');
    const textoOriginal = boton?.textContent || 'Guardar horario';
    if (boton) {
      boton.disabled = true;
      boton.textContent = 'Guardando...';
    }

    try {
      const doctorId = Number(form.dataset.id);
      const entrada = form.elements.start.value;
      const salida = form.elements.end.value;
      const dias = [...form.querySelectorAll('input[name="day"]:checked')]
        .map(input => Number(input.value));

      if (!doctorId || !entrada || !salida || entrada >= salida || !dias.length) {
        throw new Error('Selecciona al menos un día y define una jornada válida. La salida debe ser posterior a la entrada.');
      }

      const existentes = obtenerHorariosDoctor(doctorId);
      const conservarIds = new Set();

      // Actualiza los días que ya existen e inserta únicamente los días nuevos.
      for (const diaIndice of dias) {
        const nombreDia = DIAS[diaIndice];
        const coincidencias = existentes.filter(
          h => normalizarDia(h.dia_semana) === diaIndice
        );

        if (coincidencias.length) {
          const principal = coincidencias[0];

          const { error: errorActualizar } = await client
            .from('Horarios')
            .update({
              dia_semana: nombreDia,
              hora_inicio: `${entrada}:00`,
              hora_fin: `${salida}:00`
            })
            .eq('id', principal.id);

          if (errorActualizar) throw errorActualizar;
          conservarIds.add(principal.id);

          // Si había registros duplicados del mismo día, se limpian.
          const duplicados = coincidencias.slice(1).map(h => h.id);
          if (duplicados.length) {
            const { error: errorDuplicados } = await client
              .from('Horarios')
              .delete()
              .in('id', duplicados);

            if (errorDuplicados) throw errorDuplicados;
          }
        } else {
          const { error: errorInsertar } = await client
            .from('Horarios')
            .insert([{
              dia_semana: nombreDia,
              hora_inicio: `${entrada}:00`,
              hora_fin: `${salida}:00`,
              odontologo: doctorId
            }]);

          if (errorInsertar) throw errorInsertar;
        }
      }

      // Elimina los días que estaban guardados y se desmarcaron en el formulario.
      const quitarIds = existentes
        .filter(h => !dias.includes(normalizarDia(h.dia_semana)))
        .map(h => h.id);

      if (quitarIds.length) {
        const { error: errorEliminar } = await client
          .from('Horarios')
          .delete()
          .in('id', quitarIds);

        if (errorEliminar) throw errorEliminar;
      }

      await cargarDatos();
      aviso('Horario guardado correctamente en Supabase.');
    } catch (error) {
      console.error('Error al guardar horario:', error);
      aviso(`No se pudo guardar el horario: ${error.message || 'Error desconocido'}`, true);
    } finally {
      guardando = false;
      if (boton) {
        boton.disabled = false;
        boton.textContent = textoOriginal;
      }
    }
  }

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form.matches('.scheduleForm')) return;
    event.preventDefault();
    guardarHorario(form);
  });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await cargarDatos();
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      const contenedor = $('#schedules');
      if (contenedor) {
        contenedor.innerHTML = `
          <div class="warning">
            No se pudieron cargar los horarios desde Supabase.<br>
            ${esc(error.message || 'Error desconocido')}
          </div>
        `;
      }
    }
  });

  // Los scripts del proyecto pueden cargarse al final del body, cuando DOMContentLoaded ya ocurrió.
  if (document.readyState !== 'loading') {
    cargarDatos().catch(error => {
      console.error('Error al iniciar horarios:', error);
      const contenedor = $('#schedules');
      if (contenedor) contenedor.innerHTML =
        `<div class="warning">No se pudieron cargar los horarios: ${esc(error.message || 'Error desconocido')}</div>`;
    });
  }
})();
