export interface YouTubeShort {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: string;
  likeCount?: string;
}

// Indian fleet-related search queries
const SEARCH_QUERIES = [
  'Indian truck driving',
  'Indian truck test',
  'RTO truck test India',
  'Indian pickup truck',
  'commercial vehicle India',
  'truck maintenance India',
  'Indian truck safety',
  'truck driver India',
  'Indian transport tips',
  'fleet management India',
  'truck fuel saving India',
  'Indian truck route',
  'truck inspection India',
  'Indian commercial vehicle',
  'truck driver training India'
];

class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  private cache: Map<string, { data: YouTubeShort[]; timestamp: number }> = new Map();
  private cacheTimeout = 1000 * 60 * 30; // 30 minutes cache

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for YouTube Shorts based on query
   * Filters for videos under 60 seconds (typical shorts duration)
   */
  async searchShorts(query: string, maxResults: number = 10): Promise<YouTubeShort[]> {
    // Check cache first
    const cacheKey = `${query}-${maxResults}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug('Returning cached YouTube shorts for:', query);
      return cached.data;
    }

    try {
      // Search for videos
      const searchUrl = `${this.baseUrl}/search?` + new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        videoDuration: 'short', // Filter for short videos
        maxResults: maxResults.toString(),
        key: this.apiKey,
        regionCode: 'IN', // Focus on Indian content
        relevanceLanguage: 'en', // English language
        order: 'relevance' // Most relevant first
      });

      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) {
        throw new Error(`YouTube API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        logger.warn('No YouTube shorts found for query:', query);
        return [];
      }

      // Get video IDs
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

      // Get detailed video statistics
      const videoUrl = `${this.baseUrl}/videos?` + new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        id: videoIds,
        key: this.apiKey
      });

      const videoResponse = await fetch(videoUrl);
      const videoData = await videoResponse.json();

      // Transform to our format
      const shorts: YouTubeShort[] = videoData.items
        .filter((video: any) => {
          // Filter for actual shorts (under 60 seconds)
          const duration = video.contentDetails.duration;
          return this.parseDuration(duration) <= 60;
        })
        .map((video: any) => ({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description || 'Fleet management tips',
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
          channelTitle: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          viewCount: this.formatViewCount(video.statistics.viewCount),
          likeCount: this.formatCount(video.statistics.likeCount)
        }));

      // Cache results
      this.cache.set(cacheKey, { data: shorts, timestamp: Date.now() });

      return shorts;
    } catch (error) {
      logger.error('Error fetching YouTube shorts:', error);
      return [];
    }
  }

  /**
   * Get multiple shorts from different search queries
   * Rotates through queries to get diverse content
   */
  async getFleetShorts(count: number = 20): Promise<YouTubeShort[]> {
    const shortsPerQuery = Math.ceil(count / 3); // Get from 3 different queries
    const selectedQueries = this.getRandomQueries(3);

    logger.debug('Fetching YouTube shorts from queries:', selectedQueries);

    const results = await Promise.all(
      selectedQueries.map(query => this.searchShorts(query, shortsPerQuery))
    );

    // Flatten and shuffle results
    const allShorts = results.flat();
    const shuffled = this.shuffleArray(allShorts).slice(0, count);
    
    logger.debug(`Found ${shuffled.length} shorts from ${selectedQueries.length} queries`);
    return shuffled;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format view count to readable string
   */
  private formatViewCount(count: string): string {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  /**
   * Format like/comment count to readable string
   */
  private formatCount(count: string): string {
    const num = parseInt(count);
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  /**
   * Get random queries from the list
   */
  private getRandomQueries(count: number): string[] {
    const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let youtubeServiceInstance: YouTubeService | null = null;

export const getYouTubeService = (apiKey?: string): YouTubeService | null => {
  const key = apiKey || import.meta.env.VITE_YOUTUBE_API_KEY;
  
  // BETTER ERROR HANDLING - Don't throw error, return empty service
  if (!key) {
    logger.warn('⚠️ YouTube API key not found. Videos will be disabled.');
    // Return a dummy service that returns empty arrays
    return {
      searchShorts: async () => [],
      getFleetShorts: async () => [],
      clearCache: () => {}
    } as any;
  }

  if (!youtubeServiceInstance || apiKey) {
    youtubeServiceInstance = new YouTubeService(key);
  }

  return youtubeServiceInstance;
};
