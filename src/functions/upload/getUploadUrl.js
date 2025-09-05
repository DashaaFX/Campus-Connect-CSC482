import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.UPLOADS_BUCKET || 'campus-connect-uploads';

export const handler = async (event) => {
  try {
    // Get user info from JWT authorizer context
    const userId = event.requestContext?.authorizer?.userId;
    
    if (!userId) {
      return createErrorResponse('User authentication required', 401);
    }

    const { fileName, fileType, uploadType } = JSON.parse(event.body || '{}');
    
    if (!fileName || !fileType) {
      return createErrorResponse('fileName and fileType are required', 400);
    }

    // Validate upload type
    const validUploadTypes = ['product', 'profile'];
    const type = uploadType || 'product';
    if (!validUploadTypes.includes(type)) {
      return createErrorResponse('uploadType must be either "product" or "profile"', 400);
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      return createErrorResponse('Invalid file type. Only images are allowed.', 400);
    }

    // Generate unique key based on upload type
    const fileExtension = fileName.split('.').pop();
    const key = type === 'profile' 
      ? `profiles/${userId}/${uuidv4()}.${fileExtension}`
      : `products/${userId}/${uuidv4()}.${fileExtension}`;

    // Generate presigned URL for upload
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Expires: 300, // 5 minutes
      ACL: 'public-read'
    };

    const uploadUrl = s3.getSignedUrl('putObject', params);
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return createSuccessResponse({
      uploadUrl,
      fileUrl,
      key
    });

  } catch (error) {
    console.error('Get upload URL error:', error);
    return createErrorResponse(error.message, 500);
  }
};
