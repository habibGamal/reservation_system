<?php

namespace App\Http\Controllers;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\Sector;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the resort occupancy statistics dashboard.
     */
    public function index(Request $request): Response
    {
        // Resolve default current period (Friday - Thursday)
        $now = Carbon::now();
        $defaultPeriodStart = $now->isFriday()
            ? $now->copy()->toDateString()
            : $now->copy()->previous(Carbon::FRIDAY)->toDateString();
        $defaultPeriodEnd = Carbon::parse($defaultPeriodStart)->addDays(6)->toDateString();

        // Get distinct reservation periods from the database
        $availablePeriods = Reservation::query()
            ->select(['check_in', 'check_out'])
            ->distinct()
            ->orderBy('check_in', 'desc')
            ->get()
            ->map(function ($res) use ($defaultPeriodStart, $defaultPeriodEnd) {
                $start = Carbon::parse($res->check_in)->toDateString();
                $end = Carbon::parse($res->check_out)->toDateString();
                $isCurrent = ($start === $defaultPeriodStart && $end === $defaultPeriodEnd);

                return [
                    'start_date' => $start,
                    'end_date' => $end,
                    'label' => Carbon::parse($start)->format('Y/m/d').' إلى '.Carbon::parse($end)->format('Y/m/d').($isCurrent ? ' (الفوج الحالي)' : ''),
                    'is_current' => $isCurrent,
                ];
            })
            ->unique(fn ($p) => $p['start_date'].'_'.$p['end_date'])
            ->values()
            ->all();

        // If the current period exists in the list, use it; otherwise use requested dates or default
        $startDate = $request->input('start_date', $defaultPeriodStart);
        $endDate = $request->input('end_date', $defaultPeriodEnd);
        $preset = $request->input('preset'); // 'reference' or null

        // Baseline reference snapshot from the user's provided Excel image
        $referenceStats = [
            [
                'key' => 'luciel',
                'name' => 'لوسيال',
                'checked_in' => 2,
                'waiting' => 0,
                'total_booked' => 2,
                'vacant' => 6,
                'confirmed' => 0,
                'grand_total' => 8,
                'occupancy_rate' => 25.0,
            ],
            [
                'key' => 'villas',
                'name' => 'فيلات',
                'checked_in' => 17,
                'waiting' => 0,
                'total_booked' => 17,
                'vacant' => 5,
                'confirmed' => 0,
                'grand_total' => 22,
                'occupancy_rate' => 77.27,
            ],
            [
                'key' => 'hotel_1',
                'name' => 'فندق 1',
                'checked_in' => 18,
                'waiting' => 3,
                'total_booked' => 21,
                'vacant' => 3,
                'confirmed' => 0,
                'grand_total' => 24,
                'occupancy_rate' => 87.5,
            ],
            [
                'key' => 'hotel_2',
                'name' => 'فندق 2',
                'checked_in' => 19,
                'waiting' => 0,
                'total_booked' => 19,
                'vacant' => 1,
                'confirmed' => 4,
                'grand_total' => 24,
                'occupancy_rate' => 79.17,
            ],
            [
                'key' => 'hotel_3',
                'name' => 'فندق 3',
                'checked_in' => 19,
                'waiting' => 2,
                'total_booked' => 21,
                'vacant' => 7,
                'confirmed' => 2,
                'grand_total' => 30,
                'occupancy_rate' => 70.0,
            ],
            [
                'key' => 'hotel_4',
                'name' => 'فندق 4',
                'checked_in' => 22,
                'waiting' => 0,
                'total_booked' => 22,
                'vacant' => 2,
                'confirmed' => 6,
                'grand_total' => 30,
                'occupancy_rate' => 73.33,
            ],
            [
                'key' => 'hotel_5',
                'name' => 'فندق 5',
                'checked_in' => 13,
                'waiting' => 0,
                'total_booked' => 13,
                'vacant' => 5,
                'confirmed' => 0,
                'grand_total' => 18,
                'occupancy_rate' => 72.22,
            ],
            [
                'key' => 'special',
                'name' => 'مميز',
                'checked_in' => 12,
                'waiting' => 0,
                'total_booked' => 12,
                'vacant' => 4,
                'confirmed' => 0,
                'grand_total' => 16,
                'occupancy_rate' => 75.0,
            ],
            [
                'key' => 'duplex',
                'name' => 'دورين',
                'checked_in' => 43,
                'waiting' => 2,
                'total_booked' => 45,
                'vacant' => 5,
                'confirmed' => 0,
                'grand_total' => 50,
                'occupancy_rate' => 90.0,
            ],
            [
                'key' => 'hotel_6',
                'name' => 'فندق 6',
                'checked_in' => 0,
                'waiting' => 0,
                'total_booked' => 0,
                'vacant' => 0,
                'confirmed' => 0,
                'grand_total' => 0,
                'occupancy_rate' => 0.0,
            ],
        ];

        $referenceSummary = [
            'checked_in' => 165,
            'waiting' => 7,
            'total_booked' => 172,
            'vacant' => 38,
            'confirmed' => 12,
            'grand_total' => 222,
            'percentages' => [
                'checked_in' => 63.71,
                'waiting' => 2.70,
                'total_booked' => 66.41,
                'vacant' => 14.67,
                'confirmed' => 4.63,
                'operational_capacity' => 85.71,
            ],
        ];

        // Calculate statistics for the current selected period
        $user = $request->user();
        $allowedSectorIds = $user?->getAllowedSectorIds();
        $periodData = $this->calculatePeriodOccupancy($startDate, $endDate, $allowedSectorIds);

        return Inertia::render('dashboard', [
            'stats' => $preset === 'reference' ? $referenceStats : $periodData['sectors'],
            'summary' => $preset === 'reference' ? $referenceSummary : $periodData['summary'],
            'referenceStats' => $referenceStats,
            'referenceSummary' => $referenceSummary,
            'periodStats' => $periodData['sectors'],
            'periodSummary' => $periodData['summary'],
            'availablePeriods' => $availablePeriods,
            'currentPeriod' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'formatted' => Carbon::parse($startDate)->format('Y/m/d').' - '.Carbon::parse($endDate)->format('Y/m/d'),
                'is_current' => ($startDate === $defaultPeriodStart && $endDate === $defaultPeriodEnd),
            ],
            'preset' => $preset,
        ]);
    }

    /**
     * Calculate occupancy numbers for all sectors in the specified period.
     *
     * @return array{sectors: array<int, array<string, mixed>>, summary: array<string, mixed>}
     */
    protected function calculatePeriodOccupancy(string $startDate, string $endDate, ?array $allowedSectorIds = null): array
    {
        $sectorQuery = Sector::with('units');
        if ($allowedSectorIds !== null) {
            $sectorQuery->whereIn('id', $allowedSectorIds);
        }
        $sectors = $sectorQuery->get();

        // Get reservations falling inside the period
        $resQuery = Reservation::query()
            ->where('check_in', '<=', $endDate)
            ->where('check_out', '>=', $startDate);

        if ($allowedSectorIds !== null) {
            $resQuery->whereHas('unit', fn ($u) => $u->whereIn('sector_id', $allowedSectorIds));
        }

        $reservations = $resQuery->get()->groupBy('unit_id');

        $groups = [
            'لوسيال' => ['لوسيال'],
            'فيلات' => ['فيلا قديم', 'فيلا جديد'],
            'فندق 1' => ['فندق 1'],
            'فندق 2' => ['فندق 2'],
            'فندق 3' => ['فندق 3'],
            'فندق 4' => ['فندق 4'],
            'فندق 5' => ['فندق 5'],
            'مميز' => ['مميز'],
            'دورين' => ['دورين'],
            'فندق 6' => ['فندق 6'],
        ];

        $sectorRows = [];
        $totalCheckedIn = 0;
        $totalWaiting = 0;
        $totalConfirmed = 0;
        $totalVacant = 0;
        $grandTotalCapacity = 0;

        foreach ($groups as $groupName => $sectorNames) {
            $matchingSectors = $sectors->whereIn('name', $sectorNames);
            if ($allowedSectorIds !== null && $matchingSectors->isEmpty()) {
                continue;
            }
            $units = $matchingSectors->flatMap(fn ($s) => $s->units);
            $unitCount = $units->count();

            $checkedIn = 0;
            $waiting = 0;
            $confirmed = 0;

            foreach ($units as $unit) {
                $unitRes = $reservations->get($unit->id);
                if ($unitRes && $unitRes->isNotEmpty()) {
                    foreach ($unitRes as $r) {
                        $val = $r->status instanceof ReservationStatus ? $r->status->value : (string) $r->status;
                        if ($val === ReservationStatus::CHECKED_IN->value) {
                            $checkedIn++;
                            break;
                        } elseif ($val === ReservationStatus::WAITING->value) {
                            $waiting++;
                            break;
                        } elseif ($val === ReservationStatus::CONFIRMED->value) {
                            $confirmed++;
                            break;
                        }
                    }
                }
            }

            $totalBooked = $checkedIn + $waiting;
            $vacant = max(0, $unitCount - $totalBooked - $confirmed);
            $occupancyRate = $unitCount > 0 ? round(($totalBooked / $unitCount) * 100, 2) : 0.0;

            $sectorRows[] = [
                'key' => $groupName,
                'name' => $groupName,
                'checked_in' => $checkedIn,
                'waiting' => $waiting,
                'total_booked' => $totalBooked,
                'vacant' => $vacant,
                'confirmed' => $confirmed,
                'grand_total' => $unitCount,
                'occupancy_rate' => $occupancyRate,
            ];

            $totalCheckedIn += $checkedIn;
            $totalWaiting += $waiting;
            $totalConfirmed += $confirmed;
            $totalVacant += $vacant;
            $grandTotalCapacity += $unitCount;
        }

        $totalBookedSum = $totalCheckedIn + $totalWaiting;
        $baseCapacity = $grandTotalCapacity > 0 ? $grandTotalCapacity : 259;

        return [
            'sectors' => $sectorRows,
            'summary' => [
                'checked_in' => $totalCheckedIn,
                'waiting' => $totalWaiting,
                'total_booked' => $totalBookedSum,
                'vacant' => $totalVacant,
                'confirmed' => $totalConfirmed,
                'grand_total' => $grandTotalCapacity,
                'percentages' => [
                    'checked_in' => round(($totalCheckedIn / $baseCapacity) * 100, 2),
                    'waiting' => round(($totalWaiting / $baseCapacity) * 100, 2),
                    'total_booked' => round(($totalBookedSum / $baseCapacity) * 100, 2),
                    'vacant' => round(($totalVacant / $baseCapacity) * 100, 2),
                    'confirmed' => round(($totalConfirmed / $baseCapacity) * 100, 2),
                    'operational_capacity' => 100.0,
                ],
            ],
        ];
    }
}
