import { encodeBase64 as b64encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  // Get the API key from environment variables
  const apiKey = Deno.env.get("APICLUB_KEY");
  const apiUrl = Deno.env.get("APICLUB_URL");
  const apiXid = Deno.env.get("APICLUB_XID");
  console.log(apiKey);
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
          ...corsHeaders
        }
      });
    }
    // Make request to the RC info API
    const payload = `{"vehicleId":"${registration_number}"}`;
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(payload);
    const base64Payload = b64encode(jsonBytes);
    const apiKeyBytes = encoder.encode(apiKey.trim());
    const cryptoKey = await crypto.subtle.importKey("raw", apiKeyBytes, {
      name: "HMAC",
      hash: "SHA-256"
    }, false, [
      "sign"
    ]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(base64Payload));
    // Convert signature to hex string
    const signatureArray = new Uint8Array(signatureBuffer);
    const hmacSignature = Array.from(signatureArray).map((byte)=>byte.toString(16).padStart(2, "0")).join("");
    const options = {
      method: "POST",
      headers: {
        "x-signature": hmacSignature.trim(),
        "x-id": apiXid,
        "Content-Type": "application/json"
      },
      body: payload
    };
    console.log(options);
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
          ...corsHeaders
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
        ...corsHeaders
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
        ...corsHeaders
      }
    });
  }
});
