import React, { useEffect, useMemo, useState } from 'react';
import { Guest } from '@/types/reservation';
import {
  App,
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  LoadingOutlined,
  PhoneOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SwapOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface GuestComboboxProps {
  value: string; // guest_id
  onChange: (guestId: string, guest?: Guest) => void;
  guests: Guest[];
  initialGuest?: Guest | null;
  onGuestsUpdate?: (updatedGuests: Guest[]) => void;
  error?: string;
  disabled?: boolean;
  onViewGuestDetails?: (guest: Guest) => void;
}

function getXsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function GuestCombobox({
  value,
  onChange,
  guests,
  initialGuest,
  onGuestsUpdate,
  error,
  disabled = false,
  onViewGuestDetails,
}: GuestComboboxProps) {
  const { message } = App.useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [allGuests, setAllGuests] = useState<Guest[]>(() => {
    if (initialGuest && !guests.some((g) => g.id === initialGuest.id)) {
      return [initialGuest, ...guests];
    }
    return guests;
  });
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [isLoadingGuestById, setIsLoadingGuestById] = useState(false);

  // Inline creation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMilCode, setNewMilCode] = useState('');
  const [isSubmittingNewGuest, setIsSubmittingNewGuest] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Sync initialGuest
  useEffect(() => {
    if (initialGuest) {
      setAllGuests((prev) => {
        const index = prev.findIndex((g) => g.id === initialGuest.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...initialGuest };
          return updated;
        }
        return [initialGuest, ...prev];
      });
    }
  }, [initialGuest]);

  // Sync external guests
  useEffect(() => {
    setAllGuests((prev) => {
      const existingIds = new Set(prev.map((g) => g.id));
      const newlyAdded = guests.filter((g) => !existingIds.has(g.id));
      if (newlyAdded.length === 0) return prev;
      return [...newlyAdded, ...prev];
    });
  }, [guests]);

  // Auto-fetch guest if value is set but guest is not in allGuests
  useEffect(() => {
    if (!value || isNaN(Number(value))) return;
    const exists = allGuests.some((g) => String(g.id) === String(value));
    if (exists) return;

    let isMounted = true;
    setIsLoadingGuestById(true);

    fetch(`/guests/${value}`, {
      headers: {
        Accept: 'application/json',
      },
      credentials: 'same-origin',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Guest not found');
        return res.json();
      })
      .then((resData) => {
        if (isMounted && resData.guest) {
          const fetchedGuest: Guest = resData.guest;
          setAllGuests((prev) => {
            if (prev.some((g) => g.id === fetchedGuest.id)) return prev;
            return [fetchedGuest, ...prev];
          });
        }
      })
      .catch(() => {
        // Silently catch network or 404
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingGuestById(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, allGuests]);

  // Find currently selected guest
  const selectedGuest = useMemo(() => {
    if (!value) return undefined;
    return allGuests.find((g) => String(g.id) === String(value));
  }, [allGuests, value]);

  // Debounced remote search
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const response = await fetch(`/guests?search=${encodeURIComponent(trimmed)}`, {
          headers: {
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        });

        if (response.ok) {
          const remoteResults: Guest[] = await response.json();
          setAllGuests((prev) => {
            const map = new Map<number, Guest>();
            // Keep remote results first, then existing
            remoteResults.forEach((g) => map.set(g.id, g));
            prev.forEach((g) => {
              if (!map.has(g.id)) map.set(g.id, g);
            });
            const merged = Array.from(map.values());
            if (onGuestsUpdate) {
              onGuestsUpdate(merged);
            }
            return merged;
          });
        }
      } catch {
        // Ignore network errors in background search
      } finally {
        setIsSearchingRemote(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, onGuestsUpdate]);

  // Filtered guest list for display
  const filteredGuests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allGuests.slice(0, 40);

    return allGuests.filter((g) => {
      const nameMatch = g.name.toLowerCase().includes(term);
      const phoneMatch = g.phone.includes(term);
      const milMatch = g.mil_code ? g.mil_code.toLowerCase().includes(term) : false;
      return nameMatch || phoneMatch || milMatch;
    });
  }, [allGuests, searchTerm]);

  // Handle selecting a guest
  const handleSelect = (guestId: string) => {
    const found = allGuests.find((g) => String(g.id) === guestId);
    onChange(guestId, found);
    setSearchTerm('');
  };

  // Handle clear
  const handleClear = () => {
    onChange('', undefined);
  };

  // Open inline creation modal
  const openCreateDialog = () => {
    const term = searchTerm.trim();
    const isDigitsOnly = /^[\d+ -]+$/.test(term);

    if (isDigitsOnly && term.length >= 3) {
      setNewPhone(term);
      setNewName('');
    } else {
      setNewName(term);
      setNewPhone('');
    }

    setNewMilCode('');
    setCreateErrors({});
    setCreateDialogOpen(true);
  };

  // Submit inline guest creation
  const handleCreateGuest = async () => {
    setCreateErrors({});

    if (!newName.trim()) {
      setCreateErrors((prev) => ({ ...prev, name: 'اسم النزيل مطلوب' }));
      return;
    }
    if (!newPhone.trim()) {
      setCreateErrors((prev) => ({ ...prev, phone: 'رقم الهاتف مطلوب' }));
      return;
    }

    setIsSubmittingNewGuest(true);

    try {
      const response = await fetch('/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': getXsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          mil_code: newMilCode.trim() || null,
        }),
      });

      const resData = await response.json();

      if (response.ok && resData.guest) {
        const createdGuest: Guest = resData.guest;

        // Add to local state
        setAllGuests((prev) => [createdGuest, ...prev]);
        if (onGuestsUpdate) {
          onGuestsUpdate([createdGuest, ...allGuests]);
        }

        // Auto-select the newly created guest
        onChange(String(createdGuest.id), createdGuest);

        setCreateDialogOpen(false);
        setSearchTerm('');
        message.success(`تم تسجيل النزيل "${createdGuest.name}" وربطه بالحجز بنجاح`);
      } else if (response.status === 422 && resData.errors) {
        const mappedErrors: Record<string, string> = {};
        Object.keys(resData.errors).forEach((key) => {
          mappedErrors[key] = Array.isArray(resData.errors[key])
            ? resData.errors[key][0]
            : resData.errors[key];
        });
        setCreateErrors(mappedErrors);
      } else {
        message.error(resData.message || 'حدث خطأ أثناء حفظ بيانات النزيل');
      }
    } catch {
      message.error('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmittingNewGuest(false);
    }
  };

  // Select options mapped from filteredGuests
  const selectOptions = useMemo(() => {
    const options = filteredGuests.map((guest) => ({
      value: String(guest.id),
      label: guest.name,
      guest,
    }));

    if (selectedGuest && !options.some((o) => o.value === String(selectedGuest.id))) {
      options.unshift({
        value: String(selectedGuest.id),
        label: selectedGuest.name,
        guest: selectedGuest,
      });
    }

    return options;
  }, [filteredGuests, selectedGuest]);

  return (
    <div className="w-full" dir="rtl">
      {/* Loading state when fetching guest by ID */}
      {isLoadingGuestById ? (
        <Card
          size="small"
          className="border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20"
          styles={{
            body: {
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            },
          }}
        >
          <LoadingOutlined spin className="text-sky-600 text-base" />
          <Text type="secondary" className="text-xs">
            جاري استرجاع بيانات النزيل...
          </Text>
        </Card>
      ) : selectedGuest ? (
        <Card
          size="small"
          className="border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20"
          styles={{
            body: {
              padding: '10px 12px',
            },
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Avatar
                size={36}
                icon={<UserOutlined />}
                className="bg-sky-500 text-white shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-100 break-words leading-tight">
                    {selectedGuest.name}
                  </span>
                  {selectedGuest.mil_code && (
                    <Tag
                      color="blue"
                      icon={<SafetyCertificateOutlined />}
                      className="text-[10px] sm:text-[11px] m-0"
                    >
                      {selectedGuest.mil_code}
                    </Tag>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex-wrap">
                  <span dir="ltr" className="font-mono font-medium">
                    {selectedGuest.phone}
                  </span>
                  {typeof selectedGuest.reservations_count === 'number' && (
                    <Tag color="cyan" className="text-[10px] m-0">
                      {selectedGuest.reservations_count} حجز سابق
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:shrink-0 justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200/60 dark:border-stone-800/60">
              {onViewGuestDetails && (
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onViewGuestDetails(selectedGuest)}
                  className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950 text-xs px-2"
                >
                  سجل النزيل
                </Button>
              )}

              {!disabled && (
                <>
                  <Button
                    size="small"
                    icon={<SwapOutlined />}
                    onClick={handleClear}
                    className="text-xs px-2"
                  >
                    تغيير
                  </Button>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={handleClear}
                    title="إلغاء التحديد"
                    className="px-1.5"
                  />
                </>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div>
          <Select
            showSearch={{
              filterOption: false,
              searchValue: searchTerm,
              onSearch: setSearchTerm,
            }}
            value={value ? String(value) : undefined}
            placeholder="ابحث بالاسم، رقم الهاتف، أو الرقم العسكري..."
            status={error ? 'error' : undefined}
            disabled={disabled}
            className="w-full"
            onChange={handleSelect}
            options={selectOptions}
            suffixIcon={
              isSearchingRemote ? (
                <LoadingOutlined spin className="text-sky-600" />
              ) : (
                <SearchOutlined className="text-stone-400" />
              )
            }
            optionRender={(option) => {
              const g = option.data.guest as Guest;
              return (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar size={24} icon={<UserOutlined />} className="bg-stone-200 text-stone-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate">{g.name}</span>
                        {g.mil_code && (
                          <Tag color="blue" className="text-[10px] py-0 px-1 m-0">
                            {g.mil_code}
                          </Tag>
                        )}
                      </div>
                      <div dir="ltr" className="font-mono text-[11px] text-stone-400">
                        {g.phone}
                      </div>
                    </div>
                  </div>
                  {typeof g.reservations_count === 'number' && g.reservations_count > 0 && (
                    <Tag color="purple" className="text-[10px] py-0 px-1.5 m-0">
                      {g.reservations_count} حجز
                    </Tag>
                  )}
                </div>
              );
            }}
            popupRender={(menu) => (
              <div dir="rtl">
                <div className="p-1.5 border-b border-stone-200 dark:border-stone-800 bg-sky-50/50 dark:bg-sky-950/30">
                  <Button
                    type="link"
                    size="small"
                    icon={<UserAddOutlined />}
                    onClick={openCreateDialog}
                    className="w-full text-right justify-start font-semibold text-xs text-sky-600 p-0 h-7"
                  >
                    {searchTerm.trim()
                      ? `إضافة نزيل جديد باسم "${searchTerm.trim()}"`
                      : 'إضافة وتسجيل نزيل جديد الآن'}
                  </Button>
                </div>
                {menu}
                {filteredGuests.length === 0 && (
                  <div className="p-4 text-center text-xs text-stone-400">
                    <p>لم يتم العثور على نزلاء مطابقين.</p>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={openCreateDialog}
                      className="mt-2 text-xs"
                    >
                      تسجيل هذا النزيل كملف جديد
                    </Button>
                  </div>
                )}
              </div>
            )}
          />
        </div>
      )}

      {error && (
        <Text type="danger" className="text-xs mt-1 block">
          {error}
        </Text>
      )}

      {/* Inline Create Guest Modal */}
      <Modal
        open={createDialogOpen}
        onCancel={() => setCreateDialogOpen(false)}
        title={
          <Space>
            <UserAddOutlined className="text-sky-600" />
            <span>تسجيل نزيل جديد</span>
          </Space>
        }
        onOk={handleCreateGuest}
        confirmLoading={isSubmittingNewGuest}
        okText="حفظ وتحديد النزيل"
        cancelText="إلغاء"
        destroyOnHidden
        centered
        width="min(460px, calc(100vw - 24px))"
        style={{ maxWidth: 'calc(100vw - 24px)', margin: '8px auto' }}
      >
        <p className="text-xs text-stone-500 mb-4">
          قم بإدخال بيانات النزيل ليتم حفظه فوراً وربطه بالحجز الحالي بدون مغادرة النموذج.
        </p>

        <Form layout="vertical" className="pt-2">
          <Form.Item
            label="الاسم الكامل"
            required
            validateStatus={createErrors.name ? 'error' : ''}
            help={createErrors.name}
          >
            <Input
              prefix={<UserOutlined className="text-stone-400" />}
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (createErrors.name) setCreateErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="مثال: أحمد منصور عبد الله"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            label="رقم الهاتف / الموبايل"
            required
            validateStatus={createErrors.phone ? 'error' : ''}
            help={createErrors.phone}
          >
            <Input
              prefix={<PhoneOutlined className="text-stone-400" />}
              value={newPhone}
              onChange={(e) => {
                setNewPhone(e.target.value);
                if (createErrors.phone) setCreateErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="مثال: 01012345678"
              className="font-mono text-left"
              dir="ltr"
            />
          </Form.Item>

          <Form.Item
            label="الرقم العسكري / القومي (اختياري)"
            validateStatus={createErrors.mil_code ? 'error' : ''}
            help={createErrors.mil_code}
            extra="للفئات العسكرية والأعضاء"
          >
            <Input
              prefix={<SafetyCertificateOutlined className="text-stone-400" />}
              value={newMilCode}
              onChange={(e) => setNewMilCode(e.target.value)}
              placeholder="مثال: M-9842 أو 1234567"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
