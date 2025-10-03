import { Pool } from 'pg';

// La librería 'pg' leerá automáticamente la variable de entorno DATABASE_URL
// que ya configuramos en docker-compose.yml.
const pool = new Pool({
  // Opcional: configuraciones adicionales del pool
  max: 20, // Número máximo de clientes en el pool
  idleTimeoutMillis: 30000, // Tiempo en ms que un cliente puede estar inactivo
  connectionTimeoutMillis: 2000, // Tiempo en ms para esperar al conectar
});

// Evento para verificar la conexión inicial
pool.on('connect', () => {
  console.log('✅ Base de datos conectada exitosamente');
});

// Exportamos un objeto con un método 'query' para poder usarlo en toda la aplicación.
export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
};