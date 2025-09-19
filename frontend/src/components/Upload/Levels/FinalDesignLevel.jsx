import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadAPI } from '../../../utils/api';
import { Sparkles, CheckCircle, AlertCircle, Download, Eye, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

const FinalDesignLevel = ({ onComplete, levelData, onStartNewJourney, forceStartFromLevel1 = false }) => {
  const { user } = useAuth();
  const [finalDesignPreview, setFinalDesignPreview] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Generate preview of final design
  const generatePreview = async () => {
    try {
      setIsGeneratingPreview(true);
      const response = await uploadAPI.previewFinalDesign();
      setFinalDesignPreview(response.data.data.preview);
      toast.success('✨ Preview generated successfully!');
    } catch (error) {
      toast.error('Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Download final design and complete level
  const downloadFinalDesign = async () => {
    try {
      setIsDownloading(true);
      const response = await uploadAPI.downloadFinalDesign();
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `phygital-design-${user.username}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('🎉 Final design downloaded successfully!');
      
      // Complete the level
      setIsCompleted(true);
      onComplete({
        url: url,
        name: `phygital-design-${user.username}.png`,
        downloaded: true
      });
      
    } catch (error) {
      toast.error('Failed to download design');
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if all prerequisites are met
  const hasDesign = user?.uploadedFiles?.design?.url;
  const hasQRPosition = user?.qrPosition;
  const hasSocialLinks = user?.socialLinks && Object.values(user.socialLinks).some(link => link);

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
            🚀 Start New Journey
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
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Generate Your Final Design
        </h3>
        <p className="text-slate-300">
          Create and download your masterpiece with QR code overlay
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
