// Módulo de configuración de Cloudinary.
//
// Las credenciales se leen de variables de entorno. Si falta alguna, el módulo se
// carga sin error y `isCloudinaryConfigured()` devuelve false; el backend puede
// iniciar normalmente. Solo al intentar subir una imagen sin configuración se
// lanza `CloudinaryNotConfiguredError`.
import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const isConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function isCloudinaryConfigured() {
  return isConfigured;
}

export class CloudinaryNotConfiguredError extends Error {
  constructor() {
    super(
      'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el entorno para habilitar la carga de imágenes.'
    );
    this.name = 'CloudinaryNotConfiguredError';
    this.statusCode = 503;
  }
}

function validateMimetype(mimetype) {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimetype)) {
    throw new Error(
      'Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG, WebP y GIF.'
    );
  }
}

function validateSize(size) {
  if (size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('El archivo excede el tamaño máximo permitido (5 MB).');
  }
}

// Sube una imagen a Cloudinary y devuelve { url, publicId }.
// Acepta:
//   - Buffer
//   - objeto { buffer, mimetype }
//   - cadena base64 (cruda o data URI)
// Lanza CloudinaryNotConfiguredError si Cloudinary no está configurado.
export async function uploadImage(file, options = {}) {
  if (!isConfigured) {
    throw new CloudinaryNotConfiguredError();
  }

  const folder = options.folder || 'relojes-app/products';
  let dataUri;

  if (Buffer.isBuffer(file)) {
    const mimetype = options.mimetype || 'image/jpeg';
    validateMimetype(mimetype);
    validateSize(file.length);
    dataUri = `data:${mimetype};base64,${file.toString('base64')}`;
  } else if (file && Buffer.isBuffer(file.buffer)) {
    const mimetype = file.mimetype || options.mimetype || 'image/jpeg';
    validateMimetype(mimetype);
    validateSize(file.buffer.length);
    dataUri = `data:${mimetype};base64,${file.buffer.toString('base64')}`;
  } else if (typeof file === 'string') {
    if (file.startsWith('data:')) {
      const match = file.match(/^data:([^;]+);base64,/);
      const mimetype = match ? match[1] : 'image/jpeg';
      validateMimetype(mimetype);
      const base64 = file.replace(/^data:[^;]+;base64,/, '');
      validateSize(Buffer.byteLength(base64, 'base64'));
      dataUri = file;
    } else {
      const mimetype = options.mimetype || 'image/jpeg';
      validateMimetype(mimetype);
      validateSize(Buffer.byteLength(file, 'base64'));
      dataUri = `data:${mimetype};base64,${file}`;
    }
  } else {
    throw new Error(
      'Formato de archivo no soportado. Se espera un Buffer, un objeto { buffer, mimetype } o una cadena base64.'
    );
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    ...options.uploadOptions,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export { cloudinary };