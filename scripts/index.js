
document.addEventListener("DOMContentLoaded", () => {

    const header = document.querySelector("#header");
    const ubicacion = document.querySelector("#ubicacion");

    if (!header || !ubicacion) return;

    // Selecciona todos los enlaces hacia ubicación
    const enlaces = document.querySelectorAll('a[href="#ubicacion"]');

    enlaces.forEach(enlace => {

        enlace.addEventListener("click", (e) => {
            e.preventDefault();

            const alturaHeader = header.getBoundingClientRect().height;

            const alturaVisible = window.innerHeight - alturaHeader;

            const posicionSeccion =
                ubicacion.getBoundingClientRect().top + window.scrollY;

            const alturaSeccion = ubicacion.offsetHeight;

            // Centrar ubicación en el espacio disponible
            let destino = posicionSeccion
                - alturaHeader
                - (alturaVisible - alturaSeccion) / 2;

            // Evitar posiciones fuera del documento
            const maxScroll =
                document.documentElement.scrollHeight - window.innerHeight;

            destino = Math.max(0, Math.min(destino, maxScroll));

            window.scrollTo({
                top: destino,
                behavior: "smooth"
            });

            history.replaceState(null, "", "#ubicacion");
        });

    });

});


/* =================================
   DETECTOR DE ERRORES COMUNES EN CORREOS
================================= */

function detectarErrorCorreo(email) {

    const dominiosConocidos = [
        "gmail.com",
        "hotmail.com",
        "outlook.com",
        "yahoo.com",
        "icloud.com",
        "live.com",
        "proton.me",
        "protonmail.com"
    ];

    const partes = email.toLowerCase().split("@");

    if (partes.length !== 2) return null;

    const [usuario, dominio] = partes;

    // Si el dominio ya es correcto, no hacer nada.
    if (dominiosConocidos.includes(dominio)) return null;

    // Distancia de edición para detectar errores de escritura.
    function distanciaEdicion(a, b) {
        const matriz = Array.from(
            { length: a.length + 1 },
            () => Array(b.length + 1).fill(0)
        );

        for (let i = 0; i <= a.length; i++) matriz[i][0] = i;
        for (let j = 0; j <= b.length; j++) matriz[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {

                const costo = a[i - 1] === b[j - 1] ? 0 : 1;

                matriz[i][j] = Math.min(
                    matriz[i - 1][j] + 1,
                    matriz[i][j - 1] + 1,
                    matriz[i - 1][j - 1] + costo
                );
            }
        }

        return matriz[a.length][b.length];
    }

    let mejorCoincidencia = null;
    let menorDistancia = Infinity;

    for (const dominioCorrecto of dominiosConocidos) {

        const distancia = distanciaEdicion(dominio, dominioCorrecto);

        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            mejorCoincidencia = dominioCorrecto;
        }
    }

    // Solo sugerir si existe una coincidencia muy cercana.
    if (menorDistancia <= 2) {
        return `${usuario}@${mejorCoincidencia}`;
    }

    return null;
}

/* =================================
   VALIDACIÓN DE CORREO ELECTRÓNICO
================================= */

async function esCorreoEntregable(email) {

    // 1. Validar estructura del correo
    const regexCorreo = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

    if (!regexCorreo.test(email)) {
        return {
            valido: false,
            servicioError: false,
            motivo: "formato"
        };
    }

    // 2. Consultar Disify
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const respuesta = await fetch(
            `https://disify.com/api/email/${encodeURIComponent(email)}`,
            { signal: controller.signal }
        );

        if (!respuesta.ok) {
            throw new Error("No fue posible consultar Disify.");
        }

        const datos = await respuesta.json();

        console.log("Validación de correo:", datos);

        // Exigir que todos los campos necesarios estén presentes
        if (
            typeof datos.format !== "boolean" ||
            typeof datos.dns !== "boolean" ||
            typeof datos.disposable !== "boolean" ||
            typeof datos.whitelist !== "boolean"
        ) {
            throw new Error("Respuesta incompleta de Disify.");
        }

        // 3. Validaciones individuales

        if (!datos.format) {
            return { valido: false, servicioError: false, motivo: "formato" };
        }

        if (!datos.dns) {
            return { valido: false, servicioError: false, motivo: "dns" };
        }

        if (datos.disposable) {
            return { valido: false, servicioError: false, motivo: "temporal" };
        }

        if (!datos.whitelist) {
            return { valido: false, servicioError: false, motivo: "whitelist" };
        }

        // Todas las condiciones se cumplen
        return {
            valido: true,
            servicioError: false,
            motivo: null
        };

    } catch (error) {

        console.error("Error verificando correo:", error);

        // Si Disify falla, no permitir el registro
        return {
            valido: false,
            servicioError: true,
            motivo: "servicio"
        };

    } finally {
        clearTimeout(timeout);
    }
}


