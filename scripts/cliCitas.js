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

        // 2. Obtener todas las citas (SE AGREGÓ COSTO AL SERVICIO PARA EL PDF)
        const { data: citasData, error } = await client
            .from('Citas')
            .select('id, fecha_hora, estado, paciente (nombre, apellido), servicio (id, nombre, costo)')
            .in('paciente', pacienteIds)
            .order('fecha_hora', { ascending: true });

        if (error) throw error;

        // 3. Filtrar y limpiar contenedores
        const citasProximas = (citasData || []).filter(c => ['PENDIENTE', 'CONFIRMADA'].includes(c.estado));
        const citasHistorial = (citasData || []).filter(c => c.estado === 'TERMINADA');
        const citasCanceladas = (citasData || []).filter(c => c.estado === 'CANCELADA');

        Object.values(contenedores).forEach(c => c.innerHTML = '');

        // 4. Renderizar tarjetas
        renderizarTarjetas(citasProximas, contenedores.proximas, 'proximas');
        renderizarTarjetas(citasHistorial, contenedores.historial, 'historial');
        renderizarTarjetas(citasCanceladas, contenedores.canceladas, 'canceladas');

    } catch (error) {
        console.error("Error al cargar citas:", error);
    }

    const btnCalendario = document.getElementById('btn-mostrar-calendario');
    if (btnCalendario) {
        btnCalendario.addEventListener('click', () => {
            const cal = document.getElementById('calendario-flotante');
            if (cal) {
                cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
});

function renderizarTarjetas(citas, contenedor, tipo) {
    if (citas.length === 0) {
        renderizarMensajeVacio(contenedor, "No hay citas en esta sección.");
        return;
    }

    citas.forEach(cita => {
        const fecha = new Date(cita.fecha_hora);
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        let horas = fecha.getUTCHours();
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12 || 12;
        const minutos = fecha.getUTCMinutes().toString().padStart(2, '0');
        const horaStr = `${horas}:${minutos} ${ampm}`;

        const nombrePaciente = cita.paciente ? `${cita.paciente.nombre} ${cita.paciente.apellido}` : 'Desconocido';
        const nombreServicio = cita.servicio ? cita.servicio.nombre : 'Servicio';
        
        // Obtener costo formateado para pasarlo al PDF
        const costoServicio = cita.servicio && cita.servicio.costo ? parseFloat(cita.servicio.costo).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00';

        // Estilos de estado
        let colorEstado = "", bgEstado = "", labelEstado = cita.estado;
        if(cita.estado === 'CONFIRMADA') { bgEstado = '#e8f5e9'; colorEstado = '#2e7d32'; }
        else if(cita.estado === 'PENDIENTE') { bgEstado = '#fff3e0'; colorEstado = '#ef6c00'; }
        else if(cita.estado === 'TERMINADA') { bgEstado = '#e0f2fe'; colorEstado = '#0284c7'; }
        else if(cita.estado === 'CANCELADA') { bgEstado = '#fef2f2'; colorEstado = '#ef4444'; }

        // Botones Footer (SE PASÓ EL COSTO AL PDF)
        let footerBotones = '';
        if (tipo === 'proximas') {
            footerBotones = `
                <button class="btn-accion secundario" onclick="abrirModalModificar('${cita.id}')"><i class="bi bi-pencil-square"></i> Modificar</button>
                <button class="btn-accion peligro" onclick="cancelarCita('${cita.id}')"><i class="bi bi-x-circle"></i> Cancelar</button>
                <button class="btn-accion primario" onclick="descargarComprobante('${cita.id}', '${nombrePaciente}', '${nombreServicio}', '${fecha.getUTCDate()} de ${meses[fecha.getUTCMonth()]} del ${fecha.getUTCFullYear()}', '${horaStr}', '${costoServicio}')"><i class="bi bi-file-earmark-pdf"></i> Comprobante</button>
            `;
        } else if (tipo === 'historial') {
            footerBotones = `<button class="btn-accion primario" style="width: 100%;" onclick="descargarComprobante('${cita.id}', '${nombrePaciente}', '${nombreServicio}', '${fecha.getUTCDate()} de ${meses[fecha.getUTCMonth()]} del ${fecha.getUTCFullYear()}', '${horaStr}', '${costoServicio}')"><i class="bi bi-file-earmark-pdf"></i> Ver Comprobante</button>`;
        }

        const tarjeta = `
            <div class="tarjeta-cita-detalle">
                <div class="cita-header">
                    <span class="estado" style="background: ${bgEstado}; color: ${colorEstado}; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; font-weight: bold;">${labelEstado}</span>
                </div>
                <div class="cita-body">
                    <div class="fecha-bloque">
                        <p class="mes">${meses[fecha.getUTCMonth()]}</p>
                        <p class="dia">${fecha.getUTCDate()}</p>
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
// CANCELAR CITA
// ==========================================
async function cancelarCita(citaId) {
    if (!confirm("¿Estás seguro de que deseas cancelar esta cita?")) return;

    try {
        const { error } = await client
            .from('Citas')
            .update({ estado: 'CANCELADA' })
            .eq('id', citaId);

        if (error) throw error;
        alert("Cita cancelada exitosamente.");
        window.location.reload();
    } catch (error) {
        console.error("Error al cancelar:", error);
        alert("No se pudo cancelar la cita: " + error.message);
    }
}

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

// ==========================================
// MODAL: NUEVA CITA, PACIENTES Y DISPONIBILIDAD
// ==========================================

const HORARIOS_CITA = [
    { texto: "4:30 PM", valor: "16:30:00" },
    { texto: "5:00 PM", valor: "17:00:00" },
    { texto: "5:30 PM", valor: "17:30:00" },
    { texto: "6:00 PM", valor: "18:00:00" },
    { texto: "6:30 PM", valor: "18:30:00" },
    { texto: "7:00 PM", valor: "19:00:00" },
    { texto: "7:30 PM", valor: "19:30:00" },
    { texto: "8:00 PM", valor: "20:00:00" }
];

let fechaActualCal = new Date();
let mesCal = fechaActualCal.getMonth();
let añoCal = fechaActualCal.getFullYear();
let fechaSeleccionada = null;
let citaEditandoId = null;

const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
];


// ==========================================
// CARGAR PACIENTES Y SERVICIOS
// ==========================================

async function cargarSelectsModalCita() {

    const selectPacientes = document.getElementById('cita-paciente');
    const selectServicios = document.getElementById('cita-servicio');

    const { data: { user }, error: userError } = await client.auth.getUser();

    if (userError || !user) return;

    if (selectPacientes) {

        const { data: pacientes, error } = await client
            .from('Pacientes')
            .select('id, nombre, apellido')
            .eq('cliente', user.id);

        if (error) {
            console.error("Error al cargar pacientes:", error);
            return;
        }

        selectPacientes.innerHTML = `
            <option value="" disabled selected>Selecciona paciente</option>
            <option value="nuevo">+ Agregar nuevo paciente...</option>
        `;

        (pacientes || []).forEach(p => {

            const opcion = document.createElement('option');

            opcion.value = p.id;
            opcion.textContent = `${p.nombre} ${p.apellido}`;

            selectPacientes.appendChild(opcion);

        });
    }

    if (selectServicios) {

        const { data: servicios, error } = await client
            .from('Servicios')
            .select('id, nombre, costo');

        if (error) {
            console.error("Error al cargar servicios:", error);
            return;
        }

        selectServicios.innerHTML = `
            <option value="" disabled selected>Selecciona servicio</option>
        `;

        (servicios || []).forEach(s => {

            const opcion = document.createElement('option');

            opcion.value = s.id;
            opcion.dataset.costo = s.costo || 0;
            opcion.textContent = s.nombre;

            selectServicios.appendChild(opcion);

        });
    }
}


// ==========================================
// MOSTRAR FORMULARIO DE NUEVO PACIENTE
// ==========================================

function configurarNuevoPaciente() {

    const select = document.getElementById('cita-paciente');
    const contenedor = document.getElementById('nuevo-paciente-contenedor');

    const nombre = document.getElementById('nuevo-paciente-nombre');
    const apellido = document.getElementById('nuevo-paciente-apellido');

    if (!select || !contenedor) return;

    select.addEventListener('change', function () {

        const esNuevo = this.value === 'nuevo';

        contenedor.style.display = esNuevo ? 'block' : 'none';

        if (nombre) nombre.required = esNuevo;
        if (apellido) apellido.required = esNuevo;

        if (!esNuevo) {
            if (nombre) nombre.value = '';
            if (apellido) apellido.value = '';
        }

    });
}


// ==========================================
// ABRIR MODAL
// ==========================================

async function abrirModal() {

    const modal = document.getElementById('modalNuevaCita');

    modal.style.display = 'flex';

    citaEditandoId = null;

    const titulo = document.querySelector('#modalNuevaCita .modal-header h3');

    if (titulo) {
        titulo.innerHTML = '<i class="bi bi-calendar2-week"></i> Agendar cita';
    }

    await cargarSelectsModalCita();

    configurarNuevoPaciente();

    renderizarCalendario();
    renderizarHorariosDisponibles();
}


// ==========================================
// CERRAR MODAL
// ==========================================

function cerrarModal() {

    document.getElementById('modalNuevaCita').style.display = 'none';

    const form = document.getElementById('formNuevaCita');

    if (form) {
        form.reset();
        form.dataset.editando = '';
    }

    citaEditandoId = null;

    const contenedorNuevo = document.getElementById('nuevo-paciente-contenedor');

    if (contenedorNuevo) contenedorNuevo.style.display = 'none';

    document.getElementById('nuevo-paciente-nombre').required = false;
    document.getElementById('nuevo-paciente-apellido').required = false;

    const selectPac = document.getElementById('cita-paciente');

    if (selectPac) selectPac.disabled = false;

    const fb = document.getElementById('feedback-cita');

    if (fb) fb.textContent = '';

    fechaSeleccionada = null;

    document.getElementById('cita-fecha').value = '';
    document.getElementById('cita-hora').value = '';

    document.getElementById('texto-fecha-seleccionada').textContent =
        'Selecciona una fecha';

    document.getElementById('calendario-flotante').style.display = 'none';

    document.getElementById('costo-cita-clicitas').textContent = '$0.00 MXN';

    renderizarCalendario();
    renderizarHorariosDisponibles();
}


// ==========================================
// ACTUALIZAR COSTO DEL SERVICIO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    const selectServicio = document.getElementById('cita-servicio');

    selectServicio?.addEventListener('change', function () {

        const opcion = this.options[this.selectedIndex];

        const costo = parseFloat(opcion.dataset.costo || 0);

        document.getElementById('costo-cita-clicitas').textContent =
            `$${costo.toLocaleString('es-MX', {
                minimumFractionDigits: 2
            })} MXN`;

    });

    const selectPaciente = document.getElementById('cita-paciente');

    selectPaciente?.addEventListener('change', function () {

        const nuevo = this.value === 'nuevo';

        const contenedor = document.getElementById('nuevo-paciente-contenedor');

        if (contenedor) {
            contenedor.style.display = nuevo ? 'block' : 'none';
        }

        document.getElementById('nuevo-paciente-nombre').required = nuevo;
        document.getElementById('nuevo-paciente-apellido').required = nuevo;

    });

});


// ==========================================
// CALENDARIO
// ==========================================

function renderizarCalendario() {

    const diasGrid = document.getElementById('dias-calendario');

    const display = document.getElementById('mes-año-display');

    if (!diasGrid) return;

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    diasGrid.innerHTML = '';

    display.textContent = `${nombresMeses[mesCal]} ${añoCal}`;

    const primerDia = new Date(añoCal, mesCal, 1).getDay();

    const diasEnMes = new Date(añoCal, mesCal + 1, 0).getDate();

    const offset = primerDia === 0 ? 6 : primerDia - 1;

    for (let i = 0; i < offset; i++) {

        diasGrid.innerHTML += '<div></div>';

    }

    for (let i = 1; i <= diasEnMes; i++) {

        const fecha = new Date(añoCal, mesCal, i);

        const div = document.createElement('div');

        div.classList.add('cal-day');

        div.textContent = i;

        if (fecha < hoy) {

            div.classList.add('disabled');

        } else {

            div.addEventListener('click', () => {

                seleccionarFechaCita(fecha, div);

            });

            if (
                fechaSeleccionada &&
                fecha.getFullYear() === fechaSeleccionada.getFullYear() &&
                fecha.getMonth() === fechaSeleccionada.getMonth() &&
                fecha.getDate() === fechaSeleccionada.getDate()
            ) {

                div.classList.add('seleccionado');

            }

        }

        diasGrid.appendChild(div);

    }

    const btnPrev = document.getElementById('prev-month');

    if (btnPrev) {

        btnPrev.disabled =
            mesCal === hoy.getMonth() &&
            añoCal === hoy.getFullYear();

    }

}


// ==========================================
// SELECCIONAR FECHA
// ==========================================

async function seleccionarFechaCita(fecha, elementoDiv) {

    fechaSeleccionada = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate()
    );

    document.querySelectorAll('.cal-day').forEach(el => {
        el.classList.remove('seleccionado');
    });

    elementoDiv.classList.add('seleccionado');

    const d = String(fecha.getDate()).padStart(2, '0');
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const y = fecha.getFullYear();

    const fechaSQL = `${y}-${m}-${d}`;

    document.getElementById('cita-fecha').value = fechaSQL;

    document.getElementById('texto-fecha-seleccionada').textContent =
        `${d}/${m}/${y}`;

    document.getElementById('calendario-flotante').style.display = 'none';

    document.getElementById('cita-hora').value = '';

    await renderizarHorariosDisponibles();

}


// ==========================================
// CONSULTAR HORARIOS OCUPADOS EN SUPABASE
// ==========================================

async function obtenerHorariosOcupados(fecha) {

    const inicio = `${fecha}T00:00:00`;

    const [y, m, d] = fecha.split('-').map(Number);

    const siguienteDia = new Date(y, m - 1, d + 1);

    const fin =
        `${siguienteDia.getFullYear()}-` +
        `${String(siguienteDia.getMonth() + 1).padStart(2, '0')}-` +
        `${String(siguienteDia.getDate()).padStart(2, '0')}T00:00:00`;

    let consulta = client
        .from('Citas')
        .select('id, fecha_hora, estado')
        .gte('fecha_hora', inicio)
        .lt('fecha_hora', fin)
        .neq('estado', 'CANCELADA');

    // Al modificar una cita, no bloquear su propio horario.
    if (citaEditandoId) {
        consulta = consulta.neq('id', citaEditandoId);
    }

    const { data, error } = await consulta;

    if (error) {
        console.error('Error consultando disponibilidad:', error);
        throw error;
    }

    return (data || []).map(cita => {

        return String(cita.fecha_hora).substring(11, 19);

    });

}


// ==========================================
// GENERAR HORARIOS DISPONIBLES
// ==========================================

async function renderizarHorariosDisponibles() {

    const contenedor = document.getElementById('horarios-contenedor');

    if (!contenedor) return;

    contenedor.innerHTML = '';

    const fecha = document.getElementById('cita-fecha').value;

    if (!fecha) {

        contenedor.innerHTML = `
            <p style="text-align:center; color:#64748b; grid-column:1/-1;">
                Primero selecciona una fecha.
            </p>
        `;

        return;
    }

    contenedor.innerHTML = `
        <p style="text-align:center; color:#64748b; grid-column:1/-1;">
            Consultando disponibilidad...
        </p>
    `;

    let ocupados = [];

    try {

        ocupados = await obtenerHorariosOcupados(fecha);

    } catch (error) {

        contenedor.innerHTML = `
            <p style="color:#dc2626; grid-column:1/-1; text-align:center;">
                No se pudo consultar la disponibilidad. Intenta nuevamente.
            </p>
        `;

        return;

    }

    contenedor.innerHTML = '';

    HORARIOS_CITA.forEach(h => {

        const ocupado = ocupados.includes(h.valor);

        const btn = document.createElement('button');

        btn.type = 'button';

        btn.classList.add('btn-hora');

        btn.textContent = ocupado ? `${h.texto} - Ocupado` : h.texto;

        btn.disabled = ocupado;

        if (ocupado) {

            btn.classList.add('ocupado');

            btn.title = 'Este horario ya está reservado';

        } else {

            btn.addEventListener('click', () => {

                document.querySelectorAll('.btn-hora').forEach(el => {
                    el.classList.remove('seleccionada');
                });

                btn.classList.add('seleccionada');

                document.getElementById('cita-hora').value = h.valor;

            });

        }

        contenedor.appendChild(btn);

    });

    if (ocupados.length >= HORARIOS_CITA.length) {

        const aviso = document.createElement('p');

        aviso.textContent = 'Todos los horarios de este día están ocupados.';

        aviso.style.cssText =
            'grid-column:1/-1;text-align:center;color:#dc2626;margin-top:10px;';

        contenedor.appendChild(aviso);

    }

}


// ==========================================
// VALIDAR DISPONIBILIDAD ANTES DE GUARDAR
// ==========================================

async function validarDisponibilidad(fecha, hora) {

    const ocupados = await obtenerHorariosOcupados(fecha);

    return !ocupados.includes(hora);

}


// ==========================================
// REGISTRAR PACIENTE NUEVO
// ==========================================

async function registrarPacienteNuevo() {

    const nombre = document.getElementById('nuevo-paciente-nombre').value.trim();

    const apellido = document.getElementById('nuevo-paciente-apellido').value.trim();

    const conservar = document.getElementById('conservar-paciente').checked;

    if (!nombre || !apellido) {

        throw new Error('Escribe el nombre y apellido del paciente.');

    }

    const { data: { user }, error: userError } = await client.auth.getUser();

    if (userError || !user) {

        throw new Error('No se pudo identificar al usuario.');

    }

    const { data, error } = await client
        .from('Pacientes')
        .insert([{
            nombre: nombre,
            apellido: apellido,
            cliente: conservar ? user.id : null
        }])
        .select('id')
        .single();

    if (error) throw error;

    return data.id;

}


// ==========================================
// GUARDAR O MODIFICAR CITA
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('formNuevaCita');

    if (!form) return;

    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        const btn = document.getElementById('btnConfirmarCita');

        const fb = document.getElementById('feedback-cita');

        const selectPaciente = document.getElementById('cita-paciente');

        const servicioId = document.getElementById('cita-servicio').value;

        const odontologoId = document.getElementById('cita-odontologo').value;

        const fecha = document.getElementById('cita-fecha').value;

        const hora = document.getElementById('cita-hora').value;

        try {

            if (!servicioId || !odontologoId || !fecha || !hora) {

                throw new Error('Completa todos los campos y selecciona un horario.');

            }

            btn.disabled = true;

            fb.style.color = '#3498db';

            fb.textContent = 'Verificando disponibilidad...';

            // Comprobar nuevamente en la base de datos.
            const disponible = await validarDisponibilidad(fecha, hora);

            if (!disponible) {

                await renderizarHorariosDisponibles();

                throw new Error(
                    'Este horario acaba de ser reservado. Selecciona otro horario.'
                );

            }

            let pacienteId = selectPaciente.value;

            // Si se eligió agregar paciente nuevo, primero registrarlo.
            if (pacienteId === 'nuevo') {

                fb.textContent = 'Registrando paciente...';

                pacienteId = await registrarPacienteNuevo();

            }

            if (!pacienteId) {

                throw new Error('Selecciona un paciente.');

            }

            const datosCita = {

                fecha_hora: `${fecha}T${hora}`,

                estado: 'PENDIENTE',

                paciente: parseInt(pacienteId),

                odontologo: parseInt(odontologoId),

                servicio: parseInt(servicioId)

            };

            fb.textContent = citaEditandoId
                ? 'Actualizando cita...'
                : 'Agendando cita...';

            let resultado;

            if (citaEditandoId) {

                resultado = await client
                    .from('Citas')
                    .update(datosCita)
                    .eq('id', citaEditandoId);

            } else {

                resultado = await client
                    .from('Citas')
                    .insert([datosCita]);

            }

            if (resultado.error) throw resultado.error;

            fb.style.color = '#16a34a';

            fb.textContent = citaEditandoId
                ? '¡Cita actualizada exitosamente!'
                : '¡Cita agendada exitosamente!';

            setTimeout(() => window.location.reload(), 1200);

        } catch (error) {

            console.error('Error al guardar cita:', error);

            fb.style.color = '#dc2626';

            fb.textContent = error.message;

        } finally {

            btn.disabled = false;

        }

    });

});


// ==========================================
// NAVEGACIÓN DEL CALENDARIO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    renderizarCalendario();

    renderizarHorariosDisponibles();

    document.getElementById('prev-month')?.addEventListener('click', () => {

        mesCal--;

        if (mesCal < 0) {
            mesCal = 11;
            añoCal--;
        }

        renderizarCalendario();

    });

    document.getElementById('next-month')?.addEventListener('click', () => {

        mesCal++;

        if (mesCal > 11) {
            mesCal = 0;
            añoCal++;
        }

        renderizarCalendario();

    });

    document.getElementById('btn-mostrar-calendario')?.addEventListener('click', () => {

        const cal = document.getElementById('calendario-flotante');

        cal.style.display =
            cal.style.display === 'none' ? 'block' : 'none';

    });

});


// ==========================================
// MODIFICAR / REPROGRAMAR CITA
// ==========================================

async function abrirModalModificar(citaId) {

    await abrirModal();

    citaEditandoId = citaId;

    const titulo = document.querySelector('#modalNuevaCita .modal-header h3');

    if (titulo) {

        titulo.innerHTML = `
            <i class="bi bi-calendar2-week"></i> Modificar cita
        `;

    }

    try {

        const { data: cita, error } = await client
            .from('Citas')
            .select('*')
            .eq('id', citaId)
            .single();

        if (error) throw error;

        const selectPaciente = document.getElementById('cita-paciente');

        selectPaciente.value = cita.paciente;

        selectPaciente.disabled = true;

        document.getElementById('cita-servicio').value = cita.servicio;

        document.getElementById('cita-odontologo').value =
            cita.odontologo || 1;

        // Recuperar fecha y hora.
        const fechaStr = String(cita.fecha_hora).substring(0, 10);

        const horaStr = String(cita.fecha_hora).substring(11, 19);

        const [y, m, d] = fechaStr.split('-').map(Number);

        const fecha = new Date(y, m - 1, d);

        fechaSeleccionada = fecha;

        document.getElementById('cita-fecha').value = fechaStr;

        document.getElementById('texto-fecha-seleccionada').textContent =
            `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

        const costo = parseFloat(
            document.getElementById('cita-servicio')
                .selectedOptions[0]?.dataset.costo || 0
        );

        document.getElementById('costo-cita-clicitas').textContent =
            `$${costo.toLocaleString('es-MX', {
                minimumFractionDigits: 2
            })} MXN`;

        renderizarCalendario();

        await renderizarHorariosDisponibles();

        // Seleccionar el horario actual de la cita.
        const horarioActual = horaStr.substring(0, 8);

        const botones = document.querySelectorAll('.btn-hora');

        botones.forEach(btn => {

            const horario = HORARIOS_CITA.find(h => h.texto === btn.textContent);

            if (horario && horario.valor === horarioActual) {

                btn.disabled = false;

                btn.classList.add('seleccionada');

                document.getElementById('cita-hora').value = horarioActual;

            }

        });

        // Mostrar modal con fecha seleccionada.
        document.getElementById('calendario-flotante').style.display = 'none';

    } catch (error) {

        console.error('Error al cargar cita:', error);

        alert('No se pudo cargar la información de la cita.');

    }

}