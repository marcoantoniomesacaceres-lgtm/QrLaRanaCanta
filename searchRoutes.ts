import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// GET /api/search?q=...
router.get('/search', async (req: Request, res: Response) => {
  const query = req.query.q as string;

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ message: 'La clave de API de YouTube no está configurada en el servidor.' });
  }

  if (!query) {
    return res.status(400).json({ message: 'El parámetro de búsqueda "q" es requerido.' });
  }

  try {
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        key: YOUTUBE_API_KEY,
        part: 'snippet',
        q: `${query} karaoke`, // Añadimos "karaoke" para mejorar los resultados
        type: 'video',
        maxResults: 10,
        videoCategoryId: '10', // Categoría de "Música"
      },
    });

    // Mapeamos la respuesta de YouTube a un formato más limpio para nuestro frontend
    const searchResults = response.data.items.map((item: any) => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.default.url,
    }));

    res.status(200).json(searchResults);
  } catch (error) {
    console.error('Error al buscar en la API de YouTube:', error);
    res.status(500).json({ message: 'Error al comunicarse con la API de YouTube.' });
  }
});

export default router;