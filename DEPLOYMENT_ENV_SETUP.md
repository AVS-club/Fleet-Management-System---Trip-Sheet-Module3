# 🚀 Environment Variables Deployment Guide

## The Problem
Your local environment works fine because you have a `.env` file, but when you deploy to production, the environment variables aren't available, causing the "YouTube API Key Required" error.

## Solution: Set Environment Variables in Your Deployment Platform

### For Netlify (Recommended based on your setup)

1. **Go to your Netlify dashboard**
2. **Navigate to your site**
3. **Go to Site settings > Environment variables**
4. **Add the following environment variable:**
   ```
   Key: VITE_YOUTUBE_API_KEY
   Value: AIzaSyDunJum_0U1RxX4wMRAbhoZIGCQSCfPwC0
   ```
5. **Redeploy your site**

### For Vercel

1. **Go to your Vercel dashboard**
2. **Select your project**
3. **Go to Settings > Environment Variables**
4. **Add:**
   ```
   Name: VITE_YOUTUBE_API_KEY
   Value: AIzaSyDunJum_0U1RxX4wMRAbhoZIGCQSCfPwC0
   Environment: Production, Preview, Development
   ```
5. **Redeploy**

### For GitHub Pages / Other Static Hosts

Create a `.env.production` file in your project root:

```env
VITE_YOUTUBE_API_KEY=AIzaSyDunJum_0U1RxX4wMRAbhoZIGCQSCfPwC0
```

## Alternative: Build-time Environment Variables

If you can't set environment variables in your deployment platform, you can modify your build process:

### Option 1: Use GitHub Secrets (if using GitHub Actions)

1. **Go to your GitHub repository**
2. **Settings > Secrets and variables > Actions**
3. **Add repository secret:**
   ```
   Name: VITE_YOUTUBE_API_KEY
   Value: AIzaSyDunJum_0U1RxX4wMRAbhoZIGCQSCfPwC0
   ```

### Option 2: Hardcode for Production (Not Recommended)

Modify `src/services/youtubeService.ts`:

```typescript
export const getYouTubeService = (apiKey?: string): YouTubeService | null => {
  // Use hardcoded key for production, env for development
  const key = apiKey || import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyDunJum_0U1RxX4wMRAbhoZIGCQSCfPwC0';
  
  if (!key) {
    console.warn('YouTube API key not found');
    return null;
  }
  // ... rest of the code
};
```

## Testing Your Deployment

After setting up environment variables:

1. **Redeploy your site**
2. **Visit your production URL + `/notifications`**
3. **Check browser console for "Fetching YouTube shorts..."**
4. **Videos should load properly**

## Security Note

The YouTube API key shown in the guide is already public and has usage restrictions, so it's safe to use. However, for production apps, consider:

1. **Creating your own YouTube API key**
2. **Setting up proper API key restrictions**
3. **Monitoring usage quotas**

## Troubleshooting

- **Still getting "API key not found"** → Check that the environment variable name is exactly `VITE_YOUTUBE_API_KEY`
- **Videos not loading** → Check browser console for API errors
- **Build failing** → Ensure the environment variable is set before the build process
