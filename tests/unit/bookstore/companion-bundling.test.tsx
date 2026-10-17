import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/course-details/financial-accounting-level-1',
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/utils/api/user/get-cart/getAdminCoupon', () => ({
  getAdminCoupons: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

// Mock translation hook
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        enroll_now: 'Enroll Now',
        enroll_for_free: 'Enroll for Free',
        add_to_cart: 'Add to Cart',
        remove_from_cart: 'Remove from Cart',
        course_includes: 'This Course Includes:',
        loading: 'Loading...',
        adding: 'Adding...',
        removing: 'Removing...',
        login_first: 'Please log in first',
        off: 'OFF',
      };
      return translations[key] || key;
    },
  }),
}));

import { mockStore } from '@/lib/mockApiStore';
import bookstoreReducer from '@/redux/reducers/bookstoreSlice';
import cartReducer, { addBundleToCart, getCartData } from '@/redux/reducers/cartSlice';
import userReducer from '@/redux/reducers/userSlice';
import couponReducer from '@/redux/reducers/couponSlice';
import settingsReducer from '@/redux/reducers/settingsSlice';
import helpersReducer from '@/redux/reducers/helpersReducer';
import billingDetailsReducer from '@/redux/reducers/billingDeatilsSlice';
import languageReducer from '@/redux/reducers/languageSlice';
import CoursePurchaseCard from '@/components/pagesComponent/courseDetails/CoursePurchaseCard';
import { POST as postBundleApi } from '@/app/api/shop/bundles/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

function createTestStore(preloadedState?: any) {
  const rootReducer = combineReducers({
    bookstore: bookstoreReducer,
    cart: cartReducer,
    user: userReducer,
    coupon: couponReducer,
    settings: settingsReducer,
    helpers: helpersReducer,
    billingDetails: billingDetailsReducer,
    language: languageReducer,
  });

  const mergedPreloadedState = {
    ...preloadedState,
    settings: {
      data: { currency_symbol: 'GH₵' },
      ...(preloadedState?.settings || {}),
    },
  };

  return configureStore({
    reducer: rootReducer,
    preloadedState: mergedPreloadedState,
  });
}

const sampleCourse101: any = {
  id: 101,
  title: 'Financial Accounting (Level 1)',
  slug: 'financial-accounting-level-1',
  price: 650,
  discount_price: 600,
  status: 'published',
  level: 'Level 1',
  course_type: 'paid',
  attached_books: [
    { id: 'b101', title: 'ICAG Financial Accounting Study Text', price_ghs: 150, format: 'both' },
  ],
};

const sampleCourse102: any = {
  id: 102,
  title: 'Business Management & Law (Level 1)',
  slug: 'business-management-and-law-level-1',
  price: 600,
  status: 'published',
  level: 'Level 1',
  course_type: 'paid',
  attached_books: [
    { id: 'b102', title: 'Business Law Manual & Question Bank', price_ghs: 140, format: 'physical' },
  ],
};

