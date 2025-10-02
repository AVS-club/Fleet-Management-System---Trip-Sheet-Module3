/**
 * URL Shortening Utility for Document Links
 * Creates short, clean URLs that redirect to the actual Supabase signed URLs
 */

// In-memory store for URL mappings (in production, you'd use a database)
const urlMappings = new Map<string, { originalUrl: string; expiresAt: number }>();

// Clean up expired URLs periodically
setInterval(() => {
  const now = Date.now();
  for (const [shortId, mapping] of urlMappings.entries()) {
    if (mapping.expiresAt < now) {
      urlMappings.delete(shortId);
    }
  }
}, 60000); // Clean up every minute

/**
 * Generate a short ID for URL shortening
 */
function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a shortened URL for a document
 * @param originalUrl The long Supabase signed URL
 * @param expiresInHours How long the short URL should be valid (default: 24 hours)
 * @returns Short URL that redirects to the original
 */
export function createShortUrl(originalUrl: string, expiresInHours: number = 24): string {
  const shortId = generateShortId();
  const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);
  
  urlMappings.set(shortId, {
    originalUrl,
    expiresAt
  });
  
  // Return a short URL that can be handled by your app
  return `${window.location.origin}/doc/${shortId}`;
}

/**
 * Resolve a short URL to its original URL
 * @param shortId The short ID from the URL
 * @returns The original URL or null if not found/expired
 */
export function resolveShortUrl(shortId: string): string | null {
  const mapping = urlMappings.get(shortId);
  
  if (!mapping) {
    return null;
  }
  
  if (mapping.expiresAt < Date.now()) {
    urlMappings.delete(shortId);
    return null;
  }
  
  return mapping.originalUrl;
}

/**
 * Create a shareable document link with custom message
 * @param documentType Type of document (RC, Insurance, etc.)
 * @param vehicleNumber Vehicle registration number
 * @param originalUrl The Supabase signed URL
 * @param expiresInHours How long the link should be valid
 * @returns Object with short URL and shareable message
 */
export function createShareableDocumentLink(
  documentType: string,
  vehicleNumber: string,
  originalUrl: string,
  expiresInHours: number = 24
): { shortUrl: string; message: string } {
  const shortUrl = createShortUrl(originalUrl, expiresInHours);
  
  const message = `📄 ${documentType} Document\n🚗 Vehicle: ${vehicleNumber}\n🔗 Link: ${shortUrl}\n⏰ Valid for ${expiresInHours} hours`;
  
  return { shortUrl, message };
}

/**
 * Create a WhatsApp shareable link
 * @param documentType Type of document
 * @param vehicleNumber Vehicle registration number
 * @param originalUrl The Supabase signed URL
 * @param phoneNumber Optional phone number to send to specific contact
 * @returns WhatsApp URL with pre-filled message
 */
export function createWhatsAppShareLink(
  documentType: string,
  vehicleNumber: string,
  originalUrl: string,
  phoneNumber?: string
): string {
  const { shortUrl, message } = createShareableDocumentLink(documentType, vehicleNumber, originalUrl);
  
  const encodedMessage = encodeURIComponent(message);
  
  if (phoneNumber) {
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  } else {
    return `https://wa.me/?text=${encodedMessage}`;
  }
}
