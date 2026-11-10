
/* ==========================================
   SEGURIDAD DEL PANEL DEL ODONTÓLOGO
========================================== */

function irAlInicioOdontologo() {
    const enRecursos = window.location.pathname.includes("/recursos/");

    window.location.replace(
        enRecursos ? "../index.html" : "index.html"
    );
}

window.odontologoAccessReady = (async function () {

    document.body.style.visibility = "hidden";

    try {
        // 1. Verificar sesión
        const {
            data: { user },
            error: authError
        } = await client.auth.getUser();

        if (authError || !user) {
            irAlInicioOdontologo();
            return null;
        }

        // 2. Verificar rol
        const { data: usuario, error: errorUsuario } = await client
            .from("Usuarios")
            .select("id, nombre, apellido, avatar, rol")
            .eq("id", user.id)
            .single();

        if (errorUsuario || !usuario) {
            console.error("Error verificando usuario:", errorUsuario);
            irAlInicioOdontologo();
            return null;
        }

        if (Number(usuario.rol) !== 3) {
            console.warn("Acceso denegado: el usuario no es odontólogo.");
            irAlInicioOdontologo();
            return null;
        }

        // 3. Obtener el ID real del odontólogo
        const { data: odontologo, error: errorOdontologo } = await client
            .from("Odontologos")
            .select("id, Cedula, Usuario")
            .eq("Usuario", user.id)
            .single();

        if (errorOdontologo || !odontologo) {
            console.error("No se encontró el registro del odontólogo:", errorOdontologo);
            irAlInicioOdontologo();
            return null;
        }

        // 4. Guardar contexto para la agenda
        const contexto = {
            user,
            usuario,
            odontologoId: odontologo.id,
            odontologo
        };

        window.odontologoActual = contexto;

        document.body.style.visibility = "visible";

        console.log("Acceso autorizado al odontólogo:", odontologo.id);

        return contexto;

    } catch (error) {

        console.error("Error de seguridad del odontólogo:", error);

        irAlInicioOdontologo();

        return null;
    }

})();


/* ==========================================
   CERRAR SESIÓN
========================================== */

document.addEventListener("click", async function (e) {

    const boton = e.target.closest?.("#btnCerrarSesion");

    if (!boton) return;

    e.preventDefault();
    e.stopPropagation();

    try {

        boton.style.pointerEvents = "none";

        const { error } = await client.auth.signOut({
            scope: "global"
        });

        if (error) throw error;

        irAlInicioOdontologo();

    } catch (error) {

        console.error("Error al cerrar sesión:", error);

        alert("No se pudo cerrar la sesión.");

        boton.style.pointerEvents = "auto";
    }

});
