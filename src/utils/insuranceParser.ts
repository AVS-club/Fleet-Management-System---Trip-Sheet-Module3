import { InsuranceDetails } from '../types';

const DOCUMENT_AI_ENDPOINT = 'https://us-documentai.googleapis.com/v1';
const PROJECT_ID = '888468265587';
const LOCATION = 'us';
const PROCESSOR_ID = '7c2d0194d216033b';

export async function processInsuranceDocument(file: File): Promise<InsuranceDetails> {
  try {
    // Validate file before processing
    validateFile(file);

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    // Get authentication token
    let token: string;
    try {
      token = await getAccessToken();
    } catch (error) {
      throw new Error(
        'Failed to authenticate with Document AI service: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      );
    }
    
    const response = await fetch(
      `${DOCUMENT_AI_ENDPOINT}/projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}:process`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rawDocument: {
            content: base64Data,
            mimeType: file.type,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to process insurance document');
    }

    const data = await response.json();
    return parseDocumentAIResponse(data);
  } catch (error) {
    console.error('Error processing insurance document:', error);
    throw error;
  }
}

function validateFile(file: File): void {
  // Check file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the maximum limit of 10MB');
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, or PDF file');
  }
}

function parseDocumentAIResponse(response: any): InsuranceDetails {
  try {
    const formFields = response.document.pages[0]?.formFields || [];
    const fieldMap = new Map<string, string>();

    formFields.forEach((field: any) => {
      const name = field.fieldName.textAnchor.content.toLowerCase();
      const value = field.fieldValue.textAnchor.content;
      fieldMap.set(name, value);
    });

    const result: InsuranceDetails = {
      policyNumber: findField(fieldMap, ['policy number', 'policy no']),
      insurerName: findField(fieldMap, ['insurer name', 'insurance company']),
      validFrom: findField(fieldMap, ['valid from', 'start date']),
      validUntil: findField(fieldMap, ['valid until', 'expiry date']),
      vehicleNumber: findField(fieldMap, ['vehicle number', 'registration number']),
      coverage: findField(fieldMap, ['coverage', 'sum insured']),
      premium: parseFloat(findField(fieldMap, ['premium']) || '0'),
      confidence: 0.9,
      rawText: response.document.text
    };

    return result;
  } catch (error) {
    console.error('Error parsing insurance document:', error);
    throw new Error('Failed to parse insurance document');
  }
}

function findField(fieldMap: Map<string, string>, possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    const value = fieldMap.get(name);
    if (value) return value.trim();
  }
  return undefined;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
}

async function getAccessToken(): Promise<string> {
  const response = await fetch('/api/auth/document-ai-token');
  if (!response.ok) {
    throw new Error('Failed to get Document AI access token');
  }
  const data = await response.json();
  if (!data.token) {
    throw new Error('No token received from server');
  }
  return data.token;
}

export function extractInsuranceDetails(text: string): InsuranceDetails[] {
  if (!text || typeof text !== "string") {
    throw new Error("No text provided");
  }

  const cleanedText = text.replace(/\s+/g, " ").toLowerCase();

  const chunks = cleanedText
    .split(/policy(?:\.|number)[:\s]*/i)
    .map(c => "policy number " + c.trim())
    .filter(c => c.length > 50);

  const insuranceList: InsuranceDetails[] = [];

  for (const chunk of chunks) {
    const extract = (regex: RegExp) => {
      const match = chunk.match(regex);
      return match ? { value: match[1].trim(), confidence: 0.8 } : undefined;
    };

    const result: InsuranceDetails = {
      policyNumber: extract(/policy(?:\.|number)[:\s]*([a-z0-9\-\/]+)/i)?.value,
      insurerName: extract(/insurer[:\s]+([a-z0-9\s&\-]+(?:insurance|assurance|limited))/i)?.value,
      validFrom: extract(/valid(?:\.|from)[:\s]+([0-9\/\-]{8,10})/i)?.value,
      validUntil: extract(/valid(?:\.|until|upto)[:\s]+([0-9\/\-]{8,10})/i)?.value,
      vehicleNumber: extract(/vehicle(?:\.|registration|number)[:\s]*((?:cg|od)[0-9]{2}[a-z]{2}[0-9]{4})/i)?.value,
      coverage: extract(/coverage[:\s]+([a-z0-9\s\-,]+)/i)?.value,
      premium: parseFloat(extract(/premium[:\s]*(?:rs\.?|₹)?([0-9,]+)/i)?.value?.replace(/,/g, '') || "0"),
      confidence: 0.8
    };

    const filled = Object.values(result).filter(Boolean).length;

    if (result.policyNumber && filled >= 3) {
      insuranceList.push(result);
    }
  }

  if (insuranceList.length === 0) {
    console.warn("⚠️ Text Did Not Match Expected Insurance Document Patterns");
    return [{
      policyNumber: "OCR_FAILED",
      rawText: text,
      confidence: 0
    }];
  }

  return insuranceList;
}