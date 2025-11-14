/**
 * Direct Video Player Component
 * Displays video without AR tracking requirement
 * Auto-plays video with controls and social links
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Globe,
  Phone,
  MessageCircle,
  Music2,
  X
} from 'lucide-react';

const DirectVideoPlayer = ({ projectData, onClose }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);

  // Auto-play video on mount
  useEffect(() => {
    if (videoRef.current && projectData?.videoUrl) {
      videoRef.current.muted = true;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.error('Auto-play failed:', error);
      });
    }
  }, [projectData?.videoUrl]);

  // Handle video play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Show controls on interaction
  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    setControlsTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  // Get social link icon
  const getSocialIcon = (type) => {
    switch (type) {
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'twitter': return <Twitter className="w-5 h-5" />;
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'website': return <Globe className="w-5 h-5" />;
      case 'contactNumber': return <Phone className="w-5 h-5" />;
      case 'whatsappNumber': return <MessageCircle className="w-5 h-5" />;
      case 'tiktok': return <Music2 className="w-5 h-5" />;
      default: return <ExternalLink className="w-5 h-5" />;
    }
  };

  // Format social link URL
  const formatSocialUrl = (type, value) => {
    if (!value) return null;
    
    switch (type) {
      case 'instagram':
        return value.startsWith('http') ? value : `https://instagram.com/${value.replace('@', '')}`;
      case 'facebook':
        return value.startsWith('http') ? value : `https://facebook.com/${value}`;
      case 'twitter':
        return value.startsWith('http') ? value : `https://twitter.com/${value.replace('@', '')}`;
      case 'linkedin':
        return value.startsWith('http') ? value : `https://linkedin.com/in/${value}`;
      case 'website':
        return value.startsWith('http') ? value : `https://${value}`;
      case 'contactNumber':
        return `tel:${value}`;
      case 'whatsappNumber':
        return `https://wa.me/${value.replace(/[^0-9]/g, '')}`;
      case 'tiktok':
        return value.startsWith('http') ? value : `https://www.tiktok.com/@${value.replace('@', '')}`;
      default:
        return value;
    }
  };

  // Get social link label
  const getSocialLabel = (type) => {
    switch (type) {
      case 'instagram': return 'Instagram';
      case 'facebook': return 'Facebook';
      case 'twitter': return 'Twitter';
      case 'linkedin': return 'LinkedIn';
      case 'website': return 'Website';
      case 'contactNumber': return 'Call';
      case 'whatsappNumber': return 'WhatsApp';
      case 'tiktok': return 'TikTok';
      default: return type;
    }
  };

  // Filter and format social links
  const socialLinks = projectData?.socialLinks || {};
  const activeSocialLinks = Object.entries(socialLinks)
    .filter(([_, value]) => value && value.trim())
    .map(([type, value]) => ({
      type,
      value,
      url: formatSocialUrl(type, value),
      label: getSocialLabel(type),
      icon: getSocialIcon(type)
    }));

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-slate-800/80 backdrop-blur-sm rounded-full hover:bg-slate-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-slate-100" />
        </button>
      )}

      {/* Video Container */}
      <div 
        className="flex-1 relative bg-black flex items-center justify-center"
        onClick={handleInteraction}
        onMouseMove={handleInteraction}
        onTouchStart={handleInteraction}
      >
        <video
          ref={videoRef}
          src={projectData?.videoUrl}
          className="w-full h-full object-contain"
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Video Controls Overlay */}
        {showControls && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 flex items-center justify-center">
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-4 bg-slate-800/90 backdrop-blur-sm rounded-full hover:bg-slate-700 transition-all hover:scale-110 shadow-lg"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-slate-100" />
                ) : (
                  <Play className="w-8 h-8 text-slate-100 ml-1" />
                )}
              </button>

              {/* Mute/Unmute Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="p-4 bg-slate-800/90 backdrop-blur-sm rounded-full hover:bg-slate-700 transition-all hover:scale-110 shadow-lg"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-8 h-8 text-slate-100" />
                ) : (
                  <Volume2 className="w-8 h-8 text-slate-100" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Video Info Overlay */}
        {showControls && projectData?.projectName && (
          <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-slate-100 font-medium">{projectData.projectName}</p>
            {projectData.projectDescription && (
              <p className="text-slate-400 text-sm">{projectData.projectDescription}</p>
            )}
          </div>
        )}
      </div>

      {/* Social Links Section */}
      {activeSocialLinks.length > 0 && (
        <div className="bg-slate-800/95 backdrop-blur-md border-t border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 text-center">
              Connect With Us
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeSocialLinks.map(({ type, url, label, icon }) => (
                <a
                  key={type}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all hover:scale-105 group"
                >
                  <div className="text-neon-cyan group-hover:text-neon-blue transition-colors">
                    {icon}
                  </div>
                  <span className="text-sm font-medium text-slate-200 truncate">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectVideoPlayer;

