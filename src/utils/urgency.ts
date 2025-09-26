export type DocKey = "rc" | "insurance" | "permit" | "puc" | "tax" | "fitness";

const WEIGHT: Record<DocKey, number> = {
  rc: 1.0, insurance: 0.9, permit: 0.9, 
  puc: 0.7, tax: 0.6, fitness: 0.6,
};
const MISSING = 1.2;
const EXPIRED = 1.5;

export function daysTo(date?: string | Date | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setHours(0,0,0,0);
  const t = new Date();
  t.setHours(0,0,0,0);
  return Math.round((d.getTime() - t.getTime()) / (1000*60*60*24));
}

export function docScore(key: DocKey, expiry?: string|Date|null, hasDoc: boolean): number {
  if (!hasDoc) return WEIGHT[key] * MISSING;
  const d = daysTo(expiry);
  if (d === null) return WEIGHT[key] * MISSING;
  if (d < 0) return WEIGHT[key] * EXPIRED;
  const near = Math.max(0, Math.min(1, (30 - d) / 30));
  return WEIGHT[key] * near;
}

export function rowUrgency(row: any): { score: number; meta: {expired: number; missing: number; minDTX: number} } {
  const docs: DocKey[] = ["rc","insurance","permit","puc","tax","fitness"];
  let score = 0, expired = 0, missing = 0, minDTX = 9999;
  
  for (const k of docs) {
    const exp = row[`${k}_expiry_date`];
    const urls = row[`${k}_document_url`] as string[] | null | undefined;
    const hasDoc = !!(urls && urls.length);
    const d = daysTo(exp);
    
    if (!hasDoc) missing++;
    if (typeof d === "number") minDTX = Math.min(minDTX, d);
    if (typeof d === "number" && d < 0) expired++;
    score += docScore(k, exp, hasDoc);
  }
  
  score += 0.1 * Math.max(0, missing - 1);
  return { score, meta: { expired, missing, minDTX } };
}
