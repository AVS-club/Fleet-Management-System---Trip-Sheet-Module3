/**
 * Urgency scoring system for vehicle document management
 * Updated weights based on operational priorities
 */

export type DocKey = "rc" | "insurance" | "permit" | "puc" | "tax" | "fitness";

/**
 * Document weights based on operational importance
 * Higher weight = more critical for operations
 * 
 * Priority Tiers:
 * - Critical (0.95-1.0): RC, Insurance
 * - High (0.80-0.94): Fitness, Permit  
 * - Medium (0.70-0.79): Tax
 * - Low (0.0-0.69): PUC
 */
const WEIGHT: Record<DocKey, number> = {
  rc: 1.00,        // Registration Certificate - vehicle identity (CRITICAL)
  insurance: 0.95,  // Insurance - legal requirement, liability protection (CRITICAL)
  fitness: 0.85,    // Fitness Certificate - safety compliance (HIGH)
  permit: 0.85,     // Permit - operational authorization (HIGH)
  tax: 0.75,        // Road Tax - government compliance (MEDIUM)
  puc: 0.30,        // Pollution Under Control - environmental (LOW)
};

// Penalties remain the same for consistency
const MISSING = 1.2;  // Penalty for missing documents
const EXPIRED = 1.5;  // Penalty for expired documents (worse than missing)

/**
 * Calculate days until a given date
 * @returns Number of days (negative if past), or null if no date
 */
export function daysTo(date?: string | Date | null): number | null {
  if (!date) return null;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  // Normalize to start of day for consistent calculations
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate urgency score for a single document
 * Higher score = more urgent attention needed
 */
export function docScore(
  key: DocKey,
  expiry?: string | Date | null,
  hasDoc: boolean
): number {
  if (!hasDoc) {
    return WEIGHT[key] * MISSING;
  }
  
  const d = daysTo(expiry);
  
  if (d === null) {
    return WEIGHT[key] * MISSING;
  }
  
  if (d < 0) {
    return WEIGHT[key] * EXPIRED;
  }
  
  // Linear scale: 30 days out = 0, today = 1
  const nearness = Math.max(0, Math.min(1, (30 - d) / 30));
  return WEIGHT[key] * nearness;
}

export interface UrgencyResult {
  score: number;
  meta: {
    expired: number;      // Count of expired documents
    missing: number;      // Count of missing documents
    minDTX: number;       // Minimum days to expiry (for tie-breaking)
    expiringSoon: number; // Count expiring within 30 days
    criticalIssues: number; // Issues with RC/Insurance (new!)
  };
}

/**
 * Calculate overall urgency score for a vehicle row
 * Considers all documents with adjusted weights
 */
export function rowUrgency(row: any): UrgencyResult {
  const docs: DocKey[] = ["rc", "insurance", "permit", "puc", "tax", "fitness"];
  const criticalDocs: DocKey[] = ["rc", "insurance"];
  
  let score = 0;
  let expired = 0;
  let missing = 0;
  let expiringSoon = 0;
  let criticalIssues = 0;
  let minDTX = 9999;
  
  for (const docKey of docs) {
    const expiryField = `${docKey}_expiry_date`;
    const urlField = `${docKey}_document_url`;
    
    const expiry = row[expiryField];
    const urls = row[urlField] as string[] | null | undefined;
    const hasDoc = !!(urls && urls.length && urls[0]);
    
    const daysLeft = daysTo(expiry);
    
    // Track metrics
    if (!hasDoc) {
      missing++;
      if (criticalDocs.includes(docKey)) {
        criticalIssues++;
      }
    }
    
    if (typeof daysLeft === "number") {
      minDTX = Math.min(minDTX, daysLeft);
      
      if (daysLeft < 0) {
        expired++;
        if (criticalDocs.includes(docKey)) {
          criticalIssues++;
        }
      } else if (daysLeft <= 30) {
        expiringSoon++;
      }
    }
    
    // Add to score
    score += docScore(docKey, expiry, hasDoc);
  }
  
  // Bonus penalty for multiple missing documents (compounds problems)
  const k = 0.1;
  score += k * Math.max(0, missing - 1);
  
  // Extra penalty for critical document issues (RC/Insurance)
  if (criticalIssues > 0) {
    score += criticalIssues * 0.2;
  }
  
  return {
    score,
    meta: {
      expired,
      missing,
      minDTX: minDTX === 9999 ? -1 : minDTX,
      expiringSoon,
      criticalIssues
    }
  };
}

/**
 * Calculate legal priority score
 * Updated to reflect new weight priorities
 */
export function legalPriorityScore(row: any): number {
  // Focus on legally critical documents
  const priorityDocs: DocKey[] = ["rc", "insurance", "fitness", "permit"];
  let score = 0;
  
  for (const docKey of priorityDocs) {
    const expiry = row[`${docKey}_expiry_date`];
    const urls = row[`${docKey}_document_url`] as string[] | null;
    const hasDoc = !!(urls && urls.length && urls[0]);
    
    score += docScore(docKey, expiry, hasDoc);
  }
  
  return score;
}
