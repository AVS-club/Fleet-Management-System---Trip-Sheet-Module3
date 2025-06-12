import { createClient } from 'npm:@supabase/supabase-js';
import { GoogleAuth } from 'npm:google-auth-library';

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Create a Supabase client with the service role key
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Cache for tokens to avoid unnecessary token generation
const tokenCache = {
  token: null,
  expiresAt: 0
};

// Function to generate a real Google Auth token
async function generateGoogleAuthToken() {
  try {
    // Check if we have a valid cached token
    const now = Date.now();
    if (tokenCache.token && tokenCache.expiresAt > now) {
      console.log("Using cached token");
      return {
        token: tokenCache.token,
        expires_in: Math.floor((tokenCache.expiresAt - now) / 1000)
      };
    }

    // Get service account credentials from environment variables
    const credentials = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS');
    if (!credentials) {
      throw new Error('Google service account credentials not found');
    }

    // Parse credentials JSON
    const serviceAccountKey = JSON.parse(credentials);

    // Create a new GoogleAuth instance
    const auth = new GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    // Get the client
    const client = await auth.getClient();
    
    // Get the token
    const tokenResponse = await client.getAccessToken();
    
    if (!tokenResponse.token) {
      throw new Error('Failed to get access token from Google');
    }

    // Cache the token with expiry time (subtract 5 minutes for safety margin)
    const expiryTime = tokenResponse.expiryDate?.getTime() || (now + 3600 * 1000);
    const safeExpiryTime = expiryTime - (5 * 60 * 1000);
    
    tokenCache.token = tokenResponse.token;
    tokenCache.expiresAt = safeExpiryTime;

    return {
      token: tokenResponse.token,
      expires_in: Math.floor((safeExpiryTime - now) / 1000)
    };
  } catch (error) {
    console.error("Error generating Google Auth token:", error);
    throw error;
  }
}

// Fallback to mock token for development if Google credentials are not available
function generateMockToken() {
  console.warn("Using mock token - NOT FOR PRODUCTION");
  return {
    token: "mock_document_ai_token_" + Math.random().toString(36).substring(2, 15),
    expires_in: 3600
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Try to generate a real Google Auth token
    let tokenData;
    try {
      tokenData = await generateGoogleAuthToken();
    } catch (error) {
      console.error("Failed to generate Google Auth token:", error);
      
      // Fall back to mock token if in development environment
      if (Deno.env.get('ENVIRONMENT') === 'development') {
        tokenData = generateMockToken();
      } else {
        throw error; // Re-throw in production
      }
    }

    return new Response(
      JSON.stringify(tokenData),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error("Error generating token:", error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to generate token', details: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});