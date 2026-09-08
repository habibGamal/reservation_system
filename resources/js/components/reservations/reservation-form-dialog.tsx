import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
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
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
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
  CheckCircleOutlined,
  CoffeeOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  HomeOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  LockOutlined,
  PaperClipOutlined,
  PictureOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UnlockOutlined,
  UnorderedListOutlined,
  UploadOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { GuestCombobox } from '@/components/reservations/guest-combobox';
import { compressImage, formatFileSize, type CompressedResult } from '@/lib/compress-image';
import { destroy as destroyReservation } from '@/routes/reservations';
import {
  Guest,
  MembershipType,
  Reservation,
  ReservationAttachment,
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
  const { message, modal } = App.useApp();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  // Attachments state & handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedAttachments, setStagedAttachments] = useState<CompressedResult[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>([]);
  const [compressing, setCompressing] = useState<boolean>(false);
  const [attachmentViewMode, setAttachmentViewMode] = useState<'gallery' | 'list'>('gallery');
  const [previewGroupOpen, setPreviewGroupOpen] = useState<boolean>(false);
  const [previewGroupCurrent, setPreviewGroupCurrent] = useState<number>(0);

  const existingAttachments = useMemo(() => {
    const list: ReservationAttachment[] = (reservation?.attachments ?? []) as ReservationAttachment[];
    return list.filter((att) => !deletedAttachmentIds.includes(att.id));
  }, [reservation?.attachments, deletedAttachmentIds]);

  const existingImageAttachments = useMemo(() => {
    return existingAttachments.filter((att) => att.is_image || att.mime_type?.startsWith('image/'));
  }, [existingAttachments]);

  const existingDocAttachments = useMemo(() => {
    return existingAttachments.filter((att) => !att.is_image && !att.mime_type?.startsWith('image/'));
  }, [existingAttachments]);

  const stagedImageAttachments = useMemo(() => {
    return stagedAttachments.filter((staged) => staged.isImage && staged.previewUrl);
  }, [stagedAttachments]);

  const stagedDocAttachments = useMemo(() => {
    return stagedAttachments.filter((staged) => !staged.isImage || !staged.previewUrl);
  }, [stagedAttachments]);

  const allGalleryImages = useMemo(() => {
    const list: Array<{
      key: string;
      src: string;
      title: string;
      subTitle: string;
      isStaged: boolean;
      stagedIdx?: number;
      existingId?: string;
      savings?: number;
    }> = [];

    existingImageAttachments.forEach((att) => {
      list.push({
        key: `existing-${att.id}`,
        src: att.url || `/reservations/${reservation?.id}/attachments/${att.id}`,
        title: att.file_name,
        subTitle: att.human_size || '',
        isStaged: false,
        existingId: att.id,
      });
    });

    stagedImageAttachments.forEach((staged) => {
      const originalIdx = stagedAttachments.indexOf(staged);
      list.push({
        key: `staged-${originalIdx}`,
        src: staged.previewUrl!,
        title: staged.file.name,
        subTitle: formatFileSize(staged.compressedSize),
        isStaged: true,
        stagedIdx: originalIdx,
        savings: staged.savedPercent,
      });
    });

    return list;
  }, [existingImageAttachments, stagedImageAttachments, stagedAttachments, reservation?.id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressing(true);
    try {
      const fileList = Array.from(files);
      const results: CompressedResult[] = [];

      for (const file of fileList) {
        const result = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.82,
          mimeType: 'image/webp',
        });
        results.push(result);
      }

      setStagedAttachments((prev) => [...prev, ...results]);
    } catch {
      message.error('حدث خطأ أثناء معالجة وضغط الملفات');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveStaged = (index: number) => {
    setStagedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMarkDelete = (attachmentId: string) => {
    setDeletedAttachmentIds((prev) => [...prev, attachmentId]);
  };

  const handleUndoDelete = () => {
    setDeletedAttachmentIds([]);
  };

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
      setIsSubmitting(false);
      setIsDeleting(false);
      setStagedAttachments([]);
      setDeletedAttachmentIds([]);
      setCompressing(false);
      setAttachmentViewMode('gallery');
      setPreviewGroupOpen(false);
      setPreviewGroupCurrent(0);

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
    if (isReadOnly || isSubmitting || isDeleting || compressing) return;

    const stagedFiles = stagedAttachments.map((s) => s.file);

    if (isEditing && reservation) {
      if (!hasSectorEditPermission) {
        message.error('لا تملك صلاحية تعديل الحجوزات في هذا القطاع (صلاحية عرض فقط)');
        return;
      }

      setIsSubmitting(true);
      router.post(
        `/reservations/${reservation.id}`,
        {
          _method: 'put',
          ...data,
          attachments: stagedFiles,
          deleted_attachment_ids: deletedAttachmentIds,
        },
        {
          forceFormData: true,
          preserveScroll: true,
          preserveState: true,
          only: ['reservations', 'units', 'sectors', 'stats', 'status_counts', 'guests'],
          onSuccess: () => {
            onOpenChange(false);
            reset();
            setStagedAttachments([]);
            setDeletedAttachmentIds([]);
            message.success('تم تحديث بيانات الحجز بنجاح');
          },
          onError: () => {
            message.error('تعذر تحديث الحجز، يرجى مراجعة الحقول والمحاولة ثانية');
          },
          onFinish: () => {
            setIsSubmitting(false);
          },
        }
      );
    } else {
      setIsSubmitting(true);
      router.post(
        '/reservations',
        {
          ...data,
          attachments: stagedFiles,
        },
        {
          forceFormData: true,
          preserveScroll: true,
          preserveState: true,
          only: ['reservations', 'units', 'sectors', 'stats', 'status_counts', 'guests'],
          onSuccess: () => {
            onOpenChange(false);
            reset();
            setStagedAttachments([]);
            setDeletedAttachmentIds([]);
            message.success('تم تسجيل الحجز الفندقي الجديد بنجاح');
          },
          onError: () => {
            message.error('تعذر تأكيد الحجز، يرجى مراجعة الحقول والمحاولة ثانية');
          },
          onFinish: () => {
            setIsSubmitting(false);
          },
        }
      );
    }
  };

  const handleDeleteReservation = () => {
    if (!reservation || isReadOnly || isSubmitting || isDeleting) return;

    if (!hasSectorEditPermission) {
      message.error('لا تملك صلاحية حذف الحجوزات في هذا القطاع (صلاحية عرض فقط)');
      return;
    }

    modal.confirm({
      title: 'حذف الحجز نهائياً',
      content: 'هل أنت متأكد من رغبتك في حذف هذا الحجز نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
      okText: 'نعم، احذف',
      cancelText: 'إلغاء',
      okButtonProps: { danger: true },
      onOk: () => {
        setIsDeleting(true);
        router.delete(destroyReservation.url({ reservation: reservation.id }), {
          preserveScroll: true,
          preserveState: true,
          only: ['reservations', 'units', 'sectors', 'stats', 'status_counts', 'guests'],
          onSuccess: () => {
            onOpenChange(false);
            reset();
            setStagedAttachments([]);
            setDeletedAttachmentIds([]);
            message.success('تم حذف الحجز بنجاح');
          },
          onError: () => {
            message.error('حدث خطأ أثناء محاولة حذف الحجز');
          },
          onFinish: () => {
            setIsDeleting(false);
          },
        });
      },
    });
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
      onCancel={() => {
        if (!isSubmitting && !isDeleting) {
          onOpenChange(false);
        }
      }}
      maskClosable={false}
      closable={!isSubmitting && !isDeleting}
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
      confirmLoading={isSubmitting}
      okButtonProps={{
        disabled:
          isReadOnly ||
          Boolean(conflictWarning) ||
          isSubmitting ||
          isDeleting ||
          compressing,
        loading: isSubmitting,
      }}
      cancelButtonProps={{
        disabled: isSubmitting || isDeleting,
      }}
      okText={
        isSubmitting
          ? isEditing
            ? 'جاري تحديث الحجز...'
            : 'جاري إنشاء الحجز...'
          : isEditing
          ? 'تحديث الحجز'
          : 'تأكيد الحجز'
      }
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
        ) : (
          <div className="flex items-center justify-between w-full pt-2" dir="rtl">
            <div>
              {isEditing && reservation && hasSectorEditPermission && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={isDeleting}
                  disabled={isSubmitting || isDeleting || compressing}
                  onClick={handleDeleteReservation}
                >
                  {isDeleting ? 'جاري حذف الحجز...' : 'حذف الحجز'}
                </Button>
              )}
            </div>
            <Space>
              <Button
                disabled={isSubmitting || isDeleting}
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button
                type="primary"
                loading={isSubmitting}
                disabled={
                  isReadOnly ||
                  Boolean(conflictWarning) ||
                  isSubmitting ||
                  isDeleting ||
                  compressing
                }
                onClick={handleSubmit}
              >
                {isSubmitting
                  ? isEditing
                    ? 'جاري تحديث الحجز...'
                    : 'جاري إنشاء الحجز...'
                  : isEditing
                  ? 'تحديث الحجز'
                  : 'تأكيد الحجز'}
              </Button>
            </Space>
          </div>
        )
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

          {/* SECTION 6: Attachments & Documents */}
          <Card
            size="small"
            className="bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 rounded-xl"
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-stone-200 dark:border-stone-800 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <PaperClipOutlined className="text-emerald-600" />
                <Text strong className="text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                  المرفقات والمستندات (بطاقات الهوية، إيصالات، خطابات)
                </Text>
                {allGalleryImages.length > 0 && (
                  <Tag color="cyan" className="text-xs m-0 font-medium">
                    {allGalleryImages.length} {allGalleryImages.length === 1 ? 'صورة' : 'صور'}
                  </Tag>
                )}
                {(existingDocAttachments.length > 0 || stagedDocAttachments.length > 0) && (
                  <Tag color="purple" className="text-xs m-0">
                    {existingDocAttachments.length + stagedDocAttachments.length} ملفات مستندات
                  </Tag>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {allGalleryImages.length > 0 && (
                  <>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<PictureOutlined />}
                      onClick={() => {
                        setPreviewGroupCurrent(0);
                        setPreviewGroupOpen(true);
                      }}
                      className="text-xs flex items-center"
                    >
                      استعراض المعرض ({allGalleryImages.length})
                    </Button>
                    <Segmented
                      size="small"
                      value={attachmentViewMode}
                      onChange={(val) => setAttachmentViewMode(val as 'gallery' | 'list')}
                      options={[
                        { label: 'معرض الصور', value: 'gallery', icon: <PictureOutlined /> },
                        { label: 'قائمة تفصيلية', value: 'list', icon: <UnorderedListOutlined /> },
                      ]}
                      className="text-xs"
                    />
                  </>
                )}

                {!isReadOnly && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="dashed"
                      size="small"
                      icon={<UploadOutlined />}
                      loading={compressing}
                      disabled={compressing || isSubmitting || isDeleting}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      {compressing ? 'جاري ضغط الملفات...' : 'إرفاق ملفات / صور'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-1.5">
              <InfoCircleOutlined className="text-emerald-600 text-xs flex-shrink-0" />
              <span>يدعم صور (JPG, PNG, WebP) وملفات PDF. يتم ضغط وتحسين الصور تلقائياً قبل الرفع لتسريع الحفظ وتوفير مساحة التخزين.</span>
            </div>

            {deletedAttachmentIds.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={
                  <div className="flex items-center justify-between text-xs">
                    <span>تم تحديد {deletedAttachmentIds.length} مرفق للحذف عند حفظ التعديلات.</span>
                    <Button type="link" size="small" disabled={isSubmitting || isDeleting} onClick={handleUndoDelete} className="p-0 h-auto">
                      تراجع عن الحذف
                    </Button>
                  </div>
                }
                className="py-1 px-3 text-xs rounded-lg mb-3"
              />
            )}

            {/* Gallery View: Images beside each other + separate PDF list */}
            {attachmentViewMode === 'gallery' && (
              <div className="space-y-4">
                {allGalleryImages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <PictureOutlined className="text-sky-600" />
                        <span>معرض الصور ({allGalleryImages.length} صور بجانب بعضها):</span>
                      </div>
                      <span className="text-[11px] text-stone-400 font-normal">
                        انقر على أي صورة للتكبير والتنقل بين الصور بالأسهم
                      </span>
                    </div>

                    <Image.PreviewGroup
                      preview={{
                        open: previewGroupOpen,
                        onOpenChange: (open) => setPreviewGroupOpen(open),
                        current: previewGroupCurrent,
                        onChange: (current) => setPreviewGroupCurrent(current),
                      }}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {allGalleryImages.map((item, idx) => (
                          <div
                            key={item.key}
                            className="group relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs hover:shadow-md transition-all flex flex-col"
                          >
                            {/* Image thumbnail */}
                            <div className="relative aspect-[4/3] w-full bg-stone-100 dark:bg-stone-800/80 overflow-hidden flex items-center justify-center">
                              <Image
                                src={item.src}
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                wrapperStyle={{ width: '100%', height: '100%' }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                preview={{
                                  mask: (
                                    <div className="flex items-center gap-1.5 text-xs text-white font-medium bg-black/50 px-2 py-1 rounded-full backdrop-blur-xs">
                                      <EyeOutlined />
                                      <span>معاينة ({idx + 1}/{allGalleryImages.length})</span>
                                    </div>
                                  ),
                                }}
                              />

                              {/* Index / Status badge */}
                              <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
                                {item.isStaged ? (
                                  <Tag color="green" className="text-[10px] m-0 px-1.5 py-0 shadow-xs font-semibold border-0 bg-emerald-600 text-white">
                                    جديد {item.savings ? `(وفر ${item.savings}%)` : ''}
                                  </Tag>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white font-mono shadow-xs backdrop-blur-xs">
                                    #{idx + 1}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-2 flex items-center justify-between gap-1 text-xs border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-950/40">
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-stone-800 dark:text-stone-200 text-[11px]" title={item.title}>
                                  {item.title}
                                </div>
                                <div className="text-[10px] text-stone-400">
                                  {item.subTitle}
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {!item.isStaged && (
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    href={`/reservations/${reservation?.id}/attachments/${item.existingId}?download=1`}
                                    title="تحميل الصورة"
                                    className="h-6 w-6 p-0 text-stone-500 hover:text-stone-700"
                                  />
                                )}
                                {!isReadOnly && (
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    disabled={isSubmitting || isDeleting}
                                    onClick={() => {
                                      if (item.isStaged && item.stagedIdx !== undefined) {
                                        handleRemoveStaged(item.stagedIdx);
                                      } else if (item.existingId) {
                                        handleMarkDelete(item.existingId);
                                      }
                                    }}
                                    title={item.isStaged ? 'إلغاء المرفق' : 'حذف'}
                                    className="h-6 w-6 p-0"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  </div>
                )}

                {/* PDF & Document Files in Gallery Mode */}
                {(existingDocAttachments.length > 0 || stagedDocAttachments.length > 0) && (
                  <div className="space-y-2 pt-1 border-t border-stone-100 dark:border-stone-800/60">
                    <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <FilePdfOutlined className="text-rose-500" />
                      <span>المستندات والملفات المرفقة ({existingDocAttachments.length + stagedDocAttachments.length}):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {existingDocAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-[34px] h-[34px] rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center flex-shrink-0">
                              <FilePdfOutlined className="text-rose-500 text-base" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-stone-800 dark:text-stone-200 text-xs" title={att.file_name}>
                                {att.file_name}
                              </div>
                              <div className="text-[10px] text-stone-400 flex items-center gap-1.5">
                                <span>{att.human_size || 'حجم غير معروف'}</span>
                                {att.created_at && <span>• {att.created_at.split(' ')[0]}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="text"
                              size="small"
                              icon={<EyeOutlined />}
                              href={att.url || `/reservations/${reservation?.id}/attachments/${att.id}`}
                              target="_blank"
                              title="معاينة"
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              href={`/reservations/${reservation?.id}/attachments/${att.id}?download=1`}
                              title="تحميل"
                            />
                            {!isReadOnly && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                disabled={isSubmitting || isDeleting}
                                onClick={() => handleMarkDelete(att.id)}
                                title="حذف"
                              />
                            )}
                          </div>
                        </div>
                      ))}

                      {stagedDocAttachments.map((staged) => {
                        const originalIdx = stagedAttachments.indexOf(staged);
                        return (
                          <div
                            key={originalIdx}
                            className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-[34px] h-[34px] rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center flex-shrink-0">
                                <FilePdfOutlined className="text-rose-500 text-base" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-stone-800 dark:text-stone-200 text-xs" title={staged.file.name}>
                                  {staged.file.name}
                                </div>
                                <div className="text-[10px] text-stone-400">
                                  {formatFileSize(staged.compressedSize)}
                                </div>
                              </div>
                            </div>

                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              disabled={isSubmitting || isDeleting}
                              onClick={() => handleRemoveStaged(originalIdx)}
                              title="إلغاء المرفق"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List View: Detailed rows */}
            {attachmentViewMode === 'list' && (
              <Image.PreviewGroup>
                {/* Existing attachments */}
                {isEditing && existingAttachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      المرفقات الحالية ({existingAttachments.length}):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {existingAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {att.is_image || att.mime_type?.startsWith('image/') ? (
                              <Image
                                src={att.url || `/reservations/${reservation?.id}/attachments/${att.id}`}
                                alt={att.file_name}
                                width={38}
                                height={38}
                                className="rounded object-cover border border-stone-200"
                              />
                            ) : (
                              <div className="w-[38px] h-[38px] rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center flex-shrink-0">
                                <FilePdfOutlined className="text-rose-500 text-lg" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-stone-800 dark:text-stone-200" title={att.file_name}>
                                {att.file_name}
                              </div>
                              <div className="text-[10px] text-stone-400 flex items-center gap-1.5">
                                <span>{att.human_size || 'حجم غير معروف'}</span>
                                {att.created_at && <span>• {att.created_at.split(' ')[0]}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="text"
                              size="small"
                              icon={<EyeOutlined />}
                              href={att.url || `/reservations/${reservation?.id}/attachments/${att.id}`}
                              target="_blank"
                              title="معاينة"
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              href={`/reservations/${reservation?.id}/attachments/${att.id}?download=1`}
                              title="تحميل"
                            />
                            {!isReadOnly && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                disabled={isSubmitting || isDeleting}
                                onClick={() => handleMarkDelete(att.id)}
                                title="حذف"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newly staged files */}
                {stagedAttachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircleOutlined />
                      <span>ملفات جديدة تم تجهيزها وضغطها ({stagedAttachments.length}):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stagedAttachments.map((staged, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {staged.isImage && staged.previewUrl ? (
                              <Image
                                src={staged.previewUrl}
                                alt={staged.file.name}
                                width={38}
                                height={38}
                                className="rounded object-cover border border-emerald-200"
                              />
                            ) : (
                              <div className="w-[38px] h-[38px] rounded bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300 flex items-center justify-center flex-shrink-0">
                                <FilePdfOutlined className="text-rose-500 text-lg" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-stone-800 dark:text-stone-200" title={staged.file.name}>
                                {staged.file.name}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                <span className="text-stone-400 line-through">
                                  {formatFileSize(staged.originalSize)}
                                </span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                  {formatFileSize(staged.compressedSize)}
                                </span>
                                {staged.savedPercent > 0 && (
                                  <Tag color="green" className="text-[10px] m-0 px-1 py-0 leading-tight">
                                    وفر {staged.savedPercent}%
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            disabled={isSubmitting || isDeleting}
                            onClick={() => handleRemoveStaged(idx)}
                            title="إلغاء المرفق"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Image.PreviewGroup>
            )}

            {existingAttachments.length === 0 && stagedAttachments.length === 0 && (
              <div className="text-xs text-stone-400 py-3 text-center rounded-lg border border-dashed border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/40">
                لا توجد صور أو مستندات مرفقة على هذا الحجز حتى الآن. انقر على &quot;إرفاق ملفات / صور&quot; للرفع.
              </div>
            )}
          </Card>
        </Form>
      </div>
    </Modal>
  );
}
