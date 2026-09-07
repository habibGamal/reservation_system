<?php

namespace App\Http\Controllers;

use App\Enums\MembershipType;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReservationPriceController extends Controller
{
    /**
     * Calculate stay duration, nightly rate, and dynamic total price preview.
     */
    public function calculate(Request $request, PricingService $pricingService): JsonResponse
    {
        $validated = $request->validate([
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'membership' => ['required', 'string', Rule::in(MembershipType::values())],
            'check_in' => ['required', 'date', 'date_format:Y-m-d', 'before:check_out'],
            'check_out' => ['required', 'date', 'date_format:Y-m-d', 'after:check_in'],
        ], [
            'unit_id.required' => 'يرجى اختيار الوحدة السكنية',
            'membership.required' => 'يرجى اختيار فئة العضوية',
            'check_in.required' => 'تاريخ الوصول مطلوب',
            'check_out.required' => 'تاريخ المغادرة مطلوب',
        ]);

        $calculation = $pricingService->calculate(
            (int) $validated['unit_id'],
            $validated['membership'],
            $validated['check_in'],
            $validated['check_out']
        );

        return response()->json($calculation);
    }
}
