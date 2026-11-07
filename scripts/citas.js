/* ============================================================
   ADMINISTRACIÓN DE CITAS — CONEXIÓN REAL A SUPABASE
   Mantiene la estructura visual de citas.html y reutiliza
   los modales y reglas de estado de adminDashboard.
============================================================ */
(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const safe = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
    const money = n => Number(n || 0).toLocaleString("es-MX", {
        style: "currency", currency: "MXN"
    });
    const pad = n => String(n).padStart(2, "0");
    const localISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const dateFromISO = s => {
        const [y,m,d] = String(s).split("-").map(Number);
        return new Date(y, m-1, d);
    };
    const timeOf = value => {
        const m = String(value || "").match(/T(\d{2}):(\d{2})/);
        return m ? `${m[1]}:${m[2]}` : "";
    };
    const normalize = s => String(s || "").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    let citas = [];
    let pacientes = [];
    let servicios = [];
    let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let selectedDate = localISO(new Date());
    let idCancelar = null;
    let idConfirmar = null;
    let modifyingId = null;

    const ACTIVE_STATES = ["PENDIENTE", "CONFIRMADA"];
    const TIMES = ["16:30:00","17:00:00","17:30:00","18:00:00",
                   "18:30:00","19:00:00","19:30:00"];

    function notice(message, error = false) {
        const el = $("notice");
        if (!el) return;
        el.textContent = message;
        el.style.color = error ? "#b91c1c" : "#166534";
        window.setTimeout(() => { if (el.textContent === message) el.textContent = ""; }, 4500);
    }

    function patient(id) {
        return pacientes.find(p => String(p.id) === String(id));
    }
    function service(id) {
        return servicios.find(s => String(s.id) === String(id));
    }
    function patientName(id) {
        const p = patient(id);
        return p ? `${p.nombre || ""} ${p.apellido || ""}`.trim() : "Paciente no encontrado";
    }
    function serviceName(id) {
        return service(id)?.nombre || "Servicio no encontrado";
    }
    function formatDate(value) {
        if (!value) return "";
        const d = dateFromISO(String(value).slice(0,10));
        return d.toLocaleDateString("es-MX", {day:"2-digit", month:"short", year:"numeric"});
    }
    function dateTimeForDay(cita) {
        return String(cita.fecha_hora || "").slice(0,10);
    }
    function status(cita) {
        return String(cita.estado || "PENDIENTE").toUpperCase();
    }

    async function loadData() {
        if (typeof client === "undefined") {
            throw new Error("No se encontró el cliente de Supabase. Verifica que app.js se cargue antes de citas.js.");
        }
        const [c, p, s] = await Promise.all([
            client.from("Citas")
                .select("id, fecha_hora, estado, paciente, servicio, odontologo")
                .order("fecha_hora", {ascending:false}),
            client.from("Pacientes")
                .select("id, nombre, apellido, avatar")
                .order("nombre", {ascending:true}),
            client.from("Servicios")
                .select("id, nombre, costo")
                .order("nombre", {ascending:true})
        ]);
        if (c.error) throw c.error;
        if (p.error) throw p.error;
        if (s.error) throw s.error;
        citas = c.data || [];
        pacientes = p.data || [];
        servicios = s.data || [];
        fillServiceFilters();
        render();
    }

    function fillServiceFilters() {
        const select = $("filterService");
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Todos los servicios</option>' +
            servicios.map(s => `<option value="${safe(s.id)}">${safe(s.nombre)}</option>`).join("");
        select.value = current;
    }

    function filteredAppointments() {
        const q = normalize($("searchAppointment")?.value || "");
        const serviceId = $("filterService")?.value || "";
        const state = ($("filterStatus")?.value || "").toUpperCase();

        return citas.filter(c => {
            if (dateTimeForDay(c) !== selectedDate) return false;
            if (serviceId && String(c.servicio) !== String(serviceId)) return false;
            if (state && status(c) !== state) return false;
            const searchable = normalize([
                c.id, `#${c.id}`, patientName(c.paciente),
                serviceName(c.servicio), "Virginia Hernández Sánchez",
                c.odontologo
            ].join(" "));
            return !q || searchable.includes(q);
        }).sort((a,b) => String(a.fecha_hora).localeCompare(String(b.fecha_hora)));
    }

    function renderTable() {
        const tbody = $("appointmentsBody");
        if (!tbody) return;
        const rows = filteredAppointments();
        tbody.innerHTML = rows.map(c => {
            const st = status(c);
            const date = dateTimeForDay(c);
            const time = timeOf(c.fecha_hora);
            const s = service(c.servicio);
            let actions = `<button type="button" data-action="receipt" data-id="${safe(c.id)}">Comprobante</button>`;
            if (st === "PENDIENTE") {
                actions = `
                    <button type="button" data-action="confirm" data-id="${safe(c.id)}">Confirmar</button>
                    <button type="button" data-action="edit" data-id="${safe(c.id)}">Editar</button>
                    <button type="button" class="danger" data-action="cancel" data-id="${safe(c.id)}">Cancelar</button>
                    <button type="button" data-action="receipt" data-id="${safe(c.id)}">Comprobante</button>`;
            } else if (st === "CONFIRMADA") {
                actions = `
                    <button type="button" data-action="edit" data-id="${safe(c.id)}">Editar</button>
                    <button type="button" class="danger" data-action="cancel" data-id="${safe(c.id)}">Cancelar</button>
                    <button type="button" data-action="receipt" data-id="${safe(c.id)}">Comprobante</button>`;
            }
            return `<tr>
                <td><b>#${safe(c.id)}</b><small>${formatDate(date)} · ${safe(time)}</small></td>
                <td>${safe(patientName(c.paciente))}</td>
                <td>${safe(serviceName(c.servicio))}<small>${money(s?.costo)}</small></td>
                <td>Dra. Virginia Hernández Sánchez</td>
                <td><span class="pill ${safe(st.charAt(0)+st.slice(1).toLowerCase())}">${safe(st.charAt(0)+st.slice(1).toLowerCase())}</span></td>
                <td><div class="actions">${actions}</div></td>
            </tr>`;
        }).join("") || `<tr><td colspan="6" class="emptymsg">No hay citas que coincidan con los filtros seleccionados para este día.</td></tr>`;
    }

    function allSlotsFull(date) {
        const d = dateFromISO(date);
        // La agenda del administrador trabaja de lunes a viernes.
        if ([0,6].includes(d.getDay())) return false;
        const occupied = new Set(citas
            .filter(c => dateTimeForDay(c) === date && ACTIVE_STATES.includes(status(c)))
            .map(c => `${String(c.odontologo || 1)}|${timeOf(c.fecha_hora)}:00`));
        // Para la vista mensual se marca lleno si los siete horarios de la Dra. están ocupados.
        return TIMES.every(t => occupied.has(`1|${t}`));
    }

    function renderCalendar() {
        const calendar = $("calendar");
        if (!calendar) return;
        const first = new Date(month.getFullYear(), month.getMonth(), 1);
        const count = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
        const offset = (first.getDay()+6)%7;
        $("calendarLabel").textContent = first.toLocaleDateString("es-MX", {month:"long",year:"numeric"});
        let html = ["L","M","M","J","V","S","D"].map(x => `<div class="day-name">${x}</div>`).join("");
        for (let i=0; i<offset; i++) html += '<div class="day empty"></div>';
        for (let n=1; n<=count; n++) {
            const d = localISO(new Date(month.getFullYear(),month.getMonth(),n));
            const total = citas.filter(c => dateTimeForDay(c) === d && ACTIVE_STATES.includes(status(c))).length;
            html += `<button type="button" class="day ${d===localISO(new Date())?"today":""} ${d===selectedDate?"selected":""}"
                data-date="${d}" aria-label="${n}, ${total} citas">
                <b>${n}</b>
                ${allSlotsFull(d) ? '<span class="day-full-dot" title="Sin horarios disponibles"></span>' : ''}
                ${total ? `<small>${total} cita${total===1?"":"s"}</small>` : ""}
            </button>`;
        }
        calendar.innerHTML = html;
    }

    function render() {
        renderCalendar();
        renderTable();
    }

    function selectDate(date) {
        selectedDate = date;
        render();
    }

    function openNewAppointment() {
        $("modalNuevaCita").style.display = "flex";
        $("formNuevaCita")?.reset();
        $("cita-fecha").value = "";
        $("cita-hora").value = "";
        $("texto-fecha-seleccionada").textContent = "Selecciona una fecha";
        $("calendario-flotante").style.display = "none";
        $("feedback-cita").textContent = "";
        slotCheckRequest++;
        newCalMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        populateAppointmentSelects();
        renderNewDateCalendar();
        renderNewHours();
    }

    function closeNewAppointment() {
        $("modalNuevaCita").style.display = "none";
        $("formNuevaCita")?.reset();
        $("feedback-cita").textContent = "";
        $("texto-fecha-seleccionada").textContent = "Selecciona una fecha";
        $("calendario-flotante").style.display = "none";
    }

    function populateAppointmentSelects() {
        const ps = $("cita-paciente"), ss = $("cita-servicio");
        if (ps) ps.innerHTML = '<option value="" disabled selected>Selecciona paciente</option>' +
            pacientes.map(p => `<option value="${safe(p.id)}">${safe(p.nombre)} ${safe(p.apellido)}</option>`).join("");
        if (ss) ss.innerHTML = '<option value="" disabled selected>Selecciona servicio</option>' +
            servicios.map(s => `<option value="${safe(s.id)}">${safe(s.nombre)}</option>`).join("");
    }

    let newCalMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let slotCheckRequest = 0;

    // Estas tres funciones reproducen las reglas del modal de adminDashboard.
    function todayLocal() {
        return localISO(new Date());
    }

    function hourAlreadyPassed(date, time) {
        if (date !== todayLocal()) return false;

        const now = new Date();
        const [hours, minutes] = String(time).split(":").map(Number);

        return now.getHours() * 60 + now.getMinutes() >=
            hours * 60 + minutes;
    }

    function dayHasNoMoreHours(date, lastHour = "19:30:00") {
        if (date !== todayLocal()) return false;

        const now = new Date();
        const [hours, minutes] = lastHour.split(":").map(Number);

        return now.getHours() * 60 + now.getMinutes() >=
            hours * 60 + minutes;
    }

    function renderNewDateCalendar() {
        const grid = $("dias-calendario");
        if (!grid) return;

        const y = newCalMonth.getFullYear();
        const m = newCalMonth.getMonth();
        const today = dateFromISO(todayLocal());

        $("mes-año-display").textContent =
            newCalMonth.toLocaleDateString("es-MX", {month:"long", year:"numeric"});

        const firstDay = new Date(y, m, 1).getDay();
        const days = new Date(y, m + 1, 0).getDate();
        grid.innerHTML = "";

        for (let n = 1; n <= days; n++) {
            const d = new Date(y, m, n);
            const date = localISO(d);
            const btn = document.createElement("button");

            btn.type = "button";
            btn.className = "cal-day";
            btn.textContent = n;
            btn.style.gridColumnStart = d.getDay() + 1;

            const isPast = d < today;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const noHoursLeft = dayHasNoMoreHours(date, "19:30:00");

            if (date === $("cita-fecha")?.value) btn.classList.add("seleccionado");

            if (isPast || isWeekend || noHoursLeft) {
                btn.classList.add("disabled");
                btn.disabled = true;
            } else {
                btn.addEventListener("click", async () => {
                    $("cita-fecha").value = date;
                    $("cita-hora").value = "";
                    $("horarios-contenedor")?.querySelectorAll(".btn-hora")
                        .forEach(x => x.classList.remove("seleccionada"));
                    $("texto-fecha-seleccionada").textContent =
                        `${pad(n)}/${pad(m + 1)}/${y}`;
                    $("calendario-flotante").style.display = "none";

                    renderNewHours();
                    await checkNewSlots();
                });
            }

            grid.appendChild(btn);
        }

        const prev = $("prev-month");
        if (prev) {
            prev.disabled = y === today.getFullYear() && m === today.getMonth();
        }
    }

    function renderNewHours() {
        const box = $("horarios-contenedor");
        if (!box) return;

        box.innerHTML = "";
        TIMES.forEach(t => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-hora";
            btn.dataset.valor = t;
            btn.textContent = t.slice(0, 5);
            btn.addEventListener("click", () => {
                if (btn.disabled) return;

                box.querySelectorAll(".btn-hora")
                    .forEach(x => x.classList.remove("seleccionada"));
                btn.classList.add("seleccionada");
                $("cita-hora").value = t;
            });
            box.appendChild(btn);
        });
    }

    // Igual que adminDashboard: consulta la función RPC de Supabase,
    // no depende de la caché local de citas que puede estar desactualizada.
    async function fetchOccupiedHours(date, doctorId) {
        const { data, error } = await client.rpc(
            "obtener_horarios_ocupados",
            { p_fecha: date }
        );
        if (error) throw error;

        return (data || [])
            .filter(c => String(c.odontologo) === String(doctorId))
            .map(c => {
                // Se conserva la conversión UTC que utiliza adminDashboard.
                const dateObj = new Date(c.fecha_hora);
                const h = pad(dateObj.getUTCHours());
                const m = pad(dateObj.getUTCMinutes());
                const s = pad(dateObj.getUTCSeconds());
                return `${h}:${m}:${s}`;
            });
    }

    async function checkNewSlots() {
        const date = $("cita-fecha")?.value;
        const doctor = $("cita-odontologo")?.value || "1";
        const box = $("horarios-contenedor");
        if (!box || !date) return;

        const requestId = ++slotCheckRequest;
        const buttons = [...box.querySelectorAll(".btn-hora")];

        // Mientras se consulta Supabase, no permitir reservar a ciegas.
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add("ocupada");
            btn.classList.remove("seleccionada");
        });
        $("cita-hora").value = "";

        try {
            const occupiedHours = await fetchOccupiedHours(date, doctor);
            if (requestId !== slotCheckRequest) return;

            buttons.forEach(btn => {
                const value = btn.dataset.valor;
                const occupied = occupiedHours.includes(value);
                const passed = hourAlreadyPassed(date, value);
                const unavailable = occupied || passed;

                btn.disabled = unavailable;
                btn.classList.toggle("ocupada", unavailable);
                btn.classList.remove("seleccionada");
                btn.title = occupied
                    ? "Horario ocupado"
                    : passed ? "Este horario ya pasó" : "Horario disponible";
                btn.style.cursor = unavailable ? "not-allowed" : "pointer";
                btn.style.backgroundColor = unavailable ? "#e2e8f0" : "";
                btn.style.color = unavailable ? "#94a3b8" : "";
            });
        } catch (err) {
            console.error("Error al verificar horarios ocupados:", err);
            if (requestId !== slotCheckRequest) return;

            // Si no se pudo verificar disponibilidad, mantener todos bloqueados.
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add("ocupada");
                btn.title = "No se pudo verificar la disponibilidad";
            });
            $("feedback-cita").textContent =
                "No se pudieron consultar los horarios. Intenta nuevamente.";
            $("feedback-cita").style.color = "#dc2626";
        }
    }

    async function saveNewAppointment(e) {
        e.preventDefault();
        const btn = $("btnConfirmarCita"), feedback = $("feedback-cita");
        const paciente = $("cita-paciente").value, servicio = $("cita-servicio").value;
        const odontologo = $("cita-odontologo").value || "1";
        const fecha = $("cita-fecha").value, hora = $("cita-hora").value;
        if (!paciente || !servicio || !fecha || !hora) {
            feedback.textContent = "Completa los campos y selecciona un horario disponible.";
            feedback.style.color = "#dc2626"; return;
        }
        if (fecha < todayLocal() || [0, 6].includes(dateFromISO(fecha).getDay()) ||
            dayHasNoMoreHours(fecha, "19:30:00") || hourAlreadyPassed(fecha, hora)) {
            feedback.textContent = "La fecha u horario seleccionado ya no está disponible.";
            feedback.style.color = "#dc2626";
            await checkNewSlots();
            return;
        }

        try {
            btn.disabled = true;
            feedback.textContent = "Verificando disponibilidad...";
            feedback.style.color = "#2563eb";

            // Comprobación en vivo igual que adminDashboard, justo antes del INSERT.
            const occupiedHours = await fetchOccupiedHours(fecha, odontologo);
            if (occupiedHours.includes(hora) || hourAlreadyPassed(fecha, hora)) {
                feedback.textContent = "Ese horario ya está ocupado o ya pasó. Selecciona otro.";
                feedback.style.color = "#dc2626";
                await checkNewSlots();
                return;
            }

            feedback.textContent = "Agendando cita...";
            const {error} = await client.from("Citas").insert({
                fecha_hora: `${fecha}T${hora}`,
                estado: "PENDIENTE",
                paciente: Number(paciente),
                odontologo: Number(odontologo),
                servicio: Number(servicio)
            });
            if (error) throw error;
            await loadData();
            closeNewAppointment();
            notice("Cita agendada correctamente.");
        } catch(err) {
            console.error(err); feedback.textContent = "No se pudo agendar: " + err.message;
            feedback.style.color = "#dc2626";
        } finally { btn.disabled = false; }
    }

    function openModify(id) {
        const c = citas.find(x => String(x.id)===String(id));
        if (!c) return;
        modifyingId = id;
        $("modalModificarCitaAdmin").style.display = "flex";
        $("mod-cita-id-admin").value = id;
        $("mod-cita-paciente-admin").value = patientName(c.paciente);
        $("mod-cita-servicio-admin").innerHTML = servicios.map(s =>
            `<option value="${safe(s.id)}" ${String(s.id)===String(c.servicio)?"selected":""}>${safe(s.nombre)}</option>`).join("");
        $("mod-cita-odontologo-admin").value = c.odontologo || "1";
        const date = dateTimeForDay(c);
        $("mod-cita-fecha-admin").value = date;
        $("texto-fecha-seleccionada-mod-admin").textContent = formatDate(date);
        $("mod-cita-hora-admin").value = timeOf(c.fecha_hora)+":00";
        $("costo-mod-cita-admin").textContent = money(service(c.servicio)?.costo);
        renderModifyCalendar(date);
        renderModifyHours(date, id, timeOf(c.fecha_hora)+":00");
    }

    let modifyMonth = new Date();
    function renderModifyCalendar(selected) {
        const grid = $("dias-calendario-mod-admin");
        if (!grid) return;
        const y=modifyMonth.getFullYear(), m=modifyMonth.getMonth(), first=new Date(y,m,1).getDay();
        const days=new Date(y,m+1,0).getDate();
        $("mes-año-display-mod-admin").textContent=modifyMonth.toLocaleDateString("es-MX",{month:"long",year:"numeric"});
        grid.innerHTML="";
        for(let n=1;n<=days;n++){
            const date=localISO(new Date(y,m,n)), d=dateFromISO(date), btn=document.createElement("button");
            btn.type="button";btn.className="cal-day"+(date===selected?" seleccionado":"");btn.textContent=n;
            btn.style.gridColumnStart=d.getDay()+1;
            if(date<localISO(new Date())||[0,6].includes(d.getDay()))btn.classList.add("disabled");
            else btn.addEventListener("click",()=>{
                $("mod-cita-fecha-admin").value=date;
                $("texto-fecha-seleccionada-mod-admin").textContent=formatDate(date);
                renderModifyCalendar(date);renderModifyHours(date,modifyingId,null);
            });
            grid.appendChild(btn);
        }
    }

    function renderModifyHours(date,id,oldTime) {
        const box=$("horarios-contenedor-mod-admin");if(!box)return;
        box.innerHTML="";
        const doctor=$("mod-cita-odontologo-admin").value||"1";
        const occupied=new Set(citas.filter(c=>String(c.id)!==String(id)&&dateTimeForDay(c)===date&&
            String(c.odontologo||1)===String(doctor)&&ACTIVE_STATES.includes(status(c)))
            .map(c=>timeOf(c.fecha_hora)+":00"));
        TIMES.forEach(t=>{
            const btn=document.createElement("button");btn.type="button";btn.className="btn-hora";
            btn.dataset.valor=t;btn.textContent=t.slice(0,5);
            const blocked=(occupied.has(t)&&t!==oldTime)||(date===localISO(new Date())&&t.slice(0,5)<=`${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`&&t!==oldTime);
            btn.disabled=blocked;btn.classList.toggle("ocupada",blocked);
            if(t===oldTime&&!blocked)btn.classList.add("seleccionada");
            btn.addEventListener("click",()=>{if(btn.disabled)return;box.querySelectorAll(".btn-hora").forEach(x=>x.classList.remove("seleccionada"));btn.classList.add("seleccionada");$("mod-cita-hora-admin").value=t;});
            box.appendChild(btn);
        });
        $("mod-cita-hora-admin").value=oldTime||"";
    }

    async function saveModify(e) {
        e.preventDefault();
        const id=$("mod-cita-id-admin").value, date=$("mod-cita-fecha-admin").value;
        const time=$("mod-cita-hora-admin").value, serviceId=$("mod-cita-servicio-admin").value;
        const doctor=$("mod-cita-odontologo-admin").value||"1";
        const feedback=$("feedback-modificar-admin"), btn=$("btnGuardarModificacionAdmin");
        if(!date||!time||!serviceId){feedback.textContent="Completa los campos y selecciona un horario.";return;}
        const collision=citas.some(c=>String(c.id)!==String(id)&&dateTimeForDay(c)===date&&
            String(c.odontologo||1)===String(doctor)&&timeOf(c.fecha_hora)===time.slice(0,5)&&ACTIVE_STATES.includes(status(c)));
        if(collision){feedback.textContent="Ese horario ya está ocupado.";return;}
        try{
            btn.disabled=true;feedback.textContent="Guardando cambios...";
            const {error}=await client.from("Citas").update({
                servicio:Number(serviceId),odontologo:Number(doctor),fecha_hora:`${date}T${time}`
            }).eq("id",id);
            if(error)throw error;
            $("modalModificarCitaAdmin").style.display="none";
            await loadData();notice("Cita modificada correctamente.");
        }catch(err){feedback.textContent="Error al modificar: "+err.message;}
        finally{btn.disabled=false;}
    }

    function openCancel(id){idCancelar=id;$("modalCancelarCitaAdmin").style.display="flex";}
    function closeCancel(){$("modalCancelarCitaAdmin").style.display="none";idCancelar=null;}
    function openConfirm(id){idConfirmar=id;$("modalConfirmarCitaAdmin").style.display="flex";}
    function closeConfirm(){$("modalConfirmarCitaAdmin").style.display="none";idConfirmar=null;}

    async function updateState(id,state) {
        const {error}=await client.from("Citas").update({estado:state}).eq("id",id);
        if(error)throw error;
        await loadData();
    }

    function receipt(id) {
        const c=citas.find(x=>String(x.id)===String(id));if(!c)return;
        const fecha=dateTimeForDay(c).split("-").reverse().join("/");
        const hora=timeOf(c.fecha_hora);
        const costo=service(c.servicio)?.costo||"0.00";
        const paciente=patientName(c.paciente), servicioNombre=serviceName(c.servicio);
        const win=window.open("","_blank");
        if(!win){notice("Permite las ventanas emergentes para imprimir el comprobante.",true);return;}
        win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>Comprobante de Cita - Odontología Especializada</title>
        <style>
        @page{size:letter;margin:10mm 15mm}body{font-family:Arial,sans-serif;margin:0 auto;color:#333;line-height:1.4;font-size:13px}
        .header{text-align:center;border-bottom:2px solid #0056e0;padding-bottom:.8rem;margin-bottom:1rem}
        .header img{width:100px;margin-bottom:.3rem}.header h2{margin:0;color:#0056e0;font-size:1.5rem}
        .header p{margin:.2rem 0;font-size:.85rem;color:#555}.comprobante-title{margin-top:.8rem;font-size:1rem;letter-spacing:1px}
        .details{background:#f8fafc;padding:1rem 1.2rem;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:1rem}
        .details p{margin:.5rem 0;border-bottom:1px dashed #cbd5e1;padding-bottom:.4rem}.details p:last-child{border:0}
        .costo-grande{text-align:center;font-size:1.6rem;color:#0056e0;font-weight:bold;margin:1rem 0;padding:.8rem;background:#eff6ff;border-radius:8px}
        .costo-grande span{font-size:.85rem;color:#64748b;display:block;font-weight:normal}
        .recomendaciones{background:#fffbeb;padding:.8rem 1rem;border-left:4px solid #f59e0b;margin-bottom:1rem}
        .footer{text-align:center;font-size:.8rem;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:.6rem;margin-top:1rem}
        .btn-print{display:block;width:100%;background:#0056e0;color:white;border:0;padding:.8rem;font-size:1rem;border-radius:8px;cursor:pointer;font-weight:bold;margin-top:1rem}
        @media print{.btn-print{display:none}}
        </style></head><body>
        <div class="header"><img src="../iconos/logo.png" alt="Logo"><h2>Odontología Especializada</h2>
        <p>Jesús Elías Piña #1003, Col. Del Pueblo<br>Tampico, Tamaulipas, C.P. 89190</p>
        <p>Tel: 833 695 7177 | hola@odontologia.com</p><h3 class="comprobante-title">COMPROBANTE DE CITA</h3></div>
        <div class="details"><p><strong>Folio / ID de Cita:</strong> #0045${safe(id)}</p>
        <p><strong>Paciente:</strong> ${safe(paciente)}</p><p><strong>Odontólogo:</strong> Dra. Virginia Hernández Sánchez</p>
        <p><strong>Servicio Programado:</strong> ${safe(servicioNombre)}</p><p><strong>Fecha de la Cita:</strong> ${safe(fecha)}</p>
        <p><strong>Hora de la Cita:</strong> ${safe(hora)}</p></div>
        <div class="costo-grande"><span>Costo Estimado</span>${money(costo)} MXN</div>
        <div class="recomendaciones"><h4>Recomendaciones para su visita:</h4><ul>
        <li>Le pedimos amablemente llegar 10 minutos antes de su cita.</li>
        <li>En caso de no poder asistir, le solicitamos cancelar con al menos 24 horas de anticipación desde su portal web.</li>
        <li>Si tiene dudas o requiere indicaciones especiales, no dude en contactarnos.</li></ul></div>
        <div class="footer">Generado desde el Portal de Pacientes - Odontología Especializada</div>
        <button class="btn-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
        <script>window.onload=function(){setTimeout(()=>window.print(),500)};<\/script></body></html>`);
        win.document.close();
    }

    function bindEvents() {
        $("searchAppointment")?.addEventListener("input",renderTable);
        $("filterService")?.addEventListener("change",renderTable);
        $("filterStatus")?.addEventListener("change",renderTable);
        $("clearFilters")?.addEventListener("click",()=>{
            $("searchAppointment").value="";$("filterService").value="";$("filterStatus").value="";
            render();
        });
        $("prevMonth")?.addEventListener("click",()=>{month.setMonth(month.getMonth()-1);renderCalendar();});
        $("nextMonth")?.addEventListener("click",()=>{month.setMonth(month.getMonth()+1);renderCalendar();});
        $("todayMonth")?.addEventListener("click",()=>{month=new Date(new Date().getFullYear(),new Date().getMonth(),1);selectedDate=localISO(new Date());render();});
        $("calendar")?.addEventListener("click",e=>{
            const day=e.target.closest("[data-date]");if(day)selectDate(day.dataset.date);
        });
        document.querySelector('[data-action="newAppointment"]')?.addEventListener("click",openNewAppointment);
        $("closeModalNuevaCita")?.addEventListener("click",closeNewAppointment);
        $("formNuevaCita")?.addEventListener("submit",saveNewAppointment);
        $("btn-mostrar-calendario")?.addEventListener("click",()=>{
            const cal=$("calendario-flotante");cal.style.display=cal.style.display==="none"?"block":"none";
        });
        $("prev-month")?.addEventListener("click",()=>{newCalMonth.setMonth(newCalMonth.getMonth()-1);renderNewDateCalendar();});
        $("next-month")?.addEventListener("click",()=>{newCalMonth.setMonth(newCalMonth.getMonth()+1);renderNewDateCalendar();});
        $("cita-odontologo")?.addEventListener("change",async()=>{
            $("cita-hora").value = "";
            $("horarios-contenedor")?.querySelectorAll(".btn-hora")
                .forEach(x=>x.classList.remove("seleccionada"));
            await checkNewSlots();
        });
        $("cita-servicio")?.addEventListener("change",()=>{
            const selected=$("cita-servicio").value;
            const item=service(selected);
            const cost=$("costo-cita-clicitas");
            if(cost) cost.textContent=money(item?.costo)+" MXN";
        });
        $("formModificarCitaAdmin")?.addEventListener("submit",saveModify);
        $("mod-cita-servicio-admin")?.addEventListener("change",()=>{
            $("costo-mod-cita-admin").textContent=money(service($("mod-cita-servicio-admin").value)?.costo);
        });
        $("btn-mostrar-calendario-mod-admin")?.addEventListener("click",()=>{
            const cal=$("calendario-flotante-mod-admin");cal.style.display=cal.style.display==="none"?"block":"none";
        });
        $("prev-month-mod-admin")?.addEventListener("click",()=>{modifyMonth.setMonth(modifyMonth.getMonth()-1);renderModifyCalendar($("mod-cita-fecha-admin").value);});
        $("next-month-mod-admin")?.addEventListener("click",()=>{modifyMonth.setMonth(modifyMonth.getMonth()+1);renderModifyCalendar($("mod-cita-fecha-admin").value);});
        $("btnConfirmarCancelacionAdmin")?.addEventListener("click",async()=>{
            if(!idCancelar)return;
            const btn=$("btnConfirmarCancelacionAdmin");btn.disabled=true;
            try{await updateState(idCancelar,"CANCELADA");closeCancel();notice("Cita cancelada correctamente.");}
            catch(e){notice("No se pudo cancelar: "+e.message,true);}
            finally{btn.disabled=false;}
        });
        $("btnAceptarConfirmacionAdmin")?.addEventListener("click",async()=>{
            if(!idConfirmar)return;
            const btn=$("btnAceptarConfirmacionAdmin");btn.disabled=true;
            try{await updateState(idConfirmar,"CONFIRMADA");closeConfirm();notice("Cita confirmada correctamente.");}
            catch(e){notice("No se pudo confirmar: "+e.message,true);}
            finally{btn.disabled=false;}
        });
        document.addEventListener("click",e=>{
            const action=e.target.closest("[data-action]");
            if(action){
                const id=action.dataset.id;
                if(action.dataset.action==="edit")openModify(id);
                if(action.dataset.action==="cancel")openCancel(id);
                if(action.dataset.action==="confirm")openConfirm(id);
                if(action.dataset.action==="receipt")receipt(id);
            }
            if(e.target.id==="calendar"||e.target.closest("#calendar"))return;
        });
        $("modalModificarCitaAdmin")?.addEventListener("click",e=>{if(e.target.id==="modalModificarCitaAdmin")e.currentTarget.style.display="none";});
        $("modalCancelarCitaAdmin")?.addEventListener("click",e=>{if(e.target.id==="modalCancelarCitaAdmin")closeCancel();});
        $("modalConfirmarCitaAdmin")?.addEventListener("click",e=>{if(e.target.id==="modalConfirmarCitaAdmin")closeConfirm();});
        $("modalNuevaCita")?.addEventListener("click",e=>{if(e.target.id==="modalNuevaCita")closeNewAppointment();});
    }

    document.addEventListener("DOMContentLoaded",async()=>{
        bindEvents();
        // Selector de fecha de nacimiento del modal original, conservado por compatibilidad.
        const year=$("pac-fecha-anio"), monthSelect=$("pac-fecha-mes"), daySelect=$("pac-fecha-dia");
        if(year&&monthSelect&&daySelect){
            const current=new Date().getFullYear();
            for(let y=current;y>=current-100;y--){const o=document.createElement("option");o.value=y;o.textContent=y;year.appendChild(o);}
            const updateDays=()=>{
                const old=daySelect.value;daySelect.innerHTML='<option value="" disabled selected>Día</option>';
                if(!year.value||!monthSelect.value)return;
                const max=new Date(Number(year.value),Number(monthSelect.value),0).getDate();
                for(let d=1;d<=max;d++){const o=document.createElement("option");o.value=pad(d);o.textContent=d;daySelect.appendChild(o);}
                if(old&&Number(old)<=max)daySelect.value=old;
                $("pac-fecha").value=year.value&&monthSelect.value&&daySelect.value?`${year.value}-${monthSelect.value}-${daySelect.value}`:"";
            };
            year.addEventListener("change",updateDays);monthSelect.addEventListener("change",updateDays);
            daySelect.addEventListener("change",()=>{$("pac-fecha").value=`${year.value}-${monthSelect.value}-${daySelect.value}`;});
        }
        try{await loadData();}
        catch(e){console.error("Error al cargar citas desde Supabase:",e);notice("No se pudieron cargar los registros: "+e.message,true);}
    });

    // Exponer los controles que usa el HTML original de los modales.
    window.abrirModalCita = openNewAppointment;
    window.cerrarModalCita = closeNewAppointment;
    window.cerrarModalModificarAdmin = () => { $("modalModificarCitaAdmin").style.display="none"; };
    window.abrirModalModificarAdmin = openModify;
    window.abrirModalCancelarAdmin = openCancel;
    window.cerrarModalCancelarAdmin = closeCancel;
    window.abrirModalConfirmarAdmin = openConfirm;
    window.cerrarModalConfirmarAdmin = closeConfirm;
})();
