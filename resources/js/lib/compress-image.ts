export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export interface CompressedResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  isImage: boolean;
  previewUrl: string;
}

/**
 * Format bytes into human-readable string (KB, MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(0) + ' KB';
  }
  return bytes + ' B';
}

/**
 * Compress an image file using browser Canvas.
 * Non-image files (e.g. PDF) are passed through without modification.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressedResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    mimeType = 'image/webp',
  } = options;

  const originalSize = file.size;

  // Non-image files (e.g. PDF, documents) skip compression
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savedPercent: 0,
      isImage: false,
      previewUrl: '',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale maintaining aspect ratio if bounds exceeded
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Canvas unsupported fallback
          resolve({
            file,
            originalSize,
            compressedSize: originalSize,
            savedPercent: 0,
            isImage: true,
            previewUrl: URL.createObjectURL(file),
          });
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        const tryExport = (targetMime: string, fallbackMime?: string) => {
          canvas.toBlob(
            (blob) => {
              if (!blob && fallbackMime) {
                tryExport(fallbackMime);
                return;
              }

              if (!blob) {
                resolve({
                  file,
                  originalSize,
                  compressedSize: originalSize,
                  savedPercent: 0,
                  isImage: true,
                  previewUrl: URL.createObjectURL(file),
                });
                return;
              }

              // Determine extension
              const ext = targetMime === 'image/webp' ? '.webp' : '.jpg';
              const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
              const newFileName = `${nameWithoutExt}${ext}`;

              // If compressed is unexpectedly larger than original, keep original
              const finalBlob = blob.size < originalSize ? blob : file;
              const compressedFile = new File([finalBlob], newFileName, {
                type: finalBlob.type || targetMime,
                lastModified: Date.now(),
              });

              const compressedSize = compressedFile.size;
              const savedPercent =
                originalSize > compressedSize
                  ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
                  : 0;

              resolve({
                file: compressedFile,
                originalSize,
                compressedSize,
                savedPercent,
                isImage: true,
                previewUrl: URL.createObjectURL(compressedFile),
              });
            },
            targetMime,
            quality
          );
        };

        tryExport(mimeType, 'image/jpeg');
      };

      img.onerror = () => {
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          savedPercent: 0,
          isImage: true,
          previewUrl: '',
        });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        file,
        originalSize,
        compressedSize: originalSize,
        savedPercent: 0,
        isImage: true,
        previewUrl: '',
      });
    };

    reader.readAsDataURL(file);
  });
}
