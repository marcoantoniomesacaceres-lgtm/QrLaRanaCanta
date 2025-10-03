import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_por_defecto';

// Definimos una interfaz para el payload de nuestro token
interface UserPayload extends JwtPayload {
  userId: number;
  tableId: number;
  nick: string;
  rol: string;
}

// Extendemos la interfaz Request de Express para añadir nuestra propiedad 'user'
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (token == null) {
    return res.status(401).json({ message: 'Acceso denegado. No se proveyó un token.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
    req.user = user as UserPayload;
    next(); // El token es válido, continuamos a la ruta solicitada
  });
};