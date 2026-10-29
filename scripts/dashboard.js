const tarjetas = document.getElementById("tarjetas");
const ver = document.getElementById("ver");
const verPacientes = document.getElementById("ver-pacientes");
const tarjetasPacientes = document.getElementById("tarjetas-pacientes")

ver.addEventListener('click', ()=>{
    ver.classList.toggle("voltear");
    tarjetas.classList.toggle("ocultar");
});


verPacientes.addEventListener('click', ()=>{
    verPacientes.classList.toggle("voltear");
    tarjetasPacientes.classList.toggle("ocultar");
})


// BUSCADOR DE CITAS - PANEL ADMINISTRATIVO

(() => {
    const init = () => {
        const input = document.getElementById('buscar-paciente');
        const clear = document.getElementById('limpiar-busqueda');
        const select = document.getElementById('filtro-servicio');
        const status = document.getElementById('resultado-busqueda');
        const empty = document.getElementById('sin-resultados');
        const list = document.querySelector('.agenda');

        if (!input || !list) return;

        // Normalizar texto para ignorar mayúsculas y acentos
        const normalize = value =>
            (value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase('es')
                .trim();

        // Filtrar citas
        const filter = () => {
            const term = normalize(input.value);
            const service = normalize(select?.value);

            const rows = [
                ...list.querySelectorAll('.citas-pacientes')
            ];

            let visible = 0;

            rows.forEach(row => {
                const name = normalize(
                    row.querySelector('.nombre-servicio .titulo')?.textContent
                );

                const type = normalize(
                    row.querySelector('.nombre-servicio p:not(.titulo)')?.textContent
                );

                const matches =
                    (!term || `${name} ${type}`.includes(term)) &&
                    (!service || type === service);

                row.hidden = !matches;
                row.style.display = matches ? '' : 'none';

                if (matches) visible++;
            });

            // Mostrar u ocultar botón de limpiar
            if (clear) clear.hidden = !input.value;

            // Contador de resultados
            if (status) {
                status.textContent = (term || service)
                    ? `${visible} ${visible === 1 ? 'resultado' : 'resultados'}`
                    : '';
            }

            // Mensaje cuando no hay coincidencias
            if (empty) {
                empty.hidden = visible !== 0 || rows.length === 0;
            }
        };

        // Buscar mientras se escribe
        input.addEventListener('input', filter);

        // Filtrar por servicio
        select?.addEventListener('change', filter);

        // Limpiar búsqueda
        clear?.addEventListener('click', () => {
            input.value = '';
            filter();
            input.focus();
        });

        // Detectar cuando la agenda se actualiza dinámicamente
        const observer = new MutationObserver(records => {
            if (records.some(record =>
                record.type === 'childList' &&
                [...record.addedNodes, ...record.removedNodes].some(
                    node => node.nodeType === 1 &&
                    (
                        node.matches?.('.citas-pacientes') ||
                        node.querySelector?.('.citas-pacientes')
                    )
                )
            )) {
                filter();
            }
        });

        observer.observe(list, {
            childList: true,
            subtree: true
        });

        filter();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
