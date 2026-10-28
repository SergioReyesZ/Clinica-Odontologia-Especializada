document.addEventListener("DOMContentLoaded", () => {
    const menu = document.querySelector(".menu");
    const opciones = document.querySelectorAll(".opcion");
    const linea = document.querySelector(".linea-flotante");

    // Función auxiliar para posicionar la línea en un elemento específico
    const posicionarLinea = (elemento) => {
        const anchoOpcion = elemento.offsetWidth;
        const posicionIzquierda = elemento.offsetLeft;

        linea.style.width = `${anchoOpcion}px`;
        linea.style.left = `${posicionIzquierda}px`;
        linea.style.opacity = "1";
    };

    // 1. Detectar si ya hay una opción con la clase "activo" al cargar la página
    const opcionActivaInicial = document.querySelector(".opcion.activo");
    if (opcionActivaInicial) {
        menu.classList.add("tiene-activo");
        posicionarLinea(opcionActivaInicial);
    }

    opciones.forEach(opcion => {
        // Al pasar el mouse, se mueve temporalmente a esa opción
        opcion.addEventListener("mouseenter", (e) => {
            posicionarLinea(e.target);
        });

        // Al hacer clic, definimos esa opción como la "activa" fija
        opcion.addEventListener("click", (e) => {
            opciones.ward?.(); // por si acaso
            opciones.forEach(opt => opt.classList.remove("activo"));
            e.target.classList.add("activo");
            menu.classList.add("tiene-activo");
            posicionarLinea(e.target);
        });
    });

    // Si el cursor sale del menú, regresa a la opción activa (o se oculta si no hay ninguna activa)
    menu.addEventListener("mouseleave", () => {
        const opcionActiva = document.querySelector(".opcion.activo");
        if (opcionActiva) {
            posicionarLinea(opcionActiva);
        } else {
            menu.classList.remove("tiene-activo");
            linea.style.opacity = "0";
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

window.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');
    const content = document.getElementById('contenedor');

    // Función para actualizar el margen dinámicamente
    const ajustarMargen = () => {
        const headerHeight = header.offsetHeight;
        content.style.marginTop = `${headerHeight + 25}px`;
    };

    ajustarMargen();
    window.addEventListener('resize', ajustarMargen);
});