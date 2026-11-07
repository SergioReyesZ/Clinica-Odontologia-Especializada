// ==========================================
// VARIABLES GLOBALES
// ==========================================
let catalogoServicios = [];
let idCitaCancelar = null;

let calActual = {
    mes: new Date().getMonth(),
    año: new Date().getFullYear(),
    fechaSeleccionada: null,
    modo: 'agendar'
};
const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const franjasHorarias = [
    { texto: "16:30", valor: "16:30:00" }, { texto: "17:00", valor: "17:00:00" },
    { texto: "17:30", valor: "17:30:00" }, { texto: "18:00", valor: "18:00:00" },
    { texto: "18:30", valor: "18:30:00" }, { texto: "19:00", valor: "19:00:00" },
    { texto: "19:30", valor: "19:30:00" }
];

// ==========================================
// CONTROL DE PESTAÑAS (VISTAS)
// ==========================================
function cambiarVista(idVistaDestino, botonClickeado) {
    document.querySelectorAll('.grid-citas').forEach(vista => vista.classList.add('oculto'));
    document.querySelectorAll('.filtro').forEach(boton => boton.classList.remove('activo'));
    document.getElementById('vista-' + idVistaDestino).classList.remove('oculto');
    botonClickeado.classList.add('activo');
}

// ==========================================
// LECTURA DE CITAS DESDE SUPABASE
// ==========================================

// ==========================================
// INICIALIZACIÓN DE LA PÁGINA Y SKELETON
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {

    const contenedores = {
        proximas: document.getElementById('vista-proximas'),
        historial: document.getElementById('vista-historial'),
        canceladas: document.getElementById('vista-canceladas')
    };

    try {

        // 1. Verificar sesión del usuario
        const { data: { user }, error: errorUsuario } =
            await client.auth.getUser();

        if (errorUsuario) throw errorUsuario;

        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        // 2. Consultar pacientes del usuario
        const { data: pacientesUsuario, error: errorPacientes } =
            await client
                .from('Pacientes')
                .select('id')
                .eq('cliente', user.id);

        if (errorPacientes) throw errorPacientes;

        const pacienteIds = (pacientesUsuario || []).map(p => p.id);

        // 3. Si no tiene pacientes, mostrar mensajes vacíos
        if (pacienteIds.length === 0) {

            renderizarMensajeVacio(
                contenedores.proximas,
                "No tienes pacientes registrados."
            );

            renderizarMensajeVacio(
                contenedores.historial,
                "No hay historial disponible."
            );

            renderizarMensajeVacio(
                contenedores.canceladas,
                "No hay citas canceladas."
            );

            return;
        }

        // 4. Consultar citas del usuario
        const { data: citasData, error } = await client
            .from('Citas')
            .select(`
                id,
                fecha_hora,
                estado,
                paciente (nombre, apellido),
                servicio (id, nombre, costo)
            `)
            .in('paciente', pacienteIds)
            .order('fecha_hora', { ascending: true });

        if (error) throw error;

        // 5. Separar citas por estado
        const citasProximas = citasData.filter(c =>
            ['PENDIENTE', 'CONFIRMADA'].includes(c.estado)
        );

        const citasHistorial = citasData.filter(c =>
            c.estado === 'TERMINADA'
        );

        const citasCanceladas = citasData.filter(c =>
            c.estado === 'CANCELADA'
        );

        // 6. Limpiar contenedores
        Object.values(contenedores).forEach(c => {
            c.innerHTML = '';
        });

        // 7. Renderizar tarjetas
        renderizarTarjetas(
            citasProximas,
            contenedores.proximas,
            'proximas'
        );

        renderizarTarjetas(
            citasHistorial,
            contenedores.historial,
            'historial'
        );

        renderizarTarjetas(
            citasCanceladas,
            contenedores.canceladas,
            'canceladas'
        );

        // 8. Precargar servicios
        await cargarCatalogoServicios();

        // 9. Inicializar calendarios
        inicializarEventosCalendarios();

    } catch (error) {

        console.error("Error al cargar citas:", error);

        // Mostrar un mensaje si ocurre un error
        Object.values(contenedores).forEach(contenedor => {
            if (contenedor) {
                renderizarMensajeVacio(
                    contenedor,
                    "No fue posible cargar tus citas. Intenta nuevamente."
                );
            }
        });

    } finally {

        // 10. Retirar el estado de carga
        const contenedorPrincipal =
            document.querySelector('.contenedor-principal');

        if (contenedorPrincipal) {
            contenedorPrincipal.classList.remove('cargando');
        }

        document.body.classList.remove('dashboard-cargando');
    }

});

