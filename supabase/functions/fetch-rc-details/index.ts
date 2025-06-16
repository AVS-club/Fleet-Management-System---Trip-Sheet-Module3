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

// Rate limit tracking using KV storage
async function checkRateLimit(identifier: string): Promise<{allowed: boolean; remaining: number; reset: number}> {
  // Get or create KV namespace
  const kv = await Deno.openKv();
  const key = ["ratelimit", identifier];
  const now = Date.now();
  const resetTime = now + RATE_LIMIT.window;
  
  // Attempt to get the current rate limit data
  const result = await kv.get(key);
  let data = result.value as { count: number; reset: number } | null;
  
  // If no data exists or it's expired, create a new entry
  if (!data || now >= data.reset) {
    data = { count: 0, reset: resetTime };
  }
  
  // Check if the rate limit has been exceeded
  if (data.count >= RATE_LIMIT.requests) {
    await kv.close();
    return { allowed: false, remaining: 0, reset: Math.ceil((data.reset - now) / 1000) };
  }
  
  // Increment the count and update the KV store
  data.count++;
  await kv.set(key, data, { expireIn: RATE_LIMIT.window });
  await kv.close();
  
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
  const rateLimitResult = await checkRateLimit(clientId);
  
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
      
      return new Response(JSON.stringify({
        error: `API request failed with status ${response.status}`,
        details: errorText
      }), {
        status: 502,
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