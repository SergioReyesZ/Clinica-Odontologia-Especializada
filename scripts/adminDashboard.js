
// --- FUNCIONES PARA ABRIR Y CERRAR MODALES ---
function abrirModalCita() {
    document.getElementById('modalNuevaCita').style.display = 'flex';
    cargarSelectsModalCita();

}
function cerrarModalCita() {
    document.getElementById('modalNuevaCita').style.display = 'none';
    document.getElementById('formNuevaCita').reset();
    document.getElementById('feedback-cita').textContent = '';
    document.getElementById('texto-fecha-seleccionada').textContent = 'Selecciona una fecha';
    document.getElementById('calendario-flotante').style.display = 'none';
}

function abrirModalPaciente() {
    document.getElementById('modalPaciente').style.display = 'flex';

    // Limitar la fecha máxima a hoy
    const inputFecha = document.getElementById('pac-fecha');
    if (inputFecha) {
        inputFecha.max = new Date().toISOString().split('T')[0];
    }
}
function cerrarModalPaciente() {
    document.getElementById('modalPaciente').style.display = 'none';
    document.getElementById('formNuevoPaciente').reset();
    document.getElementById('feedback-paciente').textContent = '';
}

// ==========================================
// LÓGICA DE ENVÍO Y MANEJO DE MODALES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    // 1. Guardar Cita
    const formNuevaCita = document.getElementById('formNuevaCita');
    if (formNuevaCita) {
        formNuevaCita.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnConfirmarCita = document.getElementById('btnConfirmarCita');
            const feedbackCita = document.getElementById('feedback-cita');

            const pacienteId = document.getElementById('cita-paciente').value;
            const servicioId = document.getElementById('cita-servicio').value;
            const odontologoId = document.getElementById('cita-odontologo').value;
            const fecha = document.getElementById('cita-fecha').value;
            const hora = document.getElementById('cita-hora').value;

            if (!pacienteId || !servicioId || !odontologoId || !fecha || !hora) return;

            const fechaHora = `${fecha}T${hora}`;

            try {
                btnConfirmarCita.disabled = true;
                feedbackCita.style.color = "#3498db";
                feedbackCita.textContent = "Agendando cita...";

                const { error } = await client.from('Citas').insert([
                    {
                        fecha_hora: fechaHora,
                        estado: 'PENDIENTE',
                        paciente: parseInt(pacienteId),
                        odontologo: parseInt(odontologoId),
                        servicio: parseInt(servicioId)
                    }
                ]);

                if (error) throw error;

                feedbackCita.style.color = "#2ecc71";
                feedbackCita.textContent = "¡Cita agendada exitosamente!";
                setTimeout(() => window.location.reload(), 1000);

            } catch (error) {
                console.error("Error:", error);
                feedbackCita.style.color = "#e74c3c";
                feedbackCita.textContent = "Error al agendar: " + error.message;
            } finally {
                btnConfirmarCita.disabled = false;
            }
        });
    }

    // 2. Guardar Paciente
    const formNuevoPaciente = document.getElementById('formNuevoPaciente');
    if (formNuevoPaciente) {
        formNuevoPaciente.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnGuardarPaciente = document.getElementById('btnGuardarPaciente');
            const feedbackPaciente = document.getElementById('feedback-paciente');

            const nombre = document.getElementById('pac-nombre').value.trim();
            const apellido = document.getElementById('pac-apellido').value.trim();
            const fechaNac = document.getElementById('pac-fecha').value;
            const sexo = document.getElementById('pac-sexo').value;

            try {
                const { data: { user } } = await client.auth.getUser();
                if (!user) throw new Error("Sesión no encontrada.");

                btnGuardarPaciente.disabled = true;
                feedbackPaciente.style.color = "#3498db";
                feedbackPaciente.textContent = "Guardando paciente...";

                const { error } = await client.from('Pacientes').insert([
                    {
                        nombre: nombre,
                        apellido: apellido,
                        fecha_nac: fechaNac,
                        sexo: sexo,
                        cliente: user.id
                    }
                ]);

                if (error) throw error;

                feedbackPaciente.style.color = "#2ecc71";
                feedbackPaciente.textContent = "¡Paciente registrado con éxito!";
                setTimeout(() => window.location.reload(), 1000);

            } catch (error) {
                console.error("Error:", error);
                feedbackPaciente.style.color = "#e74c3c";
                feedbackPaciente.textContent = "Error al guardar: " + error.message;
            } finally {
                btnGuardarPaciente.disabled = false;
            }
        });
    }

    // 3. Mostrar Calendario Oculto
    const btnMostrarCalendario = document.getElementById('btn-mostrar-calendario');
    if (btnMostrarCalendario) {
        btnMostrarCalendario.addEventListener('click', () => {
            const cal = document.getElementById('calendario-flotante');
            cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
        });
    }
});

// ==========================================
// LÓGICA DEL CALENDARIO INTERACTIVO
// ==========================================
let fechaActualCal = new Date();
let mesCal = fechaActualCal.getMonth();
let añoCal = fechaActualCal.getFullYear();
let fechaSeleccionada = null;
const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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

    return ahora.getHours() * 60 + ahora.getMinutes() >=
        horas * 60 + minutos;
}

function diaSinHorarios(fecha, ultimaHora = "19:30:00") {
    if (fecha !== obtenerFechaLocal()) return false;

    const ahora = new Date();
    const [horas, minutos] = ultimaHora.split(':').map(Number);

    return ahora.getHours() * 60 + ahora.getMinutes() >=
        horas * 60 + minutos;
}

