import React, { useEffect, useMemo, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import dayjs from 'dayjs';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  CalculatorOutlined,
  CalendarOutlined,
  CoffeeOutlined,
  DeleteOutlined,
  DollarOutlined,
  EyeOutlined,
  HomeOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  LockOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UnlockOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { GuestCombobox } from '@/components/reservations/guest-combobox';
import {
  Guest,
  MembershipType,
  Reservation,
  ReservationStatus,
  ReservationType,
  Sector,
  SharedProps,
  Unit,
} from '@/types/reservation';

const { Text } = Typography;

interface ReservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Reservation | null;
  defaultUnitId?: number | null;
  defaultCheckIn?: string | null;
  defaultCheckOut?: string | null;
  units: Unit[];
  guests: Guest[];
  sectors: Sector[];
  existingReservations?: Reservation[];
  onViewGuestDetails?: (guest: Guest) => void;
}

export function ReservationFormDialog({
  open,
  onOpenChange,
  reservation,
  defaultUnitId,
  defaultCheckIn,
  defaultCheckOut,
  units,
  guests,
  sectors,
  existingReservations = [],
  onViewGuestDetails,
}: ReservationFormDialogProps) {
  const isEditing = Boolean(reservation);
  const { message } = App.useApp();

  const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
    guest_id: reservation?.guest_id ? String(reservation.guest_id) : '',
    unit_id: reservation?.unit_id ? String(reservation.unit_id) : (defaultUnitId ? String(defaultUnitId) : ''),
    check_in: reservation?.check_in ?? (defaultCheckIn ?? ''),
    check_out: reservation?.check_out ?? (defaultCheckOut ?? ''),
    status: (reservation?.status ?? 'ثابت') as ReservationStatus,
    type: (reservation?.type ?? 'فرع') as ReservationType,
    membership: (reservation?.membership ?? 'عضو') as MembershipType,
    enter_from_gates: Boolean(reservation?.enter_from_gates ?? false),
    has_meals: Boolean(reservation?.has_meals ?? false),
    meals_persons_count: reservation?.meals_persons_count ? Number(reservation.meals_persons_count) : 4,
    meals_start_date: reservation?.meals_start_date ?? (defaultCheckIn ?? ''),
    meals_end_date: reservation?.meals_end_date ?? (defaultCheckOut ?? ''),
    extra_fees: (reservation?.extra_fees ?? []).map((fee) => ({
      id: fee.id,
      description: fee.description,
      amount: String(fee.amount),
    })) as Array<{ id?: number; description: string; amount: string }>,
    total_price: reservation?.total_price ? String(reservation.total_price) : '',
    notes: reservation?.notes ?? '',
  });

  const { auth } = usePage<SharedProps>().props;
  const user = auth?.user;
  const canOverridePrice = Boolean(
    user?.roles?.includes('Super Admin') ||
    user?.roles?.includes('Admin') ||
    user?.permissions?.includes('reservations.override_price')
  );

  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  const [isPriceOverridden, setIsPriceOverridden] = useState<boolean>(false);

  // Selected unit object
  const selectedUnit = useMemo(() => {
    return units.find((u) => String(u.id) === data.unit_id);
  }, [units, data.unit_id]);

  // Determine current active sector and whether meals apply
  const currentSector = useMemo(() => {
    if (selectedUnit?.sector) return selectedUnit.sector;
    if (reservation?.unit?.sector) return reservation.unit.sector;
    if (selectedSectorId && selectedSectorId !== 'all') {
      return sectors.find((s) => String(s.id) === selectedSectorId) ?? null;
    }
    return null;
  }, [selectedUnit, reservation, selectedSectorId, sectors]);

  const sectorHasMeals = Boolean(
    currentSector?.has_meals || currentSector?.name === 'فندق 6' || selectedUnit?.sector?.has_meals
  );

  // Reset form when dialog opens or editing reservation changes
  useEffect(() => {
    if (open) {
      if (reservation) {
        setData({
          guest_id: String(reservation.guest_id),
          unit_id: String(reservation.unit_id),
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          status: reservation.status,
          type: reservation.type,
          membership: reservation.membership ?? 'عضو',
          enter_from_gates: Boolean(reservation.enter_from_gates),
          has_meals: Boolean(reservation.has_meals),
          meals_persons_count: reservation.meals_persons_count ? Number(reservation.meals_persons_count) : 4,
          meals_start_date: reservation.meals_start_date || reservation.check_in,
          meals_end_date: reservation.meals_end_date || reservation.check_out,
          extra_fees: (reservation.extra_fees ?? []).map((fee) => ({
            id: fee.id,
            description: fee.description,
            amount: String(fee.amount),
          })),
          total_price: String(reservation.total_price),
          notes: reservation.notes ?? '',
        });
        const currentUnit = units.find((u) => u.id === reservation.unit_id);
        if (currentUnit) {
          setSelectedSectorId(String(currentUnit.sector_id));
        }
        setIsPriceOverridden(false);
      } else {
        reset();
        clearErrors();
        setIsPriceOverridden(false);

        const targetUnitId = defaultUnitId ? String(defaultUnitId) : '';
        const targetUnit = units.find((u) => String(u.id) === targetUnitId);
        const hasMealsDefault = Boolean(targetUnit?.sector?.has_meals || targetUnit?.sector?.name === 'فندق 6');

        let initialCheckIn = defaultCheckIn ?? '';
        let initialCheckOut = defaultCheckOut ?? '';
        if (initialCheckIn && !initialCheckOut) {
          const d = new Date(initialCheckIn);
          d.setDate(d.getDate() + 1);
          initialCheckOut = d.toISOString().split('T')[0];
        }

        setData({
          guest_id: '',
          unit_id: targetUnitId,
          check_in: initialCheckIn,
          check_out: initialCheckOut,
          status: 'ثابت',
          type: 'فرع',
          membership: 'عضو',
          enter_from_gates: false,
          has_meals: hasMealsDefault,
          meals_persons_count: 4,
          meals_start_date: hasMealsDefault ? initialCheckIn : '',
          meals_end_date: hasMealsDefault ? initialCheckOut : '',
          extra_fees: [],
          total_price: '',
          notes: '',
        });

        if (targetUnit) {
          setSelectedSectorId(String(targetUnit.sector_id));
        }
      }
    }
  }, [open, reservation, defaultUnitId, defaultCheckIn, defaultCheckOut]);

  const currentSectorId =
    reservation?.unit?.sector_id ??
    selectedUnit?.sector_id ??
    units.find((u) => u.id === reservation?.unit_id)?.sector_id;
  const numericSectorId = currentSectorId ? Number(currentSectorId) : null;

  const hasSectorEditPermission = Boolean(
    user?.has_full_sector_access ||
    (numericSectorId && user?.editable_sector_ids?.includes(numericSectorId))
  );

  const selectableSectors = useMemo(() => {
    if (user?.has_full_sector_access) return sectors;
    if (isEditing) {
      const allowed = user?.allowed_sector_ids ?? [];
      return sectors.filter((s) => allowed.includes(s.id));
    }
    const editable = user?.editable_sector_ids ?? [];
    return sectors.filter((s) => editable.includes(s.id));
  }, [sectors, user?.has_full_sector_access, user?.allowed_sector_ids, user?.editable_sector_ids, isEditing]);

  const selectableUnits = useMemo(() => {
    if (user?.has_full_sector_access) return units;
    if (isEditing) {
      const allowed = user?.allowed_sector_ids ?? [];
      return units.filter((u) => allowed.includes(u.sector_id));
    }
    const editable = user?.editable_sector_ids ?? [];
    return units.filter((u) => editable.includes(u.sector_id));
  }, [units, user?.has_full_sector_access, user?.allowed_sector_ids, user?.editable_sector_ids, isEditing]);

  // Auto-set sector when only 1 sector is selectable
  useEffect(() => {
    if (!isEditing && selectableSectors.length === 1 && selectedSectorId === 'all') {
      setSelectedSectorId(String(selectableSectors[0].id));
    }
  }, [isEditing, selectableSectors, selectedSectorId]);

  // Filter units by selected sector
  const filteredUnits = useMemo(() => {
    if (selectedSectorId === 'all') return selectableUnits;
    return selectableUnits.filter((u) => String(u.sector_id) === selectedSectorId);
  }, [selectableUnits, selectedSectorId]);

  const canCreateReservation = Boolean(
    user?.has_full_sector_access ||
    (user?.editable_sector_ids && user.editable_sector_ids.length > 0)
  );

  const isReadOnly = isEditing
    ? !hasSectorEditPermission
    : (!canCreateReservation || Boolean(numericSectorId && !user?.has_full_sector_access && !user?.editable_sector_ids?.includes(numericSectorId)));

  // Calculate nights count
  const nightsCount = useMemo(() => {
    if (!data.check_in || !data.check_out) return 0;
    const start = new Date(data.check_in);
    const end = new Date(data.check_out);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [data.check_in, data.check_out]);

  // Rate per night from unit's price rule and selected membership
  const ratePerNight = useMemo(() => {
    if (!selectedUnit?.price_rule?.rules || !data.membership) return 0;
    return Number(selectedUnit.price_rule.rules[data.membership] ?? 0);
  }, [selectedUnit, data.membership]);

  // Room accommodation subtotal
  const calculatedRoomPrice = useMemo(() => {
    if (ratePerNight <= 0 || nightsCount <= 0) return 0;
    return ratePerNight * nightsCount;
  }, [ratePerNight, nightsCount]);

  // Meals rate and nights calculation
  const mealRatePerNight = 450;
  const mealPersonsCount = Number(data.meals_persons_count) > 0 ? Number(data.meals_persons_count) : 4;
  const mealNightsCount = useMemo(() => {
    if (!data.has_meals || !sectorHasMeals || !data.meals_start_date || !data.meals_end_date) return 0;
    const start = new Date(data.meals_start_date);
    const end = new Date(data.meals_end_date);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [data.has_meals, sectorHasMeals, data.meals_start_date, data.meals_end_date]);

  const calculatedMealsPrice = useMemo(() => {
    if (!data.has_meals || !sectorHasMeals || mealNightsCount <= 0) return 0;
    return mealPersonsCount * mealRatePerNight * mealNightsCount;
  }, [data.has_meals, sectorHasMeals, mealNightsCount, mealRatePerNight, mealPersonsCount]);

  // Extra fees subtotal
  const extraFeesTotal = useMemo(() => {
    return (data.extra_fees || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [data.extra_fees]);

  // Automatically computed total price (Room + Meals + Extra Fees)
  const calculatedTotalPrice = useMemo(() => {
    const total = calculatedRoomPrice + calculatedMealsPrice + extraFeesTotal;
    return total > 0 ? total : 0;
  }, [calculatedRoomPrice, calculatedMealsPrice, extraFeesTotal]);

  // Sync total price when not manually overridden
  useEffect(() => {
    if (!isPriceOverridden && calculatedTotalPrice > 0) {
      setData('total_price', String(calculatedTotalPrice));
    }
  }, [calculatedTotalPrice, isPriceOverridden]);

  // Extra fees handlers
  const handleAddExtraFee = () => {
    setData('extra_fees', [
      ...(data.extra_fees || []),
      { description: '', amount: '' },
    ]);
  };

  const handleRemoveExtraFee = (index: number) => {
    const updated = [...(data.extra_fees || [])];
    updated.splice(index, 1);
    setData('extra_fees', updated);
  };

  const handleUpdateExtraFee = (index: number, field: 'description' | 'amount', value: string) => {
    const updated = [...(data.extra_fees || [])];
    updated[index] = { ...updated[index], [field]: value };
    setData('extra_fees', updated);
  };

  const handleUnitSelect = (val: string) => {
    const unit = units.find((u) => String(u.id) === val);
    const targetSectorHasMeals = Boolean(unit?.sector?.has_meals || unit?.sector?.name === 'فندق 6');
    if (!isEditing && targetSectorHasMeals && !data.has_meals) {
      setData((prev) => ({
        ...prev,
        unit_id: val,
        has_meals: true,
        meals_persons_count: prev.meals_persons_count || 4,
        meals_start_date: prev.meals_start_date || prev.check_in,
        meals_end_date: prev.meals_end_date || prev.check_out,
      }));
    } else if (!targetSectorHasMeals) {
      setData((prev) => ({
        ...prev,
        unit_id: val,
        has_meals: false,
      }));
    } else {
      setData('unit_id', val);
    }
  };

  // Real-time client-side conflict detection
  const conflictWarning = useMemo(() => {
    if (!data.unit_id || !data.check_in || !data.check_out || nightsCount <= 0) {
      return null;
    }

    const checkInDate = new Date(data.check_in);
    const checkOutDate = new Date(data.check_out);

    const conflicting = existingReservations.find((res) => {
      if (res.status === 'غادر') return false;
      if (isEditing && res.id === reservation?.id) return false;
      if (String(res.unit_id) !== data.unit_id) return false;

      const resIn = new Date(res.check_in);
      const resOut = new Date(res.check_out);

      return checkInDate < resOut && checkOutDate > resIn;
    });

    if (conflicting) {
      return {
        unitName: selectedUnit?.name ?? data.unit_id,
        guestName: conflicting.guest?.name ?? 'نزيل آخر',
        checkIn: conflicting.check_in,
        checkOut: conflicting.check_out,
      };
    }

    return null;
  }, [
    data.unit_id,
    data.check_in,
    data.check_out,
    nightsCount,
    existingReservations,
    isEditing,
    reservation,
    selectedUnit,
  ]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    if (isEditing && reservation) {
      if (!hasSectorEditPermission) {
        message.error('لا تملك صلاحية تعديل الحجوزات في هذا القطاع (صلاحية عرض فقط)');
        return;
      }

      put(`/reservations/${reservation.id}`, {
        preserveScroll: true,
        preserveState: true,
        only: ['reservations', 'units', 'sectors', 'stats', 'status_counts', 'guests'],
        onSuccess: () => {
          onOpenChange(false);
          reset();
          message.success('تم تحديث بيانات الحجز بنجاح');
        },
        onError: () => {
          message.error('تعذر تحديث الحجز، يرجى مراجعة الحقول والمحاولة ثانية');
        },
      });
    } else {
      post('/reservations', {
        preserveScroll: true,
        preserveState: true,
        only: ['reservations', 'units', 'sectors', 'stats', 'status_counts', 'guests'],
        onSuccess: () => {
          onOpenChange(false);
          reset();
          message.success('تم تسجيل الحجز الفندقي الجديد بنجاح');
        },
        onError: () => {
          message.error('تعذر تأكيد الحجز، يرجى مراجعة الحقول والمحاولة ثانية');
        },
      });
    }
  };

  const sectorOptions = useMemo(() => {
    const opts = selectableSectors.map((sec) => ({ value: String(sec.id), label: sec.name }));
    if (selectableSectors.length > 1) {
      return [
        { value: 'all', label: 'جميع القطاعات المتاحة' },
        ...opts,
      ];
    }
    return opts;
  }, [selectableSectors]);

  const unitOptions = useMemo(() => {
    return filteredUnits.map((u) => ({
      value: String(u.id),
      label: `${u.sector?.name ?? 'قطاع'} - وحدة ${u.name} (${u.rooms_count ?? 1} ${u.rooms_count === 1 ? 'غرفة' : 'غرف'})`,
    }));
  }, [filteredUnits]);

  // Ensure editing reservation's guest is always present in guest options
  const allAvailableGuests = useMemo(() => {
    if (reservation?.guest) {
      const exists = guests.some((g) => g.id === reservation.guest!.id);
      if (!exists) {
        return [reservation.guest, ...guests];
      }
    }
    return guests;
  }, [guests, reservation?.guest]);

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      title={
        <div className="flex items-center gap-2 text-stone-800 dark:text-stone-100 font-bold text-base pb-1">
          {isReadOnly ? (
            <>
              <EyeOutlined className="text-amber-500" />
              <span>تفاصيل وبيانات الحجز (عرض فقط)</span>
              <Tag color="warning" className="mr-1 text-xs font-normal">
                استعراض فقط
              </Tag>
            </>
          ) : (
            <>
              <HomeOutlined className="text-sky-600" />
              <span>{isEditing ? 'تعديل بيانات الحجز' : 'تسجيل حجز فندقي جديد'}</span>
            </>
          )}
        </div>
      }
      onOk={isReadOnly ? undefined : handleSubmit}
      confirmLoading={processing}
      okButtonProps={{
        disabled: isReadOnly || Boolean(conflictWarning),
      }}
      okText={processing ? 'جاري الحفظ...' : isEditing ? 'تحديث الحجز' : 'تأكيد الحجز'}
      cancelText="إلغاء"
      footer={
        isReadOnly ? (
          <div className="flex items-center justify-between w-full pt-1" dir="rtl">
            <Tag color="warning" className="px-2.5 py-1 text-xs m-0 flex items-center gap-1">
              <LockOutlined />
              <span>صلاحية عرض فقط - غير مصرح بالتعديل</span>
            </Tag>
            <Button type="primary" onClick={() => onOpenChange(false)}>
              إغلاق النافذة
            </Button>
          </div>
        ) : undefined
      }
      destroyOnClose
      centered
      width="min(780px, calc(100vw - 24px))"
      style={{ maxWidth: 'calc(100vw - 24px)', margin: '16px auto' }}
      styles={{
        body: {
          padding: '16px 20px 24px',
          overflowX: 'hidden',
        },
      }}
    >
      <div className="space-y-5 max-h-[76vh] overflow-y-auto overflow-x-hidden px-1" dir="rtl">
        {isReadOnly && (
          <Alert
            type="warning"
            showIcon
            icon={<LockOutlined />}
            message="صلاحية استعراض فقط"
            description="تم فتح هذا الحجز في وضع الاستعراض فقط لأن حسابك لا يمتلك صلاحية تعديل في هذا القطاع."
            className="rounded-lg"
          />
        )}

        {conflictWarning && (
          <Alert
            type="error"
            showIcon
            title="تنبيه تعارض في الحجز!"
            description={
              <span className="text-xs">
                الوحدة <strong>({conflictWarning.unitName})</strong> محجوزة بالفعل من قبل النزيل{' '}
                <strong>{conflictWarning.guestName}</strong> في الفترة من{' '}
                <u>{conflictWarning.checkIn}</u> إلى <u>{conflictWarning.checkOut}</u>.
              </span>
            }
            className="rounded-lg"
          />
        )}

        {errors.unit_id && (
          <Alert
            type="error"
            showIcon
            title="خطأ في الوحدة"
            description={<span className="text-xs">{errors.unit_id}</span>}
            className="rounded-lg"
          />
        )}

        <Form layout="vertical" className="space-y-5">
          {/* SECTION 1: Guest & Accommodations */}
          <Card
            size="small"
            className="bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-xl"
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200 dark:border-stone-800">
              <UserOutlined className="text-sky-600" />
              <Text strong className="text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                بيانات النزيل وموقع الإقامة
              </Text>
            </div>

            {/* Guest Selection */}
            <Form.Item
              label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">النزيل المستفيد *</span>}
              required
              validateStatus={errors.guest_id ? 'error' : ''}
              help={errors.guest_id}
              className="mb-4"
            >
              <GuestCombobox
                value={data.guest_id}
                onChange={(val) => setData('guest_id', val)}
                guests={allAvailableGuests}
                initialGuest={reservation?.guest}
                error={errors.guest_id}
                disabled={isReadOnly}
                onViewGuestDetails={onViewGuestDetails}
              />
            </Form.Item>

            {/* Sector & Unit Selection */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">تصفية حسب القطاع</span>} className="mb-0">
                  <Select
                    value={selectedSectorId}
                    onChange={setSelectedSectorId}
                    options={sectorOptions}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">الوحدة السكنية (الغرفة / الفيلا) *</span>}
                  required
                  validateStatus={errors.unit_id ? 'error' : ''}
                  help={errors.unit_id}
                  className="mb-0"
                >
                  <Select
                    value={data.unit_id || undefined}
                    onChange={handleUnitSelect}
                    placeholder="اختر الغرفة أو الفيلا..."
                    options={unitOptions}
                    disabled={isReadOnly}
                    className="w-full"
                    showSearch={{ optionFilterProp: 'label' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Dates: Check-in & Check-out */}
            <div className="mt-4 pt-3 border-t border-stone-200/80 dark:border-stone-800/80">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <Space size={6}>
                        <CalendarOutlined className="text-stone-400" />
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">تاريخ الوصول *</span>
                      </Space>
                    }
                    required
                    validateStatus={errors.check_in ? 'error' : ''}
                    help={errors.check_in}
                    className="mb-0"
                  >
                    <DatePicker
                      value={data.check_in ? dayjs(data.check_in) : null}
                      onChange={(_date, dateString) => {
                        const str = (dateString as string) || '';
                        setData((prev) => ({
                          ...prev,
                          check_in: str,
                          meals_start_date: (prev.has_meals && (!prev.meals_start_date || prev.meals_start_date === prev.check_in)) ? str : prev.meals_start_date,
                        }));
                      }}
                      format="YYYY-MM-DD"
                      disabled={isReadOnly}
                      className="w-full"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <Space size={6}>
                        <CalendarOutlined className="text-stone-400" />
                        <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">تاريخ المغادرة *</span>
                      </Space>
                    }
                    required
                    validateStatus={errors.check_out ? 'error' : ''}
                    help={errors.check_out}
                    className="mb-0"
                  >
                    <DatePicker
                      value={data.check_out ? dayjs(data.check_out) : null}
                      onChange={(_date, dateString) => {
                        const str = (dateString as string) || '';
                        setData((prev) => ({
                          ...prev,
                          check_out: str,
                          meals_end_date: (prev.has_meals && (!prev.meals_end_date || prev.meals_end_date === prev.check_out)) ? str : prev.meals_end_date,
                        }));
                      }}
                      format="YYYY-MM-DD"
                      disabled={isReadOnly}
                      className="w-full"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {nightsCount > 0 && (
                <div className="mt-3 flex items-center justify-between px-3 py-2 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg text-xs">
                  <span className="text-stone-600 dark:text-stone-400">مدة الإقامة المحسوبة:</span>
                  <Tag color="blue" className="text-xs font-bold m-0 px-2.5 py-0.5">
                    {nightsCount} {nightsCount === 1 ? 'ليلة واحدة' : nightsCount === 2 ? 'ليلتان' : `${nightsCount} ليالٍ`}
                  </Tag>
                </div>
              )}
            </div>
          </Card>

          {/* SECTION 2: Reservation Classification & Status */}
          <Card
            size="small"
            className="bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-xl"
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200 dark:border-stone-800">
              <IdcardOutlined className="text-indigo-600" />
              <Text strong className="text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                حالة الحجز والتصنيف
              </Text>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">حالة الحجز</span>} className="mb-0">
                  <Select
                    value={data.status}
                    onChange={(val) => setData('status', val as ReservationStatus)}
                    options={[
                      { value: 'ثابت', label: 'ثابت' },
                      { value: 'انتظار', label: 'انتظار' },
                      { value: 'تم التسكين', label: 'تم التسكين (نشط)' },
                      { value: 'غادر', label: 'غادر' },
                    ]}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">جهة الحجز</span>} className="mb-0">
                  <Select
                    value={data.type}
                    onChange={(val) => setData('type', val as ReservationType)}
                    options={[
                      { value: 'فرع', label: 'فرع' },
                      { value: 'ادارة', label: 'ادارة' },
                      { value: 'منتجع', label: 'منتجع' },
                    ]}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">فئة النزيل (التسعير)</span>} className="mb-0">
                  <Select
                    value={data.membership}
                    onChange={(val) => setData('membership', val as MembershipType)}
                    options={[
                      { value: 'عضو', label: 'عضو' },
                      { value: 'غير عضو', label: 'غير عضو' },
                      { value: 'مرافق', label: 'مرافق' },
                      { value: 'مدني', label: 'مدني' },
                    ]}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">دخول البوابة</span>} className="mb-0">
                  <Select
                    value={data.enter_from_gates ? 'true' : 'false'}
                    onChange={(val) => setData('enter_from_gates', val === 'true')}
                    options={[
                      { value: 'false', label: 'لا' },
                      { value: 'true', label: 'نعم' },
                    ]}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* SECTION 3: Add-ons & Services (Meals - ONLY IF SECTOR HAS MEALS, and Extra Fees) */}
          {(sectorHasMeals || (data.extra_fees && data.extra_fees.length > 0) || !isReadOnly) && (
            <Card
              size="small"
              className="bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-xl"
              styles={{ body: { padding: '16px 18px' } }}
            >
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-200 dark:border-stone-800">
                <CoffeeOutlined className="text-amber-600" />
                <Text strong className="text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                  الخدمات والرسوم الإضافية
                </Text>
              </div>

              <div className="space-y-4">
                {/* Meals Sub-section - Render ONLY if sector has_meals */}
                {sectorHasMeals && (
                  <div className="p-3.5 bg-white dark:bg-stone-950/60 border border-stone-200/90 dark:border-stone-800 rounded-lg">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={data.has_meals}
                          disabled={isReadOnly}
                          onChange={(checked) => {
                            setData((prev) => ({
                              ...prev,
                              has_meals: checked,
                              meals_persons_count: prev.meals_persons_count || 4,
                              meals_start_date: checked ? (prev.meals_start_date || prev.check_in) : '',
                              meals_end_date: checked ? (prev.meals_end_date || prev.check_out) : '',
                            }));
                          }}
                        />
                        <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                          إضافة وجبات غذائية (450 ج.م للفرد / الليلة)
                        </div>
                      </div>

                      {data.has_meals && (
                        <Tag color="gold" className="text-xs font-bold m-0 px-2.5 py-0.5">
                          {mealPersonsCount} فرد × {mealNightsCount} ليالٍ = {calculatedMealsPrice.toLocaleString()} ج.م
                        </Tag>
                      )}
                    </div>

                    {data.has_meals && (
                      <div className="pt-3 mt-3 border-t border-stone-200 dark:border-stone-800">
                        <Row gutter={[16, 12]}>
                          <Col xs={24} sm={8}>
                            <Form.Item
                              label={
                                <Space size={4}>
                                  <UsergroupAddOutlined className="text-amber-600" />
                                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">عدد الأفراد للوجبات</span>
                                </Space>
                              }
                              validateStatus={errors.meals_persons_count ? 'error' : ''}
                              help={errors.meals_persons_count}
                              className="mb-0"
                            >
                              <InputNumber
                                value={data.meals_persons_count ? Number(data.meals_persons_count) : 4}
                                onChange={(val) => setData('meals_persons_count', val !== null ? Number(val) : 4)}
                                min={1}
                                max={50}
                                disabled={isReadOnly}
                                className="w-full text-right"
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} sm={8}>
                            <Form.Item
                              label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">تاريخ بدء الوجبات</span>}
                              validateStatus={errors.meals_start_date ? 'error' : ''}
                              help={errors.meals_start_date}
                              className="mb-0"
                            >
                              <DatePicker
                                value={data.meals_start_date ? dayjs(data.meals_start_date) : null}
                                onChange={(_date, dateString) => {
                                  setData('meals_start_date', (dateString as string) || '');
                                }}
                                minDate={data.check_in ? dayjs(data.check_in) : undefined}
                                maxDate={data.check_out ? dayjs(data.check_out) : undefined}
                                format="YYYY-MM-DD"
                                disabled={isReadOnly}
                                className="w-full"
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} sm={8}>
                            <Form.Item
                              label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">تاريخ انتهاء الوجبات</span>}
                              validateStatus={errors.meals_end_date ? 'error' : ''}
                              help={errors.meals_end_date}
                              className="mb-0"
                            >
                              <DatePicker
                                value={data.meals_end_date ? dayjs(data.meals_end_date) : null}
                                onChange={(_date, dateString) => {
                                  setData('meals_end_date', (dateString as string) || '');
                                }}
                                minDate={data.meals_start_date ? dayjs(data.meals_start_date) : (data.check_in ? dayjs(data.check_in) : undefined)}
                                maxDate={data.check_out ? dayjs(data.check_out) : undefined}
                                format="YYYY-MM-DD"
                                disabled={isReadOnly}
                                className="w-full"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    )}
                  </div>
                )}

                {/* Extra Fees Sub-section */}
                <div className="p-3.5 bg-white dark:bg-stone-950/60 border border-stone-200/90 dark:border-stone-800 rounded-lg">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
                      <DollarOutlined className="text-purple-600" />
                      <span>رسوم وغرامات إضافية (تلفيات، زيارات مرافقين، إلخ)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {extraFeesTotal > 0 && (
                        <Tag color="purple" className="text-xs font-bold m-0 px-2.5 py-0.5">
                          إجمالي الرسوم: {extraFeesTotal.toLocaleString()} ج.م
                        </Tag>
                      )}
                      {!isReadOnly && (
                        <Button
                          type="dashed"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={handleAddExtraFee}
                          className="text-xs"
                        >
                          إضافة رسم
                        </Button>
                      )}
                    </div>
                  </div>

                  {(!data.extra_fees || data.extra_fees.length === 0) ? (
                    <div className="text-xs text-stone-400 py-1">
                      لا توجد رسوم إضافية مسجلة على هذا الحجز.
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-2">
                      {data.extra_fees.map((fee, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Input
                            value={fee.description}
                            onChange={(e) => handleUpdateExtraFee(idx, 'description', e.target.value)}
                            placeholder="بيان الرسم (مثال: تلفيات، رسوم مرافق...)"
                            disabled={isReadOnly}
                            className="text-xs flex-1"
                          />
                          <InputNumber
                            value={fee.amount ? Number(fee.amount) : null}
                            onChange={(val) => handleUpdateExtraFee(idx, 'amount', val !== null ? String(val) : '')}
                            placeholder="المبلغ"
                            min={0}
                            step={10}
                            disabled={isReadOnly}
                            className="w-64 text-right font-semibold text-xs"
                            suffix="ج.م"
                          />
                          {!isReadOnly && (
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveExtraFee(idx)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 4: Financials & Pricing Calculation */}
          <Card
            size="small"
            className="bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-xl"
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-stone-200 dark:border-stone-800 flex-wrap">
              <div className="flex items-center gap-2">
                <CalculatorOutlined className="text-emerald-600" />
                <Text strong className="text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                  الحسابات والتسعير الإجمالي
                </Text>
              </div>

              {canOverridePrice && !isReadOnly ? (
                <Checkbox
                  checked={isPriceOverridden}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setIsPriceOverridden(val);
                    if (!val && calculatedTotalPrice > 0) {
                      setData('total_price', String(calculatedTotalPrice));
                    }
                  }}
                  className="text-xs font-semibold text-amber-600"
                >
                  <Space size={4}>
                    <UnlockOutlined />
                    <span>تعديل يدوي للسعر (استثناء مشرف)</span>
                  </Space>
                </Checkbox>
              ) : isReadOnly ? (
                <Space size={4} className="text-xs text-stone-400">
                  <LockOutlined />
                  <span>عرض فقط</span>
                </Space>
              ) : (
                <Space size={4} className="text-xs text-stone-400">
                  <LockOutlined />
                  <span>السعر مقفل بالنظام</span>
                </Space>
              )}
            </div>

            {/* Price breakdown cards */}
            {(nightsCount > 0 || calculatedTotalPrice > 0) && (
              <Row gutter={[10, 10]} className="mb-4 text-center">
                <Col xs={12} sm={sectorHasMeals ? 6 : 8}>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                    <Statistic
                      title={<span className="text-[11px] text-stone-500">إقامة ({nightsCount} ليالٍ)</span>}
                      value={calculatedRoomPrice}
                      suffix={<span className="text-[10px]">ج.م</span>}
                      styles={{ content: { fontSize: 13, fontWeight: 'bold' } }}
                    />
                  </div>
                </Col>

                {sectorHasMeals && (
                  <Col xs={12} sm={6}>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                      <Statistic
                        title={<span className="text-[11px] text-stone-500">وجبات ({mealNightsCount} ليالٍ)</span>}
                        value={calculatedMealsPrice}
                        suffix={<span className="text-[10px]">ج.م</span>}
                        styles={{ content: { fontSize: 13, fontWeight: 'bold', color: data.has_meals ? '#b45309' : undefined } }}
                      />
                    </div>
                  </Col>
                )}

                <Col xs={12} sm={sectorHasMeals ? 6 : 8}>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                    <Statistic
                      title={<span className="text-[11px] text-stone-500">رسوم إضافية</span>}
                      value={extraFeesTotal}
                      suffix={<span className="text-[10px]">ج.م</span>}
                      styles={{ content: { fontSize: 13, fontWeight: 'bold', color: extraFeesTotal > 0 ? '#7e22ce' : undefined } }}
                    />
                  </div>
                </Col>

                <Col xs={12} sm={sectorHasMeals ? 6 : 8}>
                  <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800">
                    <Statistic
                      title={<span className="text-[11px] text-sky-700 dark:text-sky-300 font-bold">الإجمالي النظامي</span>}
                      value={calculatedTotalPrice}
                      suffix={<span className="text-[10px]">ج.م</span>}
                      styles={{ content: { fontSize: 14, fontWeight: 'bold', color: '#0284c7' } }}
                    />
                  </div>
                </Col>
              </Row>
            )}

            {/* Total Price Input Field */}
            <Form.Item
              label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">المبلغ الإجمالي المعتمد للحجز (ج.م) *</span>}
              required
              validateStatus={errors.total_price ? 'error' : ''}
              help={errors.total_price}
              className="mb-0"
            >
              <InputNumber
                value={data.total_price ? Number(data.total_price) : null}
                onChange={(val) => setData('total_price', val !== null ? String(val) : '')}
                min={0}
                step={0.01}
                disabled={isReadOnly || (!canOverridePrice && calculatedTotalPrice > 0 && !isEditing)}
                readOnly={isReadOnly || (!isPriceOverridden && calculatedTotalPrice > 0 && !isEditing)}
                placeholder="0.00"
                className="w-full text-right font-bold text-base h-10 flex items-center"
                prefix={
                  isReadOnly ? (
                    <Tag color="default" className="text-xs m-0">
                      <LockOutlined className="ml-1" /> عرض فقط
                    </Tag>
                  ) : !canOverridePrice && calculatedTotalPrice > 0 && !isEditing ? (
                    <Tag color="blue" className="text-xs m-0">
                      <ThunderboltOutlined className="ml-1" /> محسوب آلياً
                    </Tag>
                  ) : undefined
                }
              />
            </Form.Item>

            {isPriceOverridden && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1.5">
                <InfoCircleOutlined />
                <span>يرجى توضيح سبب تعديل السعر في خانة الملاحظات أدناه لأغراض المراجعة والتدقيق.</span>
              </div>
            )}
          </Card>

          {/* SECTION 5: Notes */}
          <Card
            size="small"
            className="bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-xl"
            styles={{ body: { padding: '16px 18px' } }}
          >
            <Form.Item label={<span className="text-xs font-semibold text-stone-700 dark:text-stone-300">ملاحظات وطلبات خاصة</span>} className="mb-0">
              <Input.TextArea
                value={data.notes}
                onChange={(e) => setData('notes', e.target.value)}
                placeholder="أي طلبات خاصة بالنزيل أو مبررات تعديل السعر..."
                rows={3}
                disabled={isReadOnly}
                className="rounded-lg text-xs sm:text-sm"
              />
            </Form.Item>
          </Card>
        </Form>
      </div>
    </Modal>
  );
}