async function cargarCatalogoServicios() {
    if (catalogoServicios.length === 0) {
        const { data: servicios, error } = await client.from('Servicios').select('id, nombre, costo');
        if (!error && servicios) {
            catalogoServicios = servicios;
        }
    }
    poblarSelectsServicios();
}

function poblarSelectsServicios() {
    const selectServicios = document.getElementById('cita-servicio');
    const modSelectServicios = document.getElementById('mod-cita-servicio');

    const opcionesServicios = '<option value="" disabled selected>Selecciona servicio</option>' +
        catalogoServicios.map(s => `<option value="${s.id}">${s.nombre} ($${s.costo} MXN)</option>`).join('');

    if (selectServicios) selectServicios.innerHTML = opcionesServicios;
    if (modSelectServicios) modSelectServicios.innerHTML = opcionesServicios;
}

function renderizarTarjetas(citas, contenedor, tipo) {
    if (citas.length === 0) {
        renderizarMensajeVacio(contenedor, "No hay citas en esta sección.");
        return;
    }

    citas.forEach(cita => {
        const [fechaParte, horaCompleta] = cita.fecha_hora.split('T');
        const horaParte = horaCompleta.substring(0, 8);

        const [añoStr, mesStr, diaStr] = fechaParte.split('-');
        const [hStr, mStr] = horaParte.split(':');

        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const mesIndex = parseInt(mesStr) - 1;

        const horas = String(parseInt(hStr)).padStart(2, '0');
        const minutos = String(parseInt(mStr)).padStart(2, '0');

        const horaStr = `${horas}:${minutos}`;

        const nombrePaciente = cita.paciente ? `${cita.paciente.nombre} ${cita.paciente.apellido}` : 'Desconocido';
        const nombreServicio = cita.servicio ? cita.servicio.nombre : 'Servicio';
        const idServicio = cita.servicio ? cita.servicio.id : '';
        const costoCita = cita.servicio?.costo || '0.00';

        let colorEstado = "", bgEstado = "", labelEstado = cita.estado;
        if (cita.estado === 'CONFIRMADA') { bgEstado = '#e8f5e9'; colorEstado = '#2e7d32'; }
        else if (cita.estado === 'PENDIENTE') { bgEstado = '#fff3e0'; colorEstado = '#ef6c00'; }
        else if (cita.estado === 'TERMINADA') { bgEstado = '#e0f2fe'; colorEstado = '#0284c7'; }
        else if (cita.estado === 'CANCELADA') { bgEstado = '#fef2f2'; colorEstado = '#ef4444'; }

        const fechaStrPdf = `${diaStr}/${mesStr}/${añoStr}`;

        const ahora = new Date().getTime();
        const tiempoCita = new Date(parseInt(añoStr), mesIndex, parseInt(diaStr), parseInt(hStr), parseInt(mStr)).getTime();
        const diferenciaHoras = (tiempoCita - ahora) / (1000 * 60 * 60);
        const esModificable = diferenciaHoras >= 24;

        let footerBotones = '';
        if (tipo === 'proximas') {
            if (esModificable) {
                footerBotones = `
                    <button class="btn-accion secundario" onclick="abrirModalModificar(${cita.id}, '${nombrePaciente}', '${idServicio}', '${cita.fecha_hora}')"><i class="bi bi-pencil-square"></i> Modificar</button>
                    <button class="btn-accion peligro" onclick="abrirModalCancelar(${cita.id})"><i class="bi bi-x-circle"></i> Cancelar</button>
                    <button class="btn-accion primario" onclick="descargarComprobante(${cita.id}, '${nombrePaciente}', '${nombreServicio}', '${fechaStrPdf}', '${horaStr}', '${costoCita}')"><i class="bi bi-file-earmark-pdf"></i> Comprobante</button>
                `;
            } else {
                footerBotones = `
                    <p style="width: 100%; text-align: center; color: #ef4444; font-size: 0.85rem; margin-bottom: 0.5rem;">
                        <i class="bi bi-exclamation-triangle"></i> Faltan menos de 24 horas, no modificable.
                    </p>
                    <button class="btn-accion secundario" disabled style="opacity: 0.5; cursor: not-allowed;"><i class="bi bi-pencil-square"></i> Modificar</button>
                    <button class="btn-accion peligro" disabled style="opacity: 0.5; cursor: not-allowed;"><i class="bi bi-x-circle"></i> Cancelar</button>
                    <button class="btn-accion primario" onclick="descargarComprobante(${cita.id}, '${nombrePaciente}', '${nombreServicio}', '${fechaStrPdf}', '${horaStr}', '${costoCita}')"><i class="bi bi-file-earmark-pdf"></i> Comprobante</button>
                `;
            }
        } else {
            footerBotones = `<button class="btn-accion primario" style="width: 100%;" onclick="descargarComprobante(${cita.id}, '${nombrePaciente}', '${nombreServicio}', '${fechaStrPdf}', '${horaStr}', '${costoCita}')"><i class="bi bi-file-earmark-pdf"></i> Ver Comprobante</button>`;
        }

        const tarjeta = `
            <div class="tarjeta-cita-detalle">
                <div class="cita-header">
                    <span class="estado" style="background: ${bgEstado}; color: ${colorEstado}; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; font-weight: bold;">${labelEstado}</span>
                </div>
                <div class="cita-body">
                    <div class="fecha-bloque">
                        <p class="mes">${meses[mesIndex]}</p>
                        <p class="dia">${parseInt(diaStr)}</p>
                    </div>
                    <div class="info-bloque">
                        <h3>${nombreServicio}</h3>
                        <p><i class="bi bi-person"></i> Paciente: ${nombrePaciente}</p>
                        <p><i class="bi bi-clock"></i> ${horaStr}</p>
                        <p><i class="bi bi-tag"></i> Costo: <span class="precio">$${costoCita} MXN</span></p>
                    </div>
                </div>
                ${footerBotones ? `<hr class="linea"><div class="cita-footer">${footerBotones}</div>` : ''}
            </div>
        `;
        contenedor.innerHTML += tarjeta;
    });
}

