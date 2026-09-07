<?php

namespace App\Http\Controllers;

use App\Models\PriceRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PriceRuleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $priceRules = PriceRule::withCount('units')->latest('id')->get();

        return response()->json($priceRules);
    }

    /**
     * Store a newly created price rule in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->can('price_rules.manage') ?? true, 403);

        $type = $request->input('type', PriceRule::TYPE_UNIT);

        if ($type === PriceRule::TYPE_MEAL) {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', 'string', 'in:unit,meal'],
                'rules' => ['required', 'array'],
                'rules.price_per_night' => ['required', 'numeric', 'min:0'],
            ]);
        } else {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'type' => ['nullable', 'string', 'in:unit,meal'],
                'rules' => ['required', 'array'],
                'rules.عضو' => ['required', 'numeric', 'min:0'],
                'rules.غير عضو' => ['required', 'numeric', 'min:0'],
                'rules.مرافق' => ['required', 'numeric', 'min:0'],
                'rules.مدني' => ['required', 'numeric', 'min:0'],
            ], [
                'name.required' => 'اسم قاعدة التسعير مطلوب',
                'rules.required' => 'قواعد التسعير مطلوبة لجميع الفئات',
            ]);
        }

        PriceRule::create($validated);

        return redirect()->back()->with('success', 'تم إنشاء قاعدة التسعير بنجاح');
    }

    /**
     * Update the specified price rule in storage.
     */
    public function update(Request $request, PriceRule $priceRule): RedirectResponse
    {
        abort_unless($request->user()?->can('price_rules.manage') ?? true, 403);

        $type = $request->input('type', $priceRule->type ?? PriceRule::TYPE_UNIT);

        if ($type === PriceRule::TYPE_MEAL) {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'type' => ['nullable', 'string', 'in:unit,meal'],
                'rules' => ['required', 'array'],
                'rules.price_per_night' => ['required', 'numeric', 'min:0'],
            ]);
        } else {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'type' => ['nullable', 'string', 'in:unit,meal'],
                'rules' => ['required', 'array'],
                'rules.عضو' => ['required', 'numeric', 'min:0'],
                'rules.غير عضو' => ['required', 'numeric', 'min:0'],
                'rules.مرافق' => ['required', 'numeric', 'min:0'],
                'rules.مدني' => ['required', 'numeric', 'min:0'],
            ]);
        }

        $priceRule->update($validated);

        return redirect()->back()->with('success', 'تم تحديث قاعدة التسعير بنجاح');
    }

    /**
     * Remove the specified price rule from storage.
     */
    public function destroy(Request $request, PriceRule $priceRule): RedirectResponse
    {
        abort_unless($request->user()?->can('price_rules.manage') ?? true, 403);

        $priceRule->delete();

        return redirect()->back()->with('success', 'تم حذف قاعدة التسعير بنجاح');
    }
}
