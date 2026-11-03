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
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return window.location.href = '../index.html';

    const contenedores = {
        'proximas': document.getElementById('vista-proximas'),
        'historial': document.getElementById('vista-historial'),
        'canceladas': document.getElementById('vista-canceladas')
    };

    try {
        // 1. Obtener los IDs de los pacientes del usuario actual
        const { data: pacientesUsuario } = await client.from('Pacientes').select('id').eq('cliente', user.id);
        const pacienteIds = (pacientesUsuario || []).map(p => p.id);

        if (pacienteIds.length === 0) {
            renderizarMensajeVacio(contenedores.proximas, "No tienes pacientes registrados.");
            renderizarMensajeVacio(contenedores.historial, "No hay historial disponible.");
            renderizarMensajeVacio(contenedores.canceladas, "No hay citas canceladas.");
            return;
        }

        // 2. Obtener todas las citas de esos pacientes
        const { data: citasData, error } = await client
            .from('Citas')
            .select('id, fecha_hora, estado, paciente (nombre, apellido), servicio (nombre)')
            .in('paciente', pacienteIds)
            .order('fecha_hora', { ascending: true });

        if (error) throw error;

        // 3. Filtrar y limpiar contenedores
        const citasProximas = citasData.filter(c => ['PENDIENTE', 'CONFIRMADA'].includes(c.estado));
        const citasHistorial = citasData.filter(c => c.estado === 'TERMINADA');
        const citasCanceladas = citasData.filter(c => c.estado === 'CANCELADA');

        Object.values(contenedores).forEach(c => c.innerHTML = '');

        // 4. Renderizar tarjetas
        renderizarTarjetas(citasProximas, contenedores.proximas, 'proximas');
        renderizarTarjetas(citasHistorial, contenedores.historial, 'historial');
        renderizarTarjetas(citasCanceladas, contenedores.canceladas, 'canceladas');

    } catch (error) {
        console.error("Error al cargar citas:", error);
    }

    document.getElementById('btn-mostrar-calendario').addEventListener('click', () => {
        const cal = document.getElementById('calendario-flotante');
        // Alternar visibilidad
        cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
    });
});

function renderizarTarjetas(citas, contenedor, tipo) {
    if (citas.length === 0) {
        renderizarMensajeVacio(contenedor, "No hay citas en esta sección.");
        return;
    }

    citas.forEach(cita => {
        const fecha = new Date(cita.fecha_hora);
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        let horas = fecha.getHours();
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12 || 12;
        const horaStr = `${horas}:${fecha.getMinutes().toString().padStart(2, '0')} ${ampm}`;

        const nombrePaciente = cita.paciente ? `${cita.paciente.nombre} ${cita.paciente.apellido}` : 'Desconocido';
        const nombreServicio = cita.servicio ? cita.servicio.nombre : 'Servicio';
        
        // Estilos de estado
        let colorEstado = "", bgEstado = "", labelEstado = cita.estado;
        if(cita.estado === 'CONFIRMADA') { bgEstado = '#e8f5e9'; colorEstado = '#2e7d32'; }
        else if(cita.estado === 'PENDIENTE') { bgEstado = '#fff3e0'; colorEstado = '#ef6c00'; }
        else if(cita.estado === 'TERMINADA') { bgEstado = '#e0f2fe'; colorEstado = '#0284c7'; }
        else if(cita.estado === 'CANCELADA') { bgEstado = '#fef2f2'; colorEstado = '#ef4444'; }

        // Botones Footer dependiendo de la vista
        let footerBotones = '';
        if (tipo === 'proximas') {
            footerBotones = `
                <button class="btn-accion secundario"><i class="bi bi-pencil-square"></i> Modificar</button>
                <button class="btn-accion peligro"><i class="bi bi-x-circle"></i> Cancelar</button>
                <button class="btn-accion primario"><i class="bi bi-file-earmark-pdf"></i> Comprobante</button>
            `;
        } else if (tipo === 'historial') {
            footerBotones = `<button class="btn-accion primario" style="width: 100%;"><i class="bi bi-file-earmark-pdf"></i> Ver Comprobante</button>`;
        }

        const tarjeta = `
            <div class="tarjeta-cita-detalle">
                <div class="cita-header">
                    <span class="estado" style="background: ${bgEstado}; color: ${colorEstado}; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; font-weight: bold;">${labelEstado}</span>
                </div>
                <div class="cita-body">
                    <div class="fecha-bloque">
                        <p class="mes">${meses[fecha.getMonth()]}</p>
                        <p class="dia">${fecha.getDate()}</p>
                    </div>
                    <div class="info-bloque">
                        <h3>${nombreServicio}</h3>
                        <p><i class="bi bi-person"></i> Paciente: ${nombrePaciente}</p>
                        <p><i class="bi bi-person-badge"></i> Odontólogo: Dra. Virginia Hernández</p>
                        <p><i class="bi bi-clock"></i> ${horaStr}</p>
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
// MODAL: LÓGICA DE AGENDAR NUEVA CITA Y CALENDARIO
// ==========================================
async function cargarSelectsModalCita() {
    const selectPacientes = document.getElementById('cita-paciente');
    const selectServicios = document.getElementById('cita-servicio');
    
    const { data: { user } } = await client.auth.getUser();
    if (user && selectPacientes) {
        const { data: pacientes } = await client.from('Pacientes').select('id, nombre, apellido').eq('cliente', user.id);
        selectPacientes.innerHTML = '<option value="" disabled selected>Selecciona paciente</option>' + 
            (pacientes || []).map(p => `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
    }

    if (selectServicios) {
        const { data: servicios } = await client.from('Servicios').select('id, nombre');
        selectServicios.innerHTML = '<option value="" disabled selected>Selecciona servicio</option>' + 
            (servicios || []).map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    }
}

function abrirModal() {
    document.getElementById('modalNuevaCita').style.display = 'flex';
    cargarSelectsModalCita();
}

function cerrarModal() {
    document.getElementById('modalNuevaCita').style.display = 'none';
    document.getElementById('formNuevaCita').reset();
    document.getElementById('feedback-cita').textContent = '';
    fechaSeleccionada = null;
    document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('seleccionado'));
    document.querySelectorAll('.btn-hora').forEach(el => el.classList.remove('seleccionada'));
    document.getElementById('costo-cita-clicitas').textContent = "$0.00 MXN";
    document.getElementById('texto-fecha-seleccionada').textContent = 'Selecciona una fecha';
    document.getElementById('calendario-flotante').style.display = 'none';
    renderizarCalendario(); 
}