function renderizarMensajeVacio(contenedor, mensaje) {
    contenedor.innerHTML = `
        <div style="width: 100%; grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
            <i class="bi bi-calendar-x" style="font-size: 3rem; color: #cbd5e1; display: block; margin-bottom: 1rem;"></i>
            <h3 style="margin: 0; color: #475569;">${mensaje}</h3>
        </div>
    `;
}

// ==========================================
// CARGAR SELECTS DE PACIENTES Y SERVICIOS
// ==========================================
async function cargarSelectsModalCita() {
    const { data: { user } } = await client.auth.getUser();

    const selectPacientes = document.getElementById('cita-paciente');
    if (user && selectPacientes) {
        const { data: pacientes } = await client.from('Pacientes').select('id, nombre, apellido').eq('cliente', user.id);
        selectPacientes.innerHTML = '<option value="" disabled selected>Selecciona paciente</option>' +
            (pacientes || []).map(p => `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
    }

    await cargarCatalogoServicios();
}

// Eventos para actualizar costos al cambiar de servicio
document.getElementById('cita-servicio')?.addEventListener('change', function () {
    const servicio = catalogoServicios.find(s => s.id == this.value);
    document.getElementById('costo-cita-clicitas').textContent = servicio ? `$${servicio.costo} MXN` : "$0.00 MXN";
});

document.getElementById('mod-cita-servicio')?.addEventListener('change', function () {
    const servicio = catalogoServicios.find(s => s.id == this.value);
    document.getElementById('costo-mod-cita').textContent = servicio ? `$${servicio.costo} MXN` : "$0.00 MXN";
});

// ==========================================
// CALENDARIO REUTILIZABLE
// ==========================================

// ==========================================
// CONTROL DE FECHA Y HORA ACTUAL
// ==========================================

function obtenerFechaLocal() {
    const ahora = new Date();

    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    return `${año}-${mes}-${dia}`;
}

function horaYaPaso(fecha, hora) {
    if (fecha !== obtenerFechaLocal()) return false;

    const ahora = new Date();
    const [horas, minutos] = hora.split(':').map(Number);

    const minutosActuales =
        ahora.getHours() * 60 + ahora.getMinutes();

    const minutosHorario = horas * 60 + minutos;

    return minutosActuales >= minutosHorario;
}

function diaSinHorarios(fecha, ultimaHora = "19:30:00") {
    if (fecha !== obtenerFechaLocal()) return false;

    const ahora = new Date();
    const [horas, minutos] = ultimaHora.split(':').map(Number);

    const minutosActuales =
        ahora.getHours() * 60 + ahora.getMinutes();

    const minutosFinales = horas * 60 + minutos;

    return minutosActuales >= minutosFinales;
}

function inicializarEventosCalendarios() {
    document.getElementById('btn-mostrar-calendario').addEventListener('click', () => {
        const cal = document.getElementById('calendario-flotante');
        cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('prev-month').addEventListener('click', () => cambiarMes(-1, 'agendar'));
    document.getElementById('next-month').addEventListener('click', () => cambiarMes(1, 'agendar'));

    document.getElementById('btn-mostrar-calendario-mod')?.addEventListener('click', () => {
        const cal = document.getElementById('calendario-flotante-mod');
        cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('prev-month-mod')?.addEventListener('click', () => cambiarMes(-1, 'modificar'));
    document.getElementById('next-month-mod')?.addEventListener('click', () => cambiarMes(1, 'modificar'));
}

function cambiarMes(direccion, modo) {
    calActual.mes += direccion;
    if (calActual.mes < 0) { calActual.mes = 11; calActual.año--; }
    else if (calActual.mes > 11) { calActual.mes = 0; calActual.año++; }
    renderizarCalendario(modo);
}


function renderizarCalendario(modo) {
    const prefijo = modo === 'modificar' ? '-mod' : '';
    const diasGrid = document.getElementById(`dias-calendario${prefijo}`);
    const mesAñoDisplay = document.getElementById(`mes-año-display${prefijo}`);
    const btnPrev = document.getElementById(`prev-month${prefijo}`);

    if (!diasGrid || !mesAñoDisplay || !btnPrev) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    diasGrid.innerHTML = '';

    mesAñoDisplay.textContent =
        `${nombresMeses[calActual.mes]} ${calActual.año}`;

    const primerDia = new Date(
        calActual.año,
        calActual.mes,
        1
    ).getDay();

    // Desplazamiento original de semanas de lunes a domingo.
    const offsetLunes = primerDia === 0 ? 6 : primerDia - 1;

    const diasEnMes = new Date(
        calActual.año,
        calActual.mes + 1,
        0
    ).getDate();

    // Columnas visuales:
    // Sá = 1, Lu = 2, Ma = 3, Mi = 4,
    // Ju = 5, Vi = 6, Do = 7.
    const columnaPorDia = {
        0: 7, // Domingo
        1: 2, // Lunes
        2: 3, // Martes
        3: 4, // Miércoles
        4: 5, // Jueves
        5: 6, // Viernes
        6: 1  // Sábado
    };

    for (let i = 1; i <= diasEnMes; i++) {
        const fechaIteracion = new Date(
            calActual.año,
            calActual.mes,
            i
        );

        const diaSemana = fechaIteracion.getDay();

        // Calcular la fila según la semana real.
        const fila = Math.floor(
            (i - 1 + offsetLunes) / 7
        ) + 1;

        const columna = columnaPorDia[diaSemana];

        const fechaLocal = [
            fechaIteracion.getFullYear(),
            String(fechaIteracion.getMonth() + 1).padStart(2, '0'),
            String(fechaIteracion.getDate()).padStart(2, '0')
        ].join('-');

        // Comprobar si el día ya pasó
        const esPasado = fechaIteracion < hoy;

        // Comprobar si ya no quedan horarios disponibles
        const sinHorarios = diaSinHorarios(fechaLocal, "19:30:00");

        // Solamente sábado y domingo son fines de semana.
        const esFinDeSemana =
            diaSemana === 6 || diaSemana === 0;

        const div = document.createElement('div');
        div.classList.add('cal-day');
        div.textContent = i;

        // Colocar el número en su posición exacta.
        div.style.gridRowStart = fila;
        div.style.gridColumnStart = columna;

        if (
            calActual.fechaSeleccionada &&
            fechaIteracion.getTime() ===
            calActual.fechaSeleccionada.getTime()
        ) {
            div.classList.add('seleccionado');
        }

        if (esPasado || esFinDeSemana || sinHorarios) {
            div.classList.add('disabled');
        } else {
            div.addEventListener('click', () => {
                seleccionarFechaCita(fechaIteracion, div, modo);
            });
        }

        diasGrid.appendChild(div);
    }

    btnPrev.disabled = (
        calActual.mes === hoy.getMonth() &&
        calActual.año === hoy.getFullYear()
    );
}


function seleccionarFechaCita(fecha, elementoDiv, modo) {
    calActual.fechaSeleccionada = fecha;
    const prefijoContenedor = modo === 'modificar' ? '#dias-calendario-mod' : '#dias-calendario';

    document.querySelectorAll(`${prefijoContenedor} .cal-day`).forEach(el => el.classList.remove('seleccionado'));
    elementoDiv.classList.add('seleccionado');

    const d = String(fecha.getDate()).padStart(2, '0'), m = String(fecha.getMonth() + 1).padStart(2, '0'), y = fecha.getFullYear();
    const fechaFormateada = `${y}-${m}-${d}`;

    const inputPrefijo = modo === 'modificar' ? 'mod-cita' : 'cita';
    const uiPrefijo = modo === 'modificar' ? '-mod' : '';

    document.getElementById(`${inputPrefijo}-fecha`).value = fechaFormateada;
    document.getElementById(`texto-fecha-seleccionada${uiPrefijo}`).textContent = `${d}/${m}/${y}`;
    document.getElementById(`calendario-flotante${uiPrefijo}`).style.display = 'none';

    document.querySelectorAll(`#horarios-contenedor${uiPrefijo} .btn-hora`).forEach(el => el.classList.remove('seleccionada'));
    document.getElementById(`${inputPrefijo}-hora`).value = '';

    verificarHorariosOcupados(fechaFormateada, modo);
}

async function verificarHorariosOcupados(fechaStr, modo, horaOriginalParaIgnorar = null) {
    const odontologoId = 1;
    const prefijoUi = modo === 'modificar' ? '-mod' : '';

    try {
        const { data: citasOcupadas, error } = await client.rpc('obtener_horarios_ocupados', { p_fecha: fechaStr });
        if (error) throw error;

        const horasOcupadas = (citasOcupadas || [])
            .filter(c => c.odontologo === parseInt(odontologoId))
            .map(c => c.fecha_hora.split('T')[1].substring(0, 8));

        document.querySelectorAll(`#horarios-contenedor${prefijoUi} .btn-hora`).forEach(btn => {
            const valorHora = btn.dataset.valor;

            const estaOcupada =
                horasOcupadas.includes(valorHora) &&
                valorHora !== horaOriginalParaIgnorar;

            const yaPaso = horaYaPaso(fechaStr, valorHora);

            if (estaOcupada || yaPaso) {
                btn.disabled = true;
                btn.classList.add('ocupada');

                btn.style.backgroundColor = "#e2e8f0";
                btn.style.color = "#94a3b8";
                btn.style.cursor = "not-allowed";
            } else {
                btn.disabled = false;
                btn.classList.remove('ocupada');

                btn.style.backgroundColor = "";
                btn.style.color = "";
                btn.style.cursor = "pointer";
            }
        });
    } catch (err) { console.error("Error al verificar horarios ocupados:", err.message); }
}

function renderizarHorariosDisponibles(modo) {
    const prefijo = modo === 'modificar' ? '-mod' : '';
    const contenedor = document.getElementById(`horarios-contenedor${prefijo}`);
    if (!contenedor) return;
    contenedor.innerHTML = '';

    franjasHorarias.forEach(h => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.classList.add('btn-hora'); btn.textContent = h.texto;
        btn.dataset.valor = h.valor;
        btn.addEventListener('click', () => seleccionarHoraCita(h.valor, btn, modo));
        contenedor.appendChild(btn);
    });
}

function seleccionarHoraCita(valor, boton, modo) {
    const prefijoUi = modo === 'modificar' ? '-mod' : '';
    const inputId = modo === 'modificar' ? 'mod-cita-hora' : 'cita-hora';

    document.querySelectorAll(`#horarios-contenedor${prefijoUi} .btn-hora`).forEach(el => el.classList.remove('seleccionada'));
    boton.classList.add('seleccionada');
    document.getElementById(inputId).value = valor;
}

// ==========================================
// MODALES: ABRIR Y CERRAR
// ==========================================
function abrirModal() {
    calActual = { mes: new Date().getMonth(), año: new Date().getFullYear(), fechaSeleccionada: null, modo: 'agendar' };
    renderizarCalendario('agendar');
    renderizarHorariosDisponibles('agendar');
    cargarSelectsModalCita();
    document.getElementById('modalNuevaCita').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalNuevaCita').style.display = 'none';
    document.getElementById('formNuevaCita').reset();
    document.getElementById('feedback-cita').textContent = '';
    document.getElementById('costo-cita-clicitas').textContent = "$0.00 MXN";
    document.getElementById('texto-fecha-seleccionada').textContent = 'Selecciona una fecha';
    document.getElementById('calendario-flotante').style.display = 'none';
}

// --- SUBMIT NUEVA CITA ---
const formNuevaCita = document.getElementById('formNuevaCita');
if (formNuevaCita) {
    formNuevaCita.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnConfirmar = document.getElementById('btnConfirmarCita');
        const fb = document.getElementById('feedback-cita');

        const pacienteId = document.getElementById('cita-paciente').value;
        const servicioId = document.getElementById('cita-servicio').value;
        const odontologoId = document.getElementById('cita-odontologo').value;
        const fecha = document.getElementById('cita-fecha').value;
        const hora = document.getElementById('cita-hora').value;

        if (!pacienteId || !servicioId || !odontologoId || !fecha || !hora) return;

        if (horaYaPaso(fecha, hora)) {
            fb.style.color = "#e74c3c";
            fb.textContent = "Ese horario ya pasó. Selecciona otro horario.";
            return;
        }
        try {
            btnConfirmar.disabled = true; fb.style.color = "#3498db"; fb.textContent = "Agendando...";
            const { error } = await client.from('Citas').insert([{
                fecha_hora: `${fecha}T${hora}`, estado: 'PENDIENTE',
                paciente: parseInt(pacienteId), odontologo: parseInt(odontologoId), servicio: parseInt(servicioId)
            }]);
            if (error) throw error;
            fb.style.color = "#2ecc71"; fb.textContent = "¡Cita agendada!";
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            fb.style.color = "#e74c3c";
            fb.textContent = error.message.includes('idx_cita_unica') ? "Error: Un paciente solo puede tener una cita por día." : "Error al agendar: " + error.message;
        } finally { btnConfirmar.disabled = false; }
    });
}

