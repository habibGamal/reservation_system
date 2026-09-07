<?php

namespace App\Http\Controllers;

use App\Models\PriceRule;
use App\Models\Sector;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResortManagementController extends Controller
{
    /**
     * Display the resort management page with sectors, units, and price rules.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $allowed = $user?->getAllowedSectorIds();

        $sectorQuery = Sector::withCount('units')
            ->withSum('units', 'rooms_count');

        $unitQuery = Unit::with(['sector', 'priceRule'])
            ->withCount('reservations');

        if ($allowed !== null) {
            $sectorQuery->whereIn('id', $allowed);
            $unitQuery->whereIn('sector_id', $allowed);
        }

        $sectors = $sectorQuery->get();
        $units = $unitQuery->get();

        $priceRules = PriceRule::withCount('units')
            ->latest('id')
            ->get();

        return Inertia::render('resort-management/index', [
            'sectors' => $sectors,
            'units' => $units,
            'priceRules' => $priceRules,
        ]);
    }
}
