
/* =========================================================
   AGENDA Y CALENDARIO FLOTANTE
========================================================= */

let fechaActual = new Date();
let fechaCalendario = new Date();

const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const diasNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

document.addEventListener("DOMContentLoaded", () => {

    const contenedorDias = document.getElementById("contenedor-dias");
    const etiquetaMesAnio = document.getElementById("mes-anio-actual");

    const btnAnterior = document.getElementById("btn-anterior");
    const btnSiguiente = document.getElementById("btn-siguiente");
    const btnHoy = document.getElementById("btn-hoy");

    const calendarioAgenda = document.getElementById("modalCalendarioAgenda");
    const contenedorCalendario = document.getElementById("agendaCalendarioAnchor");

    const diasCalendario = document.getElementById("agenda-dias-calendario");
    const mesAnioCalendario = document.getElementById("agenda-mes-anio");

    const btnMesAnterior = document.getElementById("agenda-prev-month");
    const btnMesSiguiente = document.getElementById("agenda-next-month");
    const btnIrHoy = document.getElementById("agenda-btn-hoy");

    if (!contenedorDias || !btnAnterior || !btnSiguiente) {
        console.error("No se encontraron los elementos de la agenda.");
        return;
    }
    /* Reposicionar al desplazarse por la página */
    window.addEventListener("scroll", () => {
        posicionarCalendarioAgenda();
    }, true);

    /* Reposicionar si cambia el tamaño de la ventana */
    window.addEventListener("resize", () => {
        posicionarCalendarioAgenda();
    });

    /* ---------------------------------------------------------
       ACTUALIZAR LOS 7 DÍAS DE LA AGENDA
    --------------------------------------------------------- */

    function actualizarAgenda(direccion = "") {

        contenedorDias.classList.remove(
            "animar-derecha",
            "animar-izquierda"
        );

        contenedorDias.innerHTML = "";

        etiquetaMesAnio.textContent =
            `${mesesNombres[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;

        btnHoy.textContent =
            `${fechaActual.getDate()} ${mesesNombres[fechaActual.getMonth()].substring(0, 3)}.`;

        for (let i = -3; i <= 3; i++) {

            const fechaBucle = new Date(fechaActual);
            fechaBucle.setDate(fechaActual.getDate() + i);

            const divDia = document.createElement("div");

            divDia.className = i === 0 ? "dia actual" : "dia";
            divDia.style.cursor = "pointer";

            divDia.innerHTML = `
                <p>${diasNombres[fechaBucle.getDay()]}</p>
                <p class="titulo">${fechaBucle.getDate()}</p>
                ${i === 0 ? '<i class="bi bi-dot"></i>' : ""}
            `;

            // Seleccionar directamente un día de la agenda
            divDia.addEventListener("click", () => {

                const nuevaFecha = new Date(fechaBucle);

                const direccion =
                    nuevaFecha < fechaActual ? "derecha" : "izquierda";

                fechaActual = nuevaFecha;

                actualizarAgenda(direccion);
            });

            contenedorDias.appendChild(divDia);
        }

        // Animación
        void contenedorDias.offsetWidth;

        if (direccion === "izquierda") {
            contenedorDias.classList.add("animar-izquierda");
        } else if (direccion === "derecha") {
            contenedorDias.classList.add("animar-derecha");
        }

        // Actualizar las citas del día seleccionado
        if (typeof window.actualizarCitasVisibles === "function") {
            window.actualizarCitasVisibles(fechaActual);
        }
    }

    /* ---------------------------------------------------------
       BOTÓN DÍA ANTERIOR
    --------------------------------------------------------- */

    btnAnterior.addEventListener("click", () => {

        fechaActual.setDate(fechaActual.getDate() - 1);

        actualizarAgenda("derecha");
    });

    /* ---------------------------------------------------------
       BOTÓN DÍA SIGUIENTE
    --------------------------------------------------------- */

    btnSiguiente.addEventListener("click", () => {

        fechaActual.setDate(fechaActual.getDate() + 1);

        actualizarAgenda("izquierda");
    });

    /* ==========================================
       POSICIONAMIENTO ADAPTATIVO DEL CALENDARIO
    ========================================== */

    function posicionarCalendarioAgenda() {

        if (!calendarioAgenda || calendarioAgenda.style.display === "none") {
            return;
        }

        const rect = btnHoy.getBoundingClientRect();

        const margen = 12;
        const separacion = 8;
        const altoViewport = window.innerHeight;
        const anchoViewport = window.innerWidth;

        // Mantener el calendario dentro de las dimensiones de la pantalla
        calendarioAgenda.style.position = "fixed";
        calendarioAgenda.style.height = "auto";
        calendarioAgenda.style.maxHeight = `${altoViewport - margen * 2}px`;

        // Obtener dimensiones reales
        const ancho = calendarioAgenda.offsetWidth;
        const altoNatural = calendarioAgenda.scrollHeight;

        // Espacio disponible
        const espacioArriba = rect.top - margen - separacion;
        const espacioAbajo = altoViewport - rect.bottom - margen - separacion;

        // Elegir dónde hay más espacio
        const abrirAbajo = espacioAbajo >= altoNatural ||
            (espacioAbajo >= espacioArriba && espacioAbajo > 160);

        const espacioDisponible = abrirAbajo
            ? espacioAbajo
            : espacioArriba;

        // Limitar la altura cuando no cabe completo
        calendarioAgenda.style.maxHeight =
            `${Math.max(160, espacioDisponible)}px`;

        // Medir nuevamente después de limitar la altura
        const alto = calendarioAgenda.offsetHeight;

        // Posición vertical
        let top = abrirAbajo
            ? rect.bottom + separacion
            : rect.top - alto - separacion;

        // Evitar que salga de la pantalla
        top = Math.max(
            margen,
            Math.min(top, altoViewport - alto - margen)
        );

        // Centrar respecto al botón
        let left = rect.left + rect.width / 2 - ancho / 2;

        left = Math.max(
            margen,
            Math.min(left, anchoViewport - ancho - margen)
        );

        calendarioAgenda.style.top = `${top}px`;
        calendarioAgenda.style.left = `${left}px`;
        calendarioAgenda.style.right = "auto";
        calendarioAgenda.style.bottom = "auto";
    }


    /* Abrir calendario */
    function abrirCalendarioAgenda() {

        if (!calendarioAgenda) return;

        fechaCalendario = new Date(fechaActual);

        renderizarCalendarioAgenda();

        calendarioAgenda.style.display = "block";

        requestAnimationFrame(() => {
            posicionarCalendarioAgenda();
        });
    }

    /* Evento del botón Hoy */
    btnHoy.addEventListener("click", (e) => {

        e.stopPropagation();

        if (calendarioAgenda.style.display === "none") {
            abrirCalendarioAgenda();
        } else {
            cerrarCalendarioAgenda();
        }

    });

    /* Cerrar calendario */
    function cerrarCalendarioAgenda() {

        if (!calendarioAgenda) return;

        calendarioAgenda.style.display = "none";
    }

    /* ---------------------------------------------------------
       DIBUJAR CALENDARIO
    --------------------------------------------------------- */

    function renderizarCalendarioAgenda() {

        if (!diasCalendario || !mesAnioCalendario) return;

        diasCalendario.innerHTML = "";

        const anio = fechaCalendario.getFullYear();
        const mes = fechaCalendario.getMonth();

        mesAnioCalendario.textContent =
            `${mesesNombres[mes]} ${anio}`;

        const primerDia = new Date(anio, mes, 1).getDay();
        const totalDias = new Date(anio, mes + 1, 0).getDate();

        const hoy = new Date();

        // Espacios antes del primer día del mes
        for (let i = 0; i < primerDia; i++) {

            const espacio = document.createElement("div");
            diasCalendario.appendChild(espacio);
        }

        // Días del mes
        for (let dia = 1; dia <= totalDias; dia++) {

            const fechaDia = new Date(anio, mes, dia);

            const elementoDia = document.createElement("button");

            elementoDia.type = "button";
            elementoDia.className = "cal-day";
            elementoDia.textContent = dia;

            const esSeleccionado =
                fechaDia.getFullYear() === fechaActual.getFullYear() &&
                fechaDia.getMonth() === fechaActual.getMonth() &&
                fechaDia.getDate() === fechaActual.getDate();

            const esHoy =
                fechaDia.getFullYear() === hoy.getFullYear() &&
                fechaDia.getMonth() === hoy.getMonth() &&
                fechaDia.getDate() === hoy.getDate();

            if (esSeleccionado) {
                elementoDia.classList.add("seleccionado");
            }

            if (esHoy) {
                elementoDia.classList.add("hoy");
            }

            // Seleccionar fecha del calendario
            elementoDia.addEventListener("click", () => {

                const nuevaFecha = new Date(
                    anio,
                    mes,
                    dia
                );

                const direccion =
                    nuevaFecha < fechaActual ? "derecha" : "izquierda";

                // ACTUALIZAR LA FECHA REAL DE LA AGENDA
                fechaActual = nuevaFecha;

                // Actualizar los siete días visibles
                actualizarAgenda(direccion);

                // Cerrar calendario
                cerrarCalendarioAgenda();
            });

            diasCalendario.appendChild(elementoDia);
        }
    }

    /* ---------------------------------------------------------
       CAMBIAR MES DEL CALENDARIO
    --------------------------------------------------------- */

    btnMesAnterior?.addEventListener("click", (e) => {

        e.stopPropagation();

        fechaCalendario.setDate(1);
        fechaCalendario.setMonth(fechaCalendario.getMonth() - 1);

        renderizarCalendarioAgenda();
    });

    btnMesSiguiente?.addEventListener("click", (e) => {

        e.stopPropagation();

        fechaCalendario.setDate(1);
        fechaCalendario.setMonth(fechaCalendario.getMonth() + 1);

        renderizarCalendarioAgenda();
    });

    /* ---------------------------------------------------------
       REGRESAR A LA FECHA DE HOY
    --------------------------------------------------------- */

    btnIrHoy?.addEventListener("click", () => {

        fechaActual = new Date();

        actualizarAgenda();

        cerrarCalendarioAgenda();
    });

    /* ---------------------------------------------------------
       CERRAR AL HACER CLIC FUERA
    --------------------------------------------------------- */

    document.addEventListener("click", (e) => {

        if (
            calendarioAgenda &&
            contenedorCalendario &&
            !contenedorCalendario.contains(e.target)
        ) {
            cerrarCalendarioAgenda();
        }
    });

    /* ---------------------------------------------------------
       CERRAR CON ESCAPE
    --------------------------------------------------------- */

    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {
            cerrarCalendarioAgenda();
        }
    });

    /* ---------------------------------------------------------
       INICIALIZAR
    --------------------------------------------------------- */

    actualizarAgenda();

});