// --- MODIFICAR CITA ---
async function abrirModalModificar(idCita, nombrePaciente, idServicio, fechaHoraStr) {
    document.getElementById('modalModificarCita').style.display = 'flex';
    document.getElementById('mod-cita-id').value = idCita;
    document.getElementById('mod-cita-paciente').value = nombrePaciente;

    // Asegurar que los servicios estén cargados en el select de modificación
    await cargarCatalogoServicios();

    const [fechaStr, horaResto] = fechaHoraStr.split('T');
    const horaStr = horaResto ? horaResto.substring(0, 8) : '';
    const [añoStr, mesStr, diaStr] = fechaStr.split('-');

    document.getElementById('mod-cita-servicio').value = idServicio;
    document.getElementById('mod-cita-fecha').value = fechaStr;
    document.getElementById('mod-cita-hora').value = horaStr;

    document.getElementById('texto-fecha-seleccionada-mod').textContent = `${diaStr}/${mesStr}/${añoStr}`;
    calActual = {
        mes: parseInt(mesStr) - 1,
        año: parseInt(añoStr),
        fechaSeleccionada: new Date(parseInt(añoStr), parseInt(mesStr) - 1, parseInt(diaStr)),
        modo: 'modificar'
    };

    renderizarCalendario('modificar');
    renderizarHorariosDisponibles('modificar');

    verificarHorariosOcupados(fechaStr, 'modificar', horaStr).then(() => {
        const btnHora = document.querySelector(`#horarios-contenedor-mod .btn-hora[data-valor="${horaStr}"]`);
        if (btnHora) {
            btnHora.classList.add('seleccionada');
        }
    });

    const evento = new Event('change');
    document.getElementById('mod-cita-servicio').dispatchEvent(evento);
}

