
/* =====================================================
   MIS PACIENTES
   Supabase Auth + Pacientes + Storage
   Bucket: avatares_pacientes
===================================================== */

const BUCKET_PACIENTES = "avatares_pacientes";
const AVATAR_PREDETERMINADO = "../iconos/perfil.png";

let usuarioActual = null;
let listaPacientes = [];
let archivoAvatar = null;
let previewTemporal = null;

// =====================================================
// INICIALIZACIÓN
// =====================================================

document.addEventListener("DOMContentLoaded", iniciarPacientes);

async function iniciarPacientes() {
    try {
        // Verificar que Supabase esté inicializado en app.js
        if (typeof client === "undefined") {
            throw new Error("No se encontró la conexión con Supabase.");
        }

        // Obtener usuario autenticado
        const { data, error } = await client.auth.getUser();

        if (error || !data.user) {
            window.location.href = "../index.html";
            return;
        }

        usuarioActual = data.user;

        configurarFechas();
        configurarEventos();

        await cargarPacientes();

    } catch (error) {
        console.error("Error al iniciar pacientes:", error);
        mostrarMensajeGrid("Error al cargar los pacientes: " + error.message);
    } finally {
        document.querySelector(".contenedor-principal")
            ?.classList.remove("cargando");
    }
}


// =====================================================
// CONFIGURAR FECHAS DEL FORMULARIO
// =====================================================

function configurarFechas() {

    const dia = document.getElementById("pac-fecha-dia");
    const anio = document.getElementById("pac-fecha-anio");
    const mes = document.getElementById("pac-fecha-mes");

    if (!dia || !anio || !mes) return;

    dia.innerHTML = '<option value="">Día</option>';

    for (let i = 1; i <= 31; i++) {
        dia.innerHTML += `<option value="${String(i).padStart(2, "0")}">${i}</option>`;
    }

    anio.innerHTML = '<option value="">Año</option>';

    const actual = new Date().getFullYear();

    for (let i = actual; i >= actual - 100; i--) {
        anio.innerHTML += `<option value="${i}">${i}</option>`;
    }

    [dia, mes, anio].forEach(elemento => {
        elemento.addEventListener("change", construirFecha);
    });
}


function construirFecha() {

    const dia = document.getElementById("pac-fecha-dia").value;
    const mes = document.getElementById("pac-fecha-mes").value;
    const anio = document.getElementById("pac-fecha-anio").value;

    const campoFecha = document.getElementById("pac-fecha");

    campoFecha.value = "";

    if (!dia || !mes || !anio) return;

    const fecha = new Date(
        Number(anio),
        Number(mes) - 1,
        Number(dia)
    );

    // Evitar fechas inexistentes como 31 de febrero.
    if (
        fecha.getFullYear() !== Number(anio) ||
        fecha.getMonth() !== Number(mes) - 1 ||
        fecha.getDate() !== Number(dia)
    ) {
        return;
    }

    campoFecha.value =
        `${anio}-${mes}-${dia}`;
}


// =====================================================
// CONFIGURAR EVENTOS
// =====================================================

function configurarEventos() {

    document.getElementById("formNuevoPaciente")
        ?.addEventListener("submit", registrarPaciente);

    document.getElementById("formEditarPaciente")
        ?.addEventListener("submit", actualizarPaciente);

    document.getElementById("inputAvatarPaciente")
        ?.addEventListener("change", previsualizarAvatar);

    document.getElementById("btnCerrarSesion")
        ?.addEventListener("click", cerrarSesion);
}


// =====================================================
// CERRAR SESIÓN
// =====================================================

async function cerrarSesion(e) {

    e.preventDefault();

    const { error } = await client.auth.signOut();

    if (error) {
        alert("No se pudo cerrar la sesión.");
        console.error(error);
        return;
    }

    window.location.href = "../index.html";
}


// =====================================================
// CARGAR PACIENTES DESDE SUPABASE
// =====================================================

async function cargarPacientes() {

    const contenedor =
        document.getElementById("grid-pacientes-contenedor");

    contenedor.innerHTML = `
        <p style="text-align:center;grid-column:1/-1">
            Cargando pacientes...
        </p>
    `;

    const { data, error } = await client
        .from("Pacientes")
        .select("*")
        .eq("cliente", usuarioActual.id)
        .order("id", { ascending: false });

    if (error) {
        console.error("Error consultando pacientes:", error);
        throw error;
    }

    listaPacientes = data || [];

    // Obtener URLs temporales de las fotografías.
    await Promise.all(
        listaPacientes.map(async paciente => {
            paciente.avatarUrl =
                await obtenerAvatar(paciente.avatar);
        })
    );

    mostrarPacientes();
}


