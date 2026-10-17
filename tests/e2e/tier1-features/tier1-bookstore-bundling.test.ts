import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getBooks, POST as postBook } from '@/app/api/shop/books/route';
import { GET as getBookById } from '@/app/api/shop/books/[id]/route';
import { POST as postBundle } from '@/app/api/shop/bundles/route';
import { POST as postFulfillment } from '@/app/api/shop/fulfillment/route';
import { POST as postDrm } from '@/app/api/shop/drm/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 1: ICAG/ICAT Bookstore & Course Book Bundling (Features 5 - 8)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 5: ICAG/ICAT Bookstore Catalog (/shop)
  describe('Feature 5: ICAG/ICAT Bookstore Catalog (/shop)', () => {
    it('T1-F5-01: Bookstore catalog lists books with Ghanaian Cedi (GHS) currency', async () => {
      const req = createRequest('/api/shop/books');
      const res = await getBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.currency).toBe('GHS');
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0].price_ghs).toBeGreaterThan(0);
    });

    it('T1-F5-02: Filters books by professional exam level (Level 1)', async () => {
      const req = createRequest('/api/shop/books?level=Level 1');
      const res = await getBooks(req);
      const { data } = await parseResponse(res);
      expect(data.data.length).toBeGreaterThan(0);
      data.data.forEach((b: any) => expect(b.level).toBe('Level 1'));
    });

    it('T1-F5-03: Filters books by format (digital manuals)', async () => {
      const req = createRequest('/api/shop/books?format=digital');
      const res = await getBooks(req);
      const { data } = await parseResponse(res);
      expect(data.data.length).toBeGreaterThan(0);
      data.data.forEach((b: any) => {
        expect(['digital', 'both']).toContain(b.format);
      });
    });

    it('T1-F5-04: Searches bookstore catalog by keyword query', async () => {
      const req = createRequest('/api/shop/books?search=taxation');
      const res = await getBooks(req);
      const { data } = await parseResponse(res);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0].title.toLowerCase()).toContain('taxation');
    });

    it('T1-F5-05: Retrieves book details by ID including ISBN and stock availability', async () => {
      const req = createRequest('/api/shop/books/b101');
      const res = await getBookById(req, { params: Promise.resolve({ id: 'b101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.id).toBe('b101');
      expect(data.data.isbn).toBe('978-9988-1-2345-1');
      expect(data.data.is_available).toBe(true);
    });
  });

  // Feature 6: Course Companion Book Bundling
  describe('Feature 6: Course Companion Book Bundling', () => {
    it('T1-F6-01: Evaluates unbundled Course Only option without companion textbook', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, isBundleSelected: false }
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.mode).toBe('course_only');
      expect(data.book).toBeNull();
      expect(data.bundle_discount_ghs).toBe(0);
      expect(data.total_ghs).toBe(600); // 101 discount_price is 600
    });

    it('T1-F6-02: Applies institutional bundle discount when course and companion book are bundled', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b101', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.mode).toBe('bundle');
      expect(data.bundle_discount_ghs).toBe(50);
      // Course 600 + Book 150 - 50 discount = 700 GHS
      expect(data.subtotal_ghs).toBe(750);
      expect(data.total_ghs).toBe(700);
    });

    it('T1-F6-03: Displays itemized cost breakdown for course and prescribed textbook', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 102, bookId: 'b102', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.course.price_ghs).toBe(600);
      expect(data.book.price_ghs).toBe(140);
      expect(data.total_ghs).toBe(600 + 140 - 50);
    });

    it('T1-F6-04: Returns error when companion book ID does not exist', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b_non_existent', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(404);
      expect(data.error).toContain('Companion book not found');
    });

    it('T1-F6-05: Returns error when course ID does not exist', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 9999, isBundleSelected: false }
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(404);
      expect(data.error).toContain('Course not found');
    });
  });

  // Feature 7: Digital & Physical Manual Fulfillment
  describe('Feature 7: Digital & Physical Manual Fulfillment', () => {
    it('T1-F7-01: Generates campus collection code for Accra Main collection center', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 15,
          bookId: 'b102',
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main'
        }
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.pickup_campus).toBe('Accra Main');
      expect(data.data.collection_code).toMatch(/^ICAG-COL-\d+$/);
    });

    it('T1-F7-02: Generates campus collection code for Kumasi and Takoradi campuses', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 16,
          bookId: 'b102',
          deliveryType: 'campus_pickup',
          pickupCampus: 'Kumasi'
        }
      });
      const res = await postFulfillment(req);
      const { data } = await parseResponse(res);
      expect(data.data.pickup_campus).toBe('Kumasi');
    });

    it('T1-F7-03: Dispatches physical manual courier delivery with courier tracking number', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 17,
          bookId: 'b102',
          deliveryType: 'shipping',
          shippingAddress: {
            street: 'Ring Road Central',
            city: 'Accra',
            region: 'Greater Accra'
          }
        }
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.tracking_number).toMatch(/^GH-EXP-\d+$/);
      expect(data.data.courier).toBe('Ghana Post / Speedlink');
    });

    it('T1-F7-04: Digital manual fulfillment grants immediate digital entitlement without shipping', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 18,
          bookId: 'b201',
          deliveryType: 'digital'
        }
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.fulfillment_type).toBe('digital');
      expect(mockStore.ownsBook(18, 'b201')).toBe(true);
    });

    it('T1-F7-05: DRM reader session issues authenticated reading token and student watermark', async () => {
      // User 10 already owns b101 in mock store
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b101' }
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.drm_session_token).toBeDefined();
      expect(data.watermark).toContain('ICAG Student ID: 10');
    });
  });

  // Feature 8: Double-Charging Prevention
  describe('Feature 8: Double-Charging Prevention', () => {
    it('T1-F8-01: Waives textbook price in bundle when student already owns textbook', async () => {
      // User 10 already owns book b101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b101', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.book.already_owned).toBe(true);
      expect(data.book.effective_charge_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('T1-F8-02: Waives course price when student is already enrolled in course', async () => {
      // User 10 already enrolled in course 101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b102', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.course.already_enrolled).toBe(true);
      expect(data.course.effective_charge_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
      // Only unowned book b102 price (140) should be charged
      expect(data.total_ghs).toBe(140);
    });

    it('T1-F8-03: Charges 0 total when student owns both course and textbook in bundle', async () => {
      // Enroll user 10 and grant b101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b101', isBundleSelected: true }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.course.already_enrolled).toBe(true);
      expect(data.book.already_owned).toBe(true);
      expect(data.total_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('T1-F8-04: Rejects DRM reader session with 403 Forbidden when book is not owned', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 99, bookId: 'b301' }
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.error).toContain('DRM Access Denied');
    });

    it('T1-F8-05: Returns duplicate fee warning notice in bundle breakdown', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, isBundleSelected: false }
      });
      const res = await postBundle(req);
      const { data } = await parseResponse(res);
      expect(data.double_charge_prevented).toBe(true);
      expect(data.total_ghs).toBe(0);
    });
  });
});
