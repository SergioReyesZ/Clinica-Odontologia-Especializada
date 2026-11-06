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

    // 3. Funcionalidad para Cerrar Sesión
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const { error } = await client.auth.signOut();
                if (error) throw error;
                window.location.href = 'index.html';
            } catch (err) {
                console.error("Error al cerrar sesión:", err.message);
                alert("Ocurrió un error al intentar cerrar sesión.");
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
            imgPerfil.src = (avatar && avatar.trim() !== '') ? avatar : AVATAR_DEFAULT;
            imgPerfil.onerror = () => { imgPerfil.src = AVATAR_DEFAULT; };
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

                    const diaSemana = dias[fecha.getDay()];
                    const diaNumero = fecha.getDate();
                    const mes = meses[fecha.getMonth()];

                    let horas = fecha.getHours();
                    const ampm = horas >= 12 ? 'PM' : 'AM';

                    horas = horas % 12 || 12;

                    const minutos = String(fecha.getMinutes()).padStart(2, '0');

                    const horaFormateada =
                        `${horas}:${minutos} ${ampm}`;

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
        // 4. Revelamos todo de golpe
        if (contenedorPrincipal) {
            contenedorPrincipal.classList.remove('cargando');
        }
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
                setTimeout(() => window.location.reload(), 1000); // Recarga para ver al nuevo paciente

            } catch (error) {
                console.error("Error:", error);
                feedbackPaciente.style.color = "#e74c3c";
                feedbackPaciente.textContent = "Error al guardar: " + error.message;
            } finally {
                btnGuardarPaciente.disabled = false;
            }
        });
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

    const offsetLunes = primerDia === 0 ? 6 : primerDia - 1;

    const diasEnMes = new Date(
        añoCal,
        mesCal + 1,
        0
    ).getDate();

    // Sá, Lu, Ma, Mi, Ju, Vi, Do.
    const columnaPorDia = {
        0: 7,
        1: 2,
        2: 3,
        3: 4,
        4: 5,
        5: 6,
        6: 1
    };

    for (let i = 1; i <= diasEnMes; i++) {
        const fechaIteracion = new Date(añoCal, mesCal, i);
        const diaSemana = fechaIteracion.getDay();

        const fila = Math.floor(
            (i - 1 + offsetLunes) / 7
        ) + 1;

        const columna = columnaPorDia[diaSemana];

        const esPasado = fechaIteracion < hoy;

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

        if (esPasado || esFinDeSemana) {
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

            if (horasOcupadas.includes(valorHora)) {
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
        { texto: "4:30 PM", valor: "16:30:00" },
        { texto: "5:00 PM", valor: "17:00:00" },
        { texto: "5:30 PM", valor: "17:30:00" },
        { texto: "6:00 PM", valor: "18:00:00" },
        { texto: "6:30 PM", valor: "18:30:00" },
        { texto: "7:00 PM", valor: "19:00:00" },
        { texto: "7:30 PM", valor: "19:30:00" },
        { texto: "8:00 PM", valor: "20:00:00" }
    ];

    horarios.ghforEach?.(h => { }); // (O simplemente mantén tu forEach normal)

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

        // Guardar el día actualmente seleccionado para no perderlo si sigue siendo válido
        const diaSeleccionado = selectDia.value;

        // Limpiar días actuales (excepto la opción por defecto)
        selectDia.innerHTML = '<option value="" disabled selected>Día</option>';

        if (!anio || !mes) return;

        // Calcular cantidad de días del mes seleccionado
        const diasEnElMes = new Date(anio, mes, 0).getDate();

        // Poblar select de días
        for (let i = 1; i <= diasEnElMes; i++) {
            const option = document.createElement('option');
            const valorDia = i.toString().padStart(2, '0');
            option.value = valorDia;
            option.textContent = i;
            selectDia.appendChild(option);
        }

        // Restaurar el día seleccionado si todavía es válido en el nuevo mes
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