describe('Feature 6: Course Companion Book Bundling Unit & Component Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    mockStore.reset();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('1. CoursePurchaseCard Component Rendering & Bundling Options', () => {
    it('renders bundling selector with Course Only and Course + Textbook options', () => {
      const store = createTestStore({
        user: { isLogin: true, userData: { id: 15, name: 'Student Test' } },
        bookstore: { ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CoursePurchaseCard isSticky={false} courseData={sampleCourse101} />
          </Provider>
        );
      });

      expect(container.querySelector('[data-testid="bundle-section"]')).not.toBeNull();
      expect(container.textContent).toContain('Prescribed Study Text');
      expect(container.textContent).toContain('Save GH₵ 50 in Bundle');
      expect(container.querySelector('[data-testid="bundle-course-only-option"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="bundle-course-textbook-option"]')).not.toBeNull();
      root.unmount();
    });

    it('defaults to Course Only with standard course price', () => {
      const store = createTestStore({
        user: { isLogin: true, userData: { id: 15, name: 'Student Test' } },
        bookstore: { ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CoursePurchaseCard isSticky={false} courseData={sampleCourse101} />
          </Provider>
        );
      });

      const courseOnlyRadio = container.querySelector('[data-testid="bundle-course-only-radio"]') as HTMLInputElement;
      expect(courseOnlyRadio.checked).toBe(true);
      expect(container.querySelector('[data-testid="bundle-price-breakdown"]')).toBeNull();
      root.unmount();
    });

    it('shows dynamic price breakdown with GH₵ 50 discount when Course + Textbook is selected', () => {
      const store = createTestStore({
        user: { isLogin: true, userData: { id: 15, name: 'Student Test' } },
        bookstore: { ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CoursePurchaseCard isSticky={false} courseData={sampleCourse101} />
          </Provider>
        );
      });

      const bundleRadio = container.querySelector('[data-testid="bundle-course-textbook-radio"]') as HTMLInputElement;
      act(() => {
        bundleRadio.click();
      });

      expect(container.querySelector('[data-testid="bundle-price-breakdown"]')).not.toBeNull();
      // Base Course: 600, Study Text: + 150, Discount: - 50, Total: 700 GHS
      expect(container.textContent).toContain('Base Course:');
      expect(container.textContent).toContain('GH₵600.00');
      expect(container.textContent).toContain('Official Study Text:');
      expect(container.textContent).toContain('+ GH₵150.00');
      expect(container.textContent).toContain('Institutional Bundle Discount:');
      expect(container.textContent).toContain('- GH₵50.00');
      expect(container.querySelector('[data-testid="bundle-total-price"]')?.textContent).toContain('GH₵700.00');
      root.unmount();
    });

    it('adapts bundling UI when student already owns the prescribed textbook (waives textbook charge)', () => {
      // User owns b101
      const store = createTestStore({
        user: { isLogin: true, userData: { id: 10, name: 'Student With Textbook' } },
        bookstore: { ownedBookIds: ['b101'] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CoursePurchaseCard isSticky={false} courseData={sampleCourse101} />
          </Provider>
        );
      });

      expect(container.querySelector('[data-testid="textbook-owned-badge"]')).not.toBeNull();
      expect(container.textContent).toContain('Textbook Owned');

      const bundleRadio = container.querySelector('[data-testid="bundle-course-textbook-radio"]') as HTMLInputElement;
      act(() => {
        bundleRadio.click();
      });

      expect(container.querySelector('[data-testid="textbook-waived-msg"]')).not.toBeNull();
      expect(container.textContent).toContain('Textbook fee waived: You already own this study manual.');
      // Textbook price is waived: effective course charge 600 GHS, textbook 0 GHS, total 600 GHS
      expect(container.querySelector('[data-testid="bundle-total-price"]')?.textContent).toContain('GH₵600.00');
      expect(container.querySelector('[data-testid="bundle-duplicate-notice"]')).not.toBeNull();
      root.unmount();
    });

    it('adapts bundling UI when student is already enrolled in course (waives tuition fee)', () => {
      const enrolledCourse = { ...sampleCourse101, is_purchased: 1 };
      const store = createTestStore({
        user: { isLogin: true, userData: { id: 10, name: 'Enrolled Student' } },
        bookstore: { ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CoursePurchaseCard isSticky={false} courseData={enrolledCourse} />
          </Provider>
        );
      });

      const bundleRadio = container.querySelector('[data-testid="bundle-course-textbook-radio"]') as HTMLInputElement;
      act(() => {
        bundleRadio.click();
      });

      // Course tuition is 0 (Enrolled), only textbook 150 GHS is payable
      expect(container.textContent).toContain('GH₵ 0.00 (Enrolled)');
      expect(container.querySelector('[data-testid="bundle-total-price"]')?.textContent).toContain('GH₵150.00');
      root.unmount();
    });

    it('dispatches addBundleToCart with correct bundle item details when Add to Cart is clicked', () => {
      const store = createTestStore({
        user: { isLogin: true, userData: { id: 15, name: 'New Student' } },
        bookstore: { ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CoursePurchaseCard isSticky={false} courseData={sampleCourse101} />
          </Provider>
        );
      });

      // Select bundle option
      const bundleRadio = container.querySelector('[data-testid="bundle-course-textbook-radio"]') as HTMLInputElement;
      act(() => {
        bundleRadio.click();
      });

      // Click Add to Cart
      const addToCartBtn = container.querySelector('[data-testid="add-to-cart-button"]') as HTMLButtonElement;
      expect(addToCartBtn).not.toBeNull();
      act(() => {
        addToCartBtn.click();
      });

      const cart = getCartData(store.getState() as any);
      expect(cart).not.toBeNull();
      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].is_bundle).toBe(true);
      expect(cart?.courses[0].bundle_discount_ghs).toBe(50);
      expect(cart?.courses[0].attached_book?.id).toBe('b101');
      expect(cart?.subtotal_price).toBe(700);
      root.unmount();
    });
  });

  describe('2. Bundles API Route Handler (/api/shop/bundles)', () => {
    it('returns course_only breakdown when isBundleSelected is false', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, isBundleSelected: false },
      });
      const res = await postBundleApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.mode).toBe('course_only');
      expect(data.book).toBeNull();
      expect(data.bundle_discount_ghs).toBe(0);
      expect(data.total_ghs).toBe(600);
    });

    it('calculates bundle pricing with GH₵ 50 discount for course + companion book', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b101', isBundleSelected: true },
      });
      const res = await postBundleApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.mode).toBe('bundle');
      expect(data.bundle_discount_ghs).toBe(50);
      expect(data.subtotal_ghs).toBe(750); // 600 + 150
      expect(data.total_ghs).toBe(700); // 750 - 50
      expect(data.double_charge_prevented).toBe(false);
    });

    it('waives companion textbook price when student userId already owns book', async () => {
      // User 10 owns book b101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b101', isBundleSelected: true },
      });
      const res = await postBundleApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.book.already_owned).toBe(true);
      expect(data.book.effective_charge_ghs).toBe(0);
      expect(data.double_charge_prevented).toBe(true);
      expect(data.breakdown_notice).toContain('Duplicate fee prevented');
    });

    it('waives course tuition when student userId is already enrolled', async () => {
      // User 10 is enrolled in course 101
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 101, bookId: 'b102', isBundleSelected: true },
      });
      const res = await postBundleApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.course.already_enrolled).toBe(true);
      expect(data.course.effective_charge_ghs).toBe(0);
      // Only unowned textbook b102 price (140) is payable
      expect(data.total_ghs).toBe(140);
      expect(data.double_charge_prevented).toBe(true);
    });

    it('returns 400 when courseId is missing', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { isBundleSelected: true },
      });
      const res = await postBundleApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(400);
      expect(data.error).toBe('courseId is required');
    });

    it('returns 404 when course is not found in mock store', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 99999, isBundleSelected: true },
      });
      const res = await postBundleApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(404);
      expect(data.error).toBe('Course not found');
    });

    it('returns 404 when companion bookId is not found', async () => {
      const req = createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b_invalid_999', isBundleSelected: true },
      });
      const res = await postBundleApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(404);
      expect(data.error).toBe('Companion book not found');
    });
  });
});
