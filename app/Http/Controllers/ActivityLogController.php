<?php

namespace App\Http\Controllers;

use App\Models\Guest;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    /**
     * Permanent sector ordering specified by Eagles Resort.
     *
     * @var array<string, int>
     */
    protected const SECTOR_ORDER = [
        'لوسيال' => 1,
        'فيلا قديم' => 2,
        'فيلا جديد' => 3,
        'فندق 1' => 4,
        'فندق 2' => 5,
        'فندق 3' => 6,
        'فندق 4' => 7,
        'فندق 5' => 8,
        'مميز' => 9,
        'دورين' => 10,
        'فندق 6' => 11,
    ];

    /**
     * Map model attributes to friendly Arabic labels.
     *
     * @var array<string, string>
     */
    protected const FIELD_LABELS = [
        'status' => 'حالة الحجز',
        'unit_id' => 'الوحدة السكنية',
        'guest_id' => 'النزيل',
        'check_in' => 'تاريخ الوصول',
        'check_out' => 'تاريخ المغادرة',
        'membership' => 'نوع العضوية',
        'type' => 'نوع الحجز',
        'total_price' => 'إجمالي المبلغ',
        'notes' => 'الملاحظات',
        'name' => 'الاسم',
        'email' => 'البريد الإلكتروني',
        'phone' => 'رقم الهاتف',
        'mil_code' => 'الرقم العسكري',
        'amount' => 'المبلغ المسدد',
        'method' => 'طريقة الدفع',
        'reference_number' => 'رقم الإيصال / المرجع',
        'rooms_count' => 'عدد الغرف',
        'sector_id' => 'القطاع',
        'price_rule_id' => 'قاعدة التسعير',
        'rules' => 'تفاصيل التسعير',
    ];

    /**
     * Display a paginated, filterable activity log.
     */
    public function index(Request $request): Response|JsonResponse
    {
        $currentUser = $request->user();
        if (! $currentUser || (! $currentUser->can('activity_logs.view') && ! $currentUser->hasRole(['Admin', 'Super Admin']))) {
            abort(403, 'غير مصرح لك بالاطلاع على سجلات النشاط والمراقبة');
        }

        $search = $request->string('search')->trim()->value();
        $userId = $request->integer('user_id') ?: null;
        $sectorId = $request->integer('sector_id') ?: null;
        $unitId = $request->integer('unit_id') ?: null;
        $event = $request->string('event')->trim()->value();
        $subjectType = $request->string('subject_type')->trim()->value();
        $startDate = $request->string('start_date')->trim()->value();
        $endDate = $request->string('end_date')->trim()->value();
        $perPage = min(max($request->integer('per_page', 20), 10), 100);

        $query = Activity::query()->latest('id');

        // Filter: User (Causer or User Subject)
        if ($userId) {
            $query->where(function ($q) use ($userId) {
                $q->where(function ($c) use ($userId) {
                    $c->where('causer_type', User::class)
                        ->where('causer_id', $userId);
                })->orWhere(function ($s) use ($userId) {
                    $s->where('subject_type', User::class)
                        ->where('subject_id', $userId);
                });
            });
        }

        // Filter: Sector
        if ($sectorId) {
            $query->where(function ($q) use ($sectorId) {
                // 1. Reservations in this sector
                $q->where(function ($sub) use ($sectorId) {
                    $sub->where('subject_type', Reservation::class)
                        ->whereIn('subject_id', function ($rQuery) use ($sectorId) {
                            $rQuery->select('id')
                                ->from('reservations')
                                ->whereIn('unit_id', function ($uQuery) use ($sectorId) {
                                    $uQuery->select('id')
                                        ->from('units')
                                        ->where('sector_id', $sectorId);
                                });
                        });
                })
                // 2. Units in this sector
                    ->orWhere(function ($sub) use ($sectorId) {
                        $sub->where('subject_type', Unit::class)
                            ->whereIn('subject_id', function ($uQuery) use ($sectorId) {
                                $uQuery->select('id')
                                    ->from('units')
                                    ->where('sector_id', $sectorId);
                            });
                    })
                // 3. The Sector itself
                    ->orWhere(function ($sub) use ($sectorId) {
                        $sub->where('subject_type', Sector::class)
                            ->where('subject_id', $sectorId);
                    })
                // 4. Payments on reservations in this sector
                    ->orWhere(function ($sub) use ($sectorId) {
                        $sub->where('subject_type', Payment::class)
                            ->whereIn('subject_id', function ($pQuery) use ($sectorId) {
                                $pQuery->select('id')
                                    ->from('payments')
                                    ->whereIn('reservation_id', function ($rQuery) use ($sectorId) {
                                        $rQuery->select('id')
                                            ->from('reservations')
                                            ->whereIn('unit_id', function ($uQuery) use ($sectorId) {
                                                $uQuery->select('id')
                                                    ->from('units')
                                                    ->where('sector_id', $sectorId);
                                            });
                                    });
                            });
                    });
            });
        }

        // Filter: Unit
        if ($unitId) {
            $query->where(function ($q) use ($unitId) {
                // 1. Reservations on this unit
                $q->where(function ($sub) use ($unitId) {
                    $sub->where('subject_type', Reservation::class)
                        ->whereIn('subject_id', function ($rQuery) use ($unitId) {
                            $rQuery->select('id')
                                ->from('reservations')
                                ->where('unit_id', $unitId);
                        });
                })
                // 2. The unit itself
                    ->orWhere(function ($sub) use ($unitId) {
                        $sub->where('subject_type', Unit::class)
                            ->where('subject_id', $unitId);
                    })
                // 3. Payments for reservations in this unit
                    ->orWhere(function ($sub) use ($unitId) {
                        $sub->where('subject_type', Payment::class)
                            ->whereIn('subject_id', function ($pQuery) use ($unitId) {
                                $pQuery->select('id')
                                    ->from('payments')
                                    ->whereIn('reservation_id', function ($rQuery) use ($unitId) {
                                        $rQuery->select('id')
                                            ->from('reservations')
                                            ->where('unit_id', $unitId);
                                    });
                            });
                    });
            });
        }

        // Filter: Event (created, updated, deleted)
        if (! empty($event)) {
            $query->where('event', $event);
        }

        // Filter: Subject Type
        if (! empty($subjectType)) {
            $typeMap = [
                'reservation' => Reservation::class,
                'payment' => Payment::class,
                'unit' => Unit::class,
                'sector' => Sector::class,
                'user' => User::class,
                'guest' => Guest::class,
            ];
            if (isset($typeMap[$subjectType])) {
                $query->where('subject_type', $typeMap[$subjectType]);
            }
        }

        // Filter: Date range
        if (! empty($startDate)) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if (! empty($endDate)) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        // Filter: Search Keyword
        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('attribute_changes', 'like', "%{$search}%")
                    ->orWhereIn('causer_id', function ($uQuery) use ($search) {
                        $uQuery->select('id')
                            ->from('users')
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhere(function ($subQ) use ($search) {
                        $subQ->where('subject_type', Reservation::class)
                            ->whereIn('subject_id', function ($rQuery) use ($search) {
                                $rQuery->select('id')
                                    ->from('reservations')
                                    ->whereIn('guest_id', function ($gQuery) use ($search) {
                                        $gQuery->select('id')
                                            ->from('guests')
                                            ->where('name', 'like', "%{$search}%")
                                            ->orWhere('phone', 'like', "%{$search}%")
                                            ->orWhere('mil_code', 'like', "%{$search}%");
                                    })
                                    ->orWhereIn('unit_id', function ($unQuery) use ($search) {
                                        $unQuery->select('id')
                                            ->from('units')
                                            ->where('name', 'like', "%{$search}%");
                                    });
                            });
                    });
            });
        }

        // Paginate results
        $paginated = $query->paginate($perPage)->withQueryString();

        // Batch load subjects and causers to avoid N+1 queries
        $enrichedItems = $this->enrichActivities($paginated->getCollection());

        // Quick aggregate statistics
        $today = Carbon::today();
        $stats = [
            'total_count' => Activity::count(),
            'today_count' => Activity::whereDate('created_at', $today)->count(),
            'active_users_count' => Activity::whereNotNull('causer_id')->distinct('causer_id')->count('causer_id'),
            'events_breakdown' => [
                'created' => Activity::where('event', 'created')->count(),
                'updated' => Activity::where('event', 'updated')->count(),
                'deleted' => Activity::where('event', 'deleted')->count(),
            ],
        ];

        // Filter options
        $usersList = User::query()
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $sectorsList = Sector::query()
            ->select('id', 'name')
            ->get()
            ->sortBy(fn (Sector $s) => self::SECTOR_ORDER[$s->name] ?? 999)
            ->values();

        $unitsList = Unit::query()
            ->select('id', 'name', 'sector_id')
            ->orderBy('name')
            ->get();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'activities' => $enrichedItems,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                ],
                'stats' => $stats,
            ]);
        }

        return Inertia::render('activity-logs/index', [
            'activities' => [
                'data' => $enrichedItems,
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
            'filters' => [
                'search' => $search,
                'user_id' => $userId,
                'sector_id' => $sectorId,
                'unit_id' => $unitId,
                'event' => $event,
                'subject_type' => $subjectType,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'per_page' => $perPage,
            ],
            'stats' => $stats,
            'filterOptions' => [
                'users' => $usersList,
                'sectors' => $sectorsList,
                'units' => $unitsList,
            ],
        ]);
    }

    /**
     * Batch resolve related models and build human-friendly attributes.
     *
     * @param  Collection<int, Activity>  $activities
     * @return Collection<int, array<string, mixed>>
     */
    protected function enrichActivities(Collection $activities): Collection
    {
        if ($activities->isEmpty()) {
            return collect();
        }

        // Collect causer IDs
        $causerIds = $activities->where('causer_type', User::class)->pluck('causer_id')->filter()->unique();
        $causers = User::whereIn('id', $causerIds)->get()->keyBy('id');

        // Collect subject IDs grouped by type
        $reservationIds = $activities->where('subject_type', Reservation::class)->pluck('subject_id')->filter()->unique();
        $reservations = Reservation::with(['guest', 'unit.sector'])->whereIn('id', $reservationIds)->get()->keyBy('id');

        $paymentIds = $activities->where('subject_type', Payment::class)->pluck('subject_id')->filter()->unique();
        $payments = Payment::with(['reservation.guest', 'reservation.unit.sector'])->whereIn('id', $paymentIds)->get()->keyBy('id');

        $unitIds = $activities->where('subject_type', Unit::class)->pluck('subject_id')->filter()->unique();
        $units = Unit::with('sector')->whereIn('id', $unitIds)->get()->keyBy('id');

        $sectorIds = $activities->where('subject_type', Sector::class)->pluck('subject_id')->filter()->unique();
        $sectors = Sector::whereIn('id', $sectorIds)->get()->keyBy('id');

        $userSubjectIds = $activities->where('subject_type', User::class)->pluck('subject_id')->filter()->unique();
        $userSubjects = User::whereIn('id', $userSubjectIds)->get()->keyBy('id');

        $guestSubjectIds = $activities->where('subject_type', Guest::class)->pluck('subject_id')->filter()->unique();
        $guestSubjects = Guest::whereIn('id', $guestSubjectIds)->get()->keyBy('id');

        // Also gather any unit_ids from attribute changes for quick unit name lookup
        $changedUnitIds = collect();
        foreach ($activities as $act) {
            $changes = $this->parseChanges($act);
            foreach ($changes as $item) {
                if ($item['field'] === 'unit_id') {
                    if (! empty($item['old'])) {
                        $changedUnitIds->push((int) $item['old']);
                    }
                    if (! empty($item['new'])) {
                        $changedUnitIds->push((int) $item['new']);
                    }
                }
            }
        }
        $lookupUnits = Unit::whereIn('id', $changedUnitIds->unique())->pluck('name', 'id');

        return $activities->map(function (Activity $activity) use (
            $causers,
            $reservations,
            $payments,
            $units,
            $sectors,
            $userSubjects,
            $guestSubjects,
            $lookupUnits
        ) {
            $causerModel = $activity->causer_id ? ($causers->get($activity->causer_id)) : null;

            // Subject resolution
            $subjectInfo = [
                'type' => 'unknown',
                'type_label' => 'عنصر',
                'id' => $activity->subject_id,
                'title' => '#'.$activity->subject_id,
                'subtitle' => null,
                'unit_name' => null,
                'sector_name' => null,
            ];

            if ($activity->subject_type === Reservation::class) {
                $res = $reservations->get($activity->subject_id);
                $guestName = $res?->guest?->name ?? 'حجز محذوف أو غير متوفر';
                $unitName = $res?->unit?->name;
                $sectorName = $res?->unit?->sector?->name;

                $subjectInfo = [
                    'type' => 'reservation',
                    'type_label' => 'حجز',
                    'id' => $activity->subject_id,
                    'title' => "حجز #{$activity->subject_id} ({$guestName})",
                    'subtitle' => $unitName ? "وحدة: {$unitName} • {$sectorName}" : null,
                    'guest_name' => $guestName,
                    'unit_name' => $unitName,
                    'sector_name' => $sectorName,
                    'status' => $res?->status?->value ?? ($res?->status ?? null),
                ];
            } elseif ($activity->subject_type === Payment::class) {
                $pay = $payments->get($activity->subject_id);
                $res = $pay?->reservation;
                $unitName = $res?->unit?->name;
                $sectorName = $res?->unit?->sector?->name;
                $guestName = $res?->guest?->name;

                $subjectInfo = [
                    'type' => 'payment',
                    'type_label' => 'دفعة مالية',
                    'id' => $activity->subject_id,
                    'title' => 'دفعة #'.($pay?->id ?? $activity->subject_id).($pay?->amount ? ' ('.number_format((float) $pay->amount).' ج.م)' : ''),
                    'subtitle' => $guestName ? "النزيل: {$guestName}" : ($unitName ? "وحدة: {$unitName}" : null),
                    'unit_name' => $unitName,
                    'sector_name' => $sectorName,
                ];
            } elseif ($activity->subject_type === Unit::class) {
                $u = $units->get($activity->subject_id);
                $subjectInfo = [
                    'type' => 'unit',
                    'type_label' => 'وحدة سكنية',
                    'id' => $activity->subject_id,
                    'title' => 'وحدة: '.($u?->name ?? "#{$activity->subject_id}"),
                    'subtitle' => $u?->sector?->name ? "قطاع: {$u->sector->name}" : null,
                    'unit_name' => $u?->name,
                    'sector_name' => $u?->sector?->name,
                ];
            } elseif ($activity->subject_type === Sector::class) {
                $s = $sectors->get($activity->subject_id);
                $subjectInfo = [
                    'type' => 'sector',
                    'type_label' => 'قطاع',
                    'id' => $activity->subject_id,
                    'title' => 'قطاع: '.($s?->name ?? "#{$activity->subject_id}"),
                    'subtitle' => null,
                    'sector_name' => $s?->name,
                ];
            } elseif ($activity->subject_type === User::class) {
                $u = $userSubjects->get($activity->subject_id);
                $subjectInfo = [
                    'type' => 'user',
                    'type_label' => 'مستخدم',
                    'id' => $activity->subject_id,
                    'title' => $u?->name ?? "مستخدم #{$activity->subject_id}",
                    'subtitle' => $u?->email,
                ];
            } elseif ($activity->subject_type === Guest::class) {
                $g = $guestSubjects->get($activity->subject_id);
                $subjectInfo = [
                    'type' => 'guest',
                    'type_label' => 'نزيل',
                    'id' => $activity->subject_id,
                    'title' => $g?->name ?? "نزيل #{$activity->subject_id}",
                    'subtitle' => $g?->phone,
                ];
            }

            // Parse formatted changes
            $parsedChanges = $this->parseChanges($activity, $lookupUnits);

            // Generate user-friendly headline
            $headline = $this->generateHeadline($activity, $subjectInfo, $parsedChanges);

            return [
                'id' => $activity->id,
                'log_name' => $activity->log_name ?? 'default',
                'event' => $activity->event ?? 'updated',
                'description' => $activity->description,
                'headline' => $headline,
                'created_at' => $activity->created_at?->toIso8601String(),
                'created_at_human' => $activity->created_at?->diffForHumans(),
                'created_at_formatted' => $activity->created_at?->format('Y-m-d H:i:s'),
                'causer' => $causerModel ? [
                    'id' => $causerModel->id,
                    'name' => $causerModel->name,
                    'email' => $causerModel->email,
                    'role' => $causerModel->roles->first()?->name ?? 'مستخدم',
                ] : [
                    'id' => null,
                    'name' => 'النظام التلقائي',
                    'email' => null,
                    'role' => 'System',
                ],
                'subject' => $subjectInfo,
                'changes' => $parsedChanges,
                'raw_changes' => $activity->attribute_changes,
                'raw_properties' => $activity->properties,
            ];
        });
    }

    /**
     * Parse attribute changes into a clean list of old vs new values.
     *
     * @param  Collection<int, string>|null  $lookupUnits
     * @return array<int, array{field: string, field_label: string, old: mixed, new: mixed, old_label: string, new_label: string}>
     */
    protected function parseChanges(Activity $activity, $lookupUnits = null): array
    {
        $attributeChanges = $activity->attribute_changes;
        if (! $attributeChanges) {
            $attributeChanges = $activity->properties;
        }

        if (! $attributeChanges) {
            return [];
        }

        $changesArray = is_array($attributeChanges) ? $attributeChanges : ($attributeChanges instanceof Collection ? $attributeChanges->toArray() : json_decode((string) $attributeChanges, true));

        if (! is_array($changesArray)) {
            return [];
        }

        $attributes = $changesArray['attributes'] ?? [];
        $old = $changesArray['old'] ?? [];

        $diffs = [];
        $allFields = array_unique(array_merge(array_keys($attributes), array_keys($old)));

        // Exclude technical metadata timestamps
        $excluded = ['updated_at', 'created_at', 'remember_token', 'password', 'two_factor_secret', 'two_factor_recovery_codes'];

        foreach ($allFields as $field) {
            if (in_array($field, $excluded, true)) {
                continue;
            }

            $oldVal = $old[$field] ?? null;
            $newVal = $attributes[$field] ?? null;

            // If identical, skip
            if ($oldVal === $newVal && array_key_exists($field, $old) && array_key_exists($field, $attributes)) {
                continue;
            }

            $fieldLabel = self::FIELD_LABELS[$field] ?? $field;

            // Friendly value formatting
            $oldLabel = $this->formatFieldValue($field, $oldVal, $lookupUnits);
            $newLabel = $this->formatFieldValue($field, $newVal, $lookupUnits);

            $diffs[] = [
                'field' => $field,
                'field_label' => $fieldLabel,
                'old' => $oldVal,
                'new' => $newVal,
                'old_label' => $oldLabel,
                'new_label' => $newLabel,
            ];
        }

        return $diffs;
    }

    /**
     * Format values for readable display.
     */
    protected function formatFieldValue(string $field, mixed $val, $lookupUnits = null): string
    {
        if ($val === null || $val === '') {
            return '—';
        }

        if ($field === 'unit_id' && $lookupUnits) {
            $unitName = $lookupUnits[$val] ?? null;
            if ($unitName) {
                return "{$unitName} (#{$val})";
            }
        }

        if (in_array($field, ['total_price', 'amount'], true) && is_numeric($val)) {
            return number_format((float) $val, 2).' ج.م';
        }

        if (is_bool($val)) {
            return $val ? 'نعم' : 'لا';
        }

        if (is_array($val)) {
            return json_encode($val, JSON_UNESCAPED_UNICODE);
        }

        return (string) $val;
    }

    /**
     * Generate clear, natural Arabic headline.
     *
     * @param  array<string, mixed>  $subjectInfo
     * @param  array<int, mixed>  $changes
     */
    protected function generateHeadline(Activity $activity, array $subjectInfo, array $changes): string
    {
        $event = $activity->event ?? 'updated';
        $typeLabel = $subjectInfo['type_label'] ?? 'عنصر';
        $targetTitle = $subjectInfo['title'] ?? '';

        if ($event === 'created') {
            return "تم إنشاء {$typeLabel} جديد: {$targetTitle}";
        }

        if ($event === 'deleted') {
            return "تم حذف {$typeLabel}: {$targetTitle}";
        }

        // For updates, see if status changed specifically
        foreach ($changes as $ch) {
            if ($ch['field'] === 'status') {
                return "تغيير حالة {$typeLabel} إلى «{$ch['new_label']}» ({$targetTitle})";
            }
        }

        // If unit changed
        foreach ($changes as $ch) {
            if ($ch['field'] === 'unit_id') {
                return "نقل {$typeLabel} إلى وحدة أخرى: «{$ch['new_label']}»";
            }
        }

        $changeFieldsCount = count($changes);
        if ($changeFieldsCount > 0) {
            $firstFieldLabel = $changes[0]['field_label'];
            if ($changeFieldsCount === 1) {
                return "تعديل {$firstFieldLabel} في {$typeLabel} ({$targetTitle})";
            }

            return "تعديل {$changeFieldsCount} حقول ({$firstFieldLabel} وغيرها) في {$typeLabel}";
        }

        return "تحديث بيانات في {$typeLabel} ({$targetTitle})";
    }
}
