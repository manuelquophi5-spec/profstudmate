import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const book = mockStore.books.find((b) => b.id === id || b.slug === id);

  if (!book) {
    return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, currency: 'GHS', data: book });
}
