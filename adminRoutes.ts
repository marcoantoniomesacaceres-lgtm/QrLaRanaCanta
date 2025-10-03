import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import db from '../config/db';
import { adminAuthenticate } from '../middleware/adminAuth';

export default function (io: Server) {
  const router = Router();

  // Protegemos todas las rutas de este archivo con el middleware de admin.
  router.use(adminAuthenticate);

  // Función helper para actualizar el estado de una canción
  const updateSongStatus = async (songId: number, status: 'aprobada' | 'rechazada') => {
    const result = await db.query(
      `UPDATE canciones SET estado = $1 WHERE id = $2 RETURNING *`,
      [status, songId]
    );
    return result.rows[0];
  };

  // GET /api/admin/songs - Obtener canciones (se puede filtrar por estado, ej: /api/admin/songs?status=pendiente)
  router.get('/admin/songs', async (req: Request, res: Response) => {
    const { status, page = '1', limit = '10' } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    try {
      const params: any[] = [];
      let whereClause = '';

      if (status) {
        whereClause = 'WHERE c.estado = $1';
        params.push(status);
      }

      // Primera consulta: obtener el conteo total de elementos que coinciden con el filtro
      const countQuery = `SELECT COUNT(*) FROM canciones c ${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limitNumber);

      // Segunda consulta: obtener los datos paginados
      const dataParams = [...params, limitNumber, offset];
      const dataQuery = `
        SELECT c.id, c.titulo, c.estado, u.nick as solicitante
        FROM canciones c
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        ${whereClause}
        ORDER BY c.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const { rows } = await db.query(dataQuery, dataParams);

      // Devolver una respuesta estructurada con los datos y la información de paginación
      res.status(200).json({
        data: rows,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

  // POST /api/admin/songs/:id/approve - Aprobar una canción
  router.post('/admin/songs/:id/approve', async (req: Request, res: Response) => {
    try {
      const songId = parseInt(req.params.id, 10);
      const updatedSong = await updateSongStatus(songId, 'aprobada');

      if (!updatedSong) {
        return res.status(404).json({ message: 'Canción no encontrada.' });
      }

      // Notificamos a todos los clientes sobre el cambio de estado.
      io.emit('queue_updated', updatedSong);
      res.status(200).json(updatedSong);
    } catch (error) {
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

  // POST /api/admin/songs/:id/reject - Rechazar una canción
  router.post('/admin/songs/:id/reject', async (req: Request, res: Response) => {
    try {
      const songId = parseInt(req.params.id, 10);
      const updatedSong = await updateSongStatus(songId, 'rechazada');
      io.emit('queue_updated', updatedSong);
      res.status(200).json(updatedSong);
    } catch (error) {
      res.status(500).json({ message: 'Error interno del servidor.' });
    }
  });

  return router;
}