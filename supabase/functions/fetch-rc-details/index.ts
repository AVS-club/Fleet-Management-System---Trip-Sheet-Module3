import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // Get the API key from environment variables
  const apiKey = Deno.env.get("APICLUB_KEY") || "apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50";
  
  try {
    // Parse the request body
    const { registration_number } = await req.json();
    
    if (!registration_number) {
      return new Response(
        JSON.stringify({ 
          error: "Registration number is required"
        }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Make request to the RC info API
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        Referer: 'docs.apiclub.in',
        'content-type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ registration_number })
    };
    
    const response = await fetch('https://uat.apiclub.in/api/v1/rc_info', options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}): ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          error: `API request failed with status ${response.status}`,
          details: errorText
        }),
        { 
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    const data = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        data: data
      }),
      { 
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});