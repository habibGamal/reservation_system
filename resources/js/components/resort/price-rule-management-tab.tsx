import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    App,
    Button as AntButton,
    Card,
    Col,
    Form,
    Input as AntInput,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Space,
    Table,
    Tag,
    Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
    Banknote,
    DoorOpen,
    Edit2,
    Plus,
    Shield,
    Sparkles,
    Trash2,
    UserCheck,
    Users,
} from 'lucide-react';
import type { PriceRule } from '@/types/reservation';

const STANDARD_RULE_KEYS = new Set(['عضو', 'غير عضو', 'مرافق', 'مدني', 'price_per_night', 'rate']);

interface CustomPricingOption {
    id: string;
    name: string;
    price: number | null;
}

interface PriceRuleWithUnitsCount extends PriceRule {
    units_count?: number;
}

interface PriceRuleManagementTabProps {
    priceRules: PriceRuleWithUnitsCount[];
}

export function PriceRuleManagementTab({
    priceRules,
}: PriceRuleManagementTabProps) {
    const { message } = App.useApp();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PriceRuleWithUnitsCount | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [createCustomOptions, setCreateCustomOptions] = useState<CustomPricingOption[]>([]);
    const [editCustomOptions, setEditCustomOptions] = useState<CustomPricingOption[]>([]);

    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const filteredRules = priceRules.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    const addCreateCustomOption = () => {
        setCreateCustomOptions((prev) => [
            ...prev,
            { id: Math.random().toString(36).substring(2, 9), name: '', price: null },
        ]);
    };

    const updateCreateCustomOption = (id: string, field: 'name' | 'price', value: any) => {
        setCreateCustomOptions((prev) =>
            prev.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
        );
    };

    const removeCreateCustomOption = (id: string) => {
        setCreateCustomOptions((prev) => prev.filter((opt) => opt.id !== id));
    };

    const addEditCustomOption = () => {
        setEditCustomOptions((prev) => [
            ...prev,
            { id: Math.random().toString(36).substring(2, 9), name: '', price: null },
        ]);
    };

    const updateEditCustomOption = (id: string, field: 'name' | 'price', value: any) => {
        setEditCustomOptions((prev) =>
            prev.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
        );
    };

    const removeEditCustomOption = (id: string) => {
        setEditCustomOptions((prev) => prev.filter((opt) => opt.id !== id));
    };

    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();

            const customRules: Record<string, number> = {};
            for (const opt of createCustomOptions) {
                const trimmed = opt.name.trim();
                if (!trimmed) {
                    message.error('يرجى كتابة اسم لجميع الفئات الإضافية أو حذف الحقول الفارغة');
                    return;
                }
                if (STANDARD_RULE_KEYS.has(trimmed)) {
                    message.error(`الفئة "${trimmed}" موجودة بالفعل ضمن الفئات الأساسية`);
                    return;
                }
                if (customRules[trimmed] !== undefined) {
                    message.error(`الفئة "${trimmed}" مكررة أكثر من مرة`);
                    return;
                }
                if (opt.price === null || opt.price === undefined || isNaN(Number(opt.price))) {
                    message.error(`يرجى تحديد السعر لفئة "${trimmed}"`);
                    return;
                }
                if (Number(opt.price) < 0) {
                    message.error(`لا يمكن أن يكون سعر فئة "${trimmed}" سالباً`);
                    return;
                }
                customRules[trimmed] = Number(opt.price);
            }

            setIsSubmitting(true);
            router.post(
                '/price-rules',
                {
                    name: values.name,
                    rules: {
                        عضو: Number(values.member_price),
                        'غير عضو': Number(values.non_member_price),
                        مرافق: Number(values.companion_price),
                        مدني: Number(values.civilian_price),
                        ...customRules,
                    },
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success('تمت إضافة قاعدة التسعير بنجاح');
                        setIsCreateOpen(false);
                        createForm.resetFields();
                        setCreateCustomOptions([]);
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

    const handleEdit = (rule: PriceRuleWithUnitsCount) => {
        setEditingRule(rule);
        const isMeal = rule.type === 'meal' || rule.name === 'وجبات غذائية';
        const rulesMap = rule.rules || {};
        const mealPrice = rulesMap['price_per_night'] ?? rulesMap['rate'] ?? rulesMap['عضو'] ?? 450;

        const customTiers: CustomPricingOption[] = Object.entries(rulesMap)
            .filter(([key]) => !STANDARD_RULE_KEYS.has(key))
            .map(([key, value]) => ({
                id: Math.random().toString(36).substring(2, 9),
                name: key,
                price: Number(value),
            }));
        setEditCustomOptions(customTiers);

        editForm.setFieldsValue({
            name: rule.name,
            meal_price: mealPrice,
            member_price: rulesMap['عضو'] ?? mealPrice,
            non_member_price: rulesMap['غير عضو'] ?? mealPrice,
            companion_price: rulesMap['مرافق'] ?? mealPrice,
            civilian_price: rulesMap['مدني'] ?? mealPrice,
        });
    };

    const handleUpdate = async () => {
        if (!editingRule) return;
        try {
            const values = await editForm.validateFields();
            const isMeal = editingRule.type === 'meal' || editingRule.name === 'وجبات غذائية';

            const customRules: Record<string, number> = {};
            if (!isMeal) {
                for (const opt of editCustomOptions) {
                    const trimmed = opt.name.trim();
                    if (!trimmed) {
                        message.error('يرجى كتابة اسم لجميع الفئات الإضافية أو حذف الحقول الفارغة');
                        return;
                    }
                    if (STANDARD_RULE_KEYS.has(trimmed)) {
                        message.error(`الفئة "${trimmed}" موجودة بالفعل ضمن الفئات الأساسية`);
                        return;
                    }
                    if (customRules[trimmed] !== undefined) {
                        message.error(`الفئة "${trimmed}" مكررة أكثر من مرة`);
                        return;
                    }
                    if (opt.price === null || opt.price === undefined || isNaN(Number(opt.price))) {
                        message.error(`يرجى تحديد السعر لفئة "${trimmed}"`);
                        return;
                    }
                    if (Number(opt.price) < 0) {
                        message.error(`لا يمكن أن يكون سعر فئة "${trimmed}" سالباً`);
                        return;
                    }
                    customRules[trimmed] = Number(opt.price);
                }
            }

            setIsSubmitting(true);
            const payload = isMeal
                ? {
                    name: values.name,
                    type: 'meal',
                    rules: {
                        price_per_night: Number(values.meal_price),
                    },
                }
                : {
                    name: values.name,
                    type: 'unit',
                    rules: {
                        عضو: Number(values.member_price),
                        'غير عضو': Number(values.non_member_price),
                        مرافق: Number(values.companion_price),
                        مدني: Number(values.civilian_price),
                        ...customRules,
                    },
                };

            router.put(
                `/price-rules/${editingRule.id}`,
                payload,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        message.success('تم تحديث قاعدة التسعير بنجاح');
                        setEditingRule(null);
                        editForm.resetFields();
                        setEditCustomOptions([]);
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

    const handleDelete = (rule: PriceRuleWithUnitsCount) => {
        router.delete(`/price-rules/${rule.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                message.success('تم حذف قاعدة التسعير بنجاح');
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                if (firstError) {
                    message.error(firstError as string);
                }
            },
        });
    };

    const columns: TableColumnsType<PriceRuleWithUnitsCount> = [
        {
            title: 'اسم قاعدة التسعير',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name, 'ar'),
            render: (name: string, record) => {
                const isMeal = record.type === 'meal' || record.name === 'وجبات غذائية';
                return (
                    <div className="flex items-center gap-2 font-semibold">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isMeal ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                            <Banknote className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{name}</span>
                            {isMeal && <Tag color="gold" className="text-[10px] m-0 font-bold">تسعير وجبات</Tag>}
                        </div>
                    </div>
                );
            },
        },
        {
            title: (
                <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>عضو</span>
                </span>
            ),
            key: 'member',
            width: 130,
            align: 'center',
            sorter: (a, b) => (Number(a.rules?.['عضو']) || 0) - (Number(b.rules?.['عضو']) || 0),
            render: (_, record) => {
                const isMeal = record.type === 'meal' || record.name === 'وجبات غذائية';
                const price = isMeal
                    ? (record.rules?.['price_per_night'] ?? record.rules?.['rate'] ?? record.rules?.['عضو'] ?? 450)
                    : record.rules?.['عضو'];
                return (
                    <span className={`font-semibold ${isMeal ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {price !== undefined ? `${Number(price).toLocaleString()} ج.م` : '-'}
                    </span>
                );
            },
        },
        {
            title: (
                <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>غير عضو</span>
                </span>
            ),
            key: 'non_member',
            width: 130,
            align: 'center',
            sorter: (a, b) =>
                (Number(a.rules?.['غير عضو']) || 0) - (Number(b.rules?.['غير عضو']) || 0),
            render: (_, record) => {
                const isMeal = record.type === 'meal' || record.name === 'وجبات غذائية';
                const price = isMeal
                    ? (record.rules?.['price_per_night'] ?? record.rules?.['rate'] ?? record.rules?.['غير عضو'] ?? 450)
                    : record.rules?.['غير عضو'];
                return (
                    <span className={`font-semibold ${isMeal ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {price !== undefined ? `${Number(price).toLocaleString()} ج.م` : '-'}
                    </span>
                );
            },
        },
        {
            title: (
                <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>مرافق</span>
                </span>
            ),
            key: 'companion',
            width: 130,
            align: 'center',
            sorter: (a, b) =>
                (Number(a.rules?.['مرافق']) || 0) - (Number(b.rules?.['مرافق']) || 0),
            render: (_, record) => {
                const isMeal = record.type === 'meal' || record.name === 'وجبات غذائية';
                const price = isMeal
                    ? (record.rules?.['price_per_night'] ?? record.rules?.['rate'] ?? record.rules?.['مرافق'] ?? 450)
                    : record.rules?.['مرافق'];
                return (
                    <span className={`font-semibold ${isMeal ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {price !== undefined ? `${Number(price).toLocaleString()} ج.م` : '-'}
                    </span>
                );
            },
        },
        {
            title: (
                <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-amber-600" />
                    <span>مدني</span>
                </span>
            ),
            key: 'civilian',
            width: 130,
            align: 'center',
            sorter: (a, b) =>
                (Number(a.rules?.['مدني']) || 0) - (Number(b.rules?.['مدني']) || 0),
            render: (_, record) => {
                const isMeal = record.type === 'meal' || record.name === 'وجبات غذائية';
                const price = isMeal
                    ? (record.rules?.['price_per_night'] ?? record.rules?.['rate'] ?? record.rules?.['مدني'] ?? 450)
                    : record.rules?.['مدني'];
                return (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {price !== undefined ? `${Number(price).toLocaleString()} ج.م` : '-'}
                    </span>
                );
            },
        },
        {
            title: (
                <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>خيارات إضافية</span>
                </span>
            ),
            key: 'extra_options',
            width: 180,
            align: 'center',
            render: (_, record) => {
                const isMeal = record.type === 'meal' || record.name === 'وجبات غذائية';
                if (isMeal) {
                    return <span className="text-muted-foreground text-xs">-</span>;
                }
                const extraEntries = Object.entries(record.rules || {}).filter(
                    ([k]) => !STANDARD_RULE_KEYS.has(k)
                );
                if (extraEntries.length === 0) {
                    return <span className="text-muted-foreground text-xs">-</span>;
                }
                return (
                    <div className="flex flex-wrap gap-1 justify-center">
                        {extraEntries.map(([k, v]) => (
                            <Tooltip key={k} title={`سعر فئة ${k}: ${Number(v).toLocaleString()} ج.م`}>
                                <Tag color="purple" className="m-0 text-xs font-medium">
                                    <span className="font-semibold">{k}:</span> {Number(v).toLocaleString()} ج.م
                                </Tag>
                            </Tooltip>
                        ))}
                    </div>
                );
            },
        },
        {
            title: 'الوحدات المطبقة عليها',
            key: 'units_count',
            width: 150,
            align: 'center',
            sorter: (a, b) => (a.units_count ?? 0) - (b.units_count ?? 0),
            render: (_, record) => {
                const count = record.units_count ?? 0;
                return (
                    <Tag
                        color={count > 0 ? 'cyan' : 'default'}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 font-medium"
                    >
                        <DoorOpen className="h-3.5 w-3.5" />
                        <span>{count} وحدة</span>
                    </Tag>
                );
            },
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 130,
            align: 'center',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="تعديل قاعدة التسعير">
                        <AntButton
                            type="text"
                            size="small"
                            icon={<Edit2 className="h-4 w-4 text-blue-500" />}
                            onClick={() => handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="حذف قاعدة التسعير"
                        description={
                            (record.units_count ?? 0) > 0
                                ? `تنبيه: هناك ${record.units_count} وحدة مرتبطة بهذه القاعدة حالياً. هل أنت متأكد من حذفها؟`
                                : 'هل أنت متأكد من حذف قاعدة التسعير هذه؟'
                        }
                        okText="تأكيد الحذف"
                        cancelText="إلغاء"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record)}
                    >
                        <Tooltip title="حذف قاعدة التسعير">
                            <AntButton
                                type="text"
                                size="small"
                                danger
                                icon={<Trash2 className="h-4 w-4" />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <Card size="small" className="shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row flex-1 sm:items-center gap-2">
                        <AntInput.Search
                            placeholder="بحث باسم قاعدة التسعير..."
                            allowClear
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:max-w-xs"
                        />
                        <span className="text-xs text-muted-foreground">
                            عرض {filteredRules.length} من أصل {priceRules.length} قاعدة تسعير
                        </span>
                    </div>

                    <AntButton
                        type="primary"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => setIsCreateOpen(true)}
                        className="shadow-sm w-full sm:w-auto justify-center"
                    >
                        إضافة قاعدة تسعير جديدة
                    </AntButton>
                </div>
            </Card>

            {/* Table */}
            <Card size="small" className="shadow-xs">
                <Table
                    columns={columns}
                    dataSource={filteredRules}
                    rowKey="id"
                    pagination={false}
                    bordered
                    size="middle"
                    scroll={{ x: 850 }}
                    className="overflow-hidden rounded-lg"
                />
            </Card>

            {/* Create Price Rule Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Banknote className="h-5 w-5 text-emerald-600" />
                        <span>إضافة قاعدة تسعير جديدة</span>
                    </div>
                }
                open={isCreateOpen}
                onOk={handleCreate}
                onCancel={() => {
                    setIsCreateOpen(false);
                    createForm.resetFields();
                    setCreateCustomOptions([]);
                }}
                confirmLoading={isSubmitting}
                okText="إضافة قاعدة التسعير"
                cancelText="إلغاء"
                destroyOnClose
                style={{ maxWidth: 'calc(100vw - 32px)' }}
            >
                <Form form={createForm} layout="vertical" className="pt-2">
                    <Form.Item
                        name="name"
                        label="اسم قاعدة التسعير"
                        rules={[{ required: true, message: 'يرجى إدخال اسم قاعدة التسعير' }]}
                    >
                        <AntInput
                            placeholder="مثال: تسعير شاليهات VIP، تسعير الفنادق الخاصة..."
                            autoFocus
                        />
                    </Form.Item>

                    <div className="rounded-lg border p-3 bg-muted/20">
                        <div className="mb-2.5 text-xs font-semibold text-muted-foreground">
                            تحديد الأسعار اليومية لكل فئة (بالجنيه المصري):
                        </div>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item
                                    name="member_price"
                                    label="سعر العضو"
                                    rules={[{ required: true, message: 'مطلوب' }]}
                                >
                                    <InputNumber
                                        min={0}
                                        step={50}
                                        addonAfter="ج.م"
                                        className="w-full"
                                        placeholder="0"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="non_member_price"
                                    label="سعر غير العضو"
                                    rules={[{ required: true, message: 'مطلوب' }]}
                                >
                                    <InputNumber
                                        min={0}
                                        step={50}
                                        addonAfter="ج.م"
                                        className="w-full"
                                        placeholder="0"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="companion_price"
                                    label="سعر المرافق"
                                    rules={[{ required: true, message: 'مطلوب' }]}
                                >
                                    <InputNumber
                                        min={0}
                                        step={50}
                                        addonAfter="ج.م"
                                        className="w-full"
                                        placeholder="0"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="civilian_price"
                                    label="سعر المدني"
                                    rules={[{ required: true, message: 'مطلوب' }]}
                                >
                                    <InputNumber
                                        min={0}
                                        step={50}
                                        addonAfter="ج.م"
                                        className="w-full"
                                        placeholder="0"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {/* Dynamic Custom Pricing Options */}
                    <div className="mt-3 rounded-lg border p-3 bg-muted/10">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                                    خيارات وفئات تسعير إضافية (اختياري)
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    إضافة فئات تسعير مخصصة بخلاف الفئات الأربعة الأساسية
                                </div>
                            </div>
                            <AntButton
                                type="dashed"
                                size="small"
                                icon={<Plus className="h-3.5 w-3.5" />}
                                onClick={addCreateCustomOption}
                            >
                                إضافة خيار آخر
                            </AntButton>
                        </div>

                        {createCustomOptions.length === 0 ? (
                            <div className="text-center py-2.5 text-xs text-muted-foreground border border-dashed rounded-md bg-background/50">
                                لا توجد خيارات إضافية. اضغط على "إضافة خيار آخر" لإضافة فئة جديدة.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {createCustomOptions.map((opt) => (
                                    <div key={opt.id} className="flex items-center gap-2 p-2 rounded-md bg-background border shadow-xs">
                                        <div className="flex-1">
                                            <AntInput
                                                placeholder="اسم الفئة (مثال: رتبة خاصة، جهة خارجية، سياحة...)"
                                                value={opt.name}
                                                onChange={(e) => updateCreateCustomOption(opt.id, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-36">
                                            <InputNumber
                                                min={0}
                                                step={50}
                                                addonAfter="ج.م"
                                                className="w-full"
                                                placeholder="السعر"
                                                value={opt.price}
                                                onChange={(val) => updateCreateCustomOption(opt.id, 'price', val)}
                                            />
                                        </div>
                                        <Tooltip title="حذف هذا الخيار">
                                            <AntButton
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<Trash2 className="h-4 w-4" />}
                                                onClick={() => removeCreateCustomOption(opt.id)}
                                            />
                                        </Tooltip>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Form>
            </Modal>

            {/* Edit Price Rule Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Edit2 className="h-5 w-5 text-emerald-600" />
                        <span>تعديل قاعدة التسعير</span>
                    </div>
                }
                open={Boolean(editingRule)}
                onOk={handleUpdate}
                onCancel={() => {
                    setEditingRule(null);
                    editForm.resetFields();
                    setEditCustomOptions([]);
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
                        label="اسم قاعدة التسعير"
                        rules={[{ required: true, message: 'يرجى إدخال اسم قاعدة التسعير' }]}
                    >
                        <AntInput placeholder="اسم قاعدة التسعير" autoFocus />
                    </Form.Item>

                    {editingRule?.type === 'meal' || editingRule?.name === 'وجبات غذائية' ? (
                        <div className="rounded-lg border p-3 bg-muted/20">
                            <div className="mb-2.5 text-xs font-semibold text-muted-foreground">
                                سعر الوجبة لليلة الواحدة (بالجنيه المصري):
                            </div>
                            <Form.Item
                                name="meal_price"
                                label="سعر الوجبة لليلة"
                                rules={[{ required: true, message: 'يرجى إدخال سعر الوجبة' }]}
                            >
                                <InputNumber
                                    min={0}
                                    step={50}
                                    addonAfter="ج.م"
                                    className="w-full"
                                />
                            </Form.Item>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-lg border p-3 bg-muted/20">
                                <div className="mb-2.5 text-xs font-semibold text-muted-foreground">
                                    تعديل الأسعار اليومية لكل فئة (بالجنيه المصري):
                                </div>
                                <Row gutter={12}>
                                    <Col span={12}>
                                        <Form.Item
                                            name="member_price"
                                            label="سعر العضو"
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={50}
                                                addonAfter="ج.م"
                                                className="w-full"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            name="non_member_price"
                                            label="سعر غير العضو"
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={50}
                                                addonAfter="ج.م"
                                                className="w-full"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            name="companion_price"
                                            label="سعر المرافق"
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={50}
                                                addonAfter="ج.م"
                                                className="w-full"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            name="civilian_price"
                                            label="سعر المدني"
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={50}
                                                addonAfter="ج.م"
                                                className="w-full"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>

                            {/* Dynamic Custom Pricing Options for Edit */}
                            <div className="mt-3 rounded-lg border p-3 bg-muted/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                                            خيارات وفئات تسعير إضافية (اختياري)
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            إضافة أو تعديل فئات تسعير مخصصة لهذه القاعدة
                                        </div>
                                    </div>
                                    <AntButton
                                        type="dashed"
                                        size="small"
                                        icon={<Plus className="h-3.5 w-3.5" />}
                                        onClick={addEditCustomOption}
                                    >
                                        إضافة خيار آخر
                                    </AntButton>
                                </div>

                                {editCustomOptions.length === 0 ? (
                                    <div className="text-center py-2.5 text-xs text-muted-foreground border border-dashed rounded-md bg-background/50">
                                        لا توجد خيارات إضافية. اضغط على "إضافة خيار آخر" لإضافة فئة جديدة.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {editCustomOptions.map((opt) => (
                                            <div key={opt.id} className="flex items-center gap-2 p-2 rounded-md bg-background border shadow-xs">
                                                <div className="flex-1">
                                                    <AntInput
                                                        placeholder="اسم الفئة (مثال: رتبة خاصة، جهة خارجية، سياحة...)"
                                                        value={opt.name}
                                                        onChange={(e) => updateEditCustomOption(opt.id, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="w-36">
                                                    <InputNumber
                                                        min={0}
                                                        step={50}
                                                        addonAfter="ج.م"
                                                        className="w-full"
                                                        placeholder="السعر"
                                                        value={opt.price}
                                                        onChange={(val) => updateEditCustomOption(opt.id, 'price', val)}
                                                    />
                                                </div>
                                                <Tooltip title="حذف هذا الخيار">
                                                    <AntButton
                                                        type="text"
                                                        danger
                                                        size="small"
                                                        icon={<Trash2 className="h-4 w-4" />}
                                                        onClick={() => removeEditCustomOption(opt.id)}
                                                    />
                                                </Tooltip>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
