import { jsPDF } from 'jspdf';

import interFontUrl from '@/assets/fonts/Inter-Variable.ttf?url';
import plusJakartaFontUrl from '@/assets/fonts/PlusJakartaSans-Variable.ttf?url';

export type RgbTuple = [number, number, number];

export const hexToRgb = (hex: string): RgbTuple => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255,
  ];
};

export const blendRgb = (start: RgbTuple, end: RgbTuple, ratio: number): RgbTuple => {
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  return [
    clamp(start[0] + (end[0] - start[0]) * ratio),
    clamp(start[1] + (end[1] - start[1]) * ratio),
    clamp(start[2] + (end[2] - start[2]) * ratio),
  ];
};

export const pdfTheme = {
  brand: {
    name: 'Auto Vital Solution',
    tagline: 'Intelligent Fleet Management',
    headerGradient: {
      start: hexToRgb('#16A34A') as RgbTuple,
      end: hexToRgb('#34D399') as RgbTuple,
    },
    accent: hexToRgb('#10B981') as RgbTuple,
    footer: hexToRgb('#0F172A') as RgbTuple,
  },
  colors: {
    text: hexToRgb('#1F2937') as RgbTuple,
    muted: hexToRgb('#6B7280') as RgbTuple,
    subtle: hexToRgb('#94A3B8') as RgbTuple,
    inverse: [255, 255, 255] as RgbTuple,
    background: hexToRgb('#FFFFFF') as RgbTuple,
    surface: hexToRgb('#F9FAFB') as RgbTuple,
    surfaceMuted: hexToRgb('#F1F5F9') as RgbTuple,
    border: hexToRgb('#E2E8F0') as RgbTuple,
    kpi: {
      revenue: hexToRgb('#16A34A') as RgbTuple,
      trips: hexToRgb('#3B82F6') as RgbTuple,
      vehicles: hexToRgb('#F59E0B') as RgbTuple,
      drivers: hexToRgb('#8B5CF6') as RgbTuple,
    },
  },
  typography: {
    display: {
      family: 'PlusJakartaSans',
      sizes: {
        title: 28,
        h2: 18,
        h3: 16,
        kpiValue: 18,
      },
    },
    body: {
      family: 'InterVariable',
      sizes: {
        h1: 18,
        h2: 14,
        h3: 12,
        body: 11,
        small: 9,
        tiny: 8,
      },
    },
    weights: {
      normal: 'normal',
      medium: 'medium',
      semibold: 'bold',
      bold: 'bold',
    } as const,
  },
  layout: {
    page: {
      margin: 24,
      gutter: 12,
    },
    sections: {
      gap: 24,
    },
    cards: {
      padding: 14,
      radius: 6,
    },
    table: {
      headerFill: hexToRgb('#F8FAFC') as RgbTuple,
      zebraFill: hexToRgb('#EFF6FF') as RgbTuple,
      border: hexToRgb('#E2E8F0') as RgbTuple,
    },
  },
} as const;

type FontBucket = 'body' | 'display';

const fontCache: Record<FontBucket, { base64: string | null; promise: Promise<string> | null }> = {
  body: { base64: null, promise: null },
  display: { base64: null, promise: null },
};

const loadFontBase64 = async (bucket: FontBucket): Promise<string> => {
  const entry = fontCache[bucket];
  if (entry.base64) return entry.base64;

  if (!entry.promise) {
    const url = bucket === 'body' ? interFontUrl : plusJakartaFontUrl;
    entry.promise = fetch(url).then(async (res) => {
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    });
  }

  entry.base64 = await entry.promise;
  return entry.base64;
};

const ensureFont = async (doc: jsPDF, bucket: FontBucket) => {
  const family = bucket === 'body' ? pdfTheme.typography.body.family : pdfTheme.typography.display.family;
  const fontList = doc.getFontList?.() ?? {};
  if (!fontList[family]) {
    const base64 = await loadFontBase64(bucket);
    const fileName = bucket === 'body' ? 'Inter-Variable.ttf' : 'PlusJakartaSans-Variable.ttf';
    doc.addFileToVFS(fileName, base64);
    doc.addFont(fileName, family, 'normal');
    doc.addFont(fileName, family, 'bold');
  }
  doc.setFont(family, 'normal');
};

export type FontOptions = {
  family?: FontBucket;
  size?: number;
  weight?: keyof typeof pdfTheme.typography.weights;
  color?: RgbTuple;
};

export const setFont = async (doc: jsPDF, options: FontOptions = {}) => {
  const {
    family = 'body',
    size = family === 'display' ? pdfTheme.typography.display.sizes.h3 : pdfTheme.typography.body.sizes.body,
    weight = 'normal',
    color = pdfTheme.colors.text,
  } = options;

  await ensureFont(doc, family);
  const familyName = family === 'body' ? pdfTheme.typography.body.family : pdfTheme.typography.display.family;
  doc.setFont(familyName, pdfTheme.typography.weights[weight]);
  doc.setFontSize(size);
  doc.setTextColor(...color);
};
