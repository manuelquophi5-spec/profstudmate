import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference } = await context.params;
  const invoice = mockStore.invoices.get(reference);

  if (!invoice) {
    return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...invoice,
      institution: {
        name: 'Institute of Chartered Accountants (Ghana)',
        short_name: 'ICAG / ICAT',
        address: 'Okponglo, East Legon, Accra, Ghana',
        tin: 'C0001234567'
      },
      currency_symbol: 'GH₵',
      download_pdf_url: `/api/invoices/${reference}/pdf`
    }
  });
}
