<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UnitController extends Controller
{
    /**
     * Display a listing of resort units.
     */
    public function index(Request $request): JsonResponse
    {
        $allowed = $request->user()?->getAllowedSectorIds();
        $query = Unit::with(['sector', 'priceRule']);
        if ($allowed !== null) {
            $query->whereIn('sector_id', $allowed);
        }
        $units = $query->get();

        return response()->json($units);
    }

    /**
     * Store a newly created unit.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->can('units.manage') ?? true, 403);

        $sectorId = (int) $request->input('sector_id');
        if (! $request->user()?->canEditSector($sectorId)) {
            abort(403, 'غير مصرح لك بإضافة وحدات في هذا القطاع');
        }

        $validated = $request->validate([
            'sector_id' => ['required', 'integer', 'exists:sectors,id'],
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('units', 'name')->where('sector_id', $request->input('sector_id')),
            ],
            'rooms_count' => ['required', 'integer', 'min:1', 'max:50'],
            'price_rule_id' => ['nullable', 'integer', 'exists:price_rules,id'],
        ], [
            'sector_id.required' => 'القطاع مطلوب',
            'sector_id.exists' => 'القطاع المحدد غير موجود',
            'name.required' => 'اسم أو رقم الوحدة مطلوب',
            'name.unique' => 'اسم أو رقم الوحدة موجود مسبقاً في هذا القطاع',
            'rooms_count.required' => 'عدد الغرف مطلوب',
            'rooms_count.min' => 'عدد الغرف يجب أن يكون 1 على الأقل',
            'price_rule_id.exists' => 'قاعدة التسعير المحددة غير موجودة',
        ]);

        Unit::create($validated);

        return redirect()->back()->with('success', 'تم إنشاء الوحدة السكنية بنجاح');
    }

    /**
     * Update the specified unit in storage.
     */
    public function update(Request $request, Unit $unit): RedirectResponse
    {
        abort_unless($request->user()?->can('units.manage') ?? true, 403);

        if (! $request->user()?->canEditSector($unit->sector_id)) {
            abort(403, 'غير مصرح لك بتعديل وحدات هذا القطاع');
        }

        if ($request->filled('sector_id') && (int) $request->input('sector_id') !== $unit->sector_id) {
            if (! $request->user()?->canEditSector((int) $request->input('sector_id'))) {
                abort(403, 'غير مصرح لك بنقل الوحدة إلى هذا القطاع');
            }
        }

        $sectorId = $request->input('sector_id', $unit->sector_id);

        $validated = $request->validate([
            'sector_id' => ['sometimes', 'integer', 'exists:sectors,id'],
            'name' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('units', 'name')->where('sector_id', $sectorId)->ignore($unit->id),
            ],
            'rooms_count' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'price_rule_id' => ['nullable', 'integer', 'exists:price_rules,id'],
        ], [
            'sector_id.exists' => 'القطاع المحدد غير موجود',
            'name.unique' => 'اسم أو رقم الوحدة موجود مسبقاً في هذا القطاع',
            'rooms_count.min' => 'عدد الغرف يجب أن يكون 1 على الأقل',
            'price_rule_id.exists' => 'قاعدة التسعير المحددة غير موجودة',
        ]);

        $unit->update($validated);

        return redirect()->back()->with('success', 'تم تحديث بيانات الوحدة السكنية بنجاح');
    }

    /**
     * Remove the specified unit from storage.
     */
    public function destroy(Request $request, Unit $unit): RedirectResponse
    {
        abort_unless($request->user()?->can('units.manage') ?? true, 403);

        if (! $request->user()?->canEditSector($unit->sector_id)) {
            abort(403, 'غير مصرح لك بحذف وحدات هذا القطاع');
        }

        if ($unit->reservations()->exists()) {
            return redirect()->back()->with('error', 'لا يمكن حذف هذه الوحدة لأنها مسجلة في حجوزات سابقة أو حالية. يمكنك تعطيل استخدامها أو تعديل بياناتها بدلاً من ذلك.');
        }

        $unit->delete();

        return redirect()->back()->with('success', 'تم حذف الوحدة السكنية بنجاح');
    }

    /**
     * Bulk assign a price rule to multiple units.
     */
    public function bulkAssignPriceRule(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->can('units.manage') ?? true, 403);

        $validated = $request->validate([
            'unit_ids' => ['required', 'array', 'min:1'],
            'unit_ids.*' => ['integer', 'exists:units,id'],
            'price_rule_id' => ['nullable', 'integer', 'exists:price_rules,id'],
        ], [
            'unit_ids.required' => 'يرجى تحديد وحدة واحدة على الأقل',
            'price_rule_id.exists' => 'قاعدة التسعير المحددة غير موجودة',
        ]);

        $editable = $request->user()?->getEditableSectorIds();
        if ($editable !== null) {
            $unauthorizedUnits = Unit::whereIn('id', $validated['unit_ids'])->whereNotIn('sector_id', $editable)->exists();
            if ($unauthorizedUnits) {
                abort(403, 'توجد وحدات محددة تتبع قطاعات غير مصرح لك بتعديلها');
            }
        }

        Unit::whereIn('id', $validated['unit_ids'])->update([
            'price_rule_id' => $validated['price_rule_id'],
        ]);

        return redirect()->back()->with('success', 'تم تحديث قاعدة التسعير للوحدات المحددة بنجاح');
    }
}
