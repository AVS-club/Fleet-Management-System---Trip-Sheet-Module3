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
- **2025-09-10**: Critical bug fixes and improvements
  - Fixed LoadingScreen JSX attribute warning (stroke-width → strokeWidth)
  - Resolved Input/CurrencyInput component TypeScript conflicts (size → inputSize)
  - Mass updated all size prop usages across 80+ files to inputSize
  - Enhanced ErrorBoundary with recovery strategies and error tracking
  - Improved destination display to store names directly in trips table
  - Optimized RouteAnalysis layout with side-by-side map view
  - Added Indian-specific validation for license, mobile, Aadhar
  - Implemented document expiry monitoring system
  - Created RC details auto-fetch functionality
  - Added intelligent retry logic with exponential backoff
  - Enhanced driver experience display (now shows years and months)
  - Aligned vehicle assignment with vehicle categories
  - Fixed trip edit form data persistence including destinations and odometer readings
  - Fixed cancel button behavior to properly discard changes
  - Added date search capability supporting multiple formats (DD/MM/YYYY, natural language)
  - Replaced "Breakdown" expense with "FASTag/Toll" expense field
  - Fixed route deviation calculation for return trips (now doubles standard distance for round trips)
  - Redesigned return trip toggle to be compact and positioned beside date fields
  - Implemented automatic toll calculation using Google Maps (₹2/km estimate for Indian highways)
  - Auto-fills FASTag/Toll expense when route is analyzed (doubles for return trips)
  - Fixed mobile navigation to always show icons instead of hamburger menu
  - Added Quick Add Trip feature with FAB on mobile and dropdown on desktop
  - Improved mobile responsiveness across all pages
  
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
- Enhanced ErrorBoundary with error persistence and recovery options
- Input components use 'inputSize' prop to avoid HTML attribute conflicts
- Destination names cached directly in trips table for performance