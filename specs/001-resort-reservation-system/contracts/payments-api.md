# API Contracts: Payments & Accounting

**Feature**: `001-resort-reservation-system`  
**Protocol**: Inertia.js HTTP Endpoints (Session Auth + CSRF)  

---

## 1. Endpoints Overview

| Method | URI | Action / Controller | Required Permission | Description |
|---|---|---|---|---|
| `POST` | `/reservations/{reservation}/payments` | `PaymentController@store` | `payments.create` | Record an installment/payment |
| `DELETE` | `/payments/{id}` | `PaymentController@destroy` | `payments.delete` | Void/delete an accidental payment |

---

## 2. Request & Response Payloads

### 2.1 `POST /reservations/{reservation}/payments`
**Payload**:
```json
{
  "amount": 750.00,
  "method": "instapay",
  "reference_number": "TXN-902341"
}
```

**Validation Rules**:
- `amount`: `required|numeric|gt:0`
- `method`: `required|in:Cash,visa,instapay`
- `reference_number`: `nullable|string|max:100`

**Success Response**: Redirect back to current page with updated reservation balance and flash message:
```json
{
  "flash": {
    "success": "تم تسجيل الدفعة بنجاح بقيمة 750.00 ج.م"
  }
}
```

**Error Response (HTTP 422)**:
```json
{
  "message": "المبلغ المدخل غير صالح.",
  "errors": {
    "amount": [
      "يجب أن تكون قيمة الدفعة أكبر من صفر."
    ]
  }
}
```

---

### 2.2 `DELETE /payments/{id}`
**Action**: Removes the specified payment inside a database transaction, recalculating the parent reservation's `paid_amount` and `balance`.
**Success Response**: Redirect back with flash notification.

