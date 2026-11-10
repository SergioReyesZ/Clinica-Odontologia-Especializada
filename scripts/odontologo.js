
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

            imprimirComprobanteOdontologo(cita);

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


// ==========================================
// COMPROBANTE DE CITA
// ==========================================

function imprimirComprobanteOdontologo(cita) {

    const ventana = window.open("", "_blank");

    if (!ventana) {

        alert(
            "El navegador bloqueó la ventana del comprobante. Permite las ventanas emergentes para este sitio."
        );

        return;

    }

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

    const nombreServicio = servicio?.nombre || "No especificado";

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

    const costo = Number(servicio?.costo || 0).toLocaleString(
        "es-MX",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

    const logo = new URL(
        "iconos/logo.png",
        window.location.href
    ).href;

    const datos = {
        id: escaparHTMLOdontologo(cita.id),
        paciente: escaparHTMLOdontologo(nombrePaciente),
        odontologo: escaparHTMLOdontologo(nombreOdontologo),
        servicio: escaparHTMLOdontologo(nombreServicio),
        fecha: escaparHTMLOdontologo(fechaTexto),
        hora: escaparHTMLOdontologo(horaTexto),
        estado: escaparHTMLOdontologo(cita.estado),
        costo
    };

    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">

            <title>Comprobante de cita</title>

            <style>

                @page {
                    size: letter;
                    margin: 10mm 15mm;
                }

                body {
                    font-family: Arial, sans-serif;
                    color: #333;
                    max-width: 100%;
                    line-height: 1.5;
                    font-size: 13px;
                    margin: 0 auto;
                }

                .header {
                    text-align: center;
                    border-bottom: 2px solid #0056e0;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }

                .header img {
                    width: 100px;
                }

                .header h2 {
                    color: #0056e0;
                    margin: 5px 0;
                }

                .header p {
                    margin: 3px 0;
                    color: #555;
                }

                .titulo {
                    margin-top: 15px;
                    font-size: 18px;
                    font-weight: bold;
                }

                .details {
                    background: #f8fafc;
                    padding: 18px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }

                .details p {
                    padding-bottom: 9px;
                    border-bottom: 1px dashed #cbd5e1;
                }

                .details p:last-child {
                    border: none;
                }

                .costo {
                    text-align: center;
                    background: #eff6ff;
                    color: #0056e0;
                    font-size: 22px;
                    font-weight: bold;
                    padding: 18px;
                    margin-top: 20px;
                    border-radius: 8px;
                }

                .costo small {
                    display: block;
                    font-size: 12px;
                    color: #64748b;
                    font-weight: normal;
                }

                .footer {
                    text-align: center;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 15px;
                    margin-top: 25px;
                }

                .btn-print {
                    display: block;
                    width: 100%;
                    padding: 12px;
                    margin-top: 20px;
                    background: #0056e0;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                }

                @media print {
                    .btn-print {
                        display: none;
                    }
                }

            </style>
        </head>

        <body>

            <div class="header">

                <img src="${logo}" alt="Logo">

                <h2>Odontología Especializada</h2>

                <p>Jesús Elías Piña #1003, Col. Del Pueblo</p>

                <p>Tampico, Tamaulipas, C.P. 89190</p>

                <p>Tel: 833 695 7177 | hola@odontologia.com</p>

                <div class="titulo">
                    COMPROBANTE DE CITA
                </div>

            </div>

            <div class="details">

                <p><strong>Folio:</strong> #${datos.id}</p>

                <p><strong>Paciente:</strong> ${datos.paciente}</p>

                <p><strong>Odontólogo:</strong> ${datos.odontologo}</p>

                <p><strong>Servicio:</strong> ${datos.servicio}</p>

                <p><strong>Fecha:</strong> ${datos.fecha}</p>

                <p><strong>Hora:</strong> ${datos.hora}</p>

                <p><strong>Estado:</strong> ${datos.estado}</p>

            </div>

            <div class="costo">

                <small>Costo del servicio</small>

                $${datos.costo} MXN

            </div>

            <div class="footer">

                Generado desde el Portal de Odontología Especializada.

            </div>

            <button class="btn-print" onclick="window.print()">
                Imprimir / Guardar como PDF
            </button>

        </body>
        </html>
    `);

    ventana.document.close();

    ventana.onload = () => {

        setTimeout(() => {

            ventana.focus();

            ventana.print();

        }, 500);

    };

}


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
