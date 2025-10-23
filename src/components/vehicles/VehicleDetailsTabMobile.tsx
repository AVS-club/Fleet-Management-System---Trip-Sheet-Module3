import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Calendar,
  MapPin,
  Settings,
  Download,
  Eye,
  Link,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import WhatsAppIcon from '../ui/WhatsAppIcon';
import { Vehicle } from '@/types';
import { toast } from 'react-toastify';
import { supabase } from '../../utils/supabaseClient';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VehicleDetailsTabMobile');

interface VehicleDetailsTabProps {
  vehicle: Vehicle;
  signedDocUrls: {
    rc?: string[];
    insurance?: string[];
    fitness?: string[];
    tax?: string[];
    permit?: string[];
    puc?: string[];
    other: Record<string, string>;
  };
}

const VehicleDetailsTabMobile: React.FC<VehicleDetailsTabProps> = ({ vehicle, signedDocUrls }) => {
  const { t } = useTranslation();
  
  // Debug logging for insurance documents
  logger.debug('🔍 VehicleDetailsTabMobile - received signedDocUrls:', signedDocUrls);
  logger.debug('🔍 VehicleDetailsTabMobile - insurance URLs:', signedDocUrls.insurance);
  logger.debug('🔍 Insurance URLs from vehicle:', vehicle.insurance_document_url);
  logger.debug('🔍 Full vehicle object:', vehicle);

  // Helper function to format dates
  const formatDate = (date: string | null | undefined) => {
    if (!date) return t('common.notAvailable');
    return new Date(date).toLocaleDateString('en-IN');
  };

  // Helper function to calculate days until expiry
  const daysUntil = (date: string | null | undefined) => {
    if (!date) return null;
    const today = new Date();
    const expiryDate = new Date(date);
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Define document structure
  const documents = [
    {
      type: 'rc',
      label: t('documents.rc'),
      emoji: '📄',
      expiryField: t('documents.expiry'),
      expiryDate: vehicle.rc_expiry_date,
      urls: signedDocUrls.rc || []
    },
    {
      type: 'insurance',
      label: t('documents.insurance'),
      emoji: '🛡️',
      expiryField: t('documents.expiry'),
      expiryDate: vehicle.insurance_expiry_date,
      urls: signedDocUrls.insurance || []
    },
    {
      type: 'fitness',
      label: t('documents.fitness'),
      emoji: '✅',
      expiryField: t('documents.expiry'),
      expiryDate: vehicle.fitness_expiry_date,
      urls: signedDocUrls.fitness || []
    },
    {
      type: 'permit',
      label: t('documents.permit'),
      emoji: '🎫',
      expiryField: t('documents.expiry'),
      expiryDate: vehicle.permit_expiry_date,
      urls: signedDocUrls.permit || []
    },
    {
      type: 'puc',
      label: t('documents.puc'),
      emoji: '🌬️',
      expiryField: t('documents.expiry'),
      expiryDate: vehicle.puc_expiry_date,
      urls: signedDocUrls.puc || []
    },
    {
      type: 'tax',
      label: t('documents.tax'),
      emoji: '💰',
      expiryField: t('documents.expiry'),
      expiryDate: vehicle.tax_paid_upto,
      urls: signedDocUrls.tax || []
    }
  ];

  // Debug the documents array
  logger.debug('🔍 Mobile Documents array created:', documents);
  logger.debug('🔍 Mobile Insurance document in array:', documents.find(doc => doc.type === 'insurance'));

  const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return { 
      status: 'missing', 
      color: 'gray', 
      bgColor: 'bg-gray-100 dark:bg-gray-800', 
      textColor: 'text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-600',
      icon: XCircle,
      days: null 
    };
    
    const days = daysUntil(expiryDate);
    
    if (days === null) return { 
      status: 'missing', 
      color: 'gray', 
      bgColor: 'bg-gray-100 dark:bg-gray-800', 
      textColor: 'text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-600',
      icon: XCircle,
      days: null 
    };
    
    if (days < 0) return { 
      status: 'expired', 
      color: 'red', 
      bgColor: 'bg-red-100 dark:bg-red-900/20', 
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-500 dark:border-red-400',
      icon: XCircle,
      days: Math.abs(days) 
    };
    
    if (days <= 7) return { 
      status: 'critical', 
      color: 'red', 
      bgColor: 'bg-red-100 dark:bg-red-900/20', 
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-500 dark:border-red-400',
      icon: AlertCircle,
      days 
    };
    
    if (days <= 30) return { 
      status: 'warning', 
      color: 'orange', 
      bgColor: 'bg-orange-100 dark:bg-orange-900/20', 
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-500 dark:border-orange-400',
      icon: Clock,
      days 
    };
    
    return { 
      status: 'valid', 
      color: 'green', 
      bgColor: 'bg-green-100 dark:bg-green-900/20', 
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-500 dark:border-green-400',
      icon: CheckCircle,
      days 
    };
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(t('messages.downloadSuccess'));
    } catch (error) {
      logger.error('Download failed:', error);
      toast.error(t('messages.downloadError'));
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('messages.linkCopied'));
    } catch (error) {
      logger.error('Failed to copy:', error);
      toast.error(t('messages.copyError'));
    }
  };

  // Working view handler that uses download-then-open approach
  const handleViewCompliance = async (docUrls: string[] | null, docType: string) => {
    logger.debug(`🔍 handleViewCompliance called for ${docType}:`, docUrls);
    
    if (!docUrls || docUrls.length === 0) {
      logger.debug(`❌ No ${docType} documents available`);
      toast.info(`No ${docType} documents available`);
      return;
    }

    try {
      // Take the first document URL
      const filePath = docUrls[0];
      logger.debug(`🔍 Original filePath:`, filePath);
      
      // Clean the path
      const cleanedPath = filePath
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//, '')
        .replace(/^vehicle-docs\//, '')
        .replace(/^driver-docs\//, '')
        .trim();
      
      logger.debug(`🔍 Cleaned path:`, cleanedPath);
      
      // Download and open (this works like in edit mode)
      logger.debug(`🔍 Attempting to download from vehicle-docs bucket:`, cleanedPath);
      const { data, error } = await supabase.storage
        .from('vehicle-docs')
        .download(cleanedPath);
      
      if (error) {
        logger.error(`❌ Download error:`, error);
        throw error;
      }
      
      logger.debug(`✅ Download successful, data:`, data);
      logger.debug(`🔍 Data type:`, typeof data, 'Size:', data?.size);
      
      // Create blob URL and open
      const url = URL.createObjectURL(data);
      logger.debug(`🔍 Created blob URL:`, url);
      
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
    } catch (error) {
      logger.error('❌ View error:', error);
      logger.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        name: error.name
      });
      toast.error('Unable to view document');
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Vehicle Profile Card - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-l-4 border-primary-500">
        <div className="flex items-start gap-4">
          {/* Vehicle Photo - Larger on Mobile */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 shadow-md">
              {vehicle.photo_url ? (
                <img 
                  src={vehicle.photo_url} 
                  alt={vehicle.registration_number}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <Settings className="h-10 w-10 md:h-12 md:w-12" />
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Info - Larger Text */}
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {vehicle.registration_number}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mt-1">
              {vehicle.make} {vehicle.model}
            </p>
            <p className="text-base text-gray-500 dark:text-gray-400">({vehicle.year})</p>
            
            {/* Quick Stats */}
            <div className="mt-3 flex flex-wrap gap-3 text-sm md:text-base">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">
                <Settings className="h-4 w-4" />
                {vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full">
                <MapPin className="h-4 w-4" />
                {vehicle.current_odometer?.toLocaleString() || 0} km
              </span>
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                vehicle.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                vehicle.status === 'maintenance' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                {vehicle.status === 'active' ? '✅ ' + t('vehicles.active') :
                 vehicle.status === 'maintenance' ? '🔧 ' + t('vehicles.maintenance') :
                 '⏸️ ' + t('vehicles.inactive')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section - Card Based, Mobile First */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 md:p-6">
        <h3 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          {t('vehicles.compliance')}
        </h3>

        <div className="space-y-3">
          {documents.map((doc) => {
            const expiry = getExpiryStatus(doc.expiryDate);
            const hasDocument = doc.urls && doc.urls.length > 0;
            const StatusIcon = expiry.icon;

            return (
              <div
                key={doc.type}
                className={`rounded-xl p-4 border-2 ${expiry.borderColor} ${expiry.bgColor} transition-all hover:shadow-md`}
              >
                {/* Document Header - Larger for Mobile */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-3xl md:text-4xl">{doc.emoji}</span>
                    <div className="flex-1">
                      <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">{doc.label}</h4>
                      
                      {/* Expiry Status */}
                      {doc.expiryDate ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm md:text-base text-gray-700 dark:text-gray-300">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{formatDate(doc.expiryDate)}</span>
                          </div>
                          {expiry.days !== null && (
                            <div className={`flex items-center gap-2 text-sm md:text-base font-semibold ${expiry.textColor}`}>
                              <StatusIcon className="h-5 w-5" />
                              <span>
                                {expiry.status === 'expired' 
                                  ? `${expiry.days} ${t('documents.daysAgoExpired')}` 
                                  : expiry.status === 'critical' 
                                  ? `${expiry.days} ${t('documents.daysLeft')} 🚨` 
                                  : expiry.status === 'warning' 
                                  ? `${expiry.days} ${t('documents.daysLeft')} ⚠️` 
                                  : t('documents.valid')
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('documents.noExpiry')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Larger Touch Targets */}
                {hasDocument ? (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {/* View Button */}
                    <button
                      onClick={() => handleViewCompliance(doc.urls, doc.type)}
                      className="flex items-center justify-center gap-2 px-4 py-3 md:py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md font-semibold text-sm md:text-base"
                    >
                      <Eye className="h-5 w-5" />
                      <span>{t('common.view')}</span>
                    </button>
                    
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(doc.urls[0], `${vehicle.registration_number}_${doc.type}`)}
                      className="flex items-center justify-center gap-2 px-4 py-3 md:py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-md font-semibold text-sm md:text-base"
                    >
                      <Download className="h-5 w-5" />
                      <span>{t('common.download')}</span>
                    </button>
                    
                    {/* WhatsApp Button */}
                    <button
                      onClick={() => {
                        const message = `${doc.label} for ${vehicle.registration_number}: ${doc.urls[0]}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 md:py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-md font-semibold text-sm md:text-base"
                    >
                      <WhatsAppIcon size={22} variant="dark" />
                      <span>WhatsApp</span>
                    </button>
                    
                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(doc.urls[0])}
                      className="flex items-center justify-center gap-2 px-4 py-3 md:py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors shadow-md font-semibold text-sm md:text-base"
                    >
                      <Link className="h-5 w-5" />
                      <span>{t('documents.copyLink')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-700 rounded-xl p-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-base md:text-lg font-medium text-gray-600 dark:text-gray-300">
                      {t('documents.noDocument')}
                    </p>
                    <button className="mt-3 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                      {t('documents.uploadDocument')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsTabMobile;
