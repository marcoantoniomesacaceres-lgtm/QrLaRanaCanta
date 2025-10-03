import { Client } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno desde un archivo .env si existe
dotenv.config({ path: '.env' });

const setAdminRole = async () => {
  const userNick = process.argv[2]; // El nick del usuario
  const newRole = process.argv[3];  // El nuevo rol: 'admin' o 'cliente'

  if (!userNick || !newRole) {
    console.error('❌ Error: Por favor, proporciona el nick del usuario y el nuevo rol.');
    console.log('   Uso: npm run set-admin -- "<userNick>" "<rol>"');
    console.log('   Ejemplo: npm run set-admin -- "Marco" "admin"');
    process.exit(1);
  }

  if (newRole !== 'admin' && newRole !== 'cliente') {
    console.error(`❌ Error: Rol inválido "${newRole}". Los roles válidos son "admin" o "cliente".`);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: La variable de entorno DATABASE_URL no está definida.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos...');

    const result = await client.query(
      "UPDATE usuarios SET rol = $2 WHERE nick = $1 RETURNING id, nick, rol",
      [userNick, newRole]
    );

    if (result.rowCount === 0) {
      console.log(`🤷‍♂️ No se encontró ningún usuario con el nick: "${userNick}"`);
    } else {
      const updatedUser = result.rows[0];
      console.log('✅ ¡Éxito! Rol de usuario actualizado:');
      console.log(`   ID: ${updatedUser.id}, Nick: ${updatedUser.nick}, Rol: ${updatedUser.rol}`);
    }
  } catch (error) {
    console.error('🔥 Ocurrió un error:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
};

setAdminRole();