/* =================================
   FORM DE REGISTRO
================================= */
const formRegistro = document.getElementById('form-registro');
const btnRegistrarse = document.getElementById('btn-registrarse');
const inputNombre = document.getElementById('reg-nombre');
const inputApellido = document.getElementById('reg-apellido');
const inputTelefono = document.getElementById('reg-telefono');
const inputCorreo = document.getElementById('reg-correo');
const inputPassword = document.getElementById('reg-password');
const inputConfirmPassword = document.getElementById('reg-confirm-password');
const feedbackRegistro = document.getElementById('feedback-registro');
let isRegistrando = false;

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Evitar envíos múltiples (Enter o Clics simultáneos)
    if (isRegistrando) return;

    const nombre = inputNombre.value.trim();
    const apellido = inputApellido.value.trim();
    const telefono = inputTelefono.value.trim();
    const email = inputCorreo.value.trim();
    const password = inputPassword.value.trim();
    const confirmPassword = inputConfirmPassword.value.trim();
    const checkboxTerminos = document.getElementById("aceptar-terminos");

    feedbackRegistro.style.color = "#e74c3c";

    // --- VALIDACIONES LOCALES RÁPIDAS ---
    if (!email || !password || !nombre || !apellido || !confirmPassword) {
        feedbackRegistro.textContent = "Por favor, llena todos los campos.";
        return;
    }


    // Validar que nombre y apellido solamente contengan letras
    // Se permiten acentos, ñ, espacios, guiones y apóstrofes.
    const regexNombre = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

    if (nombre.length < 2 || apellido.length < 2) {
        feedbackRegistro.textContent =
            "Nombre y apellido deben tener al menos 2 caracteres.";
        return;
    }

    if (!regexNombre.test(nombre)) {
        feedbackRegistro.textContent =
            "El nombre solamente debe contener letras.";
        inputNombre.focus();
        return;
    }

    if (!regexNombre.test(apellido)) {
        feedbackRegistro.textContent =
            "El apellido solamente debe contener letras.";
        inputApellido.focus();
        return;
    }


    function esTelefonoValido(tel) {
        const regexBase = /^[2-9]\d{9}$/;
        if (!regexBase.test(tel)) return false;
        if (/^(\d)\1{9}$/.test(tel)) return false;
        const falsosComunes = [
            "1234567890", "0123456789", "9876543210",
            "1231231234", "1234567891", "0000000000"
        ];
        return !falsosComunes.includes(tel);
    }

    if (telefono !== "" && !esTelefonoValido(telefono)) {
        feedbackRegistro.textContent = "Ingresa un número de teléfono válido de 10 dígitos.";
        inputTelefono.focus();
        return;
    }

    if (password.length < 6) {
        feedbackRegistro.textContent = "La contraseña debe tener al menos 6 caracteres.";
        return;
    }

    if (password !== confirmPassword) {
        feedbackRegistro.textContent = "Las contraseñas no coinciden.";
        return;
    }

    if (!checkboxTerminos || !checkboxTerminos.checked) {
        feedbackRegistro.textContent = "Debes aceptar los términos y condiciones para continuar.";
        checkboxTerminos?.focus();
        return;
    }

    try {
        // Bloqueo inmediato del formulario ANTES de consultar la API
        isRegistrando = true;
        btnRegistrarse.disabled = true;
        feedbackRegistro.style.color = "#3498db";
        feedbackRegistro.textContent = "Verificando disponibilidad del correo...";

        // 2. Detectar errores comunes de escritura
        const sugerenciaCorreo = detectarErrorCorreo(email);

        if (sugerenciaCorreo) {

            feedbackRegistro.style.color = "#e74c3c";

            feedbackRegistro.textContent =
                `Verifica tu correo antes de continuar.`;

            inputCorreo.focus();
            return;
        }
        // 3. Consulta de entregabilidad con Disify
        const resultadoCorreo = await esCorreoEntregable(email);



        if (!resultadoCorreo.valido) {

            feedbackRegistro.style.color = "#e74c3c";

            switch (resultadoCorreo.motivo) {

                case "formato":
                    feedbackRegistro.textContent =
                        "El formato del correo electrónico no es válido.";
                    break;

                case "dns":
                    feedbackRegistro.textContent =
                        "El dominio del correo no cuenta con registros válidos.";
                    break;

                case "temporal":
                    feedbackRegistro.textContent =
                        "No se permiten correos electrónicos temporales o desechables.";
                    break;

                case "whitelist":
                    feedbackRegistro.textContent =
                        "No se permite este dominio. Utiliza un proveedor de correo reconocido.";
                    break;

                default:
                    feedbackRegistro.textContent =
                        "No fue posible verificar el correo. Inténtalo nuevamente.";
                    break;
            }

            inputCorreo.focus();
            return;
        }


        feedbackRegistro.textContent = "Creando cuenta...";

        // 4. Petición a Supabase
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nombre: nombre,
                    apellido: apellido,
                    telefono: telefono || null
                }
            }
        });

        if (error) throw error;

        feedbackRegistro.style.color = "#2ecc71";
        feedbackRegistro.textContent = "¡Cuenta creada! Redirigiendo...";
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Error en el registro:", error.message);
        feedbackRegistro.style.color = "#e74c3c";

        if (error.message.includes("already registered")) {
            feedbackRegistro.textContent = "Este correo ya está registrado.";
        } else {
            feedbackRegistro.textContent = "Hubo un error: " + error.message;
        }
    } finally {
        // Liberar el estado independientemente del resultado
        isRegistrando = false;
        btnRegistrarse.disabled = false;
    }
});

