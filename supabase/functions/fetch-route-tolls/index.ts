import { createClient } from 'npm:@supabase/supabase-js';

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Rate limit configuration
const RATE_LIMIT = {
  requests: 10,       // Maximum requests
  window: 60 * 1000,  // Time window in milliseconds (1 minute)
};

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; reset: number }>();

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now >= data.reset) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Rate limit checking function
function checkRateLimit(identifier: string): {allowed: boolean; remaining: number; reset: number} {
  const now = Date.now();
  const resetTime = now + RATE_LIMIT.window;
  
  // Get current rate limit data
  let data = rateLimitStore.get(identifier);
  
  // If no data exists or it's expired, create a new entry
  if (!data || now >= data.reset) {
    data = { count: 0, reset: resetTime };
  }
  
  // Check if the rate limit has been exceeded
  if (data.count >= RATE_LIMIT.requests) {
    return { allowed: false, remaining: 0, reset: Math.ceil((data.reset - now) / 1000) };
  }
  
  // Increment the count and update the store
  data.count++;
  rateLimitStore.set(identifier, data);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT.requests - data.count,
    reset: Math.ceil((data.reset - now) / 1000)
  };
}

// Get client identifier (IP address or auth token)
function getClientIdentifier(req: Request): string {
  // Try to get user ID from auth token
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return `auth:${authHeader.slice(7)}`;
  }
  
  // Fallback to IP address
  const forwardedFor = req.headers.get("X-Forwarded-For");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  return `ip:${clientIp}`;
}

// Map vehicle types to Google Maps vehicle types
function mapVehicleTypeToGoogleMapsType(vehicleType: string): string {
  switch (vehicleType.toLowerCase()) {
    case 'truck':
      return 'TRUCK';
    case 'tempo':
    case 'pickup':
      return 'LIGHT_TRUCK';
    case 'trailer':
      return 'TRUCK_WITH_TRAILER';
    default:
      return 'TRUCK'; // Default to truck if unknown
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Get client identifier for rate limiting
  const clientId = getClientIdentifier(req);
  
  // Check rate limit
  const rateLimitResult = checkRateLimit(clientId);
  
  // Prepare rate limit headers
  const rateLimitHeaders = {
    "X-RateLimit-Limit": RATE_LIMIT.requests.toString(),
    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": rateLimitResult.reset.toString()
  };
  
  // If rate limit exceeded, return 429 Too Many Requests
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retry_after: rateLimitResult.reset
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": rateLimitResult.reset.toString(),
        ...corsHeaders,
        ...rateLimitHeaders
      }
    });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { 
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
          ...rateLimitHeaders
        }
      }
    );
  }

  // Create a Supabase client with the service role key
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
          ...rateLimitHeaders
        }
      }
    );
  }

  try {
    // Parse the request body
    const { origin, destinations, vehicleType } = await req.json();
    
    // Validate required parameters
    if (!origin || !destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return new Response(JSON.stringify({
        error: "Missing required parameters",
        message: "Origin, destinations, and vehicleType are required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          ...rateLimitHeaders
        }
      });
    }

    // Get Google Maps API key from environment variables
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "Configuration error",
        message: "Google Maps API key is not configured"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          ...rateLimitHeaders
        }
      });
    }

    // Map vehicle type to Google Maps vehicle type
    const googleVehicleType = mapVehicleTypeToGoogleMapsType(vehicleType);
    
    // Prepare waypoints for the route
    const waypoints = destinations.map((dest: any) => `${dest.lat},${dest.lng}`).join('|');
    
    // Call Google Maps Directions API to get the route
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destinations[destinations.length-1].lat},${destinations[destinations.length-1].lng}&waypoints=${waypoints}&key=${apiKey}`;
    
    const directionsResponse = await fetch(directionsUrl);
    if (!directionsResponse.ok) {
      throw new Error(`Directions API request failed with status ${directionsResponse.status}`);
    }
    
    const directionsData = await directionsResponse.json();
    
    if (directionsData.status !== "OK") {
      return new Response(JSON.stringify({
        error: "Directions API error",
        message: `Failed to get directions: ${directionsData.status}`,
        details: directionsData.error_message
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          ...rateLimitHeaders
        }
      });
    }
    
    // Extract the route polyline from the directions response
    const route = directionsData.routes[0];
    const polyline = route.overview_polyline.points;
    
    // Calculate total distance from the route
    const totalDistance = route.legs.reduce((sum: number, leg: any) => 
      sum + leg.distance.value, 0) / 1000; // Convert to kilometers
    
    // Call Google Maps Roads API to get toll information
    // Note: As of my knowledge cutoff, Google Maps Platform doesn't have a direct toll calculation API
    // This is a placeholder for when such an API becomes available or for integration with a third-party toll API
    
    // For now, we'll estimate toll costs based on distance and vehicle type
    // This is a very rough approximation and should be replaced with actual API calls when available
    let estimatedTollCost = 0;
    
    // Simple toll estimation logic (replace with actual API call when available)
    // These rates are fictional and should be replaced with real data
    const tollRatePerKm = {
      'TRUCK': 3.5,
      'LIGHT_TRUCK': 2.0,
      'TRUCK_WITH_TRAILER': 4.5
    }[googleVehicleType] || 3.0;
    
    // Assume tolls on approximately 60% of the route for highways
    const tollableDistance = totalDistance * 0.6;
    estimatedTollCost = tollableDistance * tollRatePerKm;
    
    // Round to 2 decimal places
    estimatedTollCost = Math.round(estimatedTollCost * 100) / 100;
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        totalDistance,
        estimatedTollCost,
        route: {
          polyline,
          legs: route.legs.map((leg: any) => ({
            distance: leg.distance.value / 1000, // km
            duration: leg.duration.value / 60, // minutes
            start_address: leg.start_address,
            end_address: leg.end_address
          }))
        }
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        ...rateLimitHeaders
      }
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: "An unexpected error occurred while processing your request",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        ...rateLimitHeaders
      }
    });
  }
});