// Cálculo del precio al cambiar el servicio
document.getElementById('cita-servicio').addEventListener('change', function() {
    const precios = { "1": "800.00", "2": "1,200.00" };
    const costo = precios[this.value] || "0.00";
    document.getElementById('costo-cita-clicitas').textContent = `$${costo} MXN`;
});

let fechaActualCal = new Date();
let mesCal = fechaActualCal.getMonth();
let añoCal = fechaActualCal.getFullYear();
let fechaSeleccionada = null;
const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function renderizarCalendario() {
    const diasGrid = document.getElementById('dias-calendario');
    const mesAñoDisplay = document.getElementById('mes-año-display');
    const btnPrev = document.getElementById('prev-month');
    
    if(!diasGrid) return;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    
    diasGrid.innerHTML = '';
    mesAñoDisplay.textContent = `${nombresMeses[mesCal]} ${añoCal}`;

    const primerDia = new Date(añoCal, mesCal, 1).getDay();
    const diasEnMes = new Date(añoCal, mesCal + 1, 0).getDate();
    let offset = primerDia === 0 ? 6 : primerDia - 1;

    for (let i = 0; i < offset; i++) diasGrid.innerHTML += `<div></div>`;

    for (let i = 1; i <= diasEnMes; i++) {
        const fechaIteracion = new Date(añoCal, mesCal, i);
        const div = document.createElement('div');
        div.classList.add('cal-day');
        div.textContent = i;

        if (fechaIteracion < hoy) {
            div.classList.add('disabled');
        } else {
            div.addEventListener('click', () => seleccionarFechaCita(fechaIteracion, div));
            if (fechaSeleccionada && fechaIteracion.getTime() === fechaSeleccionada.getTime()) {
                div.classList.add('seleccionado');
            }
        }
        diasGrid.appendChild(div);
    }
    btnPrev.disabled = (mesCal === hoy.getMonth() && añoCal === hoy.getFullYear());
}

function seleccionarFechaCita(fecha, elementoDiv) {
    fechaSeleccionada = fecha;
    document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('seleccionado'));
    elementoDiv.classList.add('seleccionado');
    const d = String(fecha.getDate()).padStart(2, '0'), m = String(fecha.getMonth() + 1).padStart(2, '0'), y = fecha.getFullYear();
    
    // Guardar en el input oculto
    document.getElementById('cita-fecha').value = `${y}-${m}-${d}`;
    
    // Mostrar la fecha visualmente y ocultar el calendario flotante
    document.getElementById('texto-fecha-seleccionada').textContent = `${d}/${m}/${y}`;
    document.getElementById('calendario-flotante').style.display = 'none';
}

function renderizarHorariosDisponibles() {
    const contenedor = document.getElementById('horarios-contenedor');
    if(!contenedor) return;
    contenedor.innerHTML = '';
    const horarios = [
        { texto: "4:30 PM", valor: "16:30:00" }, { texto: "5:00 PM", valor: "17:00:00" },
        { texto: "5:30 PM", valor: "17:30:00" }, { texto: "6:00 PM", valor: "18:00:00" },
        { texto: "6:30 PM", valor: "18:30:00" }, { texto: "7:00 PM", valor: "19:00:00" },
        { texto: "7:30 PM", valor: "19:30:00" }, { texto: "8:00 PM", valor: "20:00:00" }
    ];
    horarios.forEach(h => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.classList.add('btn-hora'); btn.textContent = h.texto;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-hora').forEach(el => el.classList.remove('seleccionada'));
            btn.classList.add('seleccionada');
            document.getElementById('cita-hora').value = h.valor;
        });
        contenedor.appendChild(btn);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    renderizarHorariosDisponibles();

    document.getElementById('prev-month')?.addEventListener('click', () => {
        mesCal--; if (mesCal < 0) { mesCal = 11; añoCal--; }
        renderizarCalendario();
    });
    document.getElementById('next-month')?.addEventListener('click', () => {
        mesCal++; if (mesCal > 11) { mesCal = 0; añoCal++; }
        renderizarCalendario();
    });

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
                fb.style.color = "#e74c3c"; fb.textContent = "Error: " + error.message;
            } finally { btnConfirmar.disabled = false; }
        });
    }
});