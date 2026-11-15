/* Control de skeleton para páginas administrativas y odontólogo.
   No interviene en las funciones de la aplicación; espera a que terminen
   las peticiones iniciales y después retira únicamente la capa visual. */
(() => {
    let peticionesPendientes = 0;
    const fetchOriginal = window.fetch;

    if (typeof fetchOriginal === "function" && !window.__skeletonFetchMonitor) {
        window.__skeletonFetchMonitor = true;
        window.fetch = function (...args) {
            peticionesPendientes++;
            let resultado;
            try {
                resultado = fetchOriginal.apply(this, args);
            } catch (error) {
                peticionesPendientes = Math.max(0, peticionesPendientes - 1);
                throw error;
            }
            return Promise.resolve(resultado).finally(() => {
                peticionesPendientes = Math.max(0, peticionesPendientes - 1);
            });
        };
    }

    const ocultar = () => {
        document.querySelector(".skeleton-page")?.remove();
        document.body.classList.remove("dashboard-cargando");
    };

    window.addEventListener("load", () => {
        const inicio = Date.now();
        let sinPeticionesDesde = 0;
        const revisar = () => {
            if (peticionesPendientes === 0) {
                if (!sinPeticionesDesde) sinPeticionesDesde = Date.now();
                if (Date.now() - sinPeticionesDesde >= 450) {
                    ocultar();
                    return;
                }
            } else {
                sinPeticionesDesde = 0;
            }

            if (Date.now() - inicio >= 12000) {
                ocultar();
                return;
            }
            window.setTimeout(revisar, 100);
        };
        revisar();
    }, { once: true });
})();