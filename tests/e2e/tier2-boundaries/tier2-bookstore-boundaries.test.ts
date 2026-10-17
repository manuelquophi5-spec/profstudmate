import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getBooks, POST as postBook } from '@/app/api/shop/books/route';
import { GET as getBookById } from '@/app/api/shop/books/[id]/route';
import { POST as postBundle } from '@/app/api/shop/bundles/route';
import { POST as postFulfillment } from '@/app/api/shop/fulfillment/route';
import { POST as postDrm } from '@/app/api/shop/drm/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 2: Bookstore & Bundling Boundaries (Features 5 - 8)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 5 Boundaries
  describe('Feature 5 Boundaries: ICAG/ICAT Bookstore Catalog (/shop)', () => {
    it('T2-F5-01: Rejects creation of book with negative GHS price', async () => {
      const req = createRequest('/api/shop/books', {
        method: 'POST',
        body: { title: 'Invalid Price Book', level: 'Level 1', format: 'digital', price_ghs: -100 }
      });
      const res = await postBook(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('cannot be negative');
    });

    it('T2-F5-02: Rejects creation of book with missing required fields', async () => {
      const req = createRequest('/api/shop/books', {
        method: 'POST',
        body: { title: 'Incomplete Book' }
      });
      const res = await postBook(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F5-03: Filter by non-existent qualification level returns empty array gracefully', async () => {
      const req = createRequest('/api/shop/books?level=Level 99');
      const res = await getBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.length).toBe(0);
    });

    it('T2-F5-04: Search with non-matching keywords returns empty list without error', async () => {
      const req = createRequest('/api/shop/books?search=non_existent_xyz_study_text');
      const res = await getBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.length).toBe(0);
    });

    it('T2-F5-05: Requesting non-existent book ID returns 404 Not Found', async () => {
      const req = createRequest('/api/shop/books/b_999999');
      const res = await getBookById(req, { params: Promise.resolve({ id: 'b_999999' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });
  });

  // Feature 6 Boundaries
  describe('Feature 6 Boundaries: Course Companion Book Bundling', () => {
    it('T2-F6-01: Missing courseId returns 400 Bad Request', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F6-02: Handles string courseId without parsing error', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: '101', isBundleSelected: false }
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.course.id).toBe(101);
    });

    it('T2-F6-03: Setting isBundleSelected true without bookId falls back to course_only', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.mode).toBe('course_only');
    });

    it('T2-F6-04: Non-existent companion book ID in bundle returns 404', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b_invalid_id', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('T2-F6-05: Bundle calculation total cannot fall below 0 even with large discount', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b101', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.total_ghs).toBeGreaterThanOrEqual(0);
    });
  });

  // Feature 7 Boundaries
  describe('Feature 7 Boundaries: Digital & Physical Manual Fulfillment', () => {
    it('T2-F7-01: Rejects pickup request with invalid campus location', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 10,
          bookId: 'b102',
          deliveryType: 'campus_pickup',
          pickupCampus: 'Tamale Main' // Not in allowed list: Accra Main, Kumasi, Takoradi
        }
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('Allowed campuses');
    });

    it('T2-F7-02: Rejects shipping request with empty street or city', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 10,
          bookId: 'b102',
          deliveryType: 'shipping',
          shippingAddress: { street: '', city: '' }
        }
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('Shipping requires street and city');
    });

    it('T2-F7-03: Rejects fulfillment with missing deliveryType', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: { userId: 10, bookId: 'b102' }
      });
      const res = await postFulfillment(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F7-04: Rejects DRM request with missing userId or bookId', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10 }
      });
      const res = await postDrm(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F7-05: Rejects DRM request for non-existent book ID with 404', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b_ghost' }
      });
      const res = await postDrm(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });
  });

  // Feature 8 Boundaries
  describe('Feature 8 Boundaries: Double-Charging Prevention', () => {
    it('T2-F8-01: When user owns both course and book, bundle total is strictly 0 GHS', async () => {
      // User 10 is enrolled in 101 and owns b101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b101', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.total_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('T2-F8-02: User enrolled in course attempting course_only checkout has total 0 GHS', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, isBundleSelected: false }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.total_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('T2-F8-03: Repeated bundle evaluations for enrolled student maintain 0 GHS idempotence', async () => {
      for (let i = 0; i < 3; i++) {
        const req = createRequest('/api/shop/bundles', {
          method: 'POST',
          body: { userId: 10, courseId: 101, isBundleSelected: false }
        });
        const res = await postBundle(req);
        const { data } = await parseResponse(res);
        expect(data.total_ghs).toBe(0);
      }
    });

    it('T2-F8-04: Non-owner attempting DRM session creation is strictly rejected with 403', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 88, bookId: 'b201' }
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.error).toContain('DRM Access Denied');
    });

    it('T2-F8-05: Double charge prevention notice is returned when duplicate detected', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b101', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.breakdown_notice).toContain('Duplicate fee prevented');
    });
  });
});
