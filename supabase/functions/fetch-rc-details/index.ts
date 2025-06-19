import { encodeBase64 as b64encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"
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

// Rate limit checking function using in-memory storage
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
  
  // Get the API key from environment variables
  const apiKey = Deno.env.get("APICLUB_KEY") || "apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50";
  const apiUrl = Deno.env.get("APICLUB_URL") || "https://uat.apiclub.in/api";
  const apiXid = Deno.env.get("APICLUB_XID") || "docs.apiclub.in";
  
  try {
    // Parse the request body
    const { registration_number } = await req.json();
    
    if (!registration_number) {
      return new Response(JSON.stringify({
        error: "Registration number is required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          ...rateLimitHeaders
        }
      });
    }
    
    // Log the request (for monitoring purposes)
    console.log(`Processing RC details request for: ${registration_number}`);
    
    // Make request to the RC info API
    const payload = `{"vehicleId":"${registration_number}"}`;
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(payload);
    const base64Payload = b64encode(jsonBytes);
    
    const apiKeyBytes = encoder.encode(apiKey.trim());
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      apiKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC", 
      cryptoKey, 
      encoder.encode(base64Payload)
    );
    
    // Convert signature to hex string
    const signatureArray = new Uint8Array(signatureBuffer);
    const hmacSignature = Array.from(signatureArray)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
    
    const options = {
      method: "POST",
      headers: {
        "x-signature": hmacSignature.trim(),
        "x-id": apiXid,
        "Content-Type": "application/json"
      },
      body: payload
    };
    
    const response = await fetch(`${apiUrl}/v1/rc_info`, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}): ${errorText}`);
      
      // Parse error response to check for specific error messages
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // Check if the external service is down
      if (errorData.message && errorData.message.toLowerCase().includes('backend down')) {
        return new Response(JSON.stringify({
          error: "External RC details service unavailable",
          message: "The vehicle registration details service is temporarily unavailable. Please try again later.",
          service_status: "down",
          retry_after: 300 // Suggest retry after 5 minutes
        }), {
          status: 503, // Service Unavailable
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "300",
            ...corsHeaders,
            ...rateLimitHeaders
          }
        });
      }
      
      // For other API errors, return Bad Gateway
      return new Response(JSON.stringify({
        error: "External API error",
        message: "Failed to fetch vehicle details from external service",
        details: errorData.message || errorText,
        status_code: response.status
      }), {
        status: 502, // Bad Gateway
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          ...rateLimitHeaders
        }
      });
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: data
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