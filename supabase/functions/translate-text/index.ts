import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage: string;
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { text, targetLanguage, sourceLanguage }: TranslateRequest = await req.json();

    // Validate input
    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: text, targetLanguage" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // If target language is English or same as source, return original text
    if (targetLanguage === 'en' || targetLanguage === sourceLanguage) {
      return new Response(
        JSON.stringify({ translatedText: text }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Mock translation for now - in production, you would integrate with Google Translate API
    // For now, we'll return the original text to avoid translation errors
    let translatedText = text;
    
    // Basic language mapping for demonstration
    if (targetLanguage === 'hi') {
      // Simple mapping for common words - in production use proper translation service
      const hindiTranslations: { [key: string]: string } = {
        'Dashboard': 'डैशबोर्ड',
        'Vehicles': 'वाहन',
        'Drivers': 'चालक',
        'Trips': 'यात्राएं',
        'Maintenance': 'रखरखाव',
        'AI Alerts': 'एआई अलर्ट',
        'Admin': 'प्रशासन',
        'Logout': 'लॉगआउट',
        'Intelligent fleet management and analytics': 'बुद्धिमान बेड़ा प्रबंधन और विश्लेषण',
        'Alerts': 'अलर्ट',
        'Settings': 'सेटिंग्स',
        'Profile': 'प्रोफ़ाइल',
        'Reports': 'रिपोर्ट',
        'Analytics': 'विश्लेषण'
      };
      translatedText = hindiTranslations[text] || text;
    } else if (targetLanguage === 'mr') {
      // Simple mapping for Marathi
      const marathiTranslations: { [key: string]: string } = {
        'Dashboard': 'डॅशबोर्ड',
        'Vehicles': 'वाहने',
        'Drivers': 'चालक',
        'Trips': 'प्रवास',
        'Maintenance': 'देखभाल',
        'AI Alerts': 'एआय इशारे',
        'Admin': 'प्रशासक',
        'Logout': 'लॉगआउट',
        'Intelligent fleet management and analytics': 'बुद्धिमान ताफा व्यवस्थापन आणि विश्लेषण',
        'Alerts': 'इशारे',
        'Settings': 'सेटिंग्स',
        'Profile': 'प्रोफाइल',
        'Reports': 'अहवाल',
        'Analytics': 'विश्लेषण'
      };
      translatedText = marathiTranslations[text] || text;
    }

    return new Response(
      JSON.stringify({ translatedText }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Translation failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});