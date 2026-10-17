import { Book, BundleEvaluationResponse, DrmSessionResponse, FulfillmentOrder, DeliveryType, CampusLocation, ShippingAddress } from '@/types/bookstore';

export async function fetchBooks(params?: {
  level?: string;
  format?: string;
  search?: string;
}): Promise<{ success: boolean; data: Book[]; currency: string; total: number }> {
  const query = new URLSearchParams();
  if (params?.level && params.level !== 'All') {
    query.set('level', params.level);
  }
  if (params?.format && params.format !== 'all') {
    query.set('format', params.format);
  }
  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }

  const queryString = query.toString();
  const url = `/api/shop/books${queryString ? `?${queryString}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch books: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBookById(id: string): Promise<{ success: boolean; data: Book }> {
  const res = await fetch(`/api/shop/books/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch book: ${res.statusText}`);
  }
  return res.json();
}

export async function evaluateBundle(payload: {
  userId?: number;
  courseId: number | string;
  bookId?: string;
  isBundleSelected: boolean;
}): Promise<BundleEvaluationResponse> {
  const res = await fetch('/api/shop/bundles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function submitFulfillment(payload: {
  userId: number;
  bookId: string;
  deliveryType: DeliveryType;
  pickupCampus?: CampusLocation;
  shippingAddress?: ShippingAddress;
}): Promise<{ success: boolean; message: string; data: FulfillmentOrder }> {
  const res = await fetch('/api/shop/fulfillment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function requestDrmSession(payload: {
  userId: number;
  bookId: string;
}): Promise<DrmSessionResponse> {
  const res = await fetch('/api/shop/drm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
