import { useState, useEffect } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('useYouTubeShortsUnified');

export interface YouTubeShort {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: string;
  duration?: string;
  embedUrl: string;
}

// Fleet-specific search keywords
const FLEET_KEYWORDS = [
  'pickup truck maintenance tips shorts',
  'truck safety guidelines shorts',
  'fleet maintenance best practices',
  'pickup truck driving safety',
  'commercial vehicle maintenance',
  'truck driver safety tips',
  'vehicle inspection checklist',
  'truck tire maintenance shorts',
  'diesel engine maintenance tips',
  'fleet management tips shorts',
  'truck brake safety shorts',
  'commercial driving tips',
  'vehicle fleet safety',
  'truck oil change tutorial',
  'fleet vehicle care shorts'
];

export const useYouTubeShortsUnified = (maxResults: number = 15) => {
  const [shorts, setShorts] = useState<YouTubeShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

        if (!apiKey) {
          logger.error('YouTube API key not found');
          setError('YouTube API key not configured');
          setShorts(getFallbackVideos());
          return;
        }

        const allVideos: YouTubeShort[] = [];
        const usedVideoIds = new Set<string>();

        // Fetch videos for multiple keywords to get variety
        const keywordBatch = FLEET_KEYWORDS.slice(0, 5); // Use first 5 keywords

        for (const keyword of keywordBatch) {
          try {
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
              keyword
            )}&type=video&videoDuration=short&maxResults=5&key=${apiKey}`;

            const response = await fetch(searchUrl);

            if (!response.ok) {
              logger.warn(`YouTube API error for keyword "${keyword}": ${response.status}`);
              continue;
            }

            const data = await response.json();

            if (data.items) {
              const videoIds = data.items
                .map((item: any) => item.id.videoId)
                .filter((id: string) => !usedVideoIds.has(id));

              if (videoIds.length > 0) {
                // Get video details including duration
                const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(
                  ','
                )}&key=${apiKey}`;

                const detailsResponse = await fetch(detailsUrl);

                if (detailsResponse.ok) {
                  const detailsData = await detailsResponse.json();

                  const validShorts = detailsData.items
                    .filter((item: any) => {
                      // Parse duration and filter for actual shorts (< 60 seconds)
                      const duration = parseDuration(item.contentDetails.duration);
                      return duration > 0 && duration <= 60;
                    })
                    .map((item: any) => {
                      usedVideoIds.add(item.id);
                      return {
                        id: item.id,
                        title: item.snippet.title,
                        description: item.snippet.description,
                        thumbnailUrl: item.snippet.thumbnails.high.url,
                        channelTitle: item.snippet.channelTitle,
                        publishedAt: item.snippet.publishedAt,
                        viewCount: item.statistics?.viewCount,
                        duration: item.contentDetails.duration,
                        embedUrl: `https://www.youtube.com/embed/${item.id}`
                      };
                    });

                  allVideos.push(...validShorts);
                }
              }
            }

            // Stop if we have enough videos
            if (allVideos.length >= maxResults) {
              break;
            }

          } catch (err) {
            logger.error(`Error fetching videos for keyword "${keyword}":`, err);
          }
        }

        if (allVideos.length > 0) {
          // Shuffle and limit results
          const shuffled = allVideos.sort(() => Math.random() - 0.5);
          setShorts(shuffled.slice(0, maxResults));
          logger.info(`Loaded ${Math.min(shuffled.length, maxResults)} YouTube shorts`);
        } else {
          // Use fallback if no videos found
          logger.warn('No YouTube shorts found, using fallback videos');
          setShorts(getFallbackVideos());
        }

      } catch (err) {
        logger.error('Error fetching YouTube shorts:', err);
        setError('Failed to load videos');
        setShorts(getFallbackVideos());
      } finally {
        setLoading(false);
      }
    };

    fetchShorts();
  }, [maxResults]);

  return { shorts, loading, error };
};

// Parse ISO 8601 duration to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const minutes = parseInt(match[1] || '0', 10);
  const seconds = parseInt(match[2] || '0', 10);

  return minutes * 60 + seconds;
};

// Fallback videos when API fails
const getFallbackVideos = (): YouTubeShort[] => {
  return [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Essential Truck Maintenance Tips',
      description: 'Quick tips for maintaining your fleet vehicles and ensuring safety on the road.',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      channelTitle: 'Fleet Safety Channel',
      publishedAt: new Date().toISOString(),
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: 'jNQXAC9IVRw',
      title: 'Pickup Truck Safety Guidelines',
      description: 'Important safety checks every driver should perform before hitting the road.',
      thumbnailUrl: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
      channelTitle: 'Commercial Driving Tips',
      publishedAt: new Date().toISOString(),
      embedUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw'
    },
    {
      id: '9bZkp7q19f0',
      title: 'Quick Tire Inspection Guide',
      description: 'Learn how to inspect your truck tires in under 60 seconds.',
      thumbnailUrl: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
      channelTitle: 'Truck Maintenance Pro',
      publishedAt: new Date().toISOString(),
      embedUrl: 'https://www.youtube.com/embed/9bZkp7q19f0'
    }
  ];
};
