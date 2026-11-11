
/**
 * Evita que un formulario procese varios envíos simultáneos.
 *
 * El manejador debe devolver true cuando el registro se haya guardado
 * correctamente. Así el botón permanece bloqueado mientras se recarga
 * la página. Si devuelve false o se produce un error, se desbloquea.
 */
function evitarDobleEnvio(manejador, selectorBoton) {
    let enProceso = false;

    return async function (evento) {
        if (enProceso) {
            evento.preventDefault();
            evento.stopImmediatePropagation();
            return false;
        }

        enProceso = true;

        const formulario = evento.currentTarget;
        const boton = (selectorBoton
            ? document.querySelector(selectorBoton)
            : evento.submitter || formulario.querySelector(
                'button[type="submit"], input[type="submit"]'
            )
        );

        const estadoOriginal = boton ? boton.disabled : false;

        if (boton) {
            boton.disabled = true;
            boton.setAttribute('aria-busy', 'true');
        }

        let mantenerBloqueo = false;

        try {
            const resultado = await manejador.call(this, evento);
            mantenerBloqueo = resultado === true;
            return resultado;
        } finally {
            if (!mantenerBloqueo) {
                enProceso = false;

                if (boton) {
                    boton.disabled = estadoOriginal;
                    boton.removeAttribute('aria-busy');
                }
            }
        }
    };
}
