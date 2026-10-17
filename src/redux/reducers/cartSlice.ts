// Import necessary modules
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { CartData, CartItem } from "@/utils/api/user/get-cart/getCart";
import { Book, CampusLocation, DeliveryType, ShippingAddress } from "@/types/bookstore";

// Define the cart state interface
interface CartState {
  cartData: CartData | null;
}

// Initial state
const initialState: CartState = {
  cartData: null,
};

// Helper: Ensure cartData container exists
const ensureCartData = (state: CartState) => {
  if (!state.cartData) {
    state.cartData = {
      courses: [],
      total_display_price: 0,
      promo_discount: 0,
      discount: 0,
      tax_amount: 0,
      subtotal_price: 0,
      discount_price: 0,
      total_price: 0,
      promo_discounts: [],
      original_price: 0,
      course_discount: 0,
      subtotal: 0,
      taxable_amount: 0,
      tax_percentage: 0,
      total: 0,
    };
  }
};

// Helper: Recalculate totals across cart
const recalculateCartTotals = (cartData: CartData) => {
  let subtotal = 0;
  let originalTotal = 0;
  let discountTotal = 0;

  for (const item of cartData.courses) {
    const itemEffectivePrice =
      item.final_price !== undefined
        ? item.final_price
        : item.display_discount_price > 0
        ? item.display_discount_price
        : item.display_price;
    subtotal += Number(itemEffectivePrice) || 0;
    originalTotal += Number(item.original_price ?? item.display_price) || 0;
    discountTotal += Number(item.course_discount ?? item.bundle_discount_ghs ?? 0) || 0;
  }

  cartData.subtotal_price = subtotal;
  cartData.subtotal = subtotal;
  cartData.total_display_price = originalTotal;
  cartData.original_price = originalTotal;
  cartData.total_price = subtotal;
  cartData.total = subtotal;
  cartData.discount_price = discountTotal;
};

