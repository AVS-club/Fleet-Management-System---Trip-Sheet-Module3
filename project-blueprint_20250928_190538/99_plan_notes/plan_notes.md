# Plan and Limits

## Current Plan
- **Type**: Free Tier (assumed)
- **Database**: 500MB
- **Bandwidth**: 1GB/month
- **Storage**: 1GB
- **Logs**: ~1 day retention

## Upgrade Considerations
- **Pro Plan**: /month
  - 8GB database
  - 250GB bandwidth
  - 100GB storage
  - 7 days log retention
  - Branching/Preview databases

## Usage Monitoring
- Monitor database size in Supabase Dashboard
- Check bandwidth usage monthly
- Review storage usage for file uploads

## Optimization Tips
- Use database indexes for better performance
- Implement proper RLS policies
- Use Edge Functions for serverless compute
- Optimize file storage with proper compression
