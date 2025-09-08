// environment.js - Centralized environment configuration
// This file helps ensure consistent environment variable usage across the app

/**
 * Get the API base URL from environment variables or use default
 */
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'https://3yud35kmhl.execute-api.us-east-1.amazonaws.com/dev';
};

/**
 * Get the AWS region from environment variables or use default
 */
export const getAwsRegion = () => {
  return import.meta.env.VITE_AWS_REGION || 'us-east-1';
};

/**
 * Get the environment name (dev, staging, prod) from environment variables or use default
 */
export const getEnvironment = () => {
  return import.meta.env.VITE_ENVIRONMENT || 'dev';
};

/**
 * Get the S3 bucket name for uploads
 */
export const getS3BucketName = () => {
  const env = getEnvironment();
  return `campus-connect-uploads-${env}`;
};

/**
 * Construct a proper S3 URL for an image
 * @param {string} key - The S3 object key or path
 * @returns {string} Full S3 URL
 */
export const getS3ImageUrl = (key) => {
  // If already a full URL, return as is
  if (!key) return null;
  if (key.startsWith('http')) return key;
  
  // Clean up the key to ensure no double slashes
  const cleanKey = key.startsWith('/') ? key.substring(1) : key;
  
  // Construct S3 URL
  const bucketName = getS3BucketName();
  const region = getAwsRegion();
  
  return `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
};

/**
 * DEBUG: Log all environment settings to console
 */
export const logEnvironmentConfig = () => {
  console.log('=== Environment Configuration ===');
  console.log('API Base URL:', getApiBaseUrl());
  console.log('AWS Region:', getAwsRegion());
  console.log('Environment:', getEnvironment());
  console.log('S3 Bucket:', getS3BucketName());
  console.log('================================');
};
