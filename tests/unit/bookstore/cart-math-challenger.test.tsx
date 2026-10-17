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
  usePathname: () => '/cart',
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock translation hook
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        cart_items_count: '{count} Courses in Cart',
        remove_item: 'Remove',
        item_removed_from_cart: 'Item removed from cart',
        by_label: 'By',
        move_to_wishlist: 'Move to Wishlist',
        remove_from_wishlist: 'Remove from Wishlist',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock Wishlist hook
vi.mock('@/hooks/useWishlist', () => ({
  useWishlist: () => ({
    toggleWishlist: vi.fn().mockResolvedValue(true),
    isLoading: false,
    isAuthenticated: true,
  }),
}));

// Mock API calls in CartItems
vi.mock('@/utils/api/user/get-cart/removeFromCart', () => ({
  removeFromCart: vi.fn().mockResolvedValue({ error: false, message: 'Removed' }),
}));

vi.mock('@/utils/api/user/get-cart/getCart', () => ({
  getCartItems: vi.fn().mockResolvedValue({ error: false, data: { courses: [] } }),
}));

import { mockStore } from '@/lib/mockApiStore';
import bookstoreReducer from '@/redux/reducers/bookstoreSlice';
import cartReducer, {
  addBookToCart,
  addBundleToCart,
  removeCartItem,
  removeCourseFromCart,
  updateFulfillment,
  getCartData,
  selectHasPhysicalCartItems,
} from '@/redux/reducers/cartSlice';
import userReducer from '@/redux/reducers/userSlice';
import couponReducer from '@/redux/reducers/couponSlice';
import settingsReducer from '@/redux/reducers/settingsSlice';
import helpersReducer from '@/redux/reducers/helpersReducer';
import billingDetailsReducer from '@/redux/reducers/billingDeatilsSlice';
import languageReducer from '@/redux/reducers/languageSlice';
import CartItems from '@/components/pagesComponent/cart/CartItems';
import { Book } from '@/types/bookstore';

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