// =====================================================
// OBTENER FOTOGRAFÍA DEL BUCKET PRIVADO
// =====================================================

async function obtenerAvatar(ruta) {

    if (!ruta) return AVATAR_PREDETERMINADO;

    // Si es una URL antigua, intentar recuperar su ruta.
    if (ruta.startsWith("http")) {

        try {
            const url = new URL(ruta);

            const marcador =
                `/storage/v1/object/sign/${BUCKET_PACIENTES}/`;

            const marcadorPublico =
                `/storage/v1/object/public/${BUCKET_PACIENTES}/`;

            if (url.pathname.includes(marcador)) {
                ruta = decodeURIComponent(
                    url.pathname.split(marcador)[1]
                );
            } else if (url.pathname.includes(marcadorPublico)) {
                ruta = decodeURIComponent(
                    url.pathname.split(marcadorPublico)[1]
                );
            } else {
                return ruta;
            }

        } catch {
            return AVATAR_PREDETERMINADO;
        }
    }

    const { data, error } = await client.storage
        .from(BUCKET_PACIENTES)
        .createSignedUrl(ruta, 3600);

    if (error) {
        console.error("Error obteniendo fotografía:", error);
        return AVATAR_PREDETERMINADO;
    }

    return data.signedUrl;
}


// =====================================================
// MOSTRAR PACIENTES EN TARJETAS
// =====================================================

function mostrarPacientes() {

    const contenedor =
        document.getElementById("grid-pacientes-contenedor");

    contenedor.innerHTML = "";

    if (listaPacientes.length === 0) {

        contenedor.innerHTML = `
            <div style="
                grid-column:1/-1;
                text-align:center;
                padding:3rem;
                color:#64748b;
            ">
                <i class="bi bi-people"
                   style="font-size:3rem"></i>

                <h3>No tienes pacientes registrados</h3>

                <p>Agrega un paciente para comenzar.</p>
            </div>
        `;

        return;
    }

    listaPacientes.forEach(paciente => {

        const tarjeta = document.createElement("div");

        tarjeta.className = "tarjeta-paciente-detalle";

        const edad = calcularEdad(paciente.fecha_nac);

        const genero =
            paciente.sexo === "M"
                ? "Masculino"
                : paciente.sexo === "F"
                    ? "Femenino"
                    : "No especificado";

        const encabezado = document.createElement("div");
        encabezado.className = "paciente-info-principal";

        const imagen = document.createElement("img");

        imagen.src = paciente.avatarUrl;
        imagen.alt = "Fotografía del paciente";
        imagen.className = "avatar-grande";

        imagen.style.objectFit = "cover";

        imagen.onerror = () => {
            imagen.onerror = null;
            imagen.src = AVATAR_PREDETERMINADO;
        };

        const datos = document.createElement("div");
        datos.className = "datos-personales";

        const nombre = document.createElement("h3");

        nombre.textContent =
            `${paciente.nombre} ${paciente.apellido}`;

        datos.appendChild(nombre);

        encabezado.append(imagen, datos);

        const detalles = document.createElement("div");

        detalles.className = "paciente-detalles";

        const edadTexto =
            edad === null
                ? "No disponible"
                : `${edad} ${edad === 1 ? "año" : "años"}`;

        detalles.innerHTML = `
            <p>
                <i class="bi bi-calendar3"></i>
                <strong>Edad:</strong> ${edadTexto}
            </p>

            <p>
                <i class="bi bi-gender-ambiguous"></i>
                <strong>Género:</strong> ${genero}
            </p>
        `;

        const acciones = document.createElement("div");

        acciones.style.cssText = `
            display:flex;
            gap:10px;
            justify-content:center;
        `;

        const botonEditar = document.createElement("button");

        botonEditar.type = "button";
        botonEditar.className = "btn-accion editar";

        botonEditar.innerHTML = `
            <i class="bi bi-pencil-square"></i>
            Editar
        `;

        botonEditar.addEventListener("click", () => {
            abrirModalEditar(paciente.id);
        });

        const botonCita = document.createElement("button");

        botonCita.type = "button";
        botonCita.className = "btn-accion agendar";

        botonCita.innerHTML = `
            <i class="bi bi-calendar-check"></i>
            Agendar Cita
        `;

        botonCita.addEventListener("click", () => {
            window.location.href = "cliCitas.html";
        });

        acciones.append(botonEditar, botonCita);

        tarjeta.append(
            encabezado,
            detalles,
            acciones
        );

        contenedor.appendChild(tarjeta);
    });
}


