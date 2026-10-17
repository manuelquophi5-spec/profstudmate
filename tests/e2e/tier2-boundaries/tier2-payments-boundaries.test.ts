import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { POST as initPaystack } from '@/app/api/payments/paystack/initialize/route';
import { POST as verifyPaystack } from '@/app/api/payments/paystack/verify/route';
import { POST as webhookPaystack } from '@/app/api/payments/paystack/webhook/route';
import { GET as getInvoice } from '@/app/api/invoices/[reference]/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 2: Payments & Invoicing Boundaries (Features 13 - 16)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 13 Boundaries
  describe('Feature 13 Boundaries: Ghanaian Cedi (GHS / GH₵) Universal Formatting', () => {
    it('T2-F13-01: Rejects zero GHS payment amount with 422 Unprocessable Entity', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: { email: 'student@icag.edu.gh', amount_ghs: 0 }
      });
      const res = await initPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('greater than 0 GHS');
    });

    it('T2-F13-02: Rejects negative GHS payment amount with 422', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: { email: 'student@icag.edu.gh', amount_ghs: -150 }
      });
      const res = await initPaystack(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(422);
    });

    it('T2-F13-03: Rejects foreign currency EUR with explicit error message', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: { email: 'student@icag.edu.gh', amount_ghs: 100, currency: 'EUR' }
      });
      const res = await initPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('Currency EUR is not supported');
    });

    it('T2-F13-04: Rounds fractional pesewas to closest whole pesewa', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: { email: 'student@icag.edu.gh', amount_ghs: 199.999 }
      });
      const res = await initPaystack(req);
      const { data } = await parseResponse(res);
      expect(data.data.amount_in_pesewas).toBe(20000);
    });

    it('T2-F13-05: Missing currency parameter defaults safely to GHS', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: { email: 'student@icag.edu.gh', amount_ghs: 450 }
      });
      const res = await initPaystack(req);
      const { data } = await parseResponse(res);
      expect(data.data.currency).toBe('GHS');
    });
  });

  // Feature 14 Boundaries
  describe('Feature 14 Boundaries: Paystack GHS Payment Processing', () => {
    it('T2-F14-01: Rejects initialization with missing email', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: { amount_ghs: 500 }
      });
      const res = await initPaystack(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F14-02: Rejects initialization with empty request body', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {}
      });
      const res = await initPaystack(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F14-03: Verifying empty reference returns 400 Bad Request', async () => {
      const req = createRequest('/api/payments/paystack/verify', {
        method: 'POST',
        body: {}
      });
      const res = await verifyPaystack(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F14-04: Verifying non-existent reference returns 404 Not Found', async () => {
      const req = createRequest('/api/payments/paystack/verify', {
        method: 'POST',
        body: { reference: 'pstk_non_existent_123' }
      });
      const res = await verifyPaystack(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('T2-F14-05: Handles institutional institutional bundle payment (e.g. 25,000 GHS)', async () => {
      const req = createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: { email: 'firm@audit.gh', amount_ghs: 25000 }
      });
      const res = await initPaystack(req);
      const { data } = await parseResponse(res);
      expect(data.data.amount_in_pesewas).toBe(2500000);
    });
  });

  // Feature 15 Boundaries
  describe('Feature 15 Boundaries: Digital Invoices & Student Billing Details', () => {
    it('T2-F15-01: Retrieving non-existent invoice returns 404', async () => {
      const req = createRequest('/api/invoices/INV_FAKE_REF');
      const res = await getInvoice(req, { params: Promise.resolve({ reference: 'INV_FAKE_REF' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('T2-F15-02: Safely handles student names with complex Ghanaian accents and hyphens', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'student@icag.edu.gh',
            amount_ghs: 500,
            billingDetails: { studentName: 'Nana Osei-Tutu II (Dr.)', icagId: 'ICAG/ACC/2026' }
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
      expect(data.data.student_name).toBe('Nana Osei-Tutu II (Dr.)');
    });

    it('T2-F15-03: Verifies that invoice total never falls below 0 GHS', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'zero@icag.edu.gh', amount_ghs: 10 }
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
      expect(data.data.total_ghs).toBeGreaterThanOrEqual(0);
    });

    it('T2-F15-04: Invoice issued date is formatted as ISO 8601 string', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'iso@icag.edu.gh', amount_ghs: 600 }
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
      expect(isNaN(Date.parse(data.data.issued_at))).toBe(false);
    });

    it('T2-F15-05: Invoice details response contains PDF download route', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'pdf@icag.edu.gh', amount_ghs: 600 }
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
      expect(data.data.download_pdf_url).toContain(`/api/invoices/${ref}/pdf`);
    });
  });

  // Feature 16 Boundaries
  describe('Feature 16 Boundaries: Automatic Entitlement Fulfillment & Status Update', () => {
    it('T2-F16-01: Rejects webhook with invalid signature header with 401 Unauthorized', async () => {
      const req = createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'invalid_tampered_signature' },
        body: { event: 'charge.success', data: { reference: 'pstk_any' } }
      });
      const res = await webhookPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(401);
      expect(data.error).toContain('Invalid Paystack webhook signature');
    });

    it('T2-F16-02: Webhook with non-existent transaction returns 404', async () => {
      const req = createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'mock-valid-signature' },
        body: { event: 'charge.success', data: { reference: 'pstk_not_in_system' } }
      });
      const res = await webhookPaystack(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('T2-F16-03: Webhook safely ignores unhandled event types with 200 OK', async () => {
      const req = createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'mock-valid-signature' },
        body: { event: 'transfer.success', data: {} }
      });
      const res = await webhookPaystack(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.message).toContain('Ignored event');
    });

    it('T2-F16-04: Multiple repeated webhook events for same transaction process idempotently', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: {
            email: 'idempotent@icag.edu.gh',
            amount_ghs: 600,
            billingDetails: { userId: 91 },
            cartItems: [{ id: 'c102', type: 'course', course_id: 102, title: 'Business Law', price_ghs: 600 }]
          }
        })
      );
      const { data: initData } = await parseResponse(initRes);
      const ref = initData.data.reference;

      // First webhook
      const res1 = await webhookPaystack(
        createRequest('/api/payments/paystack/webhook', {
          method: 'POST',
          headers: { 'x-paystack-signature': 'mock-valid-signature' },
          body: { event: 'charge.success', data: { reference: ref } }
        })
      );
      expect(res1.status).toBe(200);

      // Duplicate webhook
      const res2 = await webhookPaystack(
        createRequest('/api/payments/paystack/webhook', {
          method: 'POST',
          headers: { 'x-paystack-signature': 'mock-valid-signature' },
          body: { event: 'charge.success', data: { reference: ref } }
        })
      );
      const { status: status2, data: data2 } = await parseResponse(res2);
      expect(status2).toBe(200);
      expect(data2.message).toContain('idempotent');
    });

    it('T2-F16-05: Verification of already fulfilled payment returns already_verified true', async () => {
      const initRes = await initPaystack(
        createRequest('/api/payments/paystack/initialize', {
          method: 'POST',
          body: { email: 'already@icag.edu.gh', amount_ghs: 600 }
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

      const repeatRes = await verifyPaystack(
        createRequest('/api/payments/paystack/verify', {
          method: 'POST',
          body: { reference: ref }
        })
      );
      const { data } = await parseResponse(repeatRes);
      expect(data.already_verified).toBe(true);
    });
  });
});
