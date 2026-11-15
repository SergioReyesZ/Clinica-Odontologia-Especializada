/* =========================================================
   COMPROBANTE.JS
   Generador único de comprobantes para cliente, administrador
   y odontólogo. La hoja impresa siempre usa tamaño Carta.
========================================================= */
(() => {
    "use strict";

    const scriptActual = document.currentScript ||
        document.querySelector('script[src*="comprobante.js"]');

    const baseCompartida = scriptActual?.src
        ? new URL(".", scriptActual.src)
        : new URL(".", document.baseURI);

    const cssComprobante = new URL("../estilos/comprobante.css", baseCompartida).href;
    const logoComprobante = new URL("../iconos/logo.png", baseCompartida).href;

    const escapar = valor => String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[caracter]));

    function normalizarCosto(valor) {
        const numero = Number(String(valor ?? "0").replace(/[^\d.-]/g, ""));
        return (Number.isFinite(numero) ? numero : 0).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function generarComprobanteCita(datos = {}) {
        const ventana = window.open("", "_blank");

        if (!ventana) {
            alert("Permite las ventanas emergentes para generar el comprobante.");
            return false;
        }

        const contenido = {
            id: escapar(datos.id),
            paciente: escapar(datos.paciente || "No especificado"),
            odontologo: escapar(datos.odontologo || "Dra. Virginia Hernández Sánchez"),
            servicio: escapar(datos.servicio || "No especificado"),
            fecha: escapar(datos.fecha || "No especificada"),
            hora: escapar(datos.hora || "No especificada"),
            costo: escapar(normalizarCosto(datos.costo))
        };

        ventana.document.open();
        ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Cita - Odontología Especializada</title>
    <link rel="stylesheet" href="${cssComprobante}">
</head>
<body>
    <main class="comprobante">
        <header class="comprobante-header">
            <img class="comprobante-logo" src="${logoComprobante}" alt="Logo de Odontología Especializada">
            <h1>Odontología Especializada</h1>
            <p>Jesús Elías Piña #1003, Col. Del Pueblo</p>
            <p>Tampico, Tamaulipas, C.P. 89190</p>
            <p>Tel: 833 695 7177 | dravickyhernandez@outlook.com</p>
            <p>Cel: 833 171 8013 | WhatsApp: 833 695 7177</p>
            <h2>COMPROBANTE DE CITA</h2>
        </header>

        <section class="comprobante-detalles">
            <p><strong>Folio / ID de Cita:</strong><span>#${contenido.id}</span></p>
            <p><strong>Paciente:</strong><span>${contenido.paciente}</span></p>
            <p><strong>Odontólogo:</strong><span>${contenido.odontologo}</span></p>
            <p><strong>Servicio programado:</strong><span>${contenido.servicio}</span></p>
            <p><strong>Fecha de la cita:</strong><span>${contenido.fecha}</span></p>
            <p><strong>Hora de la cita:</strong><span>${contenido.hora}</span></p>
        </section>

        <section class="comprobante-costo">
            <span>Costo estimado</span>
            <strong>$${contenido.costo} MXN</strong>
        </section>

        <section class="comprobante-recomendaciones">
            <h3>Recomendaciones para su visita</h3>
            <ul>
                <li>Le pedimos amablemente llegar 10 minutos antes de su cita.</li>
                <li>En caso de no poder asistir, le solicitamos cancelar con al menos 24 horas de anticipación desde su portal web.</li>
                <li>Si tiene dudas o requiere indicaciones especiales, no dude en contactarnos.</li>
            </ul>
        </section>

        <footer class="comprobante-footer">
            Generado desde el Portal de Pacientes - Odontología Especializada
        </footer>

        <button class="comprobante-imprimir" type="button" onclick="window.print()">
            Imprimir / Guardar como PDF
        </button>
    </main>

    <script>
        window.addEventListener("load", function () {
            const imagenes = Array.from(document.images);
            Promise.all(imagenes.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            })).then(() => setTimeout(() => window.print(), 400));
        });
    <\/script>
</body>
</html>`);
        ventana.document.close();
        return true;
    }

    // API compartida para todos los módulos.
    window.generarComprobanteCita = generarComprobanteCita;

    // Compatibilidad con el botón de comprobante de la agenda del odontólogo.
    window.imprimirComprobanteOdontologo = function (cita, datosExtra = {}) {
        if (!cita) {
            alert("No se encontró la cita para generar el comprobante.");
            return false;
        }

        // Igual que citas.js: conservar literalmente HH:mm de fecha_hora.
        // No usar Date(), toLocaleTimeString() ni aplicar desfases horarios.
        const fechaHora = String(cita.fecha_hora || "");
        const [fechaISO = "", horaISO = ""] = fechaHora.split("T");
        const [anio = "", mes = "", dia = ""] = fechaISO.split("-");
        const coincidenciaHora = horaISO.match(/^(\d{2}):(\d{2})/);
        const hora = coincidenciaHora
            ? `${coincidenciaHora[1]}:${coincidenciaHora[2]}`
            : "No especificada";

        return generarComprobanteCita({
            id: cita.id,
            paciente: datosExtra.paciente,
            odontologo: datosExtra.odontologo,
            servicio: datosExtra.servicio,
            fecha: datosExtra.fecha || (dia && mes && anio ? `${dia}/${mes}/${anio}` : ""),
            hora,
            costo: datosExtra.costo
        });
    };
})();
