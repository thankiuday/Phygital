/**
 * QR Designs Page Component
 * Allows users to create customized QR codes with icon overlays
 * Similar to Bitly's QR code customization feature
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import { generateQRCodeWithIcon, downloadQRCode } from '../../utils/qrGenerator';
import BackButton from '../../components/UI/BackButton';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  QrCode,
  Download,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  CheckCircle,
  X,
  ArrowRight,
  Sparkles,
  Copy,
  Palette,
  Search
} from 'lucide-react';

const QRDesignsPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Icon selection, 2: URL input, 3: Preview
  const [iconSource, setIconSource] = useState(null); // 'library' or 'upload'
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [uploadedIcon, setUploadedIcon] = useState(null);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [qrCodePreview, setQrCodePreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodeSize, setQrCodeSize] = useState(300);
  const [iconSearch, setIconSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Default icon library with categories
  const iconLibrary = [
    // Popular
    { id: 'logo', name: 'Logo', url: '/icons/PhygitalLogo.png', category: 'popular' },
    { id: 'star', name: 'Star', url: null, category: 'popular' },
    { id: 'heart', name: 'Heart', url: null, category: 'popular' },
    { id: 'checkmark', name: 'Checkmark', url: null, category: 'popular' },
    { id: 'globe', name: 'Globe', url: null, category: 'popular' },
    
    // Communication
    { id: 'phone', name: 'Phone', url: null, category: 'communication' },
    { id: 'mail', name: 'Mail', url: null, category: 'communication' },
    { id: 'message', name: 'Message', url: null, category: 'communication' },
    { id: 'chat', name: 'Chat', url: null, category: 'communication' },
    { id: 'share', name: 'Share', url: null, category: 'communication' },
    
    // Location & Travel
    { id: 'location', name: 'Location', url: null, category: 'location' },
    { id: 'flag', name: 'Flag', url: null, category: 'location' },
    { id: 'home', name: 'Home', url: null, category: 'location' },
    
    // Actions
    { id: 'download', name: 'Download', url: null, category: 'actions' },
    { id: 'upload', name: 'Upload', url: null, category: 'actions' },
    { id: 'search', name: 'Search', url: null, category: 'actions' },
    { id: 'filter', name: 'Filter', url: null, category: 'actions' },
    { id: 'arrow', name: 'Arrow', url: null, category: 'actions' },
    { id: 'plus', name: 'Plus', url: null, category: 'actions' },
    { id: 'minus', name: 'Minus', url: null, category: 'actions' },
    
    // Media
    { id: 'camera', name: 'Camera', url: null, category: 'media' },
    { id: 'music', name: 'Music', url: null, category: 'media' },
    { id: 'video', name: 'Video', url: null, category: 'media' },
    { id: 'file', name: 'File', url: null, category: 'media' },
    { id: 'folder', name: 'Folder', url: null, category: 'media' },
    
    // Security
    { id: 'shield', name: 'Shield', url: null, category: 'security' },
    { id: 'lock', name: 'Lock', url: null, category: 'security' },
    { id: 'unlock', name: 'Unlock', url: null, category: 'security' },
    { id: 'eye', name: 'Eye', url: null, category: 'security' },
    
    // Time & Calendar
    { id: 'calendar', name: 'Calendar', url: null, category: 'time' },
    { id: 'clock', name: 'Clock', url: null, category: 'time' },
    
    // Social
    { id: 'user', name: 'User', url: null, category: 'social' },
    { id: 'users', name: 'Users', url: null, category: 'social' },
    { id: 'thumbs-up', name: 'Thumbs Up', url: null, category: 'social' },
    { id: 'thumbs-down', name: 'Thumbs Down', url: null, category: 'social' },
    
    // Business
    { id: 'shop', name: 'Shop', url: null, category: 'business' },
    { id: 'gift', name: 'Gift', url: null, category: 'business' },
    { id: 'trophy', name: 'Trophy', url: null, category: 'business' },
    { id: 'tag', name: 'Tag', url: null, category: 'business' },
    
    // UI Elements
    { id: 'settings', name: 'Settings', url: null, category: 'ui' },
    { id: 'grid', name: 'Grid', url: null, category: 'ui' },
    { id: 'list', name: 'List', url: null, category: 'ui' },
    { id: 'bell', name: 'Bell', url: null, category: 'ui' },
    { id: 'x', name: 'X', url: null, category: 'ui' },
    
    // Symbols
    { id: 'zap', name: 'Zap', url: null, category: 'symbols' },
    { id: 'fire', name: 'Fire', url: null, category: 'symbols' },
    { id: 'circle', name: 'Circle', url: null, category: 'symbols' },
    { id: 'square', name: 'Square', url: null, category: 'symbols' },
    { id: 'triangle', name: 'Triangle', url: null, category: 'symbols' },
    { id: 'diamond', name: 'Diamond', url: null, category: 'symbols' },
  ];

  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All Icons', icon: 'grid' },
    { id: 'popular', name: 'Popular', icon: 'star' },
    { id: 'communication', name: 'Communication', icon: 'mail' },
    { id: 'location', name: 'Location', icon: 'location' },
    { id: 'actions', name: 'Actions', icon: 'arrow' },
    { id: 'media', name: 'Media', icon: 'camera' },
    { id: 'security', name: 'Security', icon: 'shield' },
    { id: 'time', name: 'Time', icon: 'clock' },
    { id: 'social', name: 'Social', icon: 'user' },
    { id: 'business', name: 'Business', icon: 'shop' },
    { id: 'ui', name: 'UI Elements', icon: 'settings' },
    { id: 'symbols', name: 'Symbols', icon: 'circle' },
  ];

  // Filter icons based on search and category
  const filteredIcons = iconLibrary.filter(icon => {
    const matchesCategory = selectedCategory === 'all' || icon.category === selectedCategory;
    const matchesSearch = icon.name.toLowerCase().includes(iconSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle file upload
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate PNG
      if (!file.type.includes('png')) {
        toast.error('Please upload a PNG file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setUploadedIcon(reader.result);
        setSelectedIcon(null);
        setIconSource('upload');
        toast.success('Icon uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png']
    },
    multiple: false,
    maxSize: 2 * 1024 * 1024 // 2MB
  });

  // Generate SVG icon placeholder
  const generateSVGIcon = (type, color = '#000000') => {
    const svgMap = {
      // Basic shapes
      globe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
      star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
      heart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
      checkmark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
      arrow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`,
      shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`,
      location: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
      phone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
      mail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
      calendar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`,
      clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
      user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
      settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
      home: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
      shop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
      gift: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>`,
      trophy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 13.63 21 11.55 21 9V7c0-1.1-.9-2-2-2zM5 9V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v2z"/></svg>`,
      bell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`,
      camera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 12m-3.2 0a3.2 3.2 0 1 1 6.4 0a3.2 3.2 0 1 1-6.4 0"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`,
      music: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
      video: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
      file: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
      folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/></svg>`,
      download: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
      upload: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>`,
      share: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`,
      lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`,
      unlock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H8.9V6z"/></svg>`,
      eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
      tag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7.01v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"/></svg>`,
      flag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`,
      zap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
      fire: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>`,
      'thumbs-up': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>`,
      'thumbs-down': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>`,
      message: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`,
      chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`,
      users: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
      grid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"/></svg>`,
      list: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
      search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
      filter: `<svg xmlns="http://www.w3.org/20000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>`,
      plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
      minus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M19 13H5v-2h14v2z"/></svg>`,
      x: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
      circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="10"/></svg>`,
      square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
      triangle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2L2 22h20z"/></svg>`,
      diamond: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2L2 12l10 10 10-10z"/></svg>`,
    };
    
    const svg = svgMap[type];
    if (!svg) return null;
    // Encode SVG properly for data URL
    const encodedSvg = encodeURIComponent(svg);
    return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  };

  // Handle icon selection from library
  const handleIconSelect = (icon) => {
    if (icon.url) {
      setSelectedIcon(icon.url);
    } else {
      // Generate SVG icon for placeholder icons
      const svgUrl = generateSVGIcon(icon.id);
      if (svgUrl) {
        setSelectedIcon(svgUrl);
      }
    }
    setUploadedIcon(null);
    setIconSource('library');
    toast.success(`${icon.name} icon selected!`);
  };

  // Validate URL
  const validateUrl = (url) => {
    try {
      // Add protocol if missing
      if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
      }
      new URL(url);
      return url;
    } catch {
      return null;
    }
  };

  // Generate QR code preview
  const generatePreview = async () => {
    if (!redirectUrl.trim()) {
      toast.error('Please enter a redirect URL');
      return;
    }

    const validUrl = validateUrl(redirectUrl.trim());
    if (!validUrl) {
      toast.error('Please enter a valid URL');
      return;
    }

    const iconToUse = iconSource === 'upload' ? uploadedIcon : selectedIcon;

    try {
      setIsGenerating(true);
      const qrDataUrl = await generateQRCodeWithIcon(validUrl, {
        iconUrl: iconToUse || null,
        size: qrCodeSize,
        iconSize: 0.15
      });
      setQrCodePreview(qrDataUrl);
      setStep(3);
      toast.success('QR code generated!');
    } catch (error) {
      console.error('QR generation error:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download QR code
  const handleDownload = (size = 300) => {
    if (!qrCodePreview) {
      toast.error('No QR code to download');
      return;
    }

    try {
      // Regenerate at specified size if different
      const iconToUse = iconSource === 'upload' ? uploadedIcon : selectedIcon;
      const validUrl = validateUrl(redirectUrl.trim());
      
      generateQRCodeWithIcon(validUrl, {
        iconUrl: iconToUse || null,
        size: size,
        iconSize: 0.15
      }).then((qrDataUrl) => {
        const filename = `qr-code-${Date.now()}.png`;
        downloadQRCode(qrDataUrl, filename);
        toast.success('QR code downloaded!');
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download QR code');
    }
  };

  // Copy URL to clipboard
  const copyUrl = () => {
    if (!redirectUrl.trim()) return;
    const validUrl = validateUrl(redirectUrl.trim());
    navigator.clipboard.writeText(validUrl || redirectUrl.trim());
    toast.success('URL copied to clipboard!');
  };

  // Paste from clipboard
  const pasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRedirectUrl(text);
      toast.success('URL pasted from clipboard!');
    } catch (error) {
      toast.error('Failed to paste from clipboard');
    }
  };

  // Reset form
  const resetForm = () => {
    setStep(1);
    setIconSource(null);
    setSelectedIcon(null);
    setUploadedIcon(null);
    setRedirectUrl('');
    setQrCodePreview(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center">
              <Sparkles className="w-8 h-8 mr-3 text-neon-purple" />
              QR Designs
            </h1>
            <p className="text-slate-300 mt-2">
              Create customized QR codes with icon overlays and redirect URLs
            </p>
          </div>
          <BackButton to="/dashboard" variant="ghost" className="hidden sm:flex" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((stepNum) => (
            <React.Fragment key={stepNum}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    step >= stepNum
                      ? 'bg-neon-blue text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step > stepNum ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    step >= stepNum ? 'text-slate-100' : 'text-slate-400'
                  }`}
                >
                  {stepNum === 1 && 'Choose Icon'}
                  {stepNum === 2 && 'Enter URL'}
                  {stepNum === 3 && 'Download'}
                </span>
              </div>
              {stepNum < 3 && (
                <ArrowRight className="w-5 h-5 text-slate-600" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Icon Selection */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center">
              <Palette className="w-6 h-6 mr-2 text-neon-purple" />
              Step 1: Choose Your Icon
            </h2>
            <p className="text-slate-300">
              Select an icon from our library or upload your own PNG design
            </p>
          </div>

          <div className="space-y-6">
            {/* Icon Library with Search and Categories */}
            <div>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Select from Library
                </h3>
                
                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search icons..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-neon-blue"
                    />
                    {iconSearch && (
                      <button
                        onClick={() => setIconSearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isActive = selectedCategory === category.id;
                    const categoryIcon = generateSVGIcon(category.icon, isActive ? '#ffffff' : '#94a3b8');
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setIconSearch(''); // Clear search when changing category
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                          isActive
                            ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/50'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                        }`}
                      >
                        {categoryIcon && (
                          <img
                            src={categoryIcon}
                            alt=""
                            className="w-4 h-4"
                            style={{ filter: isActive ? 'brightness(0) invert(1)' : 'none' }}
                          />
                        )}
                        <span>{category.name}</span>
                        {isActive && (
                          <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                            {filteredIcons.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Grid */}
              {filteredIcons.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredIcons.map((icon) => {
                    const iconUrl = icon.url || generateSVGIcon(icon.id);
                    const isSelected = selectedIcon === iconUrl && iconSource === 'library';
                    
                    return (
                      <button
                        key={icon.id}
                        onClick={() => handleIconSelect(icon)}
                        className={`p-3 rounded-lg border-2 transition-all relative group ${
                          isSelected
                            ? 'border-neon-blue bg-neon-blue/20 shadow-lg shadow-neon-blue/30'
                            : 'border-slate-600 bg-slate-800/50 hover:border-neon-blue/50 hover:bg-slate-700/50'
                        }`}
                        title={icon.name}
                      >
                        <div className="w-12 h-12 mx-auto mb-1 flex items-center justify-center">
                          {iconUrl ? (
                            <img
                              src={iconUrl}
                              alt={icon.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <p className="text-xs text-slate-300 truncate w-full">{icon.name}</p>
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <CheckCircle className="w-5 h-5 text-neon-blue" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-600">
                  <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">No icons found</p>
                  <p className="text-sm text-slate-400">Try a different search or category</p>
                  <button
                    onClick={() => {
                      setIconSearch('');
                      setSelectedCategory('all');
                    }}
                    className="mt-4 text-sm text-neon-blue hover:text-neon-purple"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-900 text-slate-400">OR</span>
              </div>
            </div>

            {/* Upload Custom Icon */}
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Upload Your Own Design
              </h3>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-neon-blue bg-neon-blue/10'
                    : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                }`}
              >
                <input {...getInputProps()} />
                {uploadedIcon ? (
                  <div className="space-y-4">
                    <div className="w-32 h-32 mx-auto">
                      <img
                        src={uploadedIcon}
                        alt="Uploaded icon"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-neon-green" />
                      <p className="text-slate-300">Icon uploaded successfully</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedIcon(null);
                          setIconSource(null);
                        }}
                        className="ml-2 p-1 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-slate-300 mb-1">
                        {isDragActive ? 'Drop PNG here' : 'Drag & drop PNG file'}
                      </p>
                      <p className="text-sm text-slate-400">
                        or click to browse (max 2MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (selectedIcon || uploadedIcon) {
                    setStep(2);
                  } else {
                    toast.error('Please select or upload an icon');
                  }
                }}
                className="btn-primary flex items-center"
                disabled={!selectedIcon && !uploadedIcon}
              >
                Continue to URL
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: URL Input */}
      {step === 2 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center">
              <LinkIcon className="w-6 h-6 mr-2 text-neon-purple" />
              Step 2: Enter Redirect URL
            </h2>
            <p className="text-slate-300">
              Paste the link where you want users to be redirected when they scan the QR code
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Redirect URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://example.com or example.com"
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-neon-blue"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      generatePreview();
                    }
                  }}
                />
                <button
                  onClick={pasteUrl}
                  className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                  title="Paste from clipboard"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Protocol (https://) will be added automatically if missing
              </p>
            </div>

            {/* QR Code Size */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                QR Code Size: {qrCodeSize}px
              </label>
              <input
                type="range"
                min="200"
                max="600"
                step="50"
                value={qrCodeSize}
                onChange={(e) => setQrCodeSize(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>200px</span>
                <span>400px</span>
                <span>600px</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary flex items-center"
              >
                <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                Back
              </button>
              <button
                onClick={generatePreview}
                disabled={isGenerating || !redirectUrl.trim()}
                className="btn-primary flex items-center"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate QR Code
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview and Download */}
      {step === 3 && qrCodePreview && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center">
              <QrCode className="w-6 h-6 mr-2 text-neon-purple" />
              Step 3: Your Custom QR Code
            </h2>
            <p className="text-slate-300">
              Preview and download your customized QR code
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Preview */}
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-8 flex items-center justify-center border border-slate-600">
                <img
                  src={qrCodePreview}
                  alt="QR Code Preview"
                  className="max-w-full h-auto"
                />
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-600">
                <p className="text-sm text-slate-400 mb-2">Redirect URL:</p>
                <p className="text-slate-200 break-all font-mono text-sm">
                  {validateUrl(redirectUrl.trim()) || redirectUrl.trim()}
                </p>
              </div>
            </div>

            {/* Download Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">
                Download Options
              </h3>
              
              <button
                onClick={() => handleDownload(300)}
                className="w-full btn-primary flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Standard (300x300)
              </button>

              <button
                onClick={() => handleDownload(600)}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Download High-Res (600x600)
              </button>

              <div className="pt-4 border-t border-slate-600">
                <button
                  onClick={resetForm}
                  className="w-full bg-slate-700 text-slate-200 py-3 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Create Another QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRDesignsPage;

