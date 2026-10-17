import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { POST as initPaystack } from '@/app/api/payments/paystack/initialize/route';
import { POST as verifyPaystack } from '@/app/api/payments/paystack/verify/route';
import { POST as webhookPaystack } from '@/app/api/payments/paystack/webhook/route';
import { GET as getInvoice } from '@/app/api/invoices/[reference]/route';
import { GET as getRoom } from '@/app/api/room/[courseId]/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 1: Ghanaian Payment Processing (Paystack & GHS) (Features 13 - 16)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 13: Ghanaian Cedi (GHS / GH₵) Universal Formatting
  describe('Feature 13: Ghanaian Cedi (GHS / GH₵) Universal Formatting', () => {
    it('T1-F13-01: Enforces GHS currency during Paystack transaction initialization', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'student@icag.edu.gh',
          amount_ghs: 600,
          currency: 'GHS'
        }
      });
      const res = await initPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.currency).toBe('GHS');
    });

    it('T1-F13-02: Converts Ghanaian Cedis to pesewas (1 GHS = 100 pesewas)', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'student@icag.edu.gh',
          amount_ghs: 750.50
        }
      });
      const res = await initPaystack(req);
      const { data } = await parseResponse(res);
      expect(data.data.amount_in_pesewas).toBe(75050);
    });

    it('T1-F13-03: Invoice details view includes Ghanaian Cedi symbol GH₵', async () => {
      // Initialize and verify transaction to create invoice
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'kwame@icag.edu.gh',
            amount_ghs: 600,
            billingDetails: { studentName: 'Kwame Mensah', icagId: 'ICAG/2026/012' },
            cartItems: [{ id: 'c1', type: 'course', course_id: 102, title: 'Business Law', price_ghs: 600 }]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );

      const invReq = createRequest(`/api/invoices/${ref}`);
      const invRes = await getInvoice(invReq, { params: Promise.resolve({ reference: ref }) });
      const { data: invData } = await parseResponse(invRes);
      expect(invData.data.currency_symbol).toBe('GH₵');
      expect(invData.data.currency).toBe('GHS');
    });

    it('T1-F13-04: Rejects non-GHS currencies (e.g. USD) during checkout initialization', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'student@icag.edu.gh',
          amount_ghs: 50,
          currency: 'USD'
        }
      });
      const res = await initPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('Currency USD is not supported');
    });

    it('T1-F13-05: Confirms invoice total is calculated accurately in GHS', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'ama@icag.edu.gh',
            amount_ghs: 690,
            billingDetails: { studentName: 'Ama Serwaa', icagId: 'ICAG/2026/088' },
            cartItems: [
              { id: 'c101', type: 'course', course_id: 101, title: 'Financial Accounting', price_ghs: 600 },
              { id: 'b102', type: 'book', book_id: 'b102', title: 'Business Law Manual', price_ghs: 140, bundle_discount_ghs: 50 }
            ]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      const verifyRes = await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );
      const { data: verifyData } = await parseResponse(verifyRes);
      expect(verifyData.invoice.total_ghs).toBe(690);
    });
  });

  // Feature 14: Paystack GHS Payment Processing (Card + MoMo)
  describe('Feature 14: Paystack GHS Payment Processing (Card + MoMo)', () => {
    it('T1-F14-01: Successfully creates Paystack authorization URL and reference', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'student@icag.edu.gh',
          amount_ghs: 850
        }
      });
      const res = await initPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.authorization_url).toMatch(/^https:\/\/checkout\.paystack\.com\/pstk_/);
      expect(data.data.reference).toMatch(/^pstk_/);
    });

    it('T1-F14-02: Supports Mobile Money payment channels alongside card', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'student@icag.edu.gh',
          amount_ghs: 600,
          paymentChannel: 'mobile_money'
        }
      });
      const res = await initPaystack(req);
      const { data } = await parseResponse(res);
      expect(data.data.channels).toContain('mobile_money');
      expect(data.data.channels).toContain('card');
      expect(data.data.preferred_channel).toBe('mobile_money');
    });

    it('T1-F14-03: Verifies valid transaction and updates status to success', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'student@icag.edu.gh', amount_ghs: 600 }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      const verifyReq = createRequest('/api/payments/paystack/verify', {
        method: 'POST',
        body: { reference: ref, payment_method: 'MTN Mobile Money' }
      });
      const verifyRes = await verifyPaystack(verifyReq);
      const { status, data } = await parseResponse(verifyRes);
      expect(status).toBe(200);
      expect(data.transaction.status).toBe('success');
      expect(data.transaction.paid_at).toBeDefined();
    });

    it('T1-F14-04: Returns error when verifying non-existent payment reference', async () => {
      const req = createRequest('/api/payments/paystack/verify', {
        method: 'POST',
        body: { reference: 'non_existent_ref' }
      });
      const res = await verifyPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(404);
      expect(data.error).toContain('Transaction not found');
    });

    it('T1-F14-05: Captures payment timestamp upon successful Paystack verification', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'test@icag.edu.gh', amount_ghs: 600 }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      const verifyRes = await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );
      const { data: verifyData } = await parseResponse(verifyRes);
      expect(verifyData.transaction.paid_at).toBeDefined();
    });
  });

  // Feature 15: Digital Invoices & Student Billing Details
  describe('Feature 15: Digital Invoices & Student Billing Details', () => {
    it('T1-F15-01: Generates digital invoice with official ICAG student registration number', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'kofi@icag.edu.gh',
            amount_ghs: 600,
            billingDetails: {
              studentName: 'Kofi Owusu',
              icagId: 'ICAG/REG/2026/894'
            },
            cartItems: [{ id: 'c1', type: 'course', course_id: 102, title: 'Business Law', price_ghs: 600 }]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );

      const invRes = await getInvoice(createRequest(`/api/invoices/${ref}`), {
        params: Promise.resolve({ reference: ref })
      });
      const { data } = await parseResponse(invRes);
      expect(data.data.student_name).toBe('Kofi Owusu');
      expect(data.data.icag_id).toBe('ICAG/REG/2026/894');
    });

    it('T1-F15-02: Itemizes purchased course and study text in invoice line items', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'yaa@icag.edu.gh',
            amount_ghs: 740,
            billingDetails: { studentName: 'Yaa Asantewaa' },
            cartItems: [
              { id: 'c102', type: 'course', course_id: 102, title: 'Business Management & Law', price_ghs: 600 },
              { id: 'b102', type: 'book', book_id: 'b102', title: 'Business Law Manual', price_ghs: 140 }
            ]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );

      const invRes = await getInvoice(createRequest(`/api/invoices/${ref}`), {
        params: Promise.resolve({ reference: ref })
      });
      const { data } = await parseResponse(invRes);
      expect(data.data.items.length).toBe(2);
      expect(data.data.items[0].title).toBe('Business Management & Law');
      expect(data.data.items[1].title).toBe('Business Law Manual');
    });

    it('T1-F15-03: Reflects bundle discounts in invoice line items', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'test@icag.edu.gh',
            amount_ghs: 690,
            cartItems: [
              {
                id: 'bun1',
                type: 'bundle',
                course_id: 101,
                book_id: 'b101',
                title: 'Financial Accounting Bundle',
                price_ghs: 750,
                bundle_discount_ghs: 60
              }
            ]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );

      const invRes = await getInvoice(createRequest(`/api/invoices/${ref}`), {
        params: Promise.resolve({ reference: ref })
      });
      const { data } = await parseResponse(invRes);
      expect(data.data.discount_total_ghs).toBe(60);
      expect(data.data.total_ghs).toBe(690);
    });

    it('T1-F15-04: Displays official Institute address and Tax Identification Number (TIN)', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'test@icag.edu.gh', amount_ghs: 600 }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );

      const invRes = await getInvoice(createRequest(`/api/invoices/${ref}`), {
        params: Promise.resolve({ reference: ref })
      });
      const { data } = await parseResponse(invRes);
      expect(data.data.institution.name).toContain('Institute of Chartered Accountants (Ghana)');
      expect(data.data.institution.tin).toBe('C0001234567');
    });

    it('T1-F15-05: Returns 404 when requested invoice reference does not exist', async () => {
      const req = createRequest('/api/invoices/INV_UNKNOWN');
      const res = await getInvoice(req, { params: Promise.resolve({ reference: 'INV_UNKNOWN' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(404);
      expect(data.error).toContain('Invoice not found');
    });
  });

  // Feature 16: Automatic Entitlement Fulfillment & Status Update
  describe('Feature 16: Automatic Entitlement Fulfillment & Status Update', () => {
    it('T1-F16-01: Immediately enrolls student in course upon payment verification', async () => {
      const targetUserId = 44;
      expect(mockStore.isEnrolled(targetUserId, 102)).toBe(false);

      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'user44@icag.edu.gh',
            amount_ghs: 600,
            billingDetails: { userId: targetUserId },
            cartItems: [{ id: 'c102', type: 'course', course_id: 102, title: 'Business Law', price_ghs: 600 }]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      const verifyRes = await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );
      const { data: verifyData } = await parseResponse(verifyRes);
      expect(verifyData.fulfilled_entitlements.some((e: any) => e.type === 'course' && e.id === 102)).toBe(true);
      expect(mockStore.isEnrolled(targetUserId, 102)).toBe(true);
    });

    it('T1-F16-02: Immediately grants book entitlement upon payment verification', async () => {
      const targetUserId = 45;
      expect(mockStore.ownsBook(targetUserId, 'b201')).toBe(false);

      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'user45@icag.edu.gh',
            amount_ghs: 180,
            billingDetails: { userId: targetUserId },
            cartItems: [{ id: 'b201', type: 'book', book_id: 'b201', title: 'Public Sector Guide', price_ghs: 180 }]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );
      expect(mockStore.ownsBook(targetUserId, 'b201')).toBe(true);
    });

    it('T1-F16-03: Repeated verification call is idempotent and does not error', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'repeat@icag.edu.gh', amount_ghs: 600 }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      // First verification
      await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );

      // Second verification (repeated)
      const repeatRes = await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );
      const { status, data: repeatData } = await parseResponse(repeatRes);
      expect(status).toBe(200);
      expect(repeatData.already_verified).toBe(true);
    });

    it('T1-F16-04: Webhook handler idempotently fulfills course and book entitlements', async () => {
      const targetUserId = 50;
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'webhook@icag.edu.gh',
            amount_ghs: 600,
            billingDetails: { userId: targetUserId, studentName: 'Webhook Student' },
            cartItems: [{ id: 'c201', type: 'course', course_id: 201, title: 'Public Sector Accounting', price_ghs: 600 }]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      const webhookReq = createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'mock-valid-signature' },
        body: {
          event: 'charge.success',
          data: { reference: ref }
        }
      });
      const webhookRes = await webhookPaystack(webhookReq);
      const { status, data } = await parseResponse(webhookRes);
      expect(status).toBe(200);
      expect(data.status).toBe(true);
      expect(mockStore.isEnrolled(targetUserId, 201)).toBe(true);
    });

    it('T1-F16-05: Enrolled student can immediately access virtual classroom hub after fulfillment', async () => {
      const studentId = 60;
      // Before enrollment: 403
      const preReq = createRequest('/api/room/201?userId=60&role=student');
      const preRes = await getRoom(preReq, { params: Promise.resolve({ courseId: '201' }) });
      expect(preRes.status).toBe(403);

      // Enroll student
      mockStore.enroll(studentId, 201);

      // After enrollment: 200
      const postReq = createRequest('/api/room/201?userId=60&role=student');
      const postRes = await getRoom(postReq, { params: Promise.resolve({ courseId: '201' }) });
      expect(postRes.status).toBe(200);
    });
  });
});
