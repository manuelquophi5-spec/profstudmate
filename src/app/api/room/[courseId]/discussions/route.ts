import { NextRequest, NextResponse } from 'next/server';
import { mockStore, ClassroomDiscussion } from '@/lib/mockApiStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const cid = parseInt(courseId, 10);
  const discussions = mockStore.discussions.filter((d) => d.course_id === cid);

  return NextResponse.json({ success: true, count: discussions.length, data: discussions });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const cid = parseInt(courseId, 10);

    const body = await request.json();
    const { userId, authorName, authorRole, content } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { success: false, error: 'userId and content are required' },
        { status: 400 }
      );
    }

    // Barrier check: user must have access to course
    const uid = Number(userId);
    const role = authorRole || 'student';
    const course = mockStore.courses.find((c) => c.id === cid);
    if (!course) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    if (role === 'student' && !mockStore.isEnrolled(uid, cid)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Cannot post in unenrolled course room' },
        { status: 403 }
      );
    }

    const newDiscussion: ClassroomDiscussion = {
      id: `d_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      course_id: cid,
      user_id: uid,
      author_name: authorName || 'Course Participant',
      author_role: role,
      content,
      created_at: new Date().toISOString()
    };

    mockStore.discussions.push(newDiscussion);

    return NextResponse.json({ success: true, data: newDiscussion }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
