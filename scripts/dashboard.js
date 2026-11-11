/* OBTENER DATOS DE USUARIO DESDE SUPABASE Y RENDERIZAR CITAS/PACIENTES */
const BUCKET_PACIENTES = "avatares_pacientes";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Selección de elementos (lo que ya tenías para la información del usuario)

    const contenedorPrincipal = document.querySelector('.contenedor-principal');
    const imgPerfil = document.querySelector('.btn-perfil .pfp');
    const txtNombreHeader = document.getElementById('header-nombre-usuario');
    const txtBienvenida = document.getElementById('bienvenida-usuario');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    const AVATAR_DEFAULT = 'iconos/perfil.png';

    // 2. Selección de contenedores de tarjetas
    const contenedorTarjetasCitas = document.getElementById('tarjetas');
    const contenedorTarjetasPacientes = document.getElementById('tarjetas-pacientes');

    // ==========================================
    // CERRAR SESIÓN
    // ==========================================

    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                btnCerrarSesion.style.pointerEvents = "none";

                const { error } = await client.auth.signOut({
                    scope: "global"
                });

                if (error) throw error;

                window.location.replace("index.html");

            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                alert("No se pudo cerrar la sesión. Intenta nuevamente.");
                btnCerrarSesion.style.pointerEvents = "auto";
            }
        });
    }

    try {
        // Obtener usuario autenticado
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (authError || !user) {
            console.error("Error al obtener usuario:", authError?.message || "Usuario no autenticado");

            window.location.href = 'index.html';
            return;

        }

        // Obtener datos del usuario
        const { data: usuarioData, error: dbError } = await client
            .from('Usuarios')
            .select('nombre, apellido, avatar')
            .eq('id', user.id)
            .maybeSingle();

        if (dbError) {
            console.error("Error al obtener datos del usuario:", dbError.message);
        }

        // Renderizar datos del usuario
        const nombre = usuarioData?.nombre || user.user_metadata?.nombre || 'Usuario';
        const apellido = usuarioData?.apellido || user.user_metadata?.apellido || '';
        const avatar = usuarioData?.avatar;

        const nombreCompleto = `${nombre} ${apellido}`.trim();

        if (txtNombreHeader) txtNombreHeader.textContent = nombreCompleto;
        if (txtBienvenida) txtBienvenida.textContent = `¡Hola ${nombre}!`;

        if (imgPerfil) {
            imgPerfil.src = (avatar && avatar.trim() !== '')
                ? avatar
                : AVATAR_DEFAULT;

            imgPerfil.onerror = () => {
                imgPerfil.src = AVATAR_DEFAULT;
            };

            // Esperar a que la fotografía esté lista
            try {
                await imgPerfil.decode();
            } catch (error) {
                console.warn("No se pudo cargar la fotografía de perfil.");
            }
        }

        // --- NUEVA LÓGICA: RENDERIZAR CITAS ---

        // --- RENDERIZAR TODAS LAS CITAS PRÓXIMAS DEL USUARIO ---
        if (contenedorTarjetasCitas) {

            contenedorTarjetasCitas.innerHTML = `
        <p style="text-align:center; padding:1rem;">
            Cargando tus citas...
        </p>
        `;

            // Obtener fecha y hora actual
            const ahora = new Date().toISOString();

            // Consultar todas las citas futuras del usuario autenticado
            const { data: citasData, error: citasError } = await client
                .from('Citas')
                .select(`
            id,
            fecha_hora,
            estado,
            paciente!inner (
                nombre,
                apellido,
                cliente
            ),
            servicio (
                nombre
            )
        `)
                .eq('paciente.cliente', user.id)
                .in('estado', ['PENDIENTE', 'CONFIRMADA'])
                .gte('fecha_hora', ahora)
                .order('fecha_hora', { ascending: true });

            if (citasError) {

                console.error("Error al cargar citas:", citasError);

                contenedorTarjetasCitas.innerHTML = `
            <p>Error al cargar las citas. Revisa la consola.</p>
        `;

            } else if (!citasData || citasData.length === 0) {

                contenedorTarjetasCitas.innerHTML = `
            <div style="text-align:center; padding:2rem; color:#525151;">
                <i class="bi bi-calendar-x"
                   style="font-size:2rem; color:#cbd5e1;"></i>

                <p style="margin-top:1rem;">
                    No hay citas próximas.
                </p>

                <p style="font-size:0.9rem;">
                    ¿Deseas agendar una nueva?
                </p>
            </div>
        `;

            } else {

                contenedorTarjetasCitas.innerHTML = '';

                citasData.forEach(cita => {

                    const fecha = new Date(cita.fecha_hora);

                    const meses = [
                        "Ene", "Feb", "Mar", "Abr",
                        "May", "Jun", "Jul", "Ago",
                        "Sep", "Oct", "Nov", "Dic"
                    ];

                    const dias = [
                        "Dom", "Lun", "Mar", "Mié",
                        "Jue", "Vie", "Sáb"
                    ];

                    const diaSemana = dias[fecha.getUTCDay()];
                    const diaNumero = fecha.getUTCDate();
                    const mes = meses[fecha.getUTCMonth()];

                    const horas = String(fecha.getUTCHours()).padStart(2, '0');
                    const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');

                    const horaFormateada = `${horas}:${minutos}`;
                    const nombrePaciente = cita.paciente
                        ? `${cita.paciente.nombre} ${cita.paciente.apellido}`
                        : 'Desconocido';

                    const nombreServicio = cita.servicio
                        ? cita.servicio.nombre
                        : 'Servicio';

                    let estadoClase = '';

                    if (cita.estado === 'CONFIRMADA') {
                        estadoClase = `
                    style="color:#106b0c;
                    background-color:rgb(247,254,249);"
                `;
                    }

                    if (cita.estado === 'PENDIENTE') {
                        estadoClase = `
                    style="color:#b45309;
                    background-color:#fffbeb;"
                `;
                    }

                    const tarjetaHTML = `
                <div class="tarjeta">

                    <div class="fecha">
                        <p>${diaSemana}</p>
                        <p class="titulo">${diaNumero}</p>
                        <p>${mes}</p>
                    </div>

                    <p class="hora">${horaFormateada}</p>

                    <div class="info-cita"
                         style="display:flex;
                         flex-direction:column;
                         min-width:0;">

                        <a href="recursos/cliPacientes.html"
                           class="nombre"
                           style="word-break:break-word;">
                            ${nombrePaciente}
                        </a>

                        <span style="font-size:0.9rem; color:#525151;">
                            ${nombreServicio}
                        </span>

                    </div>

                    <p class="estado" ${estadoClase}>
                        ${cita.estado}
                    </p>

                    <a href="recursos/cliCitas.html" id="ver-mas">
                        <i class="bi bi-chevron-right"></i>
                    </a>

                </div>
            `;

                    contenedorTarjetasCitas.insertAdjacentHTML(
                        'beforeend',
                        tarjetaHTML
                    );
                });
            }
        }

        // --- NUEVA LÓGICA: RENDERIZAR PACIENTES ---
        if (contenedorTarjetasPacientes) {
            // 1. Consultar pacientes (agregamos 'avatar' al select)
            const { data: pacientesData, error: pacientesError } = await client
                .from('Pacientes')
                .select('id, nombre, apellido, fecha_nac, avatar')
                .eq('cliente', user.id);

            if (pacientesError) {
                console.error("Error al cargar pacientes:", pacientesError.message);
                contenedorTarjetasPacientes.innerHTML = `<p>Error al cargar los pacientes.</p>`;
            } else if (!pacientesData || pacientesData.length === 0) {
                contenedorTarjetasPacientes.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #525151;">
                        <i class="bi bi-person-x" style="font-size: 2rem; color: #cbd5e1;"></i>
                        <p style="margin-top: 1rem;">No tienes pacientes registrados.</p>
                        <p style="font-size: 0.9rem;">Agrega un paciente para comenzar.</p>
                    </div>
                `;
            } else {
                // 2. Obtener URLs firmadas de las fotografías en paralelo
                await Promise.all(
                    pacientesData.map(async paciente => {
                        paciente.avatarUrl = await obtenerAvatar(paciente.avatar);
                    })
                );

                // 3. Renderizar las tarjetas de pacientes con la imagen dinámica
                contenedorTarjetasPacientes.innerHTML = '';
                pacientesData.forEach(paciente => {
                    const fechaNac = new Date(paciente.fecha_nac);
                    const hoy = new Date();
                    let edad = hoy.getFullYear() - fechaNac.getFullYear();
                    const m = hoy.getMonth() - fechaNac.getMonth();
                    if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                        edad--;
                    }
                    const textoEdad = edad === 1 ? '1 Año' : `${edad} Años`;

                    const tarjetaHTML = `
                        <div class="tarjeta-paciente">
                            <img src="${paciente.avatarUrl}" 
                                 alt="Foto de ${paciente.nombre}" 
                                 onerror="this.onerror=null; this.src='iconos/perfil.png';"
                                 style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"> 
                            <div class="nombre-paciente">
                                <p class="nombre">${paciente.nombre} ${paciente.apellido}</p>
                                <p style="font-size: 0.9rem; color: #525151;">${textoEdad}</p>
                            </div>
                            <a href="recursos/cliPacientes.html" id="ver-mas">
                                <i class="bi bi-chevron-right"></i>
                            </a>
                        </div>
                    `;
                    contenedorTarjetasPacientes.innerHTML += tarjetaHTML;
                });
            }
        }

    } catch (err) {
        console.error("Error inesperado cargando la sesión:", err);
    } finally {
        // Mostrar dashboard cuando todos los datos estén preparados
        if (contenedorPrincipal) {
            contenedorPrincipal.classList.remove('cargando');
        }

        // Retirar el estado de carga del body
        document.body.classList.remove('dashboard-cargando');
    }
});


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

/**
 * Evita que un formulario procese varios envíos simultáneos.
 */
function evitarDobleEnvio(manejador, selectorBoton) {
    let enProceso = false;

    return async function (evento) {
        if (enProceso) {
            evento.preventDefault();
            evento.stopImmediatePropagation();
            return false;
        }

        enProceso = true;

        const formulario = evento.currentTarget;
        const boton = selectorBoton
            ? document.querySelector(selectorBoton)
            : evento.submitter || formulario.querySelector(
                'button[type="submit"], input[type="submit"]'
            );

        const estadoOriginal = boton ? boton.disabled : false;

        if (boton) {
            boton.disabled = true;
            boton.setAttribute('aria-busy', 'true');
        }

        let mantenerBloqueo = false;

        try {
            const resultado = await manejador.call(this, evento);
            mantenerBloqueo = resultado === true;
            return resultado;
        } finally {
            if (!mantenerBloqueo) {
                enProceso = false;

                if (boton) {
                    boton.disabled = estadoOriginal;
                    boton.removeAttribute('aria-busy');
                }
            }
        }
    };
}

// --- LÓGICA DE ENVÍO A SUPABASE (Dentro de DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {

    // 1. LÓGICA PARA GUARDAR CITA
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
                setTimeout(() => window.location.reload(), 1000); // Recarga para ver la nueva cita

            } catch (error) {
                console.error("Error:", error);
                feedbackCita.style.color = "#e74c3c";
                feedbackCita.textContent = "Error al agendar: " + error.message;
            } finally {
                btnConfirmarCita.disabled = false;
            }
        });
    }

    // 2. LÓGICA PARA GUARDAR PACIENTE
    // 2. LÓGICA PARA GUARDAR PACIENTE
    const formNuevoPaciente = document.getElementById('formNuevoPaciente');

    if (formNuevoPaciente) {
        formNuevoPaciente.addEventListener(
            'submit',
            evitarDobleEnvio(async (e) => {

                e.preventDefault();

                const feedbackPaciente = document.getElementById('feedback-paciente');

                const inputNombre = document.getElementById('pac-nombre');
                const inputApellido = document.getElementById('pac-apellido');

                const nombre = inputNombre.value.trim();
                const apellido = inputApellido.value.trim();
                const fechaNac = document.getElementById('pac-fecha').value;
                const sexo = document.getElementById('pac-sexo').value;

                // Validar nombre y apellidos
                const regexNombre = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]{2,30}$/;

                if (!regexNombre.test(nombre)) {
                    feedbackPaciente.style.color = "#e74c3c";
                    feedbackPaciente.textContent =
                        "El nombre debe tener entre 2 y 30 caracteres y contener únicamente letras.";
                    inputNombre.focus();
                    return false;
                }

                if (!regexNombre.test(apellido)) {
                    feedbackPaciente.style.color = "#e74c3c";
                    feedbackPaciente.textContent =
                        "Los apellidos deben tener entre 2 y 30 caracteres y contener únicamente letras.";
                    inputApellido.focus();
                    return false;
                }

                // Validar fecha de nacimiento
                if (!fechaNac) {
                    feedbackPaciente.style.color = "#e74c3c";
                    feedbackPaciente.textContent =
                        "Selecciona una fecha de nacimiento válida.";
                    return false;
                }

                try {
                    const { data: { user }, error: authError } =
                        await client.auth.getUser();

                    if (authError || !user) {
                        throw new Error("Sesión no encontrada.");
                    }

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
                    feedbackPaciente.textContent =
                        "¡Paciente registrado con éxito!";

                    setTimeout(() => window.location.reload(), 1000);

                    // Mantiene bloqueado el botón hasta que se recargue la página.
                    return true;

                } catch (error) {
                    console.error("Error:", error);

                    feedbackPaciente.style.color = "#e74c3c";
                    feedbackPaciente.textContent =
                        "Error al guardar: " + error.message;

                    return false;
                }

            }, "#btnGuardarPaciente")
        );
    }

    document.getElementById('btn-mostrar-calendario').addEventListener('click', () => {
        const cal = document.getElementById('calendario-flotante');
        // Alternar visibilidad
        cal.style.display = cal.style.display === 'none' ? 'block' : 'none';
    });
});

/* ==========================================
   LÓGICA DEL CALENDARIO DE CITAS INTERACTIVO
========================================== */
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

    mesAñoDisplay.textContent =
        `${nombresMeses[mesCal]} ${añoCal}`;

    const primerDia = new Date(añoCal, mesCal, 1).getDay();

    const diasEnMes = new Date(
        añoCal,
        mesCal + 1,
        0
    ).getDate();

    for (let i = 1; i <= diasEnMes; i++) {
        const fechaIteracion = new Date(añoCal, mesCal, i);
        const diaSemana = fechaIteracion.getDay();

        // Cálculo directo para semanas que empiezan en Domingo
        const fila = Math.floor((i - 1 + primerDia) / 7) + 1;
        const columna = diaSemana + 1;

        const esPasado = fechaIteracion < hoy;

        const fechaLocal = [
            fechaIteracion.getFullYear(),
            String(fechaIteracion.getMonth() + 1).padStart(2, '0'),
            String(fechaIteracion.getDate()).padStart(2, '0')
        ].join('-');

        const sinHorarios = diaSinHorarios(fechaLocal, "19:30:00");

        const esFinDeSemana =
            diaSemana === 6 || diaSemana === 0;

        const div = document.createElement('div');
        div.classList.add('cal-day');
        div.textContent = i;

        div.style.gridRowStart = fila;
        div.style.gridColumnStart = columna;

        if (fechaSeleccionada &&
            fechaIteracion.getTime() === fechaSeleccionada.getTime()) {
            div.classList.add('seleccionado');
        }

        if (esPasado || esFinDeSemana || sinHorarios) {
            div.classList.add('disabled');
        } else {
            div.addEventListener('click', () => {
                seleccionarFechaCita(fechaIteracion, div);
            });
        }

        diasGrid.appendChild(div);
    }

    btnPrev.disabled = (
        mesCal === hoy.getMonth() &&
        añoCal === hoy.getFullYear()
    );
}

function seleccionarFechaCita(fecha, elementoDiv) {
    fechaSeleccionada = fecha;
    document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('seleccionado'));
    elementoDiv.classList.add('seleccionado');
    const d = String(fecha.getDate()).padStart(2, '0'), m = String(fecha.getMonth() + 1).padStart(2, '0'), y = fecha.getFullYear();

    const fechaFormateada = `${y}-${m}-${d}`;

    // Guardar en el input oculto
    document.getElementById('cita-fecha').value = fechaFormateada;

    // Mostrar la fecha visualmente y ocultar el calendario flotante
    document.getElementById('texto-fecha-seleccionada').textContent = `${d}/${m}/${y}`;
    document.getElementById('calendario-flotante').style.display = 'none';

    // === NUEVO: DESELECCIONAR HORA PREVIA AL CAMBIAR DE FECHA ===
    document.querySelectorAll('.btn-hora').forEach(el => el.classList.remove('seleccionada'));
    document.getElementById('cita-hora').value = '';
    // ============================================================

    // ¡DISPARAR LA VERIFICACIÓN! Consulta a Supabase las horas ocupadas de ese día
    verificarHorariosOcupados(fechaFormateada);
}

async function verificarHorariosOcupados(fechaStr) {
    const odontologoId = document.getElementById('cita-odontologo').value || 1;

    try {
        // AQUÍ ESTÁ EL CAMBIO: Llamamos a la función SQL que creaste
        const { data: citasOcupadas, error } = await client.rpc('obtener_horarios_ocupados', {
            p_fecha: fechaStr
        });

        if (error) throw error;

        // Extraer solo las horas usando getUTC para ignorar zonas horarias locales
        const horasOcupadas = (citasOcupadas || [])
            .filter(c => c.odontologo === parseInt(odontologoId)) // Filtramos el odontólogo aquí
            .map(c => {
                const fechaObj = new Date(c.fecha_hora);
                const h = String(fechaObj.getUTCHours()).padStart(2, '0');
                const m = String(fechaObj.getUTCMinutes()).padStart(2, '0');
                const s = String(fechaObj.getUTCSeconds()).padStart(2, '0');
                return `${h}:${m}:${s}`;
            });

        // Recorrer los botones de hora y bloquear los ocupados
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
        { texto: "16:30", valor: "16:30:00" },
        { texto: "17:00", valor: "17:00:00" },
        { texto: "17:30", valor: "17:30:00" },
        { texto: "18:00", valor: "18:00:00" },
        { texto: "18:30", valor: "18:30:00" },
        { texto: "19:00", valor: "19:00:00" },
        { texto: "19:30", valor: "19:30:00" }
    ];

    horarios.forEach?.(h => { }); // (O simplemente mantén tu forEach normal)

    horarios.forEach(h => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('btn-hora');
        btn.textContent = h.texto;
        btn.dataset.valor = h.valor; // Identificador para comparar
        btn.addEventListener('click', () => seleccionarHoraCita(h.valor, btn));
        contenedor.appendChild(btn);
    });
}

function seleccionarHoraCita(valor, boton) {
    document.querySelectorAll('.btn-hora').forEach(el => el.classList.remove('seleccionada'));
    boton.classList.add('seleccionada');
    document.getElementById('cita-hora').value = valor;
}

// Inicializar y manejar navegación de meses
document.addEventListener('DOMContentLoaded', () => {
    renderizarCalendario();
    renderizarHorariosDisponibles();

    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            mesCal--;
            if (mesCal < 0) { mesCal = 11; añoCal--; }
            renderizarCalendario();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            mesCal++;
            if (mesCal > 11) { mesCal = 0; añoCal++; }
            renderizarCalendario();
        });
    }
});

function cerrarModalCita() {
    // 1. Ocultar modal y limpiar formulario
    document.getElementById('modalNuevaCita').style.display = 'none';
    document.getElementById('formNuevaCita').reset();
    document.getElementById('feedback-cita').textContent = '';

    // 2. Reiniciar el input falso del calendario
    document.getElementById('texto-fecha-seleccionada').textContent = 'Selecciona una fecha';
    document.getElementById('calendario-flotante').style.display = 'none';

    // 3. Limpiar las variables y selecciones del calendario
    fechaSeleccionada = null;
    document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('seleccionado'));
    document.querySelectorAll('.btn-hora').forEach(el => el.classList.remove('seleccionada'));
    renderizarCalendario(); // Regresa al mes actual

    // 4. Reiniciar el costo (Noté que en tu HTML copiaste el ID de clicitas)
    const costoText = document.getElementById('costo-cita-clicitas');
    if (costoText) costoText.textContent = "$0.00 MXN";
}

/* ==========================================
   LÓGICA SELECTORES DE FECHA DE NACIMIENTO
========================================== */
document.addEventListener('DOMContentLoaded', () => {
    const selectAnio = document.getElementById('pac-fecha-anio');
    const selectMes = document.getElementById('pac-fecha-mes');
    const selectDia = document.getElementById('pac-fecha-dia');
    const inputFechaOculta = document.getElementById('pac-fecha');

    if (!selectAnio || !selectMes || !selectDia) return;

    // 1. Poblar select de años (Desde el año actual hasta 100 años atrás)
    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= anioActual - 100; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        selectAnio.appendChild(option);
    }

    // 2. Función para actualizar los días disponibles según el mes y año
    function actualizarDias() {
        const anio = parseInt(selectAnio.value);
        const mes = parseInt(selectMes.value);

        // Si falta año o mes, conserva los días del 1 al 31.
        if (!anio || !mes) return;

        const diaSeleccionado = selectDia.value;

        selectDia.innerHTML = '<option value="" disabled selected>Día</option>';

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

    // 3. Función para consolidar la fecha en el input oculto
    function consolidarFecha() {
        if (selectAnio.value && selectMes.value && selectDia.value) {
            inputFechaOculta.value = `${selectAnio.value}-${selectMes.value}-${selectDia.value}`;
        } else {
            inputFechaOculta.value = "";
        }
    }

    // 4. Escuchar cambios en los selects
    selectAnio.addEventListener('change', () => {
        actualizarDias();
        consolidarFecha();
    });

    selectMes.addEventListener('change', () => {
        actualizarDias();
        consolidarFecha();
    });

    selectDia.addEventListener('change', consolidarFecha);
});

const botonOcultar = document.getElementById('ver');
const contenedor = document.getElementById('tarjetas');
botonOcultar.addEventListener('click', () => {
    contenedor.classList.toggle('ocultar');
    botonOcultar.classList.toggle('voltear');
});

const botonOcultarPacientes = document.getElementById('ver-pacientes');
const contenedorPacientes = document.getElementById('tarjetas-pacientes');
botonOcultarPacientes.addEventListener('click', () => {
    contenedorPacientes.classList.toggle('ocultar');
    botonOcultarPacientes.classList.toggle('voltear');
});

// Cargar dinámicamente Pacientes y Servicios en el modal de Agendar Cita
async function cargarSelectsModalCita() {
    const selectPacientes = document.getElementById('cita-paciente');
    const selectServicios = document.getElementById('cita-servicio');

    // 1. Cargar Pacientes del usuario actual
    const { data: { user } } = await client.auth.getUser();
    if (user && selectPacientes) {
        const { data: pacientes } = await client
            .from('Pacientes')
            .select('id, nombre, apellido')
            .eq('cliente', user.id);

        selectPacientes.innerHTML = '<option value="" disabled selected>Selecciona paciente</option>' +
            (pacientes || []).map(p => `<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
    }

    // 2. Cargar Servicios disponibles
    if (selectServicios) {
        const { data: servicios } = await client
            .from('Servicios')
            .select('id, nombre');

        selectServicios.innerHTML = '<option value="" disabled selected>Selecciona servicio</option>' +
            (servicios || []).map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    }
}

// =====================================================
// OBTENER FOTOGRAFÍA DEL BUCKET PRIVADO (CORREGIDO PARA DASHBOARD)
// =====================================================

async function obtenerAvatar(ruta) {

    // Usamos la ruta local del dashboard en lugar de AVATAR_PREDETERMINADO
    if (!ruta) return 'iconos/perfil.png';

    // Si es una URL antigua, intentar recuperar su ruta.
    if (ruta.startsWith("http")) {
        try {
            const url = new URL(ruta);
            const marcador = `/storage/v1/object/sign/${BUCKET_PACIENTES}/`;
            const marcadorPublico = `/storage/v1/object/public/${BUCKET_PACIENTES}/`;

            if (url.pathname.includes(marcador)) {
                ruta = decodeURIComponent(url.pathname.split(marcador)[1]);
            } else if (url.pathname.includes(marcadorPublico)) {
                ruta = decodeURIComponent(url.pathname.split(marcadorPublico)[1]);
            } else {
                return ruta;
            }
        } catch {
            return 'iconos/perfil.png'; // Corregido
        }
    }

    const { data, error } = await client.storage
        .from(BUCKET_PACIENTES)
        .createSignedUrl(ruta, 3600);

    if (error) {
        console.error("Error obteniendo fotografía:", error);
        return 'iconos/perfil.png'; // Corregido
    }

    return data.signedUrl;
}




async function cargarOdontologosParaModalDashboard() {
    const selects = [document.getElementById("cita-odontologo")].filter(Boolean);
    if (!selects.length) return;
    selects.forEach(s => { s.disabled = true; s.innerHTML = '<option value="">Cargando odontólogos...</option>'; });
    try {
        const { data, error } = await client.from("Odontologos").select(`id, Usuarios!Odontologos_Usuario_fkey(nombre, apellido)`).order("id");
        if (error) throw error;
        const rows = (data || []).filter(o => o.Usuarios);
        selects.forEach(s => {
            s.innerHTML = '<option value="" disabled selected>Selecciona odontólogo</option>';
            rows.forEach(o => { const op = document.createElement("option"); op.value = o.id; op.textContent = `${o.Usuarios.nombre} ${o.Usuarios.apellido}`; s.appendChild(op); });
            s.disabled = false;
        });
    } catch (e) { console.error("Error cargando odontólogos:", e); selects.forEach(s => { s.innerHTML = '<option value="">No se pudieron cargar los odontólogos</option>'; s.disabled = false; }); }
}

/* ==========================================================
   HORARIOS DINÁMICOS POR ODONTÓLOGO — sincronizado con cliCitas
   ========================================================== */
let horariosAgendaDashboard = [];
let solicitudHorariosDashboard = 0;

function normalizarDiaDashboard(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function fechaLocalDashboard(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
function minutosHorarioDashboard(valor) {
    const partes = String(valor || "").slice(0, 8).split(":").map(Number);
    return (partes[0] || 0) * 60 + (partes[1] || 0);
}
function textoHoraDashboard(minutos) {
    return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}:00`;
}
async function cargarHorariosDashboard() {
    const doctor = document.getElementById("cita-odontologo")?.value;
    const solicitud = ++solicitudHorariosDashboard;
    horariosAgendaDashboard = [];
    const caja = document.getElementById("horarios-contenedor");
    if (caja) caja.innerHTML = doctor ? "<p>Consultando horarios del odontólogo...</p>" : "<p>Selecciona un odontólogo para consultar sus horarios.</p>";
    if (!doctor) return;
    try {
        const { data, error } = await client.from("Horarios")
            .select("dia_semana, hora_inicio, hora_fin")
            .eq("odontologo", Number(doctor));
        if (error) throw error;
        if (solicitud !== solicitudHorariosDashboard) return;
        horariosAgendaDashboard = data || [];
        renderizarCalendario();
        const fecha = document.getElementById("cita-fecha")?.value;
        if (fecha) renderizarHorariosDisponibles(fecha);
        else if (caja) caja.innerHTML = "<p>Selecciona una fecha para ver los horarios disponibles.</p>";
    } catch (error) {
        console.error("Error al cargar horarios del odontólogo:", error);
        if (caja) caja.innerHTML = "<p>No se pudieron cargar los horarios. Intenta nuevamente.</p>";
    }
}
function renderizarCalendario() {
    const grid = document.getElementById("dias-calendario");
    const titulo = document.getElementById("mes-año-display");
    const anterior = document.getElementById("prev-month");
    if (!grid || !titulo) return;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    grid.innerHTML = "";
    titulo.textContent = `${nombresMeses[mesCal]} ${añoCal}`;
    const primerDia = new Date(añoCal, mesCal, 1).getDay();
    const total = new Date(añoCal, mesCal + 1, 0).getDate();
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    for (let n = 1; n <= total; n++) {
        const fecha = new Date(añoCal, mesCal, n), iso = fechaLocalDashboard(fecha);
        const btn = document.createElement("div"); btn.className = "cal-day"; btn.textContent = n;
        btn.style.gridRowStart = Math.floor((n - 1 + primerDia) / 7) + 1;
        btn.style.gridColumnStart = fecha.getDay() + 1;
        const configurado = horariosAgendaDashboard.some(h => normalizarDiaDashboard(h.dia_semana) === normalizarDiaDashboard(dias[fecha.getDay()]));
        if (fecha.getTime() === (fechaSeleccionada ? new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate()).getTime() : -1)) btn.classList.add("seleccionado");
        const sinHorasHoy = iso === obtenerFechaLocal() && horariosAgendaDashboard.length && horariosAgendaDashboard.every(h => minutosHorarioDashboard(h.hora_fin) <= new Date().getHours() * 60 + new Date().getMinutes());
        if (fecha < hoy || !configurado || sinHorasHoy || !document.getElementById("cita-odontologo")?.value) btn.classList.add("disabled");
        else btn.addEventListener("click", () => seleccionarFechaCita(fecha, btn));
        grid.appendChild(btn);
    }
    if (anterior) anterior.disabled = mesCal === hoy.getMonth() && añoCal === hoy.getFullYear();
}
function seleccionarFechaCita(fecha, elementoDiv) {
    fechaSeleccionada = fecha;
    document.querySelectorAll("#dias-calendario .cal-day").forEach(el => el.classList.remove("seleccionado"));
    elementoDiv.classList.add("seleccionado");
    const iso = fechaLocalDashboard(fecha), d = String(fecha.getDate()).padStart(2, "0"), m = String(fecha.getMonth() + 1).padStart(2, "0");
    document.getElementById("cita-fecha").value = iso;
    document.getElementById("texto-fecha-seleccionada").textContent = `${d}/${m}/${fecha.getFullYear()}`;
    document.getElementById("calendario-flotante").style.display = "none";
    document.getElementById("cita-hora").value = "";
    renderizarHorariosDisponibles(iso);
}
async function verificarHorariosOcupados(fechaStr) {
    const doctor = document.getElementById("cita-odontologo")?.value;
    const caja = document.getElementById("horarios-contenedor");
    if (!doctor || !caja) return;
    const solicitud = ++solicitudHorariosDashboard;
    const botones = [...caja.querySelectorAll(".btn-hora")];
    botones.forEach(b => { b.disabled = true; b.title = "Verificando disponibilidad"; });
    try {
        const { data, error } = await client.rpc("obtener_horarios_ocupados", { p_fecha: fechaStr });
        if (error) throw error;
        if (solicitud !== solicitudHorariosDashboard) return;
        const ocupadas = (data || []).filter(c => String(c.odontologo) === String(doctor))
            .map(c => { const f = String(c.fecha_hora); return f.includes("T") ? f.split("T")[1].slice(0, 8) : ""; });
        botones.forEach(b => {
            const ocupada = ocupadas.includes(b.dataset.valor), paso = horaYaPaso(fechaStr, b.dataset.valor);
            b.disabled = ocupada || paso; b.classList.toggle("ocupada", ocupada || paso);
            b.title = ocupada ? "Horario ocupado" : paso ? "Este horario ya pasó" : "Horario disponible";
            b.style.backgroundColor = b.disabled ? "#e2e8f0" : ""; b.style.color = b.disabled ? "#94a3b8" : ""; b.style.cursor = b.disabled ? "not-allowed" : "pointer";
        });
    } catch (error) {
        console.error("Error verificando disponibilidad:", error);
        botones.forEach(b => { b.disabled = true; b.classList.add("ocupada"); b.title = "No se pudo verificar disponibilidad"; });
        const fb = document.getElementById("feedback-cita"); if (fb) { fb.style.color = "#dc2626"; fb.textContent = "No se pudieron consultar los horarios. Intenta nuevamente."; }
    }
}
function renderizarHorariosDisponibles(fechaStr = document.getElementById("cita-fecha")?.value) {
    const caja = document.getElementById("horarios-contenedor"); if (!caja) return;
    caja.innerHTML = "";
    if (!fechaStr) { caja.innerHTML = "<p>Selecciona una fecha para consultar horarios.</p>"; return; }
    const fecha = new Date(`${fechaStr}T12:00:00`);
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const config = horariosAgendaDashboard.find(h => normalizarDiaDashboard(h.dia_semana) === normalizarDiaDashboard(dias[fecha.getDay()]));
    if (!config) { caja.innerHTML = "<p>El odontólogo no tiene horarios configurados este día.</p>"; return; }
    const inicio = minutosHorarioDashboard(config.hora_inicio), fin = minutosHorarioDashboard(config.hora_fin);
    let cantidad = 0;
    for (let m = inicio; m + 30 <= fin; m += 30) {
        const valor = textoHoraDashboard(m), btn = document.createElement("button");
        btn.type = "button"; btn.className = "btn-hora"; btn.textContent = valor.slice(0, 5); btn.dataset.valor = valor;
        btn.addEventListener("click", () => { if (btn.disabled) return; caja.querySelectorAll(".btn-hora").forEach(x => x.classList.remove("seleccionada")); btn.classList.add("seleccionada"); document.getElementById("cita-hora").value = valor; });
        caja.appendChild(btn); cantidad++;
    }
    if (!cantidad) { caja.innerHTML = "<p>No hay horarios configurados para este día.</p>"; return; }
    verificarHorariosOcupados(fechaStr);
}
const abrirModalCitaOriginalDashboard = abrirModalCita;
async function abrirModalCita() {
    document.getElementById("modalNuevaCita").style.display = "flex";
    document.getElementById("formNuevaCita")?.reset();
    document.getElementById("cita-fecha").value = ""; document.getElementById("cita-hora").value = "";
    document.getElementById("texto-fecha-seleccionada").textContent = "Selecciona una fecha";
    document.getElementById("horarios-contenedor").innerHTML = "<p>Selecciona un odontólogo y una fecha.</p>";
    fechaSeleccionada = null; mesCal = new Date().getMonth(); añoCal = new Date().getFullYear();
    await cargarSelectsModalCita();
    await cargarOdontologosParaModalDashboard();
    await cargarHorariosDashboard();
    renderizarCalendario();
}
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("cita-odontologo")?.addEventListener("change", async () => {
        fechaSeleccionada = null;
        document.getElementById("cita-fecha").value = "";
        document.getElementById("cita-hora").value = "";
        document.getElementById("texto-fecha-seleccionada").textContent = "Selecciona una fecha";
        await cargarHorariosDashboard();
    });
});


document.getElementById("formNuevaCita")?.addEventListener("submit", async function (e) {
    e.preventDefault(); e.stopImmediatePropagation();
    const feedback = document.getElementById("feedback-cita"), btn = document.getElementById("btnConfirmarCita");
    const paciente = document.getElementById("cita-paciente").value, servicio = document.getElementById("cita-servicio").value;
    const odontologo = document.getElementById("cita-odontologo").value, fecha = document.getElementById("cita-fecha").value, hora = document.getElementById("cita-hora").value;
    if (!paciente || !servicio || !odontologo || !fecha || !hora) { feedback.style.color = "#dc2626"; feedback.textContent = "Completa los campos y selecciona un horario disponible."; return; }
    try {
        btn.disabled = true; feedback.style.color = "#2563eb"; feedback.textContent = "Verificando disponibilidad...";
        const { data, error } = await client.rpc("obtener_horarios_ocupados", { p_fecha: fecha }); if (error) throw error;
        const busy = (data || []).some(c => String(c.odontologo) === String(odontologo) && String(c.fecha_hora || "").split("T")[1]?.slice(0, 8) === hora);
        if (busy || horaYaPaso(fecha, hora)) { feedback.style.color = "#dc2626"; feedback.textContent = "Ese horario ya no está disponible. Selecciona otro."; await verificarHorariosOcupados(fecha); return; }
        feedback.textContent = "Agendando cita...";
        const { error: insertError } = await client.from("Citas").insert([{ fecha_hora: `${fecha}T${hora}`, estado: "PENDIENTE", paciente: Number(paciente), odontologo: Number(odontologo), servicio: Number(servicio) }]);
        if (insertError) throw insertError;
        feedback.style.color = "#16a34a"; feedback.textContent = "¡Cita agendada exitosamente!";
        setTimeout(() => window.location.reload(), 900);
    } catch (err) { console.error(err); feedback.style.color = "#dc2626"; feedback.textContent = "No se pudo agendar: " + err.message; }
    finally { btn.disabled = false; }
}, true);
