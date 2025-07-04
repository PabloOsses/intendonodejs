import express from 'express'; 
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// variables de entorno
dotenv.config();

//  cliente de Supabase
const supabaseUrl = 'https://rgyntyarllwnycgugrqq.supabase.co'; 
const supabaseKey = process.env.SUPABASE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);
const SECRET_KEY = process.env.SECRET_KEY;

// aqui esta Express
const app = express();
app.use(cors());
app.use(express.json());

const emailTransporter = nodemailer.createTransport(
  process.env.NODE_ENV === 'production'
    ? {
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD
        }
      }
    : {
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS
        }
      }
);

// ruta de prueba
app.get('/', (req, res) => {
    res.send('API funcionando correctamente');
});

// ruta de pruebas para ver lista de usuarios
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
//enpoint del lgoin
app.post('/auth/login', async (req, res) => {
    try {
        const { email, contrasena } = req.body;

        // hay contraseña y email ?
        if (!email || !contrasena) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // se busca el usuario en la base de datos
        const { data: usuario, error } = await supabase
            .from('usuario')
            .select('id_usuario, contrasena')
            .eq('email', email)
            .single();

        if (error) throw error;
        
        // en caso de que el usuario no exista
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        //  comparacion entre contraseñas
        if (usuario.contrasena !== contrasena) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // si todo es correcto se debolvera el id del usuario
        res.json({ 
            id_usuario: usuario.id_usuario,
            message: 'Autenticación exitosa'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al autenticar' });
    }
});
// endpoint para registrar nuevos usuarios
app.post('/auth/register', async (req, res) => {
    try {
        const { nombre_usuario, email, contrasena } = req.body;

        //hay nombre , mail y contraseña?
        if (!nombre_usuario || !email || !contrasena) {
            return res.status(400).json({ 
                error: 'Todos los campos son requeridos: nombre_usuario, email, contrasena' 
            });
        }

        // todo paso a paso, primero ver si la cuenta ya existe
        const { data: existingUser, error: emailError } = await supabase
            .from('usuario')
            .select('email')
            .eq('email', email)
            .single();
        //si existe se va a esta parte del codigo y hay return
        if (existingUser) {
            return res.status(409).json({ 
                error: 'El email ya está registrado' 
            });
        }

        // si todo es ok hasta hora se procede a registrar
        const { data: newUser, error: insertError } = await supabase
            .from('usuario')
            .insert([
                { 
                    nombre_usuario: nombre_usuario,
                    email: email,
                    contrasena: contrasena 
                }
            ])
            .select('id_usuario, nombre_usuario, email, fecha_registro');

        if (insertError) throw insertError;

        // ver que el ususario se registro correctamente
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
// endpoint para obtener el ranking de puntajes
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

// endpoint: Obtener mejores puntuaciones por nivel
// NO USADO, la vista de la BD fue descartada
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
// endpint que obtine un mail y retorna la puntuacion del jugador
app.get('/puntaje-usuario', async (req, res) => {
    try {
        const { email } = req.query;

        // como siempre, promero ver que el mail fue proporcinado
        if (!email) {
            return res.status(400).json({ error: 'El parámetro email es requerido' });
        }

        // consultaremos el usuario por mail
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario, nombre_usuario, email')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // vista anking global para obtener el puntaje
        const { data: ranking, error: rankingError } = await supabase
            .from('ranking_global')
            .select('puntuacion_total')
            .eq('id_usuario', usuario.id_usuario)
            .single();

        if (rankingError) throw rankingError;

        // respuesta exitosa
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
// endpoint para obtener los logros de usuario
app.get('/logros-usuario', async (req, res) => {
    try {
        const { email } = req.query;

        // como siempre, promero ver que el mail fue proporcinado
        if (!email) {
            return res.status(400).json({ error: 'El parámetro email es requerido' });
        }

        // obtener el ID del usuario a partir del email
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener TODOS los logros disponibles
        const { data: todosLogros, error: logrosError } = await supabase
            .from('logro')
            .select('id_logro, nombre_logro');

        if (logrosError) throw logrosError;

        // obtener los logros desbloqueados por el usuario
        const { data: logrosDesbloqueados, error: desbloqueadosError } = await supabase
            .from('usuario_logro')
            .select('id_logro')
            .eq('id_usuario', usuario.id_usuario);

        if (desbloqueadosError) throw desbloqueadosError;

        // almacenar los ids de los logros desbloqueados (esto sirve en el siguiente trozo)
        const desbloqueadosSet = new Set(logrosDesbloqueados.map(l => l.id_logro));

        // construir la respuesta con todos los logros y su estado
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
// endpoint para desbloquear un logro para un usuario
app.post('/desbloquear-logro', async (req, res) => {
    try {
        const { email, id_logro } = req.body;

        // como siempre, promero ver que el mail fue proporcinado (y el logro tambien)
        if (!email || !id_logro) {
            return res.status(400).json({ 
                error: 'Los campos email e id_logro son requeridos' 
            });
        }

        // obtener el ID del usuario a partir del email
        const { data: usuario, error: usuarioError } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('email', email)
            .single();

        if (usuarioError) throw usuarioError;
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // verificar que el logro existe
        const { data: logro, error: logroError } = await supabase
            .from('logro')
            .select('id_logro')
            .eq('id_logro', id_logro)
            .single();

        if (logroError) throw logroError;
        if (!logro) {
            return res.status(404).json({ error: 'Logro no encontrado' });
        }

        // caso: el usuario ya tiene el logro?
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

        // caso: Insertar el nuevo registro en usuario_logro
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

        // respuesta exitosa
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

        // como siempre, promero ver que el mail fue proporcinado 
        if (!email) {
            return res.status(400).json({ 
                error: 'El parámetro email es requerido' 
            });
        }

        // obtener el ID del usuario a partir del email
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

        // obtener configuracion del usuario
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

        // valores por defecto en caso de no tener configo
        if (!configuracion) {
            return res.json({
                volumen_musica: 1.0,
                volumen_efectos: 1.0,
                dificultad: 'facil',
                mensaje: usuario.id_usuario
            });
        }

        // configuración encontrada
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
// endpoint para acumular puntuación
app.post('/acumular-puntuacion', async (req, res) => {
    try {
        const { email, id_nivel, puntos } = req.body;

        // como siempre, promero ver que el mail fue proporcinado 
        if (!email || !id_nivel || puntos === undefined) {
            return res.status(400).json({ 
                error: 'Los campos email, id_nivel y puntos son requeridos' 
            });
        }

        if (isNaN(puntos) || puntos < 0) {
            return res.status(400).json({ 
                error: 'Los puntos deben ser un número positivo' 
            });
        }

        // ID del usuario a partir del email
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

        // existe ususrio?
        const { data: nivel, error: nivelError } = await supabase
            .from('nivel')
            .select('id_nivel')
            .eq('id_nivel', id_nivel)
            .single();

        if (nivelError) throw nivelError;
        if (!nivel) {
            return res.status(404).json({ 
                error: 'Nivel no encontrado' 
            });
        }

        // puntuacion actual
        const { data: puntuacionActual, error: puntuacionError } = await supabase
            .from('puntuacion')
            .select('puntos')
            .eq('id_usuario', usuario.id_usuario)
            .eq('id_nivel', id_nivel)
            .single();

        if (puntuacionError && puntuacionError.code !== 'PGRST116') throw puntuacionError;

        const nuevosPuntos = puntuacionActual ? 
            parseInt(puntuacionActual.puntos) + parseInt(puntos) : 
            parseInt(puntos);

        // insertar o actualizar la puntuación
        const { data: nuevaPuntuacion, error: upsertError } = await supabase
            .from('puntuacion')
            .upsert({
                id_usuario: usuario.id_usuario,
                id_nivel: id_nivel,
                puntos: nuevosPuntos,
                fecha: new Date().toISOString() 
                //NOTA no estamos usando la fecha en ninguna parte del proyecto
                //EN su momento se penso que este dato serviria de algo
            }, {
                onConflict: 'id_usuario,id_nivel'
            })
            .select();

        if (upsertError) throw upsertError;

        //respuesta exitosa
        res.status(200).json({
            message: 'Puntuación acumulada exitosamente',
            id_usuario: usuario.id_usuario,
            id_nivel: id_nivel,
            puntos_anteriores: puntuacionActual?.puntos || 0,
            puntos_agregados: parseInt(puntos),
            puntos_totales: nuevosPuntos,
            puntuacion: nuevaPuntuacion[0]
        });

    } catch (error) {
        console.error('Error en /acumular-puntuacion:', error);
        res.status(500).json({ 
            error: 'Error al acumular la puntuación',
            details: error.message 
        });
    }
});

// de aqui comienza la dolorosa busqueda de enviar mail al usuario
function generarContrasenaProvisional() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let contrasena = '';
  for (let i = 0; i < 7; i++) {
    contrasena += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return contrasena;
}
function hashPassword(password) {
  // hash SHA-256 (Godot se esta usando la misma encriptacion)
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
}


// configuracion de  servicio MailTrap
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});

app.post('/auth/olvide-contrasena', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validar que se proporcionó el email
    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    // Verificar si el usuario existe en la base de datos
    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('email', email)
      .single();

    // Si hay error o no existe el usuario, devolver misma respuesta por seguridad
    if (userError || !user) {
      return res.json({ 
        message: 'Si el email existe, se ha enviado una nueva contraseña provisional' 
      });
    }

    // Generar contraseña provisional de 8 caracteres alfanuméricos
    const contrasenaProvisional = Math.random().toString(36).slice(2, 10);
    const hashedPassword = hashPassword(contrasenaProvisional);

    // Actualizar solo la contraseña en la base de datos
    const { error: updateError } = await supabase
      .from('usuario')
      .update({ 
        contrasena: hashedPassword 
      })
      .eq('email', email);

    if (updateError) throw updateError;

    // Configurar y enviar el email con MailTrap
    const mailOptions = {
      from: '"Soporte de Menti Activa" <no-reply@mentiactiva.com>',
      to: email,
      subject: 'Tu contraseña provisional - Menti Activa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2b6cb0; text-align: center;">Recuperación de Contraseña</h2>
          <p style="font-size: 16px;">Hemos generado una contraseña provisional para tu cuenta:</p>
          
          <div style="background: #f7fafc; padding: 15px; margin: 20px 0; border-radius: 6px; text-align: center; font-size: 18px;">
            <strong>${contrasenaProvisional}</strong>
          </div>
          
          <p style="font-size: 14px; color: #4a5568;">Por seguridad, te recomendamos:</p>
          <ol style="font-size: 14px; color: #4a5568; padding-left: 20px;">
            <li>Iniciar sesión con esta contraseña</li>
            <li>Cambiarla inmediatamente por una personalizada, según instrucciones de la aplicación</li>
          </ol>
          
          <p style="font-size: 14px; color: #718096; margin-top: 30px;">
            Si no solicitaste este cambio, por favor ignora este mensaje o contacta a nuestro equipo.
          </p>
        </div>
      `,
      text: `Recuperación de Contraseña - Menti Activa\n\n` +
            `Tu contraseña provisional es: ${contrasenaProvisional}\n\n` +
            `Para reiniciar tu contraseña, escribe la contraseña temporal según instrucciones de la aplicación\n` +
            `Si no solicitaste este cambio, por favor ignora este mensaje.`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email enviado con MailTrap (${process.env.NODE_ENV}):`, info.messageId, 'a:', email);
    
    // Responder al cliente
    res.json({ 
      message: 'Si el email existe, se ha enviado una nueva contraseña provisional' 
    });

  } catch (error) {
    console.error('Error en recuperación de contraseña:', {
      error: error.message,
      email: req.body.email,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
    
    res.status(500).json({ 
      error: 'Error al procesar la solicitud de recuperación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Endpoint para verificar si un email existe
app.get('/verificar-email', async (req, res) => {
    try {
        const { email } = req.query;

        // Validar que se proporcionó el email
        if (!email) {
            return res.status(400).json({ error: 'El parámetro email es requerido' });
        }

        // Consultar la base de datos
        const { data: usuario, error } = await supabase
            .from('usuario')
            .select('email')
            .eq('email', email)
            .single();

        if (error) throw error;

        // Devolver true si existe, false si no
        res.json({
            email: email,
            existe: !!usuario
        });

    } catch (error) {
        console.error('Error en /verificar-email:', error);
        res.status(500).json({ 
            error: 'Error al verificar el email',
            details: error.message 
        });
    }
});
// Endpoint para verificar credenciales
app.post('/verificar-credenciales', async (req, res) => {
    try {
        const { email, contrasena } = req.body;

        // Validar que se proporcionaron ambos campos
        if (!email || !contrasena) {
            return res.status(400).json({ 
                error: 'Email y contraseña son requeridos' 
            });
        }

        // Buscar usuario en la base de datos
        const { data: usuario, error } = await supabase
            .from('usuario')
            .select('contrasena')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        // Verificar si el usuario existe y la contraseña coincide
        const credencialesValidas = usuario && usuario.contrasena === contrasena;

        res.json({
            email: email,
            credencialesValidas: credencialesValidas
        });

    } catch (error) {
        console.error('Error en /verificar-credenciales:', error);
        res.status(500).json({ 
            error: 'Error al verificar las credenciales',
            details: error.message 
        });
    }
});
// Endpoint para actualizar contraseña
//  NOTA: RECORDAR QUE LA CONTRASEÑA SE ENCRIPTA EN LA APP

app.put('/actualizar-contrasena', async (req, res) => {
    try {
        const { email, contrasenaHash } = req.body;

        // Validación básica
        if (!email || !contrasenaHash) {
            return res.status(400).json({ 
                success: false,
                message: 'Se requieren email y hash de contraseña'
            });
        }

        // Verificar primero si el usuario existe
        const { data: usuarioExistente, error: errorVerificacion } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('email', email)
            .single();

        if (errorVerificacion || !usuarioExistente) {
            return res.status(200).json({
                success: false,
                message: 'No se encontró usuario con ese email'
            });
        }

        // Actualización directa del hash en la base de datos
        const { error } = await supabase
            .from('usuario')
            .update({ 
                contrasena: contrasenaHash
                // No actualizamos fecha_registro porque es DEFAULT NOW()
            })
            .eq('email', email);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error en actualizar-contrasena:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno al actualizar contraseña'
        });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});