function renderizarCalendario() {
    const diasGrid = document.getElementById('dias-calendario');
    const mesAñoDisplay = document.getElementById('mes-año-display');
    const btnPrev = document.getElementById('prev-month');

    if (!diasGrid || !mesAñoDisplay || !btnPrev) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    diasGrid.innerHTML = '';
    mesAñoDisplay.textContent = `${nombresMeses[mesCal]} ${añoCal}`;

    const primerDia = new Date(añoCal, mesCal, 1).getDay();
    const diasEnMes = new Date(añoCal, mesCal + 1, 0).getDate();

    for (let i = 1; i <= diasEnMes; i++) {
        const fechaIteracion = new Date(añoCal, mesCal, i);
        const diaSemana = fechaIteracion.getDay();
        const fila = Math.floor((i - 1 + primerDia) / 7) + 1;
        const columna = diaSemana + 1;
        const esPasado = fechaIteracion < hoy;
        const esFinDeSemana = diaSemana === 6 || diaSemana === 0;

        const fechaLocal = [
            fechaIteracion.getFullYear(),
            String(fechaIteracion.getMonth() + 1).padStart(2, '0'),
            String(fechaIteracion.getDate()).padStart(2, '0')
        ].join('-');

        const sinHorarios = diaSinHorarios(fechaLocal, "19:30:00");

        const div = document.createElement('div');
        div.classList.add('cal-day');
        div.textContent = i;
        div.style.gridRowStart = fila;
        div.style.gridColumnStart = columna;

        if (fechaSeleccionada && fechaIteracion.getTime() === fechaSeleccionada.getTime()) {
            div.classList.add('seleccionado');
        }

        if (esPasado || esFinDeSemana || sinHorarios) {
            div.classList.add('disabled');
        } else {
            div.addEventListener('click', () => seleccionarFechaCita(fechaIteracion, div));
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
    const fechaFormateada = `${y}-${m}-${d}`;

    document.getElementById('cita-fecha').value = fechaFormateada;
    document.getElementById('texto-fecha-seleccionada').textContent = `${d}/${m}/${y}`;
    document.getElementById('calendario-flotante').style.display = 'none';

    document.querySelectorAll('.btn-hora').forEach(el => el.classList.remove('seleccionada'));
    document.getElementById('cita-hora').value = '';

    verificarHorariosOcupados(fechaFormateada);
}

async function verificarHorariosOcupados(fechaStr) {
    const odontologoId = document.getElementById('cita-odontologo').value || 1;
    try {
        const { data: citasOcupadas, error } = await client.rpc('obtener_horarios_ocupados', { p_fecha: fechaStr });
        if (error) throw error;

        const horasOcupadas = (citasOcupadas || [])
            .filter(c => c.odontologo === parseInt(odontologoId))
            .map(c => {
                const fechaObj = new Date(c.fecha_hora);
                const h = String(fechaObj.getUTCHours()).padStart(2, '0');
                const m = String(fechaObj.getUTCMinutes()).padStart(2, '0');
                const s = String(fechaObj.getUTCSeconds()).padStart(2, '0');
                return `${h}:${m}:${s}`;
            });

        document.querySelectorAll('.btn-hora').forEach(btn => {
            const valorHora = btn.dataset.valor;
            const fechaSeleccionada = fechaStr;

            if (
                horasOcupadas.includes(valorHora) ||
                horaYaPaso(fechaSeleccionada, valorHora)
            ) {
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
    } catch (err) {
        console.error("Error al verificar horarios ocupados:", err.message);
    }
}

function renderizarHorariosDisponibles() {
    const contenedor = document.getElementById('horarios-contenedor');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const horarios = [
        { texto: "16:30", valor: "16:30:00" }, { texto: "17:00", valor: "17:00:00" },
        { texto: "17:30", valor: "17:30:00" }, { texto: "17:00", valor: "18:00:00" },
        { texto: "18:30", valor: "18:30:00" }, { texto: "19:00", valor: "19:00:00" },
        { texto: "19:30", valor: "19:30:00" }
    ];

    horarios.forEach(h => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('btn-hora');
        btn.textContent = h.texto;
        btn.dataset.valor = h.valor;
        btn.addEventListener('click', () => seleccionarHoraCita(h.valor, btn));
        contenedor.appendChild(btn);
    });
}

function seleccionarHoraCita(valor, boton) {
    document.querySelectorAll('.btn-hora').forEach(el => el.classList.remove('seleccionada'));
    boton.classList.add('seleccionada');
    document.getElementById('cita-hora').value = valor;
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    renderizarHorariosDisponibles();
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            mesCal--; if (mesCal < 0) { mesCal = 11; añoCal--; } renderizarCalendario();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            mesCal++; if (mesCal > 11) { mesCal = 0; añoCal++; } renderizarCalendario();
        });
    }
});

// ==========================================
// LÓGICA SELECTORES DE FECHA DE NACIMIENTO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const selectAnio = document.getElementById('pac-fecha-anio');
    const selectMes = document.getElementById('pac-fecha-mes');
    const selectDia = document.getElementById('pac-fecha-dia');
    const inputFechaOculta = document.getElementById('pac-fecha');

    if (!selectAnio || !selectMes || !selectDia) return;

    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= anioActual - 100; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        selectAnio.appendChild(option);
    }

    function actualizarDias() {
        const anio = parseInt(selectAnio.value);
        const mes = parseInt(selectMes.value);
        const diaSeleccionado = selectDia.value;
        selectDia.innerHTML = '<option value="" disabled selected>Día</option>';
        if (!anio || !mes) return;

        const diasEnElMes = new Date(anio, mes, 0).getDate();
        for (let i = 1; i <= diasEnElMes; i++) {
            const option = document.createElement('option');
            const valorDia = i.toString().padStart(2, '0');
            option.value = valorDia;
            option.textContent = i;
            selectDia.appendChild(option);
        }
        if (diaSeleccionado && parseInt(diaSeleccionado) <= diasEnElMes) {
            selectDia.value = diaSeleccionado;
        }
    }

    function consolidarFecha() {
        if (selectAnio.value && selectMes.value && selectDia.value) {
            inputFechaOculta.value = `${selectAnio.value}-${selectMes.value}-${selectDia.value}`;
        } else {
            inputFechaOculta.value = "";
        }
    }

    selectAnio.addEventListener('change', () => { actualizarDias(); consolidarFecha(); });
    selectMes.addEventListener('change', () => { actualizarDias(); consolidarFecha(); });
    selectDia.addEventListener('change', consolidarFecha);
});

