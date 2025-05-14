import express from 'express'; 
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
// Configurar variables de entorno
dotenv.config();

// Configurar el cliente de Supabase
const supabaseUrl = 'https://rgyntyarllwnycgugrqq.supabase.co'; // URL de tu proyecto Supabase
const supabaseKey = process.env.SUPABASE_KEY; // Tu clave de API desde .env
const supabase = createClient(supabaseUrl, supabaseKey);
const SECRET_KEY = process.env.SECRET_KEY;
// Inicializar Express
const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API funcionando correctamente 🚀');
});

// Ruta para obtener usuarios
app.get('/usuarios', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuario')
            .select('id_usuario, nombre_usuario, email');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});
app.post('/auth/login', async (req, res) => {
    try {
        const { email, contrasena } = req.body;

        // Validar que se proporcionen email y contraseña
        if (!email || !contrasena) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario en la base de datos
        const { data: usuario, error } = await supabase
            .from('usuario')
            .select('id_usuario, contrasena')
            .eq('email', email)
            .single();

        if (error) throw error;
        
        // Verificar si el usuario existe
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // IMPORTANTE: En una aplicación real, deberías usar bcrypt para comparar contraseñas hasheadas
        // Aquí estoy haciendo una comparación directa solo como ejemplo
        if (usuario.contrasena !== contrasena) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Si todo es correcto, devolver el id del usuario
        res.json({ 
            id_usuario: usuario.id_usuario,
            message: 'Autenticación exitosa'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al autenticar' });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});




