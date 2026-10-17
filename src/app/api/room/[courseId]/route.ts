import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const cid = parseInt(courseId, 10);
  const course = mockStore.courses.find((c) => c.id === cid);

  if (!course) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }

  // Determine user identity and role from headers or search params
  const { searchParams } = new URL(request.url);
  const headerUserId = request.headers.get('x-user-id');
  const headerRole = request.headers.get('x-user-role');

  const userId = parseInt(headerUserId || searchParams.get('userId') || '0', 10);
  const role = (headerRole || searchParams.get('role') || 'student') as 'admin' | 'tutor' | 'student';

  // Feature 11: Strict Course Enrollment Isolation (403 Barrier)
  let isAuthorized = false;

  if (role === 'admin') {
    isAuthorized = true;
  } else if (role === 'tutor') {
    isAuthorized = course.assigned_tutor_id === userId;
  } else if (role === 'student') {
    isAuthorized = mockStore.isEnrolled(userId, cid);
  }

  if (!isAuthorized) {
    return NextResponse.json(
      {
        success: false,
        error: 'Access denied: You are not enrolled in this course.',
        course_id: cid,
        user_id: userId,
        role: role
      },
      { status: 403 }
    );
  }

  // Feature 9 & 10: Authorized Room Data & Zoom Join Link Security
  const courseDiscussions = mockStore.discussions.filter((d) => d.course_id === cid);
  const courseMaterials = mockStore.materials.filter((m) => m.course_id === cid);

  const roomData = {
    course_id: cid,
    course_title: course.title,
    level: course.level,
    assigned_tutor_id: course.assigned_tutor_id,
    live_lecture: {
      topic: 'Live Interactive Session: ICAG Examination Syllabus Review',
      scheduled_start: '2026-10-18T18:00:00Z',
      duration_minutes: 90,
      zoom_join_url: `https://icag-ghana.zoom.us/j/883920192?pwd=token_${cid}_${userId}`,
      passcode: 'ICAG2026'
    },
    discussions: courseDiscussions,
    study_materials: courseMaterials
  };

  return NextResponse.json({
    success: true,
    data: roomData
  });
}
