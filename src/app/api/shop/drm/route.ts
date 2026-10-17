import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bookId } = body;

    if (!userId || !bookId) {
      return NextResponse.json(
        { success: false, error: 'userId and bookId are required for DRM session' },
        { status: 400 }
      );
    }

    const uid = Number(userId);
    const book = mockStore.books.find((b) => b.id === bookId);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
    }

    // Verify student entitlement
    const hasEntitlement = mockStore.ownsBook(uid, bookId);
    if (!hasEntitlement) {
      return NextResponse.json(
        {
          success: false,
          error: 'DRM Access Denied: User has not purchased this digital study manual.'
        },
        { status: 403 }
      );
    }

    // Generate secure DRM session token
    const drmSessionToken = `drm_${uid}_${bookId}_${Date.now()}`;
    const expiresAt = Date.now() + 3600 * 1000; // 1 hour token
    mockStore.drmSessions.set(drmSessionToken, { userId: uid, bookId, expiresAt });

    return NextResponse.json({
      success: true,
      drm_session_token: drmSessionToken,
      expires_at: new Date(expiresAt).toISOString(),
      stream_endpoint: `/api/shop/drm/stream?token=${drmSessionToken}`,
      watermark: `Licensed to ICAG Student ID: ${uid}`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
