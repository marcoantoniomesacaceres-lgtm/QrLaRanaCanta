import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import db from '../config/db';
import { authenticateToken } from '../middleware/auth';

export default function (io: Server) {
  const router = Router();

  // ¡Importante! Aplicamos el middleware a TODAS las rutas definidas en este archivo.
  // Nadie podrá acceder a estas rutas sin un token válido.
  router.use(authenticateToken);

  // POST /api/songs - Añadir una nueva canción a la lista del usuario
  router.post('/songs', async (req: Request, res: Response) => {
    // Gracias al middleware, tenemos la certeza de que req.user existe y es válido.
    const { userId, tableId } = req.user!;
    const { youtube_id, titulo, duracion_seconds } = req.body;

    if (!youtube_id || !titulo) {
      return res.status(400).json({ message: 'Los campos youtube_id y titulo son requeridos.' });
    }

    try {
      const newSongResult = await db.query(
        `INSERT INTO canciones (youtube_id, titulo, duracion_seconds, usuario_id, estado)
         VALUES ($1, $2, $3, $4, 'pendiente')
         RETURNING *`,
        [youtube_id, titulo, duracion_seconds, userId]
      );

      const newSong = newSongResult.rows[0];

      // ¡Ahora podemos emitir el evento!
      // Enviamos la notificación a la sala específica de la mesa.
      io.to(`mesa-${tableId}`).emit('song_added', newSong);

      res.status(201).json(newSong);
    } catch (error) {
      console.error('Error al añadir la canción:', error);
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

  // Aquí puedes añadir más rutas relacionadas con canciones...

  return router;
}