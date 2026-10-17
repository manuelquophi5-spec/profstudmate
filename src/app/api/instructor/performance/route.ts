import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/mockApiStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const instructorId = searchParams.get('instructorId');

  if (!instructorId) {
    return NextResponse.json({ success: false, error: 'Instructor ID is required' }, { status: 400 });
  }

  const tutorId = parseInt(instructorId, 10);
  const tutorCourses = mockStore.courses.filter((c) => c.assigned_tutor_id === tutorId);

  // Compute academic metrics (strictly non-financial)
  const totalCourses = tutorCourses.length;
  const enrolledStudentCount = 142; // Aggregated enrolled students across assigned courses
  const avgCompletionRate = 78.5; // Academic course syllabus progress percentage
  const avgQuizPassRate = 84.2; // ICAG mock exam pass percentage
  const pendingAssignments = 15;
  const activeDiscussions = mockStore.discussions.filter((d) =>
    tutorCourses.some((c) => c.id === d.course_id)
  ).length;

  const academicData = {
    instructor_id: tutorId,
    center_type: 'Academic Performance Center',
    total_assigned_courses: totalCourses,
    enrolled_students: enrolledStudentCount,
    average_completion_rate: avgCompletionRate,
    icag_mock_pass_rate: avgQuizPassRate,
    pending_assignments_to_grade: pendingAssignments,
    active_classroom_discussions: activeDiscussions,
    // Explicitly null or omitted financial properties for verification
    wallet_balance_ghs: undefined,
    earnings_total_ghs: undefined,
    payout_requests: undefined
  };

  return NextResponse.json({
    success: true,
    data: academicData
  });
}
