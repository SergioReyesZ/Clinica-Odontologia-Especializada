/* =========================================================
   DASHBOARD DE CLIENTE - ODONTOLOGÍA ESPECIALIZADA
   JavaScript unificado y simplificado
========================================================= */

/* -------------------------
   CONFIGURACIÓN GENERAL
------------------------- */

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

const ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADA"];
const AVATAR_DEFAULT = "iconos/perfil.png";
const BUCKET_PACIENTES = "avatares_pacientes";

let usuarioActual = null;
let mesCal = new Date().getMonth();
let anioCal = new Date().getFullYear();
let fechaSeleccionada = null;
let pacientesUsuario = [];


/* -------------------------
   FUNCIONES AUXILIARES
------------------------- */

const obtenerElemento = id => document.getElementById(id);

function mostrarFeedback(id, mensaje, tipo = "error") {
    const elemento = obtenerElemento(id);
    if (!elemento) return;

    const colores = {
        error: "#e74c3c",
        exito: "#16a34a",
        info: "#3498db"
    };

    elemento.style.color = colores[tipo] || colores.error;
    elemento.textContent = mensaje;
}

function formatoFecha(fecha) {
    return new Date(fecha).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function formatoHora(fecha) {
    return new Date(fecha).toLocaleTimeString("es-MX", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function fechaLocalYMD(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function fechaEsPasada(fecha) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const comparada = new Date(fecha);
    comparada.setHours(0, 0, 0, 0);

    return comparada < hoy;
}


/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    configurarEventos();
    configurarFechaNacimiento();

    try {
        const { data, error } = await client.auth.getUser();

        if (error || !data.user) {
            window.location.href = "index.html";
            return;
        }

        usuarioActual = data.user;

        await cargarDatosUsuario();
        await cargarCitasDashboard();
        await cargarPacientesDashboard();

    } catch (error) {
        console.error("Error al iniciar el dashboard:", error);
    } finally {
        const principal = document.querySelector(".contenedor-principal");

        if (principal) {
            principal.classList.remove("cargando");
        }
    }
});


/* =========================================================
   EVENTOS GENERALES
========================================================= */

function configurarEventos() {

    // Cerrar sesión
    const btnCerrarSesion = obtenerElemento("btnCerrarSesion");

    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", async e => {
            e.preventDefault();

            const { error } = await client.auth.signOut();

            if (error) {
                console.error(error);
                alert("No se pudo cerrar la sesión.");
                return;
            }

            window.location.href = "index.html";
        });
    }

    // Mostrar / ocultar tarjetas de citas
    const btnVer = obtenerElemento("ver");
    const tarjetas = obtenerElemento("tarjetas");

    if (btnVer && tarjetas) {
        btnVer.addEventListener("click", () => {
            tarjetas.classList.toggle("ocultar");
            btnVer.classList.toggle("voltear");
        });
    }

    // Mostrar / ocultar tarjetas de pacientes
    const btnVerPacientes = obtenerElemento("ver-pacientes");
    const tarjetasPacientes = obtenerElemento("tarjetas-pacientes");

    if (btnVerPacientes && tarjetasPacientes) {
        btnVerPacientes.addEventListener("click", () => {
            tarjetasPacientes.classList.toggle("ocultar");
            btnVerPacientes.classList.toggle("voltear");
        });
    }

    // Abrir calendario con posicionamiento inteligente
    const btnCalendario = obtenerElemento("btn-mostrar-calendario");

    if (btnCalendario) {
        btnCalendario.addEventListener("click", () => {

            const calendario = obtenerElemento("calendario-flotante");
            if (!calendario) return;

            const estaAbierto = calendario.style.display === "block";

            if (estaAbierto) {
                calendario.style.display = "none";
            } else {
                calendario.style.display = "block";
                posicionarCalendarioFlotante();
            }
        });
    }

    // Recalcular la posición si cambia el tamaño o se desplaza la página.
    window.addEventListener("resize", () => {
        const calendario = obtenerElemento("calendario-flotante");

        if (calendario?.style.display === "block") {
            posicionarCalendarioFlotante();
        }
    });

    window.addEventListener("scroll", () => {
        const calendario = obtenerElemento("calendario-flotante");

        if (calendario?.style.display === "block") {
            posicionarCalendarioFlotante();
        }
    }, true);
    // Navegación del calendario
    const anterior = obtenerElemento("prev-month");
    const siguiente = obtenerElemento("next-month");

    if (anterior) {
        anterior.addEventListener("click", () => {
            mesCal--;

            if (mesCal < 0) {
                mesCal = 11;
                anioCal--;
            }

            renderizarCalendario();
        });
    }

    if (siguiente) {
        siguiente.addEventListener("click", () => {
            mesCal++;

            if (mesCal > 11) {
                mesCal = 0;
                anioCal++;
            }

            renderizarCalendario();
        });
    }

    // Cambiar servicio y actualizar costo
    const selectServicio = obtenerElemento("cita-servicio");

    if (selectServicio) {
        selectServicio.addEventListener("change", actualizarCostoCita);
    }

    // Cambiar paciente
    const selectPaciente = obtenerElemento("cita-paciente");

    if (selectPaciente) {
        selectPaciente.addEventListener("change", manejarSeleccionPaciente);
    }

    // Enviar nueva cita
    const formCita = obtenerElemento("formNuevaCita");

    if (formCita) {
        formCita.addEventListener("submit", guardarCita);
    }

    // Registrar paciente desde su formulario independiente
    const formPaciente = obtenerElemento("formNuevoPaciente");

    if (formPaciente) {
        formPaciente.addEventListener("submit", guardarPaciente);
    }

    const selectOdontologo = obtenerElemento("cita-odontologo");

    if (selectOdontologo) {
        selectOdontologo.addEventListener("change", async () => {
            await renderizarCalendario();

            if (fechaSeleccionada) {
                await verificarHorariosOcupados(fechaSeleccionada);
            }
        });
    }
}


