import React, { useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText, CheckCircle } from 'lucide-react';

/**
 * FileUploadManager Component
 * Handles multi-file upload with drag & drop, preview, and validation
 */
const FileUploadManager = ({ onFilesSelected, maxFiles = 5, maxSizePerFile = 10 }) => {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    pdf: ['application/pdf'],
    document: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  };

  const ALL_ALLOWED = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.pdf, ...ALLOWED_TYPES.document, ...ALLOWED_TYPES.spreadsheet];

  const getFileIcon = (type) => {
    if (ALLOWED_TYPES.image.includes(type)) return <Image className="w-4 h-4" />;
    if (ALLOWED_TYPES.pdf.includes(type)) return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4" />;
  };

  const getFileCategory = (type) => {
    if (ALLOWED_TYPES.image.includes(type)) return 'Image';
    if (ALLOWED_TYPES.pdf.includes(type)) return 'PDF';
    if (ALLOWED_TYPES.document.includes(type)) return 'Document';
    if (ALLOWED_TYPES.spreadsheet.includes(type)) return 'Spreadsheet';
    return 'File';
  };

  const validateFile = (file) => {
    const errors = [];

    if (!ALL_ALLOWED.includes(file.type)) {
      errors.push('File type not supported');
    }

    if (file.size > maxSizePerFile * 1024 * 1024) {
      errors.push(`File exceeds ${maxSizePerFile}MB limit`);
    }

    return errors;
  };

  const handleFiles = useCallback((fileList) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles = [];
    const errors = [];

    Array.from(fileList).forEach((file, index) => {
      const validationErrors = validateFile(file);

      if (validationErrors.length > 0) {
        errors.push(`${file.name}: ${validationErrors.join(', ')}`);
      } else if (files.length + newFiles.length < maxFiles) {
        const fileObj = {
          id: `${Date.now()}-${index}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          category: getFileCategory(file.type),
          progress: 100, // In real app, track actual upload progress
          status: 'uploaded',
          preview: null,
        };

        // Generate preview for images
        if (ALLOWED_TYPES.image.includes(file.type)) {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileObj.preview = e.target.result;
            setFiles((prev) => [...prev]);
          };
          reader.readAsDataURL(file);
        }

        newFiles.push(fileObj);
      } else {
        errors.push(`Maximum ${maxFiles} files allowed`);
      }
    });

    setFiles((prev) => [...prev, ...newFiles]);

    if (errors.length > 0) {
      console.warn('Upload errors:', errors);
    }

    // Notify parent component
    if (onFilesSelected) {
      onFilesSelected([...files, ...newFiles]);
    }
  }, [files, maxFiles, onFilesSelected]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const removeFile = (fileId) => {
    const updated = files.filter((f) => f.id !== fileId);
    setFiles(updated);
    if (onFilesSelected) {
      onFilesSelected(updated);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const canAddMore = files.length < maxFiles;

  return (
    <div className="w-full space-y-4">
      {/* Drag & Drop Zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept={ALL_ALLOWED.join(',')}
            onChange={handleInputChange}
            className="hidden"
            disabled={!canAddMore}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Drag files here or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Max {maxFiles} files, {maxSizePerFile}MB each (Images, PDFs, Documents)
              </p>
            </div>
          </label>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Files ({files.length}/{maxFiles})
          </h4>

          <div className="grid gap-3">
            {files.map((fileObj) => (
              <div
                key={fileObj.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Preview or Icon */}
                <div className="flex-shrink-0">
                  {fileObj.preview ? (
                    <img
                      src={fileObj.preview}
                      alt={fileObj.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {getFileIcon(fileObj.type)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {fileObj.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {fileObj.category} • {formatFileSize(fileObj.size)}
                    </span>
                    {fileObj.status === 'uploaded' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(fileObj.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && !canAddMore && (
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          Maximum file limit reached
        </div>
      )}
    </div>
  );
};

export default FileUploadManager;
