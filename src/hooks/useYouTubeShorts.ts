import { useQuery } from '@tanstack/react-query';
import { getYouTubeService, YouTubeShort } from '../services/youtubeService';

interface UseYouTubeShortsOptions {
  count?: number;
  enabled?: boolean;
}

export const useYouTubeShorts = (options: UseYouTubeShortsOptions = {}) => {
  const { count = 20, enabled = true } = options;

  return useQuery<YouTubeShort[], Error>({
    queryKey: ['youtube-shorts', count],
    queryFn: async () => {
      console.log('Fetching YouTube shorts...');
      const service = getYouTubeService();
      
      if (!service) {
        console.log('YouTube service not available - API key missing');
        return [];
      }
      
      return await service.getFleetShorts(count);
    },
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2,
    onError: (error) => {
      console.error('Failed to fetch YouTube shorts:', error);
    }
  });
};

// Hook to search specific query
export const useYouTubeShortsSearch = (query: string, maxResults: number = 10) => {
  return useQuery<YouTubeShort[], Error>({
    queryKey: ['youtube-shorts-search', query, maxResults],
    queryFn: async () => {
      const service = getYouTubeService();
      
      if (!service) {
        console.log('YouTube service not available - API key missing');
        return [];
      }
      
      return await service.searchShorts(query, maxResults);
    },
    enabled: !!query,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
    onError: (error) => {
      console.error('Failed to search YouTube shorts:', error);
    }
  });
};
