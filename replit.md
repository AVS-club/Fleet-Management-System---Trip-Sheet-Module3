# Fleet Management System

## Overview
A comprehensive React + TypeScript fleet management application using Vite, Supabase, and Google Maps integration. The system provides vehicle tracking, driver management, trip analysis, maintenance scheduling, and AI-powered insights.

## Project Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS with custom brand styling
- **Backend**: Supabase (PostgreSQL database, authentication, real-time features)
- **Maps**: Google Maps JavaScript API
- **State Management**: TanStack Query (React Query)
- **Build Tool**: Vite with hot module replacement
- **Testing**: Vitest + Testing Library

## Environment Configuration
- **Development Server**: Configured for Replit with host 0.0.0.0:5000
- **HMR**: Configured for HTTPS proxy (clientPort: 443)
- **Environment Variables**: 
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_GOOGLE_MAPS_API_KEY

## Recent Changes
- **2025-09-09**: Initial Replit setup completed
  - Configured Vite for Replit proxy environment
  - Set up development workflow on port 5000
  - Fixed CSS import order warnings
  - Resolved TypeScript lint issues
  - Configured environment variables for Supabase and Google Maps

## Key Features
- Vehicle and driver management
- Trip tracking with real-time location data
- Maintenance scheduling and analytics
- Document management with file uploads
- AI-powered alerts and insights
- Mobile-responsive design
- Dark/light theme support
- Export capabilities (PDF, Excel)
- WhatsApp integration for sharing

## Development Notes
- Uses mock client fallback when Supabase is not configured
- Comprehensive error handling for network connectivity
- Optimized for mobile performance with reduced cache times
- Supports both development and production environments