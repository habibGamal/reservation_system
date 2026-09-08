<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentCompressionService
{
    /**
     * Supported image MIME types for GD compression.
     *
     * @var list<string>
     */
    protected array $imageMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/avif',
    ];

    /**
     * Compress an uploaded file before storing it on the public storage disk.
     *
     * @return array{
     *     id: string,
     *     file_name: string,
     *     file_path: string,
     *     mime_type: string,
     *     file_size: int,
     *     created_at: string
     * }
     */
    public function compressAndStore(UploadedFile $file, int|string $reservationId): array
    {
        $id = (string) Str::uuid();
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';

        if ($this->isImage($mimeType) && function_exists('imagecreatefromstring')) {
            $compressed = $this->compressImage($file);

            if ($compressed !== null) {
                $targetFileName = "{$id}.webp";
                $targetPath = "reservations/{$reservationId}/{$targetFileName}";

                Storage::disk('public')->put($targetPath, $compressed['data']);

                return [
                    'id' => $id,
                    'file_name' => $originalName,
                    'file_path' => $targetPath,
                    'mime_type' => 'image/webp',
                    'file_size' => $compressed['size'],
                    'created_at' => now()->toDateTimeString(),
                ];
            }
        }

        // Fallback for documents (e.g. PDF) or unsupported/corrupt image formats
        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $targetFileName = "{$id}.{$extension}";
        $targetPath = "reservations/{$reservationId}/{$targetFileName}";

        Storage::disk('public')->putFileAs("reservations/{$reservationId}", $file, $targetFileName);

        return [
            'id' => $id,
            'file_name' => $originalName,
            'file_path' => $targetPath,
            'mime_type' => $mimeType,
            'file_size' => $file->getSize() ?: 0,
            'created_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Compress an image using PHP's GD extension.
     * Auto-orients mobile photos, scales down large dimensions (max 1920px),
     * and encodes to WebP format at 80% quality.
     *
     * @return array{data: string, size: int}|null
     */
    protected function compressImage(UploadedFile $file): ?array
    {
        try {
            $rawContent = file_get_contents($file->getRealPath());
            if ($rawContent === false) {
                return null;
            }

            $image = @imagecreatefromstring($rawContent);
            if (! $image) {
                return null;
            }

            // Correct EXIF orientation for mobile camera photos
            if (function_exists('exif_read_data')) {
                $exif = @exif_read_data($file->getRealPath());
                if (! empty($exif['Orientation'])) {
                    switch ($exif['Orientation']) {
                        case 3:
                            $rotated = imagerotate($image, 180, 0);
                            imagedestroy($image);
                            $image = $rotated;
                            break;
                        case 6:
                            $rotated = imagerotate($image, -90, 0);
                            imagedestroy($image);
                            $image = $rotated;
                            break;
                        case 8:
                            $rotated = imagerotate($image, 90, 0);
                            imagedestroy($image);
                            $image = $rotated;
                            break;
                    }
                }
            }

            // Downscale if width or height exceeds 1920 pixels
            $origWidth = imagesx($image);
            $origHeight = imagesy($image);
            $maxDimension = 1920;

            if ($origWidth > $maxDimension || $origHeight > $maxDimension) {
                $scale = min($maxDimension / $origWidth, $maxDimension / $origHeight);
                $targetWidth = (int) round($origWidth * $scale);
                $targetHeight = (int) round($origHeight * $scale);

                $resized = imagecreatetruecolor($targetWidth, $targetHeight);
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $origWidth, $origHeight);
                imagedestroy($image);
                $image = $resized;
            }

            // Encode to WebP buffer
            ob_start();
            if (function_exists('imagewebp')) {
                imagewebp($image, null, 80);
            } else {
                imagejpeg($image, null, 80);
            }
            $compressedData = ob_get_clean();
            imagedestroy($image);

            if ($compressedData === false || $compressedData === '') {
                return null;
            }

            return [
                'data' => $compressedData,
                'size' => strlen($compressedData),
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Delete a stored file from disk.
     */
    public function deleteFile(?string $filePath): void
    {
        if ($filePath && Storage::disk('public')->exists($filePath)) {
            Storage::disk('public')->delete($filePath);
        }
    }

    /**
     * Check if the MIME type represents an image.
     */
    public function isImage(string $mimeType): bool
    {
        return in_array(strtolower($mimeType), $this->imageMimeTypes, true);
    }

    /**
     * Format an attachment item with calculated fields (URL, human size, is_image).
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    public static function formatWithMeta(array $item): array
    {
        $filePath = $item['file_path'] ?? '';
        $mimeType = $item['mime_type'] ?? '';
        $bytes = (int) ($item['file_size'] ?? 0);

        if ($bytes >= 1048576) {
            $humanSize = round($bytes / 1048576, 1).' MB';
        } elseif ($bytes >= 1024) {
            $humanSize = round($bytes / 1024, 1).' KB';
        } else {
            $humanSize = "{$bytes} B";
        }

        $isImage = str_starts_with($mimeType, 'image/');

        return array_merge($item, [
            'url' => $filePath ? asset('storage/'.$filePath) : '',
            'human_size' => $humanSize,
            'is_image' => $isImage,
        ]);
    }
}
