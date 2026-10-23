const fs = require('fs');
const path = require('path');
const config = require('../config/cloudStorage');

// Ensure local upload directory exists
const uploadDir = path.resolve(__dirname, '../../', config.local.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Uploads a file (from multer disk or memory storage)
 * @param {Object} file - Express multer file object
 * @returns {Promise<{ fileUrl: string, key: string }>}
 */
const uploadFile = async (file) => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  // If AWS S3 is selected and credentials are present
  if (config.provider === 's3' && config.s3.accessKeyId && config.s3.secretAccessKey) {
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: config.s3.region,
        credentials: {
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey
        },
        endpoint: config.s3.endpoint
      });

      const fileExtension = path.extname(file.originalname);
      const fileKey = `contents/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`;
      const fileStream = file.buffer || fs.createReadStream(file.path);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.s3.bucket,
          Key: fileKey,
          Body: fileStream,
          ContentType: file.mimetype
        })
      );

      const fileUrl = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${fileKey}`;
      return { fileUrl, key: fileKey };
    } catch (err) {
      console.warn('AWS S3 upload failed, falling back to local file storage:', err.message);
    }
  }

  // Local storage fallback
  if (file.path) {
    const filename = path.basename(file.path);
    const fileUrl = `${config.local.baseUrl}/${filename}`;
    return { fileUrl, key: filename };
  } else if (file.buffer) {
    const fileExtension = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`;
    const destinationPath = path.join(uploadDir, filename);
    await fs.promises.writeFile(destinationPath, file.buffer);
    const fileUrl = `${config.local.baseUrl}/${filename}`;
    return { fileUrl, key: filename };
  }

  throw new Error('Unable to process file upload');
};

/**
 * Deletes a file from storage
 * @param {string} fileKey - Key or filename of the file
 */
const deleteFile = async (fileKey) => {
  if (!fileKey) return;

  if (config.provider === 's3' && config.s3.accessKeyId) {
    try {
      const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: config.s3.region,
        credentials: {
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey
        }
      });
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: config.s3.bucket,
          Key: fileKey
        })
      );
      return;
    } catch (err) {
      console.error('Failed to delete file from S3:', err.message);
    }
  }

  // Local removal
  const localFilePath = path.join(uploadDir, path.basename(fileKey));
  if (fs.existsSync(localFilePath)) {
    try {
      await fs.promises.unlink(localFilePath);
    } catch (err) {
      console.error('Failed to delete local file:', err.message);
    }
  }
};

module.exports = {
  uploadFile,
  deleteFile
};

