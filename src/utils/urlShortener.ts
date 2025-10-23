/**
 * URL Shortening Utility for Document Links
 * Creates short, clean URLs that redirect to the actual Supabase signed URLs
 * Now uses Supabase database for persistent storage
 */

import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('URLShortener');

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
export async function createShortUrl(originalUrl: string, expiresInHours: number = 24): Promise<string> {
  const shortId = generateShortId();
  const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)).toISOString();

  try {
    // Store in Supabase database
    const { error } = await supabase
      .from('short_urls')
      .insert({
        short_id: shortId,
        original_url: originalUrl,
        expires_at: expiresAt
      });

    if (error) {
      logger.error('Failed to create short URL:', error);
      // Fallback: return original URL if short URL creation fails
      return originalUrl;
    }

    // Return a short URL that can be handled by your app
    const shortUrl = `${window.location.origin}/doc/${shortId}`;
    logger.debug('Created short URL:', shortUrl);
    return shortUrl;
  } catch (error) {
    logger.error('Error creating short URL:', error);
    return originalUrl; // Fallback to original URL
  }
}

/**
 * Resolve a short URL to its original URL
 * @param shortId The short ID from the URL
 * @returns The original URL or null if not found/expired
 */
export async function resolveShortUrl(shortId: string): Promise<string | null> {
  try {
    // Query database for the short URL
    const { data, error } = await supabase
      .from('short_urls')
      .select('original_url, expires_at, access_count')
      .eq('short_id', shortId)
      .single();

    if (error || !data) {
      logger.debug('Short URL not found:', shortId);
      return null;
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      logger.debug('Short URL expired:', shortId);
      return null;
    }

    // Update access count and last accessed timestamp
    await supabase
      .from('short_urls')
      .update({
        access_count: (data.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('short_id', shortId);

    logger.debug('Resolved short URL:', shortId, '→', data.original_url);
    return data.original_url;
  } catch (error) {
    logger.error('Error resolving short URL:', error);
    return null;
  }
}

/**
 * Create a shareable document link with custom message
 * @param documentType Type of document (RC, Insurance, etc.)
 * @param vehicleNumber Vehicle registration number
 * @param originalUrl The Supabase signed URL
 * @param expiresInHours How long the link should be valid
 * @returns Object with short URL and shareable message
 */
export async function createShareableDocumentLink(
  documentType: string,
  vehicleNumber: string,
  originalUrl: string,
  expiresInHours: number = 24
): Promise<{ shortUrl: string; message: string }> {
  const shortUrl = await createShortUrl(originalUrl, expiresInHours);

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
export async function createWhatsAppShareLink(
  documentType: string,
  vehicleNumber: string,
  originalUrl: string,
  phoneNumber?: string
): Promise<string> {
  const { shortUrl, message } = await createShareableDocumentLink(documentType, vehicleNumber, originalUrl);

  const encodedMessage = encodeURIComponent(message);

  if (phoneNumber) {
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  } else {
    return `https://wa.me/?text=${encodedMessage}`;
  }
}