/* =========================================================
   DATOS DEL USUARIO
========================================================= */

async function cargarDatosUsuario() {

    const { data, error } = await client
        .from("Usuarios")
        .select("nombre, apellido, avatar")
        .eq("id", usuarioActual.id)
        .maybeSingle();

    if (error) {
        console.error("Error al consultar usuario:", error);
    }

    const nombre = data?.nombre ||
        usuarioActual.user_metadata?.nombre ||
        "Usuario";

    const apellido = data?.apellido ||
        usuarioActual.user_metadata?.apellido ||
        "";

    const avatar = data?.avatar;

    const nombreCompleto = `${nombre} ${apellido}`.trim();

    const nombreHeader = obtenerElemento("header-nombre-usuario");
    const bienvenida = obtenerElemento("bienvenida-usuario");
    const imagenPerfil = document.querySelector(".btn-perfil .pfp");

    if (nombreHeader) {
        nombreHeader.textContent = nombreCompleto;
    }

    if (bienvenida) {
        bienvenida.textContent = `¡Hola ${nombre}!`;
    }

    if (imagenPerfil) {
        imagenPerfil.src = avatar || AVATAR_DEFAULT;
        imagenPerfil.onerror = () => {
            imagenPerfil.src = AVATAR_DEFAULT;
        };
    }
}


/* =========================================================
   CITAS DEL DASHBOARD
========================================================= */

