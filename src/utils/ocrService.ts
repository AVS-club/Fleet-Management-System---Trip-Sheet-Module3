import { RCDetails } from '../types';

// Custom error classes for better error handling
class DocumentAIError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'DocumentAIError';
  }
}

class AuthenticationError extends DocumentAIError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

class ProcessingError extends DocumentAIError {
  constructor(message: string, details?: any) {
    super(message, 'PROCESSING_ERROR', details);
    this.name = 'ProcessingError';
  }
}

class ValidationError extends DocumentAIError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

interface DocumentAIResponse {
  document: {
    text: string;
    pages: Array<{
      formFields: Array<{
        fieldName: {
          textAnchor: {
            content: string;
          };
        };
        fieldValue: {
          textAnchor: {
            content: string;
          };
        };
      }>;
    }>;
  };
}

export async function processRCDocument(file: File): Promise<RCDetails> {
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
      throw new AuthenticationError(
        'Failed to authenticate with Document AI service',
        error instanceof Error ? error.message : 'Unknown authentication error'
      );
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_DOCUMENT_AI_ENDPOINT}/projects/${import.meta.env.VITE_PROJECT_ID}/locations/${import.meta.env.VITE_LOCATION}/processors/${import.meta.env.VITE_RC_PROCESSOR_ID}:process`,
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
      const errorData = await response.json();
      throw new ProcessingError(
        'Failed to process document',
        {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error
        }
      );
    }

    const data: DocumentAIResponse = await response.json();
    return parseDocumentAIResponse(data);
  } catch (error) {
    if (error instanceof DocumentAIError) {
      throw error;
    }
    throw new ProcessingError(
      'An unexpected error occurred while processing the document',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

function validateFile(file: File): void {
  // Check file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(
      'File size exceeds the maximum limit of 10MB',
      { size: file.size, maxSize: MAX_FILE_SIZE }
    );
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(
      'Invalid file type. Please upload a JPEG, PNG, or PDF file',
      { type: file.type, allowedTypes }
    );
  }
}

function parseDocumentAIResponse(response: DocumentAIResponse): RCDetails {
  try {
    const formFields = response.document.pages[0]?.formFields || [];
    const fieldMap = new Map<string, string>();

    formFields.forEach(field => {
      const name = field.fieldName.textAnchor.content.toLowerCase();
      const value = field.fieldValue.textAnchor.content;
      fieldMap.set(name, value);
    });

    const result: RCDetails = {
      registrationNumber: findField(fieldMap, ['registration no', 'regn no', 'registration number']),
      chassisNumber: findField(fieldMap, ['chassis no', 'chassis number']),
      engineNumber: findField(fieldMap, ['engine no', 'engine number']),
      make: findField(fieldMap, ['make', 'manufacturer']),
      model: findField(fieldMap, ['model', 'vehicle model']),
      fuelType: findField(fieldMap, ['fuel', 'fuel type']),
      manufactureDate: findField(fieldMap, ['manufacture date', 'mfg date']),
      seatingCapacity: parseInt(findField(fieldMap, ['seating capacity', 'seats']) || '0'),
      wheelBase: findField(fieldMap, ['wheel base', 'wheelbase']),
      axleCount: parseInt(findField(fieldMap, ['no of axles', 'axle count']) || '0'),
      bodyType: findField(fieldMap, ['body type', 'vehicle class']),
      color: findField(fieldMap, ['color', 'colour']),
      ownerName: findField(fieldMap, ['owner name', 'owners name']),
      confidence: 0.9,
      rawText: response.document.text
    };

    // Validate required fields
    const missingFields = [];
    if (!result.registrationNumber) missingFields.push('Registration Number');
    if (!result.chassisNumber) missingFields.push('Chassis Number');
    if (!result.engineNumber) missingFields.push('Engine Number');

    if (missingFields.length > 0) {
      throw new ValidationError(
        'Required fields missing in document',
        { missingFields }
      );
    }

    return result;
  } catch (error) {
    if (error instanceof DocumentAIError) {
      throw error;
    }
    throw new ProcessingError(
      'Failed to parse document response',
      error instanceof Error ? error.message : 'Unknown parsing error'
    );
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

export function extractRCDetails(text: string): RCDetails[] {
  if (!text || typeof text !== "string") {
    throw new Error("No text provided.");
  }

  const cleanedText = text.replace(/\s+/g, " ").toLowerCase();

  const chunks = cleanedText
    .split(/regn(?:\.|istration)? number[:\s]*/i)
    .map(c => "regn number " + c.trim())
    .filter(c => c.length > 50);

  const rcList: RCDetails[] = [];

  for (const chunk of chunks) {
    const extract = (regex: RegExp) => {
      const match = chunk.match(regex);
      return match ? { value: match[1].trim(), confidence: 0.8 } : undefined;
    };

    const result: RCDetails = {
      registrationNumber: extract(/(od|cg)[0-9]{2}[a-z]{2}[0-9]{4}/i)?.value,
      chassisNumber: extract(/ch(?:\.|assis)?\s*(?:no)?[:\s]*([a-z0-9\-\/]+)/i)?.value,
      engineNumber: extract(/engine(?: no)?[:\s]*([a-z0-9\-\/]+)/i)?.value,
      make: extract(/make[:\s]+([a-z0-9\s&\-]+)/i)?.value,
      model: extract(/model(?: name)?[:\s]+([a-z0-9\s\-]+)/i)?.value,
      fuelType: extract(/fuel(?: used)?[:\s]+([a-z]+)/i)?.value,
      manufactureDate: extract(/mfg(?:\.|\s)?(?: date)?[:\s]+([0-9\/\-]{4,7})/i)?.value,
      seatingCapacity: parseInt(extract(/seating\s+cap(?:\.|\s)?[:\s]+(\d+)/i)?.value || "0"),
      wheelBase: extract(/wheel\s+base(?:\(mm\))?[:\s]+([0-9]+)/i)?.value,
      axleCount: parseInt(extract(/no\.?\s+of\s+axle[:\s]+(\d+)/i)?.value || "0"),
      bodyType: extract(/body\s+type[:\s]+([a-z\s]+)/i)?.value,
      color: extract(/colou?r[:\s]+([a-z\s\-]+)/i)?.value,
      ownerName: extract(/name[:\s]+([a-z\s]+)/i)?.value,
      confidence: 0.8
    };

    const filled = Object.values(result).filter(Boolean).length;

    if (result.registrationNumber && filled >= 3) {
      rcList.push(result);
    }
  }

  if (rcList.length === 0) {
    console.warn("⚠️ Text Did Not Match Expected Patterns");
    console.log("🔍 RAW TEXT:", text);
    return [{
      registrationNumber: "OCR_FAILED",
      rawText: text,
      confidence: 0
    }];
  }

  return rcList;
}