import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import db from '../config/db'; // Importamos nuestro módulo de base de datos
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';

export default function (io: Server) {
  const router = Router();

  // Asegúrate de que JWT_SECRET esté disponible.
  // En un entorno de producción, esto se cargaría desde variables de entorno.
  const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_por_defecto';

  // Endpoint para conectar un usuario a una mesa a través de un QR
  router.post('/mesa/:qr/connect', async (req: Request, res: Response) => {
    const { qr } = req.params;
    // El cliente puede enviar un nick opcional, si no, generamos uno aleatorio.
    const { nick } = req.body;
    const userNick = nick || `Invitado_${Math.floor(Math.random() * 1000)}`;

    try {
      // 1. Buscar la mesa usando el código QR
      const mesaResult = await db.query(
        'SELECT id, nombre FROM mesas WHERE qr_code = $1 AND estado = \'activa\'',
        [qr]
      );

      if (mesaResult.rows.length === 0) {
        return res.status(404).json({ message: 'Mesa no encontrada o inactiva.' });
      }
      const mesa = mesaResult.rows[0];

      // 2. Crear un nuevo usuario asociado a la mesa
      const usuarioResult = await db.query(
        'INSERT INTO usuarios (nick, mesa_id) VALUES ($1, $2) RETURNING id, nick, nivel, puntos',
        [userNick, mesa.id]
      );
      const nuevoUsuario = usuarioResult.rows[0];

      // 3. Generar un token JWT para la sesión del cliente
      const token = jwt.sign(
        { userId: nuevoUsuario.id, tableId: mesa.id, nick: nuevoUsuario.nick },
        JWT_SECRET,
        { expiresIn: '8h' } // El token expira en 8 horas
      );

      // ¡Ahora podemos emitir un evento!
      // Notificamos a todos en la sala de la mesa que un nuevo usuario se ha unido.
      io.to(`mesa-${mesa.id}`).emit('user_joined', { nick: nuevoUsuario.nick });

      // 4. Devolver la información necesaria al frontend
      res.status(201).json({ token, usuario: nuevoUsuario, mesa });
    } catch (error) {
      console.error('Error al conectar a la mesa:', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

  // --- Ejemplo de una ruta protegida ---
  // Solo se puede acceder a esta ruta si se proporciona un token JWT válido.
  router.get('/me', authenticateToken, (req: Request, res: Response) => {
    // Gracias al middleware 'authenticateToken', la información del usuario
    // decodificada del token está disponible en 'req.user'.
    res.status(200).json({
      message: 'Información del usuario obtenida exitosamente.',
      user: req.user,
    });
  });

  return router;
}