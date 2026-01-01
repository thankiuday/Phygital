import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadAPI } from '../../../utils/api';
import { Upload, CheckCircle, AlertCircle, Image } from 'lucide-react';
import toast from 'react-hot-toast';

const DesignUploadLevel = ({ onComplete, currentDesign, forceStartFromLevel1 = false, upgradeMode = false }) => {
  const { user, updateUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Design upload handler
  const onDesignDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Additional client-side validation for JPG/JPEG only
    const allowedTypes = ['image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG/JPEG files are supported. Please convert your image.');
      return;
    }
    
    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      toast.error(`Design file size must be less than 20MB. Your file is ${fileSizeMB}MB. Please compress your image.`);
      return;
    }
    
    const formData = new FormData();
    formData.append('design', file);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadAPI.uploadDesign(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      updateUser(response.data.data.user);
      toast.success('🎨 Design uploaded successfully!');
      
      
      // Complete the level - use the design from response (could be in project or root level)
      const designData = response.data.data.design || response.data.data.user?.uploadedFiles?.design;
      
      if (!designData || !designData.url) {
        console.error('❌ No design data in response:', response.data.data);
        toast.error('Design uploaded but URL not found');
        return;
      }
      
      onComplete({
        url: designData.url,
        name: designData.originalName || designData.name,
        size: designData.size
      });
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      setUploadProgress(0);
      setIsUploading(false);
      toast.error('Failed to upload design');
    }
  }, [updateUser, onComplete]);

  // Design dropzone
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections
  } = useDropzone({
    onDrop: onDesignDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  // Auto-complete the level if design exists and we're not forcing a fresh start (move useEffect outside conditional to fix hooks violation)
  // In upgrade mode, always require fresh upload (don't auto-complete)
  useEffect(() => {
    // Only auto-complete if:
    // 1. Not forcing fresh start
    // 2. Not in upgrade mode (in upgrade mode, Level 1 must be completed fresh)
    // 3. No current design (meaning we haven't completed this level yet)
    // 4. User has an existing design
    if (!forceStartFromLevel1 && !upgradeMode && !currentDesign && user?.uploadedFiles?.design?.url) {
      console.log('Auto-completing Level 1 with existing design');
      toast.success('🎨 Design found! Level 1 completed automatically.');
      onComplete({
        url: user.uploadedFiles.design.url,
        name: user.uploadedFiles.design.originalName,
        size: user.uploadedFiles.design.size
      });
    }
  }, [forceStartFromLevel1, upgradeMode, currentDesign, user?.uploadedFiles?.design?.url, onComplete]);

  // If design already exists and we're not forcing a fresh start, show completion UI
  // In upgrade mode, always show upload UI (force user to upload fresh design)
  if (!forceStartFromLevel1 && !upgradeMode && (currentDesign || user?.uploadedFiles?.design?.url)) {
    const design = currentDesign || user.uploadedFiles.design;
    
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-green/20 mb-6 shadow-glow-green">
          <CheckCircle className="w-10 h-10 text-neon-green" />
        </div>
        
        <h3 className="text-2xl font-bold text-neon-green mb-4">
          🎉 Level 1 Complete!
        </h3>
        
        <div className="bg-green-900/20 border border-neon-green/30 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <Image className="w-8 h-8 text-neon-green mr-3" />
            <span className="font-semibold text-neon-green">Design Uploaded</span>
          </div>
          <p className="text-slate-200 mb-2">{design.originalName || design.name}</p>
          <p className="text-sm text-slate-300">
            {design.size ? `${(design.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <img
            src={design.url}
            alt="Uploaded design"
            className="w-full h-auto rounded-lg shadow-dark-large"
          />
        </div>
        
        <p className="text-slate-300 mt-6">
          ✨ Great job! Your design is ready for the next level.
        </p>
        
        <div className="mt-6">
          <button
            onClick={() => onComplete({
              url: design.url,
              name: design.originalName || design.name,
              size: design.size
            })}
            className="btn-primary px-6 py-3"
          >
            Continue to Next Level →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-purple/20 mb-4 shadow-glow-purple">
          <Image className="w-8 h-8 text-neon-purple" />
        </div>
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Upload Your Design
        </h3>
        <p className="text-slate-300">
          Choose an image file to get started with your Phygital creation
        </p>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">
              Uploading...
            </span>
            <span className="text-sm font-medium text-slate-300">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-button-gradient h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 sm:p-8 lg:p-12 text-center cursor-pointer transition-all duration-300 touch-manipulation
          ${isDragActive 
            ? 'border-neon-purple bg-neon-purple/10 scale-105' 
            : 'border-slate-600 hover:border-neon-purple hover:bg-slate-800/50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-3 sm:space-y-4">
          <Upload className={`mx-auto h-12 w-12 sm:h-16 sm:w-16 ${isDragActive ? 'text-neon-purple' : 'text-slate-400'}`} />
          
          <div>
            <p className="text-lg sm:text-xl font-medium text-slate-100 mb-2">
              {isDragActive
                ? '🎯 Drop your design here!'
                : '📁 Drag & drop your design image here'
              }
            </p>
            <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">
              or tap to browse files
            </p>
            <p className="text-xs sm:text-sm text-slate-400">
              Only JPG/JPEG format supported (max 20MB)
            </p>
          </div>
        </div>
      </div>

      {/* File Rejection Errors */}
      {fileRejections.length > 0 && (
        <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-400 mb-2">❌ Invalid File Format</h4>
              <p className="text-sm text-red-300 mb-2">
                Only JPG/JPEG files are supported (max 20MB). Please convert your image to JPG/JPEG format and ensure it's under 20MB.
              </p>
              <p className="text-xs text-red-400">
                Supported formats: .jpg, .jpeg (max 20MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-6 sm:mt-8 bg-blue-900/20 border border-neon-blue/30 rounded-lg p-3 sm:p-4">
        <div className="flex items-start">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-blue mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-neon-blue mb-1 text-sm sm:text-base">💡 Pro Tips</h4>
            <ul className="text-xs sm:text-sm text-slate-300 space-y-1">
              <li>• Use high-quality JPG/JPEG images for best results</li>
              <li>• Consider leaving space for your QR code</li>
              <li>• Only JPG/JPEG formats are supported (max 20MB)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignUploadLevel;
