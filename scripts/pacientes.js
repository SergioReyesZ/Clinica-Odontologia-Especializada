(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

  const BUCKET_PACIENTES = 'avatares_pacientes';
  const AVATAR_PREDETERMINADO = '../iconos/perfil.png';
  let pacientes = [];
  let usuarios = [];
  let citas = [];
  let tutorSeleccionado = null;
  let archivoAvatar = null;
  let previewTemporal = null;
  let avatarAnteriorPaciente = null;
  let cropperPaciente = null;
  let imagenTemporalCropper = null;
  let archivoSeleccionadoCropper = null;
  let ultimoZoomCropper = 50;
  let timerBusquedaTutor = null;
  let cargando = false;
  let pacientePendienteEliminar = null;

  const aviso = (mensaje, error = false) => {
    const el = $('#notice');
    if (!el) return;
    el.textContent = mensaje;
    el.style.color = error ? '#b91c1c' : '';
    el.style.background = error ? '#fef2f2' : '';
  };

  const nombreCompleto = p => p ? `${p.nombre || ''} ${p.apellido || ''}`.trim() : '';
  const fechaBonita = fecha => {
    if (!fecha) return '—';
    const [y,m,d] = String(fecha).slice(0,10).split('-').map(Number);
    return y && m && d ? new Date(y,m-1,d).toLocaleDateString('es-MX',
      {day:'2-digit',month:'short',year:'numeric'}) : '—';
  };
  const usuarioDe = id => usuarios.find(u => String(u.id) === String(id));

  async function traerTodos(queryBuilder) {
    const resultado = [];
    const tamano = 1000;
    for (let desde = 0; ; desde += tamano) {
      const { data, error } = await queryBuilder().range(desde, desde + tamano - 1);
      if (error) throw error;
      resultado.push(...(data || []));
      if (!data || data.length < tamano) break;
    }
    return resultado;
  }

  async function cargarPacientes() {
    if (typeof client === 'undefined' || !client) {
      aviso('No se encontró la conexión con Supabase. Revisa app.js.', true);
      return;
    }
    cargando = true;
    render();
    try {
      // Paginación para no limitar la lista a los primeros 1,000 registros.
      pacientes = await traerTodos(() => client.from('Pacientes')
        .select('id,nombre,apellido,fecha_nac,sexo,cliente,avatar')
        .order('nombre', {ascending:true}));

      const ids = [...new Set(pacientes.map(p => p.cliente).filter(Boolean))];
      usuarios = [];
      // Consultas por bloques para evitar límites de URL/IN demasiado largos.
      for (let i = 0; i < ids.length; i += 100) {
        const bloque = ids.slice(i, i + 100);
        let { data, error } = await client.from('Usuarios')
          .select('id,nombre,apellido,email').in('id', bloque);
        if (error && /email|column/i.test(error.message || '')) {
          // Compatibilidad temporal si aún no se ha agregado Usuarios.email.
          ({ data, error } = await client.from('Usuarios')
            .select('id,nombre,apellido').in('id', bloque));
        }
        if (error) console.warn('No se pudieron consultar algunos tutores:', error);
        else usuarios.push(...(data || []));
      }

      const { data: datosCitas, error: errorCitas } = await client
        .from('Citas').select('paciente');
      if (errorCitas) {
        console.warn('No se pudo consultar el conteo de citas:', errorCitas);
        citas = [];
      } else citas = datosCitas || [];

      aviso('');
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      aviso('No se pudieron consultar todos los pacientes: ' + error.message, true);
    } finally {
      cargando = false;
      render();
    }
  }

  function render() {
    const tbody = $('#patientsBody');
    if (!tbody) return;
    const q = ($('#searchPatient')?.value || '').trim().toLocaleLowerCase('es-MX');
    const filtrados = pacientes.filter(p => {
      const tutor = usuarioDe(p.cliente);
      return [nombreCompleto(p), nombreCompleto(tutor), tutor?.email || '']
        .join(' ').toLocaleLowerCase('es-MX').includes(q);
    });

    tbody.innerHTML = filtrados.map(p => {
      const tutor = usuarioDe(p.cliente);
      const nombreTutor = nombreCompleto(tutor) || 'Sin tutor asociado';
      const correo = tutor?.email || 'Correo no disponible';
      const total = citas.filter(c => String(c.paciente) === String(p.id)).length;
      return `<tr>
        <td><b>${esc(nombreCompleto(p) || 'Paciente sin nombre')}</b></td>
        <td>${fechaBonita(p.fecha_nac)}</td>
        <td>${esc(nombreTutor)}<small>${esc(correo)}</small></td>
        <td>${total} citas</td>
        <td><div class="actions">
          <button type="button" data-action="history" data-id="${esc(p.id)}">Historial</button>
          <button type="button" data-action="edit" data-id="${esc(p.id)}">Editar</button>
          <button type="button" data-action="delete" data-id="${esc(p.id)}">Eliminar</button>
        </div></td>
      </tr>`;
    }).join('') || `<tr><td colspan="5" class="emptymsg">${
      cargando ? 'Cargando pacientes...' : 'No hay pacientes registrados.'
    }</td></tr>`;
  }

  function prepararFechaNacimiento() {
    const anio = $('#pac-fecha-anio'), mes = $('#pac-fecha-mes');
    const dia = $('#pac-fecha-dia'), oculta = $('#pac-fecha');
    if (!anio || !mes || !dia || !oculta || anio.dataset.preparado) return;
    anio.dataset.preparado = '1';
    const actual = new Date().getFullYear();
    for (let y = actual; y >= actual - 110; y--) {
      const op = document.createElement('option');
      op.value = String(y); op.textContent = String(y); anio.appendChild(op);
    }
    const consolidar = () => {
      oculta.value = anio.value && mes.value && dia.value
        ? `${anio.value}-${mes.value}-${dia.value}` : '';
    };
    const actualizarDias = () => {
      const anterior = dia.value;
      dia.innerHTML = '<option value="" disabled selected>Día</option>';
      if (!anio.value || !mes.value) { oculta.value = ''; return; }
      const max = new Date(Number(anio.value), Number(mes.value), 0).getDate();
      for (let d=1; d<=max; d++) {
        const op = document.createElement('option');
        op.value = String(d).padStart(2,'0'); op.textContent = String(d);
        dia.appendChild(op);
      }
      if (anterior && Number(anterior) <= max) dia.value = anterior;
      consolidar();
    };
    anio.addEventListener('change', actualizarDias);
    mes.addEventListener('change', actualizarDias);
    dia.addEventListener('change', consolidar);
  }

  window.abrirModalPaciente = () => {
    $('#formNuevoPaciente')?.reset();
    $('#feedback-paciente').textContent = '';
    prepararFechaNacimiento();
    $('#modalPaciente').style.display = 'flex';
  };
  window.cerrarModalPaciente = () => {
    $('#modalPaciente').style.display = 'none';
    $('#formNuevoPaciente')?.reset();
    $('#feedback-paciente').textContent = '';
  };

  async function guardarPaciente(e) {
    e.preventDefault();
    const boton = $('#btnGuardarPaciente');
    const feedback = $('#feedback-paciente');
    const nombre = $('#pac-nombre').value.trim();
    const apellido = $('#pac-apellido').value.trim();
    const fecha_nac = $('#pac-fecha').value;
    const sexo = $('#pac-sexo').value;
    if (!nombre || !apellido || !fecha_nac || !sexo) {
      feedback.textContent = 'Completa todos los campos.';
      feedback.style.color = '#b91c1c';
      return;
    }
    boton.disabled = true; boton.textContent = 'Guardando...';
    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) throw new Error('No se pudo identificar al administrador.');
      const { error } = await client.from('Pacientes').insert({
        nombre, apellido, fecha_nac, sexo, cliente: authData.user.id
      });
      if (error) throw error;
      feedback.textContent = 'Paciente registrado correctamente.';
      feedback.style.color = '#15803d';
      await cargarPacientes();
      setTimeout(window.cerrarModalPaciente, 600);
    } catch (error) {
      console.error(error);
      feedback.textContent = error.message || 'No se pudo guardar el paciente.';
      feedback.style.color = '#b91c1c';
    } finally {
      boton.disabled = false; boton.textContent = 'Guardar Paciente';
    }
  }

  async function mostrarHistorial(id) {
    const paciente = pacientes.find(p => String(p.id) === String(id));
    if (!paciente) return;
    const { data, error } = await client.from('Citas')
      .select('id,fecha_hora,estado,servicio').eq('paciente', id)
      .order('fecha_hora', {ascending:false});
    if (error) { aviso('No se pudo cargar el historial: ' + error.message, true); return; }
    const filas = (data || []).map(c => {
      const fecha = c.fecha_hora ? new Date(c.fecha_hora).toLocaleString('es-MX') : '—';
      const servicio = typeof c.servicio === 'object' ? c.servicio?.nombre || '—' : c.servicio || '—';
      return `<tr><td>#${esc(c.id)}</td><td>${esc(fecha)}</td><td>${esc(servicio)}</td><td>${esc(c.estado || '—')}</td></tr>`;
    }).join('');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay'; overlay.style.display = 'flex';
    overlay.innerHTML = `<div class="modal-contenido" style="max-width:680px;max-height:85vh;overflow:auto">
      <div class="modal-header"><h3>Historial de ${esc(nombreCompleto(paciente))}</h3>
      <button type="button" class="btn-cerrar" aria-label="Cerrar">×</button></div>
      <div class="tablewrap"><table><thead><tr><th>Folio</th><th>Fecha</th><th>Servicio</th><th>Estado</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="4" class="emptymsg">Sin historial.</td></tr>'}</tbody></table></div></div>`;
    overlay.querySelector('.btn-cerrar').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  async function abrirModalEditar(id) {
    const modal = $('#modalEditarPaciente');
    $('#formEditarPaciente').reset();
    $('#edit-pac-id').value = id;
    $('#edit-tutor-id').value = '';
    $('#edit-tutor-busqueda').value = '';
    $('#resultados-tutores').innerHTML = '<small>Escribe un correo para buscar un tutor.</small>';
    $('#tutor-seleccionado').textContent = '';
    tutorSeleccionado = null;
    archivoAvatar = null; avatarAnteriorPaciente = null;
    if (previewTemporal) { URL.revokeObjectURL(previewTemporal); previewTemporal = null; }
    cerrarCropperPaciente();
    $('#feedback-editar-paciente').textContent = 'Cargando información...';
    modal.style.display = 'flex';
    try {
      const { data: paciente, error } = await client.from('Pacientes')
        .select('*').eq('id', id).single();
      if (error) throw error;
      avatarAnteriorPaciente = paciente.avatar || null;
      $('#edit-pac-nombre').value = paciente.nombre || '';
      $('#edit-pac-apellido').value = paciente.apellido || '';
      $('#edit-pac-fecha').value = paciente.fecha_nac || '';
      $('#edit-pac-sexo').value = paciente.sexo || 'M';
      $('#edit-tutor-id').value = paciente.cliente || '';
      const tutor = usuarioDe(paciente.cliente);
      if (tutor) {
        tutorSeleccionado = tutor;
        $('#edit-tutor-busqueda').value = tutor.email || '';
        $('#tutor-seleccionado').textContent =
          `Tutor actual: ${nombreCompleto(tutor)}${tutor.email ? ' · ' + tutor.email : ''}`;
      } else {
        $('#tutor-seleccionado').textContent = 'Tutor actual no encontrado en Usuarios.';
      }
      const img = $('#edit-avatarPreview');
      img.src = await obtenerAvatar(paciente.avatar);
      img.onerror = () => { img.onerror = null; img.src = AVATAR_PREDETERMINADO; };
      $('#feedback-editar-paciente').textContent = '';
    } catch (error) {
      console.error(error);
      $('#feedback-editar-paciente').textContent = 'Error al cargar paciente: ' + error.message;
      $('#feedback-editar-paciente').style.color = '#b91c1c';
    }
  }

  function abrirModalEliminarPaciente(id) {
    const paciente = pacientes.find(p => String(p.id) === String(id));
    if (!paciente) {
      aviso('No se encontró el paciente que intentas eliminar.', true);
      return;
    }

    pacientePendienteEliminar = paciente.id;
    const modal = $('#modalEliminarPacienteAdmin');
    if (!modal) {
      aviso('No se encontró el modal de confirmación para eliminar.', true);
      return;
    }

    // Muestra el modal que ya está incluido en pacientes.html.
    modal.style.display = 'flex';
  }

  window.cerrarModalEliminarPaciente = () => {
    const modal = $('#modalEliminarPacienteAdmin');
    if (modal) modal.style.display = 'none';
    pacientePendienteEliminar = null;

    const boton = $('#btnConfirmarEliminarPaciente');
    if (boton) {
      boton.disabled = false;
      boton.textContent = 'Eliminar';
    }
  };

  async function confirmarEliminarPaciente() {
    if (!pacientePendienteEliminar) return;

    const id = pacientePendienteEliminar;
    const boton = $('#btnConfirmarEliminarPaciente');
    if (boton) {
      boton.disabled = true;
      boton.textContent = 'Eliminando...';
    }

    try {
      // No se eliminan citas automáticamente. Si existen citas relacionadas y
      // la FK impide borrar al paciente, se informa sin tocar su historial.
      const { data, error } = await client.from('Pacientes')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No se eliminó ningún registro. Verifica que tengas una política RLS de DELETE para administradores.');
      }

      window.cerrarModalEliminarPaciente();
      await cargarPacientes();
      aviso('Paciente eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar paciente:', error);

      let mensaje = error.message || 'No se pudo eliminar el paciente.';
      if (/foreign key|violates.*constraint|still referenced/i.test(mensaje)) {
        mensaje = 'No se puede eliminar este paciente porque tiene citas u otros registros relacionados. Conserva su historial o elimina primero esos registros si corresponde.';
      } else if (/row-level security|permission|not allowed/i.test(mensaje)) {
        mensaje = 'Supabase bloqueó la eliminación. Revisa que exista una política RLS de DELETE para administradores en la tabla Pacientes.';
      }

      aviso('Error al eliminar paciente: ' + mensaje, true);
      if (boton) {
        boton.disabled = false;
        boton.textContent = 'Eliminar';
      }
    }
  }

  function extraerRutaAvatar(ruta) {
    if (!ruta) return null;
    if (!ruta.startsWith('http')) return ruta;
    try {
      const url = new URL(ruta);
      const marcadores = [
        `/storage/v1/object/sign/${BUCKET_PACIENTES}/`,
        `/storage/v1/object/public/${BUCKET_PACIENTES}/`,
        `/storage/v1/object/${BUCKET_PACIENTES}/`
      ];
      for (const marcador of marcadores) {
        if (url.pathname.includes(marcador))
          return decodeURIComponent(url.pathname.split(marcador)[1].split('?')[0]);
      }
    } catch (e) { console.warn(e); }
    return null;
  }

  async function obtenerAvatar(ruta) {
    if (!ruta) return AVATAR_PREDETERMINADO;
    if (ruta.startsWith('http')) {
      try {
        const url = new URL(ruta);
        const markers = [
          `/storage/v1/object/sign/${BUCKET_PACIENTES}/`,
          `/storage/v1/object/public/${BUCKET_PACIENTES}/`
        ];
        const marker = markers.find(m => url.pathname.includes(m));
        if (marker) ruta = decodeURIComponent(url.pathname.split(marker)[1].split('?')[0]);
        else return ruta;
      } catch { return AVATAR_PREDETERMINADO; }
    }
    const { data, error } = await client.storage.from(BUCKET_PACIENTES)
      .createSignedUrl(ruta, 3600);
    return error ? AVATAR_PREDETERMINADO : data.signedUrl;
  }

  function previsualizarAvatar(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      $('#feedback-editar-paciente').textContent = 'Selecciona una imagen válida.';
      e.target.value = ''; return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      $('#feedback-editar-paciente').textContent = 'La imagen no debe superar los 5 MB.';
      e.target.value = ''; return;
    }
    if (typeof Cropper === 'undefined') {
      $('#feedback-editar-paciente').textContent = 'No se pudo cargar el recortador.';
      e.target.value = ''; return;
    }
    archivoSeleccionadoCropper = archivo;
    imagenTemporalCropper = URL.createObjectURL(archivo);
    const modal = $('#modalCropperPaciente'), imagen = $('#imagenCropperPaciente');
    modal.classList.add('activo');
    imagen.onload = () => {
      if (cropperPaciente) cropperPaciente.destroy();
      cropperPaciente = new Cropper(imagen, {
        aspectRatio:1, viewMode:1, dragMode:'move', autoCropArea:.85,
        movable:true, zoomable:true, zoomOnWheel:true, zoomOnTouch:true,
        cropBoxMovable:false, cropBoxResizable:false, guides:true,
        center:true, background:false, responsive:true,
        ready() { $('#zoomCropperPaciente').value=50; ultimoZoomCropper=50; }
      });
    };
    imagen.src = imagenTemporalCropper;
  }

  function controlarZoomCropperPaciente() {
    if (!cropperPaciente) return;
    const zoom = Number($('#zoomCropperPaciente').value);
    cropperPaciente.zoom((zoom - ultimoZoomCropper) / 100);
    ultimoZoomCropper = zoom;
  }

  async function aceptarRecortePaciente() {
    if (!cropperPaciente || !archivoSeleccionadoCropper) return;
    const boton = $('#aceptarCropperPaciente');
    boton.disabled = true; boton.innerHTML = '<i class="bi bi-arrow-repeat"></i> Procesando...';
    try {
      const canvas = cropperPaciente.getCroppedCanvas({
        width:512,height:512,imageSmoothingEnabled:true,imageSmoothingQuality:'high'
      });
      if (!canvas) throw new Error('No se pudo procesar la fotografía.');
      const blob = await new Promise((resolve,reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo generar la imagen.')),
          'image/jpeg',.90));
      archivoAvatar = new File([blob], 'avatar-paciente.jpg', {type:'image/jpeg'});
      if (previewTemporal) URL.revokeObjectURL(previewTemporal);
      previewTemporal = URL.createObjectURL(archivoAvatar);
      $('#edit-avatarPreview').src = previewTemporal;
      cerrarCropperPaciente();
      $('#feedback-editar-paciente').textContent =
        'Fotografía recortada. Pulsa «Actualizar datos» para guardar los cambios.';
    } catch (error) {
      console.error(error);
      $('#feedback-editar-paciente').textContent = error.message || 'No se pudo recortar la fotografía.';
    } finally {
      boton.disabled = false;
      boton.innerHTML = '<i class="bi bi-check-lg"></i> Aceptar cambios';
    }
  }

  function cerrarCropperPaciente() {
    $('#modalCropperPaciente')?.classList.remove('activo');
    if (cropperPaciente) { cropperPaciente.destroy(); cropperPaciente = null; }
    if (imagenTemporalCropper) { URL.revokeObjectURL(imagenTemporalCropper); imagenTemporalCropper = null; }
    const img = $('#imagenCropperPaciente');
    if (img) { img.onload = null; img.removeAttribute('src'); }
    archivoSeleccionadoCropper = null;
    if ($('#inputAvatarPaciente')) $('#inputAvatarPaciente').value = '';
    if ($('#zoomCropperPaciente')) $('#zoomCropperPaciente').value = 50;
    ultimoZoomCropper = 50;
  }

  async function actualizarPaciente(e) {
    e.preventDefault();
    const boton = $('#btnActualizarPaciente');
    const id = $('#edit-pac-id').value;
    const tutorId = $('#edit-tutor-id').value;
    boton.disabled = true;
    $('#feedback-editar-paciente').textContent = 'Actualizando información...';
    let nuevaRuta = null, actualizado = false;
    try {
      const cambios = {
        nombre: $('#edit-pac-nombre').value.trim(),
        apellido: $('#edit-pac-apellido').value.trim(),
        sexo: $('#edit-pac-sexo').value
      };
      // Solo cambia el tutor si se seleccionó uno distinto mediante resultados.
      if (tutorId) cambios.cliente = tutorId;

      const { data: authData } = await client.auth.getUser();
      if (archivoAvatar) {
        nuevaRuta = `${authData.user.id}/paciente-${id}-${Date.now()}.jpg`;
        const { error } = await client.storage.from(BUCKET_PACIENTES)
          .upload(nuevaRuta, archivoAvatar, {contentType:'image/jpeg',upsert:false});
        if (error) throw error;
        cambios.avatar = nuevaRuta;
      }
      const { data, error } = await client.from('Pacientes').update(cambios)
        .eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('No se pudo actualizar. Verifica permisos RLS.');
      actualizado = true;
      if (nuevaRuta && avatarAnteriorPaciente) {
        const anterior = extraerRutaAvatar(avatarAnteriorPaciente);
        if (anterior && anterior !== nuevaRuta) {
          const { error: borrarError } = await client.storage.from(BUCKET_PACIENTES).remove([anterior]);
          if (borrarError) console.warn('No se pudo borrar el avatar anterior:', borrarError);
        }
      }
      cerrarModalEditar();
      await cargarPacientes();
      aviso('Paciente actualizado correctamente.');
    } catch (error) {
      if (nuevaRuta && !actualizado) {
        await client.storage.from(BUCKET_PACIENTES).remove([nuevaRuta]);
      }
      console.error(error);
      $('#feedback-editar-paciente').textContent = 'Error: ' + error.message;
      $('#feedback-editar-paciente').style.color = '#b91c1c';
    } finally { boton.disabled = false; }
  }

  function cerrarModalEditar() {
    $('#modalEditarPaciente').style.display = 'none';
    $('#formEditarPaciente').reset();
    archivoAvatar = null; avatarAnteriorPaciente = null; tutorSeleccionado = null;
    cerrarCropperPaciente();
    if (previewTemporal) { URL.revokeObjectURL(previewTemporal); previewTemporal = null; }
    if ($('#edit-avatarPreview')) $('#edit-avatarPreview').src = AVATAR_PREDETERMINADO;
    $('#feedback-editar-paciente').textContent = '';
  }
  window.cerrarModalEditar = cerrarModalEditar;

  function configurarEventos() {
    prepararFechaNacimiento();
    $('#searchPatient')?.addEventListener('input', render);
    $('#formNuevoPaciente')?.addEventListener('submit', guardarPaciente);
    $('#formEditarPaciente')?.addEventListener('submit', actualizarPaciente);
    $('#btnConfirmarEliminarPaciente')?.addEventListener('click', confirmarEliminarPaciente);
    $('#modalEliminarPacienteAdmin')?.addEventListener('click', e => {
      if (e.target.id === 'modalEliminarPacienteAdmin') window.cerrarModalEliminarPaciente();
    });
    $('#patientsBody')?.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'history') mostrarHistorial(btn.dataset.id);
      if (btn.dataset.action === 'edit') abrirModalEditar(btn.dataset.id);
      if (btn.dataset.action === 'delete') abrirModalEliminarPaciente(btn.dataset.id);
    });
    $('#edit-tutor-busqueda')?.addEventListener('input', () => {
      clearTimeout(timerBusquedaTutor);
      timerBusquedaTutor = setTimeout(async () => {
        const termino = $('#edit-tutor-busqueda').value.trim();
        if (termino.length < 3) {
          $('#resultados-tutores').innerHTML = '<small>Escribe al menos 3 caracteres del correo.</small>';
          return;
        }
        await buscarTutores(termino);
      }, 300);
    });
    $('#resultados-tutores')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-tutor-id]');
      if (btn) seleccionarTutor(btn.dataset.tutorId);
    });
    $('#inputAvatarPaciente')?.addEventListener('change', previsualizarAvatar);
    $('#zoomCropperPaciente')?.addEventListener('input', controlarZoomCropperPaciente);
    $('#aceptarCropperPaciente')?.addEventListener('click', aceptarRecortePaciente);
    $('#cancelarCropperPaciente')?.addEventListener('click', cerrarCropperPaciente);
    $('#cerrarCropperPaciente')?.addEventListener('click', cerrarCropperPaciente);
    $('#modalEditarPaciente')?.addEventListener('click', e => {
      if (e.target.id === 'modalEditarPaciente') cerrarModalEditar();
    });
    $('#modalPaciente')?.addEventListener('click', e => {
      if (e.target.id === 'modalPaciente') window.cerrarModalPaciente();
    });
    $('#btnCerrarSesion')?.addEventListener('click', async e => {
      e.preventDefault();
      const { error } = await client.auth.signOut();
      if (error) { alert('No se pudo cerrar la sesión.'); return; }
      window.location.href = '../index.html';
    });
    $('[data-action="newPatient"]')?.addEventListener('click', window.abrirModalPaciente);
  }

  function mostrarResultadosTutores(lista) {
    const cont = $('#resultados-tutores');
    if (!cont) return;
    if (!lista.length) {
      cont.innerHTML = '<small>No se encontraron tutores con ese correo.</small>';
      return;
    }
    cont.innerHTML = lista.map(u => `<button type="button" data-tutor-id="${esc(u.id)}">
      <strong>${esc(nombreCompleto(u) || 'Tutor')}</strong>
      <small>${esc(u.email || 'Sin correo registrado')}</small>
    </button>`).join('');
  }

  async function buscarTutores(termino) {
    const cont = $('#resultados-tutores');
    cont.innerHTML = '<small>Buscando tutores...</small>';
    const { data, error } = await client.from('Usuarios')
      .select('id,nombre,apellido,email')
      .ilike('email', `%${termino}%`)
      .order('nombre', {ascending:true}).limit(20);
    if (error) {
      console.error('Error buscando tutores:', error);
      cont.innerHTML = '<small>Error al buscar. Revisa Usuarios.email y sus permisos de lectura.</small>';
      return;
    }
    tutoresBusqueda = data || [];
    mostrarResultadosTutores(tutoresBusqueda);
  }

  function seleccionarTutor(id) {
    const tutor = tutoresBusqueda.find(u => String(u.id) === String(id));
    if (!tutor) return;
    tutorSeleccionado = tutor;
    $('#edit-tutor-id').value = tutor.id;
    $('#edit-tutor-busqueda').value = tutor.email || '';
    $('#resultados-tutores').innerHTML = '';
    $('#tutor-seleccionado').textContent =
      `Nuevo tutor seleccionado: ${nombreCompleto(tutor)} · ${tutor.email || ''}`;
  }

  let tutoresBusqueda = [];

  document.addEventListener('DOMContentLoaded', () => {
    configurarEventos();
    cargarPacientes();
  });
})();