// =====================================================
// CALCULAR EDAD
// =====================================================

function calcularEdad(fechaNacimiento) {

    if (!fechaNacimiento) return null;

    const [anio, mes, dia] =
        fechaNacimiento.split("-").map(Number);

    const hoy = new Date();

    let edad = hoy.getFullYear() - anio;

    if (
        hoy.getMonth() + 1 < mes ||
        (
            hoy.getMonth() + 1 === mes &&
            hoy.getDate() < dia
        )
    ) {
        edad--;
    }

    return edad >= 0 ? edad : null;
}


// =====================================================
// ABRIR MODAL DE REGISTRO
// =====================================================

function abrirModalPaciente() {

    document.getElementById("formNuevoPaciente").reset();

    document.getElementById("pac-fecha").value = "";

    mostrarFeedback("feedback-paciente", "");

    document.getElementById("modalPaciente").style.display = "flex";
}

function cerrarModalPaciente() {

    document.getElementById("modalPaciente").style.display = "none";

    document.getElementById("formNuevoPaciente").reset();

    document.getElementById("pac-fecha").value = "";

    mostrarFeedback("feedback-paciente", "");
}


// =====================================================
// REGISTRAR NUEVO PACIENTE
// =====================================================

async function registrarPaciente(e) {

    e.preventDefault();

    const boton = document.getElementById("btnGuardarPaciente");

    const nombre =
        document.getElementById("pac-nombre").value.trim();

    const apellido =
        document.getElementById("pac-apellido").value.trim();

    const fecha_nac =
        document.getElementById("pac-fecha").value;

    const sexo =
        document.getElementById("pac-sexo").value;

    if (!fecha_nac) {
        mostrarFeedback(
            "feedback-paciente",
            "Selecciona una fecha de nacimiento válida.",
            true
        );
        return;
    }

    boton.disabled = true;

    mostrarFeedback(
        "feedback-paciente",
        "Registrando paciente..."
    );

    try {

        const { data: auth, error: authError } =
            await client.auth.getUser();

        if (authError || !auth.user) {
            throw new Error("Tu sesión ha expirado.");
        }

        const { error } = await client
            .from("Pacientes")
            .insert({
                nombre,
                apellido,
                fecha_nac,
                sexo,
                cliente: auth.user.id
            });

        if (error) throw error;

        cerrarModalPaciente();

        await cargarPacientes();

        alert("¡Paciente registrado correctamente!");

    } catch (error) {

        console.error(error);

        mostrarFeedback(
            "feedback-paciente",
            "Error: " + error.message,
            true
        );

    } finally {

        boton.disabled = false;
    }
}


// =====================================================
// ABRIR MODAL DE EDICIÓN
// =====================================================

async function abrirModalEditar(id) {

    const modal =
        document.getElementById("modalEditarPaciente");

    modal.style.display = "flex";

    document.getElementById("formEditarPaciente").reset();

    archivoAvatar = null;

    mostrarFeedback(
        "feedback-editar-paciente",
        "Cargando información..."
    );

    try {

        const { data: paciente, error } = await client
            .from("Pacientes")
            .select("*")
            .eq("id", id)
            .eq("cliente", usuarioActual.id)
            .single();

        if (error) throw error;

        document.getElementById("edit-pac-id").value =
            paciente.id;

        document.getElementById("edit-pac-nombre").value =
            paciente.nombre;

        document.getElementById("edit-pac-apellido").value =
            paciente.apellido;

        document.getElementById("edit-pac-fecha").value =
            paciente.fecha_nac;

        document.getElementById("edit-pac-sexo").value =
            paciente.sexo || "M";

        const imagen =
            document.getElementById("edit-avatarPreview");

        imagen.src = await obtenerAvatar(paciente.avatar);

        imagen.onerror = () => {
            imagen.onerror = null;
            imagen.src = AVATAR_PREDETERMINADO;
        };

        mostrarFeedback("feedback-editar-paciente", "");

    } catch (error) {

        console.error(error);

        mostrarFeedback(
            "feedback-editar-paciente",
            "Error al cargar paciente: " + error.message,
            true
        );
    }
}


// =====================================================
// PREVISUALIZAR NUEVA FOTOGRAFÍA
// =====================================================

