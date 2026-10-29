
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
