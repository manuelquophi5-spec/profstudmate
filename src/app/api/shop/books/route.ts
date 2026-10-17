import { NextRequest, NextResponse } from 'next/server';
import { mockStore, Book } from '@/lib/mockApiStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const format = searchParams.get('format');
  const search = searchParams.get('search');

  let filtered = [...mockStore.books];

  if (level) {
    filtered = filtered.filter((b) => b.level.toLowerCase() === level.toLowerCase());
  }

  if (format) {
    filtered = filtered.filter((b) => b.format === format || b.format === 'both');
  }

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.slug.toLowerCase().includes(term) ||
        (b.isbn && b.isbn.includes(term))
    );
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    currency: 'GHS',
    data: filtered
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, level, format, price_ghs, isbn, cover_image, is_available, stock_quantity } = body;

    if (!title || !level || !format || price_ghs === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required book fields (title, level, format, price_ghs)' },
        { status: 400 }
      );
    }

    if (price_ghs < 0) {
      return NextResponse.json(
        { success: false, error: 'Book price in GHS cannot be negative' },
        { status: 422 }
      );
    }

    const newBook: Book = {
      id: `b${Date.now()}`,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      level,
      format,
      price_ghs,
      isbn,
      cover_image: cover_image || '/images/books/default.jpg',
      is_available: is_available !== undefined ? is_available : true,
      stock_quantity: stock_quantity !== undefined ? stock_quantity : 50
    };

    mockStore.books.push(newBook);

    return NextResponse.json({ success: true, data: newBook }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
