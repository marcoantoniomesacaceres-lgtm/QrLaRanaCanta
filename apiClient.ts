const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

type FetchOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: HeadersInit;
  body?: string;
};

/**
 * Maneja la respuesta de la API, parseando el JSON y lanzando un error si la respuesta no es exitosa.
 * @param response La respuesta del objeto Fetch.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Error ${response.status}: ${response.statusText}`,
    }));
    throw new Error(errorData.message || 'Ocurrió un error inesperado.');
  }
  // Si la respuesta es 204 No Content, no hay cuerpo que parsear.
  if (response.status === 204) {
    return null as T;
  }
  return response.json();
}

/**
 * Función genérica para realizar peticiones a la API.
 * @param endpoint El endpoint al que se llamará (ej. '/me').
 * @param method El método HTTP.
 * @param body El cuerpo de la petición para POST/PUT.
 */
async function request<T>(endpoint: string, method: 'GET' | 'DELETE' | 'POST' | 'PUT', body?: object): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: FetchOptions = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return handleResponse<T>(response);
}

// Exportamos métodos específicos para cada verbo HTTP para una mejor semántica.
export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint, 'GET'),
  post: <T>(endpoint:string, body: object) => request<T>(endpoint, 'POST', body),
  put: <T>(endpoint:string, body: object) => request<T>(endpoint, 'PUT', body),
  delete: <T>(endpoint: string) => request<T>(endpoint, 'DELETE'),
};