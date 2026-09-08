<?php

namespace App\Http\Requests;

use App\Enums\MembershipType;
use App\Enums\PaymentMethod;
use App\Enums\ReservationStatus;
use App\Enums\ReservationType;
use App\Models\Unit;
use App\Services\AvailabilityService;
use App\Services\PricingService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        if ($this->has('unit_id')) {
            $unit = Unit::find($this->input('unit_id'));
            if ($unit && ! $user->canEditSector($unit->sector_id)) {
                return false;
            }
        }

        return $user->can('reservations.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'guest_id' => ['required', 'integer', 'exists:guests,id'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'check_in' => ['required', 'date', 'date_format:Y-m-d', 'before:check_out'],
            'check_out' => ['required', 'date', 'date_format:Y-m-d', 'after:check_in'],
            'status' => ['required', 'string', Rule::in(ReservationStatus::values())],
            'type' => ['required', 'string', Rule::in(ReservationType::values())],
            'membership' => ['required', 'string', Rule::in(MembershipType::values())],
            'enter_from_gates' => ['nullable', 'boolean'],
            'has_meals' => ['nullable', 'boolean'],
            'meals_persons_count' => ['nullable', 'integer', 'min:1', 'max:50'],
            'meals_start_date' => ['nullable', 'required_if:has_meals,true', 'date', 'date_format:Y-m-d', 'after_or_equal:check_in', 'before_or_equal:check_out'],
            'meals_end_date' => ['nullable', 'required_if:has_meals,true', 'date', 'date_format:Y-m-d', 'after_or_equal:meals_start_date', 'before_or_equal:check_out'],
            'meals_rate_per_night' => ['nullable', 'numeric', 'min:0'],
            'meals_total_price' => ['nullable', 'numeric', 'min:0'],
            'extra_fees' => ['nullable', 'array'],
            'extra_fees.*.description' => ['required_with:extra_fees', 'string', 'max:255'],
            'extra_fees.*.amount' => ['required_with:extra_fees', 'numeric', 'gt:0'],
            'total_price' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'initial_payment' => ['nullable', 'array'],
            'initial_payment.amount' => ['nullable', 'numeric', 'gte:0'],
            'initial_payment.method' => ['nullable', 'string', Rule::in(PaymentMethod::values())],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:20480', 'mimes:jpeg,png,jpg,webp,gif,bmp,pdf'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $unitId = (int) $this->input('unit_id');
            $checkIn = (string) $this->input('check_in');
            $checkOut = (string) $this->input('check_out');

            $availabilityService = app(AvailabilityService::class);
            $conflict = $availabilityService->findConflictingReservation($unitId, $checkIn, $checkOut);

            if ($conflict) {
                $unitName = $conflict->unit?->name ?? (string) $unitId;
                $guestName = $conflict->guest?->name ?? 'نزيل آخر';
                $conflictIn = is_string($conflict->check_in) ? $conflict->check_in : $conflict->check_in->format('Y-m-d');
                $conflictOut = is_string($conflict->check_out) ? $conflict->check_out : $conflict->check_out->format('Y-m-d');

                $validator->errors()->add(
                    'unit_id',
                    "الوحدة '{$unitName}' محجوزة بالفعل من قبل النزيل '{$guestName}' من {$conflictIn} إلى {$conflictOut}."
                );
            }

            // Verify authorized price override if unit has pricing rules
            $pricingService = app(PricingService::class);
            $membership = (string) $this->input('membership');
            $totalPrice = (float) $this->input('total_price');
            $hasMeals = (bool) $this->boolean('has_meals');
            $mealsPersonsCount = $this->filled('meals_persons_count') ? (int) $this->input('meals_persons_count') : 4;
            $mealsStartDate = $this->input('meals_start_date');
            $mealsEndDate = $this->input('meals_end_date');
            $extraFees = (array) $this->input('extra_fees', []);

            $calculation = $pricingService->calculate(
                $unitId,
                $membership,
                $checkIn,
                $checkOut,
                $hasMeals,
                $mealsStartDate,
                $mealsEndDate,
                $extraFees,
                $mealsPersonsCount
            );
            $expectedTotal = (float) $calculation['total_price'];

            if ($calculation['price_rule_id'] !== null && $expectedTotal > 0) {
                $hasOverridePermission = $this->user()?->can('reservations.override_price') ?? false;
                $isOverridden = abs($totalPrice - $expectedTotal) > 0.01;

                if ($isOverridden && ! $hasOverridePermission) {
                    $formattedExpected = number_format($expectedTotal, 2);
                    $validator->errors()->add(
                        'total_price',
                        "لا تملك صلاحية تعديل السعر المعتمد للنظام. السعر المحسوب لهذه الفترة هو {$formattedExpected} ج.م."
                    );
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'guest_id.required' => 'يرجى اختيار النزيل',
            'guest_id.exists' => 'النزيل المحدد غير موجود بالنظام',
            'unit_id.required' => 'يرجى اختيار الوحدة السكنية',
            'unit_id.exists' => 'الوحدة السكنية المحددة غير موجودة',
            'check_in.required' => 'تاريخ الوصول مطلوب',
            'check_in.before' => 'تاريخ الوصول يجب أن يكون قبل تاريخ المغادرة',
            'check_out.required' => 'تاريخ المغادرة مطلوب',
            'check_out.after' => 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول',
            'status.required' => 'حالة الحجز مطلوبة',
            'total_price.required' => 'إجمالي المبلغ مطلوب',
            'total_price.min' => 'إجمالي المبلغ يجب ألا يقل عن 0',
            'attachments.*.file' => 'الملف المرفق غير صالح',
            'attachments.*.max' => 'حجم المرفق يجب ألا يتجاوز 20 ميجابايت',
            'attachments.*.mimes' => 'صيغة المرفق غير مدعومة. الصيغ المسموح بها: JPG, PNG, WebP, GIF, PDF',
        ];
    }
}
