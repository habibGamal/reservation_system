<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePaymentRequest;
use App\Models\Payment;
use App\Models\Reservation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    /**
     * Store a newly created payment for the specified reservation.
     */
    public function store(StorePaymentRequest $request, Reservation $reservation): RedirectResponse
    {
        $payment = DB::transaction(function () use ($request, $reservation) {
            return $reservation->payments()->create($request->validated());
        });

        $amountFormatted = number_format((float) $payment->amount, 2);

        return redirect()->back()
            ->with('success', "تم تسجيل الدفعة بنجاح بقيمة {$amountFormatted} ج.م");
    }

    /**
     * Remove the specified payment from storage.
     */
    public function destroy(Request $request, Payment $payment): RedirectResponse
    {
        abort_unless($request->user()?->can('payments.delete') ?? true, 403);

        DB::transaction(function () use ($payment) {
            $payment->delete();
        });

        return redirect()->back()
            ->with('success', 'تم حذف الدفعة بنجاح');
    }
}
