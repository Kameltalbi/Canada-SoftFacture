import multer from 'multer';

/** Import Factur-X entrant (PDF hybride, max 15 Mo). */
export const receivedInvoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
      return;
    }
    cb(new Error('Seuls les fichiers PDF Factur-X sont acceptés'));
  },
});
