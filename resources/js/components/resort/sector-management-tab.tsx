import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    App,
    Button as AntButton,
    Card,
    Form,
    Input as AntInput,
    Modal,
    Popconfirm,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
    Building2,
    DoorOpen,
    Edit2,
    Layers,
    Plus,
    Trash2,
    UtensilsCrossed,
} from 'lucide-react';
import type { Sector, SharedProps } from '@/types/reservation';

interface SectorWithStats extends Sector {
    units_sum_rooms_count?: number | null;
}

interface SectorManagementTabProps {
    sectors: SectorWithStats[];
}

export function SectorManagementTab({ sectors }: SectorManagementTabProps) {
    const { message } = App.useApp();
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user;

    const canCreateSector = Boolean(user?.has_full_sector_access);
    const canEditSector = (sectorId: number) => {
        if (user?.has_full_sector_access) return true;
        return user?.editable_sector_ids?.includes(sectorId) ?? false;
    };

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingSector, setEditingSector] = useState<SectorWithStats | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const filteredSectors = sectors.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            setIsSubmitting(true);
            router.post('/sectors', values, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success('تمت إضافة القطاع بنجاح');
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
            });
        } catch {
            // Validation failed
        }
    };

    const handleEdit = (sector: SectorWithStats) => {
        setEditingSector(sector);
        editForm.setFieldsValue({
            name: sector.name,
            has_meals: Boolean(sector.has_meals),
        });
    };

    const handleUpdate = async () => {
        if (!editingSector) return;
        try {
            const values = await editForm.validateFields();
            setIsSubmitting(true);
            router.put(`/sectors/${editingSector.id}`, values, {
                preserveScroll: true,
                onSuccess: () => {
                    message.success('تم تحديث بيانات القطاع بنجاح');
                    setEditingSector(null);
                    editForm.resetFields();
                },
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        message.error(firstError as string);
                    }
                },
                onFinish: () => setIsSubmitting(false),
            });
        } catch {
            // Validation failed
        }
    };

    const handleDelete = (sector: SectorWithStats) => {
        if ((sector.units_count ?? 0) > 0) {
            message.warning(
                `لا يمكن حذف هذا القطاع لأنه يحتوي على ${sector.units_count} وحدة سكنية. يرجى نقل أو حذف الوحدات أولاً.`
            );
            return;
        }

        router.delete(`/sectors/${sector.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                message.success('تم حذف القطاع بنجاح');
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                if (firstError) {
                    message.error(firstError as string);
                }
            },
        });
    };

    const columns: TableColumnsType<SectorWithStats> = [
        {
            title: '#',
            key: 'index',
            width: 70,
            align: 'center',
            render: (_, __, index) => (
                <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
            ),
        },
        {
            title: 'اسم القطاع',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name, 'ar'),
            render: (name: string) => (
                <div className="flex items-center gap-2 font-medium">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <span>{name}</span>
                </div>
            ),
        },
        {
            title: 'عدد الوحدات',
            key: 'units_count',
            width: 160,
            align: 'center',
            sorter: (a, b) => (a.units_count ?? 0) - (b.units_count ?? 0),
            render: (_, record) => {
                const count = record.units_count ?? 0;
                return (
                    <Tag
                        color={count > 0 ? 'blue' : 'default'}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold"
                    >
                        <DoorOpen className="h-3.5 w-3.5" />
                        <span>{count} وحدة</span>
                    </Tag>
                );
            },
        },
        {
            title: 'إجمالي الغرف',
            key: 'rooms_sum',
            width: 160,
            align: 'center',
            sorter: (a, b) => (a.units_sum_rooms_count ?? 0) - (b.units_sum_rooms_count ?? 0),
            render: (_, record) => {
                const rooms = record.units_sum_rooms_count ?? 0;
                return (
                    <Tag
                        color="purple"
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold"
                    >
                        <Layers className="h-3.5 w-3.5" />
                        <span>{rooms} غرفة</span>
                    </Tag>
                );
            },
        },
        {
            title: 'الوجبات الغذائية',
            dataIndex: 'has_meals',
            key: 'has_meals',
            width: 140,
            align: 'center',
            render: (hasMeals: boolean) =>
                hasMeals ? (
                    <Tag
                        color="orange"
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium"
                    >
                        <UtensilsCrossed className="h-3 w-3" />
                        <span>مفعّلة</span>
                    </Tag>
                ) : (
                    <Tag color="default" className="rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                        غير مفعلة
                    </Tag>
                ),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 140,
            align: 'center',
            render: (_, record) => {
                const canEdit = canEditSector(record.id);
                if (!canEdit) {
                    return (
                        <Tag color="default" className="text-xs">
                            عرض فقط
                        </Tag>
                    );
                }

                const hasUnits = (record.units_count ?? 0) > 0;
                return (
                    <Space size="small">
                        <Tooltip title="تعديل اسم القطاع">
                            <AntButton
                                type="text"
                                size="small"
                                icon={<Edit2 className="h-4 w-4 text-blue-500" />}
                                onClick={() => handleEdit(record)}
                            />
                        </Tooltip>
                        <Popconfirm
                            title="حذف القطاع"
                            description={
                                hasUnits
                                    ? 'تنبيه: يحتوي هذا القطاع على وحدات مرتبطة به، ولا يمكن حذفه مباشرة.'
                                    : 'هل أنت متأكد من حذف هذا القطاع بشكل نهائي؟'
                            }
                            okText="تأكيد الحذف"
                            cancelText="إلغاء"
                            okButtonProps={{ danger: true, disabled: hasUnits }}
                            onConfirm={() => handleDelete(record)}
                        >
                            <Tooltip
                                title={
                                    hasUnits
                                        ? 'لا يمكن حذف قطاع يحتوي على وحدات'
                                        : 'حذف القطاع'
                                }
                            >
                                <AntButton
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<Trash2 className="h-4 w-4" />}
                                    disabled={hasUnits}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <Card size="small" className="shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-2">
                        <AntInput.Search
                            placeholder="بحث باسم القطاع..."
                            allowClear
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:max-w-xs"
                        />
                        <span className="text-xs text-muted-foreground">
                            عرض {filteredSectors.length} من أصل {sectors.length} قطاع
                        </span>
                    </div>

                    {canCreateSector && (
                        <AntButton
                            type="primary"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => setIsCreateOpen(true)}
                            className="shadow-sm w-full sm:w-auto justify-center"
                        >
                            إضافة قطاع جديد
                        </AntButton>
                    )}
                </div>
            </Card>

            {/* Sectors Table */}
            <Card size="small" className="shadow-xs">
                <Table
                    columns={columns}
                    dataSource={filteredSectors}
                    rowKey="id"
                    pagination={{
                        pageSize: 15,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '15', '25', '50'],
                        showTotal: (total) => `إجمالي القطاعات: ${total}`,
                    }}
                    bordered
                    size="middle"
                    scroll={{ x: 600 }}
                    className="overflow-hidden rounded-lg"
                />
            </Card>

            {/* Create Sector Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span>إضافة قطاع جديد بالمنتجع</span>
                    </div>
                }
                open={isCreateOpen}
                onOk={handleCreate}
                onCancel={() => {
                    setIsCreateOpen(false);
                    createForm.resetFields();
                }}
                confirmLoading={isSubmitting}
                okText="إضافة القطاع"
                cancelText="إلغاء"
                destroyOnClose
                style={{ maxWidth: 'calc(100vw - 32px)' }}
            >
                <Form form={createForm} layout="vertical" className="pt-2">
                    <Form.Item
                        name="name"
                        label="اسم القطاع"
                        rules={[
                            { required: true, message: 'يرجى إدخال اسم القطاع' },
                            { max: 255, message: 'اسم القطاع طويل جداً' },
                        ]}
                    >
                        <AntInput
                            placeholder="مثال: فندق 7، كبائن الشاطئ، شاليهات الرواد..."
                            autoFocus
                        />
                    </Form.Item>

                    <Form.Item
                        name="has_meals"
                        label="خدمة الوجبات الغذائية"
                        valuePropName="checked"
                        initialValue={false}
                        extra="عند التفعيل، يتم احتساب وجبات غذائية افتراضياً لحجوزات هذا القطاع"
                    >
                        <Switch checkedChildren="مفعّلة" unCheckedChildren="معطلة" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Sector Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Edit2 className="h-5 w-5 text-primary" />
                        <span>تعديل بيانات القطاع</span>
                    </div>
                }
                open={Boolean(editingSector)}
                onOk={handleUpdate}
                onCancel={() => {
                    setEditingSector(null);
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
                        name="name"
                        label="اسم القطاع"
                        rules={[
                            { required: true, message: 'يرجى إدخال اسم القطاع' },
                            { max: 255, message: 'اسم القطاع طويل جداً' },
                        ]}
                    >
                        <AntInput placeholder="اسم القطاع" autoFocus />
                    </Form.Item>

                    <Form.Item
                        name="has_meals"
                        label="خدمة الوجبات الغذائية"
                        valuePropName="checked"
                        extra="عند التفعيل، يتم احتساب وجبات غذائية افتراضياً لحجوزات هذا القطاع"
                    >
                        <Switch checkedChildren="مفعّلة" unCheckedChildren="معطلة" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
