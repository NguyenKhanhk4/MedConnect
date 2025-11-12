import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the upload directories exist
const doctorUploadDir = path.resolve('uploads/doctors');
const consultationUploadDir = path.resolve('uploads/consultations');

if (!fs.existsSync(doctorUploadDir)) {
  fs.mkdirSync(doctorUploadDir, { recursive: true });
}

if (!fs.existsSync(consultationUploadDir)) {
  fs.mkdirSync(consultationUploadDir, { recursive: true });
}

const doctorStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, doctorUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const consultationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, consultationUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const doctorFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP) are allowed!'), false);
  }
};

const consultationFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only files (JPG, PNG, PDF, DOC, DOCX) are allowed!'), false);
  }
};

export const uploadDoctor = multer({ 
  storage: doctorStorage,
  fileFilter: doctorFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadConsultation = multer({ 
  storage: consultationStorage,
  fileFilter: consultationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Default export for backward compatibility
const upload = uploadDoctor;
export default upload;

