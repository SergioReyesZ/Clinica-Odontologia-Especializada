function cambiarVista(idVistaDestino, botonClickeado) {
    // 1. Ocultar todas las vistas de citas
    const vistas = document.querySelectorAll('.grid-citas');
    vistas.forEach(vista => {
        vista.classList.add('oculto');
    });

    // 2. Quitar la clase 'activo' de todos los botones de filtro
    const botones = document.querySelectorAll('.filtro');
    botones.forEach(boton => {
        boton.classList.remove('activo');
    });

    // 3. Mostrar solo la vista solicitada
    document.getElementById('vista-' + idVistaDestino).classList.remove('oculto');

    // 4. Resaltar el botón que el usuario acaba de presionar
    botonClickeado.classList.add('activo');
}