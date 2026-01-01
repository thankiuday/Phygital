import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Image, File } from 'lucide-react';
import { uploadAPI } from '../../../utils/api';
import toast from 'react-hot-toast';

const DocumentUploadLevel = ({ onComplete, onCancel, levelData, user, forceStartFromLevel1 = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [allUploadedDocuments, setAllUploadedDocuments] = useState([]);

  // Check if user already has documents - only show existing documents option if not forcing fresh start
  const existingDocuments = !forceStartFromLevel1 ? (levelData?.documents || []) : [];
  
  // Initialize allUploadedDocuments with existing documents
  React.useEffect(() => {
    if (existingDocuments.length > 0 && allUploadedDocuments.length === 0) {
      setAllUploadedDocuments(existingDocuments);
    }
  }, [existingDocuments]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (file) => {
    // Allowed file types
    const allowedTypes = [
      // PDFs
      'application/pdf',
      // Word Documents
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Images
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      // Text Files
      'text/plain',
      'application/rtf',
      // Spreadsheets
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      // Presentations
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    // Check file type
    const isValidType = allowedTypes.includes(file.type) || 
                       file.name.match(/\.(pdf|doc|docx|txt|rtf|png|jpg|jpeg|gif|webp|bmp|svg|xls|xlsx|csv|ppt|pptx)$/i);
    
    if (!isValidType) {
      setError('Invalid file type. Please upload PDF, DOC, DOCX, images (PNG, JPG, GIF, WEBP, BMP, SVG), text files (TXT, RTF), spreadsheets (XLS, XLSX, CSV), or presentations (PPT, PPTX).');
      return false;
    }

    // Check file size (10MB limit per document)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(`File "${file.name}" exceeds 10MB limit. Please choose a smaller file.`);
      return false;
    }

    // Check if file is empty
    if (file.size === 0) {
      setError(`File "${file.name}" appears to be empty`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = async (files) => {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        // Check if file is already selected or already uploaded
        const isDuplicate = selectedFiles.some(f => f.name === file.name && f.size === file.size) ||
                           allUploadedDocuments.some(doc => (doc.originalName || '').toLowerCase() === file.name.toLowerCase());
        if (!isDuplicate) {
          validFiles.push(file);
        } else {
          errors.push(`"${file.name}" is already selected or uploaded`);
        }
      } else {
        errors.push(`"${file.name}" is invalid`);
      }
    });

    if (errors.length > 0 && errors.length === files.length) {
      // Only show error if all files failed
      toast.error(errors[0]);
    }

    if (validFiles.length > 0) {
      // Add files to selectedFiles state
      const updatedSelectedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(updatedSelectedFiles);
      toast.success(`${validFiles.length} file(s) added. Uploading...`);
      
      // Auto-upload the new files using the updated list
      // Use setTimeout to ensure state has updated and UI can show the files
      setTimeout(async () => {
        await uploadFiles(updatedSelectedFiles);
      }, 200);
    }
  };

  // Extract upload logic to a separate function that can accept files
  const uploadFiles = async (filesToUpload) => {
    if (!filesToUpload || filesToUpload.length === 0) {
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const uploadedDocs = [];
      const projectId = levelData?.projectId || user?.currentProject || (user?.projects?.length > 0 ? user.projects[user.projects.length - 1]?.id : null);

      // Upload each file sequentially
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileName = file.name;

        try {
          setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));

          const formData = new FormData();
          formData.append('documents', file);

          // Simulate progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const current = prev[fileName] || 0;
              if (current >= 85) {
                clearInterval(progressInterval);
                return { ...prev, [fileName]: 85 };
              }
              return { ...prev, [fileName]: current + Math.random() * 5 };
            });
          }, 200);

          const response = await uploadAPI.uploadDocuments(formData, projectId);

          clearInterval(progressInterval);
          setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));

          if (response.data?.status === 'success' && response.data?.data?.documents && Array.isArray(response.data.data.documents)) {
            const documents = response.data.data.documents;
            
            if (documents.length === 0) {
              console.error(`❌ Empty documents array in response for ${fileName}`);
              throw new Error(`No documents returned for ${fileName}`);
            }
            
            let uploadedDoc = documents.find(
              doc => {
                const docName = (doc.originalName || '').toLowerCase().trim();
                const fileNameLower = file.name.toLowerCase().trim();
                return docName === fileNameLower || 
                       docName.includes(fileNameLower) || 
                       fileNameLower.includes(docName);
              }
            );
            
            if (!uploadedDoc && documents.length > 0) {
              uploadedDoc = documents[0];
              console.log(`⚠️ Using first document from response for ${fileName} (name matching failed)`);
            }
            
            if (uploadedDoc && uploadedDoc.url) {
              uploadedDocs.push(uploadedDoc);
              console.log(`✅ Document ${fileName} uploaded successfully:`, uploadedDoc.url);
            } else {
              console.error(`❌ Invalid document data for ${fileName}:`, uploadedDoc);
              if (uploadedDoc) {
                uploadedDocs.push(uploadedDoc);
              } else {
                throw new Error(`Invalid document data returned for ${fileName}`);
              }
            }
          } else {
            const errorMsg = response.data?.message || response.data?.error || 'Unknown error';
            const responseStatus = response.data?.status || 'unknown';
            console.error(`❌ Upload failed for ${fileName}:`, {
              status: responseStatus,
              message: errorMsg,
              fullResponse: response.data
            });
            throw new Error(`Failed to upload ${fileName}: ${errorMsg} (status: ${responseStatus})`);
          }
        } catch (fileError) {
          console.error(`Error uploading ${fileName}:`, fileError);
          toast.error(`Failed to upload ${fileName}`);
        }
      }

      if (uploadedDocs.length > 0) {
        toast.success(`${uploadedDocs.length} document(s) uploaded successfully!`);
        
        const updatedDocuments = [...allUploadedDocuments, ...uploadedDocs];
        setAllUploadedDocuments(updatedDocuments);
        
        // Clear the uploaded files from selectedFiles
        setSelectedFiles([]);
        setUploadProgress({});
      } else {
        throw new Error('No documents were uploaded successfully');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      
      let errorMessage = 'Failed to upload documents';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try smaller files or check your connection.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [selectedFiles]);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const removeFile = (index) => {
    const fileToRemove = selectedFiles[index];
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileToRemove.name];
      return newProgress;
    });
    setError(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else if (file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    } else {
      return <File className="w-8 h-8 text-slate-400" />;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one document to upload');
      return;
    }
    
    await uploadFiles(selectedFiles);
  };

  const handleContinue = () => {
    // Complete the level with all uploaded documents
    const updatedLevelData = {
      ...levelData,
      documents: allUploadedDocuments
    };
    onComplete(updatedLevelData);
  };

  const handleSkip = () => {
    // Documents are optional - allow skipping
    const updatedLevelData = {
      ...levelData,
      documents: allUploadedDocuments.length > 0 ? allUploadedDocuments : []
    };
    onComplete(updatedLevelData);
  };

  return (
    <div className="min-h-screen bg-dark-mesh flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-button-gradient rounded-full mb-3 sm:mb-4 shadow-glow-purple">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-slate-100" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
            Upload Documents
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Add PDFs, Word documents, images, or text files (optional)
          </p>
        </div>

        {/* Upload Area */}
        <div className="card-glass rounded-2xl shadow-dark-large p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          {/* Show uploaded documents */}
          {allUploadedDocuments.length > 0 && (
            <div className="mb-4 sm:mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-semibold text-slate-100">
                  Uploaded Documents ({allUploadedDocuments.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allUploadedDocuments.map((doc, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/30 flex items-center">
                    {getFileIcon({ type: doc.mimetype || 'application/pdf' })}
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="font-medium text-slate-100 truncate text-sm">{doc.originalName || `Document ${index + 1}`}</p>
                      <p className="text-xs text-slate-400">{doc.size ? formatFileSize(doc.size) : ''}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-neon-green ml-2 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {existingDocuments.length > 0 && selectedFiles.length === 0 && allUploadedDocuments.length === 0 && !forceStartFromLevel1 && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-900/20 border border-neon-green/30 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green mr-2 flex-shrink-0" />
                <span className="text-neon-green font-medium text-sm sm:text-base">
                  You have {existingDocuments.length} document(s) from a previous project
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                You can upload new documents or skip to continue with existing ones
              </p>
            </div>
          )}

          {selectedFiles.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 lg:p-12 text-center transition-all duration-200 touch-manipulation ${
                isDragging
                  ? 'border-neon-purple bg-neon-purple/10'
                  : 'border-slate-600 hover:border-neon-purple hover:bg-slate-800/50'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-2">
                Drop your documents here
              </h3>
              <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
                or tap to browse files
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.xls,.xlsx,.csv,.ppt,.pptx"
                onChange={handleFileInput}
                multiple
                className="hidden"
                id="document-upload"
              />
              <label
                htmlFor="document-upload"
                className="btn-primary inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 cursor-pointer touch-manipulation text-sm sm:text-base"
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Choose Documents
              </label>
              <p className="text-xs sm:text-sm text-slate-400 mt-3 sm:mt-4">
                PDF, DOC, DOCX, images (PNG, JPG, GIF, WEBP, BMP, SVG), text files (TXT, RTF), spreadsheets (XLS, XLSX, CSV), or presentations (PPT, PPTX) - max 10MB each
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Files List */}
              <div className="space-y-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1 min-w-0">
                        {getFileIcon(file)}
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="font-medium text-slate-100 truncate">{file.name}</p>
                          <p className="text-sm text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="text-slate-400 hover:text-neon-red transition-colors disabled:opacity-50 ml-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Upload Progress for this file */}
                    {isUploading && uploadProgress[file.name] !== undefined && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress[file.name] || 0)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-button-gradient h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress[file.name] || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center p-3 bg-red-900/20 border border-neon-red/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-neon-red mr-2 flex-shrink-0" />
                  <span className="text-slate-200 text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <button
            onClick={onCancel}
            className="px-4 sm:px-6 py-2 sm:py-3 text-slate-300 hover:text-slate-100 font-medium transition-colors touch-manipulation text-sm sm:text-base"
          >
            Back
          </button>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSkip}
              disabled={isUploading}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-700 text-slate-200 hover:bg-slate-600 font-medium rounded-lg transition-colors disabled:opacity-50 touch-manipulation text-sm sm:text-base"
            >
              Skip (Optional)
            </button>
            
            {/* Show Upload button only when files selected but not uploading */}
            {selectedFiles.length > 0 && !isUploading && (
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0}
                className="btn-primary px-4 sm:px-6 py-2 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation text-sm sm:text-base"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload {selectedFiles.length} Document{selectedFiles.length !== 1 ? 's' : ''}
              </button>
            )}
            
            {/* Show Next button always when not uploading and not showing upload button */}
            {selectedFiles.length === 0 && !isUploading && (
              <button
                onClick={handleContinue}
                className="btn-primary px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-center touch-manipulation text-sm sm:text-base"
              >
                {allUploadedDocuments.length > 0 ? (
                  <>
                    Next ({allUploadedDocuments.length} document{allUploadedDocuments.length !== 1 ? 's' : ''})
                  </>
                ) : (
                  'Next'
                )}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            
            {/* Show loading state when uploading */}
            {isUploading && (
              <button
                disabled
                className="btn-primary px-4 sm:px-6 py-2 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation text-sm sm:text-base"
              >
                <div className="w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadLevel;

