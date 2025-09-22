// URL utility for generating CloudFront or S3 URLs
export const generateAssetUrl = (key, environment = 'dev', region = 'us-east-1', cloudFrontDomain = null) => {
  if (!key) return null;
  
  if (key.startsWith('http')) return key;
  
  // Clean up the key
  const cleanKey = key.startsWith('/') ? key.substring(1) : key;
  
  // Use CloudFront if available, otherwise S3
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${cleanKey}`;
  } else {
    // Fallback to direct S3 URL
    const bucketName = `campus-connect-uploads-${environment}`;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
  }
};

export const getCloudFrontDomain = () => {
  return process.env.CLOUDFRONT_DOMAIN || null;
};