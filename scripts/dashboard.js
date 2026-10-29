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