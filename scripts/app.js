// Configura tus credenciales directas
const supabaseUrl = 'https://uaaqxwajafiljfdcuegf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhYXF4d2FqYWZpbGpmZGN1ZWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMDEzODksImV4cCI6MjEwNzY3NzM4OX0.-YKTFK_iSDYcddHb4dKltlOijeND7aCJXVm-RVOx448';

// Inicializamos usando el objeto global que trae el script de arriba
const client = supabase.createClient(supabaseUrl, supabaseKey);

async function probarConexion() {
    try {
        const { data, error } = await client
            .from('Usuarios')
            .select('*');

        if (error) throw error;

        console.log('¡Conexión exitosa! Datos recibidos:', data);
    } catch (error) {
        console.error('Error al conectar con Supabase:', error.message);
    }
}

probarConexion();