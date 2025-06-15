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
    const { texts, targetLanguage, sourceLanguage = 'en' } = requestData;
    
    // Validate input
    if (!Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Array of texts to translate is required" }),
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
        JSON.stringify({ translatedTexts: texts }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          }
        }
      );
    }
    
    // Filter out empty strings
    const nonEmptyTexts = texts.filter(text => text && text.trim() !== '');
    
    // If no non-empty texts, return original array
    if (nonEmptyTexts.length === 0) {
      return new Response(
        JSON.stringify({ translatedTexts: texts }),
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
        JSON.stringify({ error: "Translation service unavailable", translatedTexts: texts }),
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
      contents: nonEmptyTexts,
      mimeType: "text/plain",
      sourceLanguageCode: sourceLanguage,
      targetLanguageCode: targetLanguage,
    };
    
    // Perform translation
    const [response] = await translationClient.translateText(request);
    
    // Create a map of original to translated text
    const translationMap = new Map<string, string>();
    nonEmptyTexts.forEach((text, index) => {
      const translatedText = response.translations?.[index]?.translatedText;
      if (translatedText) {
        translationMap.set(text, translatedText);
      }
    });
    
    // Map the original array to translated values using the map
    const translatedTexts = texts.map(text => {
      if (!text || text.trim() === '') {
        return text;
      }
      return translationMap.get(text) || text;
    });
    
    // Return translated texts
    return new Response(
      JSON.stringify({ translatedTexts }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        }
      }
    );
  } catch (error) {
    console.error("Batch translation error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to translate texts",
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