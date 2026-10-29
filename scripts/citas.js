
/* Vista independiente de citas.
   Comparte los datos demo del dashboard original. */

(() => {
    'use strict';

    const $ = s => document.querySelector(s);

    const esc = v => String(v ?? '').replace(
        /[&<>"']/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c])
    );

    const key = 'odontologia_admin_demo_v1';
    const today = new Date();

    const iso = d =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const plus = n => {
        let d = new Date();
        d.setDate(d.getDate() + n);
        return iso(d);
    };

    const services = [
        { name: 'Limpieza dental', cost: 600, duration: 60 },
        { name: 'Brackets', cost: 1800, duration: 60 },
        { name: 'Blanqueamiento', cost: 1200, duration: 60 },
        { name: 'Ortodoncia', cost: 900, duration: 60 },
        { name: 'Endodoncia', cost: 1500, duration: 60 }
    ];

    const seed = () => ({
        users: [
            {
                id: 1,
                name: 'Administrador',
                last: 'Clínica',
                role: 'Administrador'
            },
            {
                id: 2,
                name: 'Sofía',
                last: 'Morales',
                role: 'Cliente'
            },
            {
                id: 3,
                name: 'Virginia',
                last: 'Hernández Sánchez',
                role: 'Odontólogo'
            }
        ],
        patients: [
            {
                id: 1,
                name: 'Mateo',
                last: 'Ramírez',
                userId: 2
            }
        ],
        schedules: [
            {
                doctorId: 3,
                days: [1, 2, 3, 4, 5],
                start: '16:30',
                end: '20:00'
            }
        ],
        appointments: [
            {
                id: 1,
                patientId: 1,
                doctorId: 3,
                service: 'Limpieza dental',
                date: plus(1),
                time: '16:30',
                status: 'Pendiente',
                cost: 600,
                duration: 60
            }
        ],
        audit: []
    });

    let db;

    try {
        db = JSON.parse(localStorage.getItem(key)) || seed();
    } catch {
        db = seed();
    }

    const save = () =>
        localStorage.setItem(key, JSON.stringify(db));

    const person = (arr, id) =>
        arr.find(x => x.id === Number(id));

    const name = x =>
        x ? `${x.name} ${x.last}` : 'No disponible';

    const fmt = d =>
        new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

    const money = n =>
        Number(n).toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });

    const mins = t =>
        Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

    const clock = m =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const notify = t => {
        $('#notice').textContent = t;

        setTimeout(() => {
            $('#notice').textContent = '';
        }, 4500);
    };

    const log = (action, id, detail) => {
        db.audit ??= [];

        db.audit.unshift({
            date: new Date().toLocaleString('es-MX'),
            action,
            id,
            detail,
            actor: 'Administrador (demo)'
        });
    };

    let month = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    let selected = '';

    $('#filterService').innerHTML += services.map(
        x => `<option>${x.name}</option>`
    ).join('');

    // CALENDARIO

    function calendar() {
        let first = new Date(
            month.getFullYear(),
            month.getMonth(),
            1
        );

        let end = new Date(
            month.getFullYear(),
            month.getMonth() + 1,
            0
        ).getDate();

        let offset = (first.getDay() + 6) % 7;

        $('#calendarLabel').textContent =
            first.toLocaleDateString('es-MX', {
                month: 'long',
                year: 'numeric'
            });

        let html = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
            .map(x => `<div class="day-name">${x}</div>`)
            .join('');

        for (let i = 0; i < offset; i++) {
            html += '<div class="day empty"></div>';
        }

        for (let i = 1; i <= end; i++) {
            let d = iso(new Date(
                month.getFullYear(),
                month.getMonth(),
                i
            ));

            let n = db.appointments.filter(
                a => a.date === d && a.status !== 'Cancelada'
            ).length;

            html += `
                <button
                    class="day
                    ${d === iso(today) ? 'today' : ''}
                    ${d === selected ? 'selected' : ''}"
                    data-date="${d}"
                >
                    <b>${i}</b>
                    ${n ? `<small>${n} cita${n > 1 ? 's' : ''}</small>` : ''}
                </button>
            `;
        }

        $('#calendar').innerHTML = html;
    }

    // REGISTROS Y FILTROS

    function render() {
        let q = $('#searchAppointment').value.toLowerCase();
        let sv = $('#filterService').value;
        let st = $('#filterStatus').value;
        let dt = $('#filterDate').value;

        let list = db.appointments.filter(a =>
            (
                !q ||
                [
                    a.id,
                    name(person(db.patients, a.patientId)),
                    name(person(db.users, a.doctorId)),
                    a.service
                ].join(' ').toLowerCase().includes(q)
            ) &&
            (!sv || a.service === sv) &&
            (!st || a.status === st) &&
            (!dt || a.date === dt) &&
            (!selected || a.date === selected)
        ).sort(
            (a, b) =>
                (b.date + b.time).localeCompare(a.date + a.time)
        );

        $('#appointmentsBody').innerHTML = list.map(a => `
            <tr>
                <td>
                    <b>#${a.id}</b>
                    <small>${fmt(a.date)} · ${esc(a.time)}</small>
                </td>

                <td>
                    ${esc(name(person(db.patients, a.patientId)))}
                </td>

                <td>
                    ${esc(a.service)}
                    <small>${money(a.cost)}</small>
                </td>

                <td>
                    ${esc(name(person(db.users, a.doctorId)))}
                </td>

                <td>
                    <span class="pill ${esc(a.status)}">
                        ${esc(a.status)}
                    </span>
                </td>

                <td>
                    <div class="actions">
                        <button data-action="edit" data-id="${a.id}">
                            Editar
                        </button>

                        <button data-action="receipt" data-id="${a.id}">
                            Comprobante
                        </button>

                        ${a.status !== 'Cancelada' ? `
                            <button
                                class="danger"
                                data-action="cancel"
                                data-id="${a.id}"
                            >
                                Cancelar
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('') || `
            <tr>
                <td colspan="6" class="emptymsg">
                    No hay citas para estos filtros.
                </td>
            </tr>
        `;

        calendar();
    }

    // MODALES

    function modal(title, content) {
        $('#modalTitle').textContent = title;
        $('#modalContent').innerHTML = content;
        $('#modal').classList.remove('hidden');
    }

    function close() {
        $('#modal').classList.add('hidden');
    }

    // FORMULARIO DE CITAS

    function form(id) {
        let a = db.appointments.find(x => x.id === id);

        const opts = (arr, value) => arr.map(x => `
            <option
                value="${x.id}"
                ${x.id === value ? 'selected' : ''}
            >
                ${esc(name(x))}
            </option>
        `).join('');

        modal(
            a ? 'Modificar cita #' + id : 'Registrar cita manual',
            `
            <form
                id="appointmentForm"
                class="formgrid"
                data-id="${id || ''}"
            >

                <label>
                    Paciente
                    <select name="patientId" required>
                        ${opts(db.patients, a?.patientId)}
                    </select>
                </label>

                <label>
                    Odontólogo
                    <select name="doctorId" required>
                        ${opts(
                            db.users.filter(x => x.role === 'Odontólogo'),
                            a?.doctorId
                        )}
                    </select>
                </label>

                <label>
                    Servicio
                    <select name="service" required>
                        ${services.map(s => `
                            <option
                                ${s.name === a?.service ? 'selected' : ''}
                            >
                                ${s.name}
                            </option>
                        `).join('')}
                    </select>
                </label>

                <label>
                    Fecha
                    <input
                        name="date"
                        type="date"
                        min="${iso(today)}"
                        value="${a?.date || iso(today)}"
                        required
                    >
                </label>

                <label>
                    Hora disponible
                    <select name="time" required></select>
                </label>

                <label>
                    Estado
                    <select name="status">
                        ${[
                            'Pendiente',
                            'Confirmada',
                            'Terminada',
                            'Cancelada'
                        ].map(s => `
                            <option
                                ${s === (a?.status || 'Pendiente')
                                    ? 'selected'
                                    : ''}
                            >
                                ${s}
                            </option>
                        `).join('')}
                    </select>
                </label>

                <div
                    class="summary full"
                    id="costSummary"
                ></div>

                <p
                    class="muted full"
                    id="slotMessage"
                ></p>

                <button
                    class="primary full"
                    type="submit"
                >
                    ${a ? 'Guardar cambios' : 'Registrar cita'}
                </button>

            </form>
            `
        );

        let f = $('#appointmentForm');

        ['doctorId', 'service', 'date', 'status'].forEach(n => {
            f.elements[n].addEventListener(
                'change',
                () => slots(f, id)
            );
        });

        slots(f, id);
    }

    // HORARIOS DISPONIBLES

    function slots(f, id) {
        let doctor = Number(f.elements.doctorId.value);
        let date = f.elements.date.value;

        let service = services.find(
            s => s.name === f.elements.service.value
        );

        let schedule = db.schedules.find(
            s => s.doctorId === doctor
        );

        let old = db.appointments.find(a => a.id === id);

        let times = [];

        if (
            schedule &&
            date &&
            service &&
            schedule.days.includes(
                new Date(date + 'T12:00:00').getDay()
            )
        ) {
            for (
                let m = mins(schedule.start);
                m + service.duration <= mins(schedule.end);
                m += 30
            ) {
                let t = clock(m);

                if (new Date(date + 'T' + t + ':00') <= new Date()) {
                    continue;
                }

                if (!db.appointments.some(a =>
                    a.id !== id &&
                    a.doctorId === doctor &&
                    a.date === date &&
                    a.status !== 'Cancelada' &&
                    m < mins(a.time) + a.duration &&
                    m + service.duration > mins(a.time)
                )) {
                    times.push(t);
                }
            }
        }

        f.elements.time.innerHTML = times.map(t => `
            <option ${old?.time === t ? 'selected' : ''}>
                ${t}
            </option>
        `).join('');

        $('#costSummary').textContent =
            `Costo: ${money(service?.cost || 0)} · Duración: ${service?.duration || 0} min`;

        $('#slotMessage').textContent = times.length
            ? 'Selecciona un horario libre.'
            : 'No hay horarios disponibles para esa fecha y odontólogo.';

        f.querySelector('[type=submit]').disabled =
            !times.length || !db.patients.length;
    }

    // EVENTOS DE BOTONES

    document.addEventListener('click', e => {
        let day = e.target.closest('[data-date]');

        if (day) {
            selected = selected === day.dataset.date
                ? ''
                : day.dataset.date;

            render();
            return;
        }

        let b = e.target.closest('[data-action]');

        if (!b) return;

        let id = Number(b.dataset.id);
        let a = db.appointments.find(x => x.id === id);

        if (b.dataset.action === 'newAppointment') {
            form();
        }

        if (b.dataset.action === 'edit') {
            form(id);
        }

        if (
            b.dataset.action === 'cancel' &&
            a &&
            confirm('¿Cancelar cita #' + id + '?')
        ) {
            a.status = 'Cancelada';

            log(
                'Cancelación',
                id,
                'Cita cancelada y horario liberado'
            );

            save();
            render();
            notify('Cita cancelada.');
        }

        // COMPROBANTE

        if (b.dataset.action === 'receipt' && a) {
            modal(
                'Comprobante de cita #' + id,
                `
                <div id="printReceipt">
                    <h2>Odontología Especializada</h2>
                    <p>Folio #${id}</p>
                    <hr>

                    <p>
                        <b>Paciente:</b>
                        ${esc(name(person(db.patients, a.patientId)))}
                    </p>

                    <p>
                        <b>Odontólogo:</b>
                        ${esc(name(person(db.users, a.doctorId)))}
                    </p>

                    <p>
                        <b>Servicio:</b>
                        ${esc(a.service)}
                    </p>

                    <p>
                        <b>Fecha y hora:</b>
                        ${fmt(a.date)} · ${esc(a.time)}
                    </p>

                    <p>
                        <b>Costo:</b>
                        ${money(a.cost)}
                    </p>

                    <p>
                        <b>Estado:</b>
                        ${esc(a.status)}
                    </p>
                </div>

                <button class="primary" id="printBtn">
                    Imprimir / Guardar como PDF
                </button>
                `
            );

            $('#printBtn').onclick = () => {
                let w = window.open('', '_blank');

                if (!w) {
                    return notify('Permite las ventanas emergentes.');
                }

                w.document.write(
                    '<!doctype html><html><head>' +
                    '<meta charset="utf-8">' +
                    '<title>Comprobante</title>' +
                    '<style>body{font:16px Arial;padding:40px;line-height:1.7}</style>' +
                    '</head><body>' +
                    $('#printReceipt').innerHTML +
                    '</body></html>'
                );

                w.document.close();
                w.onload = () => w.print();
            };
        }
    });

    // GUARDAR CITA

    document.addEventListener('submit', e => {
        if (e.target.id !== 'appointmentForm') return;

        e.preventDefault();

        let f = e.target;
        let v = Object.fromEntries(new FormData(f));
        let id = Number(f.dataset.id);

        let a = db.appointments.find(x => x.id === id);

        let svc = services.find(
            x => x.name === v.service
        );

        if (!v.time || !svc) {
            return notify('Selecciona un horario disponible.');
        }

        // Evitar empalmes de citas

        if (db.appointments.some(x =>
            x.id !== id &&
            x.doctorId === Number(v.doctorId) &&
            x.date === v.date &&
            x.status !== 'Cancelada' &&
            mins(v.time) < mins(x.time) + x.duration &&
            mins(v.time) + svc.duration > mins(x.time)
        )) {
            return notify('El horario ya está ocupado.');
        }

        let data = {
            patientId: Number(v.patientId),
            doctorId: Number(v.doctorId),
            service: v.service,
            date: v.date,
            time: v.time,
            status: v.status,
            cost: svc.cost,
            duration: svc.duration
        };

        if (a) {
            Object.assign(a, data);

            log(
                'Modificación',
                id,
                'Cita actualizada'
            );
        } else {
            id = Math.max(
                0,
                ...db.appointments.map(x => x.id)
            ) + 1;

            db.appointments.push({
                id,
                ...data,
                created: new Date().toISOString()
            });

            log(
                'Registro',
                id,
                'Nueva cita ' + v.date + ' ' + v.time
            );
        }

        save();
        close();
        render();

        notify('Cita guardada correctamente.');
    });

    // CERRAR MODAL

    $('#closeModal').onclick = close;

    $('#modal').onclick = e => {
        if (e.target.id === 'modal') close();
    };

    // FILTROS

    [
        'searchAppointment',
        'filterService',
        'filterStatus',
        'filterDate'
    ].forEach(id => {
        $('#' + id).addEventListener('input', render);
    });

    $('#clearFilters').onclick = () => {
        [
            'searchAppointment',
            'filterService',
            'filterStatus',
            'filterDate'
        ].forEach(id => {
            $('#' + id).value = '';
        });

        selected = '';
        render();
    };

    // NAVEGACIÓN DEL CALENDARIO

    $('#prevMonth').onclick = () => {
        month.setMonth(month.getMonth() - 1);
        calendar();
    };

    $('#nextMonth').onclick = () => {
        month.setMonth(month.getMonth() + 1);
        calendar();
    };

    $('#todayMonth').onclick = () => {
        month = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        selected = '';
        render();
    };

    // INICIALIZAR

    render();

})();
