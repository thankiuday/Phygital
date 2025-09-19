import React, { useState, useCallback } from 'react';
import { Upload, Video, CheckCircle, AlertCircle, X } from 'lucide-react';
import { uploadAPI } from '../../../utils/api';
import toast from 'react-hot-toast';

const VideoUploadLevel = ({ onComplete, onCancel, levelData, user, forceStartFromLevel1 = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  // Check if user already has a video - only show existing video option if not forcing fresh start
  const existingVideo = !forceStartFromLevel1 ? user?.uploadedFiles?.video : null;

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
    // Check file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, MOV, AVI, etc.)');
      return false;
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError(`Video file size must be less than 50MB. Your file is ${formatFileSize(file.size)}`);
      return false;
    }

    // Check if file is empty
    if (file.size === 0) {
      setError('The selected file appears to be empty');
      return false;
    }

    // Check for common video formats
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported video format. Please use MP4, MOV, AVI, or WebM');
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = (file) => {
    if (!validateFile(file)) {
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null); // Clear any previous errors

      const formData = new FormData();
      formData.append('video', selectedFile);

      console.log('Uploading video:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });

      // Simulate progress with more realistic timing for large files
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85; // Leave room for completion
          }
          return prev + Math.random() * 5; // More realistic progress increments
        });
      }, 500); // Slower progress updates for better UX

      const response = await uploadAPI.uploadVideo(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.status === 'success') {
        toast.success('Video uploaded successfully!');
        
        // Update level data
        const updatedLevelData = {
          ...levelData,
          video: {
            filename: response.data.data.video.filename,
            originalName: response.data.data.video.originalName,
            size: response.data.data.video.size,
            mimetype: response.data.data.video.mimetype,
            url: response.data.data.video.url
          }
        };

        // Complete the level
        setTimeout(() => {
          onComplete(updatedLevelData);
        }, 500);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Video upload error:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to upload video';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try a smaller file or check your connection.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSkip = () => {
    // Allow skipping if user already has a video
    if (existingVideo) {
      const updatedLevelData = {
        ...levelData,
        video: existingVideo
      };
      onComplete(updatedLevelData);
    } else {
      toast.error('Please upload a video to continue');
    }
  };

  return (
    <div className="min-h-screen bg-dark-mesh flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-button-gradient rounded-full mb-3 sm:mb-4 shadow-glow-purple">
            <Video className="w-6 h-6 sm:w-8 sm:h-8 text-slate-100" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
            Upload Your Video
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Add a video to make your design interactive and engaging
          </p>
        </div>

        {/* Upload Area */}
        <div className="card-glass rounded-2xl shadow-dark-large p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
          {existingVideo && !selectedFile && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-900/20 border border-neon-green/30 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-green mr-2 flex-shrink-0" />
                <span className="text-neon-green font-medium text-sm sm:text-base">
                  You have a video from a previous project
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                You can upload a new video for this project or reuse the existing one
              </p>
            </div>
          )}

          {!selectedFile ? (
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
                Drop your video here
              </h3>
              <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
                or tap to browse files
              </p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="btn-primary inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 cursor-pointer touch-manipulation text-sm sm:text-base"
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Choose Video File
              </label>
              <p className="text-xs sm:text-sm text-slate-400 mt-3 sm:mt-4">
                Supports MP4, MOV, AVI, and other video formats (max 50MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Video className="w-8 h-8 text-neon-purple mr-3" />
                    <div>
                      <p className="font-medium text-slate-100">{selectedFile.name}</p>
                      <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-slate-400 hover:text-neon-red transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Video Preview */}
                {previewUrl && (
                  <div className="mt-4">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full max-w-md mx-auto rounded-lg"
                      style={{ maxHeight: '200px' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Uploading video...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-button-gradient h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  
                  {/* Upload Info */}
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>• Large videos may take several minutes to upload</p>
                    <p>• Please keep this page open during upload</p>
                    <p>• Upload timeout: 5 minutes</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-red-900/20 border border-neon-red/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-neon-red mr-2 flex-shrink-0" />
                    <span className="text-slate-200">{error}</span>
                  </div>
                  
                  {/* Troubleshooting Tips */}
                  <div className="p-3 bg-blue-900/20 border border-neon-blue/30 rounded-lg">
                    <h4 className="text-sm font-medium text-neon-blue mb-2">Troubleshooting Tips:</h4>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• Ensure your video is under 50MB</li>
                      <li>• Use MP4, MOV, AVI, or WebM format</li>
                      <li>• Check your internet connection speed</li>
                      <li>• Try compressing your video to reduce file size</li>
                      <li>• Close other browser tabs/apps to free up bandwidth</li>
                      <li>• Try refreshing the page and uploading again</li>
                      <li>• If timeout persists, try a smaller video file</li>
                    </ul>
                  </div>
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
            {existingVideo && (
              <button
                onClick={handleSkip}
                disabled={isUploading}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-700 text-slate-200 hover:bg-slate-600 font-medium rounded-lg transition-colors disabled:opacity-50 touch-manipulation text-sm sm:text-base"
              >
                Reuse Previous Video
              </button>
            )}
            
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="btn-primary px-4 sm:px-6 py-2 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation text-sm sm:text-base"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadLevel;