// ==========================================
// CARGAR SELECTS EN MODAL CITA (ADMIN)
// ==========================================

async function cargarSelectsModalCita() {

    const selectPacientes = document.getElementById('cita-paciente');
    const selectServicios = document.getElementById('cita-servicio');

    // PACIENTES
    if (selectPacientes) {

        selectPacientes.innerHTML =
            '<option value="">Cargando pacientes...</option>';

        try {

            const { data: pacientes, error } = await client
                .from('Pacientes')
                .select('id, nombre, apellido')
                .order('nombre', { ascending: true });

            if (error) {
                throw error;
            }

            if (!pacientes || pacientes.length === 0) {

                selectPacientes.innerHTML =
                    '<option value="">No hay pacientes registrados</option>';

                console.warn('No se encontraron pacientes.');

            } else {

                selectPacientes.innerHTML =
                    '<option value="" disabled selected>Selecciona paciente</option>' +

                    pacientes.map(p => `
                        <option value="${p.id}">
                            ${p.nombre} ${p.apellido}
                        </option>
                    `).join('');

                console.log('Pacientes cargados:', pacientes);

            }

        } catch (error) {

            console.error('Error al cargar pacientes:', error);

            selectPacientes.innerHTML =
                '<option value="">Error al cargar pacientes</option>';

        }
    }


    // SERVICIOS
    if (selectServicios) {

        selectServicios.innerHTML =
            '<option value="">Cargando servicios...</option>';

        try {

            const { data: servicios, error } = await client
                .from('Servicios')
                .select('id, nombre')
                .order('nombre', { ascending: true });

            if (error) {
                throw error;
            }

            selectServicios.innerHTML =
                '<option value="" disabled selected>Selecciona servicio</option>' +

                (servicios || []).map(s => `
                    <option value="${s.id}">
                        ${s.nombre}
                    </option>
                `).join('');

        } catch (error) {

            console.error('Error al cargar servicios:', error);

            selectServicios.innerHTML =
                '<option value="">Error al cargar servicios</option>';

        }
    }

}

function seleccionarFechaAgenda(fecha) {
    agendaFechaSeleccionada = new Date(fecha);
    agendaMesCal = fecha.getMonth();
    agendaAñoCal = fecha.getFullYear();

    // Ocultar calendario después de seleccionar
    if (calAgendaFlotante) calAgendaFlotante.style.display = 'none';

    renderizarCalendarioAgenda();

    // --- NUEVO: Conectar el calendario con la cinta de 7 días ---
    if (typeof actualizarAgenda === 'function') {
        let dir = fecha < fechaActual ? 'derecha' : 'izquierda';
        fechaActual = new Date(fecha); // Actualiza la fecha global en dashCitas.js
        actualizarAgenda(dir);
    }
}

/* =========================================================
   AGENDA ADMINISTRATIVA: CONSULTA Y FILTROS DE CITAS
========================================================= */

let citasAdminCache = [];
let pacientesAdminCache = [];
let serviciosAdminCache = [];
let fechaAgendaAdmin = new Date();

