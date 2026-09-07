<?php

namespace App\Http\Requests;

use App\Enums\PaymentMethod;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('payments.create') ?? true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', 'string', Rule::in(PaymentMethod::values())],
            'reference_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.required' => 'قيمة الدفعة مطلوبة',
            'amount.numeric' => 'يجب أن تكون قيمة الدفعة رقماً',
            'amount.gt' => 'يجب أن تكون قيمة الدفعة أكبر من صفر',
            'method.required' => 'طريقة الدفع مطلوبة',
            'method.in' => 'طريقة الدفع المحددة غير صالحة',
            'reference_number.max' => 'رقم الإيصال / الحوالة يجب ألا يتجاوز 100 حرف',
        ];
    }
}
