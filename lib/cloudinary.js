// lib/cloudinary.js
import axios from 'axios';
import FormData from 'form-data';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('Cloudinary environment variables not fully configured');
}

/**
 * Upload image to Cloudinary
 * @param {Buffer|Stream} fileBuffer - Image file buffer
 * @param {string} fileName - Original filename
 * @param {options} options - Upload options
 * @returns {Promise<object>} - Upload result with URL
 */
export async function uploadToCloudinary(fileBuffer, fileName, options = {}) {
  try {
    const form = new FormData();
    form.append('file', fileBuffer, fileName);
    form.append('api_key', CLOUDINARY_API_KEY);
    form.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET || 'whatsapp_commerce');
    form.append('folder', options.folder || 'whatsapp-products');
    form.append('resource_type', 'auto');

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000,
      }
    );

    return {
      success: true,
      url: response.data.secure_url,
      publicId: response.data.public_id,
      width: response.data.width,
      height: response.data.height,
      size: response.data.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error.response?.data || error.message);
    throw new Error(`Image upload failed: ${error.message}`);
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<boolean>}
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const signature = generateSecuritySignature({ public_id: publicId });
    
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        public_id: publicId,
        api_key: CLOUDINARY_API_KEY,
        signature: signature.signature,
        timestamp: signature.timestamp,
      }
    );

    return response.data.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Generate security signature for Cloudinary API
 */
function generateSecuritySignature(params) {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  
  const paramsString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const message = `${paramsString}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(message).digest('hex');

  return { signature, timestamp };
}

/**
 * Transform Cloudinary URL with options
 */
export function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width = 500,
    height = 500,
    quality = 'auto',
    fetch_format = 'auto',
  } = options;

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${quality}/${fetch_format},w_${width},h_${height},c_fill/${publicId}`;
}

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedImageUrl,
};
