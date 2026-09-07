<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * Protected system roles that cannot be deleted.
     *
     * @var list<string>
     */
    protected const SYSTEM_ROLES = [
        'Super Admin',
        'Admin',
        'Receptionist',
        'Viewer',
    ];

    /**
     * Store a newly created role in storage.
     */
    public function store(StoreRoleRequest $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'تم إنشاء الدور بنجاح',
                'role' => $role->load('permissions'),
            ], 201);
        }

        return back()->with('success', 'تم إنشاء الدور بنجاح');
    }

    /**
     * Update the specified role in storage.
     */
    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        // If it's a system role, prevent renaming it
        $isSystemRole = in_array($role->name, self::SYSTEM_ROLES, true);
        if (! $isSystemRole) {
            $role->name = $validated['name'];
            $role->save();
        }

        if (isset($validated['permissions'])) {
            // Super Admin always maintains all permissions
            if ($role->name === 'Super Admin') {
                $role->syncPermissions(Permission::all());
            } else {
                $role->syncPermissions($validated['permissions']);
            }
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'تم تحديث الدور والصلاحيات بنجاح',
                'role' => $role->load('permissions'),
            ]);
        }

        return back()->with('success', 'تم تحديث الدور والصلاحيات بنجاح');
    }

    /**
     * Remove the specified role from storage.
     */
    public function destroy(Request $request, Role $role): RedirectResponse|JsonResponse
    {
        $currentUser = $request->user();
        if (! $currentUser || ! $currentUser->can('users.manage')) {
            abort(403, 'غير مصرح لك بحذف الأدوار');
        }

        // Safety Guardrail 1: Prevent deleting system roles
        if (in_array($role->name, self::SYSTEM_ROLES, true)) {
            return back()->withErrors([
                'role' => 'لا يمكن حذف الأدوار الأساسية الخاصة بالنظام.',
            ]);
        }

        // Safety Guardrail 2: Prevent deleting role if assigned to users
        if ($role->users()->count() > 0) {
            return back()->withErrors([
                'role' => "لا يمكن حذف الدور لأنه مرتبط بـ {$role->users()->count()} مستخدم. يرجى نقل المستخدمين لدور آخر أولاً.",
            ]);
        }

        $role->delete();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'تم حذف الدور بنجاح']);
        }

        return back()->with('success', 'تم حذف الدور بنجاح');
    }
}