async function cargarCitasDashboard() {

    const contenedor = obtenerElemento("tarjetas");
    if (!contenedor) return;

    // Primero obtenemos los pacientes que pertenecen al usuario.
    const { data: pacientes, error: errorPacientes } = await client
        .from("Pacientes")
        .select("id")
        .eq("cliente", usuarioActual.id);

    if (errorPacientes) {
        console.error(errorPacientes);
        contenedor.innerHTML = "<p>Error al cargar las citas.</p>";
        return;
    }

    const idsPacientes = (pacientes || []).map(p => p.id);

    if (!idsPacientes.length) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:2rem;color:#525151;">
                <i class="bi bi-calendar-x"
                   style="font-size:2rem;color:#cbd5e1;"></i>
                <p style="margin-top:1rem;">No hay citas próximas.</p>
                <p style="font-size:.9rem;">
                    ¿Deseas agendar una nueva?
                </p>
            </div>
        `;
        return;
    }

    const { data: citas, error } = await client
        .from("Citas")
        .select(`
            id,
            fecha_hora,
            estado,
            paciente ( nombre, apellido ),
            servicio ( nombre )
        `)
        .in("paciente", idsPacientes)
        .in("estado", ESTADOS_ACTIVOS)
        .order("fecha_hora", { ascending: true })
        .limit(5);

    if (error) {
        console.error("Error al cargar citas:", error);
        contenedor.innerHTML = "<p>Error al cargar las citas.</p>";
        return;
    }

    if (!citas || !citas.length) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:2rem;color:#525151;">
                <i class="bi bi-calendar-x"
                   style="font-size:2rem;color:#cbd5e1;"></i>
                <p style="margin-top:1rem;">No hay citas próximas.</p>
                <p style="font-size:.9rem;">
                    ¿Deseas agendar una nueva?
                </p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = "";

    citas.forEach(cita => {
        const fecha = new Date(cita.fecha_hora);

        const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        const estadoEstilo = cita.estado === "CONFIRMADA"
            ? "color:#106b0c;background-color:rgb(247,254,249);"
            : "color:#b45309;background-color:#fffbeb;";

        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta";

        tarjeta.innerHTML = `
            <div class="fecha">
                <p>${dias[fecha.getDay()]}</p>
                <p class="titulo">${fecha.getDate()}</p>
                <p>${meses[fecha.getMonth()]}</p>
            </div>

            <p class="hora">${formatoHora(cita.fecha_hora)}</p>

            <div class="nombre-paciente">
                <a class="nombre">
                    ${cita.paciente
                ? `${cita.paciente.nombre} ${cita.paciente.apellido}`
                : "Paciente"}
                </a>
            </div>

            <p>${cita.servicio?.nombre || "Servicio"}</p>

            <p class="estado" style="${estadoEstilo}">
                ${cita.estado}
            </p>

            <i class="bi bi-chevron-right" id="ver-mas"></i>
        `;

        contenedor.appendChild(tarjeta);
    });
}


/* =========================================================
   PACIENTES DEL DASHBOARD
========================================================= */

async function cargarPacientesDashboard() {

    const contenedor = obtenerElemento("tarjetas-pacientes");
    if (!contenedor) return;

    const { data: pacientes, error } = await client
        .from("Pacientes")
        .select("id, nombre, apellido, fecha_nac, avatar")
        .eq("cliente", usuarioActual.id);

    if (error) {
        console.error("Error al cargar pacientes:", error);
        contenedor.innerHTML = "<p>Error al cargar los pacientes.</p>";
        return;
    }

    pacientesUsuario = pacientes || [];

    if (!pacientesUsuario.length) {
        contenedor.innerHTML = `
            <div style="text-align:center;padding:2rem;color:#525151;">
                <i class="bi bi-person-x"
                   style="font-size:2rem;color:#cbd5e1;"></i>
                <p style="margin-top:1rem;">
                    No tienes pacientes registrados.
                </p>
                <p style="font-size:.9rem;">
                    Agrega un paciente para comenzar.
                </p>
            </div>
        `;
        return;
    }

    await Promise.all(pacientesUsuario.map(async paciente => {

        if (!paciente.avatar) {
            paciente.avatarUrl = AVATAR_DEFAULT;
            return;
        }

        if (paciente.avatar.startsWith("http")) {
            paciente.avatarUrl = paciente.avatar;
            return;
        }

        const { data } = await client.storage
            .from(BUCKET_PACIENTES)
            .createSignedUrl(paciente.avatar, 3600);

        paciente.avatarUrl = data?.signedUrl || AVATAR_DEFAULT;
    }));

    contenedor.innerHTML = "";

    pacientesUsuario.forEach(paciente => {

        let edadTexto = "";

        if (paciente.fecha_nac) {
            const nacimiento = new Date(`${paciente.fecha_nac}T00:00:00`);
            const hoy = new Date();

            let edad = hoy.getFullYear() - nacimiento.getFullYear();

            if (
                hoy.getMonth() < nacimiento.getMonth() ||
                (hoy.getMonth() === nacimiento.getMonth() &&
                    hoy.getDate() < nacimiento.getDate())
            ) {
                edad--;
            }

            edadTexto = edad === 1 ? "1 Año" : `${edad} Años`;
        }

        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta-paciente";

        tarjeta.innerHTML = `
            <img
                src="${paciente.avatarUrl}"
                class="img-paciente"
                alt="Imagen del paciente"
            >

            <div class="nombre-paciente">
                <p class="nombre">
                    ${paciente.nombre} ${paciente.apellido}
                </p>
                <p>${edadTexto}</p>
            </div>

            <i class="bi bi-chevron-right" id="ver-mas"></i>
        `;

        const imagen = tarjeta.querySelector("img");
        imagen.onerror = () => {
            imagen.src = AVATAR_DEFAULT;
        };

        contenedor.appendChild(tarjeta);
    });
}


/* =========================================================
   ABRIR Y CERRAR MODALES
========================================================= */

async function abrirModalCita() {

    const modal = obtenerElemento("modalNuevaCita");
    if (!modal) return;

    modal.style.display = "flex";

    await cargarSelectsModalCita();

    // Regresar el calendario al mes actual.
    const hoy = new Date();
    mesCal = hoy.getMonth();
    anioCal = hoy.getFullYear();

    renderizarCalendario();
    limpiarSeleccionFechaHora();
}

function cerrarModalCita() {

    const modal = obtenerElemento("modalNuevaCita");
    const formulario = obtenerElemento("formNuevaCita");

    if (modal) modal.style.display = "none";
    if (formulario) formulario.reset();

    const feedback = obtenerElemento("feedback-cita");
    if (feedback) feedback.textContent = "";

    const textoFecha = obtenerElemento("texto-fecha-seleccionada");
    if (textoFecha) textoFecha.textContent = "Selecciona una fecha";

    const calendario = obtenerElemento("calendario-flotante");
    if (calendario) calendario.style.display = "none";

    const nuevoPaciente = obtenerElemento("nuevo-paciente-contenedor");
    if (nuevoPaciente) nuevoPaciente.style.display = "none";

    const costo = obtenerElemento("costo-cita-clicitas");
    if (costo) costo.textContent = "$0.00 MXN";

    fechaSeleccionada = null;

    const inputFecha = obtenerElemento("cita-fecha");
    const inputHora = obtenerElemento("cita-hora");

    if (inputFecha) inputFecha.value = "";
    if (inputHora) inputHora.value = "";

    const horarios = obtenerElemento("horarios-contenedor");
    if (horarios) horarios.innerHTML = "";

    renderizarCalendario();
}

function abrirModalPaciente() {

    const modal = obtenerElemento("modalPaciente");
    if (modal) modal.style.display = "flex";

    const fecha = obtenerElemento("pac-fecha");

    if (fecha) {
        fecha.max = fechaLocalYMD(new Date());
    }
}

function cerrarModalPaciente() {

    const modal = obtenerElemento("modalPaciente");
    const formulario = obtenerElemento("formNuevoPaciente");
    const feedback = obtenerElemento("feedback-paciente");

    if (modal) modal.style.display = "none";
    if (formulario) formulario.reset();
    if (feedback) feedback.textContent = "";
}


/* =========================================================
   CARGAR SELECTS DEL MODAL DE CITAS
========================================================= */

async function cargarSelectsModalCita() {

    const selectPacientes = obtenerElemento("cita-paciente");
    const selectServicios = obtenerElemento("cita-servicio");

    if (selectPacientes) {

        const { data: pacientes, error } = await client
            .from("Pacientes")
            .select("id, nombre, apellido")
            .eq("cliente", usuarioActual.id)
            .order("nombre");

        if (error) {
            console.error("Error al cargar pacientes:", error);
            mostrarFeedback("feedback-cita", "No se pudieron cargar los pacientes.");
            return;
        }

        selectPacientes.innerHTML = `
            <option value="" disabled selected>
                Selecciona paciente
            </option>
        `;

        (pacientes || []).forEach(paciente => {
            const option = document.createElement("option");
            option.value = paciente.id;
            option.textContent = `${paciente.nombre} ${paciente.apellido}`;
            selectPacientes.appendChild(option);
        });

        // Opción para agregar un paciente nuevo.
        const opcionNuevo = document.createElement("option");
        opcionNuevo.value = "nuevo";
        opcionNuevo.textContent = "+ Agregar nuevo paciente...";
        selectPacientes.appendChild(opcionNuevo);
    }

    if (selectServicios) {

        const { data: servicios, error } = await client
            .from("Servicios")
            .select("id, nombre, costo")
            .order("nombre");

        if (error) {
            console.error("Error al cargar servicios:", error);
            mostrarFeedback("feedback-cita", "No se pudieron cargar los servicios.");
            return;
        }

        selectServicios.innerHTML = `
            <option value="" disabled selected>
                Selecciona servicio
            </option>
        `;

        (servicios || []).forEach(servicio => {
            const option = document.createElement("option");
            option.value = servicio.id;
            option.dataset.costo = servicio.costo;
            option.textContent = servicio.nombre;
            selectServicios.appendChild(option);
        });
    }

    actualizarCostoCita();
}


/* =========================================================
   NUEVO PACIENTE DESDE EL MODAL DE CITA
========================================================= */

function manejarSeleccionPaciente() {

    const select = obtenerElemento("cita-paciente");
    const contenedor = obtenerElemento("nuevo-paciente-contenedor");

    if (!select || !contenedor) return;

    const esNuevo = select.value === "nuevo";

    contenedor.style.display = esNuevo ? "block" : "none";

    if (esNuevo) {
        obtenerElemento("nuevo-paciente-nombre")?.focus();
    }
}


/* =========================================================
   COSTO DEL SERVICIO
========================================================= */

function actualizarCostoCita() {

    const select = obtenerElemento("cita-servicio");
    const texto = obtenerElemento("costo-cita-clicitas");

    if (!select || !texto) return;

    const opcion = select.options[select.selectedIndex];
    const costo = opcion?.dataset?.costo;

    if (costo !== undefined && costo !== "") {
        texto.textContent = `$${Number(costo).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })} MXN`;
    } else {
        texto.textContent = "$0.00 MXN";
    }
}


/* =========================================================
   CALENDARIO
========================================================= */

async function renderizarCalendario() {

    const grid = obtenerElemento("dias-calendario");
    const titulo = obtenerElemento("mes-año-display");
    const btnAnterior = obtenerElemento("prev-month");

    if (!grid || !titulo) return;

    const nombresMeses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    titulo.textContent = `${nombresMeses[mesCal]} ${anioCal}`;
    grid.innerHTML = "";

    const primerDia = new Date(anioCal, mesCal, 1).getDay();
    const diasMes = new Date(anioCal, mesCal + 1, 0).getDate();
    const desplazamiento = primerDia === 0 ? 6 : primerDia - 1;

    for (let i = 0; i < desplazamiento; i++) {
        grid.appendChild(document.createElement("div"));
    }

    const inicioMes = `${anioCal}-${String(mesCal + 1).padStart(2, "0")}-01`;
    const finMes = `${anioCal}-${String(mesCal + 1).padStart(2, "0")}-${String(diasMes).padStart(2, "0")}`;

    const odontologoId = obtenerElemento("cita-odontologo")?.value;

    let consulta = client
        .from("Citas")
        .select("fecha_hora")
        .gte("fecha_hora", `${inicioMes}T00:00:00`)
        .lte("fecha_hora", `${finMes}T23:59:59`)
        .in("estado", ESTADOS_ACTIVOS);

    if (odontologoId) {
        consulta = consulta.eq("odontologo", Number(odontologoId));
    }

    const { data: citas, error } = await consulta;

    if (error) {
        console.error("Error al consultar disponibilidad del mes:", error);
    }

    const conteoDias = {};

    (citas || []).forEach(cita => {
        const dia = cita.fecha_hora.split("T")[0];
        conteoDias[dia] = (conteoDias[dia] || 0) + 1;
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let dia = 1; dia <= diasMes; dia++) {

        const fecha = new Date(anioCal, mesCal, dia);
        const fechaTexto = fechaLocalYMD(fecha);

        const boton = document.createElement("div");
        boton.className = "cal-day";
        boton.textContent = dia;

        const pasado = fecha < hoy;
        const lleno = (conteoDias[fechaTexto] || 0) >= HORARIOS_CITA.length;

        if (pasado || lleno) {
            boton.classList.add("disabled");

            if (lleno) {
                boton.title = "Día completo";
            }
        } else {

            if (fechaSeleccionada === fechaTexto) {
                boton.classList.add("seleccionado");
            }

            boton.addEventListener("click", () => {
                seleccionarFechaCita(fechaTexto, boton);
            });
        }

        grid.appendChild(boton);
    }

    if (btnAnterior) {
        const mesActual = new Date();
        btnAnterior.disabled =
            anioCal === mesActual.getFullYear() &&
            mesCal === mesActual.getMonth();
    }
}
function posicionarCalendarioFlotante() {

    const boton = obtenerElemento("btn-mostrar-calendario");
    const calendario = obtenerElemento("calendario-flotante");

    if (!boton || !calendario) return;

    const margen = 10;
    const separacion = 8;

    const rect = boton.getBoundingClientRect();

    calendario.style.position = "fixed";
    calendario.style.display = "block";
    calendario.style.margin = "0";

    // Medir el calendario ya visible.
    const ancho = calendario.offsetWidth;
    const alto = calendario.offsetHeight;

    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;

    // Elegir si abre arriba o abajo.
    let top;

    if (espacioAbajo >= alto + separacion) {
        top = rect.bottom + separacion;
    } else if (espacioArriba >= alto + separacion) {
        top = rect.top - alto - separacion;
    } else {
        // Si no cabe completo, usar el lado con más espacio.
        if (espacioAbajo >= espacioArriba) {
            top = rect.bottom + separacion;
        } else {
            top = rect.top - alto - separacion;
        }
    }

    // Evitar que se salga verticalmente.
    top = Math.max(
        margen,
        Math.min(top, window.innerHeight - alto - margen)
    );

    // Alinear horizontalmente con el botón.
    let left = rect.left;

    if (left + ancho > window.innerWidth - margen) {
        left = rect.right - ancho;
    }

    // Evitar que se salga horizontalmente.
    left = Math.max(
        margen,
        Math.min(left, window.innerWidth - ancho - margen)
    );

    calendario.style.top = `${top}px`;
    calendario.style.left = `${left}px`;
}

async function seleccionarFechaCita(fecha, elemento) {

    fechaSeleccionada = fecha;

    document.querySelectorAll(".cal-day").forEach(dia => {
        dia.classList.remove("seleccionado");
    });

    elemento.classList.add("seleccionado");

    const inputFecha = obtenerElemento("cita-fecha");
    const textoFecha = obtenerElemento("texto-fecha-seleccionada");
    const calendario = obtenerElemento("calendario-flotante");

    if (inputFecha) inputFecha.value = fecha;

    if (textoFecha) {
        const [anio, mes, dia] = fecha.split("-");
        textoFecha.textContent = `${dia}/${mes}/${anio}`;
    }

    if (calendario) calendario.style.display = "none";

    const inputHora = obtenerElemento("cita-hora");
    if (inputHora) inputHora.value = "";

    await verificarHorariosOcupados(fecha);
}


/* =========================================================
   CONSULTAR HORARIOS OCUPADOS EN SUPABASE
========================================================= */

async function verificarHorariosOcupados(fecha) {

    const contenedor = obtenerElemento("horarios-contenedor");
    if (!contenedor) return;

    contenedor.innerHTML = "<p>Consultando horarios disponibles...</p>";

    const odontologoId = obtenerElemento("cita-odontologo")?.value;

    // Consultar mediante la función SQL de Supabase
    const { data: citas, error } = await client.rpc(
        "obtener_horarios_ocupados",
        {
            p_fecha: fecha
        }
    );

    if (error) {
        console.error("Error al consultar horarios:", error);

        contenedor.innerHTML = `
            <p style="color:#e74c3c;">
                No se pudieron consultar los horarios.
            </p>
        `;
        return;
    }

    // Filtrar por odontólogo seleccionado, si existe
    const citasFiltradas = (citas || []).filter(cita => {
        if (!odontologoId) return true;

        return Number(cita.odontologo) === Number(odontologoId);
    });

    // Obtener las horas ocupadas
    const horasOcupadas = (citas || []).map(cita => {
        const hora = cita.fecha_hora.split("T")[1];
        return hora ? hora.substring(0, 8) : "";
    });

    console.log("Citas recibidas desde Supabase:", citas);
    console.log("Horarios ocupados detectados:", horasOcupadas);
    contenedor.innerHTML = "";

    // Crear botones de horarios
    HORARIOS_CITA.forEach(horario => {

        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn-hora";
        boton.textContent = horario.texto;

        const ocupado = horasOcupadas.includes(horario.valor);

        if (ocupado) {

            boton.disabled = true;
            boton.classList.add("ocupado");
            boton.title = "Horario ocupado";

        } else {

            boton.addEventListener("click", () => {
                seleccionarHoraCita(horario.valor, boton);
            });

        }

        contenedor.appendChild(boton);
    });

    // Mostrar mensaje si no hay horarios disponibles
    if (!HORARIOS_CITA.some(h => !horasOcupadas.includes(h.valor))) {

        contenedor.innerHTML += `
            <p style="width:100%;text-align:center;color:#64748b;">
                Ya no hay horarios disponibles para este día.
            </p>
        `;
    }
}


function seleccionarHoraCita(hora, boton) {

    document.querySelectorAll(".btn-hora").forEach(elemento => {
        elemento.classList.remove("seleccionada");
    });

    boton.classList.add("seleccionada");

    const inputHora = obtenerElemento("cita-hora");
    if (inputHora) inputHora.value = hora;
}


function limpiarSeleccionFechaHora() {

    fechaSeleccionada = null;

    const inputFecha = obtenerElemento("cita-fecha");
    const inputHora = obtenerElemento("cita-hora");
    const textoFecha = obtenerElemento("texto-fecha-seleccionada");
    const horarios = obtenerElemento("horarios-contenedor");

    if (inputFecha) inputFecha.value = "";
    if (inputHora) inputHora.value = "";

    if (textoFecha) {
        textoFecha.textContent = "Selecciona una fecha";
    }

    if (horarios) horarios.innerHTML = "";

    document.querySelectorAll(".cal-day").forEach(dia => {
        dia.classList.remove("seleccionado");
    });
}


/* =========================================================
   GUARDAR CITA
========================================================= */
async function guardarCita(e) {

    e.preventDefault();

    const boton = obtenerElemento("btnConfirmarCita");

    const selectPaciente = obtenerElemento("cita-paciente");
    const servicioId = obtenerElemento("cita-servicio")?.value;
    const odontologoId = obtenerElemento("cita-odontologo")?.value;
    const fecha = obtenerElemento("cita-fecha")?.value;
    const hora = obtenerElemento("cita-hora")?.value;

    const esPacienteNuevo = selectPaciente?.value === "nuevo";

    const nombreNuevo = obtenerElemento("nuevo-paciente-nombre")?.value.trim();
    const apellidoNuevo = obtenerElemento("nuevo-paciente-apellido")?.value.trim();
    const fechaNacNueva = obtenerElemento("nuevo-paciente-fecha")?.value;
    const sexoNuevo = obtenerElemento("nuevo-paciente-sexo")?.value;

    if (
        !selectPaciente?.value ||
        !servicioId ||
        !odontologoId ||
        !fecha ||
        !hora
    ) {
        mostrarFeedback(
            "feedback-cita",
            "Completa los campos y selecciona una fecha y horario."
        );
        return;
    }

    if (esPacienteNuevo) {

        if (!nombreNuevo || !apellidoNuevo) {
            mostrarFeedback("feedback-cita", "Escribe el nombre y apellido del paciente.");
            return;
        }

        if (!fechaNacNueva || !sexoNuevo) {
            mostrarFeedback(
                "feedback-cita",
                "Selecciona la fecha de nacimiento y el sexo del paciente."
            );
            return;
        }

        if (new Date(`${fechaNacNueva}T00:00:00`) > new Date()) {
            mostrarFeedback("feedback-cita", "La fecha de nacimiento no puede ser futura.");
            return;
        }
    }

    if (fechaEsPasada(new Date(`${fecha}T00:00:00`))) {
        mostrarFeedback("feedback-cita", "No puedes seleccionar una fecha pasada.");
        return;
    }

    try {

        if (boton) boton.disabled = true;

        mostrarFeedback("feedback-cita", "Verificando disponibilidad...", "info");

        // Comprobar nuevamente que el horario no esté ocupado.
        const { data: ocupadas, error: errorDisponibilidad } = await client
            .from("Citas")
            .select("id")
            .eq("odontologo", Number(odontologoId))
            .eq("fecha_hora", `${fecha}T${hora}`)
            .in("estado", ESTADOS_ACTIVOS);

        if (errorDisponibilidad) throw errorDisponibilidad;

        if (ocupadas?.length) {
            mostrarFeedback(
                "feedback-cita",
                "Ese horario acaba de ocuparse. Selecciona otro."
            );

            await verificarHorariosOcupados(fecha);
            return;
        }

        let pacienteId = selectPaciente.value;

        // Crear paciente nuevo si se seleccionó esa opción.
        if (esPacienteNuevo) {

            const conservar =
                obtenerElemento("conservar-paciente")?.checked ?? true;

            mostrarFeedback("feedback-cita", "Registrando paciente...", "info");

            const { data: pacienteCreado, error: errorPaciente } = await client
                .from("Pacientes")
                .insert({
                    nombre: nombreNuevo,
                    apellido: apellidoNuevo,
                    fecha_nac: fechaNacNueva,
                    sexo: sexoNuevo,
                    cliente: conservar ? usuarioActual.id : null
                })
                .select("id")
                .single();

            if (errorPaciente) throw errorPaciente;

            pacienteId = pacienteCreado.id;
        }

        // Evitar que el mismo paciente tenga otra cita activa ese día.
        const { data: citasPaciente, error: errorPacienteCitas } = await client
            .from("Citas")
            .select("id")
            .eq("paciente", Number(pacienteId))
            .gte("fecha_hora", `${fecha}T00:00:00`)
            .lte("fecha_hora", `${fecha}T23:59:59`)
            .in("estado", ESTADOS_ACTIVOS);

        if (errorPacienteCitas) throw errorPacienteCitas;

        if (citasPaciente?.length) {
            mostrarFeedback(
                "feedback-cita",
                "Este paciente ya tiene una cita activa para ese día."
            );
            return;
        }

        mostrarFeedback("feedback-cita", "Agendando cita...", "info");

        const { error: errorCita } = await client
            .from("Citas")
            .insert({
                fecha_hora: `${fecha}T${hora}`,
                estado: "PENDIENTE",
                paciente: Number(pacienteId),
                odontologo: Number(odontologoId),
                servicio: Number(servicioId)
            });

        if (errorCita) throw errorCita;

        mostrarFeedback("feedback-cita", "¡Cita agendada exitosamente!", "exito");

        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {

        console.error("Error al agendar cita:", error);

        mostrarFeedback(
            "feedback-cita",
            "No se pudo agendar la cita: " + (error.message || "Error desconocido.")
        );

    } finally {
        if (boton) boton.disabled = false;
    }
}

/* =========================================================
   REGISTRO NORMAL DE PACIENTES
========================================================= */

async function guardarPaciente(e) {

    e.preventDefault();

    const boton = obtenerElemento("btnGuardarPaciente");

    const nombre = obtenerElemento("pac-nombre")?.value.trim();
    const apellido = obtenerElemento("pac-apellido")?.value.trim();
    const fechaNac = obtenerElemento("pac-fecha")?.value;
    const sexo = obtenerElemento("pac-sexo")?.value;

    if (!nombre || !apellido || !fechaNac || !sexo) {
        mostrarFeedback("feedback-paciente", "Completa todos los campos.");
        return;
    }

    try {

        if (boton) boton.disabled = true;

        mostrarFeedback("feedback-paciente", "Guardando paciente...", "info");

        const { error } = await client
            .from("Pacientes")
            .insert({
                nombre,
                apellido,
                fecha_nac: fechaNac,
                sexo,
                cliente: usuarioActual.id
            });

        if (error) throw error;

        mostrarFeedback("feedback-paciente", "¡Paciente registrado con éxito!", "exito");

        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error("Error al guardar paciente:", error);
        mostrarFeedback("feedback-paciente", "Error al guardar: " + error.message);

    } finally {
        if (boton) boton.disabled = false;
    }
}


/* =========================================================
   SELECTORES DE FECHA DE NACIMIENTO
========================================================= */
function configurarFechaNacimiento() {

    const formularios = [
        {
            anio: "pac-fecha-anio",
            mes: "pac-fecha-mes",
            dia: "pac-fecha-dia",
            fecha: "pac-fecha"
        },
        {
            anio: "nuevo-paciente-fecha-anio",
            mes: "nuevo-paciente-fecha-mes",
            dia: "nuevo-paciente-fecha-dia",
            fecha: "nuevo-paciente-fecha"
        }
    ];

    formularios.forEach(ids => {

        const anioSelect = obtenerElemento(ids.anio);
        const mesSelect = obtenerElemento(ids.mes);
        const diaSelect = obtenerElemento(ids.dia);
        const fechaOculta = obtenerElemento(ids.fecha);

        if (!anioSelect || !mesSelect || !diaSelect || !fechaOculta) return;

        // Generar años una sola vez.
        if (anioSelect.options.length <= 1) {

            const anioActual = new Date().getFullYear();

            for (let anio = anioActual; anio >= anioActual - 100; anio--) {

                const option = document.createElement("option");
                option.value = anio;
                option.textContent = anio;

                anioSelect.appendChild(option);
            }
        }

        function actualizarFecha() {

            const anio = Number(anioSelect.value);
            const mes = Number(mesSelect.value);
            const dia = Number(diaSelect.value);

            fechaOculta.value = "";

            if (!anio || !mes || !dia) return;

            const fecha = new Date(anio, mes - 1, dia);
            const hoy = new Date();

            hoy.setHours(0, 0, 0, 0);

            // Comprobar que la fecha exista realmente.
            if (
                fecha.getFullYear() !== anio ||
                fecha.getMonth() !== mes - 1 ||
                fecha.getDate() !== dia ||
                fecha > hoy
            ) {
                diaSelect.value = "";
                return;
            }

            fechaOculta.value =
                `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        }

        function actualizarDias() {

            const anio = Number(anioSelect.value);
            const mes = Number(mesSelect.value);

            diaSelect.innerHTML = '<option value="">Día</option>';
            fechaOculta.value = "";

            if (!anio || !mes) return;

            let totalDias = new Date(anio, mes, 0).getDate();

            const hoy = new Date();

            if (
                anio === hoy.getFullYear() &&
                mes === hoy.getMonth() + 1
            ) {
                totalDias = Math.min(totalDias, hoy.getDate());
            } else if (
                anio === hoy.getFullYear() &&
                mes > hoy.getMonth() + 1
            ) {
                totalDias = 0;
            }

            for (let dia = 1; dia <= totalDias; dia++) {

                const option = document.createElement("option");
                option.value = String(dia).padStart(2, "0");
                option.textContent = dia;

                diaSelect.appendChild(option);
            }
        }

        anioSelect.addEventListener("change", actualizarDias);
        mesSelect.addEventListener("change", actualizarDias);
        diaSelect.addEventListener("change", actualizarFecha);
    });
}