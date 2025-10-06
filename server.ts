import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

app.use(express.json()); // Middleware para parsear JSON

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('<h1>Servidor del Karaoke La Rana Canta funcionando!</h1>');
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});