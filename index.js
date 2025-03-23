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

// Ruta para agregar un usuario (POST)
app.post('/usuarios', async (req, res) => {
    try {
        const { nombre_usuario, email, contraseña } = req.body;
        const { data, error } = await supabase
            .from('usuario')
            .insert([{ nombre_usuario, email, contraseña }]);

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agregar usuario' });
    }
});

// Ruta para actualizar un usuario (PUT)
app.put('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_usuario, email, contraseña } = req.body;

        // Crear un objeto solo con los campos que no sean undefined
        const updateData = {};
        if (nombre_usuario !== undefined) updateData.nombre_usuario = nombre_usuario;
        if (email !== undefined) updateData.email = email;
        if (contraseña !== undefined) updateData.contraseña = contraseña;

        // Verificar si hay algo para actualizar
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No hay datos para actualizar' });
        }

        // Ejecutar la actualización en Supabase
        const { data, error } = await supabase
            .from('usuario')
            .update(updateData)
            .eq('id_usuario', id);

        if (error) throw error;
        res.json({ message: 'Usuario actualizado correctamente', data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// Ruta para eliminar un usuario (DELETE)
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('usuario')
            .delete()
            .eq('id_usuario', id);

        if (error) throw error;
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// Configurar el puerto y arrancar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

