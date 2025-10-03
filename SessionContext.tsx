import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../lib/apiClient';
import jwt_decode from 'jwt-decode';

// --- Interfaces ---
interface User {
  id: number;
  nick: string;
  nivel: string;
  rol: 'cliente' | 'admin';
  puntos: number;
}

interface Table {
  id: number;
  nombre: string;
}

interface DecodedToken {
  userId: number;
  rol: 'cliente' | 'admin';
  exp: number;
}

interface SessionContextType {
  user: User | null;
  table: Table | null;
  socket: Socket | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  connect: (qrCode: string) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    socket?.disconnect();
    localStorage.removeItem('authToken');
    setUser(null);
    setTable(null);
    setSocket(null);
  }, [socket]);

  // Efecto para intentar restaurar la sesión al cargar la app
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded: DecodedToken = jwt_decode(token);
        if (decoded.exp * 1000 > Date.now()) {
          // El token es válido, podríamos obtener los datos del usuario con /api/me
          // Por simplicidad, aquí solo preparamos el terreno.
          // En una app real, llamarías a apiClient.get('/me') y popularías el estado.
        } else {
          logout(); // El token ha expirado
        }
      } catch (e) {
        console.error('Token inválido en localStorage', e);
        logout();
      }
    }
    setIsLoading(false);
  }, [logout]);

  const connect = async (qrCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{ token: string; usuario: User; mesa: Table }>(
        `/mesa/${qrCode}/connect`,
        {}
      );
      const { token, usuario, mesa } = response;

      localStorage.setItem('authToken', token);
      setUser(usuario);
      setTable(mesa);

      const newSocket = io('http://localhost:8080');
      newSocket.on('connect', () => {
        newSocket.emit('join_table', `mesa-${mesa.id}`);
      });
      setSocket(newSocket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = { user, table, socket, isAuthenticated: !!user, isLoading, error, connect, logout };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession debe ser usado dentro de un SessionProvider');
  }
  return context;
};