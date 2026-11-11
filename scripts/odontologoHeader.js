const RUTA_FOTO_DEFAULT = new URL(
    "../iconos/perfil.png",
    document.currentScript.src
).href;

document.addEventListener("DOMContentLoaded", async () => {

    const menu = document.querySelector(".menu");
    const opciones = document.querySelectorAll(".opcion");
    const linea = document.querySelector(".linea-flotante");

    // ==========================================
    // LÍNEA FLOTANTE DEL MENÚ
    // ==========================================

    function posicionarLinea(elemento) {
        if (!linea || !elemento) return;

        linea.style.width = `${elemento.offsetWidth}px`;
        linea.style.left = `${elemento.offsetLeft}px`;
        linea.style.opacity = "1";
    }

    const opcionActiva = document.querySelector(".opcion.activo");

    if (menu && linea && opcionActiva) {
        menu.classList.add("tiene-activo");
        posicionarLinea(opcionActiva);
    }

    opciones.forEach(opcion => {

        opcion.addEventListener("mouseenter", e => {
            posicionarLinea(e.currentTarget);
        });

        opcion.addEventListener("click", e => {
            opciones.forEach(o => o.classList.remove("activo"));

            e.currentTarget.classList.add("activo");

            menu?.classList.add("tiene-activo");

            posicionarLinea(e.currentTarget);
        });

    });

    menu?.addEventListener("mouseleave", () => {
        const activa = document.querySelector(".opcion.activo");

        if (activa) posicionarLinea(activa);
        else if (linea) linea.style.opacity = "0";
    });

    // ==========================================
    // MENÚ HAMBURGUESA
    // ==========================================

    const btnHamburguesa = document.getElementById("hamburger-btn");
    const menuNav = document.getElementById("menu");

    function cerrarMenu() {
        menuNav?.classList.remove("activo");

        btnHamburguesa?.setAttribute("aria-expanded", "false");
        btnHamburguesa?.setAttribute("aria-label", "Abrir menú");
    }

    btnHamburguesa?.addEventListener("click", () => {

        const abierto = menuNav.classList.toggle("activo");

        btnHamburguesa.setAttribute("aria-expanded", String(abierto));

        btnHamburguesa.setAttribute(
            "aria-label",
            abierto ? "Cerrar menú" : "Abrir menú"
        );

    });

    menuNav?.querySelectorAll("a").forEach(enlace => {
        enlace.addEventListener("click", cerrarMenu);
    });

    document.addEventListener("click", e => {
        if (!e.target.closest("#header")) cerrarMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 1050) cerrarMenu();
    });

    // ==========================================
    // DROPDOWN DE PERFIL Y NOTIFICACIONES
    // ==========================================

    const btnPerfil = document.getElementById("btnPerfilDropdown");
    const dropdownPerfil = document.getElementById("dropdownPerfil");

    const btnNotificaciones = document.getElementById("btnNotificacionesDropdown");
    const dropdownNotificaciones = document.getElementById("dropdownNotificaciones");

    btnPerfil?.addEventListener("click", e => {

        e.stopPropagation();

        dropdownNotificaciones?.classList.remove("mostrar");

        dropdownPerfil?.classList.toggle("mostrar");

    });

    btnNotificaciones?.addEventListener("click", e => {

        e.stopPropagation();

        dropdownPerfil?.classList.remove("mostrar");

        dropdownNotificaciones?.classList.toggle("mostrar");

    });

    document.addEventListener("click", e => {

        if (!dropdownPerfil?.contains(e.target) && !btnPerfil?.contains(e.target)) {
            dropdownPerfil?.classList.remove("mostrar");
        }

        if (!dropdownNotificaciones?.contains(e.target) &&
            !btnNotificaciones?.contains(e.target)) {
            dropdownNotificaciones?.classList.remove("mostrar");
        }

    });

    // ==========================================
    // CARGAR INFORMACIÓN DEL ODONTÓLOGO
    // ==========================================

    try {

        const contexto = await window.odontologoAccessReady;

        if (!contexto) return;

        const usuario = contexto.usuario;

        const nombre = usuario.nombre || "Odontólogo";
        const apellido = usuario.apellido || "";

        const nombreCompleto = `${nombre} ${apellido}`.trim();

        const nombreHeader = document.getElementById("header-nombre-usuario");
        const bienvenida = document.getElementById("bienvenida-usuario");
        const imagen = document.querySelector(".btn-perfil .pfp");

        if (nombreHeader) {
            nombreHeader.textContent = nombreCompleto;
        }

        if (bienvenida) {
            bienvenida.textContent = `¡Hola ${nombre}!`;
        }

        if (imagen) {

            imagen.src = usuario.avatar || RUTA_FOTO_DEFAULT;

            imagen.onerror = () => {
                imagen.onerror = null;
                imagen.src = RUTA_FOTO_DEFAULT;
            };

        }
    } catch (error) {
        console.error("Error cargando el perfil del odontólogo:", error);
    }

    // ==========================================
    // MARGEN DINÁMICO DEL HEADER
    // ==========================================

    const header = document.getElementById("header");
    const contenedor = document.getElementById("contenedor");

    const ajustarMargen = () => {

        if (!header || !contenedor) return;

        contenedor.style.marginTop = `${header.offsetHeight + 25}px`;

    };

    ajustarMargen();

    if (header && "ResizeObserver" in window) {

        const observer = new ResizeObserver(ajustarMargen);

        observer.observe(header);

    }

    window.addEventListener("resize", ajustarMargen);

    // Quitar pantalla de carga
    document.querySelector(".skeleton-page")?.remove();

    document.querySelector(".contenedor-principal")?.classList.remove("cargando");

    document.body.classList.remove("dashboard-cargando");

});
