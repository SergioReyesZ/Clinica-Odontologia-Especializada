function filtrarServicios(categoria, botonClickeado) {
    // 1. Quitar la clase "activo" de todos los botones
    const botones = document.querySelectorAll('.btn-filtro');
    botones.forEach(btn => btn.classList.remove('activo'));
    
    // 2. Ponerle la clase "activo" al botón que acabamos de presionar
    botonClickeado.classList.add('activo');

    // 3. Filtrar las tarjetas
    const tarjetas = document.querySelectorAll('.tarjeta-servicio');
    
    tarjetas.forEach(tarjeta => {
        if (categoria === 'todos') {
            tarjeta.classList.remove('oculto');
        } else {
            // Si la tarjeta tiene la clase de la categoría que buscamos, la mostramos. Si no, la ocultamos.
            if (tarjeta.classList.contains(categoria)) {
                tarjeta.classList.remove('oculto');
            } else {
                tarjeta.classList.add('oculto');
            }
        }
    });
}