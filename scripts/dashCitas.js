let fechaActual = new Date();

const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const diasNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const contenedorDias = document.getElementById('contenedor-dias');
const etiquetaMesAnio = document.getElementById('mes-anio-actual');
const btnAnterior = document.getElementById('btn-anterior');
const btnSiguiente = document.getElementById('btn-siguiente');
const btnHoy = document.getElementById('btn-hoy');
const inputFechaOculto = document.getElementById('input-fecha-oculto');

function actualizarAgenda(direccion = '') {
    contenedorDias.classList.remove('animar-derecha', 'animar-izquierda');

    contenedorDias.innerHTML = '';
    
    etiquetaMesAnio.textContent = `${mesesNombres[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;
    btnHoy.textContent = `${fechaActual.getDate()} ${mesesNombres[fechaActual.getMonth()].substring(0,3)}.`;

    const anio = fechaActual.getFullYear();
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    inputFechaOculto.value = `${anio}-${mes}-${dia}`;

    for (let i = -3; i <= 3; i++) {
        let fechaBucle = new Date(fechaActual);
        fechaBucle.setDate(fechaActual.getDate() + i);

        let nombreDiaSemana = diasNombres[fechaBucle.getDay()];
        let numeroDia = fechaBucle.getDate();

        let divDia = document.createElement('div');
        divDia.className = i === 0 ? 'dia actual' : 'dia';

        divDia.innerHTML = `
            <p>${nombreDiaSemana}</p>
            <p class="titulo">${numeroDia}</p>
            ${i === 0 ? '<i class="bi bi-dot"></i>' : ''}
        `;

        divDia.style.cursor = 'pointer';
        divDia.addEventListener('click', () => {
            let dir = i < 0 ? 'derecha' : (i > 0 ? 'izquierda' : '');
            fechaActual = new Date(fechaBucle);
            actualizarAgenda(dir);
        });

        contenedorDias.appendChild(divDia);
    }

    void contenedorDias.offsetWidth;

    if (direccion === 'izquierda') {
        contenedorDias.classList.add('animar-izquierda');
    } else if (direccion === 'derecha') {
        contenedorDias.classList.add('animar-derecha');
    }
}
btnAnterior.addEventListener('click', () => {
    fechaActual.setDate(fechaActual.getDate() - 1);
    actualizarAgenda('derecha');
});

btnSiguiente.addEventListener('click', () => {
    fechaActual.setDate(fechaActual.getDate() + 1);
    actualizarAgenda('izquierda');
});

inputFechaOculto.addEventListener('change', (e) => {
    const [anio, mes, dia] = e.target.value.split('-');
    let nuevaFechaSeleccionada = new Date(anio, mes - 1, dia);
    
    let dir = nuevaFechaSeleccionada < fechaActual ? 'derecha' : 'izquierda';
    fechaActual = nuevaFechaSeleccionada;
    actualizarAgenda(dir);
});

document.addEventListener('DOMContentLoaded', () => {
    actualizarAgenda();
});