
/* =========================================================
   AGENDA EXCLUSIVA DEL ODONTÓLOGO
   - Consulta únicamente sus propias citas.
   - No permite crear, modificar ni cancelar citas.
   - Permite imprimir comprobantes.
========================================================= */

let citasOdontologoCache = [];
let pacientesOdontologoCache = [];
let serviciosOdontologoCache = [];

let fechaAgendaOdontologo = new Date();


// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function fechaLocalOdontologo(fecha) {

    const f = new Date(fecha);

    const anio = f.getFullYear();
    const mes = String(f.getMonth() + 1).padStart(2, "0");
    const dia = String(f.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}


function horaLocalOdontologo(fecha) {

    if (!fecha) return "";

    const coincidencia = String(fecha).match(/T(\d{2}):(\d{2})/);

    if (!coincidencia) return "";

    return `${coincidencia[1]}:${coincidencia[2]}`;
}


function normalizarTextoOdontologo(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


function crearElementoOdontologo(etiqueta, clase, texto) {

    const elemento = document.createElement(etiqueta);

    if (clase) elemento.className = clase;

    if (texto !== undefined) elemento.textContent = texto;

    return elemento;

}


function escaparHTMLOdontologo(texto) {

    return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);

}


// ==========================================
// FOTOGRAFÍA DEL PACIENTE
// ==========================================

async function obtenerFotoPacienteOdontologo(avatar) {

    if (!avatar) return null;

    if (avatar.startsWith("http")) {

        try {

            const url = new URL(avatar);

            const marcador = "/avatares_pacientes/";

            const posicion = url.pathname.indexOf(marcador);

            if (posicion === -1) return avatar;

            avatar = decodeURIComponent(
                url.pathname.substring(posicion + marcador.length)
            );

        } catch (error) {

            console.error("Error procesando fotografía:", error);

            return null;

        }

    }

    const { data, error } = await client.storage
        .from("avatares_pacientes")
        .createSignedUrl(avatar, 3600);

    if (error) {

        console.error("Error obteniendo fotografía:", error);

        return null;

    }

    return data.signedUrl;

}


// ==========================================
// CARGAR CITAS DEL ODONTÓLOGO
// ==========================================

async function inicializarAgendaOdontologo() {

    const lista = document.getElementById("lista-citas-agenda");

    const filtroServicio = document.getElementById("filtro-servicio-citas");

    if (!lista || !filtroServicio) return;

    lista.textContent = "Cargando tus citas...";

    try {

        // Esperar a que seguridadOdontologo.js termine
        const contexto = await window.odontologoAccessReady;

        if (!contexto) return;

        const odontologoId = contexto.odontologoId;

        console.log("Consultando citas del odontólogo:", odontologoId);

        // 1. CONSULTAR EXCLUSIVAMENTE SUS CITAS
        const { data: citas, error: errorCitas } = await client
            .from("Citas")
            .select("id, fecha_hora, estado, paciente, servicio, odontologo")
            .eq("odontologo", odontologoId)
            .order("fecha_hora", { ascending: true });

        if (errorCitas) throw errorCitas;

        citasOdontologoCache = citas || [];

        // 2. OBTENER LOS IDS DE LOS PACIENTES RELACIONADOS
        const idsPacientes = [
            ...new Set(citasOdontologoCache.map(c => c.paciente))
        ];

        // 3. CONSULTAR PACIENTES
        if (idsPacientes.length > 0) {

            const { data: pacientes, error: errorPacientes } = await client
                .from("Pacientes")
                .select("id, nombre, apellido, avatar")
                .in("id", idsPacientes);

            if (errorPacientes) throw errorPacientes;

            pacientesOdontologoCache = pacientes || [];

        } else {

            pacientesOdontologoCache = [];

        }

        // 4. CONSULTAR SERVICIOS
        const { data: servicios, error: errorServicios } = await client
            .from("Servicios")
            .select("id, nombre, costo")
            .order("nombre", { ascending: true });

        if (errorServicios) throw errorServicios;

        serviciosOdontologoCache = servicios || [];

        // 5. OBTENER FOTOGRAFÍAS
        pacientesOdontologoCache = await Promise.all(

            pacientesOdontologoCache.map(async paciente => ({

                ...paciente,

                avatarUrl: await obtenerFotoPacienteOdontologo(
                    paciente.avatar
                )

            }))

        );

        // 6. LLENAR FILTRO DE SERVICIOS
        filtroServicio.innerHTML =
            '<option value="">Todos los servicios</option>';

        serviciosOdontologoCache.forEach(servicio => {

            const opcion = document.createElement("option");

            opcion.value = servicio.id;

            opcion.textContent = servicio.nombre;

            filtroServicio.appendChild(opcion);

        });

        // 7. MOSTRAR CITAS DEL DÍA
        actualizarCitasVisiblesOdontologo(new Date());

        console.log("Agenda del odontólogo cargada correctamente.");

    } catch (error) {

        console.error("Error cargando agenda del odontólogo:", error);

        lista.textContent = "No se pudieron cargar tus citas.";

        const contador = document.getElementById("contador-citas-agenda");

        if (contador) contador.textContent = "Error al consultar";

    }

}


