import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { apiClient } from '../../lib/apiClient';

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

const MesaPage = () => {
  const router = useRouter();
  const { qr } = router.query; // Extrae el código QR de la URL

  // Usamos el contexto para el estado global de la sesión
  const { user, table, socket, connect, isLoading: isSessionLoading, isAuthenticated } = useSession();

  const [error, setError] = useState<string | null>(null);

  // --- Estados para el formulario y la lista de canciones ---
  const [notifications, setNotifications] = useState<string[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Estados para la búsqueda ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Efecto para conectar a la mesa cuando el QR está disponible
  useEffect(() => {
    // Solo intentamos conectar si tenemos un QR y no estamos ya autenticados
    if (qr && !isAuthenticated) {
      connect(qr as string).catch((err) => {
        setError(err.message);
      });
    }
  }, [qr, isAuthenticated, connect]);

  // Efecto para manejar los listeners del socket
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleSongAdded = (newSong: Song) => {
      console.log('Nueva canción añadida:', newSong);
      setQueue((currentQueue) => [...currentQueue, newSong]);
    };
    const handleUserJoined = (data: { nick: string }) => {
      const message = `¡${data.nick} se ha unido a la mesa!`;
      console.log(message);
      setNotifications((prev) => [...prev, message]);
      setTimeout(() => setNotifications((prev) => prev.slice(1)), 5000);
    };
    const handleQueueUpdated = (updatedSong: Song) => {
      console.log('Canción actualizada:', updatedSong);
      setQueue((currentQueue) =>
        currentQueue.map((song) => (song.id === updatedSong.id ? updatedSong : song))
      );
    };

    socket.on('song_added', handleSongAdded);
    socket.on('user_joined', handleUserJoined);
    socket.on('queue_updated', handleQueueUpdated);

    return () => {
      socket.off('song_added', handleSongAdded);
      socket.off('user_joined', handleUserJoined);
      socket.off('queue_updated', handleQueueUpdated);
    };
  }, [socket]);

  // --- Efecto para la búsqueda con debounce ---
  useEffect(() => {
    // Si no hay texto en la búsqueda, limpiamos los resultados y no hacemos nada más.
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Configuramos un temporizador. La búsqueda solo se ejecutará si el usuario
    // deja de escribir durante 500ms.
    const searchTimeout = setTimeout(async () => {
      try {
        const results = await apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(results);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error.';
        // Evitamos alertas molestas mientras el usuario escribe
        console.error(`Error al buscar: ${errorMessage}`);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms de espera

    // Función de limpieza: se ejecuta si el usuario sigue escribiendo.
    // Cancela el temporizador anterior para evitar búsquedas innecesarias.
    return () => clearTimeout(searchTimeout);

  }, [searchQuery]); // Este efecto se dispara cada vez que 'searchQuery' cambia.

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

  if (isSessionLoading) return <div>Conectando a la mesa...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isAuthenticated || !user || !table) return <div>Escanea un código QR para empezar.</div>;

  // Si todo fue exitoso, muestra la interfaz principal del cliente
  return (
    <div>
      <h1>¡Bienvenido a la mesa {table.nombre}!</h1>

      {/* --- Componente de Notificaciones --- */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        {notifications.map((msg, index) => (
          <div key={index} style={{ background: '#28a745', color: 'white', padding: '1rem', marginBottom: '10px', borderRadius: '5px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            {msg}
          </div>
        ))}
      </div>

      <p>Hola, {user.nick} ({user.nivel})</p>
      <hr />
      <button onClick={fetchMyInfo}>Probar Ruta Protegida (/api/me)</button>

      {/* --- Componente de Búsqueda de Canciones --- */}
      <div style={{ marginTop: '20px' }}>
        <h3>Buscar Canción</h3>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Artista o título de la canción..."
          style={{ width: '100%', padding: '8px' }}
        />

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
              {song.titulo} - <strong>{song.estado.toUpperCase()}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MesaPage;