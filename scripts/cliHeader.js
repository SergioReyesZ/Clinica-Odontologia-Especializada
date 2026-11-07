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
    const btnNotificaciones = document.getElementById('btnNotificacionesDropdown');
    const dropdownNotificaciones = document.getElementById('dropdownNotificaciones');

    if (btnPerfil && dropdownPerfil) {
        // Abrir/cerrar al dar clic en el perfil
        btnPerfil.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el clic se propague al resto de la página
            dropdownNotificaciones.classList.remove('mostrar'); // Cierra el dropdown de notificaciones si está abierto
            dropdownPerfil.classList.toggle('mostrar');
        });

        // Cerrar el modal al hacer clic en cualquier otro lado
        document.addEventListener('click', (e) => {
            if (!dropdownPerfil.contains(e.target) && !btnPerfil.contains(e.target)) {
                dropdownPerfil.classList.remove('mostrar');
            }
        });
    }

    if (btnNotificaciones && dropdownNotificaciones) {
        // Abrir/cerrar al dar clic en el botón de notificaciones
        btnNotificaciones.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownPerfil.classList.remove('mostrar'); // Cierra el dropdown de perfil si está abierto
            dropdownNotificaciones.classList.toggle('mostrar');
        });

        // Cerrar el modal al hacer clic en cualquier otro lado
        document.addEventListener('click', (e) => {
            if (!dropdownNotificaciones.contains(e.target) && !btnNotificaciones.contains(e.target)) {
                dropdownNotificaciones.classList.remove('mostrar');
            }
        });
    }

    /* OBTENER DATOS DE USUARIO DESDE SUPABASE */
document.addEventListener('DOMContentLoaded', async () => {
    const contenedorPrincipal = document.querySelector('.contenedor-principal');
    const imgPerfil = document.querySelector('.btn-perfil .pfp');
    const txtNombreHeader = document.getElementById('header-nombre-usuario');
    const txtBienvenida = document.getElementById('bienvenida-usuario');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    const AVATAR_DEFAULT = '../iconos/perfil.png';

    // Funcionalidad de cerrar sesión
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', async (e) => {
            e.preventDefault(); 
            try {
                const { error } = await client.auth.signOut();
                if (error) throw error;
                window.location.href = '../index.html';
            } catch (err) {
                console.error("Error al cerrar sesión:", err.message);
                alert("Ocurrió un error al intentar cerrar sesión.");
            }
        });
    }

    try {
        const { data: { user }, error: authError } = await client.auth.getUser();

        if (authError || !user) {
            window.location.href = '../index.html';
            return;
        }

        const { data: usuarioData, error: dbError } = await client
            .from('Usuarios')
            .select('nombre, apellido, avatar')
            .eq('id', user.id)
            .maybeSingle();

        if (dbError) {
            console.error("Error al obtener datos del usuario:", dbError.message);
        }

        // 1. Asignamos los datos directamente en el DOM ANTES de mostrar la pantalla
        const nombre = usuarioData?.nombre || user.user_metadata?.nombre || 'Usuario';
        const apellido = usuarioData?.apellido || user.user_metadata?.apellido || '';
        const avatar = usuarioData?.avatar;

        const nombreCompleto = `${nombre} ${apellido}`.trim();
        
        if (txtNombreHeader) txtNombreHeader.textContent = nombreCompleto;
        if (txtBienvenida) txtBienvenida.textContent = `¡Hola ${nombre}!`;

        if (imgPerfil) {
            imgPerfil.src = (avatar && avatar.trim() !== '') ? avatar : AVATAR_DEFAULT;
            imgPerfil.onerror = () => { imgPerfil.src = AVATAR_DEFAULT; };
        }

    } catch (err) {
        console.error("Error inesperado cargando la sesión:", err);
    } finally {
        // 2. Revelamos todo de golpe solo cuando los textos ya están puestos en el DOM
        if (contenedorPrincipal) {
            contenedorPrincipal.classList.remove('cargando');
        }
    }
});