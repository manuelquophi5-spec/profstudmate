import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bookId, deliveryType, pickupCampus, shippingAddress } = body;

    if (!userId || !bookId || !deliveryType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fulfillment fields (userId, bookId, deliveryType)' },
        { status: 400 }
      );
    }

    const book = mockStore.books.find((b) => b.id === bookId);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    if (deliveryType === 'campus_pickup') {
      const validCampuses = ['Accra Main', 'Kumasi', 'Takoradi'];
      if (!pickupCampus || !validCampuses.includes(pickupCampus)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid or missing pickup campus. Allowed campuses: Accra Main, Kumasi, Takoradi'
          },
          { status: 422 }
        );
      }

      const collectionCode = `ICAG-COL-${Math.floor(100000 + Math.random() * 900000)}`;
      const order = {
        order_id: `ORD-PICKUP-${Date.now()}`,
        user_id: Number(userId),
        book_id: bookId,
        book_title: book.title,
        fulfillment_type: 'campus_pickup',
        pickup_campus: pickupCampus,
        collection_code: collectionCode,
        status: 'Ready for Collection',
        created_at: new Date().toISOString()
      };

      mockStore.fulfillmentOrders.set(order.order_id, order);

      return NextResponse.json({
        success: true,
        message: `Study manual ready for campus collection at ${pickupCampus}`,
        data: order
      });
    } else if (deliveryType === 'shipping') {
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
        return NextResponse.json(
          { success: false, error: 'Shipping requires street and city in Ghana' },
          { status: 422 }
        );
      }

      const trackingNumber = `GH-EXP-${Date.now()}`;
      const order = {
        order_id: `ORD-SHIP-${Date.now()}`,
        user_id: Number(userId),
        book_id: bookId,
        book_title: book.title,
        fulfillment_type: 'shipping',
        shipping_address: shippingAddress,
        courier: 'Ghana Post / Speedlink',
        tracking_number: trackingNumber,
        status: 'Dispatched',
        created_at: new Date().toISOString()
      };

      mockStore.fulfillmentOrders.set(order.order_id, order);

      return NextResponse.json({
        success: true,
        message: 'Physical manual delivery order dispatched',
        data: order
      });
    } else if (deliveryType === 'digital') {
      // Immediate digital grant
      mockStore.grantBook(Number(userId), bookId);
      return NextResponse.json({
        success: true,
        message: 'Digital study manual entitlement granted instantly',
        data: {
          user_id: Number(userId),
          book_id: bookId,
          fulfillment_type: 'digital',
          drm_reader_url: `/shop/reader/${bookId}`
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unknown deliveryType. Allowed: digital, campus_pickup, shipping' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
