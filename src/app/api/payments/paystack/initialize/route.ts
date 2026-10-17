import { NextRequest, NextResponse } from 'next/server';
import { mockStore, PaystackTransaction } from '@/lib/mockApiStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount_ghs, currency, cartItems, billingDetails, paymentChannel } = body;

    if (!email || amount_ghs === undefined) {
      return NextResponse.json(
        { success: false, error: 'Email and amount_ghs are required' },
        { status: 400 }
      );
    }

    // Feature 13: Universal Ghanaian Cedi (GHS) enforcement
    if (currency && currency !== 'GHS') {
      return NextResponse.json(
        {
          success: false,
          error: `Currency ${currency} is not supported. All transactions must be processed in Ghanaian Cedis (GHS).`
        },
        { status: 422 }
      );
    }

    // Boundary check: Amount must be positive
    if (amount_ghs <= 0) {
      return NextResponse.json(
        { success: false, error: 'Payment amount must be greater than 0 GHS' },
        { status: 422 }
      );
    }

    // Paystack requires amount in pesewas (1 GHS = 100 pesewas)
    const amountInPesewas = Math.round(amount_ghs * 100);
    const reference = `pstk_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const transaction: PaystackTransaction = {
      reference,
      user_id: billingDetails?.userId || 0,
      email,
      amount_in_pesewas: amountInPesewas,
      currency: 'GHS',
      status: 'pending',
      cart_items: cartItems || [],
      billing_details: {
        student_name: billingDetails?.studentName || 'Student',
        icag_id: billingDetails?.icagId || 'ICAG/STU/PENDING',
        phone: billingDetails?.phone || '',
        address: billingDetails?.address || 'Ghana'
      }
    };

    mockStore.transactions.set(reference, transaction);

    // Channels supported: card, mobile_money (MTN MoMo, Telecel Cash, AT Money)
    const channels = ['card', 'mobile_money'];

    return NextResponse.json({
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: `https://checkout.paystack.com/${reference}`,
        access_code: `acc_${reference}`,
        reference,
        amount_in_pesewas: amountInPesewas,
        currency: 'GHS',
        channels,
        preferred_channel: paymentChannel || 'mobile_money'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
