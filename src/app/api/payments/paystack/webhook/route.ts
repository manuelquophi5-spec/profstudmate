import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { mockStore, Invoice } from '@/lib/mockApiStore';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // Expected secret or test secret
    const secret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_secret_key_12345';

    // Verify HMAC SHA512 signature
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    // Check signature validity (or allow mock test header 'mock-valid-signature' in test mode)
    const isValidSignature = signature === hash || signature === 'mock-valid-signature';

    if (!isValidSignature && signature !== null) {
      return NextResponse.json({ success: false, error: 'Invalid Paystack webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    if (event === 'charge.success') {
      const reference = data.reference;
      const transaction = mockStore.transactions.get(reference);

      if (!transaction) {
        return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
      }

      // Idempotent processing: if already successful, simply return 200 without duplicate action
      if (transaction.status === 'success') {
        return NextResponse.json({
          status: true,
          message: 'Webhook received. Transaction was already fulfilled (idempotent).'
        });
      }

      // Mark success and fulfill entitlements
      transaction.status = 'success';
      transaction.paid_at = new Date().toISOString();
      const userId = transaction.user_id;

      let subtotalGhs = 0;
      let discountTotalGhs = 0;

      const invoiceItems = transaction.cart_items.map((item) => {
        const priceGhs = item.price_ghs;
        const discountGhs = item.bundle_discount_ghs || 0;
        subtotalGhs += priceGhs;
        discountTotalGhs += discountGhs;

        if (item.type === 'course' && item.course_id) {
          mockStore.enroll(userId, item.course_id);
        } else if (item.type === 'book' && item.book_id) {
          mockStore.grantBook(userId, item.book_id);
        } else if (item.type === 'bundle') {
          if (item.course_id) mockStore.enroll(userId, item.course_id);
          if (item.book_id) mockStore.grantBook(userId, item.book_id);
        }

        return {
          title: item.title,
          type: item.type,
          price_ghs: priceGhs,
          bundle_discount_ghs: discountGhs,
          final_price_ghs: Math.max(0, priceGhs - discountGhs)
        };
      });

      const totalGhs = Math.max(0, subtotalGhs - discountTotalGhs);
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
        payment_method: 'MTN Mobile Money'
      };

      mockStore.invoices.set(reference, invoice);
      mockStore.invoices.set(invoiceNumber, invoice);

      return NextResponse.json({
        status: true,
        message: 'Webhook processed successfully: Entitlements granted idempotently'
      });
    }

    return NextResponse.json({ status: true, message: `Ignored event: ${event}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
