/* ==========================================
   SEGURIDAD DEL PANEL ADMINISTRATIVO
   El ID 2 corresponde al administrador
========================================== */

function irAlInicioAdmin() {
    const enRecursos = window.location.pathname.includes("/recursos/");
    window.location.replace(enRecursos ? "../index.html" : "index.html");
}

window.adminAccessReady = (async function () {

    document.body.style.visibility = "hidden";

    try {
        const { data: { user }, error: authError } =
            await client.auth.getUser();

        if (authError || !user) {
            irAlInicioAdmin();
            return false;
        }

        const { data: usuario, error } = await client
            .from("Usuarios")
            .select("rol")
            .eq("id", user.id)
            .single();

        if (error || !usuario) {
            console.error("Error verificando administrador:", error);
            irAlInicioAdmin();
            return false;
        }

        if (Number(usuario.rol) !== 2) {
            irAlInicioAdmin();
            return false;
        }

        document.body.style.visibility = "visible";
        console.log("Administrador autorizado.");

        return true;

    } catch (error) {
        console.error("Error de seguridad:", error);
        irAlInicioAdmin();
        return false;
    }

})();


/* CERRAR SESIÓN */

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

        irAlInicioAdmin();

    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("No se pudo cerrar la sesión.");
        boton.style.pointerEvents = "auto";
    }

});