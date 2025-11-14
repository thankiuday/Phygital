/**
 * QR Design History Page
 * Displays user's saved QR code designs with download and delete options
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { qrDesignAPI } from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  QrCode,
  Download,
  Trash2,
  ArrowLeft,
  Calendar,
  ExternalLink,
  Search,
  Filter,
  Grid,
  List,
  Sparkles
} from 'lucide-react';

const QRDesignHistoryPage = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [deletingId, setDeletingId] = useState(null);

  // Fetch QR design history
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await qrDesignAPI.getHistory();
      setDesigns(response.data.data.designs || []);
    } catch (error) {
      console.error('Failed to fetch QR design history:', error);
      toast.error('Failed to load QR design history');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter designs based on search query
  const filteredDesigns = designs.filter(design => 
    design.redirectUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
    design.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle delete
  const handleDelete = async (designId) => {
    if (!window.confirm('Are you sure you want to delete this QR design?')) {
      return;
    }

    try {
      setDeletingId(designId);
      await qrDesignAPI.delete(designId);
      setDesigns(designs.filter(d => d.id !== designId));
      toast.success('QR design deleted successfully');
    } catch (error) {
      console.error('Failed to delete QR design:', error);
      toast.error('Failed to delete QR design');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle download
  const handleDownload = async (design) => {
    try {
      // Fetch the image as blob to force download
      const response = await fetch(design.qrCodeUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-design-${design.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      // Increment download count on server
      await qrDesignAPI.download(design.id);
      
      toast.success('QR code downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download QR code');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/qr-designs')}
          className="mb-4 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to QR Designs</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent flex items-center">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-neon-purple" />
              QR Design History
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">
              {designs.length} saved design{designs.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-neon-blue text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-neon-blue text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by URL or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-neon-blue transition-colors"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredDesigns.length === 0 && (
        <div className="text-center py-16 bg-slate-800/30 rounded-lg border border-slate-600">
          <QrCode className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            {searchQuery ? 'No designs found' : 'No QR designs yet'}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first custom QR code to get started'}
          </p>
          <button
            onClick={() => navigate('/qr-designs')}
            className="btn-primary px-6 py-3"
          >
            Create QR Design
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredDesigns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              className="bg-slate-800/50 rounded-lg border border-slate-600 overflow-hidden hover:border-neon-blue/50 transition-all duration-300 hover:shadow-lg"
            >
              {/* QR Code Preview */}
              <div className="bg-white p-4 flex items-center justify-center">
                <img
                  src={design.qrCodeUrl}
                  alt={design.name}
                  className="w-full max-w-[200px] h-auto"
                />
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-slate-100 font-semibold mb-2 truncate">{design.name}</h3>
                
                <div className="flex items-start gap-2 mb-3">
                  <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400 break-all line-clamp-2">
                    {design.redirectUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(design.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(design)}
                    className="flex-1 bg-neon-blue text-white py-2 rounded-lg hover:bg-neon-purple transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => handleDelete(design.id)}
                    disabled={deletingId === design.id}
                    className="p-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {deletingId === design.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredDesigns.length > 0 && (
        <div className="space-y-4">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              className="bg-slate-800/50 rounded-lg border border-slate-600 p-4 hover:border-neon-blue/50 transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {/* QR Code Thumbnail */}
                <div className="bg-white p-3 rounded-lg flex-shrink-0 w-24 h-24 flex items-center justify-center">
                  <img
                    src={design.qrCodeUrl}
                    alt={design.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-100 font-semibold mb-2">{design.name}</h3>
                  
                  <div className="flex items-start gap-2 mb-2">
                    <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-400 break-all">
                      {design.redirectUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(design.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{design.downloadCount || 0} downloads</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 sm:justify-center">
                  <button
                    onClick={() => handleDownload(design)}
                    className="flex-1 sm:flex-initial bg-neon-blue text-white px-4 py-2 rounded-lg hover:bg-neon-purple transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => handleDelete(design.id)}
                    disabled={deletingId === design.id}
                    className="p-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {deletingId === design.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QRDesignHistoryPage;

