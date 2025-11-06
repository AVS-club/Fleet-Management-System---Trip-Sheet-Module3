import { format } from 'date-fns';
import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';

import { blendRgb, pdfTheme, setFont } from './pdfTheme';

export interface ReportHeaderOptions {
  title: string;
  subtitle?: string;
  generatedAt?: Date;
  period?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface MetricCard {
  label: string;
  value: string;
  helperText?: string;
  color: [number, number, number];
  icon?: string;
}

const drawGradientRect = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  start: [number, number, number],
  end: [number, number, number],
  steps = 40,
) => {
  const stepHeight = height / steps;
  for (let i = 0; i < steps; i += 1) {
    const ratio = i / (steps - 1);
    const color = blendRgb(start, end, ratio);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y + i * stepHeight, width, stepHeight + 0.5, 'F');
  }
};

export const initializeReport = async (doc: jsPDF, options: ReportHeaderOptions): Promise<number> => {
  const margin = pdfTheme.layout.page.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = options.generatedAt ?? new Date();

  // Gradient header
  const headerHeight = 56;
  drawGradientRect(
    doc,
    0,
    0,
    pageWidth,
    headerHeight,
    pdfTheme.brand.headerGradient.start,
    pdfTheme.brand.headerGradient.end,
  );

  await setFont(doc, {
    family: 'display',
    size: pdfTheme.typography.display.sizes.title,
    weight: 'bold',
    color: pdfTheme.colors.inverse,
  });
  doc.text(pdfTheme.brand.name, margin, 26);

  await setFont(doc, {
    family: 'display',
    size: 14,
    weight: 'medium',
    color: pdfTheme.colors.inverse,
  });
  doc.text(pdfTheme.brand.tagline, margin, 38);

  await setFont(doc, {
    family: 'body',
    size: pdfTheme.typography.body.sizes.small,
    weight: 'normal',
    color: pdfTheme.colors.inverse,
  });
  doc.text(`Generated ${format(generatedAt, 'dd MMM yyyy, HH:mm')}`, pageWidth - margin, 32, { align: 'right' });

  // Metadata card
  const cardY = headerHeight + 12;
  doc.setFillColor(...pdfTheme.colors.surface);
  doc.setDrawColor(...pdfTheme.colors.border);
  doc.roundedRect(margin, cardY, contentWidth, 38, pdfTheme.layout.cards.radius, pdfTheme.layout.cards.radius, 'FD');

  await setFont(doc, {
    family: 'display',
    size: pdfTheme.typography.display.sizes.h2,
    weight: 'semibold',
    color: pdfTheme.colors.text,
  });
  doc.text(options.title, margin + 12, cardY + 16);

  if (options.subtitle) {
    await setFont(doc, {
      family: 'body',
      size: pdfTheme.typography.body.sizes.body,
      color: pdfTheme.colors.muted,
    });
    doc.text(options.subtitle, margin + 12, cardY + 24);
  }

  if (options.period) {
    await setFont(doc, {
      family: 'body',
      size: pdfTheme.typography.body.sizes.small,
      color: pdfTheme.colors.subtle,
    });
    doc.text(
      `Period: ${format(options.period.startDate, 'dd MMM yyyy')} – ${format(options.period.endDate, 'dd MMM yyyy')}`,
      margin + 12,
      cardY + 32,
    );
  }

  const metaRightY = cardY + 20;
  await setFont(doc, {
    family: 'body',
    size: pdfTheme.typography.body.sizes.small,
    color: pdfTheme.colors.muted,
  });
  doc.text('Downloaded via AVS Intelligence Suite', pageWidth - margin - 12, metaRightY, { align: 'right' });

  return cardY + 38 + pdfTheme.layout.sections.gap;
};

