import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './auth';
import db from './db';

export const adminAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  // Primero, usamos el middleware de autenticación normal para verificar el token.
  authenticateToken(req, res, async () => {
    try {
      // Si el token es válido, req.user estará disponible.
      if (!req.user) {
        return res.status(403).json({ message: 'Acceso denegado. Usuario no autenticado.' });
      }

      // Ahora consultamos la base de datos para obtener el rol actual del usuario.
      const { rows } = await db.query('SELECT rol FROM usuarios WHERE id = $1', [req.user.userId]);

      if (rows.length > 0 && rows[0].rol === 'admin') {
        next(); // El usuario es un admin, continuamos.
      } else {
        res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
      }
    } catch (error) {
      console.error('Error en el middleware de admin:', error);
      res.status(500).json({ message: 'Error interno del servidor al verificar permisos.' });
    }
  });
};