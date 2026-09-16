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
            'membership' => ['required', 'string', 'max:100'],
            'check_in' => ['required', 'date', 'date_format:Y-m-d', 'before:check_out'],
            'check_out' => ['required', 'date', 'date_format:Y-m-d', 'after:check_in'],
            'unit_persons_count' => ['nullable', 'integer', 'min:1', 'max:50'],
        ], [
            'unit_id.required' => 'يرجى اختيار الوحدة السكنية',
            'membership.required' => 'يرجى اختيار فئة العضوية',
            'check_in.required' => 'تاريخ الوصول مطلوب',
            'check_out.required' => 'تاريخ المغادرة مطلوب',
        ]);

        $membership = (string) $validated['membership'];
        if (! in_array($membership, MembershipType::values(), true)) {
            $unit = \App\Models\Unit::with('priceRule')->find((int) $validated['unit_id']);
            $rules = $unit?->priceRule?->rules;
            if (! is_array($rules) || ! isset($rules[$membership])) {
                return response()->json([
                    'message' => "فئة التسعير '{$membership}' غير متوفرة في قاعدة تسعير هذه الوحدة.",
                    'errors' => [
                        'membership' => ["فئة التسعير '{$membership}' غير متوفرة في قاعدة تسعير هذه الوحدة."],
                    ],
                ], 422);
            }
        }

        $calculation = $pricingService->calculate(
            (int) $validated['unit_id'],
            $validated['membership'],
            $validated['check_in'],
            $validated['check_out'],
            false,
            null,
            null,
            [],
            null,
            isset($validated['unit_persons_count']) ? (int) $validated['unit_persons_count'] : null
        );

        return response()->json($calculation);
    }
}
