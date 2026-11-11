(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
    const money = (value) => Number(value || 0).toLocaleString("es-MX", {
        style: "currency", currency: "MXN"
    });
    let servicios = [];
    let servicioAEliminar = null;

    function mostrarAviso(message, error = false) {
        const el = $("notice");
        if (!el) return;
        el.textContent = message;
        el.classList.toggle("error", error);
        el.classList.add("visible");
        window.clearTimeout(mostrarAviso.timer);
        mostrarAviso.timer = window.setTimeout(() => {
            el.classList.remove("visible");
        }, 5000);
    }

    function mostrarEstadoTabla(message) {
        $("serviciosBody").innerHTML =
            `<tr><td colspan="4" class="estado-tabla">${safe(message)}</td></tr>`;
    }

    function normalizar(texto) {
        return String(texto || "").normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    async function cargarServicios() {
        if (typeof client === "undefined" || !client) {
            mostrarEstadoTabla("No se encontró la conexión con Supabase.");
            mostrarAviso("Verifica que app.js se cargue antes que servicios.js.", true);
            return;
        }

        mostrarEstadoTabla("Cargando servicios...");
        try {
            const { data, error } = await client
                .from("Servicios")
                .select("id, nombre, costo, descripcion")
                .order("nombre", { ascending: true });

            if (error) throw error;
            servicios = data || [];
            $("totalServicios").textContent = servicios.length;
            renderServicios();
        } catch (error) {
            console.error("Error al consultar Servicios:", error);
            mostrarEstadoTabla("No se pudieron cargar los servicios.");
            mostrarAviso(`Error al consultar servicios: ${error.message || "Error desconocido"}`, true);
        }
    }

    function renderServicios() {
        const query = normalizar($("buscarServicio").value);
        const filtrados = servicios.filter((servicio) =>
            normalizar(`${servicio.nombre || ""} ${servicio.descripcion || ""}`).includes(query)
        );

        if (!filtrados.length) {
            mostrarEstadoTabla(query ? "No hay servicios que coincidan con la búsqueda." : "Todavía no hay servicios registrados.");
            return;
        }

        $("serviciosBody").innerHTML = filtrados.map((servicio) => `
            <tr>
                <td>
                    <div class="nombre-servicio">
                        <span class="servicio-icono"><i class="bi bi-heart-pulse"></i></span>
                        <div><strong>${safe(servicio.nombre)}</strong><small>Folio #${safe(servicio.id)}</small></div>
                    </div>
                </td>
                <td class="descripcion-celda">${safe(servicio.descripcion || "Sin descripción")}</td>
                <td class="costo-celda">${money(servicio.costo)}</td>
                <td>
                    <div class="acciones-servicio">
                        <button type="button" class="btn-editar" data-action="editar" data-id="${safe(servicio.id)}" title="Editar servicio">
                            <i class="bi bi-pencil-square"></i><span>Editar</span>
                        </button>
                        <button type="button" class="btn-eliminar" data-action="eliminar" data-id="${safe(servicio.id)}" title="Eliminar servicio">
                            <i class="bi bi-trash3"></i><span>Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    function abrirModalNuevo() {
        $("formServicio").reset();
        $("servicioId").value = "";
        $("tituloModalServicio").innerHTML = '<i class="bi bi-plus-circle"></i> Nuevo servicio';
        $("btnGuardarServicio").innerHTML = '<i class="bi bi-check-lg"></i> Guardar servicio';
        $("feedbackServicio").textContent = "";
        $("modalServicio").style.display = "flex";
        $("servicioNombre").focus();
    }

    function abrirModalEditar(id) {
        const servicio = servicios.find((item) => String(item.id) === String(id));
        if (!servicio) return;

        $("formServicio").reset();
        $("servicioId").value = servicio.id;
        $("servicioNombre").value = servicio.nombre || "";
        $("servicioCosto").value = servicio.costo ?? "";
        $("servicioDescripcion").value = servicio.descripcion || "";
        $("tituloModalServicio").innerHTML = '<i class="bi bi-pencil-square"></i> Editar servicio';
        $("btnGuardarServicio").innerHTML = '<i class="bi bi-save"></i> Guardar cambios';
        $("feedbackServicio").textContent = "";
        $("modalServicio").style.display = "flex";
        $("servicioNombre").focus();
    }

    function cerrarModalServicio() {
        $("modalServicio").style.display = "none";
    }

    async function guardarServicio(event) {
        event.preventDefault();

        const id = $("servicioId").value;
        const nombre = $("servicioNombre").value.trim();
        const costo = Number($("servicioCosto").value);
        const descripcion = $("servicioDescripcion").value.trim();


        if (!nombre || /\d/.test(nombre)) {
            $("feedbackServicio").textContent =
                "Escribe un nombre de servicio válido, sin números.";
            $("feedbackServicio").style.color = "#b91c1c";
            return;
        }

        if (!Number.isFinite(costo) || costo <= 0) {
            $("feedbackServicio").textContent = "El costo debe ser mayor que cero.";
            return;
        }

        const payload = { nombre, costo, descripcion: descripcion || null };
        const button = $("btnGuardarServicio");
        button.innerHTML = '<i class="bi bi-arrow-repeat"></i> Guardando...';
        $("feedbackServicio").textContent = "";

        try {
            let result;
            if (id) {
                result = await client.from("Servicios").update(payload).eq("id", id);
            } else {
                result = await client.from("Servicios").insert(payload);
            }
            if (result.error) throw result.error;

            cerrarModalServicio();
            await cargarServicios();
            mostrarAviso(id ? "Servicio actualizado correctamente." : "Servicio creado correctamente.");
            return false;
        } catch (error) {
            console.error("Error al guardar servicio:", error);
            $("feedbackServicio").textContent = error.message || "No se pudo guardar el servicio.";
        } finally {
            button.innerHTML = id
                ? '<i class="bi bi-save"></i> Guardar cambios'
                : '<i class="bi bi-check-lg"></i> Guardar servicio';
        }
    }

    function abrirConfirmacionEliminar(id) {
        const servicio = servicios.find((item) => String(item.id) === String(id));
        if (!servicio) return;
        servicioAEliminar = servicio.id;
        $("textoEliminar").textContent = `Se eliminará el servicio “${servicio.nombre}”. Esta acción no se puede deshacer.`;
        $("modalEliminarServicio").style.display = "flex";
    }

    function cerrarConfirmacionEliminar() {
        $("modalEliminarServicio").style.display = "none";
        servicioAEliminar = null;
    }

    async function eliminarServicio() {
        if (servicioAEliminar === null) return;

        const id = servicioAEliminar;
        const button = $("btnConfirmarEliminar");
        button.innerHTML = '<i class="bi bi-arrow-repeat"></i> Eliminando...';

        try {
            const { error } = await client.from("Servicios").delete().eq("id", id);
            if (error) {
                // La FK de Citas puede impedir borrar un servicio que ya tiene citas asociadas.
                if (error.code === "23503") {
                    throw new Error("No se puede eliminar este servicio porque está relacionado con una o más citas. Puedes editarlo, pero no borrarlo mientras existan esas referencias.");
                }
                throw error;
            }

            cerrarConfirmacionEliminar();
            await cargarServicios();
            mostrarAviso("Servicio eliminado correctamente.");
            return false;
        } catch (error) {
            console.error("Error al eliminar servicio:", error);
            mostrarAviso(error.message || "No se pudo eliminar el servicio.", true);
            cerrarConfirmacionEliminar();
        } finally {
            button.innerHTML = '<i class="bi bi-trash3"></i> Eliminar';
        }
    }

    function eventos() {
        $("btnNuevoServicio").addEventListener("click", abrirModalNuevo);
        $("btnCerrarModal").addEventListener("click", cerrarModalServicio);
        $("btnCancelarModal").addEventListener("click", cerrarModalServicio);
        $("buscarServicio").addEventListener("input", renderServicios);
        $("btnLimpiarBusqueda").addEventListener("click", () => {
            $("buscarServicio").value = "";
            renderServicios();
            $("buscarServicio").focus();
        });

        $("formServicio").addEventListener(
            "submit",
            evitarDobleEnvio(guardarServicio, "#btnGuardarServicio")
        );


        $("serviciosBody").addEventListener("click", (event) => {
            const button = event.target.closest("button[data-action]");
            if (!button) return;
            const { action, id } = button.dataset;
            if (action === "editar") abrirModalEditar(id);
            if (action === "eliminar") abrirConfirmacionEliminar(id);
        });

        $("btnCancelarEliminar").addEventListener("click", cerrarConfirmacionEliminar);
        $("btnConfirmarEliminar").addEventListener(
            "click",
            evitarDobleEnvio(eliminarServicio, "#btnConfirmarEliminar")
        );

        ["modalServicio", "modalEliminarServicio"].forEach((id) => {
            $(id).addEventListener("click", (event) => {
                if (event.target === $(id)) {
                    if (id === "modalServicio") cerrarModalServicio();
                    else cerrarConfirmacionEliminar();
                }
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                cerrarModalServicio();
                cerrarConfirmacionEliminar();
            }
        });
    }

    function iniciar() {
        eventos();
        cargarServicios();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