function previsualizarAvatar(e) {

    const archivo = e.target.files[0];

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {

        mostrarFeedback(
            "feedback-editar-paciente",
            "Selecciona una imagen válida.",
            true
        );

        e.target.value = "";
        return;
    }

    if (archivo.size > 5 * 1024 * 1024) {

        mostrarFeedback(
            "feedback-editar-paciente",
            "La imagen no debe superar los 5 MB.",
            true
        );

        e.target.value = "";
        return;
    }

    archivoAvatar = archivo;

    if (previewTemporal) {
        URL.revokeObjectURL(previewTemporal);
    }

    previewTemporal = URL.createObjectURL(archivo);

    document.getElementById("edit-avatarPreview").src =
        previewTemporal;

    mostrarFeedback(
        "feedback-editar-paciente",
        "Fotografía seleccionada correctamente."
    );
}


// =====================================================
// ACTUALIZAR PACIENTE
// =====================================================

async function actualizarPaciente(e) {

    e.preventDefault();

    const boton =
        document.getElementById("btnActualizarPaciente");

    const id =
        document.getElementById("edit-pac-id").value;

    const nombre =
        document.getElementById("edit-pac-nombre").value.trim();

    const apellido =
        document.getElementById("edit-pac-apellido").value.trim();

    const sexo =
        document.getElementById("edit-pac-sexo").value;

    boton.disabled = true;

    mostrarFeedback(
        "feedback-editar-paciente",
        "Actualizando información..."
    );

    try {

        const cambios = {
            nombre,
            apellido,
            sexo
        };

        // Subir fotografía si se seleccionó una nueva.
        if (archivoAvatar) {

            const extension =
                archivoAvatar.name.split(".").pop().toLowerCase();

            const extensionesPermitidas = [
                "jpg", "jpeg", "png", "webp", "gif"
            ];

            if (!extensionesPermitidas.includes(extension)) {
                throw new Error("Formato de imagen no permitido.");
            }

            const ruta =
                `${usuarioActual.id}/paciente-${id}-${Date.now()}.${extension}`;

            const { error: errorUpload } = await client.storage
                .from(BUCKET_PACIENTES)
                .upload(ruta, archivoAvatar, {
                    contentType: archivoAvatar.type,
                    upsert: false
                });

            if (errorUpload) throw errorUpload;

            // Guardar la ruta en la columna avatar.
            cambios.avatar = ruta;
        }

        const { data, error } = await client
            .from("Pacientes")
            .update(cambios)
            .eq("id", id)
            .eq("cliente", usuarioActual.id)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                "No se pudo actualizar el paciente. Verifica los permisos RLS."
            );
        }

        cerrarModalEditar();

        await cargarPacientes();

        alert("¡Paciente actualizado correctamente!");

    } catch (error) {

        console.error(error);

        mostrarFeedback(
            "feedback-editar-paciente",
            "Error: " + error.message,
            true
        );

    } finally {

        boton.disabled = false;
    }
}


// =====================================================
// CERRAR MODAL DE EDICIÓN
// =====================================================

function cerrarModalEditar() {

    document.getElementById("modalEditarPaciente").style.display = "none";

    document.getElementById("formEditarPaciente").reset();

    archivoAvatar = null;

    if (previewTemporal) {
        URL.revokeObjectURL(previewTemporal);
        previewTemporal = null;
    }

    mostrarFeedback("feedback-editar-paciente", "");
}


// =====================================================
// MOSTRAR MENSAJES
// =====================================================

function mostrarFeedback(id, mensaje, error = false) {

    const elemento = document.getElementById(id);

    if (!elemento) return;

    elemento.textContent = mensaje;

    elemento.style.color =
        error ? "#e74c3c" : "#0d9488";
}


function mostrarMensajeGrid(mensaje) {

    const grid =
        document.getElementById("grid-pacientes-contenedor");

    if (!grid) return;

    grid.innerHTML = "";

    const texto = document.createElement("p");

    texto.textContent = mensaje;

    texto.style.cssText =
        "grid-column:1/-1;text-align:center;color:#e74c3c;padding:2rem";

    grid.appendChild(texto);
}


// =====================================================
// EXPONER FUNCIONES PARA EL HTML
// =====================================================

window.abrirModalPaciente = abrirModalPaciente;
window.cerrarModalPaciente = cerrarModalPaciente;
window.abrirModalEditar = abrirModalEditar;
window.cerrarModalEditar = cerrarModalEditar;
