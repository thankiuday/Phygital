import React, { useState, useEffect } from 'react';
import { Bold, Italic, Palette, Sparkles, X, Eye, EyeOff } from 'lucide-react';
import { generateQRSticker } from '../../utils/qrStickerGenerator';

const FRAME_PRESETS = [
  { id: 1, name: 'Bottom Notch', description: 'Label attached to bottom with upward notch' },
  { id: 2, name: 'Bottom Arrow', description: 'Label below with upward arrow' },
  { id: 3, name: 'Top Notch', description: 'Label attached to top with downward notch' },
  { id: 4, name: 'Top Arrow', description: 'Label above with downward arrow' },
  { id: 5, name: 'Bottom Bar', description: 'Simple bar below' },
  { id: 6, name: 'Top Bar', description: 'Simple bar above' },
  { id: 8, name: 'Right Arrow', description: 'Label to the right with left-pointing arrow' },
  { id: 9, name: 'Brackets + Top', description: 'Corner brackets with label above' },
  { id: 10, name: 'None', description: 'QR code only, no frame or text' }
];

const GRADIENT_PRESETS = [
  { name: 'Purple', colors: ['#00d4ff', '#a855f7', '#ec4899'] },
  { name: 'Blue', colors: ['#22d3ee', '#3b82f6'] },
  { name: 'Green-Blue', colors: ['#4ade80', '#22d3ee'] },
  { name: 'Yellow-Orange', colors: ['#fbbf24', '#f97316'] },
  { name: 'Orange-Pink', colors: ['#f97316', '#ec4899'] },
  { name: 'Red-Pink', colors: ['#ef4444', '#ec4899'] },
  { name: 'Cyan-Blue', colors: ['#06b6d4', '#3b82f6'] }
];

