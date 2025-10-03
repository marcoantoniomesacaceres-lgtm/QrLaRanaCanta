import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import db from './config/db'; // Importamos nuestro módulo de base de datos
import mesaRoutes from './api/mesaRoutes'; // Importamos las rutas de mesa
import songRoutes from './api/songRoutes'; // Importamos las rutas de canciones
import searchRoutes from './api/searchRoutes'; // Importamos las rutas de búsqueda

// --- 1. Inicialización del Servidor ---
const app = express();
const server = http.createServer(app);

// Configuración de Socket.IO con CORS para permitir la conexión del frontend
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // La URL de tu frontend
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8080;

// --- 2. Middlewares ---
// Middleware para parsear el body de las peticiones a JSON
app.use(express.json());

// --- 3. Rutas de la API (REST) ---
// Endpoint de prueba para verificar que el servidor está funcionando
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Hacemos una consulta simple para verificar la conexión a la DB
    const dbResult = await db.query('SELECT NOW()');
    res.status(200).json({ 
      status: 'ok', 
      message: 'Backend está vivo!',
      dbConnection: 'exitosa',
      dbTime: dbResult.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Error en el backend',
      dbConnection: 'fallida',
      error: (error as Error).message,
    });
  }
});

// Usamos el router de mesas para todas las rutas que empiecen con /api
app.use('/api', searchRoutes);
app.use('/api', mesaRoutes(io)); // Inyectamos la instancia 'io' al router de mesas
app.use('/api', songRoutes(io)); // Inyectamos la instancia 'io' al router de canciones

// --- 4. Lógica de WebSockets (Socket.IO) ---
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Usuario conectado: ${socket.id}`);

  // Escucha el evento 'join_table' que el cliente emitirá al escanear el QR
  socket.on('join_table', (tableId: string) => {
    console.log(`[Socket.IO] Usuario ${socket.id} se unió a la mesa: ${tableId}`);
    
    // Une al socket a una "sala" específica para esa mesa.
    // Esto permite enviar mensajes solo a los clientes de esa mesa.
    socket.join(tableId);

    // Opcional: notificar al cliente que se unió con éxito
    socket.emit('joined_successfully', `Conectado a la mesa ${tableId}`);
  });

  // Maneja la desconexión del usuario
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Usuario desconectado: ${socket.id}`);
  });
});

// --- 5. Iniciar el Servidor ---
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});