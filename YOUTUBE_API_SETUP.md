# 🎬 YouTube API Setup Guide

## Quick Setup

### 1. Create .env file
In your project root directory, create a file named `.env` and add:

```env
VITE_YOUTUBE_API_KEY=AIzaSyDunJum_0U1RxX4wMRAbhoZIGCQSCfPwC0
```

### 2. Restart dev server
```bash
npm run dev
```

### 3. Test the integration
- Go to `http://localhost:3005/ai-alerts`
- Check browser console for "Fetching YouTube shorts..."
- Videos should load with real Indian fleet content

## What Happens Now

### ✅ With API Key:
- Fetches real YouTube Shorts from Indian fleet searches
- Shows dynamic content every 30 minutes
- Real view counts and channel names

### ⚠️ Without API Key:
- Shows helpful message: "YouTube API Key Required"
- App continues to work normally
- No errors or crashes

## API Key Location
The app will automatically check for the API key in:
- `.env` file (recommended)
- Environment variables
- Any file where `VITE_YOUTUBE_API_KEY` is defined

## Troubleshooting
- **"API key not found"** → Create `.env` file with the key
- **"No videos found"** → Check API key restrictions in Google Cloud Console
- **"Quota exceeded"** → Wait until next day (free tier resets)

## Free Tier Limits
- 10,000 units/day free
- Your usage: ~4,800 units/day
- Well within limits! ✅
