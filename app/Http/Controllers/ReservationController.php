<?php

namespace App\Http\Controllers;

use App\Enums\MembershipType;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Http\Requests\StoreReservationRequest;
use App\Http\Requests\UpdateReservationRequest;
use App\Models\Guest;
use App\Models\Payment;
use App\Models\PriceRule;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Notifications\ReservationNotification;
use App\Services\AttachmentCompressionService;
use App\Services\PricingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReservationController extends Controller
{
    /**
     * Display a listing of reservations and the multi-perspective dashboard.
     */
    public function index(Request $request): Response
    {
        $view = $request->input('view', 'matrix');
        $search = $request->input('search');
        $statuses = $this->parseMultiFilter($request->input('status') ?? $request->input('statuses'));
        $rawSectorIds = $this->parseMultiFilter($request->input('sector_id') ?? $request->input('sector_ids'));
        $sectorIds = array_values(array_unique(array_filter(array_map('intval', $rawSectorIds), fn ($id) => $id > 0)));

        $paymentStatus = $request->input('payment_status');
        $datePreset = $request->input('date_preset');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $user = $request->user();
        $allowedSectorIds = $user?->getAllowedSectorIds();

        $query = Reservation::query()
            ->with(['guest', 'unit.sector', 'payments', 'extraFees'])
            ->latest('id');

        // Sector scoping based on user sector permissions
        if ($allowedSectorIds !== null) {
            if (empty($allowedSectorIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereHas('unit', function ($u) use ($allowedSectorIds) {
                    $u->whereIn('sector_id', $allowedSectorIds);
                });
            }
        }

        // Search Filter (guest name, phone, mil_code, unit name, sector name, reservation id, notes)
        if ($search && trim($search) !== '') {
            $trimmedSearch = trim($search);
            $query->where(function ($q) use ($trimmedSearch) {
                $q->whereHas('guest', function ($g) use ($trimmedSearch) {
                    $g->where('name', 'like', "%{$trimmedSearch}%")
                        ->orWhere('phone', 'like', "%{$trimmedSearch}%")
                        ->orWhere('mil_code', 'like', "%{$trimmedSearch}%");
                })->orWhereHas('unit', function ($u) use ($trimmedSearch) {
                    $u->where('name', 'like', "%{$trimmedSearch}%")
                        ->orWhereHas('sector', function ($s) use ($trimmedSearch) {
                            $s->where('name', 'like', "%{$trimmedSearch}%");
                        });
                })->orWhere('id', 'like', "%{$trimmedSearch}%")
                    ->orWhere('notes', 'like', "%{$trimmedSearch}%");
            });
        }

        // Multi-Sector Filter
        if (! empty($sectorIds)) {
            $effectiveSectors = $allowedSectorIds !== null
                ? array_values(array_intersect($sectorIds, $allowedSectorIds))
                : $sectorIds;

            $query->whereHas('unit', function ($u) use ($effectiveSectors) {
                $u->whereIn('sector_id', $effectiveSectors);
            });
        }

        // Multi-Status Filter
        if (! empty($statuses)) {
            $query->whereIn('status', $statuses);
        }

        // Resolve resort period presets (Friday - Thursday)
        $now = Carbon::now();
        $currentPeriodStart = $now->isFriday()
            ? $now->copy()->toDateString()
            : $now->copy()->previous(Carbon::FRIDAY)->toDateString();
        $currentPeriodEnd = Carbon::parse($currentPeriodStart)->addDays(6)->toDateString();

        if ($datePreset === 'current_period' && ! $startDate && ! $endDate) {
            $startDate = $currentPeriodStart;
            $endDate = $currentPeriodEnd;
        } elseif ($datePreset === 'next_period' && ! $startDate && ! $endDate) {
            $startDate = Carbon::parse($currentPeriodStart)->addDays(7)->toDateString();
            $endDate = Carbon::parse($startDate)->addDays(6)->toDateString();
        } elseif ($datePreset === 'prev_period' && ! $startDate && ! $endDate) {
            $startDate = Carbon::parse($currentPeriodStart)->subDays(7)->toDateString();
            $endDate = Carbon::parse($startDate)->addDays(6)->toDateString();
        }

        // Date Preset / Range Filter
        $today = Carbon::today()->toDateString();
        if ($startDate && $endDate) {
            $query->where('check_in', '<=', $endDate)->where('check_out', '>=', $startDate);
        } elseif ($startDate) {
            $query->where('check_out', '>=', $startDate);
        } elseif ($endDate) {
            $query->where('check_in', '<=', $endDate);
        } elseif ($datePreset === 'today') {
            $query->where('check_in', '<=', $today)->where('check_out', '>=', $today);
        } elseif ($datePreset === 'this_week') {
            $startOfWeek = Carbon::now()->startOfWeek()->toDateString();
            $endOfWeek = Carbon::now()->endOfWeek()->toDateString();
            $query->where('check_in', '<=', $endOfWeek)->where('check_out', '>=', $startOfWeek);
        } elseif ($datePreset === 'this_month') {
            $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
            $endOfMonth = Carbon::now()->endOfMonth()->toDateString();
            $query->where('check_in', '<=', $endOfMonth)->where('check_out', '>=', $startOfMonth);
        } elseif ($datePreset === 'future') {
            $query->where('check_in', '>=', $today);
        }

        // Payment Status Filter
        if ($paymentStatus === 'paid') {
            $query->whereRaw('(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.reservation_id = reservations.id) >= reservations.total_price');
        } elseif ($paymentStatus === 'partial') {
            $query->whereRaw('(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.reservation_id = reservations.id) > 0 AND (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.reservation_id = reservations.id) < reservations.total_price');
        } elseif ($paymentStatus === 'unpaid') {
            $query->whereRaw('(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.reservation_id = reservations.id) = 0');
        }

        // Calculate KPI Stats and Status Counts (scoped to date range, sector, and search)
        $kpiQuery = Reservation::query();

        if ($startDate && $endDate) {
            $kpiQuery->where('check_in', '<=', $endDate)->where('check_out', '>=', $startDate);
        } elseif ($startDate) {
            $kpiQuery->where('check_out', '>=', $startDate);
        } elseif ($endDate) {
            $kpiQuery->where('check_in', '<=', $endDate);
        } elseif ($datePreset === 'today') {
            $kpiQuery->where('check_in', '<=', $today)->where('check_out', '>=', $today);
        } elseif ($datePreset === 'this_week') {
            $startOfWeek = Carbon::now()->startOfWeek()->toDateString();
            $endOfWeek = Carbon::now()->endOfWeek()->toDateString();
            $kpiQuery->where('check_in', '<=', $endOfWeek)->where('check_out', '>=', $startOfWeek);
        } elseif ($datePreset === 'this_month') {
            $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
            $endOfMonth = Carbon::now()->endOfMonth()->toDateString();
            $kpiQuery->where('check_in', '<=', $endOfMonth)->where('check_out', '>=', $startOfMonth);
        } elseif ($datePreset === 'future') {
            $kpiQuery->where('check_in', '>=', $today);
        }

        if ($allowedSectorIds !== null) {
            if (empty($allowedSectorIds)) {
                $kpiQuery->whereRaw('1 = 0');
            } else {
                $kpiQuery->whereHas('unit', function ($u) use ($allowedSectorIds) {
                    $u->whereIn('sector_id', $allowedSectorIds);
                });
            }
        }

        if (! empty($sectorIds)) {
            $effectiveSectors = $allowedSectorIds !== null
                ? array_values(array_intersect($sectorIds, $allowedSectorIds))
                : $sectorIds;

            $kpiQuery->whereHas('unit', function ($u) use ($effectiveSectors) {
                $u->whereIn('sector_id', $effectiveSectors);
            });
        }

        if ($search && trim($search) !== '') {
            $trimmedSearch = trim($search);
            $kpiQuery->where(function ($q) use ($trimmedSearch) {
                $q->whereHas('guest', function ($g) use ($trimmedSearch) {
                    $g->where('name', 'like', "%{$trimmedSearch}%")
                        ->orWhere('phone', 'like', "%{$trimmedSearch}%")
                        ->orWhere('mil_code', 'like', "%{$trimmedSearch}%");
                })->orWhereHas('unit', function ($u) use ($trimmedSearch) {
                    $u->where('name', 'like', "%{$trimmedSearch}%")
                        ->orWhereHas('sector', function ($s) use ($trimmedSearch) {
                            $s->where('name', 'like', "%{$trimmedSearch}%");
                        });
                })->orWhere('id', 'like', "%{$trimmedSearch}%")
                    ->orWhere('notes', 'like', "%{$trimmedSearch}%");
            });
        }

        $totalCount = (clone $kpiQuery)->count();
        $checkedInCount = (clone $kpiQuery)->where('status', ReservationStatus::CHECKED_IN->value)->count();
        $waitingCount = (clone $kpiQuery)->where('status', ReservationStatus::WAITING->value)->count();
        $confirmedCount = (clone $kpiQuery)->where('status', ReservationStatus::CONFIRMED->value)->count();
        $departedCount = (clone $kpiQuery)->where('status', ReservationStatus::DEPARTED->value)->count();

        $totalExpectedRevenue = (float) (clone $kpiQuery)->sum('total_price');
        $totalCollectedRevenue = (float) Payment::whereIn('reservation_id', (clone $kpiQuery)->select('id'))->sum('amount');
        $totalOutstandingBalance = max(0.0, round($totalExpectedRevenue - $totalCollectedRevenue, 2));

        $stats = [
            'total' => $totalCount,
            'checked_in' => $checkedInCount,
            'waiting' => $waitingCount,
            'confirmed' => $confirmedCount,
            'departed' => $departedCount,
            'total_expected_revenue' => $totalExpectedRevenue,
            'total_collected_revenue' => $totalCollectedRevenue,
            'total_outstanding_balance' => $totalOutstandingBalance,
        ];

        $statusCounts = [
            'all' => $totalCount,
            ReservationStatus::CHECKED_IN->value => $checkedInCount,
            ReservationStatus::CONFIRMED->value => $confirmedCount,
            ReservationStatus::WAITING->value => $waitingCount,
            ReservationStatus::DEPARTED->value => $departedCount,
        ];

        $reservations = $query->get();

        $sectors = ($allowedSectorIds !== null)
            ? Sector::whereIn('id', $allowedSectorIds)->with(['units.priceRule', 'units.currentReservation.guest'])->get()
            : Sector::with(['units.priceRule', 'units.currentReservation.guest'])->get();

        $units = ($allowedSectorIds !== null)
            ? Unit::whereIn('sector_id', $allowedSectorIds)->with(['sector', 'priceRule', 'currentReservation.guest'])->get()
            : Unit::with(['sector', 'priceRule', 'currentReservation.guest'])->get();

        return Inertia::render('reservations/index', [
            'reservations' => $reservations,
            'sectors' => $sectors,
            'units' => $units,
            'guests' => fn () => Guest::select(['id', 'name', 'phone', 'mil_code'])->latest('id')->limit(500)->get(),
            'stats' => $stats,
            'status_counts' => $statusCounts,
            'filters' => [
                'view' => $view,
                'search' => $search ?? '',
                'sector_id' => count($sectorIds) === 1 ? $sectorIds[0] : null,
                'sector_ids' => $sectorIds,
                'status' => count($statuses) === 1 ? $statuses[0] : null,
                'statuses' => $statuses,
                'payment_status' => ($paymentStatus && $paymentStatus !== 'all') ? $paymentStatus : null,
                'date_preset' => $datePreset ?? null,
                'start_date' => $startDate ?? null,
                'end_date' => $endDate ?? null,
            ],
        ]);
    }

    /**
     * Store a newly created reservation in storage.
     */
    public function store(StoreReservationRequest $request): RedirectResponse
    {
        $unit = Unit::findOrFail($request->input('unit_id'));
        if (! $request->user()->canEditSector($unit->sector_id)) {
            abort(403, 'غير مصرح لك بإنشاء حجز في هذا القطاع');
        }

        $reservation = null;

        DB::transaction(function () use ($request, &$reservation) {
            $data = $request->validated();
            $initialPayment = $data['initial_payment'] ?? null;
            $extraFees = $data['extra_fees'] ?? [];
            unset($data['initial_payment'], $data['extra_fees'], $data['attachments']);

            if (! empty($data['has_meals'])) {
                $data['meals_persons_count'] = ! empty($data['meals_persons_count']) ? (int) $data['meals_persons_count'] : 4;
                if (empty($data['meals_rate_per_night'])) {
                    $data['meals_rate_per_night'] = PriceRule::getMealRate();
                }
                if (! empty($data['meals_start_date']) && ! empty($data['meals_end_date'])) {
                    $in = Carbon::parse($data['meals_start_date']);
                    $out = Carbon::parse($data['meals_end_date']);
                    $nights = max(0, $in->diffInDays($out));
                    $data['meals_total_price'] = round($data['meals_persons_count'] * $data['meals_rate_per_night'] * $nights, 2);
                }
            } else {
                $data['has_meals'] = false;
                $data['meals_persons_count'] = null;
                $data['meals_start_date'] = null;
                $data['meals_end_date'] = null;
                $data['meals_rate_per_night'] = 0.00;
                $data['meals_total_price'] = 0.00;
            }

            $reservation = Reservation::create($data);

            if ($request->hasFile('attachments')) {
                $uploadedFiles = $request->file('attachments');
                if (! is_array($uploadedFiles)) {
                    $uploadedFiles = [$uploadedFiles];
                }

                $compressionService = app(AttachmentCompressionService::class);
                $attachmentsData = [];
                foreach ($uploadedFiles as $file) {
                    if ($file instanceof UploadedFile && $file->isValid()) {
                        $attachmentsData[] = $compressionService->compressAndStore($file, $reservation->id);
                    }
                }

                if (! empty($attachmentsData)) {
                    $reservation->update(['attachments' => $attachmentsData]);
                }
            }

            if (! empty($extraFees) && is_array($extraFees)) {
                foreach ($extraFees as $fee) {
                    $amount = (float) ($fee['amount'] ?? 0);
                    $desc = trim((string) ($fee['description'] ?? ''));
                    if ($amount > 0 && $desc !== '') {
                        $reservation->extraFees()->create([
                            'description' => $desc,
                            'amount' => $amount,
                            'created_by' => $request->user()?->id,
                        ]);
                    }
                }
            }

            if (! empty($initialPayment['amount'])) {
                Payment::create([
                    'reservation_id' => $reservation->id,
                    'amount' => $initialPayment['amount'],
                    'method' => $initialPayment['method'],
                ]);
            }
        });

        if ($reservation) {
            ReservationNotification::notifySuperAdmins(
                ReservationNotification::created($reservation, $request->user())
            );
        }

        return redirect()->back(fallback: route('reservations.index'))
            ->with('success', 'تم تسجيل وتأكيد الحجز بنجاح');
    }

    /**
     * Update the specified reservation in storage.
     */
    public function update(UpdateReservationRequest $request, Reservation $reservation): RedirectResponse
    {
        $reservation->loadMissing(['guest', 'unit.sector']);
        if (! $request->user()->canEditSector($reservation->unit->sector_id)) {
            abort(403, 'غير مصرح لك بتعديل حجز في هذا القطاع');
        }
        if ($request->filled('unit_id') && $request->input('unit_id') != $reservation->unit_id) {
            $newUnit = Unit::findOrFail($request->input('unit_id'));
            if (! $request->user()->canEditSector($newUnit->sector_id)) {
                abort(403, 'غير مصرح لك بنقل الحجز لهذا القطاع');
            }
        }

        $oldUnit = $reservation->unit;
        $oldUnitId = (int) $reservation->unit_id;
        $oldSectorId = $reservation->unit?->sector_id;
        $oldSectorName = $reservation->unit?->sector?->name;
        $oldCheckIn = is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in?->format('Y-m-d');
        $oldCheckOut = is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out?->format('Y-m-d');
        $oldStatus = $reservation->status;
        $oldMembership = $reservation->membership;
        $oldType = $reservation->type;
        $oldPrice = (float) $reservation->total_price;
        $oldGuestName = $reservation->guest?->name ?? 'غير محدد';
        $oldGuestId = (int) $reservation->guest_id;
        $oldNotes = $reservation->notes;
        $oldEnterFromGates = (bool) $reservation->enter_from_gates;

        $data = $request->validated();
        $extraFees = array_key_exists('extra_fees', $data) ? $data['extra_fees'] : null;
        $deletedAttachmentIds = (array) ($data['deleted_attachment_ids'] ?? []);
        unset($data['extra_fees'], $data['attachments'], $data['deleted_attachment_ids']);

        if (! empty($data['has_meals'])) {
            $data['meals_persons_count'] = ! empty($data['meals_persons_count'])
                ? (int) $data['meals_persons_count']
                : ($reservation->meals_persons_count ?: 4);
            if (empty($data['meals_rate_per_night'])) {
                $data['meals_rate_per_night'] = $reservation->meals_rate_per_night > 0
                    ? $reservation->meals_rate_per_night
                    : PriceRule::getMealRate();
            }
            if (! empty($data['meals_start_date']) && ! empty($data['meals_end_date'])) {
                $in = Carbon::parse($data['meals_start_date']);
                $out = Carbon::parse($data['meals_end_date']);
                $nights = max(0, $in->diffInDays($out));
                $data['meals_total_price'] = round($data['meals_persons_count'] * $data['meals_rate_per_night'] * $nights, 2);
            }
        } else {
            $data['has_meals'] = false;
            $data['meals_persons_count'] = null;
            $data['meals_start_date'] = null;
            $data['meals_end_date'] = null;
            $data['meals_rate_per_night'] = 0.00;
            $data['meals_total_price'] = 0.00;
        }

        DB::transaction(function () use ($reservation, $data, $extraFees, $deletedAttachmentIds, $request) {
            $reservation->update($data);

            // Handle deleted and newly uploaded attachments
            $currentAttachments = $reservation->attachments ?? [];
            $compressionService = app(AttachmentCompressionService::class);
            $hasAttachmentChanges = false;

            if (! empty($deletedAttachmentIds)) {
                $remaining = [];
                foreach ($currentAttachments as $att) {
                    if (in_array($att['id'], $deletedAttachmentIds, true)) {
                        if (! empty($att['file_path'])) {
                            $compressionService->deleteFile($att['file_path']);
                        }
                        $hasAttachmentChanges = true;
                    } else {
                        $remaining[] = $att;
                    }
                }
                $currentAttachments = $remaining;
            }

            if ($request->hasFile('attachments')) {
                $uploadedFiles = $request->file('attachments');
                if (! is_array($uploadedFiles)) {
                    $uploadedFiles = [$uploadedFiles];
                }
                foreach ($uploadedFiles as $file) {
                    if ($file instanceof UploadedFile && $file->isValid()) {
                        $currentAttachments[] = $compressionService->compressAndStore($file, $reservation->id);
                        $hasAttachmentChanges = true;
                    }
                }
            }

            if ($hasAttachmentChanges) {
                $reservation->update(['attachments' => $currentAttachments]);
            }

            if ($extraFees !== null) {
                $existingIds = [];
                foreach ($extraFees as $fee) {
                    $amount = (float) ($fee['amount'] ?? 0);
                    $desc = trim((string) ($fee['description'] ?? ''));
                    if ($amount > 0 && $desc !== '') {
                        if (! empty($fee['id'])) {
                            $existingFee = $reservation->extraFees()->find($fee['id']);
                            if ($existingFee) {
                                $existingFee->update([
                                    'description' => $desc,
                                    'amount' => $amount,
                                ]);
                                $existingIds[] = $existingFee->id;

                                continue;
                            }
                        }
                        $newFee = $reservation->extraFees()->create([
                            'description' => $desc,
                            'amount' => $amount,
                            'created_by' => $request->user()?->id,
                        ]);
                        $existingIds[] = $newFee->id;
                    }
                }
                $reservation->extraFees()->whereNotIn('id', $existingIds)->delete();
            }
        });

        $fresh = $reservation->fresh(['guest', 'unit.sector', 'extraFees']);

        $changes = [];

        // 1. Status change
        $oldStatusVal = $oldStatus instanceof ReservationStatus ? $oldStatus->value : (string) $oldStatus;
        if (isset($data['status']) && $data['status'] !== $oldStatusVal) {
            $fromLabel = $oldStatus instanceof ReservationStatus ? $oldStatus->label() : ($oldStatusVal ?: 'غير محدد');
            $newStatusEnum = ReservationStatus::tryFrom($data['status']);
            $toLabel = $newStatusEnum?->label() ?? $data['status'];
            $changes['status'] = [
                'label' => 'الحالة',
                'from' => $fromLabel,
                'to' => $toLabel,
            ];
        }

        // 2. Membership change
        $oldMembershipVal = $oldMembership instanceof MembershipType ? $oldMembership->value : (string) $oldMembership;
        if (isset($data['membership']) && $data['membership'] !== $oldMembershipVal) {
            $fromLabel = $oldMembership instanceof MembershipType ? $oldMembership->label() : ($oldMembershipVal ?: 'غير محدد');
            $toEnum = MembershipType::tryFrom($data['membership']);
            $toLabel = $toEnum?->label() ?? $data['membership'];
            $changes['membership'] = [
                'label' => 'نوع النزيل',
                'from' => $fromLabel,
                'to' => $toLabel,
            ];
        }

        // 3. Type change
        $oldTypeVal = $oldType instanceof ReservationType ? $oldType->value : (string) $oldType;
        if (isset($data['type']) && $data['type'] !== $oldTypeVal) {
            $fromLabel = $oldType instanceof ReservationType ? $oldType->label() : ($oldTypeVal ?: 'غير محدد');
            $toEnum = ReservationType::tryFrom($data['type']);
            $toLabel = $toEnum?->label() ?? $data['type'];
            $changes['type'] = [
                'label' => 'نوع الحجز',
                'from' => $fromLabel,
                'to' => $toLabel,
            ];
        }

        // 4. Dates change
        $newCheckIn = $data['check_in'] ?? null;
        $newCheckOut = $data['check_out'] ?? null;
        if (($newCheckIn && $newCheckIn !== $oldCheckIn) || ($newCheckOut && $newCheckOut !== $oldCheckOut)) {
            $changes['dates'] = [
                'label' => 'فترة الإقامة',
                'from' => "{$oldCheckIn} إلى {$oldCheckOut}",
                'to' => "{$newCheckIn} إلى {$newCheckOut}",
            ];
        }

        // 5. Unit change
        $newUnitId = isset($data['unit_id']) ? (int) $data['unit_id'] : null;
        if ($newUnitId && $newUnitId !== $oldUnitId) {
            $oldUnitDisplay = ReservationNotification::formatUnitDisplay($oldUnit?->name, $oldSectorName);
            $newUnitDisplay = ReservationNotification::formatUnitDisplay($fresh->unit?->name, $fresh->unit?->sector?->name);
            $changes['unit'] = [
                'label' => 'الوحدة',
                'from' => $oldUnitDisplay,
                'to' => $newUnitDisplay,
            ];
        }

        // 6. Total price change
        $newPrice = isset($data['total_price']) ? (float) $data['total_price'] : null;
        if ($newPrice !== null && abs($newPrice - $oldPrice) > 0.01) {
            $changes['total_price'] = [
                'label' => 'المبلغ الإجمالي',
                'from' => number_format($oldPrice, 2).' ج.م',
                'to' => number_format($newPrice, 2).' ج.م',
            ];
        }

        // 7. Guest change
        $newGuestId = isset($data['guest_id']) ? (int) $data['guest_id'] : null;
        if ($newGuestId && $newGuestId !== $oldGuestId) {
            $changes['guest'] = [
                'label' => 'النزيل',
                'from' => $oldGuestName,
                'to' => $fresh->guest?->name ?? 'غير محدد',
            ];
        }

        // 8. Gate entry
        if (array_key_exists('enter_from_gates', $data) && (bool) $data['enter_from_gates'] !== $oldEnterFromGates) {
            $changes['enter_from_gates'] = [
                'label' => 'دخول البوابات',
                'from' => $oldEnterFromGates ? 'نعم' : 'لا',
                'to' => $data['enter_from_gates'] ? 'نعم' : 'لا',
            ];
        }

        // 9. Notes
        if (array_key_exists('notes', $data) && ($data['notes'] ?? '') !== ($oldNotes ?? '')) {
            $changes['notes'] = [
                'label' => 'الملاحظات',
                'from' => $oldNotes ?: 'لا يوجد',
                'to' => $data['notes'] ?: 'لا يوجد',
            ];
        }

        $additionalSectorIds = [];
        if ($oldSectorId && $fresh->unit?->sector_id && (int) $oldSectorId !== (int) $fresh->unit->sector_id) {
            $additionalSectorIds[] = (int) $oldSectorId;
        }

        $primaryChanges = array_intersect(array_keys($changes), ['status', 'membership', 'type', 'dates', 'unit']);

        if (count($primaryChanges) === 1 && in_array('status', $primaryChanges, true)) {
            $notification = ReservationNotification::statusUpdated(
                $fresh,
                $request->user(),
                $changes['status']['from'],
                $changes['status']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            );
        } elseif (count($primaryChanges) === 1 && in_array('membership', $primaryChanges, true)) {
            $notification = ReservationNotification::membershipUpdated(
                $fresh,
                $request->user(),
                $changes['membership']['from'],
                $changes['membership']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            );
        } elseif (count($primaryChanges) === 1 && in_array('type', $primaryChanges, true)) {
            $notification = ReservationNotification::typeUpdated(
                $fresh,
                $request->user(),
                $changes['type']['from'],
                $changes['type']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            );
        } elseif (count($primaryChanges) === 1 && in_array('dates', $primaryChanges, true)) {
            $unitDisplay = ReservationNotification::formatUnitDisplay($fresh->unit?->name, $fresh->unit?->sector?->name);
            $guestName = $fresh->guest?->name ?? 'غير محدد';
            $notification = ReservationNotification::updated(
                $fresh,
                $request->user(),
                summary: "تعديل فترة إقامة {$unitDisplay} {$guestName} إلى {$newCheckIn} حتى {$newCheckOut}",
                changeType: 'dates',
                fromValue: $changes['dates']['from'],
                toValue: $changes['dates']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
                additionalSectorIds: $additionalSectorIds,
            );
        } elseif (count($primaryChanges) === 1 && in_array('unit', $primaryChanges, true)) {
            $guestName = $fresh->guest?->name ?? 'غير محدد';
            $notification = ReservationNotification::updated(
                $fresh,
                $request->user(),
                summary: "نقل حجز {$guestName} من {$changes['unit']['from']} إلى {$changes['unit']['to']}",
                changeType: 'unit',
                fromValue: $changes['unit']['from'],
                toValue: $changes['unit']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
                additionalSectorIds: $additionalSectorIds,
            );
        } else {
            $notification = ReservationNotification::updated(
                $fresh,
                $request->user(),
                changeType: 'updated',
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
                additionalSectorIds: $additionalSectorIds,
            );
        }

        ReservationNotification::notifySuperAdmins($notification);

        return redirect()->back()
            ->with('success', 'تم تعديل بيانات الحجز بنجاح');
    }

    /**
     * Quick-update status, membership, or type of the specified reservation.
     */
    public function quickUpdate(Request $request, Reservation $reservation): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        if (! $user || (! $user->can('reservations.edit') && ! $user->can('reservations.update_status'))) {
            abort(403, 'غير مصرح لك بتعديل بيانات الحجز');
        }

        $reservation->loadMissing(['guest', 'unit.sector']);
        if (! $user->canEditSector($reservation->unit->sector_id)) {
            abort(403, 'غير مصرح لك بتعديل حجز في هذا القطاع');
        }

        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(ReservationStatus::values())],
            'membership' => ['nullable', 'string', Rule::in(MembershipType::values())],
            'type' => ['nullable', 'string', Rule::in(ReservationType::values())],
            'enter_from_gates' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $oldStatus = $reservation->status;
        $oldMembership = $reservation->membership;
        $oldType = $reservation->type;
        $oldPrice = (float) $reservation->total_price;
        $oldEnterFromGates = (bool) $reservation->enter_from_gates;
        $oldNotes = $reservation->notes;

        $data = array_filter($validated, fn ($v) => $v !== null);

        if ($request->has('notes')) {
            $data['notes'] = $validated['notes'] ?? null;
        }

        // If membership changed and unit has a price rule, automatically recalculate total_price
        if (isset($data['membership']) && $data['membership'] !== ($reservation->membership?->value ?? $reservation->membership)) {
            $pricingService = app(PricingService::class);
            $checkIn = is_string($reservation->check_in) ? $reservation->check_in : $reservation->check_in->format('Y-m-d');
            $checkOut = is_string($reservation->check_out) ? $reservation->check_out : $reservation->check_out->format('Y-m-d');
            $calc = $pricingService->calculate(
                $reservation->unit_id,
                $data['membership'],
                $checkIn,
                $checkOut
            );
            if ($calc['price_rule_id'] !== null && $calc['total_price'] > 0) {
                $data['total_price'] = $calc['total_price'];
            }
        }

        $reservation->update($data);
        $fresh = $reservation->fresh(['guest', 'unit.sector']);

        $changes = [];

        // status
        $oldStatusVal = $oldStatus instanceof ReservationStatus ? $oldStatus->value : (string) $oldStatus;
        if (isset($data['status']) && $data['status'] !== $oldStatusVal) {
            $fromLabel = $oldStatus instanceof ReservationStatus ? $oldStatus->label() : ($oldStatusVal ?: 'غير محدد');
            $newStatusEnum = ReservationStatus::tryFrom($data['status']);
            $toLabel = $newStatusEnum?->label() ?? $data['status'];
            $changes['status'] = [
                'label' => 'الحالة',
                'from' => $fromLabel,
                'to' => $toLabel,
            ];
        }

        // membership
        $oldMembershipVal = $oldMembership instanceof MembershipType ? $oldMembership->value : (string) $oldMembership;
        if (isset($data['membership']) && $data['membership'] !== $oldMembershipVal) {
            $fromLabel = $oldMembership instanceof MembershipType ? $oldMembership->label() : ($oldMembershipVal ?: 'غير محدد');
            $toEnum = MembershipType::tryFrom($data['membership']);
            $toLabel = $toEnum?->label() ?? $data['membership'];
            $changes['membership'] = [
                'label' => 'نوع النزيل',
                'from' => $fromLabel,
                'to' => $toLabel,
            ];
        }

        // type
        $oldTypeVal = $oldType instanceof ReservationType ? $oldType->value : (string) $oldType;
        if (isset($data['type']) && $data['type'] !== $oldTypeVal) {
            $fromLabel = $oldType instanceof ReservationType ? $oldType->label() : ($oldTypeVal ?: 'غير محدد');
            $toEnum = ReservationType::tryFrom($data['type']);
            $toLabel = $toEnum?->label() ?? $data['type'];
            $changes['type'] = [
                'label' => 'نوع الحجز',
                'from' => $fromLabel,
                'to' => $toLabel,
            ];
        }

        // enter_from_gates
        if (array_key_exists('enter_from_gates', $data) && (bool) $data['enter_from_gates'] !== $oldEnterFromGates) {
            $changes['enter_from_gates'] = [
                'label' => 'دخول البوابات',
                'from' => $oldEnterFromGates ? 'نعم' : 'لا',
                'to' => $data['enter_from_gates'] ? 'نعم' : 'لا',
            ];
        }

        // notes
        if (array_key_exists('notes', $data) && ($data['notes'] ?? '') !== ($oldNotes ?? '')) {
            $changes['notes'] = [
                'label' => 'الملاحظات',
                'from' => $oldNotes ?: 'لا يوجد',
                'to' => $data['notes'] ?: 'لا يوجد',
            ];
        }

        // price recalculated
        $newPrice = (float) $fresh->total_price;
        if (abs($newPrice - $oldPrice) > 0.01) {
            $changes['total_price'] = [
                'label' => 'المبلغ الإجمالي',
                'from' => number_format($oldPrice, 2).' ج.م',
                'to' => number_format($newPrice, 2).' ج.م',
            ];
        }

        if (isset($changes['status'])) {
            $notification = ReservationNotification::statusUpdated(
                $fresh,
                $request->user(),
                $changes['status']['from'],
                $changes['status']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            );
        } elseif (isset($changes['membership'])) {
            $notification = ReservationNotification::membershipUpdated(
                $fresh,
                $request->user(),
                $changes['membership']['from'],
                $changes['membership']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            );
        } elseif (isset($changes['type'])) {
            $notification = ReservationNotification::typeUpdated(
                $fresh,
                $request->user(),
                $changes['type']['from'],
                $changes['type']['to'],
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            );
        } else {
            $notification = ReservationNotification::updated(
                $fresh,
                $request->user(),
                changeType: 'updated',
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            );
        }

        ReservationNotification::notifySuperAdmins($notification);

        if (! $request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
            return response()->json([
                'message' => 'تم تحديث بيانات الحجز بنجاح',
                'reservation' => $reservation->fresh(['guest', 'unit.sector', 'payments', 'extraFees']),
            ]);
        }

        return redirect()->back()
            ->with('success', 'تم تحديث بيانات الحجز بنجاح');
    }

    /**
     * Update only the status of the specified reservation.
     */
    public function updateStatus(Request $request, Reservation $reservation): JsonResponse|RedirectResponse
    {
        $reservation->loadMissing(['guest', 'unit.sector']);
        if (! $request->user()->canEditSector($reservation->unit->sector_id)) {
            abort(403, 'غير مصرح لك بتحديث حالة حجز في هذا القطاع');
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(ReservationStatus::values())],
        ]);

        $oldStatus = $reservation->status instanceof ReservationStatus ? $reservation->status->label() : ($reservation->status ?? null);
        $newStatusEnum = ReservationStatus::from($validated['status']);

        $reservation->update(['status' => $validated['status']]);
        $fresh = $reservation->fresh(['guest', 'unit.sector']);

        $changes = [
            'status' => [
                'label' => 'الحالة',
                'from' => $oldStatus ?? 'غير محدد',
                'to' => $newStatusEnum->label(),
            ],
        ];

        ReservationNotification::notifySuperAdmins(
            ReservationNotification::statusUpdated(
                $fresh,
                $request->user(),
                $oldStatus,
                $newStatusEnum->label(),
                sectorId: $fresh->unit?->sector_id,
                changes: $changes,
            )
        );

        if (! $request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
            return response()->json([
                'message' => 'تم تحديث حالة الحجز بنجاح',
                'reservation' => $reservation->fresh(['guest', 'unit.sector', 'payments', 'extraFees']),
            ]);
        }

        return redirect()->back()
            ->with('success', 'تم تحديث حالة الحجز بنجاح');
    }

    /**
     * Remove the specified reservation from storage.
     */
    public function destroy(Reservation $reservation): RedirectResponse
    {
        $reservation->loadMissing(['guest', 'unit.sector']);
        if (! request()->user()->canEditSector($reservation->unit->sector_id)) {
            abort(403, 'غير مصرح لك بحذف حجز في هذا القطاع');
        }

        $notification = ReservationNotification::deleted($reservation, request()->user());

        DB::transaction(function () use ($reservation) {
            $reservation->delete();
        });

        ReservationNotification::notifySuperAdmins($notification);

        return redirect()->back(fallback: route('reservations.index'))
            ->with('success', 'تم حذف الحجز بنجاح');
    }

    /**
     * Parse multi-value filter inputs (array or comma-separated string) and strip 'all', empty, or null values.
     *
     * @return array<int, string>
     */
    protected function parseMultiFilter(mixed $input): array
    {
        if (empty($input)) {
            return [];
        }

        if (is_array($input)) {
            $items = $input;
        } else {
            $items = explode(',', (string) $input);
        }

        $clean = [];
        foreach ($items as $item) {
            $itemStr = trim((string) $item);
            if ($itemStr !== '' && $itemStr !== 'all') {
                $clean[] = $itemStr;
            }
        }

        return array_values(array_unique($clean));
    }
}
