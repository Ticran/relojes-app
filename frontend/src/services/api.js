// Capa de comunicación con el backend de Relojes App.
// Centraliza el uso de fetch, la serialización JSON y el manejo de errores HTTP.
// Todas las funciones devuelven Promise y conservan los IDs exactamente como
// los envía la API (cadenas de texto, sin convertir a número).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Error HTTP con información del backend para mostrar en la UI.
class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Intenta leer el cuerpo JSON de una respuesta. Devuelve null si no hay cuerpo
// o si no es JSON (por ejemplo, respuestas 204 o DELETE sin contenido).
async function parseBodyOrNull(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Ejecuta una petición fetch con manejo centralizado de errores.
async function request(path, options = {}) {
  // Si el body es FormData, no serializar ni forzar Content-Type (el navegador
  // establece el boundary multipart automáticamente).
  const isFormData = options.body instanceof FormData;

  const headers = isFormData
    ? { ...options.headers }
    : {
        'Content-Type': 'application/json',
        ...options.headers,
      };

  const config = {
    ...options,
    headers,
    body: isFormData
      ? options.body
      : (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  };

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, config);
  } catch {
    // Error de red: el backend no respondió (caído, CORS, DNS, etc.)
    throw new ApiError(
      'No se pudo conectar con el servidor. Verificá que el backend esté en ejecución.',
      0,
    );
  }

  const body = await parseBodyOrNull(response);

  if (!response.ok) {
    // Conserva el mensaje del backend cuando está disponible.
    const message =
      (body && body.message) ||
      (body && body.error) ||
      `Error ${response.status}`;
    throw new ApiError(message, response.status, body && body.details);
  }

  return body;
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export async function getProducts() {
  return request('/products');
}

export async function getProduct(id) {
  return request(`/products/${encodeURIComponent(id)}`);
}

export async function createProduct(data, imageFile) {
  if (imageFile) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, value);
    });
    formData.append('image', imageFile);
    return request('/products', { method: 'POST', body: formData });
  }
  return request('/products', { method: 'POST', body: data });
}

export async function updateProduct(id, data, imageFile) {
  if (imageFile) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, value);
    });
    formData.append('image', imageFile);
    return request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: formData });
  }
  return request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
}

export async function deleteProduct(id) {
  return request(`/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Movimientos de stock
// ---------------------------------------------------------------------------

export async function getMovements() {
  return request('/movements');
}

export async function createMovement(data) {
  return request('/movements', {
    method: 'POST',
    body: data,
  });
}

export { ApiError };
