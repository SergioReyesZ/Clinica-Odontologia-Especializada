/* =====================================================
   MIS CITAS - PANEL DEL ODONTÓLOGO
   Consulta únicamente las citas asignadas al odontólogo
   autenticado. No permite crear, editar, confirmar ni cancelar.
===================================================== */
(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
    const pad = value => String(value).padStart(2, "0");
    const localISO = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const dateFromISO = value => {
        const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
        return new Date(year, month - 1, day);
    };
    const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const dateOf = cita => String(cita.fecha_hora || "").slice(0, 10);
    const timeOf = value => {
        const match = String(value || "").match(/T(\d{2}):(\d{2})/);
        return match ? `${match[1]}:${match[2]}` : "--:--";
    };
    const money = value => Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

    let citas = [];
    let pacientes = [];
    let servicios = [];
    let odontologoId = null;
    let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let selectedDate = localISO(new Date());

    function notice(message, isError = false) {
        const element = $("notice");
        if (!element) return;
        element.textContent = message;
        element.style.color = isError ? "#b91c1c" : "#166534";
    }

    function getPatient(id) { return pacientes.find(item => String(item.id) === String(id)); }
    function getService(id) { return servicios.find(item => String(item.id) === String(id)); }
    function patientName(id) {
        const item = getPatient(id);
        return item ? `${item.nombre || ""} ${item.apellido || ""}`.trim() : "Paciente no encontrado";
    }
    function serviceName(id) { return getService(id)?.nombre || "Servicio no encontrado"; }
    function displayDate(value) {
        return dateFromISO(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
    }
    function displayTime(value) {
        const [hours, minutes] = timeOf(value).split(":").map(Number);
        if (!Number.isFinite(hours)) return "--:--";
        return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    function status(cita) { return String(cita.estado || "PENDIENTE").toUpperCase(); }

    async function loadData() {
        if (typeof client === "undefined") throw new Error("No se encontró el cliente de Supabase. Comprueba que app.js se cargue antes de odontologoCitas.js.");

        const contexto = await window.odontologoAccessReady;
        if (!contexto || !contexto.odontologoId) throw new Error("No fue posible identificar al odontólogo autenticado.");
        odontologoId = contexto.odontologoId;

        const { data: citasData, error: citasError } = await client
            .from("Citas")
            .select("id, fecha_hora, estado, paciente, servicio, odontologo")
            .eq("odontologo", odontologoId)
            .order("fecha_hora", { ascending: false });
        if (citasError) throw citasError;
        citas = citasData || [];

        const patientIds = [...new Set(citas.map(cita => cita.paciente).filter(id => id != null))];
        const serviceIds = [...new Set(citas.map(cita => cita.servicio).filter(id => id != null))];

        const [patientsResult, servicesResult] = await Promise.all([
            patientIds.length
                ? client.from("Pacientes").select("id, nombre, apellido, avatar, cliente").in("id", patientIds)
                : Promise.resolve({ data: [], error: null }),
            serviceIds.length
                ? client.from("Servicios").select("id, nombre, costo").in("id", serviceIds)
                : Promise.resolve({ data: [], error: null })
        ]);
        if (patientsResult.error) throw patientsResult.error;
        if (servicesResult.error) throw servicesResult.error;
        pacientes = patientsResult.data || [];
        servicios = servicesResult.data || [];

        // Reutilizar exactamente el comprobante que ya usa la agenda del odontólogo.
        pacientesOdontologoCache = pacientes;
        serviciosOdontologoCache = servicios;

        fillServiceFilter();
        render();
        notice(citas.length ? `Se encontraron ${citas.length} cita(s) asignada(s) a tu agenda.` : "Todavía no tienes citas asignadas.");
    }

    function fillServiceFilter() {
        const select = $("filterService");
        const current = select.value;
        select.innerHTML = '<option value="">Todos los servicios</option>' + servicios
            .map(item => `<option value="${safe(item.id)}">${safe(item.nombre)}</option>`).join("");
        select.value = current;
    }

    function filteredAppointments() {
        const query = normalize($("searchAppointment")?.value || "");
        const serviceId = $("filterService")?.value || "";
        const state = ($("filterStatus")?.value || "").toUpperCase();
        return citas.filter(cita => {
            if (dateOf(cita) !== selectedDate) return false;
            if (serviceId && String(cita.servicio) !== serviceId) return false;
            if (state && status(cita) !== state) return false;
            const searchable = normalize([cita.id, `#${cita.id}`, patientName(cita.paciente), serviceName(cita.servicio)].join(" "));
            return !query || searchable.includes(query);
        }).sort((a, b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
    }

    function renderTable() {
        const tbody = $("appointmentsBody");
        const rows = filteredAppointments();
        tbody.innerHTML = rows.map(cita => {
            const state = status(cita);
            const label = state.charAt(0) + state.slice(1).toLowerCase();
            const service = getService(cita.servicio);
            return `<tr>
                <td><b>#${safe(cita.id)}</b><small>${safe(displayDate(dateOf(cita)))} · ${safe(displayTime(cita.fecha_hora))}</small></td>
                <td>${safe(patientName(cita.paciente))}</td>
                <td>${safe(serviceName(cita.servicio))}<small>${safe(money(service?.costo))}</small></td>
                <td>${safe(`${window.odontologoActual?.usuario?.nombre || ""} ${window.odontologoActual?.usuario?.apellido || ""}`.trim() || "Odontólogo")}</td>
                <td><span class="pill ${safe(label)}">${safe(label)}</span></td>
                <td><div class="actions"><button type="button" data-action="receipt" data-id="${safe(cita.id)}">Comprobante</button></div></td>
            </tr>`;
        }).join("") || '<tr><td colspan="6" class="emptymsg">No hay citas que coincidan con los filtros seleccionados para este día.</td></tr>';
    }

    function renderCalendar() {
        const calendar = $("calendar");
        const first = new Date(month.getFullYear(), month.getMonth(), 1);
        const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const offset = (first.getDay() + 6) % 7;
        $("calendarLabel").textContent = first.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
        let html = ["L", "M", "M", "J", "V", "S", "D"].map(day => `<div class="day-name">${day}</div>`).join("");
        for (let index = 0; index < offset; index++) html += '<div class="day empty"></div>';
        for (let day = 1; day <= count; day++) {
            const date = localISO(new Date(month.getFullYear(), month.getMonth(), day));
            const total = citas.filter(cita => dateOf(cita) === date).length;
            html += `<button type="button" class="day ${date === localISO(new Date()) ? "today" : ""} ${date === selectedDate ? "selected" : ""}" data-date="${date}" aria-label="${day}, ${total} citas">
                <b>${day}</b>${total ? `<small>${total} cita${total === 1 ? "" : "s"}</small>` : ""}</button>`;
        }
        calendar.innerHTML = html;
    }

    function render() { renderCalendar(); renderTable(); }


    function bindEvents() {
        $("calendar").addEventListener("click", event => {
            const button = event.target.closest("button[data-date]");
            if (!button) return;
            selectedDate = button.dataset.date;
            render();
        });
        $("prevMonth").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(); });
        $("nextMonth").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(); });
        $("todayMonth").addEventListener("click", () => { const today = new Date(); month = new Date(today.getFullYear(), today.getMonth(), 1); selectedDate = localISO(today); render(); });
        ["searchAppointment", "filterService", "filterStatus"].forEach(id => $(id).addEventListener(id === "searchAppointment" ? "input" : "change", renderTable));
        $("clearFilters").addEventListener("click", () => { $("searchAppointment").value = ""; $("filterService").value = ""; $("filterStatus").value = ""; renderTable(); });
        $("appointmentsBody").addEventListener("click", event => {
            const button = event.target.closest('[data-action="receipt"]');
            if (!button) return;
            const cita = citas.find(item => String(item.id) === button.dataset.id);
            if (cita && typeof imprimirComprobanteOdontologo === "function") {
                imprimirComprobanteOdontologo(cita);
            } else {
                notice("No se pudo preparar el comprobante.", true);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", async () => {
        bindEvents();
        try { await loadData(); }
        catch (error) {
            console.error("Error cargando las citas del odontólogo:", error);
            notice("No se pudieron cargar tus citas. Revisa tu conexión o los permisos de acceso.", true);
            $("appointmentsBody").innerHTML = '<tr><td colspan="6" class="emptymsg">Ocurrió un error al consultar tus citas.</td></tr>';
        }
    });
})();