function cerrarModalModificar() {
    document.getElementById('modalModificarCita').style.display = 'none';
    document.getElementById('formModificarCita').reset();
    document.getElementById('feedback-modificar').textContent = '';
    document.getElementById('calendario-flotante-mod').style.display = 'none';
}

document.getElementById('formModificarCita').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarModificacion');
    const fb = document.getElementById('feedback-modificar');

    const id = document.getElementById('mod-cita-id').value;
    const servicioId = document.getElementById('mod-cita-servicio').value;
    const fecha = document.getElementById('mod-cita-fecha').value;
    const hora = document.getElementById('mod-cita-hora').value;

    if (!fecha || !hora) {
        fb.style.color = "#e74c3c";
        fb.textContent = "Selecciona una fecha y un horario.";
        return;
    }

    if (horaYaPaso(fecha, hora)) {
        fb.style.color = "#e74c3c";
        fb.textContent = "Ese horario ya pasó. Selecciona otro horario.";
        return;
    }
    try {
        btn.disabled = true; fb.style.color = "#3498db"; fb.textContent = "Guardando cambios...";
        const { error } = await client.from('Citas').update({
            servicio: parseInt(servicioId),
            fecha_hora: `${fecha}T${hora}`
        }).eq('id', id);

        if (error) throw error;

        fb.style.color = "#2ecc71"; fb.textContent = "¡Cita modificada!";
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        btn.disabled = false; fb.style.color = "#e74c3c";
        fb.textContent = error.message.includes('idx_cita_unica') ? "Error: El paciente ya tiene una cita agendada ese día." : "Error al modificar: " + error.message;
    }
});

