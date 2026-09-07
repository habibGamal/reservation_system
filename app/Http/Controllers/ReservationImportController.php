<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportExcelReservationRequest;
use App\Services\Excel\ExcelReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReservationImportController extends Controller
{
    public function __construct(
        protected ExcelReservationService $excelService
    ) {}

    /**
     * Handle bulk Excel reservation import.
     */
    public function import(ImportExcelReservationRequest $request): RedirectResponse
    {
        try {
            $result = $this->excelService->import(
                $request->file('file'),
                $request->validated()
            );

            return redirect()->route('reservations.index')
                ->with('success', $result['message']);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return redirect()->back()
                ->withErrors([
                    'import_errors' => ['حدث خطأ غير متوقع أثناء معالجة الملف: '.$e->getMessage()],
                ]);
        }
    }

    /**
     * Preview Excel file rows and validation without persisting.
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:15360', 'extensions:xls,xlsx,csv,xml'],
            'check_in' => ['nullable', 'date', 'date_format:Y-m-d'],
            'check_out' => ['nullable', 'date', 'date_format:Y-m-d'],
        ]);

        try {
            $preview = $this->excelService->preview(
                $request->file('file'),
                $validated
            );

            return response()->json([
                'success' => true,
                'data' => $preview,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
