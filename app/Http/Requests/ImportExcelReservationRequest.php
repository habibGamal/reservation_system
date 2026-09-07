<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportExcelReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('excel.import') ?? ($this->user()?->can('reservations.create') ?? true);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:15360', // 15MB
                'extensions:xls,xlsx,csv,xml',
            ],
            'check_in' => ['required', 'date', 'date_format:Y-m-d', 'before:check_out'],
            'check_out' => ['required', 'date', 'date_format:Y-m-d', 'after:check_in'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'يرجى تحديد ملف الإكسيل المراد استيراده',
            'file.file' => 'الملف المحدد غير صالح',
            'file.max' => 'حجم الملف يجب ألا يتجاوز 15 ميجابايت',
            'file.extensions' => 'صيغة الملف غير مدعومة. الصيغ المعتمدة: xls, xlsx, csv, xml',
            'check_in.required' => 'تاريخ الوصول مطلوب',
            'check_in.date' => 'تاريخ الوصول غير صالح',
            'check_in.date_format' => 'صيغة تاريخ الوصول يجب أن تكون YYYY-MM-DD',
            'check_in.before' => 'تاريخ الوصول يجب أن يكون قبل تاريخ المغادرة',
            'check_out.required' => 'تاريخ المغادرة مطلوب',
            'check_out.date' => 'تاريخ المغادرة غير صالح',
            'check_out.date_format' => 'صيغة تاريخ المغادرة يجب أن تكون YYYY-MM-DD',
            'check_out.after' => 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول',
        ];
    }
}
