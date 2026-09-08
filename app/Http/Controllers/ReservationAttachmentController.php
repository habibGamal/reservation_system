<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReservationAttachmentController extends Controller
{
    /**
     * View or download an attachment belonging to a reservation.
     */
    public function show(Request $request, Reservation $reservation, string $attachmentId): StreamedResponse
    {
        $user = $request->user();
        $reservation->loadMissing('unit.sector');

        if ($reservation->unit && ! $user->canViewSector($reservation->unit->sector_id)) {
            abort(403, 'غير مصرح لك باستعراض مرفقات هذا الحجز');
        }

        $attachments = $reservation->attachments ?? [];
        $attachment = null;

        foreach ($attachments as $att) {
            if (($att['id'] ?? '') === $attachmentId) {
                $attachment = $att;
                break;
            }
        }

        if (! $attachment) {
            abort(404, 'المرفق المطلوب غير موجود');
        }

        $filePath = $attachment['file_path'] ?? '';
        if (! $filePath || ! Storage::disk('public')->exists($filePath)) {
            abort(404, 'الملف غير متوفر على وحدة التخزين');
        }

        $fileName = $attachment['file_name'] ?? basename($filePath);

        if ($request->boolean('download')) {
            return Storage::disk('public')->download($filePath, $fileName);
        }

        return Storage::disk('public')->response($filePath, $fileName, [
            'Content-Disposition' => 'inline; filename="'.rawurlencode($fileName).'"',
        ]);
    }
}
