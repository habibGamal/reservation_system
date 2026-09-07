import React, { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Alert,
    App,
    Badge,
    Button as AntButton,
    Card,
    Form,
    Input as AntInput,
    InputNumber,
    Modal,
    Popconfirm,
    Popover,
    Select as AntSelect,
    Space,
    Table,
    Tag,
    Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
    Banknote,
    BedDouble,
    Building2,
    CheckSquare,
    DoorOpen,
    Edit2,
    Filter,
    HelpCircle,
    Info,
    Layers,
    Plus,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import type { PriceRule, Sector, SharedProps, Unit } from '@/types/reservation';

interface UnitWithStats extends Unit {
    reservations_count?: number;
}

interface UnitManagementTabProps {
    units: UnitWithStats[];
    sectors: Sector[];
    priceRules: PriceRule[];
}

export function UnitManagementTab({
    units,
    sectors,
    priceRules,
}: UnitManagementTabProps) {
    const { message } = App.useApp();
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user;

    const canEditSector = (sectorId?: number) => {
        if (!sectorId) return false;
        if (user?.has_full_sector_access) return true;
        return user?.editable_sector_ids?.includes(sectorId) ?? false;
    };

    const editableSectors = useMemo(() => {
        if (user?.has_full_sector_access) return sectors;
        const editable = user?.editable_sector_ids ?? [];
        return sectors.filter((s) => editable.includes(s.id));
    }, [sectors, user?.has_full_sector_access, user?.editable_sector_ids]);

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitWithStats | null>(null);
    const [isBulkPriceRuleOpen, setIsBulkPriceRuleOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [sectorFilter, setSectorFilter] = useState<number | null>(null);
    const [priceRuleFilter, setPriceRuleFilter] = useState<number | 'none' | null>(null);

    // Row selection for bulk actions
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [bulkPriceForm] = Form.useForm();

    // Filtered data
    const filteredUnits = useMemo(() => {
        return units.filter((unit) => {
            const matchesSearch =
                !searchQuery.trim() ||
                unit.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                unit.sector?.name.toLowerCase().includes(searchQuery.trim().toLowerCase());

            const matchesSector =
                sectorFilter === null || unit.sector_id === sectorFilter;

            const matchesPriceRule =
                priceRuleFilter === null ||
                (priceRuleFilter === 'none' && !unit.price_rule_id) ||
                unit.price_rule_id === priceRuleFilter;

            return matchesSearch && matchesSector && matchesPriceRule;
        });
    }, [units, searchQuery, sectorFilter, priceRuleFilter]);

    // Sector options
    const sectorOptions = useMemo(
        () =>
            editableSectors.map((s) => ({
                value: s.id,
                label: s.name,
            })),
        [editableSectors],
    );

    // Price Rule options
    const priceRuleOptions = useMemo(
        () => [
            { value: 0, label: 'بدون قاعدة تسعير (غير مسعر)' },
            ...priceRules.map((pr) => ({
                value: pr.id,
                label: `${pr.name} (عضو: ${pr.rules?.['عضو'] ?? '-'} ج.م)`,
            })),
        ],
        [priceRules]
    );

    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            setIsSubmitting(true);
            router.post(
                '/units',
                {
                    ...values,
                    price_rule_id: values.price_rule_id === 0 ? null : values.price_rule_id,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success('تمت إضافة الوحدة السكنية بنجاح');
                        setIsCreateOpen(false);
                        createForm.resetFields();
                    },
                    onError: (errors) => {
                        const firstError = Object.values(errors)[0];
                        if (firstError) {
                            message.error(firstError as string);
                        }
                    },
                    onFinish: () => setIsSubmitting(false),
                }
            );
        } catch {
            // Validation failed
        }
    };

    const handleEdit = (unit: UnitWithStats) => {
        setEditingUnit(unit);
        editForm.setFieldsValue({
            sector_id: unit.sector_id,
            name: unit.name,
            rooms_count: unit.rooms_count,
            price_rule_id: unit.price_rule_id ?? 0,
        });
    };

    const handleUpdate = async () => {
        if (!editingUnit) return;
        try {
            const values = await editForm.validateFields();
            setIsSubmitting(true);
            router.put(
                `/units/${editingUnit.id}`,
                {
                    ...values,
                    price_rule_id: values.price_rule_id === 0 ? null : values.price_rule_id,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success('تم تحديث بيانات الوحدة بنجاح');
                        setEditingUnit(null);
                        editForm.resetFields();
                    },
                    onError: (errors) => {
                        const firstError = Object.values(errors)[0];
                        if (firstError) {
                            message.error(firstError as string);
                        }
                    },
                    onFinish: () => setIsSubmitting(false),
                }
            );
        } catch {
            // Validation failed
        }
    };

    const handleDelete = (unit: UnitWithStats) => {
        if ((unit.reservations_count ?? 0) > 0) {
            message.warning(
                `لا يمكن حذف هذه الوحدة لأنها مسجلة في ${unit.reservations_count} حجز.`
            );
            return;
        }

        router.delete(`/units/${unit.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                message.success('تم حذف الوحدة السكنية بنجاح');
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                if (firstError) {
                    message.error(firstError as string);
                }
            },
        });
    };

    const handleBulkPriceRule = async () => {
        if (selectedRowKeys.length === 0) return;
        try {
            const values = await bulkPriceForm.validateFields();
            setIsSubmitting(true);
            router.post(
                '/units/bulk-price-rule',
                {
                    unit_ids: selectedRowKeys.map(Number),
                    price_rule_id: values.price_rule_id === 0 ? null : values.price_rule_id,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success(
                            `تم تحديث قاعدة التسعير لـ ${selectedRowKeys.length} وحدة بنجاح`
                        );
                        setSelectedRowKeys([]);
                        setIsBulkPriceRuleOpen(false);
                        bulkPriceForm.resetFields();
                    },
                    onError: (errors) => {
                        const firstError = Object.values(errors)[0];
                        if (firstError) {
                            message.error(firstError as string);
                        }
                    },
                    onFinish: () => setIsSubmitting(false),
                }
            );
        } catch {
            // Validation failed
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setSectorFilter(null);
        setPriceRuleFilter(null);
    };

    const columns: TableColumnsType<UnitWithStats> = [
        {
            title: 'اسم / رقم الوحدة',
            dataIndex: 'name',
            key: 'name',
            width: 170,
            sorter: (a, b) => {
                const numA = parseInt(a.name, 10);
                const numB = parseInt(b.name, 10);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.name.localeCompare(b.name, 'ar');
            },
            render: (name: string) => (
                <div className="flex items-center gap-2 font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <DoorOpen className="h-4 w-4" />
                    </div>
                    <span>{name}</span>
                </div>
            ),
        },
        {
            title: 'القطاع',
            key: 'sector',
            width: 170,
            sorter: (a, b) =>
                (a.sector?.name ?? '').localeCompare(b.sector?.name ?? '', 'ar'),
            render: (_, record) => (
                <Tag color="cyan" className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-medium">
                    <Building2 className="h-3 w-3" />
                    <span>{record.sector?.name ?? 'غير محدد'}</span>
                </Tag>
            ),
        },
        {
            title: 'عدد الغرف',
            dataIndex: 'rooms_count',
            key: 'rooms_count',
            width: 130,
            align: 'center',
            sorter: (a, b) => a.rooms_count - b.rooms_count,
            render: (rooms: number) => (
                <Tag color="purple" className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5">
                    <BedDouble className="h-3 w-3" />
                    <span>{rooms} {rooms > 2 ? 'غرف' : 'غرفة'}</span>
                </Tag>
            ),
        },
        {
            title: 'قاعدة التسعير المطبقة',
            key: 'price_rule',
            width: 250,
            render: (_, record) => {
                const rule = record.price_rule;
                if (!rule) {
                    return (
                        <Tag color="warning" className="rounded-md">
                            غير مسعر (لا توجد قاعدة)
                        </Tag>
                    );
                }

                const rates = rule.rules || {};
                const popoverContent = (
                    <div className="w-56 space-y-1.5 p-1 text-xs">
                        <div className="font-semibold text-foreground border-b pb-1">
                            {rule.name}
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">عضو:</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {rates['عضو'] ?? '-'} ج.م
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">غير عضو:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                                {rates['غير عضو'] ?? '-'} ج.م
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">مرافق:</span>
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">
                                {rates['مرافق'] ?? '-'} ج.م
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">مدني:</span>
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                                {rates['مدني'] ?? '-'} ج.م
                            </span>
                        </div>
                    </div>
                );

                return (
                    <Popover content={popoverContent} title="تفاصيل التسعير" trigger="hover">
                        <Tag
                            color="success"
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-0.5 font-medium hover:opacity-80"
                        >
                            <Banknote className="h-3.5 w-3.5" />
                            <span>{rule.name}</span>
                            <Info className="h-3 w-3 opacity-60" />
                        </Tag>
                    </Popover>
                );
            },
        },
        {
            title: 'إجمالي الحجوزات',
            key: 'reservations',
            width: 140,
            align: 'center',
            sorter: (a, b) =>
                (a.reservations_count ?? 0) - (b.reservations_count ?? 0),
            render: (_, record) => {
                const count = record.reservations_count ?? 0;
                return (
                    <span className="text-xs text-muted-foreground">
                        {count > 0 ? `${count} حجز مسجل` : 'لا توجد حجوزات'}
                    </span>
                );
            },
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 130,
            align: 'center',
            render: (_, record) => {
                const canEdit = canEditSector(record.sector_id);
                if (!canEdit) {
                    return (
                        <Tag color="default" className="text-xs">
                            عرض فقط
                        </Tag>
                    );
                }

                const hasReservations = (record.reservations_count ?? 0) > 0;
                return (
                    <Space size="small">
                        <Tooltip title="تعديل بيانات الوحدة">
                            <AntButton
                                type="text"
                                size="small"
                                icon={<Edit2 className="h-4 w-4 text-blue-500" />}
                                onClick={() => handleEdit(record)}
                            />
                        </Tooltip>
                        <Popconfirm
                            title="حذف الوحدة السكنية"
                            description={
                                hasReservations
                                    ? 'تنبيه: لا يمكن حذف هذه الوحدة لأنها مسجلة بحجوزات سابقة.'
                                    : 'هل أنت متأكد من حذف هذه الوحدة؟'
                            }
                            okText="تأكيد الحذف"
                            cancelText="إلغاء"
                            okButtonProps={{ danger: true, disabled: hasReservations }}
                            onConfirm={() => handleDelete(record)}
                        >
                            <Tooltip
                                title={
                                    hasReservations
                                        ? 'الوحدة مسجلة في حجوزات'
                                        : 'حذف الوحدة'
                                }
                            >
                                <AntButton
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<Trash2 className="h-4 w-4" />}
                                    disabled={hasReservations}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => {
            setSelectedRowKeys(keys);
        },
        getCheckboxProps: (record: UnitWithStats) => ({
            disabled: !canEditSector(record.sector_id),
        }),
    };

    return (
        <div className="space-y-4">
            {/* Filter & Action Toolbar */}
            <Card size="small" className="shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
                        <AntInput.Search
                            placeholder="بحث باسم أو رقم الوحدة..."
                            allowClear
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-52"
                        />

                        {/* Sector Filter */}
                        <AntSelect
                            placeholder="تصفية حسب القطاع"
                            allowClear
                            value={sectorFilter}
                            onChange={(val) => setSectorFilter(val ?? null)}
                            className="w-full sm:w-44"
                            options={sectorOptions}
                        />

                        {/* Price Rule Filter */}
                        <AntSelect
                            placeholder="تصفية حسب قاعدة التسعير"
                            allowClear
                            value={priceRuleFilter}
                            onChange={(val) => setPriceRuleFilter(val ?? null)}
                            className="w-full sm:w-52"
                            options={[
                                { value: 'none', label: '⚠️ غير مسعر (بدون قاعدة)' },
                                ...priceRules.map((pr) => ({
                                    value: pr.id,
                                    label: pr.name,
                                })),
                            ]}
                        />

                        {(searchQuery || sectorFilter !== null || priceRuleFilter !== null) && (
                            <AntButton
                                type="text"
                                icon={<RotateCcw className="h-3.5 w-3.5" />}
                                onClick={resetFilters}
                                size="small"
                                className="text-muted-foreground self-start sm:self-center"
                            >
                                إعادة ضبط
                            </AntButton>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        {selectedRowKeys.length > 0 && (
                            <AntButton
                                type="default"
                                icon={<Banknote className="h-4 w-4 text-emerald-600" />}
                                onClick={() => setIsBulkPriceRuleOpen(true)}
                                className="border-emerald-500/50 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 flex-1 sm:flex-initial"
                            >
                                تعيين تسعير مجمع ({selectedRowKeys.length})
                            </AntButton>
                        )}

                        {editableSectors.length > 0 && (
                            <AntButton
                                type="primary"
                                icon={<Plus className="h-4 w-4" />}
                                onClick={() => setIsCreateOpen(true)}
                                className="shadow-sm w-full sm:w-auto justify-center"
                            >
                                إضافة وحدة سكنية
                            </AntButton>
                        )}
                    </div>
                </div>

                {/* Bulk selection bar notification */}
                {selectedRowKeys.length > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            <span>تم تحديد {selectedRowKeys.length} وحدة سكنية</span>
                        </div>
                        <AntButton
                            type="link"
                            size="small"
                            onClick={() => setSelectedRowKeys([])}
                            className="text-xs text-primary"
                        >
                            إلغاء التحديد
                        </AntButton>
                    </div>
                )}
            </Card>

            {/* Units Table */}
            <Card size="small" className="shadow-xs">
                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={filteredUnits}
                    rowKey="id"
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        pageSizeOptions: ['15', '20', '35', '50', '100'],
                        showTotal: (total) => `إجمالي الوحدات: ${total}`,
                    }}
                    bordered
                    size="middle"
                    scroll={{ x: 900 }}
                    className="overflow-hidden rounded-lg"
                />
            </Card>

            {/* Create Unit Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <DoorOpen className="h-5 w-5 text-primary" />
                        <span>إضافة وحدة سكنية جديدة</span>
                    </div>
                }
                open={isCreateOpen}
                onOk={handleCreate}
                onCancel={() => {
                    setIsCreateOpen(false);
                    createForm.resetFields();
                }}
                confirmLoading={isSubmitting}
                okText="إضافة الوحدة"
                cancelText="إلغاء"
                destroyOnClose
                style={{ maxWidth: 'calc(100vw - 32px)' }}
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    className="pt-2"
                    initialValues={{ rooms_count: 1, price_rule_id: 0 }}
                >
                    <Form.Item
                        name="sector_id"
                        label="القطاع التابع له"
                        rules={[{ required: true, message: 'يرجى اختيار القطاع' }]}
                    >
                        <AntSelect
                            placeholder="اختر القطاع"
                            options={sectorOptions}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '')
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="اسم أو رقم الوحدة"
                        rules={[
                            { required: true, message: 'يرجى إدخال اسم أو رقم الوحدة' },
                            { max: 100, message: 'الاسم طويل جداً' },
                        ]}
                    >
                        <AntInput placeholder="مثال: 101 أو فيلا 5 أو شاليه 12" />
                    </Form.Item>

                    <Form.Item
                        name="rooms_count"
                        label="عدد الغرف"
                        rules={[
                            { required: true, message: 'يرجى تحديد عدد الغرف' },
                            { type: 'number', min: 1, max: 50, message: 'العدد غير صحيح' },
                        ]}
                    >
                        <InputNumber min={1} max={50} className="w-full" />
                    </Form.Item>

                    <Form.Item
                        name="price_rule_id"
                        label="قاعدة التسعير المطبقة"
                        tooltip="تحدد الأسعار اليومية لفئات العضو، غير العضو، المرافق، والمدني"
                    >
                        <AntSelect
                            placeholder="اختر قاعدة التسعير"
                            options={priceRuleOptions}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Unit Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Edit2 className="h-5 w-5 text-primary" />
                        <span>تعديل بيانات الوحدة السكنية</span>
                    </div>
                }
                open={Boolean(editingUnit)}
                onOk={handleUpdate}
                onCancel={() => {
                    setEditingUnit(null);
                    editForm.resetFields();
                }}
                confirmLoading={isSubmitting}
                okText="حفظ التعديلات"
                cancelText="إلغاء"
                destroyOnClose
                style={{ maxWidth: 'calc(100vw - 32px)' }}
            >
                <Form form={editForm} layout="vertical" className="pt-2">
                    <Form.Item
                        name="sector_id"
                        label="القطاع التابع له"
                        rules={[{ required: true, message: 'يرجى اختيار القطاع' }]}
                    >
                        <AntSelect
                            placeholder="اختر القطاع"
                            options={sectorOptions}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '')
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="اسم أو رقم الوحدة"
                        rules={[
                            { required: true, message: 'يرجى إدخال اسم أو رقم الوحدة' },
                            { max: 100, message: 'الاسم طويل جداً' },
                        ]}
                    >
                        <AntInput placeholder="اسم أو رقم الوحدة" />
                    </Form.Item>

                    <Form.Item
                        name="rooms_count"
                        label="عدد الغرف"
                        rules={[
                            { required: true, message: 'يرجى تحديد عدد الغرف' },
                            { type: 'number', min: 1, max: 50, message: 'العدد غير صحيح' },
                        ]}
                    >
                        <InputNumber min={1} max={50} className="w-full" />
                    </Form.Item>

                    <Form.Item
                        name="price_rule_id"
                        label="قاعدة التسعير المطبقة"
                    >
                        <AntSelect
                            placeholder="اختر قاعدة التسعير"
                            options={priceRuleOptions}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Bulk Assign Price Rule Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Banknote className="h-5 w-5 text-emerald-600" />
                        <span>تعيين قاعدة تسعير مجمعة ({selectedRowKeys.length} وحدة)</span>
                    </div>
                }
                open={isBulkPriceRuleOpen}
                onOk={handleBulkPriceRule}
                onCancel={() => {
                    setIsBulkPriceRuleOpen(false);
                    bulkPriceForm.resetFields();
                }}
                confirmLoading={isSubmitting}
                okText="تطبيق التسعير المجمع"
                cancelText="إلغاء"
                destroyOnClose
                style={{ maxWidth: 'calc(100vw - 32px)' }}
            >
                <div className="mb-4">
                    <Alert
                        message="تنبيه التحديث المجمع"
                        description={`سيتم تطبيق قاعدة التسعير المختارة على جميع الوحدات المحددة حالياً (${selectedRowKeys.length} وحدة). الحجوزات المستقبلية أو الجديدة ستعتمد هذا التسعير.`}
                        type="info"
                        showIcon
                    />
                </div>
                <Form form={bulkPriceForm} layout="vertical" initialValues={{ price_rule_id: 0 }}>
                    <Form.Item
                        name="price_rule_id"
                        label="قاعدة التسعير المراد تطبيقها"
                        rules={[{ required: true, message: 'يرجى اختيار قاعدة تسعير' }]}
                    >
                        <AntSelect
                            placeholder="اختر قاعدة التسعير"
                            options={priceRuleOptions}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
