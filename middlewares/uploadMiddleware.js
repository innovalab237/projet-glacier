import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Configuration des chemins
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration commune pour Multer
const createMulterUpload = (options = {}) => multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont autorisées !'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: options.fileSize || 2 * 1024 * 1024 } // 2MB par défaut
});

// Middleware pour upload des images de menu
export const uploadMenuImage = createMulterUpload({
  fileSize: 2 * 1024 * 1024 // 2MB
}).single('image');

// Middleware pour upload des photos utilisateur
export const uploadUserPhoto = createMulterUpload({
  fileSize: 5 * 1024 * 1024 // 5MB pour les photos de profil
}).single('photo');

/**
 * Redimensionne et enregistre une image de menu
 */
export const resizeMenuImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const filename = `menu-${Date.now()}.jpeg`;
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'menus');
    const filePath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });

    await sharp(req.file.buffer)
      .resize(800, 800, {
        fit: sharp.fit.inside,
        withoutEnlargement: true
      })
      .toFormat('jpeg')
      .jpeg({ 
        quality: 85,
        mozjpeg: true 
      })
      .toFile(filePath);

    req.body.image = `/uploads/menus/${filename}`;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Redimensionne et enregistre une photo utilisateur
 */
export const resizeUserPhoto = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'users');
    const filePath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ 
        quality: 90,
        mozjpeg: true 
      })
      .toFile(filePath);

    // Supprime l'ancienne photo si elle existe
    if (req.user.photo) {
      const oldPhotoPath = path.join(
        __dirname, 
        '..', 
        'public', 
        req.user.photo.startsWith('/') ? req.user.photo.substring(1) : req.user.photo
      );
      try {
        await fs.access(oldPhotoPath);
        await fs.unlink(oldPhotoPath);
      } catch (err) {
        console.error('Erreur suppression ancienne photo:', err);
      }
    }

    req.body.photo = `/uploads/users/${filename}`;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Supprime un fichier image
 */
export const deleteImage = async (filePath) => {
  if (!filePath) return;

  const fullPath = path.join(
    __dirname, 
    '..', 
    'public', 
    filePath.startsWith('/') ? filePath.substring(1) : filePath
  );

  try {
    await fs.access(fullPath);
    await fs.unlink(fullPath);
  } catch (err) {
    console.error('Erreur suppression image:', err);
  }
};