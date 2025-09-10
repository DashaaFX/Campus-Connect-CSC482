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
    
    const requestBody = JSON.parse(event.body || '{}');
    const { fileName, fileType, uploadType, userId: bodyUserId, isRegistration } = requestBody;
    
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
