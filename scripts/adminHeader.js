document.addEventListener("DOMContentLoaded", () => {
    const menu = document.querySelector(".menu");
    const opciones = document.querySelectorAll(".opcion");
    const linea = document.querySelector(".linea-flotante");

    // Función auxiliar para posicionar la línea
    const posicionarLinea = (elemento) => {
        const anchoOpcion = elemento.offsetWidth;
        const posicionIzquierda = elemento.offsetLeft;

        linea.style.width = `${anchoOpcion}px`;
        linea.style.left = `${posicionIzquierda}px`;
        linea.style.opacity = "1";
    };

    // Detectar si ya hay una opción activa al cargar
    const opcionActivaInicial = document.querySelector(".opcion.activo");
    if (opcionActivaInicial) {
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

    menu.addEventListener("mouseleave", () => {
        const opcionActiva = document.querySelector(".opcion.activo");
        if (opcionActiva) {
            posicionarLinea(opcionActiva);
        } else {
            menu.classList.remove("tiene-activo");
            linea.style.opacity = "0";
        }
    });

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

    if (btnMenu) {
        btnMenu.addEventListener("click", () => {
            menuNav.classList.toggle("activo");
            botonesHeader.classList.toggle("activo");
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
    
    // Y cada que cambien el tamaño de la ventana
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

document.addEventListener("DOMContentLoaded", async () => {

    const fotoPerfil = document.querySelector(".perfil .pfp");
    const nombreDropdown = document.getElementById("admin-nombre-dropdown");

    if (!fotoPerfil) return;

    try {

        // Obtener usuario autenticado
        const { data: { user }, error: authError } =
            await client.auth.getUser();

        if (authError || !user) {
            console.error("No se pudo obtener el administrador:", authError);
            return;
        }

        // Consultar información del administrador
        const { data: usuario, error } = await client
            .from("Usuarios")
            .select("nombre, apellido, avatar")
            .eq("id", user.id)
            .single();

        if (error || !usuario) {
            console.error("Error al cargar datos del administrador:", error);
            return;
        }

        // Mostrar foto guardada
        if (usuario.avatar) {
            fotoPerfil.src = usuario.avatar;
        } else {
            fotoPerfil.src = "iconos/perfil.png";
        }

        fotoPerfil.onerror = () => {
            fotoPerfil.src = "iconos/perfil.png";
        };

        // Mostrar nombre completo dentro del desplegable
        if (nombreDropdown) {
            const nombreCompleto =
                `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim();

            nombreDropdown.textContent = nombreCompleto || "Administrador";
        }

    } catch (error) {

        console.error("Error cargando perfil del administrador:", error);

    }

});