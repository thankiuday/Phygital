/**
 * QR Design Customizer Component
 * Clean structure with website's dark theme and neon colors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  QrCode,
  Frame,
  Palette,
  CornerDownRight,
  Image as ImageIcon,
  Upload,
  X,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateAdvancedQRCode } from '../../utils/qrGenerator';

const QRDesignCustomizer = ({ 
  onDesignChange, 
  initialDesign = null,
  previewUrl = '',
  disabled = false 
}) => {
  // Default design state
  const defaultDesign = {
    frame: {
      style: 'none',
      text: 'Scan me!',
      textColor: '#000000',
      color: '#000000',
      backgroundColor: '#FFFFFF',
      transparentBackground: false,
      useGradient: false
    },
    pattern: {
      style: 'square',
      color: '#000000',
      backgroundColor: '#FFFFFF',
      transparentBackground: false,
      useGradient: false
    },
    corners: {
      frameStyle: 'square',
      dotStyle: 'square',
      frameColor: '#000000',
      dotColor: '#000000'
    },
    logo: {
      enabled: false,
      url: null,
      size: 0.15
    }
  };

  const [design, setDesign] = useState(initialDesign || defaultDesign);
  const [expandedSections, setExpandedSections] = useState({
    frame: false,
    pattern: false,
    corners: false,
    logo: true
  });
  const [preview, setPreview] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('preview'); // 'preview' or 'qrcode'

  // Update design when initialDesign changes
  useEffect(() => {
    if (initialDesign) {
      setDesign(initialDesign);
    }
  }, [initialDesign]);

  // Debounced preview generation
  useEffect(() => {
    if (!previewUrl || disabled) {
      setPreview(null);
      return;
    }

    setIsGeneratingPreview(true);
    const timeoutId = setTimeout(async () => {
      try {
        const previewDataUrl = await generateAdvancedQRCode(previewUrl, design, 256);
        if (previewDataUrl) {
          setPreview(previewDataUrl);
        } else {
          setPreview(null);
        }
      } catch (error) {
        console.error('Preview generation error:', error);
        setPreview(null);
      } finally {
        setIsGeneratingPreview(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [previewUrl, design, disabled]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateDesign = (section, updates) => {
    const newDesign = {
      ...design,
      [section]: {
        ...design[section],
        ...updates
      }
    };
    setDesign(newDesign);
    if (onDesignChange) {
      onDesignChange(newDesign);
    }
  };

  // Frame styles
  const frameStyles = [
    { id: 'none', label: 'No Frame', icon: '🚫' },
    { id: 'simple1', label: 'Simple Frame 1', icon: '▭' },
    { id: 'simple2', label: 'Simple Frame 2', icon: '▭' },
    { id: 'simple3', label: 'Simple Frame 3', icon: '▭' },
    { id: 'simple4', label: 'Simple Frame 4', icon: '▭' },
    { id: 'simple5', label: 'Simple Frame 5', icon: '▭' },
    { id: 'simple6', label: 'Simple Frame 6', icon: '▭' },
    { id: 'simple7', label: 'Simple Frame 7', icon: '▭' },
    { id: 'handwritten', label: 'Handwritten Scan Me', icon: '✍️' },
    { id: 'thumbsup', label: 'Thumbs Up Frame', icon: '👍' },
    { id: 'shopping', label: 'Shopping Bag Frame', icon: '🛍️' },
    { id: 'gift', label: 'Gift Box Frame', icon: '🎁' },
    { id: 'ribbon', label: 'Ribbon Banner Frame', icon: '🎀' },
    { id: 'envelope', label: 'Envelope Frame', icon: '✉️' },
    { id: 'scooter', label: 'Delivery Scooter Frame', icon: '🛵' },
    { id: 'laptop', label: 'Laptop Frame', icon: '💻' }
  ];

  // Pattern styles
  const patternStyles = [
    { id: 'square', label: 'Square' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'circle', label: 'Circle' },
    { id: 'heart', label: 'Heart' },
    { id: 'diamond', label: 'Diamond' }
  ];

  // Corner frame styles
  const cornerFrameStyles = [
    { id: 'circle', label: 'Circle' },
    { id: 'square', label: 'Square' },
    { id: 'rounded', label: 'Rounded Square' }
  ];

  // Corner dot styles
  const cornerDotStyles = [
    { id: 'circle', label: 'Circle' },
    { id: 'square', label: 'Square' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'diamond', label: 'Diamond' }
  ];

  // Logo upload handler
  const onLogoDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        updateDesign('logo', {
          enabled: true,
          url: reader.result,
          size: design.logo.size
        });
        toast.success('Logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  }, [design.logo.size]);

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps, isDragActive: isLogoDragActive } = useDropzone({
    onDrop: onLogoDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg']
    },
    multiple: false,
    maxSize: 2 * 1024 * 1024,
    disabled: disabled
  });

  return (
    <div className="w-full">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 lg:gap-8">
        {/* Design Options - Left Side */}
        <div className="space-y-4">
          {/* Section Title */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1 sm:mb-2">3. Design the QR</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Customize your QR code with frames, patterns, corners, and logos</p>
          </div>

          {/* Frame Section */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all">
            <button
              onClick={() => toggleSection('frame')}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-700/30 transition-colors"
              disabled={disabled}
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center flex-shrink-0">
                  <Frame className="w-5 h-5 text-neon-blue" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-100">Frame</h3>
                  <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Frames make your QR Code stand out from the crowd, inspiring more scans.</p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {expandedSections.frame ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSections.frame && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-4 sm:space-y-5 border-t border-slate-700/50">
                {/* Frame Style */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-3">Frame style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3">
                    {frameStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => updateDesign('frame', { style: style.id })}
                        className={`relative px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                          design.frame.style === style.id
                            ? 'border-neon-blue bg-neon-blue/20 text-neon-blue font-medium shadow-lg shadow-neon-blue/20'
                            : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                        }`}
                        disabled={disabled}
                        title={style.label}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {style.icon && (
                            <span className="text-base sm:text-lg">{style.icon}</span>
                          )}
                          <span className="whitespace-nowrap truncate w-full text-center leading-tight">{style.label}</span>
                        </div>
                        {design.frame.style === style.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-neon-blue rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {design.frame.style !== 'none' && (
                  <>
                    {/* Frame Text */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Frame text</label>
                      <input
                        type="text"
                        value={design.frame.text}
                        onChange={(e) => updateDesign('frame', { text: e.target.value })}
                        placeholder="Scan me!"
                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
                        disabled={disabled}
                      />
                    </div>

                    {/* Frame Color */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Frame color</label>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={design.frame.useGradient}
                            onChange={(e) => updateDesign('frame', { useGradient: e.target.checked })}
                            className="w-4 h-4 text-neon-blue border-slate-600 rounded focus:ring-neon-blue bg-slate-700"
                            disabled={disabled}
                          />
                          <span className="text-xs sm:text-sm text-slate-300">Use a gradient frame color</span>
                        </label>
                      </div>
                      {!design.frame.useGradient && (
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="color"
                            value={Array.isArray(design.frame.color) ? design.frame.color[0] : design.frame.color}
                            onChange={(e) => updateDesign('frame', { color: e.target.value })}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg cursor-pointer border border-slate-600 flex-shrink-0"
                            disabled={disabled}
                          />
                          <input
                            type="text"
                            value={Array.isArray(design.frame.color) ? design.frame.color[0] : design.frame.color}
                            onChange={(e) => updateDesign('frame', { color: e.target.value })}
                            className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
                            placeholder="#000000"
                            disabled={disabled}
                          />
                        </div>
                      )}
                    </div>

                    {/* Frame Background Color */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Frame background color</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={design.frame.transparentBackground}
                            onChange={(e) => updateDesign('frame', { transparentBackground: e.target.checked })}
                            className="w-4 h-4 text-neon-blue border-slate-600 rounded focus:ring-neon-blue bg-slate-700"
                            disabled={disabled}
                          />
                          <span className="text-xs sm:text-sm text-slate-300">Transparent background</span>
                        </label>
                        {!design.frame.transparentBackground && (
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={design.frame.useGradient}
                                onChange={(e) => updateDesign('frame', { useGradient: e.target.checked })}
                                className="w-4 h-4 text-neon-blue border-slate-600 rounded focus:ring-neon-blue bg-slate-700"
                                disabled={disabled}
                              />
                              <span className="text-xs sm:text-sm text-slate-300">Use a gradient background color</span>
                            </label>
                            <input
                              type="color"
                              value={Array.isArray(design.frame.backgroundColor) ? design.frame.backgroundColor[0] : design.frame.backgroundColor}
                              onChange={(e) => updateDesign('frame', { backgroundColor: e.target.value })}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg cursor-pointer border border-slate-600 flex-shrink-0"
                              disabled={disabled}
                            />
                            <input
                              type="text"
                              value={Array.isArray(design.frame.backgroundColor) ? design.frame.backgroundColor[0] : design.frame.backgroundColor}
                              onChange={(e) => updateDesign('frame', { backgroundColor: e.target.value })}
                              className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
                              placeholder="#FFFFFF"
                              disabled={disabled}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Frame Text Color */}
                    {design.frame.text && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Frame text color</label>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <input
                            type="color"
                            value={design.frame.textColor}
                            onChange={(e) => updateDesign('frame', { textColor: e.target.value })}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg cursor-pointer border border-slate-600 flex-shrink-0"
                            disabled={disabled}
                          />
                          <input
                            type="text"
                            value={design.frame.textColor}
                            onChange={(e) => updateDesign('frame', { textColor: e.target.value })}
                            className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all"
                            placeholder="#000000"
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Pattern Section */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all">
            <button
              onClick={() => toggleSection('pattern')}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-700/30 transition-colors"
              disabled={disabled}
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
                  <Palette className="w-5 h-5 text-neon-purple" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-100">QR Code Pattern</h3>
                  <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Choose a pattern for your QR code and select colors.</p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {expandedSections.pattern ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSections.pattern && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-4 sm:space-y-5 border-t border-slate-700/50">
                {/* Pattern Style */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-3">Pattern style</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                    {patternStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => updateDesign('pattern', { style: style.id })}
                        className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                          design.pattern.style === style.id
                            ? 'border-neon-purple bg-neon-purple/20 text-neon-purple font-medium'
                            : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                        }`}
                        disabled={disabled}
                      >
                        <span className="whitespace-nowrap truncate block">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pattern Color */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Pattern color</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={design.pattern.useGradient}
                        onChange={(e) => updateDesign('pattern', { useGradient: e.target.checked })}
                        className="w-4 h-4 text-neon-purple border-slate-600 rounded focus:ring-neon-purple bg-slate-700"
                        disabled={disabled}
                      />
                      <span className="text-xs sm:text-sm text-slate-300">Use a gradient pattern color</span>
                    </label>
                    {!design.pattern.useGradient && (
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <input
                          type="color"
                          value={Array.isArray(design.pattern.color) ? design.pattern.color[0] : design.pattern.color}
                          onChange={(e) => updateDesign('pattern', { color: e.target.value })}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg cursor-pointer border border-slate-600 flex-shrink-0"
                          disabled={disabled}
                        />
                        <input
                          type="text"
                          value={Array.isArray(design.pattern.color) ? design.pattern.color[0] : design.pattern.color}
                          onChange={(e) => updateDesign('pattern', { color: e.target.value })}
                          className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent transition-all"
                          placeholder="#000000"
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Pattern Background Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pattern background color</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={design.pattern.transparentBackground}
                        onChange={(e) => updateDesign('pattern', { transparentBackground: e.target.checked })}
                        className="w-4 h-4 text-neon-purple border-slate-600 rounded focus:ring-neon-purple bg-slate-700"
                        disabled={disabled}
                      />
                      <span className="text-xs sm:text-sm text-slate-300">Transparent background</span>
                    </label>
                    {!design.pattern.transparentBackground && (
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={design.pattern.useGradient}
                            onChange={(e) => updateDesign('pattern', { useGradient: e.target.checked })}
                            className="w-4 h-4 text-neon-purple border-slate-600 rounded focus:ring-neon-purple bg-slate-700"
                            disabled={disabled}
                          />
                          <span className="text-xs sm:text-sm text-slate-300">Use a gradient background color</span>
                        </label>
                        <input
                          type="color"
                          value={Array.isArray(design.pattern.backgroundColor) ? design.pattern.backgroundColor[0] : design.pattern.backgroundColor}
                          onChange={(e) => updateDesign('pattern', { backgroundColor: e.target.value })}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg cursor-pointer border border-slate-600 flex-shrink-0"
                          disabled={disabled}
                        />
                        <input
                          type="text"
                          value={Array.isArray(design.pattern.backgroundColor) ? design.pattern.backgroundColor[0] : design.pattern.backgroundColor}
                          onChange={(e) => updateDesign('pattern', { backgroundColor: e.target.value })}
                          className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent transition-all"
                          placeholder="#FFFFFF"
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                  <p className="text-xs text-yellow-200">
                    <strong>Remember!</strong> For optimal QR code reading results, we recommend using high-contrast colors.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Corners Section */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all">
            <button
              onClick={() => toggleSection('corners')}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-700/30 transition-colors"
              disabled={disabled}
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
                  <CornerDownRight className="w-5 h-5 text-neon-green" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-100">QR Code Corners</h3>
                  <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Select your QR code's corner style</p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {expandedSections.corners ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSections.corners && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-4 sm:space-y-5 border-t border-slate-700/50">
                {/* Frame Around Corner Dots Style */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-3">Frame around corner dots style</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {cornerFrameStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => updateDesign('corners', { frameStyle: style.id })}
                        className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                          design.corners.frameStyle === style.id
                            ? 'border-neon-green bg-neon-green/20 text-neon-green font-medium'
                            : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                        }`}
                        disabled={disabled}
                      >
                        <span className="whitespace-nowrap truncate block">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corner Dots Type */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-3">Corner dots type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {cornerDotStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => updateDesign('corners', { dotStyle: style.id })}
                        className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                          design.corners.dotStyle === style.id
                            ? 'border-neon-green bg-neon-green/20 text-neon-green font-medium'
                            : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                        }`}
                        disabled={disabled}
                      >
                        <span className="whitespace-nowrap truncate block">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frame Around Corner Dots Color */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Frame around corner dots color</label>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <input
                      type="color"
                      value={design.corners.frameColor}
                      onChange={(e) => updateDesign('corners', { frameColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-slate-600"
                      disabled={disabled}
                    />
                    <input
                      type="text"
                      value={design.corners.frameColor}
                      onChange={(e) => updateDesign('corners', { frameColor: e.target.value })}
                      className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent transition-all"
                      placeholder="#000000"
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Corner Dots Color */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Corner dots color</label>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <input
                      type="color"
                      value={design.corners.dotColor}
                      onChange={(e) => updateDesign('corners', { dotColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border border-slate-600"
                      disabled={disabled}
                    />
                    <input
                      type="text"
                      value={design.corners.dotColor}
                      onChange={(e) => updateDesign('corners', { dotColor: e.target.value })}
                      className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-green focus:border-transparent transition-all"
                      placeholder="#000000"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logo Section */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all">
            <button
              onClick={() => toggleSection('logo')}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-700/30 transition-colors"
              disabled={disabled}
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-neon-pink" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-100">Add Logo</h3>
                  <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Make your QR code unique by adding your logo or an image</p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {expandedSections.logo ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSections.logo && (
              <div className="px-5 pb-5 pt-0 space-y-4 border-t border-slate-700/50">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-3">
                    Upload your logo <span className="text-slate-400 font-normal text-xs">(Maximum size: 1 MB)</span>
                  </label>
                  <div
                    {...getLogoRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isLogoDragActive
                        ? 'border-neon-pink bg-neon-pink/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input {...getLogoInputProps()} />
                    {design.logo.url ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={design.logo.url}
                            alt="Logo preview"
                            className="max-w-32 max-h-32 mx-auto rounded-lg"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateDesign('logo', { enabled: false, url: null });
                              toast.success('Logo removed');
                            }}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-lg transition-all"
                            disabled={disabled}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 font-medium">Logo uploaded</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="mx-auto w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-300">
                          {isLogoDragActive ? 'Drop logo here' : 'Drag & drop logo or click to browse'}
                        </p>
                        <p className="text-xs text-slate-500">PNG, JPG, or SVG (max 2MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {design.logo.enabled && design.logo.url && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
                      Logo size: <span className="text-neon-pink font-semibold">{Math.round(design.logo.size * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.3"
                      step="0.01"
                      value={design.logo.size}
                      onChange={(e) => updateDesign('logo', { size: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-neon-pink"
                      disabled={disabled}
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>10%</span>
                      <span>20%</span>
                      <span>30%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Preview - Right Side */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {/* Preview Header with Toggle */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-100">Live Preview</h3>
                {previewUrl && (
                  <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-600">
                    <button
                      onClick={() => setPreviewMode('preview')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                        previewMode === 'preview'
                          ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setPreviewMode('qrcode')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                        previewMode === 'qrcode'
                          ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      QR code
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400">Preview your QR code design in real-time</p>
            </div>
            
            {/* Preview Content */}
            <div className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/30 min-h-[500px] flex items-center justify-center">
              {!previewUrl ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                    <QrCode className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm">Enter a URL to generate preview</p>
                </div>
              ) : isGeneratingPreview ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-neon-blue mx-auto mb-4"></div>
                  <p className="text-slate-400 text-sm">Generating preview...</p>
                </div>
              ) : preview && previewMode === 'preview' ? (
                <div className="relative w-full max-w-[280px] mx-auto">
                  {/* iPhone Mockup Frame */}
                  <div className="relative bg-white rounded-[2.5rem] p-2 shadow-2xl" style={{ width: '100%', maxWidth: '280px', minHeight: '560px' }}>
                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-6 pt-2 pb-1">
                      <span className="text-black text-xs font-semibold">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-2 border border-black rounded-sm">
                          <div className="w-full h-full bg-black rounded-sm" style={{ width: '60%' }}></div>
                        </div>
                        <svg className="w-4 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                        <svg className="w-4 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.076 13.308-5.076 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                        </svg>
                        <div className="w-6 h-3 border border-black rounded-sm relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-1.5 bg-black rounded-sm"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Screen Content */}
                    <div className="bg-white rounded-[2rem] overflow-hidden" style={{ minHeight: '520px' }}>
                      <div className="flex flex-col items-center justify-center p-6 h-full min-h-[520px]">
                        {/* QR Code */}
                        <div className="mb-6">
                          {preview ? (
                            <img
                              src={preview}
                              alt="QR Code Preview"
                              className="w-48 h-48 object-contain"
                              onError={(e) => {
                                console.error('Preview image failed to load');
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                              <QrCode className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Scan Me Button */}
                        <button 
                          className="w-48 bg-black text-white font-semibold py-3 px-6 rounded-lg text-base shadow-lg"
                          style={{ 
                            backgroundColor: design.frame.style !== 'none' && design.frame.color 
                              ? (Array.isArray(design.frame.color) ? design.frame.color[0] : design.frame.color)
                              : '#000000',
                            color: design.frame.textColor || '#FFFFFF'
                          }}
                        >
                          {design.frame.text || 'Scan me!'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                      <div className="w-32 h-1 bg-black rounded-full opacity-30"></div>
                    </div>
                  </div>
                </div>
              ) : preview && previewMode === 'qrcode' ? (
                <div className="flex items-center justify-center">
                  <img
                    src={preview}
                    alt="QR Code"
                    className="max-w-full max-h-[500px] object-contain"
                    onError={(e) => {
                      console.error('Preview image failed to load');
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                    <QrCode className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm">Preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRDesignCustomizer;
