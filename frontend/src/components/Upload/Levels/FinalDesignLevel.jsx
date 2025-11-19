import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadAPI, generateQRCode, downloadFile } from '../../../utils/api';
import { generateQRSticker } from '../../../utils/qrStickerGenerator';
import { Sparkles, CheckCircle, AlertCircle, Download, Eye, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

const FinalDesignLevel = ({ onComplete, levelData, onStartNewJourney, forceStartFromLevel1 = false }) => {
  const { user } = useAuth();
  const [finalDesignPreview, setFinalDesignPreview] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Generate preview of final design with sticker design
  const generatePreview = async () => {
    try {
      setIsGeneratingPreview(true);
      
      // Create canvas for preview
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load the original design image
      const designImg = document.createElement('img');
      designImg.crossOrigin = 'anonymous';
      
      const designUrl = levelData?.design?.url || user?.uploadedFiles?.design?.url;
      await new Promise((resolve, reject) => {
        designImg.onload = resolve;
        designImg.onerror = reject;
        designImg.src = designUrl;
      });
      
      // Set canvas to image dimensions
      canvas.width = designImg.naturalWidth;
      canvas.height = designImg.naturalHeight;
      
      // Draw the design image
      ctx.drawImage(designImg, 0, 0);
      
      // Get QR position from levelData or user data
      // Note: qrPosition values are stored in pixels relative to actual image dimensions
      // (converted via screenToImageCoords which scales from displayed size to natural size)
      const qrPos = levelData?.qrPosition || user?.qrPosition || { x: 100, y: 100, width: 100, height: 100 };
      console.log('📍 QR Position:', qrPos);
      console.log('🖼️ Design image dimensions:', {
        naturalWidth: designImg.naturalWidth,
        naturalHeight: designImg.naturalHeight
      });
      
      // QR position is already in actual image coordinates, use directly
      // But we need to scale if the stored position was relative to a different image size
      // Check if position values seem reasonable (if they're > naturalWidth, they're in display coordinates)
      let actualQrX, actualQrY, actualQrWidth, actualQrHeight;
      
      if (qrPos.width > designImg.naturalWidth || qrPos.height > designImg.naturalHeight) {
        // Position appears to be in display coordinates, need to scale
        // Calculate display dimensions based on image aspect ratio
        const maxDisplayWidth = 400;
        const imageAspectRatio = designImg.naturalWidth / designImg.naturalHeight;
        let displayWidth, displayHeight;
        
        if (imageAspectRatio > 1) {
          displayWidth = maxDisplayWidth;
          displayHeight = maxDisplayWidth / imageAspectRatio;
        } else {
          displayHeight = maxDisplayWidth / imageAspectRatio;
          displayWidth = maxDisplayWidth;
          if (displayHeight > 300) {
            displayHeight = 300;
            displayWidth = 300 * imageAspectRatio;
          }
        }
        
        actualQrX = (qrPos.x / displayWidth) * designImg.naturalWidth;
        actualQrY = (qrPos.y / displayHeight) * designImg.naturalHeight;
        actualQrWidth = (qrPos.width / displayWidth) * designImg.naturalWidth;
        actualQrHeight = (qrPos.height / displayHeight) * designImg.naturalHeight;
        
        console.log('📐 Scaling from display coordinates:', { displayWidth, displayHeight });
      } else {
        // Position is already in actual image coordinates, use directly
        actualQrX = qrPos.x;
        actualQrY = qrPos.y;
        actualQrWidth = qrPos.width;
        actualQrHeight = qrPos.height;
        
        console.log('📐 Using position directly (already in actual image coordinates)');
      }
      
      console.log('📏 Calculated QR position:', {
        actualQrX,
        actualQrY,
        actualQrWidth,
        actualQrHeight
      });
      
      // Generate QR code URL for the user's personalized page
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5173';
      const userIdentifier = user.urlCode || user._id;
      const projectId = levelData?.projectId || user.currentProject || 'default';
      const qrCodeUrl = `${frontendUrl}/#/ar/user/${userIdentifier}/project/${projectId}`;
      
      // Calculate QR code size needed to match the positioned sticker dimensions
      // Sticker dimensions: width = qrSize + padding*2 + borderWidth*2, height = qrSize + padding*2 + borderWidth*2 + textHeight
      // So: qrSize = actualQrWidth - (padding*2 + borderWidth*2) = actualQrWidth - 40
      // Minimum QR code size for reliable scanning: ~80px (allows for ~120px sticker width minimum)
      const padding = 16;
      const borderWidth = 4;
      const textHeight = 40;
      const MIN_QR_CODE_SIZE = 80; // Minimum QR code size for reliable scanning
      const qrCodeSize = Math.max(MIN_QR_CODE_SIZE, Math.round(actualQrWidth - (padding * 2 + borderWidth * 2)));
      console.log('🔲 Calculating QR code size to match positioned dimensions:', {
        actualQrWidth,
        actualQrHeight,
        qrCodeSize,
        expectedStickerWidth: qrCodeSize + padding * 2 + borderWidth * 2,
        expectedStickerHeight: qrCodeSize + padding * 2 + borderWidth * 2 + textHeight
      });
      
      try {
        // Generate plain QR code directly on frontend (no watermark)
        const qrDataUrl = await generateQRCode(qrCodeUrl, {
          size: qrCodeSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        console.log('✅ Plain QR code generated:', { size: qrDataUrl.length });

        // Generate sticker with gradient border and "SCAN ME" text
        console.log('🎨 Generating sticker with QR size:', qrCodeSize);
        let stickerDataUrl;
        try {
          stickerDataUrl = await generateQRSticker(qrDataUrl, {
            variant: 'purple',
            qrSize: qrCodeSize,
            borderWidth: 4,
            padding: 16
          });
          console.log('✅ Sticker generated, data URL length:', stickerDataUrl.length);
          if (!stickerDataUrl || !stickerDataUrl.startsWith('data:image')) {
            throw new Error('Invalid sticker data URL generated');
          }
        } catch (stickerError) {
          console.error('❌ Sticker generation failed:', stickerError);
          throw new Error(`Failed to generate sticker: ${stickerError.message}`);
        }

        // Load sticker image
        const stickerImg = document.createElement('img');
        stickerImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          stickerImg.onload = () => {
            console.log('✅ Sticker image loaded:', {
              width: stickerImg.width,
              height: stickerImg.height,
              naturalWidth: stickerImg.naturalWidth,
              naturalHeight: stickerImg.naturalHeight
            });
            if (stickerImg.naturalWidth === 0 || stickerImg.naturalHeight === 0) {
              reject(new Error('Sticker image has zero dimensions'));
              return;
            }
            resolve();
          };
          stickerImg.onerror = (error) => {
            console.error('❌ Sticker image load error:', error);
            reject(new Error('Failed to load sticker image'));
          };
          stickerImg.src = stickerDataUrl;
        });

        // Use the exact positioned dimensions (user set these during positioning)
        const stickerDisplayWidth = actualQrWidth;
        const stickerDisplayHeight = actualQrHeight;

        console.log('📐 Sticker positioning (using exact positioned dimensions):', {
          actualQrX,
          actualQrY,
          actualQrWidth,
          actualQrHeight,
          stickerDisplayWidth,
          stickerDisplayHeight,
          stickerNaturalWidth: stickerImg.naturalWidth,
          stickerNaturalHeight: stickerImg.naturalHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });

        // Draw sticker at exact positioned location and size
        const stickerX = Math.max(0, Math.min(actualQrX, canvas.width - stickerDisplayWidth));
        const stickerY = Math.max(0, Math.min(actualQrY, canvas.height - stickerDisplayHeight));

        // Draw sticker on the composite using exact positioned dimensions
        console.log('🎨 Drawing sticker on canvas with exact positioned dimensions...');
        ctx.drawImage(stickerImg, stickerX, stickerY, stickerDisplayWidth, stickerDisplayHeight);
        console.log('✅ Sticker drawn at:', { x: stickerX, y: stickerY, width: stickerDisplayWidth, height: stickerDisplayHeight });

        // Set preview
        const previewDataUrl = canvas.toDataURL('image/png', 1.0);
        console.log('✅ Preview generated, data URL length:', previewDataUrl.length);
        setFinalDesignPreview(previewDataUrl);
        toast.success('✨ Preview generated with sticker design!');
      } catch (qrError) {
        console.error('QR loading failed:', qrError);
        toast.error('Failed to generate QR code for preview');
      }
    } catch (error) {
      console.error('Generate preview error:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Download final design with sticker design and complete level
  const downloadFinalDesign = async () => {
    try {
      setIsDownloading(true);
      
      // Create a fresh composite image with sticker design
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load the original design image
      const designImg = document.createElement('img');
      designImg.crossOrigin = 'anonymous';
      
      const designUrl = levelData?.design?.url || user?.uploadedFiles?.design?.url;
      await new Promise((resolve, reject) => {
        designImg.onload = resolve;
        designImg.onerror = reject;
        designImg.src = designUrl;
      });
      
      // Set canvas to image dimensions
      canvas.width = designImg.naturalWidth;
      canvas.height = designImg.naturalHeight;
      
      // Draw the design image
      ctx.drawImage(designImg, 0, 0);
      
      // Get QR position from levelData or user data
      // Note: qrPosition values are stored in pixels relative to actual image dimensions
      // (converted via screenToImageCoords which scales from displayed size to natural size)
      const qrPos = levelData?.qrPosition || user?.qrPosition || { x: 100, y: 100, width: 100, height: 100 };
      console.log('📍 QR Position for download:', qrPos);
      console.log('🖼️ Design image dimensions:', {
        naturalWidth: designImg.naturalWidth,
        naturalHeight: designImg.naturalHeight
      });
      
      // QR position is already in actual image coordinates, use directly
      // But we need to scale if the stored position was relative to a different image size
      // Check if position values seem reasonable (if they're > naturalWidth, they're in display coordinates)
      let actualQrX, actualQrY, actualQrWidth, actualQrHeight;
      
      if (qrPos.width > designImg.naturalWidth || qrPos.height > designImg.naturalHeight) {
        // Position appears to be in display coordinates, need to scale
        // Calculate display dimensions based on image aspect ratio
        const maxDisplayWidth = 400;
        const imageAspectRatio = designImg.naturalWidth / designImg.naturalHeight;
        let displayWidth, displayHeight;
        
        if (imageAspectRatio > 1) {
          displayWidth = maxDisplayWidth;
          displayHeight = maxDisplayWidth / imageAspectRatio;
        } else {
          displayHeight = maxDisplayWidth / imageAspectRatio;
          displayWidth = maxDisplayWidth;
          if (displayHeight > 300) {
            displayHeight = 300;
            displayWidth = 300 * imageAspectRatio;
          }
        }
        
        actualQrX = (qrPos.x / displayWidth) * designImg.naturalWidth;
        actualQrY = (qrPos.y / displayHeight) * designImg.naturalHeight;
        actualQrWidth = (qrPos.width / displayWidth) * designImg.naturalWidth;
        actualQrHeight = (qrPos.height / displayHeight) * designImg.naturalHeight;
        
        console.log('📐 Scaling from display coordinates:', { displayWidth, displayHeight });
      } else {
        // Position is already in actual image coordinates, use directly
        actualQrX = qrPos.x;
        actualQrY = qrPos.y;
        actualQrWidth = qrPos.width;
        actualQrHeight = qrPos.height;
        
        console.log('📐 Using position directly (already in actual image coordinates)');
      }
      
      console.log('📏 Calculated QR position for download:', {
        actualQrX,
        actualQrY,
        actualQrWidth,
        actualQrHeight
      });
      
      // Generate QR code URL for the user's personalized page
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5173';
      const userIdentifier = user.urlCode || user._id;
      const projectId = levelData?.projectId || user.currentProject || 'default';
      const qrCodeUrl = `${frontendUrl}/#/ar/user/${userIdentifier}/project/${projectId}`;
      
      // Calculate QR code size needed to match the positioned sticker dimensions
      // Sticker dimensions: width = qrSize + padding*2 + borderWidth*2, height = qrSize + padding*2 + borderWidth*2 + textHeight
      // So: qrSize = actualQrWidth - (padding*2 + borderWidth*2) = actualQrWidth - 40
      // Minimum QR code size for reliable scanning: ~80px (allows for ~120px sticker width minimum)
      const padding = 16;
      const borderWidth = 4;
      const textHeight = 40;
      const MIN_QR_CODE_SIZE = 80; // Minimum QR code size for reliable scanning
      const qrCodeSize = Math.max(MIN_QR_CODE_SIZE, Math.round(actualQrWidth - (padding * 2 + borderWidth * 2)));
      console.log('🔲 Calculating QR code size to match positioned dimensions for download:', {
        actualQrWidth,
        actualQrHeight,
        qrCodeSize,
        expectedStickerWidth: qrCodeSize + padding * 2 + borderWidth * 2,
        expectedStickerHeight: qrCodeSize + padding * 2 + borderWidth * 2 + textHeight
      });
      
      try {
        // Generate plain QR code directly on frontend (no watermark)
        const qrDataUrl = await generateQRCode(qrCodeUrl, {
          size: qrCodeSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        console.log('✅ Plain QR code generated for download:', { size: qrDataUrl.length });

        // Generate sticker with gradient border and "SCAN ME" text
        console.log('🎨 Generating sticker with QR size:', qrCodeSize);
        let stickerDataUrl;
        try {
          stickerDataUrl = await generateQRSticker(qrDataUrl, {
            variant: 'purple',
            qrSize: qrCodeSize,
            borderWidth: 4,
            padding: 16
          });
          console.log('✅ Sticker generated for download, data URL length:', stickerDataUrl.length);
          if (!stickerDataUrl || !stickerDataUrl.startsWith('data:image')) {
            throw new Error('Invalid sticker data URL generated');
          }
        } catch (stickerError) {
          console.error('❌ Sticker generation failed:', stickerError);
          throw new Error(`Failed to generate sticker: ${stickerError.message}`);
        }

        // Load sticker image
        const stickerImg = document.createElement('img');
        stickerImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          stickerImg.onload = () => {
            console.log('✅ Sticker image loaded for download:', {
              width: stickerImg.width,
              height: stickerImg.height,
              naturalWidth: stickerImg.naturalWidth,
              naturalHeight: stickerImg.naturalHeight
            });
            if (stickerImg.naturalWidth === 0 || stickerImg.naturalHeight === 0) {
              reject(new Error('Sticker image has zero dimensions'));
              return;
            }
            resolve();
          };
          stickerImg.onerror = (error) => {
            console.error('❌ Sticker image load error:', error);
            reject(new Error('Failed to load sticker image'));
          };
          stickerImg.src = stickerDataUrl;
        });

        // Use the exact positioned dimensions (user set these during positioning)
        const stickerDisplayWidth = actualQrWidth;
        const stickerDisplayHeight = actualQrHeight;

        console.log('📐 Sticker positioning for download (using exact positioned dimensions):', {
          actualQrX,
          actualQrY,
          actualQrWidth,
          actualQrHeight,
          stickerDisplayWidth,
          stickerDisplayHeight,
          stickerNaturalWidth: stickerImg.naturalWidth,
          stickerNaturalHeight: stickerImg.naturalHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });

        // Draw sticker at exact positioned location and size
        const stickerX = Math.max(0, Math.min(actualQrX, canvas.width - stickerDisplayWidth));
        const stickerY = Math.max(0, Math.min(actualQrY, canvas.height - stickerDisplayHeight));

        // Draw sticker on the composite using exact positioned dimensions
        console.log('🎨 Drawing sticker on canvas for download with exact positioned dimensions...');
        ctx.drawImage(stickerImg, stickerX, stickerY, stickerDisplayWidth, stickerDisplayHeight);
        console.log('✅ Sticker drawn for download at:', { x: stickerX, y: stickerY, width: stickerDisplayWidth, height: stickerDisplayHeight });
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          const filename = `phygital-design-${user.username}.png`;
          
          // Use the downloadFile utility
          downloadFile(blob, filename);
          
          toast.success('🎉 Final design downloaded with sticker design!');
          
          // Complete the level
          setIsCompleted(true);
          onComplete({
            url: URL.createObjectURL(blob),
            name: filename,
            downloaded: true
          });
          
          setIsDownloading(false);
        }, 'image/png', 1.0);
      } catch (qrError) {
        console.error('QR loading failed:', qrError);
        toast.error('Failed to generate QR code for download');
        setIsDownloading(false);
      }
      
    } catch (error) {
      console.error('Download preparation failed:', error);
      toast.error('Failed to download design');
      setIsDownloading(false);
    }
  };

  // Check if all prerequisites are met - use levelData instead of user (for project-based storage)
  const hasDesign = levelData?.design?.url || user?.uploadedFiles?.design?.url;
  const hasQRPosition = levelData?.qrPosition || user?.qrPosition;
  const hasSocialLinks = levelData?.socialLinks 
    ? Object.values(levelData.socialLinks).some(link => link) 
    : (user?.socialLinks && Object.values(user.socialLinks).some(link => link));
  
  console.log('🎯 FinalDesignLevel - Prerequisites check:', {
    hasDesign: !!hasDesign,
    hasQRPosition: !!hasQRPosition,
    hasSocialLinks: !!hasSocialLinks,
    levelData,
    designUrl: levelData?.design?.url,
    qrPosition: levelData?.qrPosition
  });

  if (isCompleted) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-neon-orange mb-8 animate-bounce shadow-glow-orange">
          <Trophy className="w-12 h-12 text-slate-900" />
        </div>
        
        <h3 className="text-3xl font-bold text-neon-orange mb-4">
          🏆 Congratulations!
        </h3>
        
        <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-neon-orange/30 rounded-xl p-8 mb-8">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-neon-orange mr-3" />
            <span className="text-2xl font-bold text-neon-orange">Level 4 Complete!</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-neon-green mr-3" />
              <span className="text-lg text-slate-200">Design uploaded and processed</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-neon-green mr-3" />
              <span className="text-lg text-slate-200">QR code positioned perfectly</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-neon-green mr-3" />
              <span className="text-lg text-slate-200">Social links connected</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-neon-green mr-3" />
              <span className="text-lg text-slate-200">Final design downloaded</span>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-900/20 border border-neon-blue/30 rounded-lg p-6 mb-8">
          <h4 className="font-semibold text-neon-blue mb-2">🎯 What's Next?</h4>
          <p className="text-slate-300">
            Your final design has been saved to your history page. You can now:
          </p>
          <ul className="text-slate-300 mt-2 space-y-1">
            <li>• View all your designs in the History page</li>
            <li>• Generate and download QR codes for your projects</li>
            <li>• Share your QR code with others</li>
            <li>• Create more designs by starting a new journey</li>
          </ul>
        </div>
        
        <p className="text-slate-300 text-lg mb-8">
          🎉 You've successfully completed the Phygital Creator Journey!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/history'}
            className="btn-primary px-6 py-3"
          >
            📚 View History
          </button>
          <button
            onClick={() => window.location.href = '/qrcode?refresh=true'}
            className="btn-primary px-6 py-3"
          >
            🔗 View QR Codes
          </button>
          <button
            onClick={() => {
              if (onStartNewJourney) {
                onStartNewJourney();
              } else {
                window.location.reload();
              }
            }}
            className="btn-primary px-6 py-3"
          >
            Start New Journey
          </button>
        </div>
      </div>
    );
  }

  if (!hasDesign || !hasQRPosition) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-16 w-16 text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Prerequisites Required
        </h3>
        <p className="text-slate-300 mb-4">
          Please complete the previous levels first:
        </p>
        <div className="space-y-2 text-sm text-slate-300">
          {!hasDesign && <p>❌ Upload a design image (Level 1)</p>}
          {!hasQRPosition && <p>❌ Set QR code position (Level 2)</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-orange/20 mb-4 shadow-glow-orange">
          <Sparkles className="w-8 h-8 text-neon-orange" />
        </div>
        <h3 className="text-2xl font-bold text-slate-100 mb-2">
          Download Your Design
        </h3>
        <p className="text-slate-300">
          Generate and download your final design with the QR code overlaid
        </p>
      </div>

      {/* Preview Section */}
      <div className="card-glass border-2 border-slate-600/30 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-slate-100">
            Preview Your Design
          </h4>
          <button
            onClick={generatePreview}
            disabled={isGeneratingPreview}
            className="btn-primary inline-flex items-center px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4 mr-2" />
            {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
          </button>
        </div>
        
        {finalDesignPreview ? (
          <div className="border border-slate-600/30 rounded-lg p-4 bg-slate-800/50">
            <img
              src={finalDesignPreview}
              alt="Final design with QR code"
              className="max-w-full h-auto rounded-lg shadow-dark-large mx-auto"
            />
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center">
            <Eye className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-300">
              Click "Generate Preview" to see your final design with QR code
            </p>
          </div>
        )}
      </div>

      {/* Download Section */}
      <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-neon-orange/30 rounded-xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-orange mb-4 shadow-glow-orange">
            <Download className="w-8 h-8 text-slate-900" />
          </div>
          <h4 className="text-xl font-semibold text-slate-100 mb-2">
            Download Your Masterpiece
          </h4>
          <p className="text-slate-300">
            Get your final design as a high-quality PNG file
          </p>
        </div>
        
        <div className="text-center">
          <button
            onClick={downloadFinalDesign}
            disabled={isDownloading}
            className="btn-primary inline-flex items-center px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Download className="w-6 h-6 mr-3" />
            {isDownloading ? 'Downloading...' : 'Download Final Design'}
            <Sparkles className="w-6 h-6 ml-3" />
          </button>
        </div>
        
        <div className="mt-6 bg-slate-800/50 border border-slate-600/30 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-neon-green mr-3 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                Ready to download!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Your design will be saved as "phygital-design-{user.username}.png" and automatically added to your history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-orange-900/20 border border-neon-orange/30 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-neon-orange mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-neon-orange mb-1">💡 Final Tips</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Generate a preview first to see how your design looks</li>
              <li>• The download will automatically save to your history</li>
              <li>• You can always create more designs by starting over</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalDesignLevel;
