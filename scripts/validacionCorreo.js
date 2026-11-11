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