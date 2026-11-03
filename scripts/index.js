
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
   FORM DE REGISTRO PARA LA API 
================================= */
const btnRegistrarse = document.getElementById('btn-registrarse');
const inputNombre = document.getElementById('reg-nombre');
const inputApellido = document.getElementById('reg-apellido');
const inputTelefono = document.getElementById('reg-telefono'); 
const inputCorreo = document.getElementById('reg-correo');
const inputPassword = document.getElementById('reg-password');
const feedbackRegistro = document.getElementById('feedback-registro');

btnRegistrarse.addEventListener('click', async () => {
    const nombre = inputNombre.value.trim();
    const apellido = inputApellido.value.trim();
    const telefono = inputTelefono.value.trim(); 
    const email = inputCorreo.value.trim();
    const password = inputPassword.value.trim();

    feedbackRegistro.style.color = "#e74c3c"; // Rojo para errores

    // 1. Validar campos vacíos
    if (!email || !password || !nombre || !apellido) {
        feedbackRegistro.textContent = "Por favor, llena todos los campos.";
        return;
    }

    // 2. Validar longitud de nombre y apellido
    if (nombre.length < 2 || apellido.length < 2) {
        feedbackRegistro.textContent = "Nombre y apellido deben tener al menos 2 caracteres.";
        return;
    }

    // 3. Validar teléfono (Opcional: si se ingresa, debe tener exactamente 10 dígitos numéricos)
    if (telefono !== "") {
        const regexTelefono = /^[0-9]{10}$/;
        if (!regexTelefono.test(telefono)) {
            feedbackRegistro.textContent = "El teléfono debe tener exactamente 10 números.";
            return;
        }
    }

    // 4. Validar contraseña (Mínimo de Supabase)
    if (password.length < 6) {
        feedbackRegistro.textContent = "La contraseña debe tener al menos 6 caracteres.";
        return;
    }

    try {
        btnRegistrarse.disabled = true;
        feedbackRegistro.style.color = "#3498db";
        feedbackRegistro.textContent = "Creando cuenta...";

        // 5. Enviar a Supabase (incluyendo el teléfono en la metadata)
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { 
                    nombre: nombre, 
                    apellido: apellido,
                    telefono: telefono 
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
        
        // Traducción de error de correo duplicado
        if (error.message.includes("already registered")) {
            feedbackRegistro.textContent = "Este correo ya está registrado.";
        } else {
            feedbackRegistro.textContent = "Hubo un error: " + error.message;
        }
    } finally {
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

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue sola

    const email = inputLoginCorreo.value.trim();
    const password = inputLoginPassword.value.trim();

    feedbackLogin.style.color = "#e74c3c";

    if (!email || !password) {
        feedbackLogin.textContent = "Por favor, ingresa tu correo y contraseña.";
        return;
    }

    try {
        btnIniciarSesion.disabled = true;
        feedbackLogin.style.color = "#3498db";
        feedbackLogin.textContent = "Iniciando sesión...";

        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        feedbackLogin.style.color = "#2ecc71";
        feedbackLogin.textContent = "¡Bienvenido! Redirigiendo...";
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Error al iniciar sesión:", error.message);
        feedbackLogin.style.color = "#e74c3c";
        
        if (error.message.includes("Invalid login credentials")) {
            feedbackLogin.textContent = "Correo o contraseña incorrectos.";
        } else {
            feedbackLogin.textContent = "Error: " + error.message;
        }
    } finally {
        btnIniciarSesion.disabled = false;
    }
});