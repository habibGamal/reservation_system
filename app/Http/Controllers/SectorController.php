<?php

namespace App\Http\Controllers;

use App\Models\Sector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SectorController extends Controller
{
    /**
     * Store a newly created sector.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->can('units.manage') ?? true, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:sectors,name'],
            'has_meals' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'اسم القطاع مطلوب',
            'name.unique' => 'اسم هذا القطاع مسجل مسبقاً',
        ]);

        Sector::create($validated);

        return redirect()->back()->with('success', 'تم إنشاء القطاع بنجاح');
    }

    /**
     * Update the specified sector.
     */
    public function update(Request $request, Sector $sector): RedirectResponse
    {
        abort_unless($request->user()?->canEditSector($sector), 403, 'غير مصرح لك بتعديل بيانات هذا القطاع');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('sectors', 'name')->ignore($sector->id)],
            'has_meals' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'اسم القطاع مطلوب',
            'name.unique' => 'اسم هذا القطاع مسجل مسبقاً',
        ]);

        $sector->update($validated);

        return redirect()->back()->with('success', 'تم تحديث بيانات القطاع بنجاح');
    }

    /**
     * Remove the specified sector.
     */
    public function destroy(Request $request, Sector $sector): RedirectResponse
    {
        abort_unless($request->user()?->canEditSector($sector), 403, 'غير مصرح لك بحذف هذا القطاع');

        if ($sector->units()->exists()) {
            return redirect()->back()->with('error', 'لا يمكن حذف هذا القطاع لأنه يحتوي على وحدات سكنية مرتبطة به. يرجى حذف أو نقل الوحدات أولاً.');
        }

        $sector->delete();

        return redirect()->back()->with('success', 'تم حذف القطاع بنجاح');
    }
}
