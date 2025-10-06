import React, { useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import axios from '@/utils/axios';
import { UPLOAD_API_ENDPOINT } from '@/utils/data';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Generic file uploader supporting documents (PDF, DOC, DOCX) using existing presigned URL API.
 * Props:
 *  - onUploadComplete(fileMeta) => void
 *  - multiple (bool)
 *  - maxFiles (number)
 *  - allowed (override MIME list)
 *  - uploadType: 'document' | 'product' | 'profile'
 *  - access: 'public' | 'private'
 */
const DEFAULT_ALLOWED = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const FileUploader = ({
  onUploadComplete,
  multiple = false,
  maxFiles = 5,
  allowed = DEFAULT_ALLOWED,
  uploadType = 'document',
  access = 'public'
}) => {
  const { token, user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]); // { name, size, url|null, key, uploading, progress }

  const validateFile = (file) => {
    if (!allowed.includes(file.type)) {
      return `Unsupported file type: ${file.type}`;
    }
    const sizeMB = file.size / (1024 * 1024);
    const limitMB = uploadType === 'document' ? 10 : 5;
    if (sizeMB > limitMB) {
      return `File ${file.name} exceeds ${limitMB}MB limit`;
    }
    return null;
  };

  const requestUploadUrl = async (file) => {
    const body = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadType,
      access: access === 'private' ? 'private' : 'public'
    };
    const resp = await axios.post(`${UPLOAD_API_ENDPOINT}/url`, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return resp.data; // { uploadUrl, fileUrl, key, private }
  };

  const handlePut = async (uploadUrl, file, onProgress) => {
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      maxBodyLength: Infinity,
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      }
    });
  };

  const uploadFile = async (file) => {
    const errMsg = validateFile(file);
    if (errMsg) {
      setError(errMsg);
      return null;
    }
    setError('');
    try {
      const meta = await requestUploadUrl(file);
      const newItem = { name: file.name, size: file.size, key: meta.key, url: meta.fileUrl, private: meta.private, progress: 0, uploading: true };
      setFiles((prev) => [...prev, newItem]);
      await handlePut(meta.uploadUrl, file, (p) => {
        setFiles((prev) => prev.map(f => f.key === newItem.key ? { ...f, progress: p } : f));
      });
      setFiles((prev) => prev.map(f => f.key === newItem.key ? { ...f, uploading: false, progress: 100 } : f));
      const finalMeta = { ...newItem, url: meta.fileUrl, uploading: false, progress: 100 };
      onUploadComplete && onUploadComplete(finalMeta, [...files, finalMeta]);
      return finalMeta;
    } catch (e) {
      console.error('File upload error', e);
      setError(e.response?.data?.message || 'Upload failed');
      return null;
    }
  };

  const handleChange = async (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!user || !token) {
      setError('Login required to upload');
      return;
    }
    if (incoming.length + files.length > maxFiles) {
      setError(`Exceeds maximum of ${maxFiles} files`);
      return;
    }
    setUploading(true);
    for (const file of incoming) {
      await uploadFile(file);
      if (!multiple) break; // only one if not multiple
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeFile = (key) => {
    setFiles((prev) => prev.filter(f => f.key !== key));
    // Optionally notify parent about removal
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Upload Documents</p>
        <label className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded cursor-pointer hover:bg-blue-700">
          <Upload className="w-4 h-4 mr-1" /> Select
          <input
            type="file"
            className="hidden"
            multiple={multiple}
            accept={allowed.join(',')}
            onChange={handleChange}
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <ul className="space-y-2">
        {files.map(f => (
          <li key={f.key} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-xs text-gray-500">{(f.size / (1024*1024)).toFixed(2)} MB {f.private && '(private)'}</p>
                {f.uploading && (
                  <div className="w-40 h-2 mt-1 bg-gray-200 rounded">
                    <div className="h-2 bg-blue-500 rounded" style={{ width: `${f.progress}%` }} />
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => removeFile(f.key)} className="p-1 text-gray-500 transition-colors rounded hover:text-red-600" title="Remove">
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
  <p className="text-xs text-gray-500">Allowed: PDF, DOC, DOCX. Max size 10MB each. Private files won't expose a public URL.</p>
    </div>
  );
};

export default FileUploader;
