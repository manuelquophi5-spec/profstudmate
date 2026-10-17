export interface AcademicPerformanceData {
  instructor_id?: number;
  center_type?: string;
  total_assigned_courses?: number;
  enrolled_students?: number;
  average_completion_rate?: number;
  icag_mock_pass_rate?: number;
  pending_assignments_to_grade?: number;
  active_classroom_discussions?: number;
  wallet_balance_ghs?: undefined;
  earnings_total_ghs?: undefined;
  payout_requests?: undefined;
}

export interface AcademicPerformanceResponse {
  success: boolean;
  data: AcademicPerformanceData;
  error?: string;
}

/**
 * Fetch academic performance metrics for an instructor from the Academic Performance Center API.
 * Guarantees strictly non-financial metrics (syllabus completion rate, ICAG mock pass rates,
 * enrolled students, pending assignments, and active classroom discussions).
 */
export const getInstructorPerformance = async (
  instructorId: number
): Promise<AcademicPerformanceResponse | null> => {
  try {
    const response = await fetch(`/api/instructor/performance?instructorId=${instructorId}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch academic performance: ${response.statusText}`);
      return null;
    }

    const data: AcademicPerformanceResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error in getInstructorPerformance:', error);
    return null;
  }
};
