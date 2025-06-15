import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { TextTranslationServiceClient } from 'npm:@google-cloud/translate@8.0.1';

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    // Get request body
    const requestData = await req.json();
    const { text, targetLanguage, sourceLanguage = 'en' } = requestData;
    
    // Validate input
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text to translate is required" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }
    
    if (!targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Target language is required" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }
    
    // Skip translation if source and target languages are the same
    if (sourceLanguage === targetLanguage) {
      return new Response(
        JSON.stringify({ translatedText: text }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }
    
    // Load service account credentials from environment variable
    // In production, this would be set as a Supabase secret
    const credentials = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    
    if (!credentials) {
      console.error("Missing Google service account credentials");
      return new Response(
        JSON.stringify({ error: "Translation service unavailable", translatedText: text }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }
    
    // Initialize translation client
    const translationClient = new TextTranslationServiceClient({
      credentials: JSON.parse(credentials)
    });
    
    // Set up translation request
    const projectId = JSON.parse(credentials).project_id;
    const request = {
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      mimeType: "text/plain",
      sourceLanguageCode: sourceLanguage,
      targetLanguageCode: targetLanguage,
    };
    
    // Perform translation
    const [response] = await translationClient.translateText(request);
    const translatedText = response.translations?.[0]?.translatedText || text;
    
    // Return translated text
    return new Response(
      JSON.stringify({ translatedText }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        }
      }
    );
  } catch (error) {
    console.error("Translation error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to translate text",
        message: error.message
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