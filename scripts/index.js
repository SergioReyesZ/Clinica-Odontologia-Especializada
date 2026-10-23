document.addEventListener("DOMContentLoaded", () => {
    const menu = document.querySelector(".menu");
    const opciones = document.querySelectorAll(".opcion");
    const linea = document.querySelector(".linea-flotante");

    opciones.forEach(opcion => {
        opcion.addEventListener("mouseenter", (e) => {
            // Calculamos la posición del enlace relativo al contenedor .menu
            const anchoOpcion = e.target.offsetWidth;
            const posicionIzquierda = e.target.offsetLeft;

            // Le damos el ancho y la posición exacta a la línea
            linea.style.width = `${anchoOpcion}px`;
            linea.style.left = `${posicionIzquierda}px`;
            linea.style.opacity = "1";
        });
    });

    // Opcional: Ocultar la línea si el cursor sale por completo del menú
    menu.addEventListener("mouseleave", () => {
        linea.style.opacity = "0";
    });
});