export const renderMetricGrid = async (doc: jsPDF, metrics: MetricCard[], startY: number): Promise<number> => {
  const margin = pdfTheme.layout.page.margin;
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const columns = Math.min(4, metrics.length);
  const gap = 10;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cardHeight = 42;

  for (let index = 0; index < metrics.length; index++) {
    const metric = metrics[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);

    doc.setFillColor(...pdfTheme.colors.background);
    doc.setDrawColor(...pdfTheme.colors.border);
    doc.roundedRect(x, y, cardWidth, cardHeight, 5, 5, 'FD');

    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.roundedRect(x, y, 4, cardHeight, 3, 3, 'F');

    if (metric.icon) {
      await setFont(doc, {
        family: 'display',
        size: 12,
        color: metric.color,
      });
      doc.text(metric.icon, x + 8, y + 13);
    }

    await setFont(doc, {
      family: 'display',
      size: pdfTheme.typography.display.sizes.kpiValue,
      weight: 'bold',
      color: metric.color,
    });
    doc.text(metric.value, x + cardWidth / 2, y + 19, { align: 'center' });

    await setFont(doc, {
      family: 'body',
      size: pdfTheme.typography.body.sizes.small,
      color: pdfTheme.colors.muted,
      weight: 'medium',
    });
    doc.text(metric.label, x + cardWidth / 2, y + 28, { align: 'center' });

    if (metric.helperText) {
      await setFont(doc, {
        family: 'body',
        size: pdfTheme.typography.body.sizes.tiny,
        color: pdfTheme.colors.subtle,
      });
      doc.text(metric.helperText, x + cardWidth / 2, y + 34, { align: 'center' });
    }
  }

  const rows = Math.ceil(metrics.length / columns);
  return startY + rows * (cardHeight + gap);
};

export const renderSectionHeading = async (doc: jsPDF, label: string, startY: number): Promise<number> => {
  const margin = pdfTheme.layout.page.margin;
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const barHeight = 12;

  doc.setFillColor(...pdfTheme.colors.surfaceMuted);
  doc.roundedRect(margin, startY, contentWidth, barHeight, 4, 4, 'F');

  await setFont(doc, {
    family: 'display',
    size: pdfTheme.typography.display.sizes.h2,
    weight: 'semibold',
    color: pdfTheme.brand.accent,
  });
  doc.text(label, margin + 8, startY + 8);

  return startY + barHeight + 10;
};

export const renderParagraph = async (
  doc: jsPDF,
  text: string | string[],
  startY: number,
  options: { lineHeight?: number; color?: [number, number, number] } = {},
): Promise<number> => {
  const margin = pdfTheme.layout.page.margin;
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const lines = Array.isArray(text) ? text : [text];
  const lineHeight = options.lineHeight ?? 6;

  await setFont(doc, {
    family: 'body',
    size: pdfTheme.typography.body.sizes.body,
    color: options.color ?? pdfTheme.colors.text,
  });

  let cursor = startY;
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    wrapped.forEach((wrappedLine) => {
      doc.text(wrappedLine, margin, cursor);
      cursor += lineHeight;
    });
  });

  return cursor;
};

export const renderCallout = async (doc: jsPDF, content: string[], startY: number): Promise<number> => {
  const margin = pdfTheme.layout.page.margin;
  const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const padding = pdfTheme.layout.cards.padding;
  const heightEstimate = padding * 2 + content.length * 6;

  doc.setFillColor(...pdfTheme.colors.surfaceMuted);
  doc.setDrawColor(...pdfTheme.colors.border);
  doc.roundedRect(margin, startY, contentWidth, heightEstimate, pdfTheme.layout.cards.radius, pdfTheme.layout.cards.radius, 'FD');

  return renderParagraph(doc, content, startY + padding + 2, {
    color: pdfTheme.colors.muted,
  });
};

export const renderTable = async (doc: jsPDF, options: UserOptions) => {
  await setFont(doc, { family: 'body' });
  const margin = pdfTheme.layout.page.margin;

  doc.autoTable({
    styles: {
      font: pdfTheme.typography.body.family,
      fontSize: pdfTheme.typography.body.sizes.small,
      textColor: pdfTheme.colors.text,
      lineColor: pdfTheme.layout.table.border,
      lineWidth: 0.1,
      cellPadding: 3.5,
    },
    headStyles: {
      fillColor: pdfTheme.brand.accent,
      textColor: pdfTheme.colors.inverse,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: pdfTheme.layout.table.zebraFill,
    },
    tableLineColor: pdfTheme.layout.table.border,
    margin: { left: margin, right: margin },
    ...options,
  });
};

export const renderFooter = async (doc: jsPDF) => {
  const pageCount = doc.internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = pdfTheme.layout.page.margin;

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFillColor(...pdfTheme.brand.accent);
    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');

    await setFont(doc, {
      family: 'body',
      size: pdfTheme.typography.body.sizes.tiny,
      color: pdfTheme.colors.inverse,
    });
    doc.text(`Page ${page} of ${pageCount}`, margin, pageHeight - 6);
    doc.text(
      `${pdfTheme.brand.name} • ${pdfTheme.brand.tagline}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' },
    );
  }
};
