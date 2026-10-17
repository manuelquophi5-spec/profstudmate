import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const courseId = parseInt(id, 10);
  const course = mockStore.courses.find((c) => c.id === courseId);

  if (!course) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: course });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const courseId = parseInt(id, 10);
    const courseIndex = mockStore.courses.findIndex((c) => c.id === courseId);

    if (courseIndex === -1) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    const body = await request.json();
    const { price, discount_price, status, assigned_tutor_id } = body;

    // Boundary validation: Negative price or discount
    if (price !== undefined && price < 0) {
      return NextResponse.json(
        { success: false, error: 'Course price in GHS cannot be negative' },
        { status: 422 }
      );
    }

    if (discount_price !== undefined && discount_price < 0) {
      return NextResponse.json(
        { success: false, error: 'Discount price in GHS cannot be negative' },
        { status: 422 }
      );
    }

    if (price !== undefined && discount_price !== undefined && discount_price > price) {
      return NextResponse.json(
        { success: false, error: 'Discount price cannot exceed regular course price' },
        { status: 422 }
      );
    }

    // Apply administrator updates
    const course = mockStore.courses[courseIndex];
    if (price !== undefined) course.price = price;
    if (discount_price !== undefined) course.discount_price = discount_price;
    if (status !== undefined) course.status = status;
    if (assigned_tutor_id !== undefined) course.assigned_tutor_id = assigned_tutor_id;

    return NextResponse.json({
      success: true,
      message: 'Course institutional review and pricing updated successfully',
      data: course
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
