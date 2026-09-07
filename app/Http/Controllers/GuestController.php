<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGuestRequest;
use App\Models\Guest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GuestController extends Controller
{
    /**
     * Search and list guests with optional search keyword.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || (! $user->can('guests.manage') && ! $user->can('reservations.view'))) {
            abort(403, 'غير مصرح لك بالوصول لبيانات النزلاء');
        }

        $search = $request->string('search')->trim()->value() ?: $request->string('q')->trim()->value();

        $query = Guest::query();

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('mil_code', 'like', "%{$search}%");
            });
        }

        $guests = $query->withCount('reservations')
            ->latest('id')
            ->limit(50)
            ->get();

        return response()->json($guests);
    }

    /**
     * Store a newly created guest in storage.
     */
    public function store(StoreGuestRequest $request): JsonResponse|RedirectResponse
    {
        $guest = Guest::create($request->validated());
        $guest->loadCount('reservations');

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'message' => 'تم تسجيل النزيل بنجاح',
                'guest' => $guest,
            ], 201);
        }

        return back()->with('success', 'تم تسجيل النزيل بنجاح')->with('guest', $guest);
    }

    /**
     * Display the specified guest along with their complete reservation history.
     */
    public function show(Request $request, Guest $guest): JsonResponse
    {
        $user = $request->user();
        if (! $user || (! $user->can('guests.manage') && ! $user->can('reservations.view'))) {
            abort(403, 'غير مصرح لك بعرض الملف الشخصي للنزيل');
        }

        $guest->load([
            'reservations' => function ($q) {
                $q->with(['unit.sector', 'payments'])->latest('check_in');
            },
        ]);
        $guest->loadCount('reservations');

        return response()->json([
            'guest' => $guest,
        ]);
    }

    /**
     * Update the specified guest in storage.
     */
    public function update(Request $request, Guest $guest): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        if (! $user || (! $user->can('guests.manage') && ! $user->can('reservations.edit'))) {
            abort(403, 'غير مصرح لك بتعديل بيانات النزيل');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:50'],
            'mil_code' => ['nullable', 'string', 'max:100'],
        ]);

        $guest->update($validated);

        if (! $request->header('X-Inertia') && ($request->wantsJson() || $request->ajax())) {
            return response()->json([
                'message' => 'تم تحديث بيانات النزيل بنجاح',
                'guest' => $guest->fresh(),
            ]);
        }

        return back()->with('success', 'تم تحديث بيانات النزيل بنجاح');
    }
}
