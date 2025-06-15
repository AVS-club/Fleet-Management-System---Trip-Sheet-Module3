import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface BatchTranslateRequest {
  texts: string[];
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

    const { texts, targetLanguage, sourceLanguage }: BatchTranslateRequest = await req.json();

    // Validate input
    if (!texts || !Array.isArray(texts) || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: texts (array), targetLanguage" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // If target language is English or same as source, return original texts
    if (targetLanguage === 'en' || targetLanguage === sourceLanguage) {
      return new Response(
        JSON.stringify({ translatedTexts: texts }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Mock batch translation for now - in production, you would integrate with Google Translate API
    const translatedTexts: string[] = [];
    
    // Basic language mapping for demonstration
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

    for (const text of texts) {
      let translatedText = text;
      
      if (targetLanguage === 'hi') {
        translatedText = hindiTranslations[text] || text;
      } else if (targetLanguage === 'mr') {
        translatedText = marathiTranslations[text] || text;
      }
      
      translatedTexts.push(translatedText);
    }

    return new Response(
      JSON.stringify({ translatedTexts }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Batch translation error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Batch translation failed", 
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