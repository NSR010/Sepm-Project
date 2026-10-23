require('dotenv').config();

// Cloud Storage Configuration
// Supports AWS S3, Cloudflare R2, MinIO, or Supabase Storage with local fallback
const cloudStorageConfig = {
  provider: process.env.STORAGE_PROVIDER || 'local', // 's3' or 'local'
  s3: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_BUCKET_NAME || 'illusion-gallery-storage',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    endpoint: process.env.AWS_ENDPOINT || undefined // For S3-compatible providers like MinIO or R2
  },
  local: {
    uploadDir: process.env.LOCAL_UPLOAD_DIR || 'uploads',
    baseUrl: process.env.LOCAL_STORAGE_BASE_URL || `http://localhost:${process.env.PORT || 5000}/uploads`
  }
};

module.exports = cloudStorageConfig;

