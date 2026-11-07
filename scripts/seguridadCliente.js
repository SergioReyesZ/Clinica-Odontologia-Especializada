/* ==========================================
   SEGURIDAD DEL PANEL DEL CLIENTE
========================================== */

function irAlInicioCliente() {
    const enRecursos = window.location.pathname.includes("/recursos/");
    window.location.replace(enRecursos ? "../index.html" : "index.html");
}

window.clienteAccessReady = (async function () {

    document.body.style.visibility = "hidden";

    try {
        const { data: { user }, error: authError } =
            await client.auth.getUser();

        if (authError || !user) {
            irAlInicioCliente();
            return false;
        }

        const { data: usuario, error } = await client
            .from("Usuarios")
            .select("rol")
            .eq("id", user.id)
            .single();

        if (error || !usuario) {
            console.error("Error verificando cliente:", error);
            irAlInicioCliente();
            return false;
        }

        // El rol 2 está reservado para administradores
        if (Number(usuario.rol) === 2) {
            irAlInicioCliente();
            return false;
        }

        document.body.style.visibility = "visible";
        console.log("Acceso autorizado.");

        return true;

    } catch (error) {
        console.error("Error de seguridad:", error);
        irAlInicioCliente();
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

        irAlInicioCliente();

    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("No se pudo cerrar la sesión.");
        boton.style.pointerEvents = "auto";
    }

});