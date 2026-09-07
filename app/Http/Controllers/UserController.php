<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Sector;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Map permission prefixes to friendly Arabic categories and descriptions.
     *
     * @var array<string, array{label: string, icon: string}>
     */
    protected const PERMISSION_GROUPS = [
        'reservations' => ['label' => 'إدارة الحجوزات', 'icon' => 'CalendarDays'],
        'payments' => ['label' => 'المدفوعات والمستحقات', 'icon' => 'CreditCard'],
        'guests' => ['label' => 'بيانات النزلاء', 'icon' => 'Users'],
        'units' => ['label' => 'الوحدات السكنية والغرف', 'icon' => 'Building2'],
        'price_rules' => ['label' => 'قواعد وسياسات التسعير', 'icon' => 'BadgePercent'],
        'excel' => ['label' => 'استيراد وتصدير إكسيل', 'icon' => 'FileSpreadsheet'],
        'reports' => ['label' => 'التقارير والإحصائيات', 'icon' => 'BarChart3'],
        'users' => ['label' => 'إدارة المستخدمين والأدوار', 'icon' => 'ShieldCheck'],
        'activity_logs' => ['label' => 'سجلات النشاط والمراقبة', 'icon' => 'History'],
    ];

    /**
     * Display a listing of users, roles, and permissions matrix.
     */
    public function index(Request $request): Response|JsonResponse
    {
        $currentUser = $request->user();
        if (! $currentUser || ! $currentUser->can('users.manage')) {
            abort(403, 'غير مصرح لك بالوصول لإدارة المستخدمين والصلاحيات');
        }

        $search = $request->string('search')->trim()->value();
        $roleFilter = $request->string('role')->trim()->value();

        $query = User::query()->with(['roles', 'permissions', 'sectors']);

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (! empty($roleFilter)) {
            $query->whereHas('roles', function ($q) use ($roleFilter) {
                $q->where('name', $roleFilter);
            });
        }

        $users = $query->latest('id')->get()->map(function (User $user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at?->toISOString(),
                'roles' => $user->roles->pluck('name')->toArray(),
                'direct_permissions' => $user->permissions->pluck('name')->toArray(),
                'all_permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
                'assigned_sectors' => $user->sectors->map(fn ($s) => [
                    'sector_id' => $s->id,
                    'sector_name' => $s->name,
                    'permission' => $s->pivot->permission,
                ])->values()->all(),
                'has_sector_restrictions' => (bool) $user->has_sector_restrictions,
                'created_at' => $user->created_at?->toISOString(),
                'updated_at' => $user->updated_at?->toISOString(),
            ];
        });

        $roles = Role::with('permissions')
            ->withCount('users')
            ->orderBy('id')
            ->get()
            ->map(function (Role $role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'is_system' => in_array($role->name, ['Super Admin', 'Admin', 'Receptionist', 'Viewer'], true),
                    'users_count' => $role->users_count,
                    'permissions' => $role->permissions->pluck('name')->toArray(),
                ];
            });

        $allPermissions = Permission::orderBy('id')->get();

        $groupedPermissions = [];
        foreach ($allPermissions as $perm) {
            $prefix = explode('.', $perm->name)[0] ?? 'other';
            $groupMeta = self::PERMISSION_GROUPS[$prefix] ?? ['label' => 'أخرى', 'icon' => 'Key'];

            if (! isset($groupedPermissions[$prefix])) {
                $groupedPermissions[$prefix] = [
                    'key' => $prefix,
                    'label' => $groupMeta['label'],
                    'icon' => $groupMeta['icon'],
                    'permissions' => [],
                ];
            }

            $groupedPermissions[$prefix]['permissions'][] = [
                'id' => $perm->id,
                'name' => $perm->name,
                'label' => $this->getPermissionFriendlyLabel($perm->name),
            ];
        }

        $stats = [
            'total_users' => User::count(),
            'admin_users' => User::role(['Super Admin', 'Admin'])->count(),
            'receptionist_users' => User::role('Receptionist')->count(),
            'total_roles' => Role::count(),
            'total_permissions' => Permission::count(),
        ];

        $allSectors = Sector::orderBy('id')->get(['id', 'name']);

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'users' => $users,
                'roles' => $roles,
                'permissions' => array_values($groupedPermissions),
                'stats' => $stats,
                'allSectors' => $allSectors,
            ]);
        }

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'permissionGroups' => array_values($groupedPermissions),
            'allPermissions' => $allPermissions->pluck('name')->toArray(),
            'stats' => $stats,
            'allSectors' => $allSectors,
            'filters' => [
                'search' => $search,
                'role' => $roleFilter,
            ],
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(StoreUserRequest $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        $hasRestrictions = $request->has('has_sector_restrictions')
            ? $request->boolean('has_sector_restrictions')
            : ($request->has('sectors') && ! empty($request->input('sectors')));

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'has_sector_restrictions' => $hasRestrictions,
            'email_verified_at' => now(),
        ]);

        if (! empty($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        if (! empty($validated['permissions'])) {
            $user->syncPermissions($validated['permissions']);
        }

        if (isset($validated['sectors'])) {
            $syncData = [];
            foreach ($validated['sectors'] as $item) {
                if (! empty($item['sector_id']) && ! empty($item['permission'])) {
                    $syncData[$item['sector_id']] = ['permission' => $item['permission']];
                }
            }
            $user->sectors()->sync($syncData);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'تم إنشاء المستخدم بنجاح',
                'user' => $user->load(['roles', 'permissions', 'sectors']),
            ], 201);
        }

        return back()->with('success', 'تم إنشاء المستخدم بنجاح');
    }

    /**
     * Update the specified user in storage.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        // Safety Guardrail: Prevent demoting the last Admin
        if ($user->hasRole(['Super Admin', 'Admin'])) {
            $newRoles = $validated['roles'] ?? [];
            $willRemainAdmin = in_array('Super Admin', $newRoles, true) || in_array('Admin', $newRoles, true);

            if (! $willRemainAdmin) {
                $otherAdminsCount = User::where('id', '!=', $user->id)
                    ->role(['Super Admin', 'Admin'])
                    ->count();

                if ($otherAdminsCount === 0) {
                    return back()->withErrors([
                        'roles' => 'لا يمكن إزالة صلاحية المدير من هذا الحساب لأنه آخر مدير نشط في النظام.',
                    ]);
                }
            }
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        if ($request->has('has_sector_restrictions')) {
            $user->has_sector_restrictions = $request->boolean('has_sector_restrictions');
        } elseif ($request->has('sectors')) {
            $user->has_sector_restrictions = ! empty($request->input('sectors'));
        }

        $user->save();

        if (isset($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        if (isset($validated['permissions'])) {
            $user->syncPermissions($validated['permissions']);
        }

        if (isset($validated['sectors'])) {
            $syncData = [];
            foreach ($validated['sectors'] as $item) {
                if (! empty($item['sector_id']) && ! empty($item['permission'])) {
                    $syncData[$item['sector_id']] = ['permission' => $item['permission']];
                }
            }
            $user->sectors()->sync($syncData);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'تم تحديث بيانات المستخدم بنجاح',
                'user' => $user->load(['roles', 'permissions', 'sectors']),
            ]);
        }

        return back()->with('success', 'تم تحديث بيانات المستخدم بنجاح');
    }

    /**
     * Update user password specifically.
     */
    public function updatePassword(Request $request, User $user): RedirectResponse|JsonResponse
    {
        $currentUser = $request->user();
        if (! $currentUser || ! $currentUser->can('users.manage')) {
            abort(403, 'غير مصرح لك بتغيير كلمة المرور');
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'password.required' => 'كلمة المرور الجديدة مطلوبة',
            'password.min' => 'يجب ألا تقل كلمة المرور عن 8 أحرف',
            'password.confirmed' => 'تأكيد كلمة المرور غير متطابق',
        ]);

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح']);
        }

        return back()->with('success', 'تم تغيير كلمة المرور بنجاح');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, User $user): RedirectResponse|JsonResponse
    {
        $currentUser = $request->user();
        if (! $currentUser || ! $currentUser->can('users.manage')) {
            abort(403, 'غير مصرح لك بحذف المستخدمين');
        }

        // Safety Guardrail 1: Prevent user from deleting their own account
        if ($currentUser->id === $user->id) {
            return back()->withErrors([
                'user' => 'لا يمكنك حذف حسابك الشخصي الحالي.',
            ]);
        }

        // Safety Guardrail 2: Prevent deleting the last Admin/Super Admin
        if ($user->hasRole(['Super Admin', 'Admin'])) {
            $otherAdminsCount = User::where('id', '!=', $user->id)
                ->role(['Super Admin', 'Admin'])
                ->count();

            if ($otherAdminsCount === 0) {
                return back()->withErrors([
                    'user' => 'لا يمكن حذف آخر مدير متبقٍ للنظام.',
                ]);
            }
        }

        $user->delete();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'تم حذف المستخدم بنجاح']);
        }

        return back()->with('success', 'تم حذف المستخدم بنجاح');
    }

    /**
     * Translate technical permission names to friendly Arabic labels.
     */
    protected function getPermissionFriendlyLabel(string $name): string
    {
        return match ($name) {
            'reservations.view' => 'عرض الحجوزات والبحث',
            'reservations.create' => 'إنشاء حجز جديد',
            'reservations.edit' => 'تعديل بيانات الحجز',
            'reservations.update_status' => 'تحديث حالة الحجز',
            'reservations.delete' => 'إلغاء وحذف الحجز',
            'reservations.override_price' => 'تعديل وتخطي الأسعار التلقائية',
            'payments.create' => 'تسجيل وتحصيل المدفوعات',
            'payments.delete' => 'حذف وإلغاء المدفوعات',
            'guests.manage' => 'إدارة النزلاء وسجلاتهم',
            'units.manage' => 'إدارة الوحدات والغرف',
            'price_rules.manage' => 'إدارة قواعد وسياسات التسعير',
            'excel.import' => 'استيراد بيانات الحجوزات من إكسيل',
            'reports.export' => 'تصدير التقارير والإحصائيات',
            'users.manage' => 'إدارة المستخدمين وتوزيع الصلاحيات',
            'activity_logs.view' => 'عرض سجلات التدقيق والمراقبة',
            default => $name,
        };
    }
}
