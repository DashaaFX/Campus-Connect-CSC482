import React, { useState, useEffect } from 'react';
import { getS3BucketName, getAwsRegion, getEnvironment } from '@/utils/environment';

/**
 * Component for diagnosing and testing S3 image loading issues
 */
const S3ImageTester = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    // Test environment variables
    addResult('Environment Check', 'info', {
      'VITE_API_BASE_URL': import.meta.env.VITE_API_BASE_URL || 'Not set',
      'VITE_ENVIRONMENT': getEnvironment(),
      'VITE_AWS_REGION': getAwsRegion(),
      'S3_BUCKET': getS3BucketName()
    });
    
    // Test different S3 URL formats
    const testImage = imageUrl || 'products/anonymous-user/10e5e0a4-39f0-485e-b82d-a282d76c3d50.png';
    const env = getEnvironment();
    
    const testUrls = [
      {
        name: 'S3 URL with region (us-east-1)',
        url: `https://campus-connect-uploads-${env}.s3.us-east-1.amazonaws.com/${testImage}`
      },
      {
        name: 'S3 URL with region (us-east-2)',
        url: `https://campus-connect-uploads-${env}.s3.us-east-2.amazonaws.com/${testImage}`
      },
      {
        name: 'S3 URL without region',
        url: `https://campus-connect-uploads-${env}.s3.amazonaws.com/${testImage}`
      },
      {
        name: 'Virtual hosted style URL',
        url: `https://${getS3BucketName()}.s3.amazonaws.com/${testImage}`
      },
      {
        name: 'Path style URL',
        url: `https://s3.amazonaws.com/${getS3BucketName()}/${testImage}`
      },
      {
        name: 'Path style URL with region',
        url: `https://s3.${getAwsRegion()}.amazonaws.com/${getS3BucketName()}/${testImage}`
      }
    ];
    
    // Test each URL
    for (const test of testUrls) {
      try {
        const result = await testImageUrl(test.url);
        addResult(test.name, result ? 'success' : 'error', {
          url: test.url,
          loaded: result
        });
      } catch (error) {
        addResult(test.name, 'error', {
          url: test.url,
          error: error.message
        });
      }
    }
    
    setIsLoading(false);
  };
  
  const testImageUrl = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };
  
  const addResult = (name, type, data) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      name,
      type,
      data
    }]);
  };
  
  useEffect(() => {
    // Run tests on component mount
    runTests();
  }, []);
  
  return (
    <div className="p-4 mt-4 border rounded">
      <h2 className="mb-2 text-xl font-bold">S3 Image Loading Tester</h2>
      
      <div className="mb-4">
        <label className="block mb-1 text-sm">Test with specific image URL key:</label>
        <div className="flex space-x-2">
          <input 
            type="text" 
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="products/user-id/image-file.jpg"
            className="flex-1 px-2 py-1 border rounded"
          />
          <button 
            onClick={runTests}
            disabled={isLoading}
            className="px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? 'Testing...' : 'Test'}
          </button>
        </div>
      </div>
      
      <div className="overflow-auto max-h-96">
        {testResults.map(result => (
          <div key={result.id} className="mb-3 p-2 border-l-4 rounded bg-gray-50" 
               style={{ borderLeftColor: result.type === 'success' ? '#10B981' : 
                                        result.type === 'error' ? '#EF4444' : 
                                        '#3B82F6' }}>
            <h3 className="font-semibold">{result.name}</h3>
            {result.type === 'success' && <p className="text-sm text-green-600">✓ Success</p>}
            {result.type === 'error' && <p className="text-sm text-red-600">✗ Failed</p>}
            
            <div className="mt-1 text-xs overflow-x-auto">
              <pre className="p-2 bg-gray-100 rounded">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
            
            {result.data?.url && (
              <div className="mt-2 p-2 border rounded">
                <p className="mb-1 text-xs text-gray-500">Image Preview:</p>
                <img 
                  src={result.data.url} 
                  alt="Test"
                  className="h-10 border"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <p style={{display: 'none'}} className="text-xs text-red-500">
                  Failed to load image
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default S3ImageTester;