// --- CANCELAR CITA ---
function abrirModalCancelar(id) {
    idCitaCancelar = id;
    document.getElementById('modalCancelarCita').style.display = 'flex';
}

function cerrarModalCancelar() {
    document.getElementById('modalCancelarCita').style.display = 'none';
    idCitaCancelar = null;
}

document.getElementById('btnConfirmarCancelacion').addEventListener('click', async () => {
    if (!idCitaCancelar) return;
    try {
        const btn = document.getElementById('btnConfirmarCancelacion');
        btn.textContent = "Cancelando..."; btn.disabled = true;
        const { error } = await client.from('Citas').update({ estado: 'CANCELADA' }).eq('id', idCitaCancelar);
        if (error) throw error;
        window.location.reload();
    } catch (err) {
        alert('Error al cancelar la cita: ' + err.message);
        document.getElementById('btnConfirmarCancelacion').textContent = "Cancelar cita";
        document.getElementById('btnConfirmarCancelacion').disabled = false;
    }
});

// ==========================================
// COMPROBANTE EN PDF (IMPRESIÓN / VENTANA)
// ==========================================
function descargarComprobante(id, paciente, servicio, fecha, hora, costo) {
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Comprobante de Cita - Odontología Especializada</title>
            <style>
                /* Configuración estricta para una sola hoja Carta */
                @page {
                    size: letter;
                    margin: 10mm 15mm;
                }
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 0; 
                    margin: 0 auto; 
                    color: #333; 
                    max-width: 100%; 
                    line-height: 1.4; 
                    font-size: 13px;
                }
                .header { 
                    text-align: center; 
                    border-bottom: 2px solid #0056e0; 
                    padding-bottom: 0.8rem; 
                    margin-bottom: 1rem; 
                }
                .header img { 
                    width: 100px; 
                    margin-bottom: 0.3rem; 
                }
                .header h2 { 
                    margin: 0; 
                    color: #0056e0; 
                    font-size: 1.5rem; 
                }
                .header p { 
                    margin: 0.2rem 0; 
                    font-size: 0.85rem; 
                    color: #555; 
                }
                .comprobante-title { 
                    margin-top: 0.8rem; 
                    font-size: 1rem; 
                    color: #333; 
                    letter-spacing: 1px; 
                }
                
                .details { 
                    background: #f8fafc; 
                    padding: 1rem 1.2rem; 
                    border-radius: 8px; 
                    border: 1px solid #e2e8f0; 
                    margin-bottom: 1rem; 
                }
                .details p { 
                    margin: 0.5rem 0; 
                    font-size: 0.95rem; 
                    border-bottom: 1px dashed #cbd5e1; 
                    padding-bottom: 0.4rem;
                }
                .details p:last-child { border-bottom: none; padding-bottom: 0; }
                
                .costo-grande { 
                    text-align: center; 
                    font-size: 1.6rem; 
                    color: #0056e0; 
                    font-weight: bold; 
                    margin: 1rem 0; 
                    padding: 0.8rem; 
                    background: #eff6ff; 
                    border-radius: 8px;
                }
                .costo-grande span { 
                    font-size: 0.85rem; 
                    color: #64748b; 
                    display: block; 
                    font-weight: normal; 
                    margin-bottom: 0.2rem; 
                }
                
                .recomendaciones { 
                    background: #fffbeb; 
                    padding: 0.8rem 1rem; 
                    border-left: 4px solid #f59e0b; 
                    margin-bottom: 1rem; 
                    border-radius: 4px;
                }
                .recomendaciones h4 { 
                    margin: 0 0 0.3rem 0; 
                    color: #b45309; 
                    font-size: 0.95rem; 
                }
                .recomendaciones ul { 
                    margin: 0; 
                    padding-left: 1.2rem; 
                    color: #78350f; 
                    font-size: 0.85rem; 
                }
                .recomendaciones li { 
                    margin-bottom: 0.3rem; 
                }
                
                .footer { 
                    text-align: center; 
                    font-size: 0.8rem; 
                    color: #94a3b8; 
                    border-top: 1px solid #e2e8f0; 
                    padding-top: 0.6rem; 
                    margin-top: 1rem;
                }
                .btn-print { 
                    display: block; 
                    width: 100%; 
                    background: #0056e0; 
                    color: white; 
                    border: none; 
                    padding: 0.8rem; 
                    font-size: 1rem; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-weight: bold; 
                    margin-top: 1rem;
                }
                @media print { 
                    .btn-print { display: none; } 
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="../iconos/logo.png" alt="Logo">
                <h2>Odontología Especializada</h2>
                <p>Jesús Elías Piña #1003, Col. Del Pueblo<br>Tampico, Tamaulipas, C.P. 89190</p>
                <p>Tel: 833 695 7177 | hola@odontologia.com</p>
                <h3 class="comprobante-title">COMPROBANTE DE CITA</h3>
            </div>
            
            <div class="details">
                <p><strong>Folio / ID de Cita:</strong> #0045${id}</p>
                <p><strong>Paciente:</strong> ${paciente}</p>
                <p><strong>Odontólogo:</strong> Dra. Virginia Hernández Sánchez</p>
                <p><strong>Servicio Programado:</strong> ${servicio}</p>
                <p><strong>Fecha de la Cita:</strong> ${fecha}</p>
                <p><strong>Hora de la Cita:</strong> ${hora}</p>
            </div>

            <div class="costo-grande">
                <span>Costo Estimado</span>
                $${costo} MXN
            </div>
            
            <div class="recomendaciones">
                <h4>Recomendaciones para su visita:</h4>
                <ul>
                    <li>Le pedimos amablemente llegar 10 minutos antes de su cita.</li>
                    <li>En caso de no poder asistir, le solicitamos cancelar con al menos 24 horas de anticipación desde su portal web.</li>
                    <li>Si tiene dudas o requiere indicaciones especiales, no dude en contactarnos.</li>
                </ul>
            </div>
            
            <div class="footer">Generado desde el Portal de Pacientes - Odontología Especializada</div>
            <button class="btn-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
            <script>window.onload = function() { setTimeout(() => window.print(), 500); }</script>
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
}
