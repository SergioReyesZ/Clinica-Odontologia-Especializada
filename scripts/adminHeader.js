const RUTA_FOTO_DEFAULT = new URL(
    "../iconos/perfil.png",
    document.currentScript.src
).href;

document.addEventListener("DOMContentLoaded", () => {
    const menu = document.querySelector(".menu");
    const opciones = document.querySelectorAll(".opcion");
    const linea = document.querySelector(".linea-flotante");

    // Función auxiliar para posicionar la línea
    const posicionarLinea = (elemento) => {
        if (!linea || !elemento) return;

        const anchoOpcion = elemento.offsetWidth;
        const posicionIzquierda = elemento.offsetLeft;

        linea.style.width = `${anchoOpcion}px`;
        linea.style.left = `${posicionIzquierda}px`;
        linea.style.opacity = "1";
    };

    // Detectar si ya hay una opción activa al cargar
    const opcionActivaInicial = document.querySelector(".opcion.activo");
    if (menu && linea && opcionActivaInicial) {
        menu.classList.add("tiene-activo");
        posicionarLinea(opcionActivaInicial);
    }

    opciones.forEach(opcion => {
        opcion.addEventListener("mouseenter", (e) => {
            posicionarLinea(e.target);
        });

        opcion.addEventListener("click", (e) => {
            opciones.forEach(opt => opt.classList.remove("activo"));
            e.target.classList.add("activo");
            menu.classList.add("tiene-activo");
            posicionarLinea(e.target);
        });
    });

    if (menu && linea) {
        menu.addEventListener("mouseleave", () => {
            const opcionActiva = document.querySelector(".opcion.activo");
            if (opcionActiva) {
                posicionarLinea(opcionActiva);
            } else {
                menu.classList.remove("tiene-activo");
                linea.style.opacity = "0";
            }
        });
    }

    // Solución al volver atrás en el navegador (BFCache)
    window.addEventListener("pageshow", (e) => {
        if (e.persisted && opcionActivaInicial) {
            opciones.forEach(opt => opt.classList.remove("activo"));
            opcionActivaInicial.classList.add("activo");
            posicionarLinea(opcionActivaInicial);
        }
    });

    const btnMenu = document.getElementById("hamburger-btn");
    const menuNav = document.getElementById("menu");
    const botonesHeader = document.getElementById("botones");

    if (btnMenu && menuNav) {
        const cerrarMenu = () => {
            menuNav.classList.remove("activo");
            if (botonesHeader) botonesHeader.classList.remove("activo");
            btnMenu.setAttribute("aria-expanded", "false");
            btnMenu.setAttribute("aria-label", "Abrir menú");
        };

        btnMenu.addEventListener("click", () => {
            const abierto = menuNav.classList.toggle("activo");
            if (botonesHeader) botonesHeader.classList.toggle("activo", abierto);
            btnMenu.setAttribute("aria-expanded", String(abierto));
            btnMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
        });

        menuNav.querySelectorAll("a.opcion").forEach(enlace => {
            enlace.addEventListener("click", cerrarMenu);
        });

        if (botonesHeader) {
            botonesHeader.querySelectorAll("button, a").forEach(control => {
                control.addEventListener("click", cerrarMenu);
            });
        }

        document.addEventListener("click", evento => {
            if (!evento.target?.closest?.("#header")) cerrarMenu();
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 1050) cerrarMenu();
        });
    }
});

// SOLUCIÓN DEL MARGEN: Cambiamos DOMContentLoaded por 'load'
window.addEventListener('load', () => {
    const header = document.getElementById('header');
    const content = document.getElementById('contenedor'); // Contenedor del index
    const contentCitas = document.querySelector('.encabezado-seccion'); // Por si estás en la página de Citas

    // Función para actualizar el margen dinámicamente
    const ajustarMargen = () => {
        if (header) {
            const headerHeight = header.offsetHeight;
            
            // Aplica el margen al contenedor que exista en la página actual
            if (content) {
                content.style.marginTop = `${headerHeight + 25}px`;
            } else if (contentCitas) {
                contentCitas.style.marginTop = `${headerHeight + 25}px`;
            }
        }
    };

    // Ejecutamos una vez que todo cargó
    ajustarMargen();

    // El encabezado cambia de altura cuando se despliega el menú móvil.
    // ResizeObserver mantiene el contenido debajo del header sin saltos ni solapamientos.
    if (header && 'ResizeObserver' in window) {
        const observadorHeader = new ResizeObserver(ajustarMargen);
        observadorHeader.observe(header);
    }

    window.addEventListener('resize', ajustarMargen);
});

// Lógica para el dropdown del perfil
    const btnPerfil = document.getElementById('btnPerfilDropdown');
    const dropdownPerfil = document.getElementById('dropdownPerfil');

    if (btnPerfil && dropdownPerfil) {
        // Abrir/cerrar al dar clic en el perfil
        btnPerfil.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el clic se propague al resto de la página
            dropdownPerfil.classList.toggle('mostrar');
        });

        // Cerrar el modal al hacer clic en cualquier otro lado
        document.addEventListener('click', (e) => {
            if (!dropdownPerfil.contains(e.target) && !btnPerfil.contains(e.target)) {
                dropdownPerfil.classList.remove('mostrar');
            }
        });
    }

/* ==========================================
   CARGAR FOTO Y NOMBRE DEL ADMINISTRADOR
========================================== */

/* ==========================================
   CARGAR FOTO Y NOMBRE DEL ADMINISTRADOR
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const fotoPerfil = document.querySelector(".perfil .pfp");
    const nombreDropdown = document.getElementById("admin-nombre-dropdown");

    if (!fotoPerfil) return;

    try {

        const { data: { user }, error: authError } =
            await client.auth.getUser();

        if (authError || !user) {
            console.error("No se pudo obtener el administrador:", authError);
            return;
        }

        const { data: usuario, error } = await client
            .from("Usuarios")
            .select("nombre, apellido, avatar")
            .eq("id", user.id)
            .single();

        if (error || !usuario) {
            console.error("Error al cargar datos del administrador:", error);
            return;
        }

        // Cargar fotografía del administrador
        fotoPerfil.onerror = () => {
            fotoPerfil.onerror = null;
            fotoPerfil.src = RUTA_FOTO_DEFAULT;
        };

        fotoPerfil.src = usuario.avatar || RUTA_FOTO_DEFAULT;

        // Nombre del administrador
        if (nombreDropdown) {
            const nombreCompleto =
                `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim();

            nombreDropdown.textContent =
                nombreCompleto || "Administrador";
        }

    } catch (error) {

        console.error("Error cargando perfil del administrador:", error);

        fotoPerfil.src = RUTA_FOTO_DEFAULT;

    }

});