const COLOR_PRESETS = [
  { name: 'Black', color: '#000000' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Red', color: '#FF0000' },
  { name: 'Green', color: '#00FF00' },
  { name: 'Blue', color: '#0000FF' },
  { name: 'Yellow', color: '#FFFF00' },
  { name: 'Magenta', color: '#FF00FF' },
  { name: 'Cyan', color: '#00FFFF' },
  { name: 'Orange', color: '#FF8800' },
  { name: 'Pink', color: '#FF69B4' },
  { name: 'Purple', color: '#800080' },
  { name: 'Lime', color: '#00FF00' },
  { name: 'Navy', color: '#000080' },
  { name: 'Teal', color: '#008080' },
  { name: 'Maroon', color: '#800000' },
  { name: 'Gold', color: '#FFD700' }
];

const FrameCustomizer = ({ qrCodeDataUrl, onFrameConfigChange, initialConfig = null }) => {
  const [selectedFrameType, setSelectedFrameType] = useState(initialConfig?.frameType || 1);
  const [textContent, setTextContent] = useState(initialConfig?.textContent || 'SCAN ME');
  
  // Normalize color: if no color is set or it's black (#000000), use white (#FFFFFF) as default
  const getInitialColor = () => {
    const configColor = initialConfig?.textStyle?.color;
    // If no color or black color, default to white
    if (!configColor || configColor === '#000000') {
      return '#FFFFFF';
    }
    return configColor;
  };
  
  const [textStyle, setTextStyle] = useState({
    bold: initialConfig?.textStyle?.bold !== false,
    italic: initialConfig?.textStyle?.italic || false,
    color: getInitialColor(),
    gradient: initialConfig?.textStyle?.gradient || null
  });
  const [transparentBackground, setTransparentBackground] = useState(initialConfig?.transparentBackground || false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Normalize color on mount if initialConfig changes (e.g., when project loads)
  useEffect(() => {
    if (initialConfig?.textStyle?.color === '#000000' || (!initialConfig?.textStyle?.color && textStyle.color === '#000000')) {
      setTextStyle(prev => ({
        ...prev,
        color: '#FFFFFF'
      }));
    }
  }, [initialConfig]);

  // Generate preview when config changes
  useEffect(() => {
    const generatePreview = async () => {
      if (!qrCodeDataUrl) return;
      
      try {
        const preview = await generateQRSticker(qrCodeDataUrl, {
          frameType: selectedFrameType,
          textContent: textContent,
          textStyle: textStyle,
          transparentBackground: transparentBackground,
          qrSize: 200,
          padding: 16,
          borderWidth: 4
        });
        setPreviewUrl(preview);
        
        // Notify parent of config change
        if (onFrameConfigChange) {
          onFrameConfigChange({
            frameType: selectedFrameType,
            textContent: textContent,
            textStyle: { ...textStyle },
            transparentBackground: transparentBackground
          });
        }
      } catch (error) {
        console.error('Failed to generate preview:', error);
      }
    };
    
    generatePreview();
  }, [qrCodeDataUrl, selectedFrameType, textContent, textStyle, transparentBackground, onFrameConfigChange]);

  const handleTextStyleToggle = (property) => {
    setTextStyle(prev => ({
      ...prev,
      [property]: !prev[property]
    }));
  };

  const handleColorChange = (color) => {
    setTextStyle(prev => ({
      ...prev,
      color: color,
      gradient: null // Clear gradient when using solid color
    }));
    setShowColorPicker(false);
  };

  const handleGradientSelect = (gradient) => {
    setTextStyle(prev => ({
      ...prev,
      gradient: gradient.colors,
      color: '#FFFFFF' // Reset color when using gradient
    }));
    setShowGradientPicker(false);
  };

  const handleRemoveGradient = () => {
    setTextStyle(prev => ({
      ...prev,
      gradient: null
    }));
  };

  return (
    <div className="space-y-6">
      {/* Frame Selection Grid */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Select Frame Style</h3>
        <div className="grid grid-cols-3 gap-3">
          {FRAME_PRESETS.map((frame) => (
            <button
              key={frame.id}
              onClick={() => setSelectedFrameType(frame.id)}
              className={`relative p-3 rounded-lg border-2 transition-all duration-200 ${
                selectedFrameType === frame.id
                  ? 'border-neon-blue bg-neon-blue/20 shadow-glow-blue'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50'
              }`}
              title={frame.description}
            >
              <div className="text-center">
                <div className="text-xs font-medium text-slate-300 mb-1">{frame.id}</div>
                <div className="text-xs text-slate-400">{frame.name}</div>
              </div>
              {selectedFrameType === frame.id && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-neon-blue rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Text Customization - Hide when "None" is selected */}
      {selectedFrameType !== 10 && (
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Customize Text</h3>
        
        {/* Text Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Text Content</label>
          <input
            type="text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
            placeholder="SCAN ME"
            maxLength={20}
          />
        </div>

        {/* Text Style Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Bold/Italic Toggles */}
          <button
            onClick={() => handleTextStyleToggle('bold')}
            className={`px-4 py-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
              textStyle.bold
                ? 'border-neon-blue bg-neon-blue/20 text-neon-blue'
                : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Bold className="w-4 h-4" />
            <span className="text-sm font-medium">Bold</span>
          </button>

          <button
            onClick={() => handleTextStyleToggle('italic')}
            className={`px-4 py-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
              textStyle.italic
                ? 'border-neon-blue bg-neon-blue/20 text-neon-blue'
                : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Italic className="w-4 h-4" />
            <span className="text-sm font-medium">Italic</span>
          </button>

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowGradientPicker(false);
              }}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                textStyle.color && !textStyle.gradient
                  ? 'border-neon-blue bg-neon-blue/20 text-neon-blue'
                  : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span className="text-sm font-medium">Color</span>
              {textStyle.color && !textStyle.gradient && (
                <div
                  className="w-5 h-5 rounded border border-slate-600"
                  style={{ backgroundColor: textStyle.color }}
                />
              )}
            </button>

            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 min-w-[300px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Color Presets</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleColorChange(preset.color)}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        textStyle.color === preset.color && !textStyle.gradient
                          ? 'border-neon-blue bg-neon-blue/20'
                          : 'border-slate-600 hover:border-neon-blue'
                      }`}
                    >
                      <div
                        className="w-full h-8 rounded mb-2 border border-slate-600"
                        style={{ backgroundColor: preset.color }}
                      />
                      <div className={`text-xs ${
                        textStyle.color === preset.color && !textStyle.gradient
                          ? 'text-neon-blue font-medium'
                          : 'text-slate-300'
                      }`}>{preset.name}</div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-600 pt-3">
                  <label className="block text-xs font-medium text-slate-400 mb-2">Custom Color</label>
                  <input
                    type="color"
                    value={textStyle.color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer border border-slate-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gradient Picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowGradientPicker(!showGradientPicker);
                setShowColorPicker(false);
              }}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                textStyle.gradient
                  ? 'border-neon-blue bg-neon-blue/20 text-neon-blue'
                  : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Gradient</span>
            </button>

            {showGradientPicker && (
              <div className="absolute top-full left-0 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 min-w-[300px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Gradient Presets</span>
                  {textStyle.gradient && (
                    <button
                      onClick={handleRemoveGradient}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleGradientSelect(preset)}
                      className="p-3 rounded-lg border border-slate-600 hover:border-neon-blue transition-all text-left"
                    >
                      <div
                        className="w-full h-8 rounded mb-2"
                        style={{
                          background: `linear-gradient(to right, ${preset.colors.join(', ')})`
                        }}
                      />
                      <div className="text-xs text-slate-300">{preset.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Gradient Display */}
        {textStyle.gradient && (
          <div className="mb-4 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
            <div className="text-xs text-slate-400 mb-2">Active Gradient</div>
            <div
              className="w-full h-6 rounded"
              style={{
                background: `linear-gradient(to right, ${textStyle.gradient.join(', ')})`
              }}
            />
          </div>
        )}
      </div>
      )}

      {/* Background Options */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Background Options</h3>
        <button
          onClick={() => setTransparentBackground(!transparentBackground)}
          className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between ${
            transparentBackground
              ? 'border-neon-blue bg-neon-blue/20 text-neon-blue'
              : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
          }`}
        >
          <div className="flex items-center gap-3">
            {transparentBackground ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
            <div className="text-left">
              <div className="text-sm font-medium">Remove Background</div>
              <div className="text-xs text-slate-400">Make QR scanner background transparent</div>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-200 ${
            transparentBackground ? 'bg-neon-blue' : 'bg-slate-600'
          }`}>
            <div className={`w-5 h-5 bg-white rounded-full transition-all duration-200 mt-0.5 ${
              transparentBackground ? 'ml-6' : 'ml-0.5'
            }`} />
          </div>
        </button>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Preview</h3>
          <div className={`flex justify-center p-4 rounded-lg border border-slate-600 ${
            transparentBackground 
              ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
              : 'bg-slate-900/50'
          }`}>
            <div className={`${transparentBackground ? 'bg-checkerboard' : ''}`} style={{
              backgroundImage: transparentBackground 
                ? 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)'
                : 'none',
              backgroundSize: transparentBackground ? '20px 20px' : 'auto',
              backgroundPosition: transparentBackground ? '0 0, 0 10px, 10px -10px, -10px 0px' : 'auto',
              padding: transparentBackground ? '8px' : '0'
            }}>
              <img
                src={previewUrl}
                alt="Frame preview"
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameCustomizer;

