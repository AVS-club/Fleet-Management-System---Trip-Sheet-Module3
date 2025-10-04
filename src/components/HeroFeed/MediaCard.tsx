import React from 'react';
import { Play, Image, List, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { KPICard } from '@/hooks/useHeroFeed';

interface MediaCardProps {
  card: KPICard;
}

export default function MediaCard({ card }: MediaCardProps) {
  const { kpi_payload, kpi_title, kpi_value_human, theme } = card;

  const getThemeColor = () => {
    switch (theme) {
      case 'distance': return 'bg-blue-50 border-blue-200';
      case 'fuel': return 'bg-amber-50 border-amber-200';
      case 'mileage': return 'bg-green-50 border-green-200';
      case 'pnl': return 'bg-purple-50 border-purple-200';
      case 'utilization': return 'bg-teal-50 border-teal-200';
      case 'trips': return 'bg-indigo-50 border-indigo-200';
      case 'maintenance': return 'bg-orange-50 border-orange-200';
      case 'drivers': return 'bg-cyan-50 border-cyan-200';
      case 'training': return 'bg-pink-50 border-pink-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (!kpi_payload) {
    return (
      <div className={`p-6 rounded-lg border ${getThemeColor()}`}>
        <h3 className="font-semibold text-gray-900 mb-1">{kpi_title || 'Media item unavailable'}</h3>
        <p className="text-sm text-gray-600">This media entry is missing its content.</p>
      </div>
    );
  }

  const handlePlay = () => {
    if (kpi_payload.type === 'youtube' && kpi_payload.videoId) {
      window.open(`https://www.youtube.com/watch?v=${kpi_payload.videoId}`, '_blank');
    } else if (kpi_payload.type === 'playlist' && kpi_payload.playlistId) {
      window.open(`https://www.youtube.com/playlist?list=${kpi_payload.playlistId}`, '_blank');
    }
  };

  const handleViewImage = () => {
    if (kpi_payload.type === 'image' && kpi_payload.url) {
      window.open(kpi_payload.url, '_blank');
    }
  };

  const renderYouTubeCard = () => (
    <div className={`p-6 rounded-lg border ${getThemeColor()} cursor-pointer hover:shadow-md transition-shadow`} onClick={handlePlay}>
      <div className="relative">
        <img 
          src={kpi_payload.thumbnail} 
          alt={kpi_title}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <div className="bg-red-600 rounded-full p-3 hover:bg-red-700 transition-colors">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
        {kpi_payload.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {kpi_payload.duration}
          </div>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{kpi_title}</h3>
          <p className="text-sm text-gray-600 mb-2">{kpi_value_human}</p>
          {kpi_payload.views && (
            <p className="text-xs text-gray-500">{kpi_payload.views} views</p>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
      </div>
    </div>
  );

  const renderImageCard = () => (
    <div className={`p-6 rounded-lg border ${getThemeColor()} cursor-pointer hover:shadow-md transition-shadow`} onClick={handleViewImage}>
      <div className="relative mb-4">
        <img 
          src={kpi_payload.url} 
          alt={kpi_payload.alt || kpi_title}
          className="w-full h-48 object-cover rounded-lg"
        />
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Image className="w-3 h-3" />
          Image
        </div>
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{kpi_title}</h3>
          <p className="text-sm text-gray-600 mb-2">{kpi_value_human}</p>
          {kpi_payload.caption && (
            <p className="text-xs text-gray-500">{kpi_payload.caption}</p>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
      </div>
    </div>
  );

  const renderPlaylistCard = () => (
    <div className={`p-6 rounded-lg border ${getThemeColor()} cursor-pointer hover:shadow-md transition-shadow`} onClick={handlePlay}>
      <div className="relative mb-4">
        <img 
          src={kpi_payload.thumbnail} 
          alt={kpi_title}
          className="w-full h-48 object-cover rounded-lg"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <div className="bg-red-600 rounded-full p-3 hover:bg-red-700 transition-colors">
            <List className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {kpi_payload.videos} videos
        </div>
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{kpi_title}</h3>
          <p className="text-sm text-gray-600 mb-2">{kpi_value_human}</p>
          {kpi_payload.totalDuration && (
            <p className="text-xs text-gray-500">{kpi_payload.totalDuration} total</p>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
      </div>
    </div>
  );

  const renderKPICard = () => (
    <div className={`p-6 rounded-lg border ${getThemeColor()}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{kpi_title}</h3>
          <p className="text-2xl font-bold text-gray-900 mb-2">{kpi_value_human}</p>
          {kpi_payload.trend && (
            <div className="flex items-center gap-1">
              {kpi_payload.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${kpi_payload.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {kpi_payload.change}
              </span>
              {kpi_payload.period && (
                <span className="text-xs text-gray-500 ml-2">{kpi_payload.period}</span>
              )}
            </div>
          )}
        </div>
        <div className="ml-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            theme === 'distance' ? 'bg-blue-100' :
            theme === 'fuel' ? 'bg-amber-100' :
            theme === 'mileage' ? 'bg-green-100' :
            theme === 'pnl' ? 'bg-purple-100' :
            theme === 'utilization' ? 'bg-teal-100' :
            'bg-gray-100'
          }`}>
            <TrendingUp className={`w-6 h-6 ${
              theme === 'distance' ? 'text-blue-600' :
              theme === 'fuel' ? 'text-amber-600' :
              theme === 'mileage' ? 'text-green-600' :
              theme === 'pnl' ? 'text-purple-600' :
              theme === 'utilization' ? 'text-teal-600' :
              'text-gray-600'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );

  switch (kpi_payload.type) {
    case 'youtube':
      return renderYouTubeCard();
    case 'image':
      return renderImageCard();
    case 'playlist':
      return renderPlaylistCard();
    case 'kpi':
      return renderKPICard();
    default:
      return renderKPICard();
  }
}
