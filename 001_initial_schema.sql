-- Paso 4: Modelo de datos inicial

CREATE TABLE mesas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  estado VARCHAR(20) DEFAULT 'activa' -- por ejemplo: activa, inactiva, reservada
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nick VARCHAR(100),
  mesa_id INT REFERENCES mesas(id) ON DELETE SET NULL,
  puntos INT DEFAULT 0,
  nivel VARCHAR(10) DEFAULT 'bronce', -- bronce, plata, oro
  rol VARCHAR(20) NOT NULL DEFAULT 'cliente', -- cliente, admin
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE consumos (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  producto VARCHAR(200) NOT NULL,
  cantidad INT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE canciones (
  id SERIAL PRIMARY KEY,
  youtube_id VARCHAR(50) NOT NULL,
  titulo VARCHAR(300) NOT NULL,
  duracion_seconds INT,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobada, cantada, rechazada
  orden INT
);