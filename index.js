import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Configurar variables de entorno
//mas entorno
dotenv.config();

// Configurar el cliente de Supabase
const supabaseUrl = 'https://rgyntyarllwnycgugrqq.supabase.co'; // URL de tu proyecto Supabase
const supabaseKey = process.env.SUPABASE_KEY; // Tu clave de API desde .env
const supabase = createClient(supabaseUrl, supabaseKey);

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
            .from('usuario') // Nombre de tu tabla
            .select('id_usuario, nombre_usuario, email'); // Campos que quieres obtener

        if (error) {
            throw error;
        }

        res.json(data); // Responde con los datos obtenidos
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Configurar el puerto y arrancar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