const book101: Book = {
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

const book102: Book = {
  id: 'b102',
  title: 'Business Law Manual & Question Bank',
  slug: 'business-law-manual',
  level: 'Level 1',
  format: 'physical',
  price_ghs: 140,
  isbn: '978-9988-1-2345-2',
  cover_image: '/images/books/business-law.jpg',
  is_available: true,
};

const book201: Book = {
  id: 'b201',
  title: 'ICAG Advanced Taxation Manual',
  slug: 'icag-advanced-taxation-manual',
  level: 'Level 2',
  format: 'digital',
  price_ghs: 180,
  isbn: '978-9988-2-3456-1',
  cover_image: '/images/books/taxation.jpg',
  is_available: true,
};

const course101 = {
  id: 101,
  title: 'Financial Accounting (Level 1)',
  slug: 'financial-accounting-level-1',
  price: 650,
  discount_price: 600,
  original_price: 650,
};

const course102 = {
  id: 102,
  title: 'Business Management & Law (Level 1)',
  slug: 'business-management-and-law-level-1',
  price: 600,
  discount_price: 550,
  original_price: 600,
};

const course201 = {
  id: 201,
  title: 'Advanced Taxation (Level 2)',
  slug: 'advanced-taxation-level-2',
  price: 750,
  discount_price: 700,
  original_price: 750,
};

describe('Adversarial Challenger Suite: Milestone 2 Cart Math & Fulfillment', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    mockStore.reset();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  // =========================================================================
  // Dimension 1: Duplicate Bundling Stress Tests
  // =========================================================================
  describe('Dimension 1: Duplicate Bundling & Upgrade Idempotence', () => {
    it('CH-01: Disallowing duplicate bundle addition (repeated addBundleToCart replaces/idempotent)', () => {
      const store = createTestStore();

      // Add Course 101 + Book 101 bundle
      store.dispatch(addBundleToCart({ course: course101, book: book101 }));
      let cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(1);
      expect(cart?.subtotal_price).toBe(700); // 600 + 150 - 50

      // Add identical bundle a second time
      store.dispatch(addBundleToCart({ course: course101, book: book101 }));
      cart = getCartData(store.getState() as any);

      // Must remain exactly 1 item and exactly 700 GHS (no double-billing!)
      expect(cart?.courses.length).toBe(1);
      expect(cart?.subtotal_price).toBe(700);
      expect(cart?.total_price).toBe(700);
      expect(cart?.discount_price).toBe(50);
    });

    it('CH-02: Upgrading from standalone course to companion bundle deduplicates course item', () => {
      const store = createTestStore({
        cart: {
          cartData: {
            courses: [
              {
                id: 101,
                course_id: 101,
                title: 'Financial Accounting (Level 1)',
                slug: 'financial-accounting-level-1',
                thumbnail: '/images/courses/fa.jpg',
                display_price: 600,
                display_discount_price: 600,
                original_price: 650,
                promo_discount: 0,
                final_price: 600,
                promo_code: null,
                tax_amount: 0,
                total_tax_percentage: 0,
                instructor: 'ICAG Faculty',
                is_wishlisted: false,
                average_rating: 5,
                ratings: 10,
                course_discount: 50,
                subtotal: 600,
                type: 'course',
              },
            ],
            total_display_price: 650,
            original_price: 650,
            promo_discount: 0,
            discount: 0,
            tax_amount: 0,
            subtotal_price: 600,
            discount_price: 50,
            total_price: 600,
            promo_discounts: [],
            course_discount: 50,
            subtotal: 600,
            taxable_amount: 0,
            tax_percentage: 0,
            total: 600,
          },
        },
      });

      // Verify cart starts with 1 course item
      let cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].type).toBe('course');

      // Now student selects companion bundle for this course
      store.dispatch(addBundleToCart({ course: course101, book: book101 }));
      cart = getCartData(store.getState() as any);

      // Must have upgraded into 1 bundle item (old course removed)
      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].type).toBe('bundle');
      expect(cart?.courses[0].is_bundle).toBe(true);
      expect(cart?.courses[0].attached_book?.id).toBe('b101');
      expect(cart?.subtotal_price).toBe(700);
      expect(cart?.original_price).toBe(750);
    });

    it('CH-03: Upgrading from standalone book to companion bundle deduplicates book item', () => {
      const store = createTestStore();

      // Add standalone book b101 first
      store.dispatch(addBookToCart({ book: book101 }));
      let cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].type).toBe('book');
      expect(cart?.subtotal_price).toBe(150);

      // Now student adds the companion bundle
      store.dispatch(addBundleToCart({ course: course101, book: book101 }));
      cart = getCartData(store.getState() as any);

      // Standalone book must be removed, leaving only the bundle
      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].type).toBe('bundle');
      expect(cart?.courses[0].attached_book?.id).toBe('b101');
      expect(cart?.subtotal_price).toBe(700); // 600 + 150 - 50
    });

    it('CH-04: Rejecting standalone book addition when already included in a bundle in cart', () => {
      const store = createTestStore();

      // Bundle containing b101 is already in cart
      store.dispatch(addBundleToCart({ course: course101, book: book101 }));
      let cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(1);

      // User visits bookstore /shop and clicks Add to Cart for b101
      store.dispatch(addBookToCart({ book: book101 }));
      cart = getCartData(store.getState() as any);

      // Must reject duplicate: cart stays 1 bundle, total stays 700 GHS
      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].type).toBe('bundle');
      expect(cart?.subtotal_price).toBe(700);
    });

    it('CH-05: Allowing independent different standalone book when another book is bundled', () => {
      const store = createTestStore();

      // Course 101 + Book b101 in cart
      store.dispatch(addBundleToCart({ course: course101, book: book101 }));

      // Add a different book b102 (Business Law)
      store.dispatch(addBookToCart({ book: book102 }));
      const cart = getCartData(store.getState() as any);

      expect(cart?.courses.length).toBe(2);
      expect(cart?.courses.find((c) => c.type === 'bundle')?.attached_book?.id).toBe('b101');
      expect(cart?.courses.find((c) => c.type === 'book')?.book_id).toBe('b102');
      // Subtotal = Bundle (700) + Book b102 (140) = 840 GHS
      expect(cart?.subtotal_price).toBe(840);
      expect(cart?.total_price).toBe(840);
    });
  });

  // =========================================================================
  // Dimension 2: Multi-Item Bundling & Sequential Removal Stress Tests
  // =========================================================================
  describe('Dimension 2: Multi-Item Bundling & Removal Consistency', () => {
    it('CH-06: Accumulates multiple distinct bundles correctly with independent discounts', () => {
      const store = createTestStore();

      // Bundle 1: Course 101 (600) + Book b101 (150) - Discount (50) = 700
      store.dispatch(addBundleToCart({ course: course101, book: book101 }));

      // Bundle 2: Course 102 (550) + Book b102 (140) - Discount (50) = 640
      store.dispatch(addBundleToCart({ course: course102, book: book102 }));

      // Bundle 3: Course 201 (700) + Book b201 (180) - Discount (50) = 830
      store.dispatch(addBundleToCart({ course: course201, book: book201 }));

      const cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(3);

      // Expected math: 700 + 640 + 830 = 2170 GHS
      expect(cart?.subtotal_price).toBe(2170);
      expect(cart?.total_price).toBe(2170);
      // Original price: (600 + 150) + (550 + 140) + (700 + 180) = 750 + 690 + 880 = 2320 GHS
      expect(cart?.original_price).toBe(2320);
      // Total discount: 50 * 3 = 150 GHS
      expect(cart?.discount_price).toBe(150);
    });

    it('CH-07: Removing a bundle via removeCartItem correctly decrements cart totals and discounts', () => {
      const store = createTestStore();

      store.dispatch(addBundleToCart({ course: course101, book: book101 })); // 700 GHS
      store.dispatch(addBundleToCart({ course: course102, book: book102 })); // 640 GHS

      let cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(2);
      expect(cart?.subtotal_price).toBe(1340); // 700 + 640

      // Remove course 101 bundle
      store.dispatch(removeCartItem(101));
      cart = getCartData(store.getState() as any);

      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].id).toBe(102);
      expect(cart?.subtotal_price).toBe(640);
      expect(cart?.total_price).toBe(640);
      expect(cart?.discount_price).toBe(50);
      expect(cart?.original_price).toBe(690); // 550 + 140
    });

    it('CH-08: Removing all bundles resets cartData cleanly to null without leaving dangling state', () => {
      const store = createTestStore();

      store.dispatch(addBundleToCart({ course: course101, book: book101 }));
      expect(getCartData(store.getState() as any)).not.toBeNull();

      // Remove the single item
      store.dispatch(removeCartItem(101));
      const cart = getCartData(store.getState() as any);
      expect(cart).toBeNull();
    });

    it('CH-09: Removing bundle by bookId string removes matching bundle and recalculates totals', () => {
      const store = createTestStore();

      store.dispatch(addBundleToCart({ course: course101, book: book101 })); // book_id: 'b101'
      store.dispatch(addBundleToCart({ course: course102, book: book102 }));

      // Remove by bookId 'b101'
      store.dispatch(removeCartItem('b101'));
      const cart = getCartData(store.getState() as any);

      expect(cart?.courses.length).toBe(1);
      expect(cart?.courses[0].id).toBe(102);
      expect(cart?.subtotal_price).toBe(640);
    });
  });

  // =========================================================================
  // Dimension 3: Physical Fulfillment Switching (Accra Main, Kumasi, Takoradi)
  // =========================================================================
  describe('Dimension 3: Fulfillment Option Switching Stress Tests', () => {
    it('CH-10: Switches campus pickup locations across Accra Main, Kumasi, and Takoradi for all cart items', () => {
      const store = createTestStore();

      // Add a bundle with a physical textbook
      store.dispatch(
        addBundleToCart({
          course: course101,
          book: book101,
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main',
        })
      );

      // Add a standalone physical book
      store.dispatch(
        addBookToCart({
          book: book102,
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main',
        })
      );

      let cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(2);
      expect(cart?.courses[0].pickup_campus).toBe('Accra Main');
      expect(cart?.courses[1].pickup_campus).toBe('Accra Main');

      // Switch to Kumasi Regional Center
      store.dispatch(
        updateFulfillment({
          deliveryType: 'campus_pickup',
          pickupCampus: 'Kumasi',
        })
      );
      cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.delivery_type).toBe('campus_pickup');
      expect(cart?.fulfillment?.pickup_campus).toBe('Kumasi');
      expect(cart?.courses[0].pickup_campus).toBe('Kumasi');
      expect(cart?.courses[1].pickup_campus).toBe('Kumasi');

      // Switch to Takoradi Regional Center
      store.dispatch(
        updateFulfillment({
          deliveryType: 'campus_pickup',
          pickupCampus: 'Takoradi',
        })
      );
      cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.pickup_campus).toBe('Takoradi');
      expect(cart?.courses[0].pickup_campus).toBe('Takoradi');
      expect(cart?.courses[1].pickup_campus).toBe('Takoradi');

      // Switch back to Accra Main
      store.dispatch(
        updateFulfillment({
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main',
        })
      );
      cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.pickup_campus).toBe('Accra Main');
      expect(cart?.courses[0].pickup_campus).toBe('Accra Main');
      expect(cart?.courses[1].pickup_campus).toBe('Accra Main');
    });

    it('CH-11: Switches between campus pickup and door-to-door courier delivery seamlessly', () => {
      const store = createTestStore();

      store.dispatch(addBundleToCart({ course: course101, book: book101 }));

      const address = {
        street: '14 Independence Avenue',
        city: 'Accra',
        region: 'Greater Accra',
        phone: '+233 24 123 4567',
      };

      // Switch from default pickup to shipping
      store.dispatch(
        updateFulfillment({
          deliveryType: 'shipping',
          shippingAddress: address,
        })
      );

      let cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.delivery_type).toBe('shipping');
      expect(cart?.fulfillment?.shipping_address?.street).toBe('14 Independence Avenue');
      expect(cart?.courses[0].delivery_type).toBe('shipping');
      expect(cart?.courses[0].shipping_address?.city).toBe('Accra');

      // Switch back to campus pickup at Kumasi
      store.dispatch(
        updateFulfillment({
          deliveryType: 'campus_pickup',
          pickupCampus: 'Kumasi',
        })
      );

      cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.delivery_type).toBe('campus_pickup');
      expect(cart?.fulfillment?.pickup_campus).toBe('Kumasi');
      expect(cart?.courses[0].delivery_type).toBe('campus_pickup');
      expect(cart?.courses[0].pickup_campus).toBe('Kumasi');
    });

    it('CH-12: selectHasPhysicalCartItems accurately reflects presence/absence of physical items', () => {
      const store = createTestStore();

      // 1. Digital only book in cart
      store.dispatch(
        addBookToCart({
          book: book201, // digital format
          deliveryType: 'digital',
        })
      );
      let state = store.getState() as any;
      expect(selectHasPhysicalCartItems(state)).toBe(false);

      // 2. Add physical book
      store.dispatch(
        addBookToCart({
          book: book102, // physical format
          deliveryType: 'campus_pickup',
        })
      );
      state = store.getState() as any;
      expect(selectHasPhysicalCartItems(state)).toBe(true);

      // 3. Remove physical book, leaving digital
      store.dispatch(removeCartItem(book102.id));
      state = store.getState() as any;
      expect(selectHasPhysicalCartItems(state)).toBe(false);
    });
  });

  // =========================================================================
  // Dimension 4: Pricing Entitlements & Extreme Cart Math Boundaries
  // =========================================================================
  describe('Dimension 4: Pricing Entitlements & Precision Boundaries', () => {
    it('CH-13: Preserves zero cost when user is both enrolled and textbook owner', () => {
      const store = createTestStore();

      store.dispatch(
        addBundleToCart({
          course: course101,
          book: book101,
          isEnrolled: true,
          ownsBook: true,
        })
      );

      const cart = getCartData(store.getState() as any);
      expect(cart?.courses[0].double_charge_prevented).toBe(true);
      expect(cart?.courses[0].final_price).toBe(0);
      expect(cart?.subtotal_price).toBe(0);
      expect(cart?.total_price).toBe(0);
      expect(cart?.discount_price).toBe(0);
    });

    it('CH-14: Fractional GHS prices (pesewas) calculate without precision drift or NaN', () => {
      const store = createTestStore();

      const fractionalCourse = {
        id: 991,
        title: 'Specialized Auditing',
        slug: 'specialized-auditing',
        price: 499.95,
        discount_price: 449.50,
      };

      const fractionalBook: Book = {
        id: 'b991',
        title: 'Auditing Standards Pocket Guide',
        slug: 'auditing-standards-pocket-guide',
        level: 'Level 2',
        format: 'physical',
        price_ghs: 99.75,
        cover_image: '/images/books/guide.jpg',
        is_available: true,
      };

      store.dispatch(
        addBundleToCart({
          course: fractionalCourse,
          book: fractionalBook,
        })
      );

      const cart = getCartData(store.getState() as any);
      // Course (449.50) + Book (99.75) - Bundle discount (50.00) = 499.25
      expect(cart?.subtotal_price).toBeCloseTo(499.25, 2);
      expect(cart?.total_price).toBeCloseTo(499.25, 2);
      expect(cart?.original_price).toBeCloseTo(549.25, 2); // 449.50 + 99.75
    });

    it('CH-15: Massive multi-item cart stress (10 mixed items): totals remain strictly consistent', () => {
      const store = createTestStore();

      // Add 5 distinct bundles
      for (let i = 1; i <= 5; i++) {
        const c = { id: 1000 + i, title: `Course ${i}`, discount_price: 500 + i * 20 };
        const b: Book = {
          id: `book_${i}`,
          title: `Book ${i}`,
          slug: `book-${i}`,
          level: 'Level 1',
          format: 'both',
          price_ghs: 100 + i * 10,
          cover_image: '',
          is_available: true,
        };
        store.dispatch(addBundleToCart({ course: c, book: b }));
      }

      // Add 5 distinct standalone books
      for (let i = 6; i <= 10; i++) {
        const b: Book = {
          id: `book_${i}`,
          title: `Book ${i}`,
          slug: `book-${i}`,
          level: 'Level 2',
          format: 'digital',
          price_ghs: 120,
          cover_image: '',
          is_available: true,
        };
        store.dispatch(addBookToCart({ book: b }));
      }

      let cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(10);

      // Verify each bundle applied exactly 50 GHS discount
      const bundles = cart?.courses.filter((c) => c.is_bundle) || [];
      expect(bundles.length).toBe(5);
      expect(cart?.discount_price).toBe(250); // 50 * 5

      // Remove 3 bundles sequentially
      store.dispatch(removeCartItem(1001));
      store.dispatch(removeCartItem(1002));
      store.dispatch(removeCartItem(1003));

      cart = getCartData(store.getState() as any);
      expect(cart?.courses.length).toBe(7);
      expect(cart?.discount_price).toBe(100); // 2 bundles left * 50

      // Switch fulfillment to Takoradi for all remaining physical items
      store.dispatch(
        updateFulfillment({
          deliveryType: 'campus_pickup',
          pickupCampus: 'Takoradi',
        })
      );

      cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.pickup_campus).toBe('Takoradi');
      cart?.courses.forEach((item) => {
        expect(item.pickup_campus).toBe('Takoradi');
      });
    });
  });

  // =========================================================================
  // Dimension 5: UI Integration Stress (CartItems Component)
  // =========================================================================
  describe('Dimension 5: CartItems Component Rendering & Interaction Stress', () => {
    it('CH-16: CartItems displays physical fulfillment section when physical bundle is present', () => {
      const store = createTestStore();
      store.dispatch(
        addBundleToCart({
          course: course101,
          book: book101, // format: 'both' -> physical fulfillment required
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main',
        })
      );

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CartItems />
          </Provider>
        );
      });

      // Fulfillment section must render
      const section = container.querySelector('[data-testid="physical-fulfillment-section"]');
      expect(section).not.toBeNull();
      expect(container.textContent).toContain('Physical Study Manual Fulfillment Options');
      expect(container.textContent).toContain('Campus Collection (Free)');
      expect(container.textContent).toContain('Accra Main Campus');
      expect(container.textContent).toContain('Kumasi Regional Center');
      expect(container.textContent).toContain('Takoradi Regional Center');
      root.unmount();
    });

    it('CH-17: CartItems campus radio buttons toggle pickup campus between Accra Main, Kumasi, Takoradi', () => {
      const store = createTestStore();
      store.dispatch(
        addBundleToCart({
          course: course101,
          book: book101,
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main',
        })
      );

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CartItems />
          </Provider>
        );
      });

      const kumasiRadio = container.querySelector('[data-testid="campus-radio-kumasi"]') as HTMLInputElement;
      expect(kumasiRadio).not.toBeNull();
      act(() => {
        kumasiRadio.click();
      });

      let cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.pickup_campus).toBe('Kumasi');

      const takoradiRadio = container.querySelector('[data-testid="campus-radio-takoradi"]') as HTMLInputElement;
      expect(takoradiRadio).not.toBeNull();
      act(() => {
        takoradiRadio.click();
      });

      cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.pickup_campus).toBe('Takoradi');
      root.unmount();
    });

    it('CH-18: CartItems toggling to Ghana Post shipping renders address fields and updates state', () => {
      const store = createTestStore();
      store.dispatch(
        addBundleToCart({
          course: course101,
          book: book101,
          deliveryType: 'campus_pickup',
        })
      );

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <CartItems />
          </Provider>
        );
      });

      const shippingRadio = container.querySelector('[data-testid="delivery-type-shipping"]') as HTMLInputElement;
      expect(shippingRadio).not.toBeNull();
      act(() => {
        shippingRadio.click();
      });

      // Shipping address inputs should now be present
      const streetInput = container.querySelector('[data-testid="shipping-street-input"]') as HTMLInputElement;
      const cityInput = container.querySelector('[data-testid="shipping-city-input"]') as HTMLInputElement;
      expect(streetInput).not.toBeNull();
      expect(cityInput).not.toBeNull();

      // Enter address
      act(() => {
        streetInput.value = 'Liberation Road';
        streetInput.dispatchEvent(new Event('change', { bubbles: true }));
        cityInput.value = 'Kumasi';
        cityInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const cart = getCartData(store.getState() as any);
      expect(cart?.fulfillment?.delivery_type).toBe('shipping');
      root.unmount();
    });
  });
});
