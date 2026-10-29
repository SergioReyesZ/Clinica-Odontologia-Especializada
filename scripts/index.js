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
        content.style.marginTop = `${headerHeight}px`;
    };

    ajustarMargen();
    window.addEventListener('resize', ajustarMargen);

    /* ALERTA MODAL INICIAR SESIÓN*/

    // 1. Seleccionamos la alerta y el botón para cerrarla
    const alertaLogin = document.getElementById('alerta-login');
    const btnCerrarLogin = document.getElementById('btn-cerrar-login');
    
    // 2. Seleccionamos el botón de iniciar sesión del header
    // Nota: Como hay dos botones con la clase '.iniciar-sesion' (una en el menú móvil y otra normal), 
    // seleccionamos todos para que funcione sin importar el tamaño de pantalla.
    const botonesIniciarSesion = document.querySelectorAll('.btn.iniciar-sesion');
    
    // 3. Seleccionamos el botón de registrarse (opcional, por si quieres mostrar la misma alerta)
    const botonesRegistrarse = document.querySelectorAll('.btn.registrarse');

    // Función para mostrar la alerta
    const abrirAlerta = (e) => {
        e.preventDefault(); // Evita que la página salte
        alertaLogin.classList.add('activo');
    };

    // Función para cerrar la alerta
    const cerrarAlerta = () => {
        alertaLogin.classList.remove('activo');
    };

    // Asignamos el evento a todos los botones de "Iniciar sesión"
    botonesIniciarSesion.forEach(boton => {
        boton.addEventListener('click', abrirAlerta);
    });

    // (Opcional) Asignamos el evento a los botones de "Registrarme"
    botonesRegistrarse.forEach(boton => {
        boton.addEventListener('click', abrirAlerta);
    });

    // Evento para cerrar con la "X"
    if (btnCerrarLogin) {
        btnCerrarLogin.addEventListener('click', cerrarAlerta);
    }

    // Opcional por Experiencia de Usuario: Cerrar la alerta si hacen clic fuera de la caja blanca
    alertaLogin.addEventListener('click', (e) => {
        if (e.target === alertaLogin) {
            cerrarAlerta();
        }
    });
});