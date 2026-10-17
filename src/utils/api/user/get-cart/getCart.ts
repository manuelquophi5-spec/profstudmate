import axiosClient from "../../axiosClient";
import { getCartApiRoute } from "@/utils/apiRoutes";

// Promo code interface for cart items
export interface PromoCode {
  id: number;
  code: string;
  message: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

// Promo discount interface for the promo_discounts array
export interface PromoDiscount {
  course_id: number;
  course_title: string;
  promo_code: string;
  discount_amount: number;
  created_by?: string;
  creator_name?: string;
}

// Cart item interface based on the actual API response
export interface CartItem {
  id: number;
  title: string;
  slug: string;
  thumbnail: string;
  display_price: number;
  display_discount_price: number;
  original_price: number;
  promo_discount: number;
  final_price: number;
  promo_code: PromoCode | null; // Can be null if no promo code is applied
  tax_amount: number;
  total_tax_percentage: number;
  instructor: string;
  is_wishlisted: boolean;
  discountPrice?: number;
  average_rating: number;
  ratings: number;
  // new response fields
  course_discount: number;
  subtotal: number;

  // Milestone 2 Bookstore & Bundling additions
  type?: 'course' | 'book' | 'bundle';
  course_id?: number;
  book_id?: string;
  price_ghs?: number;
  is_bundle?: boolean;
  bundle_discount_ghs?: number;
  attached_book?: {
    id: string;
    title: string;
    price_ghs: number;
    format?: 'digital' | 'physical' | 'both';
    already_owned?: boolean;
  };
  delivery_type?: 'digital' | 'shipping' | 'campus_pickup';
  pickup_campus?: 'Accra Main' | 'Kumasi' | 'Takoradi';
  shipping_address?: {
    street: string;
    city: string;
    region?: string;
    phone?: string;
  };
  double_charge_prevented?: boolean;
  breakdown_notice?: string;
}

// Cart data interface for the response structure
export interface CartData {
  courses: CartItem[];
  total_display_price: number;
  promo_discount: number;
  discount: number;
  tax_amount: number;
  subtotal_price: number;
  discount_price: number;
  total_price: number;
  total_tax_amount?: number;
  final_total?: number;
  promo_discounts: PromoDiscount[]; // Array of promo discount objects
  // New fields
  original_price: number;
  course_discount: number;
  subtotal: number;
  taxable_amount: number;
  tax_percentage: number;
  total: number;

  // Milestone 2 Fulfillment summary
  fulfillment?: {
    delivery_type: 'digital' | 'shipping' | 'campus_pickup';
    pickup_campus?: 'Accra Main' | 'Kumasi' | 'Takoradi';
    shipping_address?: {
      street: string;
      city: string;
      region?: string;
      phone?: string;
    };
  };
}

// Cart API response interface matching the actual response format
export interface CartApiResponse {
  error: boolean;
  message: string;
  data: CartData;
  code: number;
}

/**
 * Fetch user cart items from the API
 * @returns Promise with cart API response or null
 */
export const getCartItems = async (
): Promise<CartApiResponse | null> => {
  try {
    // Send the GET request to the backend API
    const response = await axiosClient.get<CartApiResponse>(getCartApiRoute);

    // Always return the response data, even if error: true
    // This allows the component to handle API errors properly
    return response.data;
  } catch (error) {
    // Handle both HTTP errors (422, 500, etc.) and network errors
    const axiosError = error as { response?: { data?: CartApiResponse } };
    console.log("Error in getCartItems:", axiosError?.response?.data);

    // If it's an HTTP error with response data, return the API error response
    if (axiosError?.response?.data) {
      return axiosError.response.data;
    }

    // If it's a network error (no response), return null
    return null;
  }
};
