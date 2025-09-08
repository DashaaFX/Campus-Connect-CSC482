import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});
const BUCKET_NAME = process.env.UPLOADS_BUCKET || 'campus-connect-uploads';

export const handler = async (event) => {
  try {
    // Extract user ID from authorizer if it exists
    let userId = 'anonymous-user';
    
    // Try to get userId from authorizer or custom header
    if (event.requestContext?.authorizer?.userId) {
      userId = event.requestContext.authorizer.userId;
    } else if (event.headers && event.headers.Authorization) {
      // If there's an Authorization header but no userId in authorizer, log it
      console.log('Authorization header present but no userId extracted');
    }
    
    console.log('Upload URL request for userId:', userId);

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
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      // Remove ACL to avoid permissions issues
    });

    // Include specific parameters for the signed URL
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 300 // 5 minutes
    });
    
    // S3 URL structure
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    console.log(`Generated upload URL for: ${key}`);
    
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
