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

    const alertaLogin = document.getElementById('alerta-login');
    const btnCerrarLogin = document.getElementById('header-btn-cerrar-login');
    const botonesIniciarSesion = document.querySelectorAll('.header-btn.iniciar-sesion');
    
    const botonesRegistrarse = document.querySelectorAll('.header-btn.registrarse');
    const alertaRegistrarse = document.getElementById('alerta-registrarse');
    const btnCerrarRegistrarse = document.getElementById('header-btn-cerrar-registrarse');

    const abrirAlerta = (e) => {
        e.preventDefault(); 
        alertaLogin.classList.add('activo');
    };

    const cerrarAlerta = () => {
        alertaLogin.classList.remove('activo');
    };

    const abrirAlertaRegistrarse = (e) => {
        e.preventDefault(); 
        alertaRegistrarse.classList.add('activo');
    }

    const cerrarAlertaRegistrarse = () => {
        alertaRegistrarse.classList.remove('activo');
    }

    botonesIniciarSesion.forEach(boton => {
        boton.addEventListener('click', abrirAlerta);
    });

    botonesRegistrarse.forEach(boton => {
        boton.addEventListener('click', abrirAlertaRegistrarse);
    });

    if (btnCerrarRegistrarse) {
        btnCerrarRegistrarse.addEventListener('click', cerrarAlertaRegistrarse);
    }

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

    alertaRegistrarse.addEventListener('click', (e) => {
        if (e.target === alertaRegistrarse) {
            cerrarAlertaRegistrarse();
        }
    });

    // 1. Selecciona SOLO el enlace que está dentro del modal de REGISTRO (para abrir el Login)
const enlacesIniciarSesion = document.querySelectorAll('#alerta-registrarse .texto-registro a');
enlacesIniciarSesion.forEach(enlace => {
    enlace.addEventListener('click', (e) => {
        e.preventDefault();
        cerrarAlertaRegistrarse();
        abrirAlerta(e); // Abre Login
    });
});

// 2. Selecciona SOLO el enlace que está dentro del modal de LOGIN (para abrir el Registro)
const enlacesRegistrarse = document.querySelectorAll('#alerta-login .texto-registro a');
enlacesRegistrarse.forEach(enlace => {
    enlace.addEventListener('click', (e) => {
        e.preventDefault();
        cerrarAlerta();
        abrirAlertaRegistrarse(e); // Abre Registro
    });
});
});