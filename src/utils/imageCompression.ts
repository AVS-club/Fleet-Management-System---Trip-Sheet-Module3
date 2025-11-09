import { createLogger } from './logger';

const logger = createLogger('imageCompression');

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number;
  targetType?: string;
  minSizeThreshold?: number; // Only compress if file is larger than this (in bytes)
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  quality: 0.8,
  targetType: 'image/jpeg',
  minSizeThreshold: 1024 * 1024, // 1MB
};

/**
 * Compresses an image file for upload
 * CRASH-PROOF: Prevents main thread blocking by using async image processing
 *
 * @param file - The file to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed file
 */
export const compressImageForUpload = (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  return new Promise((resolve) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Only compress if it's an image and larger than threshold
    if (!file.type.startsWith('image/') || file.size <= opts.minSizeThreshold) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          logger.warn('Failed to get canvas context, returning original file');
          resolve(file);
          return;
        }

        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > opts.maxWidth) {
          height = (height * opts.maxWidth) / width;
          width = opts.maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: opts.targetType,
                lastModified: Date.now(),
              });

              logger.debug(
                `📸 Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(
                  compressedFile.size / 1024
                ).toFixed(2)}KB (${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% reduction)`
              );

              resolve(compressedFile);
            } else {
              logger.warn('Blob creation failed, returning original file');
              resolve(file);
            }
          },
          opts.targetType,
          opts.quality
        );
      };

      img.onerror = () => {
        logger.error('Image load error, returning original file');
        resolve(file);
      };
    };

    reader.onerror = () => {
      logger.error('FileReader error, returning original file');
      resolve(file);
    };
  });
};

/**
 * Compresses multiple images in batch
 *
 * @param files - Array of files to compress
 * @param options - Compression options
 * @returns Promise resolving to array of compressed files
 */
export const compressBatch = async (
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> => {
  logger.debug(`Compressing batch of ${files.length} files`);
  const startTime = performance.now();

  const compressed = await Promise.all(
    files.map((file) => compressImageForUpload(file, options))
  );

  const duration = performance.now() - startTime;
  const totalOriginalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalCompressedSize = compressed.reduce((sum, f) => sum + f.size, 0);

  logger.debug(
    `Batch compression complete in ${duration.toFixed(2)}ms: ${(
      totalOriginalSize / 1024
    ).toFixed(2)}KB → ${(totalCompressedSize / 1024).toFixed(2)}KB`
  );

  return compressed;
};

/**
 * Checks if a file is an image
 *
 * @param file - File to check
 * @returns true if file is an image
 */
export const isImage = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Gets the estimated compression ratio for a file
 *
 * @param file - File to estimate compression for
 * @param options - Compression options
 * @returns Estimated compression ratio (0-1)
 */
export const estimateCompressionRatio = (
  file: File,
  options: CompressionOptions = {}
): number => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!isImage(file) || file.size <= opts.minSizeThreshold) {
    return 1; // No compression
  }

  // Rough estimate based on quality setting
  return opts.quality * 0.6; // Typically get ~60% of quality setting as ratio
};
