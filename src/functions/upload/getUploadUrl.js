//Baljinnyam Puntsagnorov
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { generateAssetUrl, getCloudFrontDomain } from '/opt/nodejs/utils/urlUtils.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});
const BUCKET_NAME = process.env.UPLOADS_BUCKET || 'campus-connect-uploads';

export const handler = async (event) => {
  try {
    // Basic CORS support
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({})
      };
    }
    // Extract user ID from authorizer if it exists
    let userId = 'anonymous-user';
    
    const requestBody = JSON.parse(event.body || '{}');
    const { fileName, fileType, fileSize, uploadType, type, userId: bodyUserId, isRegistration, access } = requestBody;
    
    // Check if this is a registration endpoint or registration flag
    const isRegistrationRequest = event.pathParameters?.proxy?.includes('registration') || 
                                  event.path?.includes('registration') || 
                                  isRegistration === true;
    
    // For registration requests, allow without authentication
    if (isRegistrationRequest) {
      userId = bodyUserId || 'registration-temp-' + Date.now();
    } else {
      // For regular requests, require authentication
      if (event.requestContext?.authorizer?.userId) {
        userId = event.requestContext.authorizer.userId;
      } else {
        // If not a registration upload and no authorizer, return unauthorized
        return {
          statusCode: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: 'Unauthorized' })
        };
      }
    }
    
    if (!fileName || !fileType) {
      return createErrorResponse('fileName and fileType are required', 400);
    }

    // Central definition of supported upload categories
    const UPLOAD_TYPE_CONFIG = {
      profile: {
        category: 'image',
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        maxSizeBytes: (parseInt(process.env.PROFILE_IMAGE_MAX_MB || '5', 10)) * 1024 * 1024,
        cacheControl: 'max-age=86400', // 1 day
        folder: 'profiles'
      },
      product: {
        category: 'image',
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        maxSizeBytes: (parseInt(process.env.PRODUCT_IMAGE_MAX_MB || '5', 10)) * 1024 * 1024,
        cacheControl: 'max-age=2592000', // 30 days
        folder: 'products'
      },
      document: {
        category: 'document',
        // Restricted to PDF and Word formats only 
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maxSizeBytes: (parseInt(process.env.DOCUMENT_MAX_MB || '10', 10)) * 1024 * 1024,
        cacheControl: 'max-age=604800', // 7 days (adjust as needed)
        folder: 'documents'
      }
    };

    // Accept legacy 'type' param as fallback
    const resolvedType = uploadType || type || 'product';
    const typeConfig = UPLOAD_TYPE_CONFIG[resolvedType];
    if (!typeConfig) {
      console.warn('Invalid uploadType received:', resolvedType, 'Full body:', requestBody);
      return createErrorResponse(`Invalid uploadType '${resolvedType}'. Supported types: ${Object.keys(UPLOAD_TYPE_CONFIG).join(', ')}`, 400);
    }

    // Validate MIME type against category
    if (!typeConfig.allowedMimeTypes.includes(fileType)) {
      return createErrorResponse(`Invalid file type for ${type}. Allowed: ${typeConfig.allowedMimeTypes.join(', ')}`, 400);
    }

    // Optional size validation (client can pass fileSize). Not mandatory for backward compatibility.
    if (fileSize && Number.isFinite(fileSize) && fileSize > typeConfig.maxSizeBytes) {
      return createErrorResponse(`File exceeds max size of ${(typeConfig.maxSizeBytes / (1024*1024)).toFixed(0)}MB`, 400);
    }

    // Generate unique key based on upload type
  const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const keyBase = `${typeConfig.folder}/${userId}/${uuidv4()}.${fileExtension}`;

    const objectKey = access === 'private' ? `private/${keyBase}` : keyBase;

    // Generate presigned URL for upload with cache-friendly headers
    const cacheControl = typeConfig.cacheControl;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType,
      CacheControl: cacheControl,
    });

    // Include specific parameters for the signed URL
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 300 // 5 minutes
    });
    
    // Generate CloudFront URL for the uploaded file
    const fileUrl = access === 'private'
      ? null
      : generateAssetUrl(
          objectKey,
          process.env.ENVIRONMENT || 'dev',
          process.env.AWS_REGION || 'us-east-1',
          getCloudFrontDomain()
        );

    return createSuccessResponse({
      uploadUrl,
      fileUrl,
      key: objectKey,
  uploadType: resolvedType,
      category: typeConfig.category,
      maxSizeBytes: typeConfig.maxSizeBytes,
      private: access === 'private'
    });

  } catch (error) {
    console.error('Get upload URL error:', error);
    return createErrorResponse(error.message, 500);
  }
};
