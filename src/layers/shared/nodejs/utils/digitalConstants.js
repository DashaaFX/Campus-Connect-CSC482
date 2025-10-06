//Baljinnyam Puntsagnorov

import { generateAssetUrl, getCloudFrontDomain } from './urlUtils.js';

export const DEFAULT_DIGITAL_PREVIEW_KEY = 'static/placeholders/pdf-placeholder.png';
export function getDefaultDigitalPreviewUrl() {
  return generateAssetUrl(
    DEFAULT_DIGITAL_PREVIEW_KEY,
    process.env.ENVIRONMENT || 'dev',
    process.env.AWS_REGION || 'us-east-1',
    getCloudFrontDomain()
  );
}

export const DEFAULT_DIGITAL_PREVIEW = getDefaultDigitalPreviewUrl();

export function getFormatPlaceholder(format) {
  switch ((format || '').toLowerCase()) {
    case 'pdf':
    case 'doc':
    case 'docx':
    default:
      return DEFAULT_DIGITAL_PREVIEW;
  }
}