// Create the cart slice
export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Set cart data
    setCartData: (state, action: PayloadAction<CartData | null>) => {
      state.cartData = action.payload;
    },
    // Update cart with full cart response from API
    updateCartFromResponse: (state, action: PayloadAction<CartData>) => {
      state.cartData = action.payload;
    },
    // Optimistically remove course from cart
    removeCourseFromCart: (state, action: PayloadAction<number>) => {
      if (state.cartData && state.cartData.courses) {
        const courseToRemove = state.cartData.courses.find(
          (course) => course.id === action.payload
        );

        if (courseToRemove) {
          state.cartData.courses = state.cartData.courses.filter(
            (course) => course.id !== action.payload
          );

          if (state.cartData.promo_discounts) {
            state.cartData.promo_discounts = state.cartData.promo_discounts.filter(
              (promoDiscount) => promoDiscount.course_id !== action.payload
            );
          }

          if (state.cartData.courses.length === 0) {
            state.cartData = null;
            return;
          }

          recalculateCartTotals(state.cartData);
        }
      }
    },
    // Generic remove item by ID or book_id
    removeCartItem: (state, action: PayloadAction<number | string>) => {
      if (state.cartData && state.cartData.courses) {
        const target = action.payload;
        state.cartData.courses = state.cartData.courses.filter(
          (item) => item.id !== target && item.book_id !== target && String(item.id) !== String(target)
        );

        if (state.cartData.courses.length === 0) {
          state.cartData = null;
          return;
        }

        recalculateCartTotals(state.cartData);
      }
    },
    updateCartItemWishlistStatus: (
      state,
      action: PayloadAction<{ courseId: number; isWishlisted: boolean }>
    ) => {
      if (state.cartData && state.cartData.courses) {
        state.cartData.courses = state.cartData.courses.map((course) =>
          course.id === action.payload.courseId
            ? { ...course, is_wishlisted: action.payload.isWishlisted }
            : course
        );
      }
    },
    // Feature 8: Add Standalone Book with Duplicate Prevention
    addBookToCart: (
      state,
      action: PayloadAction<{
        book: Book;
        deliveryType?: DeliveryType;
        pickupCampus?: CampusLocation;
        shippingAddress?: ShippingAddress;
        ownsBook?: boolean;
      }>
    ) => {
      ensureCartData(state);
      const { book, deliveryType, pickupCampus, shippingAddress, ownsBook } = action.payload;

      // 1. Check if book already in cart as standalone
      const existsAsStandalone = state.cartData!.courses.some(
        (item) => item.book_id === book.id || (item.type === 'book' && item.title === book.title)
      );
      if (existsAsStandalone) {
        return; // Duplicate charge prevented
      }

      // 2. Check if book is already bundled in a course in cart
      const existsInBundle = state.cartData!.courses.some(
        (item) => item.is_bundle && item.attached_book?.id === book.id
      );
      if (existsInBundle) {
        return; // Duplicate charge prevented (already included in bundle)
      }

      const numericId = parseInt(book.id.replace(/\D/g, ''), 10) || 8000 + Math.floor(Math.random() * 1000);
      const effectivePrice = ownsBook ? 0 : book.price_ghs;

      const newBookItem: CartItem = {
        id: numericId,
        title: book.title,
        slug: book.slug,
        thumbnail: book.cover_image,
        display_price: book.price_ghs,
        display_discount_price: 0,
        original_price: book.price_ghs,
        promo_discount: 0,
        final_price: effectivePrice,
        promo_code: null,
        tax_amount: 0,
        total_tax_percentage: 0,
        instructor: 'ICAG Academic Publishing',
        is_wishlisted: false,
        average_rating: 5,
        ratings: 20,
        course_discount: 0,
        subtotal: effectivePrice,
        type: 'book',
        book_id: book.id,
        price_ghs: effectivePrice,
        is_bundle: false,
        delivery_type: deliveryType || (book.format === 'physical' ? 'campus_pickup' : 'digital'),
        pickup_campus: pickupCampus || (book.format === 'physical' ? 'Accra Main' : undefined),
        shipping_address: shippingAddress,
        double_charge_prevented: Boolean(ownsBook),
        breakdown_notice: ownsBook ? 'Study text fee waived (student entitlement active)' : undefined,
      };

      state.cartData!.courses.push(newBookItem);
      recalculateCartTotals(state.cartData!);
    },
    // Feature 6 & 8: Add Course + Book Companion Bundle
    addBundleToCart: (
      state,
      action: PayloadAction<{
        course: any;
        book: Book;
        isEnrolled?: boolean;
        ownsBook?: boolean;
        deliveryType?: DeliveryType;
        pickupCampus?: CampusLocation;
        shippingAddress?: ShippingAddress;
      }>
    ) => {
      ensureCartData(state);
      const { course, book, isEnrolled, ownsBook, deliveryType, pickupCampus, shippingAddress } = action.payload;

      // 1. Remove standalone book if present in cart to avoid double billing
      state.cartData!.courses = state.cartData!.courses.filter(
        (item) => !(item.book_id === book.id && item.type === 'book')
      );

      // 2. Remove standalone course if present to upgrade to bundle
      state.cartData!.courses = state.cartData!.courses.filter(
        (item) => item.id !== course.id && item.course_id !== course.id
      );

      const courseBasePrice = course.discount_price ?? course.price ?? course.original_price ?? 600;
      const bookBasePrice = book.price_ghs;
      const standardBundleDiscount = 50;

      const effectiveCourseCharge = isEnrolled ? 0 : courseBasePrice;
      const effectiveBookCharge = ownsBook ? 0 : bookBasePrice;
      const effectiveBundleDiscount = (!isEnrolled && !ownsBook) ? standardBundleDiscount : 0;

      let totalGhs = effectiveCourseCharge + effectiveBookCharge - effectiveBundleDiscount;
      if (totalGhs < 0) totalGhs = 0;

      const doubleChargePrevented = Boolean(isEnrolled || ownsBook);

      const bundleItem: CartItem = {
        id: course.id,
        course_id: course.id,
        book_id: book.id,
        type: 'bundle',
        title: `${course.title} + ${book.title}`,
        slug: course.slug,
        thumbnail: course.image || course.thumbnail || '/images/courses/default.jpg',
        display_price: courseBasePrice + bookBasePrice,
        display_discount_price: totalGhs,
        original_price: courseBasePrice + bookBasePrice,
        promo_discount: 0,
        final_price: totalGhs,
        promo_code: null,
        tax_amount: 0,
        total_tax_percentage: 0,
        instructor: course.author_name || course.instructor || 'ICAG Lead Faculty',
        is_wishlisted: false,
        average_rating: course.average_rating || 5,
        ratings: course.ratings || 25,
        course_discount: effectiveBundleDiscount,
        subtotal: totalGhs,
        price_ghs: totalGhs,
        is_bundle: true,
        bundle_discount_ghs: effectiveBundleDiscount,
        attached_book: {
          id: book.id,
          title: book.title,
          price_ghs: bookBasePrice,
          format: book.format,
          already_owned: ownsBook,
        },
        delivery_type: deliveryType || (book.format === 'physical' ? 'campus_pickup' : 'digital'),
        pickup_campus: pickupCampus || (book.format === 'physical' ? 'Accra Main' : undefined),
        shipping_address: shippingAddress,
        double_charge_prevented: doubleChargePrevented,
        breakdown_notice: doubleChargePrevented
          ? 'Duplicate fee prevented: Student already possesses part of this bundle.'
          : 'Prescribed textbook bundled with official ICAG course discount applied.',
      };

      state.cartData!.courses.push(bundleItem);
      recalculateCartTotals(state.cartData!);
    },
    // Feature 7: Physical manual fulfillment updates
    updateFulfillment: (
      state,
      action: PayloadAction<{
        deliveryType: DeliveryType;
        pickupCampus?: CampusLocation;
        shippingAddress?: ShippingAddress;
        bookId?: string;
      }>
    ) => {
      if (state.cartData) {
        const { deliveryType, pickupCampus, shippingAddress, bookId } = action.payload;
        state.cartData.fulfillment = {
          delivery_type: deliveryType,
          pickup_campus: pickupCampus,
          shipping_address: shippingAddress,
        };
        if (state.cartData.courses) {
          state.cartData.courses = state.cartData.courses.map((item) => {
            if (!bookId || item.book_id === bookId || item.attached_book?.id === bookId) {
              return {
                ...item,
                delivery_type: deliveryType,
                pickup_campus: pickupCampus,
                shipping_address: shippingAddress,
              };
            }
            return item;
          });
        }
      }
    },
  },
});

// Export actions
export const {
  setCartData,
  updateCartFromResponse,
  removeCourseFromCart,
  removeCartItem,
  updateCartItemWishlistStatus,
  addBookToCart,
  addBundleToCart,
  updateFulfillment,
} = cartSlice.actions;

// Export reducer
export default cartSlice.reducer;

// Selectors
export const cartStateSelector = (state: RootState) => state.cart;

export const getCartData = createSelector(
  cartStateSelector,
  (state) => state.cartData
);

export const selectHasPhysicalCartItems = createSelector(
  getCartData,
  (cartData) => {
    if (!cartData?.courses) return false;
    return cartData.courses.some(
      (item) =>
        item.delivery_type === 'shipping' ||
        item.delivery_type === 'campus_pickup' ||
        item.attached_book?.format === 'physical' ||
        item.attached_book?.format === 'both'
    );
  }
);