/* =================================
   INICIO DE SESIÓN 
================================= */
const formLogin = document.getElementById('form-login');
const btnIniciarSesion = document.getElementById('btn-iniciar-sesion');
const inputLoginCorreo = document.getElementById('login-correo');
const inputLoginPassword = document.getElementById('login-password');
const feedbackLogin = document.getElementById('feedback-login');
let isLoggingIn = false;

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isLoggingIn) return;

    const email = inputLoginCorreo.value.trim();
    const password = inputLoginPassword.value.trim();

    feedbackLogin.style.color = "#e74c3c";

    if (!email || !password) {
        feedbackLogin.textContent = "Por favor, ingresa tu correo y contraseña.";
        return;
    }

    try {
        isLoggingIn = true;
        btnIniciarSesion.disabled = true;
        feedbackLogin.style.color = "#3498db";
        feedbackLogin.textContent = "Iniciando sesión...";

        const { data: authData, error: authError } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) throw authError;

        const userId = authData.user.id;
        const { data: userData, error: userError } = await client
            .from('Usuarios')
            .select('rol')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        feedbackLogin.style.color = "#2ecc71";
        feedbackLogin.textContent = "¡Bienvenido! Redirigiendo...";

        if (userData.rol === 2) window.location.href = 'adminDashboard.html';
        if (userData.rol === 1) window.location.href = 'dashboard.html';
        if (userData.rol === 3) window.location.href = 'odontologoDashboard.html';

    } catch (error) {
        console.error("Error al iniciar sesión:", error.message);
        feedbackLogin.style.color = "#e74c3c";

        if (error.message.includes("Invalid login credentials")) {
            feedbackLogin.textContent = "Correo o contraseña incorrectos.";
        } else {
            feedbackLogin.textContent = "Error: " + error.message;
        }
    } finally {
        isLoggingIn = false;
        btnIniciarSesion.disabled = false;
    }
});

// Calcular años de experiencia desde 1997
const contadorAnios = document.querySelector('.circulo-edad .años');

if (contadorAnios) {
    contadorAnios.textContent = `${new Date().getFullYear() - 1997}+`;
}