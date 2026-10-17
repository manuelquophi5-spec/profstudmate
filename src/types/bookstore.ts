import { Book, BookRef } from '@/lib/mockApiStore';

export type { Book, BookRef };

export type BookLevel = 'All' | 'Level 1' | 'Level 2' | 'Level 3';
export type BookFormatFilter = 'all' | 'digital' | 'physical';
export type DeliveryType = 'digital' | 'shipping' | 'campus_pickup';
export type CampusLocation = 'Accra Main' | 'Kumasi' | 'Takoradi';

export interface ShippingAddress {
  street: string;
  city: string;
  region?: string;
  phone?: string;
}

export interface FulfillmentOrder {
  order_id: string;
  user_id: number;
  book_id: string;
  book_title: string;
  fulfillment_type: DeliveryType;
  pickup_campus?: CampusLocation;
  collection_code?: string;
  shipping_address?: ShippingAddress;
  courier?: string;
  tracking_number?: string;
  status: string;
  created_at: string;
}

export interface DrmSessionResponse {
  success: boolean;
  drm_session_token?: string;
  expires_at?: string;
  stream_endpoint?: string;
  watermark?: string;
  error?: string;
}

export interface BundleEvaluationResponse {
  success: boolean;
  currency: 'GHS';
  mode: 'course_only' | 'bundle';
  course: {
    id: number;
    title: string;
    price_ghs: number;
    already_enrolled?: boolean;
    effective_charge_ghs?: number;
  };
  book: {
    id: string;
    title: string;
    price_ghs: number;
    already_owned?: boolean;
    effective_charge_ghs?: number;
  } | null;
  subtotal_ghs: number;
  bundle_discount_ghs: number;
  total_ghs: number;
  double_charge_prevented?: boolean;
  breakdown_notice?: string;
  error?: string;
}
