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
// Endpoint para registrar nuevos usuarios
app.post('/auth/register', async (req, res) => {
    try {
        const { nombre_usuario, email, contrasena } = req.body;

        // Validar que todos los campos requeridos estén presentes
        if (!nombre_usuario || !email || !contrasena) {
            return res.status(400).json({ 
                error: 'Todos los campos son requeridos: nombre_usuario, email, contrasena' 
            });
        }

        // Verificar si el email ya está registrado
        const { data: existingUser, error: emailError } = await supabase
            .from('usuario')
            .select('email')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ 
                error: 'El email ya está registrado' 
            });
        }

        // Insertar el nuevo usuario en la base de datos
        const { data: newUser, error: insertError } = await supabase
            .from('usuario')
            .insert([
                { 
                    nombre_usuario: nombre_usuario,
                    email: email,
                    contrasena: contrasena // IMPORTANTE: En producción deberías hashear la contraseña
                }
            ])
            .select('id_usuario, nombre_usuario, email, fecha_registro');

        if (insertError) throw insertError;

        // Devolver los datos del nuevo usuario (sin la contraseña)
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            usuario: newUser[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: 'Error al registrar el usuario',
            details: error.message 
        });
    }
});
app.get('/ranking', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ranking_global')
            .select('*')
            .order('puntuacion_total', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el ranking global' });
    }
});

