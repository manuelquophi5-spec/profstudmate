import { NextRequest, NextResponse } from 'next/server';
import { mockStore, Course } from '@/lib/mockApiStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const status = searchParams.get('status');

  let results = [...mockStore.courses];

  if (level) {
    results = results.filter((c) => c.level === level);
  }
  if (status) {
    results = results.filter((c) => c.status === status);
  }

  return NextResponse.json({ success: true, count: results.length, data: results });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, level, syllabus, lectures_count, assigned_tutor_id, price, discount_price } = body;

    if (!title || !level || !assigned_tutor_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required course fields (title, level, assigned_tutor_id)' },
        { status: 400 }
      );
    }

    // Feature 1: Tutors are stripped of price and discount authoring.
    // If a tutor attempts to submit price or discount, reject or strip.
    if (price !== undefined || discount_price !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tutors cannot set or modify course price or discount. Pricing is reserved for Institutional Administrators.'
        },
        { status: 403 }
      );
    }

    // Feature 2: Tutor Academic Draft Submission (status: 'pending')
    const newCourse: Course = {
      id: Date.now(),
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      price: 0, // Unset until administrator sets official price
      status: 'pending',
      assigned_tutor_id,
      level,
      syllabus: Array.isArray(syllabus) ? syllabus : [],
      lectures_count: lectures_count || 0
    };

    mockStore.courses.push(newCourse);

    return NextResponse.json(
      {
        success: true,
        message: 'Academic curriculum draft submitted successfully for institutional review.',
        data: newCourse
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
