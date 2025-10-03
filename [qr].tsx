import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../../lib/apiClient'; // Importamos nuestro cliente de API

// Definimos interfaces para la estructura de datos que esperamos del API.
// Esto nos da autocompletado y seguridad de tipos.
interface User {
  id: number;
  nick: string;
  nivel: string;
  puntos: number;
}

interface Table {
  id: number;
  nombre: string;
}

interface Song {
  id: number;
  youtube_id: string;
  titulo: string;
  estado: 'pendiente' | 'aprobada' | 'cantada' | 'rechazada';
  // Añade otros campos si los necesitas en la UI
}

interface SearchResult {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
}

interface SessionData {
  usuario: User;
  mesa: Table;
}

interface ConnectResponse {
  token: string;
  usuario: User;
  mesa: Table;
}

const MesaPage = () => {
  const router = useRouter();
  const { qr } = router.query; // Extrae el código QR de la URL

  // Estados para manejar la sesión, carga y errores
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // --- Estados para el formulario y la lista de canciones ---
  const [notifications, setNotifications] = useState<string[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Estados para la búsqueda ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // No hacemos nada hasta que el router esté listo y tengamos el código QR
    if (!qr) {
      return;
    }

    const connectToTable = async () => {
      setLoading(true);
      setError(null);

      try {
        // Usamos nuestro apiClient. ¡Mucho más limpio!
        const { token, usuario, mesa } = await apiClient.post<ConnectResponse>(
          `/mesa/${qr}/connect`,
          {} // Podemos enviar un nick aquí: { nick: 'Marco' }
        );

        // 1. Guardar el token de forma segura (localStorage es común para esto)
        localStorage.setItem('authToken', token);

        // 2. Actualizar el estado de la aplicación con los datos de la sesión
        setSession({ usuario, mesa });

        // 3. Conectar al WebSocket y unirse a la sala de la mesa
        const newSocket = io('http://localhost:8080'); // URL de tu backend
        newSocket.on('connect', () => {
          console.log('Conectado al servidor de WebSockets!');
          newSocket.emit('join_table', `mesa-${mesa.id}`); // Usamos un prefijo para la sala
        });

        // 4. Escuchar eventos de WebSocket para actualizar la UI
        newSocket.on('song_added', (newSong: Song) => {
          console.log('Nueva canción añadida:', newSong);
          setQueue((currentQueue) => [...currentQueue, newSong]);
        });

        // 5. Escuchar el evento de nuevo usuario y mostrar notificación
        newSocket.on('user_joined', (data: { nick: string }) => {
          const message = `¡${data.nick} se ha unido a la mesa!`;
          console.log(message);
          setNotifications((prev) => [...prev, message]);
          // Hacemos que la notificación desaparezca después de 5 segundos
          setTimeout(() => {
            setNotifications((prev) => prev.slice(1));
          }, 5000);
        });
        setSocket(newSocket);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    connectToTable();

    // Limpieza: desconectar el socket cuando el componente se desmonte
    return () => {
      socket?.disconnect();
    };
  }, [qr]); // El efecto se ejecuta cada vez que el valor de 'qr' cambia

  // Función para llamar a una ruta protegida
  const fetchMyInfo = async () => {
    try {
      // La lógica de obtener el token y añadir las cabeceras ahora está centralizada.
      const data = await apiClient.get('/me');
      alert('Respuesta del servidor: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error.';
      console.error('Error al obtener la información del usuario:', errorMessage);
      alert(`Falló la petición: ${errorMessage}`);
    }
  };

  // --- Función para buscar canciones en YouTube a través de nuestro backend ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error.';
      alert(`Error al buscar: ${errorMessage}`);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Función para añadir una canción seleccionada de los resultados ---
  const handleAddSong = async (song: SearchResult) => {
    setIsSubmitting(true);
    try {
      // Usamos nuestro apiClient para llamar al endpoint protegido
      await apiClient.post<Song>('/songs', {
        youtube_id: song.youtubeId,
        titulo: song.title,
        duracion_seconds: null, // El backend podría obtener esto después
      });
      alert(`'${song.title}' se ha añadido a la cola.`);
      setSearchResults([]); // Limpiamos los resultados después de añadir
      setSearchQuery('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error.';
      alert(`Error al añadir la canción: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Conectando a la mesa...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!session) return <div>No se pudo establecer la sesión.</div>;

  // Si todo fue exitoso, muestra la interfaz principal del cliente
  return (
    <div>
      <h1>¡Bienvenido a la mesa {session.mesa.nombre}!</h1>

      {/* --- Componente de Notificaciones --- */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        {notifications.map((msg, index) => (
          <div key={index} style={{ background: '#28a745', color: 'white', padding: '1rem', marginBottom: '10px', borderRadius: '5px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            {msg}
          </div>
        ))}
      </div>

      <p>Hola, {session.usuario.nick} ({session.usuario.nivel})</p>
      <hr />
      <button onClick={fetchMyInfo}>Probar Ruta Protegida (/api/me)</button>

      {/* --- Componente de Búsqueda de Canciones --- */}
      <div style={{ marginTop: '20px' }}>
        <h3>Buscar Canción</h3>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Título de la canción"
            disabled={isSearching}
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* --- Resultados de la Búsqueda --- */}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {searchResults.map((result) => (
            <li key={result.youtubeId} style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
              <img src={result.thumbnailUrl} alt={result.title} width="64" />
              <span style={{ marginLeft: '10px' }}>{result.title}</span>
              <button onClick={() => handleAddSong(result)} disabled={isSubmitting} style={{ marginLeft: 'auto' }}>
                Añadir
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* --- Lista de canciones en la cola --- */}
      <div style={{ marginTop: '20px' }}>
        <h3>Cola de Canciones</h3>
        <ul>
          {queue.map((song) => (
            <li key={song.id}>
              {song.titulo} ({song.estado})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MesaPage;