// Nuevo endpoint: Obtener mejores puntuaciones por nivel
app.get('/mejores-puntuaciones', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('mejores_puntuaciones_nivel')
            .select('*');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las mejores puntuaciones' });
    }
});
// Endpoint para obtener puntaje total por email
app.get('/puntaje-usuario', async (req, res) => {
    try {
        const { email } = req.query;

        // Validar que se proporcionó el email
        if (!email) {
            return res.status(400).json({ error: 'El parámetro email es requerido' });
        }

        // Consultar el usuario por email
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario, nombre_usuario, email')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Consultar el ranking global para obtener el puntaje
        const { data: ranking, error: rankingError } = await supabase
            .from('ranking_global')
            .select('puntuacion_total')
            .eq('id_usuario', usuario.id_usuario)
            .single();

        if (rankingError) throw rankingError;

        // Respuesta exitosa
        res.json({
            id_usuario: usuario.id_usuario,
            nombre_usuario: usuario.nombre_usuario,
            email: usuario.email,
            puntuacion_total: ranking?.puntuacion_total || 0
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: 'Error al obtener el puntaje del usuario',
            details: error.message 
        });
    }
});
// Endpoint para obtener logros de usuario
app.get('/logros-usuario', async (req, res) => {
    try {
        const { email } = req.query;

        // Validar que se proporcionó el email
        if (!email) {
            return res.status(400).json({ error: 'El parámetro email es requerido' });
        }

        // 1. Obtener el ID del usuario a partir del email
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 2. Obtener TODOS los logros disponibles
        const { data: todosLogros, error: logrosError } = await supabase
            .from('logro')
            .select('id_logro, nombre_logro');

        if (logrosError) throw logrosError;

        // 3. Obtener los logros desbloqueados por el usuario
        const { data: logrosDesbloqueados, error: desbloqueadosError } = await supabase
            .from('usuario_logro')
            .select('id_logro')
            .eq('id_usuario', usuario.id_usuario);

        if (desbloqueadosError) throw desbloqueadosError;

        // Crear un Set con los IDs de logros desbloqueados para búsqueda rápida
        const desbloqueadosSet = new Set(logrosDesbloqueados.map(l => l.id_logro));

        // 4. Construir la respuesta con todos los logros y su estado
        const respuesta = todosLogros.map(logro => ({
            id_logro: logro.id_logro,
            nombre_logro: logro.nombre_logro,
            desbloqueado: desbloqueadosSet.has(logro.id_logro)
        }));

        res.json(respuesta);

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: 'Error al obtener los logros del usuario',
            details: error.message 
        });
    }
});
// Endpoint para desbloquear un logro para un usuario
app.post('/desbloquear-logro', async (req, res) => {
    try {
        const { email, id_logro } = req.body;

        // Validar que se proporcionaron los datos requeridos
        if (!email || !id_logro) {
            return res.status(400).json({ 
                error: 'Los campos email e id_logro son requeridos' 
            });
        }

        // 1. Obtener el ID del usuario a partir del email
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 2. Verificar que el logro existe
        const { data: logro, error: logroError } = await supabase
            .from('logro')
            .select('id_logro')
            .eq('id_logro', id_logro)
            .single();

        if (logroError) throw logroError;
        if (!logro) {
            return res.status(404).json({ error: 'Logro no encontrado' });
        }

        // 3. Verificar si el usuario ya tiene el logro
        const { data: logroExistente, error: existenteError } = await supabase
            .from('usuario_logro')
            .select('id_logro')
            .eq('id_usuario', usuario.id_usuario)
            .eq('id_logro', id_logro)
            .single();

        if (existenteError && existenteError.code !== 'PGRST116') throw existenteError;
        
        if (logroExistente) {
            return res.status(409).json({ 
                error: 'El usuario ya tiene este logro desbloqueado',
                id_usuario: usuario.id_usuario,
                id_logro: id_logro
            });
        }

        // 4. Insertar el nuevo registro en usuario_logro
        const { data: nuevoLogro, error: insertError } = await supabase
            .from('usuario_logro')
            .insert([
                { 
                    id_usuario: usuario.id_usuario,
                    id_logro: id_logro
                }
            ])
            .select();

        if (insertError) throw insertError;

        // 5. Respuesta exitosa
        res.status(201).json({
            message: 'Logro desbloqueado exitosamente',
            logro_desbloqueado: nuevoLogro[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: 'Error al desbloquear el logro',
            details: error.message 
        });
    }
});
app.get('/configuracion-usuario', async (req, res) => {
    try {
        const { email } = req.query;

        // Validar que se proporcionó el email
        if (!email) {
            return res.status(400).json({ 
                error: 'El parámetro email es requerido' 
            });
        }

        // 1. Obtener el ID del usuario a partir del email
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ 
                error: 'Usuario no encontrado' 
            });
        }

        // 2. Obtener la configuración del usuario
        const { data: configuracion, error: configError } = await supabase
            .from('configuracion_usuario')
            .select(`
                volumen_musica,
                volumen_efectos,
                dificultad
            `)
            .eq('id_usuario', usuario.id_usuario)
            .single();

        if (configError && configError.code !== 'PGRST116') throw configError;

        // Si no existe configuración, devolver valores por defecto
        if (!configuracion) {
            return res.json({
                volumen_musica: 1.0,
                volumen_efectos: 1.0,
                dificultad: 'facil',
                mensaje: usuario.id_usuario
            });
        }

        // 3. Devolver la configuración encontrada
        res.json(configuracion);

    } catch (error) {
        console.error('Error en /configuracion-usuario:', error);
        res.status(500).json({ 
            error: 'Error al obtener la configuración del usuario',
            details: error.message 
        });
    }
});
app.put('/actualizar-configuracion', async (req, res) => {
    try {
        const { email, volumen_musica, volumen_efectos, dificultad } = req.body;

        // Validaciones básicas
        if (!email) {
            return res.status(400).json({ 
                error: 'El campo email es requerido' 
            });
        }

        if (dificultad && !['facil', 'medio', 'dificil'].includes(dificultad)) {
            return res.status(400).json({ 
                error: 'Dificultad no válida' 
            });
        }

        // 1. Obtener el ID del usuario
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ 
                error: 'Usuario no encontrado' 
            });
        }

        // 2. Preparar los datos de actualización
        const updates = {
            id_usuario: usuario.id_usuario // Asegurarse de incluir esto
        };
        
        if (volumen_musica !== undefined) updates.volumen_musica = parseFloat(volumen_musica);
        if (volumen_efectos !== undefined) updates.volumen_efectos = parseFloat(volumen_efectos);
        if (dificultad) updates.dificultad = dificultad;

        // 3. Upsert explicando la columna de conflicto
        const { data, error } = await supabase
            .from('configuracion_usuario')
            .upsert(updates, { onConflict: 'id_usuario' })
            .select();

        if (error) throw error;

        res.json({
            mensaje: 'Configuración actualizada exitosamente',
            configuracion: data[0]
        });

    } catch (error) {
        console.error('Error en /actualizar-configuracion:', error);
        res.status(500).json({ 
            error: 'Error al actualizar la configuración',
            details: error.message 
        });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});




