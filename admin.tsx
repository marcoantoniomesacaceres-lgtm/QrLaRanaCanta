import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../lib/apiClient';
import { useSession } from '../context/SessionContext';

interface AdminSong {
  id: number;
  titulo: string;
  estado: 'pendiente' | 'aprobada' | 'cantada' | 'rechazada';
  solicitante: string | null;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface AdminSongsResponse {
  data: AdminSong[];
  pagination: PaginationInfo;
}

const AdminPage = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [pendingSongs, setPendingSongs] = useState<AdminSong[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.rol === 'admin';

  // Efecto para cargar las canciones pendientes y conectar al socket
  useEffect(() => {
    if (!isAdmin || isSessionLoading) {
      setIsLoading(false);
      return;
    }

    const fetchPendingSongs = async (page: number) => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<AdminSongsResponse>(`/admin/songs?status=pendiente&page=${page}`);
        setPendingSongs(response.data);
        setPagination(response.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar canciones.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingSongs(currentPage);

    // Conectar al socket para actualizaciones en tiempo real
    const socket: Socket = io('http://localhost:8080');

    // Cuando una canción se añade o se actualiza, volvemos a cargar la página actual
    // para mantener la consistencia de los datos y la paginación.
    const handleQueueUpdate = () => {
      fetchPendingSongs(currentPage);
    };

    socket.on('song_added', handleQueueUpdate);
    socket.on('queue_updated', handleQueueUpdate);

    return () => {
      socket.off('song_added', handleQueueUpdate);
      socket.off('queue_updated', handleQueueUpdate);
      socket.disconnect();
    };
  }, [isAdmin, isSessionLoading, currentPage]);

  const handleApproveSong = async (songId: number) => {
    await apiClient.post(`/admin/songs/${songId}/approve`, {});
    // La actualización de la UI se manejará a través del evento de socket.
  };

  const handleRejectSong = async (songId: number) => {
    await apiClient.post(`/admin/songs/${songId}/reject`, {});
    // La actualización de la UI se manejará a través del evento de socket.
  };

  if (isSessionLoading || (isLoading && pendingSongs.length === 0)) return <div>Cargando...</div>;
  if (!isAdmin) return <div>Acceso denegado. Debes ser administrador para ver esta página. (Intenta iniciar sesión con una cuenta de admin)</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel de Administración - Canciones Pendientes</h1>
      {pendingSongs.length === 0 && !isLoading ? (
        <p>No hay canciones pendientes de aprobación.</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Título</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Solicitante</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingSongs.map((song) => (
                <tr key={song.id}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{song.titulo}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{song.solicitante || 'N/A'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <button onClick={() => handleApproveSong(song.id)} style={{ background: 'green', color: 'white' }}>Aprobar</button>
                    <button onClick={() => handleRejectSong(song.id)} style={{ background: 'red', color: 'white', marginLeft: '5px' }}>Rechazar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* --- Controles de Paginación --- */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                Anterior
              </button>
              <span style={{ margin: '0 1rem' }}>
                Página {pagination.currentPage} de {pagination.totalPages}
              </span>
              <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.totalPages}>
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPage;
    });

    return () => {
      socket.disconnect();
    };
  }, [isAdmin]);

  const handleApproveSong = async (songId: number) => {
    await apiClient.post(`/admin/songs/${songId}/approve`, {});
  };

  const handleRejectSong = async (songId: number) => {
    await apiClient.post(`/admin/songs/${songId}/reject`, {});
  };

  if (isLoading) return <div>Cargando...</div>;
  if (!isAdmin) return <div>Acceso denegado. Debes ser administrador para ver esta página.</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel de Administración - Canciones Pendientes</h1>
      {pendingSongs.length === 0 ? (
        <p>No hay canciones pendientes de aprobación.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Título</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Solicitante</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendingSongs.map((song) => (
              <tr key={song.id}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{song.titulo}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{song.solicitante || 'N/A'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  <button onClick={() => handleApproveSong(song.id)} style={{ background: 'green', color: 'white' }}>Aprobar</button>
                  <button onClick={() => handleRejectSong(song.id)} style={{ background: 'red', color: 'white', marginLeft: '5px' }}>Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPage;