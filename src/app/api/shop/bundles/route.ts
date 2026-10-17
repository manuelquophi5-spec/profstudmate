import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, courseId, bookId, isBundleSelected } = body;

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'courseId is required' }, { status: 400 });
    }

    const course = mockStore.courses.find((c) => c.id === Number(courseId));
    if (!course) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    const coursePrice = course.discount_price ?? course.price;
    const isEnrolled = userId ? mockStore.isEnrolled(Number(userId), course.id) : false;

    // Default response: Course Only
    if (!isBundleSelected || !bookId) {
      return NextResponse.json({
        success: true,
        currency: 'GHS',
        mode: 'course_only',
        course: {
          id: course.id,
          title: course.title,
          price_ghs: coursePrice,
          already_enrolled: isEnrolled
        },
        book: null,
        subtotal_ghs: coursePrice,
        bundle_discount_ghs: 0,
        total_ghs: isEnrolled ? 0 : coursePrice,
        double_charge_prevented: isEnrolled
      });
    }

    // Course + Companion Book Bundle
    const book = mockStore.books.find((b) => b.id === bookId);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Companion book not found' }, { status: 404 });
    }

    const bookPrice = book.price_ghs;
    const ownsBook = userId ? mockStore.ownsBook(Number(userId), book.id) : false;

    // Bundle discount applies if both are selected
    const standardBundleDiscount = 50; // GHS 50 institutional bundle discount
    let effectiveCourseCharge = isEnrolled ? 0 : coursePrice;
    let effectiveBookCharge = ownsBook ? 0 : bookPrice;
    let effectiveBundleDiscount = (!isEnrolled && !ownsBook) ? standardBundleDiscount : 0;

    let totalGhs = effectiveCourseCharge + effectiveBookCharge - effectiveBundleDiscount;
    if (totalGhs < 0) totalGhs = 0;

    const doubleChargePrevented = isEnrolled || ownsBook;

    return NextResponse.json({
      success: true,
      currency: 'GHS',
      mode: 'bundle',
      course: {
        id: course.id,
        title: course.title,
        price_ghs: coursePrice,
        already_enrolled: isEnrolled,
        effective_charge_ghs: effectiveCourseCharge
      },
      book: {
        id: book.id,
        title: book.title,
        price_ghs: bookPrice,
        already_owned: ownsBook,
        effective_charge_ghs: effectiveBookCharge
      },
      subtotal_ghs: coursePrice + bookPrice,
      bundle_discount_ghs: effectiveBundleDiscount,
      total_ghs: totalGhs,
      double_charge_prevented: doubleChargePrevented,
      breakdown_notice: doubleChargePrevented
        ? 'Duplicate fee prevented: Student already possesses part of this bundle.'
        : 'Prescribed textbook bundled with official ICAG course discount applied.'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