// ==========================================
// MOSTRAR CITAS DEL DÍA
// ==========================================

function actualizarCitasVisiblesOdontologo(fecha) {

    const lista = document.getElementById("lista-citas-agenda");

    const contador = document.getElementById("contador-citas-agenda");

    const filtroServicio = document.getElementById("filtro-servicio-citas");

    const buscador = document.getElementById("buscar-paciente");

    if (!lista) return;

    fechaAgendaOdontologo = new Date(fecha);

    const fechaBuscada = fechaLocalOdontologo(fechaAgendaOdontologo);

    const servicioSeleccionado = filtroServicio?.value || "";

    const busqueda = normalizarTextoOdontologo(
        buscador?.value || ""
    );

    // FILTRAR CITAS
    const citasFiltradas = citasOdontologoCache

        .filter(cita => {

            if (!cita.fecha_hora) return false;

            if (
                fechaLocalOdontologo(cita.fecha_hora) !== fechaBuscada
            ) return false;

            if (
                servicioSeleccionado &&
                String(cita.servicio) !== String(servicioSeleccionado)
            ) return false;

            const paciente = pacientesOdontologoCache.find(
                p => String(p.id) === String(cita.paciente)
            );

            const servicio = serviciosOdontologoCache.find(
                s => String(s.id) === String(cita.servicio)
            );

            const nombrePaciente = paciente
                ? `${paciente.nombre || ""} ${paciente.apellido || ""}`
                : "Paciente no encontrado";

            const nombreServicio = servicio
                ? servicio.nombre
                : "Servicio no encontrado";

            if (busqueda) {

                const coincide =

                    normalizarTextoOdontologo(nombrePaciente).includes(busqueda) ||

                    normalizarTextoOdontologo(nombreServicio).includes(busqueda) ||

                    String(cita.id).includes(busqueda);

                if (!coincide) return false;

            }

            return true;

        })

        .sort((a, b) =>
            new Date(a.fecha_hora) - new Date(b.fecha_hora)
        );


    // CONTADOR
    if (contador) {

        contador.textContent =
            `${citasFiltradas.length} ${
                citasFiltradas.length === 1
                    ? "cita encontrada"
                    : "citas encontradas"
            }`;

    }

    lista.innerHTML = "";


    // SIN CITAS
    if (citasFiltradas.length === 0) {

        const mensaje = crearElementoOdontologo(
            "p",
            "",
            "No tienes citas que coincidan con los filtros seleccionados."
        );

        mensaje.style.textAlign = "center";
        mensaje.style.padding = "25px 15px";
        mensaje.style.color = "#777";

        lista.appendChild(mensaje);

        return;

    }


    // CREAR TARJETAS
    citasFiltradas.forEach(cita => {

        const paciente = pacientesOdontologoCache.find(
            p => String(p.id) === String(cita.paciente)
        );

        const servicio = serviciosOdontologoCache.find(
            s => String(s.id) === String(cita.servicio)
        );

        const nombrePaciente = paciente
            ? `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim()
            : "Paciente no encontrado";

        const nombreServicio = servicio
            ? servicio.nombre
            : "Servicio no encontrado";

        const horaInicio = horaLocalOdontologo(cita.fecha_hora);

        // Duración visual de 30 minutos, igual que la agenda administrativa
        const partesHora = String(cita.fecha_hora).match(/T(\d{2}):(\d{2})/);

        let horaFin = "";

        if (partesHora) {

            let minutos =
                parseInt(partesHora[1]) * 60 +
                parseInt(partesHora[2]) + 30;

            minutos %= 24 * 60;

            horaFin =
                `${String(Math.floor(minutos / 60)).padStart(2, "0")}:` +
                `${String(minutos % 60).padStart(2, "0")}`;

        }

        const iniciales = nombrePaciente
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(p => p.charAt(0).toUpperCase())
            .join("");

        const estado = String(cita.estado || "PENDIENTE").toUpperCase();

        const clasesEstado = {

            PENDIENTE: "pendiente",
            CONFIRMADA: "confirmada",
            CANCELADA: "cancelada",
            TERMINADA: "terminada"

        };

        const claseEstado = clasesEstado[estado] || "pendiente";


        // TARJETA
        const tarjeta = crearElementoOdontologo(
            "div",
            "citas-pacientes"
        );

        const bloqueHoraPaciente = crearElementoOdontologo(
            "div",
            "hora-paciente"
        );

        const bloqueHora = crearElementoOdontologo("div", "hora");

        bloqueHora.append(
            crearElementoOdontologo("p", "titulo", horaInicio),
            crearElementoOdontologo("p", "", horaFin)
        );

        const separador = crearElementoOdontologo(
            "hr",
            "separador-vertical"
        );

        const bloquePaciente = crearElementoOdontologo(
            "div",
            "paciente"
        );

        const foto = crearElementoOdontologo(
            "div",
            "foto-paciente"
        );

        if (paciente?.avatarUrl) {

            const imagen = document.createElement("img");

            imagen.src = paciente.avatarUrl;

            imagen.alt = `Foto de ${nombrePaciente}`;

            imagen.className = "imagen-paciente-agenda";

            imagen.onerror = () => {

                imagen.remove();

                foto.innerHTML = "";

                foto.appendChild(
                    crearElementoOdontologo("p", "", iniciales || "P")
                );

            };

            foto.appendChild(imagen);

        } else {

            foto.appendChild(
                crearElementoOdontologo("p", "", iniciales || "P")
            );

        }

        const datos = crearElementoOdontologo(
            "div",
            "nombre-servicio"
        );

        datos.append(
            crearElementoOdontologo("p", "titulo", nombrePaciente),
            crearElementoOdontologo("p", "", nombreServicio)
        );

        bloquePaciente.append(foto, datos);

        bloqueHoraPaciente.append(
            bloqueHora,
            separador,
            bloquePaciente
        );


        // ESTADO
        const bloqueEstado = crearElementoOdontologo(
            "div",
            "estado-info"
        );

        const botonEstado = crearElementoOdontologo(
            "button",
            `btn estado ${claseEstado}`,
            estado
        );

        botonEstado.type = "button";
        botonEstado.disabled = true;

        bloqueEstado.appendChild(botonEstado);


        // ==========================================
        // ÚNICA ACCIÓN: IMPRIMIR COMPROBANTE
        // ==========================================

        const menuAcciones = document.createElement("div");

        menuAcciones.className = "menu-acciones-cita-admin";

        const btnMenu = document.createElement("button");

        btnMenu.type = "button";

        btnMenu.className = "btn-menu-cita-admin";

        btnMenu.innerHTML =
            '<i class="bi bi-three-dots-vertical"></i>';

        btnMenu.setAttribute(
            "aria-label",
            "Opciones de la cita"
        );

        const opcionesMenu = document.createElement("div");

        opcionesMenu.className =
            "opciones-menu-cita-admin menu-flotante-admin";

        const btnComprobante = document.createElement("button");

        btnComprobante.type = "button";

        btnComprobante.innerHTML =
            '<i class="bi bi-file-earmark-pdf"></i> Imprimir comprobante';


        btnMenu.addEventListener("click", e => {

            e.stopPropagation();

            const estabaAbierto =
                opcionesMenu.classList.contains("abierto");

            cerrarMenusCitasOdontologo();

            if (estabaAbierto) return;

            document.body.appendChild(opcionesMenu);

            opcionesMenu.style.visibility = "hidden";

            opcionesMenu.classList.add("abierto");

            const rect = btnMenu.getBoundingClientRect();

            const alto = opcionesMenu.offsetHeight;

            const ancho = opcionesMenu.offsetWidth;

            const espacioAbajo = window.innerHeight - rect.bottom;

            const top = espacioAbajo >= alto + 10
                ? rect.bottom + 6
                : Math.max(10, rect.top - alto - 6);

            const left = Math.max(
                10,
                Math.min(
                    rect.right - ancho,
                    window.innerWidth - ancho - 10
                )
            );

            opcionesMenu.style.position = "fixed";

            opcionesMenu.style.top = `${top}px`;

            opcionesMenu.style.left = `${left}px`;

            opcionesMenu.style.right = "auto";

            opcionesMenu.style.zIndex = "100000";

            opcionesMenu.style.visibility = "visible";

        });


        btnComprobante.addEventListener("click", e => {

            e.stopPropagation();

            opcionesMenu.classList.remove("abierto");

            const paciente = pacientesOdontologoCache.find(
                p => String(p.id) === String(cita.paciente)
            );

            const servicio = serviciosOdontologoCache.find(
                s => String(s.id) === String(cita.servicio)
            );

            const usuario = window.odontologoActual?.usuario;

            const nombreOdontologo = usuario
                ? `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim()
                : "Odontólogo";

            const nombrePaciente = paciente
                ? `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim()
                : "Paciente no encontrado";

            const fecha = new Date(cita.fecha_hora);

            const fechaTexto = fecha.toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            });

            const horaTexto = fecha.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });

            window.imprimirComprobanteOdontologo(cita, {
                paciente: nombrePaciente,
                odontologo: nombreOdontologo,
                servicio: servicio?.nombre || "No especificado",
                fecha: fechaTexto,
                hora: horaTexto,
                costo: servicio?.costo || 0
            });

        });


        opcionesMenu.appendChild(btnComprobante);

        menuAcciones.appendChild(btnMenu);

        bloqueEstado.appendChild(menuAcciones);

        tarjeta.append(bloqueHoraPaciente, bloqueEstado);

        lista.appendChild(tarjeta);

    });

}


// ==========================================
// CERRAR MENÚS DE ACCIONES
// ==========================================

function cerrarMenusCitasOdontologo() {

    document.querySelectorAll(
        ".opciones-menu-cita-admin.abierto"
    ).forEach(menu => {

        menu.classList.remove("abierto");

    });

}

document.addEventListener("click", cerrarMenusCitasOdontologo);

window.addEventListener("scroll", cerrarMenusCitasOdontologo, true);

window.addEventListener("resize", cerrarMenusCitasOdontologo);


// El comprobante se genera desde comprobante.js compartido.


// ==========================================
// CONEXIÓN CON dashCitas.js
// ==========================================

window.actualizarCitasVisibles =
    actualizarCitasVisiblesOdontologo;


// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    const filtroServicio = document.getElementById(
        "filtro-servicio-citas"
    );

    const buscador = document.getElementById(
        "buscar-paciente"
    );

    const limpiarBusqueda = document.getElementById(
        "limpiar-busqueda"
    );

    filtroServicio?.addEventListener("change", () => {

        actualizarCitasVisiblesOdontologo(
            fechaAgendaOdontologo
        );

    });

    buscador?.addEventListener("input", () => {

        actualizarCitasVisiblesOdontologo(
            fechaAgendaOdontologo
        );

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

        actualizarCitasVisiblesOdontologo(
            fechaAgendaOdontologo
        );

    });

    await inicializarAgendaOdontologo();

});
