import { NextRequest, NextResponse } from 'next/server';
import { mockStore, Invoice } from '@/lib/mockApiStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, payment_method } = body;

    if (!reference) {
      return NextResponse.json({ success: false, error: 'Payment reference is required' }, { status: 400 });
    }

    const transaction = mockStore.transactions.get(reference);
    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found for the provided reference' },
        { status: 404 }
      );
    }

    // Idempotency: If already verified, return existing confirmation
    if (transaction.status === 'success') {
      const existingInvoice = mockStore.invoices.get(reference);
      return NextResponse.json({
        success: true,
        already_verified: true,
        message: 'Payment already verified and fulfilled',
        transaction,
        invoice: existingInvoice
      });
    }

    // Update status to success
    transaction.status = 'success';
    transaction.paid_at = new Date().toISOString();

    const userId = transaction.user_id;

    // Feature 16: Automatic Entitlement Fulfillment
    const fulfilledEntitlements: { type: string; id: any; title: string }[] = [];

    let subtotalGhs = 0;
    let discountTotalGhs = 0;

    const invoiceItems = transaction.cart_items.map((item) => {
      const priceGhs = item.price_ghs;
      const discountGhs = item.bundle_discount_ghs || 0;
      const finalPriceGhs = Math.max(0, priceGhs - discountGhs);

      subtotalGhs += priceGhs;
      discountTotalGhs += discountGhs;

      // Fulfill based on item type
      if (item.type === 'course' && item.course_id) {
        mockStore.enroll(userId, item.course_id);
        fulfilledEntitlements.push({ type: 'course', id: item.course_id, title: item.title });
      } else if (item.type === 'book' && item.book_id) {
        mockStore.grantBook(userId, item.book_id);
        fulfilledEntitlements.push({ type: 'book', id: item.book_id, title: item.title });
      } else if (item.type === 'bundle') {
        if (item.course_id) {
          mockStore.enroll(userId, item.course_id);
          fulfilledEntitlements.push({ type: 'course', id: item.course_id, title: `${item.title} (Course)` });
        }
        if (item.book_id) {
          mockStore.grantBook(userId, item.book_id);
          fulfilledEntitlements.push({ type: 'book', id: item.book_id, title: `${item.title} (Textbook)` });
        }
      }

      return {
        title: item.title,
        type: item.type,
        price_ghs: priceGhs,
        bundle_discount_ghs: discountGhs,
        final_price_ghs: finalPriceGhs
      };
    });

    const totalGhs = Math.max(0, subtotalGhs - discountTotalGhs);

    // Feature 15: Create Digital Invoice Record
    const invoiceNumber = `INV-ICAG-${Date.now()}`;
    const invoice: Invoice = {
      invoice_number: invoiceNumber,
      reference,
      user_id: userId,
      student_name: transaction.billing_details.student_name,
      icag_id: transaction.billing_details.icag_id || 'ICAG/STU/10042',
      currency: 'GHS',
      items: invoiceItems,
      subtotal_ghs: subtotalGhs,
      discount_total_ghs: discountTotalGhs,
      total_ghs: totalGhs,
      issued_at: new Date().toISOString(),
      payment_method: payment_method || 'MTN Mobile Money'
    };

    mockStore.invoices.set(reference, invoice);
    mockStore.invoices.set(invoiceNumber, invoice);

    return NextResponse.json({
      success: true,
      message: 'Paystack payment successfully verified. Academic entitlements granted immediately.',
      transaction,
      fulfilled_entitlements: fulfilledEntitlements,
      invoice: {
        invoice_number: invoice.invoice_number,
        download_url: `/api/invoices/${reference}`,
        currency: 'GHS',
        total_ghs: totalGhs
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