function fechaLocalAdmin(fecha) {
    const f = new Date(fecha);
    const anio = f.getFullYear();
    const mes = String(f.getMonth() + 1).padStart(2, "0");
    const dia = String(f.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function normalizarTextoAdmin(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function horaLocalAdmin(fecha) {
    if (!fecha) return "";

    const coincidencia = String(fecha).match(/T(\d{2}):(\d{2})/);

    if (!coincidencia) return "";

    return `${coincidencia[1]}:${coincidencia[2]}`;
}

function crearElementoAdmin(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

async function obtenerFotoPacienteAdmin(avatar) {
    if (!avatar) return null;

    // Si ya viene como URL, extraer la ruta del archivo
    let ruta = avatar;

    if (avatar.startsWith("http")) {
        try {
            const url = new URL(avatar);
            const marcador = "/avatares_pacientes/";

            const posicion = url.pathname.indexOf(marcador);

            if (posicion === -1) return avatar;

            ruta = decodeURIComponent(
                url.pathname.substring(posicion + marcador.length)
            );
        } catch (error) {
            console.error("Error al procesar avatar:", error);
            return null;
        }
    }

    // Obtener URL temporal del bucket privado
    const { data, error } = await client.storage
        .from("avatares_pacientes")
        .createSignedUrl(ruta, 3600);

    if (error) {
        console.error("Error al obtener foto del paciente:", error);
        return null;
    }

    return data.signedUrl;
}

async function inicializarAgendaAdmin() {
    const lista = document.getElementById("lista-citas-agenda");
    const filtroServicio = document.getElementById("filtro-servicio-citas");

    if (!lista || !filtroServicio || typeof client === "undefined") return;

    lista.textContent = "Cargando citas...";

    try {
        const [respuestaCitas, respuestaPacientes, respuestaServicios] =
            await Promise.all([
                client.from("Citas")
                    .select("id, fecha_hora, estado, paciente, servicio, odontologo")
                    .order("fecha_hora", { ascending: true }),

                client.from("Pacientes")
                    .select("id, nombre, apellido, avatar"),

                client.from("Servicios")
                    .select("id, nombre, costo")
                    .order("nombre", { ascending: true })
            ]);

        if (respuestaCitas.error) throw respuestaCitas.error;
        if (respuestaPacientes.error) throw respuestaPacientes.error;
        if (respuestaServicios.error) throw respuestaServicios.error;

        citasAdminCache = respuestaCitas.data || [];
        pacientesAdminCache = respuestaPacientes.data || [];
        serviciosAdminCache = respuestaServicios.data || [];

        // Obtener las fotografías de los pacientes
        pacientesAdminCache = await Promise.all(
            pacientesAdminCache.map(async paciente => ({
                ...paciente,
                avatarUrl: await obtenerFotoPacienteAdmin(paciente.avatar)
            }))
        );

        // Llenar el filtro de servicios
        filtroServicio.innerHTML = '<option value="">Todos los servicios</option>';

        serviciosAdminCache.forEach(servicio => {
            const opcion = document.createElement("option");
            opcion.value = servicio.id;
            opcion.textContent = servicio.nombre;
            filtroServicio.appendChild(opcion);
        });

        // Primera carga: mostrar las citas del día actual
        actualizarCitasVisiblesAdmin(fechaAgendaAdmin);

    } catch (error) {
        console.error("Error al cargar las citas del administrador:", error);

        lista.textContent = "No se pudieron cargar las citas. Revisa la consola.";
        document.getElementById("contador-citas-agenda").textContent =
            "Error al consultar";
    }
}

function actualizarCitasVisiblesAdmin(fecha) {
    const lista = document.getElementById("lista-citas-agenda");
    const contador = document.getElementById("contador-citas-agenda");
    const titulo = document.getElementById("titulo-citas-dia");
    const filtroServicio = document.getElementById("filtro-servicio-citas");
    const buscador = document.getElementById("buscar-paciente");

    if (!lista) return;

    fechaAgendaAdmin = new Date(fecha);

    const fechaBuscada = fechaLocalAdmin(fechaAgendaAdmin);
    const servicioSeleccionado = filtroServicio?.value || "";
    const busqueda = normalizarTextoAdmin(buscador?.value || "");

    const citasFiltradas = citasAdminCache
        .filter(cita => {
            if (!cita.fecha_hora) return false;

            // Filtrar por el día seleccionado en el calendario
            const fechaCita = fechaLocalAdmin(cita.fecha_hora);

            if (fechaCita !== fechaBuscada) return false;

            // Filtrar por servicio
            if (
                servicioSeleccionado &&
                String(cita.servicio) !== String(servicioSeleccionado)
            ) {
                return false;
            }

            const paciente = pacientesAdminCache.find(
                p => String(p.id) === String(cita.paciente)
            );

            const servicio = serviciosAdminCache.find(
                s => String(s.id) === String(cita.servicio)
            );

            const nombrePaciente = paciente
                ? `${paciente.nombre || ""} ${paciente.apellido || ""}`
                : "Paciente no encontrado";

            const nombreServicio = servicio
                ? servicio.nombre
                : "Servicio no encontrado";

            // Buscar por paciente o por servicio
            if (busqueda) {
                const coincide =
                    normalizarTextoAdmin(nombrePaciente).includes(busqueda) ||
                    normalizarTextoAdmin(nombreServicio).includes(busqueda);

                if (!coincide) return false;
            }

            return true;
        })
        .sort((a, b) =>
            new Date(a.fecha_hora) - new Date(b.fecha_hora)
        );

    // Actualizar título y contador
    if (titulo) {
        titulo.textContent = "Citas del día";
    }

    if (contador) {
        contador.textContent =
            `${citasFiltradas.length} ${citasFiltradas.length === 1
                ? "cita encontrada"
                : "citas encontradas"
            }`;
    }

    lista.innerHTML = "";

    if (citasFiltradas.length === 0) {
        const mensaje = crearElementoAdmin(
            "p",
            "",
            "No hay citas que coincidan con los filtros seleccionados."
        );

        mensaje.style.textAlign = "center";
        mensaje.style.padding = "25px 15px";
        mensaje.style.color = "#777";

        lista.appendChild(mensaje);
        return;
    }

    citasFiltradas.forEach(cita => {
        const paciente = pacientesAdminCache.find(
            p => String(p.id) === String(cita.paciente)
        );

        const servicio = serviciosAdminCache.find(
            s => String(s.id) === String(cita.servicio)
        );

        const nombrePaciente = paciente
            ? `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim()
            : "Paciente no encontrado";

        const nombreServicio = servicio
            ? servicio.nombre
            : "Servicio no encontrado";

        const horaInicio = horaLocalAdmin(cita.fecha_hora);

        // Calcular los 30 minutos de duración sin cambiar la zona horaria.
        const partesHora = String(cita.fecha_hora).match(/T(\d{2}):(\d{2})/);

        let horaFin = "";

        if (partesHora) {
            let minutos = parseInt(partesHora[1]) * 60 +
                parseInt(partesHora[2]) + 30;

            minutos %= 24 * 60;

            const horasFin = String(Math.floor(minutos / 60)).padStart(2, "0");
            const minutosFin = String(minutos % 60).padStart(2, "0");

            horaFin = `${horasFin}:${minutosFin}`;
        }

        const iniciales = nombrePaciente
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(palabra => palabra.charAt(0).toUpperCase())
            .join("");

        const estado = String(cita.estado || "PENDIENTE").toUpperCase();

        const clasesEstado = {
            "PENDIENTE": "pendiente",
            "CONFIRMADA": "confirmada",
            "CANCELADA": "cancelada",
            "TERMINADA": "terminada"
        };

        const claseEstado = clasesEstado[estado] || "pendiente";

        // Contenedor de la cita
        const tarjeta = crearElementoAdmin("div", "citas-pacientes");

        const bloqueHoraPaciente = crearElementoAdmin("div", "hora-paciente");

        const bloqueHora = crearElementoAdmin("div", "hora");
        bloqueHora.appendChild(
            crearElementoAdmin("p", "titulo", horaInicio)
        );
        bloqueHora.appendChild(
            crearElementoAdmin("p", "", horaFin)
        );

        const separador = crearElementoAdmin("hr", "separador-vertical");

        const bloquePaciente = crearElementoAdmin("div", "paciente");

        const foto = crearElementoAdmin("div", "foto-paciente");

        if (paciente && paciente.avatarUrl) {
            const imagen = document.createElement("img");
            imagen.src = paciente.avatarUrl;
            imagen.alt = `Foto de ${nombrePaciente}`;
            imagen.className = "imagen-paciente-agenda";

            imagen.onerror = () => {
                imagen.remove();
                foto.innerHTML = "";
                foto.appendChild(
                    crearElementoAdmin("p", "", iniciales || "P")
                );
            };

            foto.appendChild(imagen);
        } else {
            foto.appendChild(
                crearElementoAdmin("p", "", iniciales || "P")
            );
        }

        const datos = crearElementoAdmin("div", "nombre-servicio");
        datos.appendChild(
            crearElementoAdmin("p", "titulo", nombrePaciente)
        );
        datos.appendChild(
            crearElementoAdmin("p", "", nombreServicio)
        );

        bloquePaciente.append(foto, datos);
        bloqueHoraPaciente.append(bloqueHora, separador, bloquePaciente);

        const bloqueEstado = crearElementoAdmin("div", "estado-info");
        const botonEstado = crearElementoAdmin(
            "button",
            `btn estado ${claseEstado}`,
            estado
        );
        botonEstado.type = "button";
        botonEstado.disabled = true;

        bloqueEstado.appendChild(botonEstado);

        // Menú de tres puntitos
        const menuAcciones = document.createElement("div");
        menuAcciones.className = "menu-acciones-cita-admin";

        const btnMenu = document.createElement("button");
        btnMenu.type = "button";
        btnMenu.className = "btn-menu-cita-admin";
        btnMenu.innerHTML = '<i class="bi bi-three-dots-vertical"></i>';
        btnMenu.setAttribute("aria-label", "Opciones de la cita");

        const opcionesMenu = document.createElement("div");
        opcionesMenu.className = "opciones-menu-cita-admin menu-flotante-admin";

        const btnConfirmar = document.createElement("button");
        btnConfirmar.type = "button";
        btnConfirmar.innerHTML = '<i class="bi bi-check2"></i> Confirmar cita';

        const btnModificar = document.createElement("button");
        btnModificar.type = "button";
        btnModificar.innerHTML = '<i class="bi bi-pencil-square"></i> Modificar cita';

        const btnCancelar = document.createElement("button");
        btnCancelar.type = "button";
        btnCancelar.className = "opcion-peligro";
        btnCancelar.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar cita';

        const btnComprobante = document.createElement("button");
        btnComprobante.type = "button";
        btnComprobante.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Comprobante';

        btnMenu.addEventListener("click", (e) => {
            e.stopPropagation();

            const estabaAbierto = opcionesMenu.classList.contains("abierto");

            // Cerrar cualquier otro menú
            document.querySelectorAll(".opciones-menu-cita-admin.abierto")
                .forEach(menu => menu.classList.remove("abierto"));

            if (estabaAbierto) {
                opcionesMenu.classList.remove("abierto");
                return;
            }

            // Colocar el menú directamente en el body
            if (!opcionesMenu.isConnected) {
                document.body.appendChild(opcionesMenu);
            }

            opcionesMenu.style.visibility = "hidden";
            opcionesMenu.classList.add("abierto");

            const rect = btnMenu.getBoundingClientRect();
            const altoMenu = opcionesMenu.offsetHeight;
            const anchoMenu = opcionesMenu.offsetWidth;

            const espacioAbajo = window.innerHeight - rect.bottom;
            const espacioArriba = rect.top;

            // Abrir hacia arriba o hacia abajo según el espacio disponible
            let top;

            if (espacioAbajo >= altoMenu + 10 || espacioAbajo >= espacioArriba) {
                top = Math.min(rect.bottom + 6, window.innerHeight - altoMenu - 10);
            } else {
                top = Math.max(10, rect.top - altoMenu - 6);
            }

            // Evitar que salga por los lados de la pantalla
            let left = rect.right - anchoMenu;
            left = Math.max(10, Math.min(left, window.innerWidth - anchoMenu - 10));

            opcionesMenu.style.position = "fixed";
            opcionesMenu.style.top = `${top}px`;
            opcionesMenu.style.left = `${left}px`;
            opcionesMenu.style.right = "auto";
            opcionesMenu.style.zIndex = "100000";

            opcionesMenu.style.visibility = "visible";
        });

        btnModificar.addEventListener("click", () => {
            opcionesMenu.classList.remove("abierto");
            abrirModalModificarAdmin(cita.id);
        });

        btnCancelar.addEventListener("click", () => {
            opcionesMenu.classList.remove("abierto");
            abrirModalCancelarAdmin(cita.id);
        });

        btnComprobante.addEventListener("click", () => {
            opcionesMenu.classList.remove("abierto");

            const fechaPartes = String(cita.fecha_hora).split("T")[0].split("-");
            const fechaPDF = `${fechaPartes[2]}/${fechaPartes[1]}/${fechaPartes[0]}`;
            const horaPDF = horaLocalAdmin(cita.fecha_hora);
            const costoPDF = servicio?.costo || "0.00";

            descargarComprobante(
                cita.id,
                nombrePaciente,
                nombreServicio,
                fechaPDF,
                horaPDF,
                costoPDF
            );
        });

        btnConfirmar.addEventListener("click", () => {
            opcionesMenu.classList.remove("abierto");
            abrirModalConfirmarAdmin(cita.id);
        });


        if (String(cita.estado).toUpperCase() === "TERMINADA" || String(cita.estado).toUpperCase() === "CANCELADA") {
            opcionesMenu.append(btnComprobante);
        }else if (String(cita.estado).toUpperCase() === "CONFIRMADA") {
            opcionesMenu.append(btnModificar, btnCancelar, btnComprobante);
        } else {
            opcionesMenu.append(btnConfirmar, btnModificar, btnCancelar, btnComprobante);
        }
        menuAcciones.appendChild(btnMenu);
        bloqueEstado.appendChild(menuAcciones);

        tarjeta.append(bloqueHoraPaciente, bloqueEstado);
        lista.appendChild(tarjeta);
    });
}

// Conectar los filtros y cargar las citas al abrir la página
document.addEventListener("DOMContentLoaded", () => {
    const filtroServicio = document.getElementById("filtro-servicio-citas");
    const buscador = document.getElementById("buscar-paciente");
    const limpiarBusqueda = document.getElementById("limpiar-busqueda");

    filtroServicio?.addEventListener("change", () => {
        actualizarCitasVisiblesAdmin(fechaAgendaAdmin);
    });

    buscador?.addEventListener("input", () => {
        actualizarCitasVisiblesAdmin(fechaAgendaAdmin);

        if (limpiarBusqueda) {
            limpiarBusqueda.hidden = !buscador.value;
        }
    });

    limpiarBusqueda?.addEventListener("click", () => {
        if (buscador) {
            buscador.value = "";
            buscador.focus();
        }

        limpiarBusqueda.hidden = true;
        actualizarCitasVisiblesAdmin(fechaAgendaAdmin);
    });

    inicializarAgendaAdmin();
});

// Esta función será llamada desde dashCitas.js al cambiar de día
window.actualizarCitasVisibles = actualizarCitasVisiblesAdmin;

// ==========================================
// ACCIONES DE CITAS DEL ADMINISTRADOR
// ==========================================

let idCitaCancelarAdmin = null;
let idCitaConfirmarAdmin = null;

function abrirModalConfirmarAdmin(id) {
    idCitaConfirmarAdmin = id;

    document.getElementById("modalConfirmarCitaAdmin").style.display = "flex";
}

function cerrarModalConfirmarAdmin() {
    document.getElementById("modalConfirmarCitaAdmin").style.display = "none";

    idCitaConfirmarAdmin = null;

    const btn = document.getElementById("btnAceptarConfirmacionAdmin");
    btn.disabled = false;
    btn.textContent = "Confirmar cita";
}

let calendarioModificarAdmin = {
    mes: new Date().getMonth(),
    anio: new Date().getFullYear()
};

const horariosModificarAdmin = [
    { texto: "16:30", valor: "16:30:00" },
    { texto: "17:00", valor: "17:00:00" },
    { texto: "17:30", valor: "17:30:00" },
    { texto: "18:00", valor: "18:00:00" },
    { texto: "18:30", valor: "18:30:00" },
    { texto: "19:00", valor: "19:00:00" },
    { texto: "19:30", valor: "19:30:00" }
];

function cerrarModalModificarAdmin() {
    document.getElementById("modalModificarCitaAdmin").style.display = "none";
    document.getElementById("formModificarCitaAdmin").reset();
    document.getElementById("calendario-flotante-mod-admin").style.display = "none";
    document.getElementById("feedback-modificar-admin").textContent = "";
}

function abrirModalModificarAdmin(idCita) {
    const cita = citasAdminCache.find(c => String(c.id) === String(idCita));

    if (!cita) {
        alert("No se encontró la cita.");
        return;
    }

    const paciente = pacientesAdminCache.find(
        p => String(p.id) === String(cita.paciente)
    );

    const servicio = serviciosAdminCache.find(
        s => String(s.id) === String(cita.servicio)
    );

    const nombrePaciente = paciente
        ? `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim()
        : "Paciente no encontrado";

    // Llenar servicios
    const selectServicio = document.getElementById("mod-cita-servicio-admin");

    selectServicio.innerHTML =
        '<option value="" disabled>Selecciona servicio</option>' +
        serviciosAdminCache.map(s =>
            `<option value="${s.id}">${s.nombre} ($${s.costo || 0} MXN)</option>`
        ).join("");

    document.getElementById("mod-cita-id-admin").value = cita.id;
    document.getElementById("mod-cita-paciente-admin").value = nombrePaciente;
    document.getElementById("mod-cita-servicio-admin").value = cita.servicio;
    document.getElementById("mod-cita-odontologo-admin").value = cita.odontologo || 1;

    // Recuperar fecha y hora sin alterar la zona horaria
    const fechaHora = String(cita.fecha_hora);
    const fecha = fechaHora.split("T")[0];
    const hora = (fechaHora.split("T")[1] || "16:30:00").substring(0, 8);

    const [anio, mes, dia] = fecha.split("-").map(Number);

    document.getElementById("mod-cita-fecha-admin").value = fecha;
    document.getElementById("mod-cita-hora-admin").value = hora;

    document.getElementById("texto-fecha-seleccionada-mod-admin").textContent =
        `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;

    calendarioModificarAdmin.mes = mes - 1;
    calendarioModificarAdmin.anio = anio;

    const costo = servicio?.costo || 0;
    document.getElementById("costo-mod-cita-admin").textContent =
        `$${Number(costo).toFixed(2)} MXN`;

    document.getElementById("modalModificarCitaAdmin").style.display = "flex";

    renderizarCalendarioModificarAdmin();
    renderizarHorariosModificarAdmin();
    verificarHorariosModificarAdmin(fecha, cita.id, hora);
}

function cerrarCalendarioModificarAdmin() {
    document.getElementById("calendario-flotante-mod-admin").style.display = "none";
}

function renderizarCalendarioModificarAdmin() {
    const grid = document.getElementById("dias-calendario-mod-admin");
    const titulo = document.getElementById("mes-año-display-mod-admin");
    const btnAnterior = document.getElementById("prev-month-mod-admin");

    if (!grid || !titulo) return;

    const nombres = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mes = calendarioModificarAdmin.mes;
    const anio = calendarioModificarAdmin.anio;

    titulo.textContent = `${nombres[mes]} ${anio}`;
    grid.innerHTML = "";

    const primerDia = new Date(anio, mes, 1).getDay();
    const offsetLunes = primerDia === 0 ? 6 : primerDia - 1;
    const diasMes = new Date(anio, mes + 1, 0).getDate();

    for (let dia = 1; dia <= diasMes; dia++) {
        const fecha = new Date(anio, mes, dia);
        const diaSemana = fecha.getDay();

        const celda = document.createElement("div");
        celda.className = "cal-day";
        celda.textContent = dia;

        celda.style.gridRowStart = Math.floor((dia - 1 + offsetLunes) / 7) + 1;
        celda.style.gridColumnStart = offsetLunes === 0
            ? (diaSemana === 0 ? 7 : diaSemana)
            : ((dia - 1 + offsetLunes) % 7) + 1;

        const fechaTexto = [
            anio,
            String(mes + 1).padStart(2, "0"),
            String(dia).padStart(2, "0")
        ].join("-");

        if (fechaTexto === document.getElementById("mod-cita-fecha-admin").value) {
            celda.classList.add("seleccionado");
        }

        const esPasado = fecha < hoy;
        const esFinSemana = diaSemana === 0 || diaSemana === 6;

        // Comprobar si ya pasó el último horario disponible
        const sinHorarios = diaSinHorarios(fechaTexto, "19:30:00");

        if (esPasado || esFinSemana || sinHorarios) {
            celda.classList.add("disabled");
        } else {
            celda.addEventListener("click", () => {
                seleccionarFechaModificarAdmin(fechaTexto, celda);
            });
        }

        grid.appendChild(celda);
    }

    if (btnAnterior) {
        btnAnterior.disabled =
            anio === hoy.getFullYear() && mes === hoy.getMonth();
    }
}

function seleccionarFechaModificarAdmin(fecha, elemento) {
    document.querySelectorAll("#dias-calendario-mod-admin .cal-day")
        .forEach(dia => dia.classList.remove("seleccionado"));

    elemento.classList.add("seleccionado");

    document.getElementById("mod-cita-fecha-admin").value = fecha;

    const [anio, mes, dia] = fecha.split("-");

    document.getElementById("texto-fecha-seleccionada-mod-admin").textContent =
        `${dia}/${mes}/${anio}`;

    cerrarCalendarioModificarAdmin();

    document.getElementById("mod-cita-hora-admin").value = "";

    renderizarHorariosModificarAdmin();
    verificarHorariosModificarAdmin(
        fecha,
        document.getElementById("mod-cita-id-admin").value
    );
}

function renderizarHorariosModificarAdmin() {
    const contenedor = document.getElementById("horarios-contenedor-mod-admin");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    horariosModificarAdmin.forEach(horario => {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn-hora";
        boton.textContent = horario.texto;
        boton.dataset.valor = horario.valor;

        boton.addEventListener("click", () => {
            if (boton.disabled) return;

            contenedor.querySelectorAll(".btn-hora")
                .forEach(b => b.classList.remove("seleccionada"));

            boton.classList.add("seleccionada");

            document.getElementById("mod-cita-hora-admin").value =
                horario.valor;
        });

        contenedor.appendChild(boton);
    });
}

function verificarHorariosModificarAdmin(fecha, idCitaActual, horaOriginal = null) {
    const odontologoSeleccionado =
        document.getElementById("mod-cita-odontologo-admin").value || "1";

    const citasOcupadas = citasAdminCache.filter(cita => {
        if (String(cita.id) === String(idCitaActual)) return false;

        const estado = String(cita.estado || "").toUpperCase();

        if (!["PENDIENTE", "CONFIRMADA"].includes(estado)) return false;

        if (!String(cita.fecha_hora).startsWith(fecha)) return false;

        return String(cita.odontologo || 1) === String(odontologoSeleccionado);
    });

    const horasOcupadas = citasOcupadas.map(cita =>
        horaLocalAdmin(cita.fecha_hora) + ":00"
    );

    const horaActual = horaOriginal ||
        document.getElementById("mod-cita-hora-admin").value;

    document.querySelectorAll("#horarios-contenedor-mod-admin .btn-hora")
        .forEach(boton => {
            const ocupada = horasOcupadas.includes(boton.dataset.valor) &&
                boton.dataset.valor !== horaActual;

            const yaPaso = horaYaPaso(fecha, boton.dataset.valor);

            // Deshabilitar si está ocupada o si ya pasó la hora
            const noDisponible = ocupada || yaPaso;

            boton.disabled = noDisponible;
            boton.classList.toggle("ocupada", noDisponible);

            if (noDisponible) {
                boton.style.backgroundColor = "#e2e8f0";
                boton.style.color = "#94a3b8";
                boton.style.cursor = "not-allowed";
            } else {
                boton.style.backgroundColor = "";
                boton.style.color = "";
                boton.style.cursor = "pointer";
            }

            if (boton.dataset.valor === horaActual && !noDisponible) {
                boton.classList.add("seleccionada");
            }
        });

    if (horaActual) {
        document.getElementById("mod-cita-hora-admin").value = horaActual;
    }
}

// Abrir y cerrar calendario de modificación
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-mostrar-calendario-mod-admin")
        ?.addEventListener("click", () => {
            const calendario =
                document.getElementById("calendario-flotante-mod-admin");

            calendario.style.display =
                calendario.style.display === "none" ? "block" : "none";
        });

    document.getElementById("prev-month-mod-admin")
        ?.addEventListener("click", () => {
            calendarioModificarAdmin.mes--;

            if (calendarioModificarAdmin.mes < 0) {
                calendarioModificarAdmin.mes = 11;
                calendarioModificarAdmin.anio--;
            }

            renderizarCalendarioModificarAdmin();
        });

    document.getElementById("next-month-mod-admin")
        ?.addEventListener("click", () => {
            calendarioModificarAdmin.mes++;

            if (calendarioModificarAdmin.mes > 11) {
                calendarioModificarAdmin.mes = 0;
                calendarioModificarAdmin.anio++;
            }

            renderizarCalendarioModificarAdmin();
        });

    document.getElementById("mod-cita-servicio-admin")
        ?.addEventListener("change", function () {
            const servicio = serviciosAdminCache.find(
                s => String(s.id) === String(this.value)
            );

            document.getElementById("costo-mod-cita-admin").textContent =
                `$${Number(servicio?.costo || 0).toFixed(2)} MXN`;
        });

    document.getElementById("formModificarCitaAdmin")
        ?.addEventListener("submit", async e => {
            e.preventDefault();

            const btn = document.getElementById("btnGuardarModificacionAdmin");
            const feedback = document.getElementById("feedback-modificar-admin");

            const id = document.getElementById("mod-cita-id-admin").value;
            const servicio = document.getElementById("mod-cita-servicio-admin").value;
            const odontologo = document.getElementById("mod-cita-odontologo-admin").value;
            const fecha = document.getElementById("mod-cita-fecha-admin").value;
            const hora = document.getElementById("mod-cita-hora-admin").value;

            if (!servicio || !fecha || !hora) {
                feedback.style.color = "#e74c3c";
                feedback.textContent = "Completa todos los campos y selecciona un horario.";
                return;
            }

            if (horaYaPaso(fecha, hora)) {
                feedback.style.color = "#e74c3c";
                feedback.textContent = "Ese horario ya pasó. Selecciona otro horario.";
                return;
            }

            try {
                btn.disabled = true;
                feedback.style.color = "#3498db";
                feedback.textContent = "Guardando cambios...";

                const { error } = await client.from("Citas")
                    .update({
                        servicio: Number(servicio),
                        odontologo: Number(odontologo),
                        fecha_hora: `${fecha}T${hora}`
                    })
                    .eq("id", id);

                if (error) throw error;

                feedback.style.color = "#2ecc71";
                feedback.textContent = "¡Cita modificada correctamente!";

                setTimeout(() => window.location.reload(), 900);

            } catch (error) {
                console.error("Error al modificar cita:", error);

                feedback.style.color = "#e74c3c";
                feedback.textContent = error.message.includes("idx_cita_unica")
                    ? "El paciente ya tiene una cita agendada ese día."
                    : "Error al modificar: " + error.message;

                btn.disabled = false;
            }
        });

    // Modal cancelar
    document.getElementById("btnConfirmarCancelacionAdmin")
        ?.addEventListener("click", async () => {
            if (!idCitaCancelarAdmin) return;

            const btn = document.getElementById("btnConfirmarCancelacionAdmin");

            try {
                btn.disabled = true;
                btn.textContent = "Cancelando...";

                const { error } = await client.from("Citas")
                    .update({ estado: "CANCELADA" })
                    .eq("id", idCitaCancelarAdmin);

                if (error) throw error;

                window.location.reload();

            } catch (error) {
                console.error("Error al cancelar cita:", error);
                alert("No se pudo cancelar la cita: " + error.message);

                btn.disabled = false;
                btn.textContent = "Cancelar cita";
            }
        });

    // Modal confirmar cita
document.getElementById("btnAceptarConfirmacionAdmin")
    ?.addEventListener("click", async () => {

        if (!idCitaConfirmarAdmin) return;

        const btn = document.getElementById("btnAceptarConfirmacionAdmin");

        try {
            btn.disabled = true;
            btn.textContent = "Confirmando...";

            const { data, error } = await client
                .from("Citas")
                .update({ estado: "CONFIRMADA" })
                .eq("id", idCitaConfirmarAdmin)
                .select("id, estado")
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                throw new Error("No se pudo actualizar la cita.");
            }

            cerrarModalConfirmarAdmin();

            // Actualizar la agenda con el estado nuevo
            window.location.reload();

        } catch (error) {
            console.error("Error al confirmar cita:", error);

            alert("No se pudo confirmar la cita: " + error.message);

            btn.disabled = false;
            btn.textContent = "Confirmar cita";
        }
    });
});

function abrirModalCancelarAdmin(id) {
    idCitaCancelarAdmin = id;
    document.getElementById("modalCancelarCitaAdmin").style.display = "flex";
}

function cerrarModalCancelarAdmin() {
    document.getElementById("modalCancelarCitaAdmin").style.display = "none";
    idCitaCancelarAdmin = null;

    const btn = document.getElementById("btnConfirmarCancelacionAdmin");
    btn.disabled = false;
    btn.textContent = "Cancelar cita";
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
                <img src="iconos/logo.png" alt="Logo">
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

function cerrarMenusCitasAdmin() {
    document.querySelectorAll(".opciones-menu-cita-admin.abierto")
        .forEach(menu => {
            menu.classList.remove("abierto");
        });
}

document.addEventListener("click", cerrarMenusCitasAdmin);

window.addEventListener("scroll", cerrarMenusCitasAdmin, true);

window.addEventListener("resize", cerrarMenusCitasAdmin);
