import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import {
  cartSlice,
  addBookToCart,
  addBundleToCart,
  removeCartItem,
  removeCourseFromCart,
  updateFulfillment,
} from '@/redux/reducers/cartSlice';
import {
  bookstoreSlice,
  setBooks,
  setSelectedLevel,
  setSelectedFormat,
  setSearchQuery,
  grantBookAccess,
} from '@/redux/reducers/bookstoreSlice';
import { Book } from '@/types/bookstore';
import { GET as getBooks } from '@/app/api/shop/books/route';
import { GET as getBookById } from '@/app/api/shop/books/[id]/route';
import { POST as postBundle } from '@/app/api/shop/bundles/route';
import { POST as postFulfillment } from '@/app/api/shop/fulfillment/route';
import { POST as postDrm } from '@/app/api/shop/drm/route';
import { createRequest, parseResponse } from '../helpers/testClient';

describe('Milestone 2 Unit & Component Verification Suite (Features 5, 6, 7, 8)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 5: Bookstore Catalog & Filtering
  describe('Feature 5: ICAG/ICAT Bookstore Catalog & BookCard', () => {
    it('initializes bookstoreSlice with default level All, format all, and empty query', () => {
      const state = bookstoreSlice.reducer(undefined, { type: '@@INIT' });
      expect(state.selectedLevel).toBe('All');
      expect(state.selectedFormat).toBe('all');
      expect(state.searchQuery).toBe('');
      expect(state.books).toEqual([]);
    });

    it('updates level, format, and search query in bookstoreSlice', () => {
      let state = bookstoreSlice.reducer(undefined, setSelectedLevel('Level 2'));
      expect(state.selectedLevel).toBe('Level 2');

      state = bookstoreSlice.reducer(state, setSelectedFormat('digital'));
      expect(state.selectedFormat).toBe('digital');

      state = bookstoreSlice.reducer(state, setSearchQuery('taxation'));
      expect(state.searchQuery).toBe('taxation');
    });

    it('retrieves books from /api/shop/books with GHS currency and level filtering', async () => {
      const req = createRequest('/api/shop/books?level=Level 1');
      const res = await getBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.currency).toBe('GHS');
      expect(data.data.length).toBeGreaterThan(0);
      data.data.forEach((b: Book) => {
        expect(b.level).toBe('Level 1');
        expect(b.price_ghs).toBeGreaterThan(0);
      });
    });

    it('filters books by format (physical manuals only)', async () => {
      const req = createRequest('/api/shop/books?format=physical');
      const res = await getBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      data.data.forEach((b: Book) => {
        expect(['physical', 'both']).toContain(b.format);
      });
    });

    it('searches books by ISBN query accurately', async () => {
      const req = createRequest('/api/shop/books?search=978-9988-1-2345-1');
      const res = await getBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.data[0].id).toBe('b101');
      expect(data.data[0].title).toContain('Financial Accounting');
    });
  });

  // Feature 6: Course Companion Book Bundling
  describe('Feature 6: Course Companion Book Bundling', () => {
    it('evaluates course companion bundle with institutional GHS 50 discount', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b101', isBundleSelected: true },
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.mode).toBe('bundle');
      expect(data.bundle_discount_ghs).toBe(50);
      // Course 600 + Book 150 - 50 = 700 GHS
      expect(data.total_ghs).toBe(700);
    });

    it('adapts bundle UI when student already owns companion book (waiving textbook price)', async () => {
      // User 10 owns book b101 in mock store
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b101', isBundleSelected: true },
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.book.already_owned).toBe(true);
      expect(data.book.effective_charge_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('adapts bundle UI when student is already enrolled in course (waiving course tuition)', async () => {
      // User 10 is enrolled in course 101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b102', isBundleSelected: true },
      });
      const res = await postBundle(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.course.already_enrolled).toBe(true);
      expect(data.course.effective_charge_ghs).toBe(0);
      // Only unowned book b102 price (140) is payable
      expect(data.total_ghs).toBe(140);
    });
  });

  // Feature 7: Digital DRM & Physical Manual Fulfillment
  describe('Feature 7: Digital & Physical Manual Fulfillment', () => {
    it('verifies DRM reader session token generation with student watermark for owned manual', async () => {
      // User 10 owns b101
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 10, bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.drm_session_token).toBeDefined();
      expect(data.watermark).toContain('ICAG Student ID: 10');
      expect(data.stream_endpoint).toContain('/api/shop/drm/stream');
    });

    it('rejects DRM reader session with 403 Forbidden for non-owned manual', async () => {
      const req = createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: 999, bookId: 'b101' },
      });
      const res = await postDrm(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.error).toContain('DRM Access Denied');
    });

    it('generates campus collection code for Accra Main, Kumasi, and Takoradi', async () => {
      const campuses = ['Accra Main', 'Kumasi', 'Takoradi'] as const;
      for (const campus of campuses) {
        const req = createRequest('/api/shop/fulfillment', {
          method: 'POST',
          body: {
            userId: 15,
            bookId: 'b102',
            deliveryType: 'campus_pickup',
            pickupCampus: campus,
          },
        });
        const res = await postFulfillment(req);
        const { status, data } = await parseResponse(res);
        expect(status).toBe(200);
        expect(data.data.pickup_campus).toBe(campus);
        expect(data.data.collection_code).toMatch(/^ICAG-COL-\d+$/);
      }
    });

    it('processes physical courier delivery with Ghanaian shipping address', async () => {
      const req = createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 17,
          bookId: 'b102',
          deliveryType: 'shipping',
          shippingAddress: {
            street: 'Independence Avenue',
            city: 'Accra',
            region: 'Greater Accra',
          },
        },
      });
      const res = await postFulfillment(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.tracking_number).toMatch(/^GH-EXP-\d+$/);
      expect(data.data.courier).toBe('Ghana Post / Speedlink');
    });
  });

  // Feature 8: Double-Charging Prevention in Redux cartSlice
  describe('Feature 8: Double-Charging Prevention in Redux cartSlice', () => {
    const sampleBook: Book = {
      id: 'b101',
      title: 'ICAG Financial Accounting Study Text',
      slug: 'icag-financial-accounting-study-text',
      level: 'Level 1',
      format: 'both',
      price_ghs: 150,
      isbn: '978-9988-1-2345-1',
      cover_image: '/images/books/financial-acc.jpg',
      is_available: true,
    };

    const sampleCourse = {
      id: 101,
      title: 'Financial Accounting (Level 1)',
      slug: 'financial-accounting-level-1',
      price: 650,
      discount_price: 600,
    };

    it('prevents adding duplicate standalone book to cart', () => {
      let state = cartSlice.reducer(undefined, addBookToCart({ book: sampleBook }));
      expect(state.cartData?.courses.length).toBe(1);
      expect(state.cartData?.subtotal_price).toBe(150);

      // Attempt second addition of identical book
      state = cartSlice.reducer(state, addBookToCart({ book: sampleBook }));
      expect(state.cartData?.courses.length).toBe(1);
      expect(state.cartData?.subtotal_price).toBe(150);
    });

    it('prevents adding standalone book if it is already included in a course bundle', () => {
      // Add bundle containing b101
      let state = cartSlice.reducer(
        undefined,
        addBundleToCart({ course: sampleCourse, book: sampleBook })
      );
      expect(state.cartData?.courses.length).toBe(1);
      expect(state.cartData?.courses[0].is_bundle).toBe(true);

      // Attempt to add standalone b101
      state = cartSlice.reducer(state, addBookToCart({ book: sampleBook }));
      // Should remain 1 item (no duplicate added)
      expect(state.cartData?.courses.length).toBe(1);
      expect(state.cartData?.courses[0].is_bundle).toBe(true);
    });

    it('automatically removes standalone book when student upgrades to companion course bundle', () => {
      // 1. Add standalone book b101 first
      let state = cartSlice.reducer(undefined, addBookToCart({ book: sampleBook }));
      expect(state.cartData?.courses.length).toBe(1);
      expect(state.cartData?.courses[0].type).toBe('book');

      // 2. Add course bundle for course 101 with b101
      state = cartSlice.reducer(
        state,
        addBundleToCart({ course: sampleCourse, book: sampleBook })
      );

      // Standalone book should be merged/removed, leaving 1 bundled item
      expect(state.cartData?.courses.length).toBe(1);
      expect(state.cartData?.courses[0].is_bundle).toBe(true);
      expect(state.cartData?.courses[0].bundle_discount_ghs).toBe(50);
      // Course 600 + Book 150 - Discount 50 = 700 GHS
      expect(state.cartData?.subtotal_price).toBe(700);
    });

    it('waives book price when student already owns the study manual (GHS 0 charged)', () => {
      const state = cartSlice.reducer(
        undefined,
        addBundleToCart({
          course: sampleCourse,
          book: sampleBook,
          ownsBook: true,
        })
      );

      expect(state.cartData?.courses[0].double_charge_prevented).toBe(true);
      expect(state.cartData?.courses[0].attached_book?.already_owned).toBe(true);
      // Only course tuition 600 GHS charged, textbook fee is 0 GHS
      expect(state.cartData?.subtotal_price).toBe(600);
    });

    it('waives total charge to 0 GHS when student is enrolled in course and owns textbook', () => {
      const state = cartSlice.reducer(
        undefined,
        addBundleToCart({
          course: sampleCourse,
          book: sampleBook,
          isEnrolled: true,
          ownsBook: true,
        })
      );

      expect(state.cartData?.courses[0].double_charge_prevented).toBe(true);
      expect(state.cartData?.subtotal_price).toBe(0);
      expect(state.cartData?.total_price).toBe(0);
    });

    it('correctly updates physical fulfillment options in cart state', () => {
      let state = cartSlice.reducer(undefined, addBookToCart({ book: sampleBook }));
      state = cartSlice.reducer(
        state,
        updateFulfillment({
          deliveryType: 'campus_pickup',
          pickupCampus: 'Kumasi',
        })
      );

      expect(state.cartData?.fulfillment?.delivery_type).toBe('campus_pickup');
      expect(state.cartData?.fulfillment?.pickup_campus).toBe('Kumasi');
      expect(state.cartData?.courses[0].pickup_campus).toBe('Kumasi');
    });

    it('removes item and recalculates subtotal properly', () => {
      let state = cartSlice.reducer(undefined, addBookToCart({ book: sampleBook }));
      expect(state.cartData?.courses.length).toBe(1);

      state = cartSlice.reducer(state, removeCartItem(sampleBook.id));
      expect(state.cartData).toBeNull();
    });
  });
});
