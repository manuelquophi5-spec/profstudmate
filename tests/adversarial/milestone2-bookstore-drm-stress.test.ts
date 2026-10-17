import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore, Book } from '@/lib/mockApiStore';
import { GET as getBooks, POST as postBook } from '@/app/api/shop/books/route';
import { GET as getBookById } from '@/app/api/shop/books/[id]/route';
import { POST as postBundle } from '@/app/api/shop/bundles/route';
import { POST as postFulfillment } from '@/app/api/shop/fulfillment/route';
import { POST as postDrm } from '@/app/api/shop/drm/route';
import { createRequest, parseResponse } from '../helpers/testClient';

describe('Milestone 2 Adversarial Stress Test Suite: Bookstore, Bundling, DRM & Watermarking Boundaries', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // =========================================================================
  // SUITE 1: DRM Streaming, Session Token Lifecycle & Broken Stream Endpoints
  // =========================================================================
  describe('Adversarial Suite 1: DRM Streaming & Token Authorization Boundaries', () => {
    it('ADV-2.1: DRM session token generation succeeds for legitimate book owner', async () => {
      // User 10 owns b101
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.drm_session_token).toMatch(/^drm_10_b101_\d+$/);
      expect(data.watermark).toBe('Licensed to ICAG Student ID: 10');
      expect(data.stream_endpoint).toContain('/api/shop/drm/stream?token=');
      expect(mockStore.drmSessions.has(data.drm_session_token)).toBe(true);
    });

    it('ADV-2.2: Verifies whether advertised stream_endpoint has a working route handler or returns 404 (Broken Stream Contract)', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { data } = await parseResponse(res);

      const streamEndpoint = data.stream_endpoint;
      expect(streamEndpoint).toBeDefined();

      // Check existence of src/app/api/shop/drm/stream/route.ts
      const fs = await import('fs');
      const path = await import('path');
      const streamRoutePath = path.resolve(process.cwd(), 'src/app/api/shop/drm/stream/route.ts');
      const streamRouteExists = fs.existsSync(streamRoutePath);

      // Finding: The stream route advertised to clients does NOT exist in the filesystem!
      expect(streamRouteExists).toBe(false);
    });

    it('ADV-2.3: DRM Token Validation Gap: drmSessions Map is never queried or validated after generation', async () => {
      // Create session
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { data } = await parseResponse(res);
      const token = data.drm_session_token;

      // Verify token exists in memory
      const session = mockStore.drmSessions.get(token);
      expect(session).toBeDefined();
      expect(session?.userId).toBe(10);
      expect(session?.bookId).toBe('b101');

      // But notice: mockStore does not provide any validateToken(token) or getSession(token) API,
      // and no route consumes the token to stream pages or decrypt chunks.
      expect(typeof (mockStore as any).validateDrmSession).toBe('undefined');
    });

    it('ADV-2.4: DRM Format Boundary: Issues DRM session for physical-only book without digital format validation', async () => {
      // b102 is 'physical' format only!
      // Grant user 10 ownership of b102
      mockStore.grantBook(10, 'b102');

      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b102' },
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);

      // Current behavior: DRM endpoint does NOT check if book.format supports digital viewing!
      // It issues a digital DRM stream token for a physical-only book!
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const book = mockStore.books.find(b => b.id === 'b102');
      expect(book?.format).toBe('physical');
    });

    it('ADV-2.5: Rejects DRM session request when user does not own the book', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b201' }, // b201 not owned by user 10
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('DRM Access Denied');
    });

    it('ADV-2.6: Rejects DRM session request with missing or invalid fields', async () => {
      // Missing userId
      const req1 = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { bookId: 'b101' },
      });
      const res1 = await postDrm(req1);
      expect((await parseResponse(res1)).status).toBe(400);

      // Missing bookId
      const req2 = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10 },
      });
      const res2 = await postDrm(req2);
      expect((await parseResponse(res2)).status).toBe(400);

      // Non-existent bookId
      const req3 = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b_non_existent' },
      });
      const res3 = await postDrm(req3);
      expect((await parseResponse(res3)).status).toBe(404);
    });
  });

  // =========================================================================
  // SUITE 2: Student Watermark Security & Token Identity Spoofing
  // =========================================================================
  describe('Adversarial Suite 2: Student Watermark & Identity Boundaries', () => {
    it('ADV-2.7: Watermark Format Verification: generates standardized ICAG Student ID watermark', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { data } = await parseResponse(res);

      expect(data.watermark).toBe('Licensed to ICAG Student ID: 10');
    });

    it('ADV-2.8: Adversarial string in userId: handles non-numeric userId safely by rejecting ownership', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: '<script>alert("xss")</script>', bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);

      // Number('<script>...') is NaN -> mockStore.ownsBook(NaN) is false -> 403 Access Denied
      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('ADV-2.9: Watermark Identity Binding Vulnerability: client can specify arbitrary userId in body without session check', async () => {
      // An attacker knows student 10 owns b101.
      // Calling /api/shop/drm with userId: 10 generates a watermark stamped for student 10
      // because the endpoint relies purely on body.userId with no session/JWT auth check!
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.watermark).toContain('ICAG Student ID: 10');
    });
  });

  // =========================================================================
  // SUITE 3: Fulfillment API Entitlement Escalation & Broken Reader URL
  // =========================================================================
  describe('Adversarial Suite 3: Fulfillment API & Entitlement Escalation', () => {
    it('ADV-2.10: CRITICAL VULNERABILITY: Unauthenticated entitlement escalation via digital fulfillment bypass', async () => {
      const attackerId = 7777;
      expect(mockStore.ownsBook(attackerId, 'b301')).toBe(false);

      // Attacker posts directly to /api/shop/fulfillment with deliveryType: 'digital'
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: attackerId,
          bookId: 'b301',
          deliveryType: 'digital',
        },
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);

      // Entitlement was granted immediately in mockStore without any payment!
      expect(mockStore.ownsBook(attackerId, 'b301')).toBe(true);

      // Attacker can now request a DRM session for the unpaid book!
      const drmReq = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: attackerId, bookId: 'b301' },
      });
      const drmRes = await postDrm(drmReq);
      const drmParsed = await parseResponse(drmRes);

      expect(drmParsed.status).toBe(200);
      expect(drmParsed.data.success).toBe(true);
      expect(drmParsed.data.watermark).toBe(`Licensed to ICAG Student ID: ${attackerId}`);
    });

    it('ADV-2.11: BROKEN ROUTE: fulfillment digital grant returns invalid drm_reader_url (/shop/reader/...) instead of (/book-reader/...)', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 10,
          bookId: 'b101',
          deliveryType: 'digital',
        },
      });
      const res = await postFulfillment(req);
      const { data } = await parseResponse(res);

      // In fulfillment/route.ts:92, it returns `/shop/reader/${bookId}`
      expect(data.data.drm_reader_url).toBe('/shop/reader/b101');

      // But in the Next.js App Router, the actual page is at /book-reader/[id], NOT /shop/reader/[id]!
      // This causes a 404 navigation defect when the student clicks the reader link!
      const fs = await import('fs');
      const path = await import('path');
      const shopReaderPath = path.resolve(process.cwd(), 'src/app/shop/reader/[id]/page.tsx');
      const shopReaderExists = fs.existsSync(shopReaderPath);
      expect(shopReaderExists).toBe(false);
    });

    it('ADV-2.12: Fulfillment Campus Pickup rejects unauthorized campuses and SQL injection strings', async () => {
      const maliciousCampuses = [
        "Accra Main'; DROP TABLE orders;--",
        'Tamale Main',
        'Cape Coast Campus',
        '<script>alert(1)</script>',
      ];

      for (const campus of maliciousCampuses) {
        const req = createRequest('/api/shop/fulfillment', {
          method: 'POST',
          body: {
            userId: 10,
            bookId: 'b102',
            deliveryType: 'campus_pickup',
            pickupCampus: campus,
          },
        });
        const res = await postFulfillment(req);
        const { status, data } = await parseResponse(res);

        expect(status).toBe(422);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Allowed campuses');
      }
    });

    it('ADV-2.13: Empty string street or city is rejected with 422', async () => {
      const invalidAddresses = [
        { street: '', city: 'Accra' },
        { street: 'Ring Road', city: '' },
      ];

      for (const addr of invalidAddresses) {
        const req = createRequest('/api/shop/fulfillment', {
          method: 'POST',
          body: {
            userId: 10,
            bookId: 'b102',
            deliveryType: 'shipping',
            shippingAddress: addr,
          },
        });
        const res = await postFulfillment(req);
        const { status } = await parseResponse(res);
        expect(status).toBe(422);
      }
    });

    it('ADV-2.13b: VULNERABILITY: Whitespace-only address ("   ") bypasses shipping validation without trim check', async () => {
      // In fulfillment/route.ts:54, it checks `!shippingAddress.street || !shippingAddress.city`
      // without `.trim()`, allowing whitespace-only strings to pass validation and generate shipping tracking codes!
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 10,
          bookId: 'b102',
          deliveryType: 'shipping',
          shippingAddress: { street: '   ', city: '   ' },
        },
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);

      // Demonstrates untrimmed whitespace vulnerability
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('Dispatched');
      expect(data.data.tracking_number).toMatch(/^GH-EXP-\d+$/);
    });
  });

  // =========================================================================
  // SUITE 4: Bundles API & Double-Charging Financial Calculations
  // =========================================================================
  describe('Adversarial Suite 4: Course Companion Bundling & Double-Charging Prevention', () => {
    it('ADV-2.14: Enforces 0 GHS total when user already enrolled in course and owns companion book', async () => {
      // User 10 is enrolled in 101 and owns b101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: {
          userId: 10,
          courseId: 101,
          bookId: 'b101',
          isBundleSelected: true,
        },
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.course.already_enrolled).toBe(true);
      expect(data.course.effective_charge_ghs).toBe(0);
      expect(data.book.already_owned).toBe(true);
      expect(data.book.effective_charge_ghs).toBe(0);
      expect(data.bundle_discount_ghs).toBe(0); // No double-dipping discount
      expect(data.total_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('ADV-2.15: Waives book price when student already owns book, charging only course tuition without phantom bundle discount', async () => {
      // User 10 owns b101, but is NOT enrolled in course 102
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: {
          userId: 10,
          courseId: 102,
          bookId: 'b101',
          isBundleSelected: true,
        },
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.course.already_enrolled).toBe(false);
      expect(data.course.effective_charge_ghs).toBe(600);
      expect(data.book.already_owned).toBe(true);
      expect(data.book.effective_charge_ghs).toBe(0);
      expect(data.bundle_discount_ghs).toBe(0); // Discount NOT applied when book already free
      expect(data.total_ghs).toBe(600);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('ADV-2.16: Waives course tuition when student is already enrolled in course, charging only unowned book price', async () => {
      // User 10 is enrolled in 101, but does NOT own b102
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: {
          userId: 10,
          courseId: 101,
          bookId: 'b102',
          isBundleSelected: true,
        },
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.course.already_enrolled).toBe(true);
      expect(data.course.effective_charge_ghs).toBe(0);
      expect(data.book.already_owned).toBe(false);
      expect(data.book.effective_charge_ghs).toBe(140);
      expect(data.bundle_discount_ghs).toBe(0); // Discount NOT applied when course already free
      expect(data.total_ghs).toBe(140);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('ADV-2.17: Non-existent courseId returns 404 Not Found', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 999999, bookId: 'b101', isBundleSelected: true },
      });
      const res = await postBundle(req);
      expect((await parseResponse(res)).status).toBe(404);
    });

    it('ADV-2.18: Non-existent bookId in bundle returns 404 Not Found', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b_invalid_999', isBundleSelected: true },
      });
      const res = await postBundle(req);
      expect((await parseResponse(res)).status).toBe(404);
    });
  });

  // =========================================================================
  // SUITE 5: Bookstore Catalog Query Edge Cases & Manipulation
  // =========================================================================
  describe('Adversarial Suite 5: Bookstore Catalog Filtering & Input Validation', () => {
    it('ADV-2.19: Bookstore query parameter flaw: level=All returns empty list due to case-insensitive match against "Level 1/2/3"', async () => {
      // Direct call to API with level=All (not filtered by client helper)
      const req = createRequest('/api/shop/books?level=All');
      const res = await getBooks(req);
      const { data } = await parseResponse(res);

      // Demonstrates API route assumption: expects client helper to strip level='All',
      // otherwise returns 0 results because no book has level === 'All'.
      expect(data.data.length).toBe(0);
    });

    it('ADV-2.20: Bookstore query parameter flaw: format=all returns only "both" books, excluding "digital" and "physical"', async () => {
      // Direct call to API with format=all
      const req = createRequest('/api/shop/books?format=all');
      const res = await getBooks(req);
      const { data } = await parseResponse(res);

      // In books/route.ts:17: b.format === format || b.format === 'both'
      // When format='all', it only matches b.format === 'both', filtering out 'digital' and 'physical'!
      data.data.forEach((b: Book) => {
        expect(b.format).toBe('both');
      });
    });

    it('ADV-2.21: Rejects book creation with negative price in GHS', async () => {
      const req = createRequest('/api/shop/books', {
        method: 'POST',
        body: {
          title: 'Negative Price Book',
          level: 'Level 1',
          format: 'digital',
          price_ghs: -50,
        },
      });
      const res = await postBook(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(422);
      expect(data.error).toContain('cannot be negative');
    });

    it('ADV-2.22: Rejects book creation with missing required fields', async () => {
      const req = createRequest('/api/shop/books', {
        method: 'POST',
        body: {
          title: 'Missing Level and Format',
        },
      });
      const res = await postBook(req);
      const { status } = await parseResponse(res);

      expect(status).toBe(400);
    });
  });
});
