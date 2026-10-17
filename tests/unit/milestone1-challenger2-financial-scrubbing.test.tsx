import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';

// Mock Next.js navigation hooks for happy-dom unit testing
vi.mock('next/navigation', () => ({
  usePathname: () => '/instructor/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Firebase auth for happy-dom unit testing
vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

import { mockStore } from '@/lib/mockApiStore';
import { GET as getInstructorPerformanceApi } from '@/app/api/instructor/performance/route';
import { createRequest, parseResponse } from '../helpers/testClient';

import StatsOverview, { AcademicPerformanceData } from '@/components/instructor/dashboard/StatsOverview';
import AcademicEngagementCard from '@/components/instructor/dashboard/AcademicEngagementCard';
import AcademicPerformanceChart, { AcademicChartData } from '@/components/instructor/dashboard/AcademicPerformanceChart';
import CourseStatistics from '@/components/instructor/courses/CourseStatistics';
import InstructorSidebar from '@/components/instructor/InstructorSidebar';
import ProfileDropdown from '@/components/dropdowns/ProfileDropdown';
import { SidebarProvider } from '@/components/ui/sidebar';

import userReducer from '@/redux/reducers/userSlice';
import settingsReducer from '@/redux/reducers/settingsSlice';
import languageReducer from '@/redux/reducers/languageSlice';
import invitorsReducer from '@/redux/reducers/invitorsSlice';
import helpersReducer from '@/redux/reducers/helpersReducer';

// Standard English translation dictionary for academic center testing
const academicTranslations: Record<string, string> = {
  academic_performance_center: 'Academic Performance Center',
  dashboard: 'Dashboard',
  my_course: 'My Course',
  assignments: 'Assignments',
  reviews: 'Reviews',
  student_quiz_reports: 'Student Quiz Reports',
  assigned_courses: 'Assigned Courses',
  active_learners: 'Active Learners',
  average_completion_rate: 'Completion Rate',
  icag_mock_pass_rate: 'ICAG Mock Pass Rate',
  pending_assignments: 'Pending Submissions',
  academic_performance_trends: 'Academic Progress & Exam Readiness',
  completion_rate: 'Completion Rate (%)',
  assignment_submissions: 'Submissions',
  cohort_engagement: 'Cohort Engagement',
  active_discussions: 'Classroom Threads',
  pending_submissions: 'Pending Submissions',
  mock_pass_rate: 'Mock Exam Pass Rate',
  course_details: 'Course Details',
  course_number: 'Course Number',
  publish_date: 'Publish Date',
  instructor: 'Instructor',
  level: 'Level',
  course_duration: 'Course Duration',
  course_taught: 'Course Taught',
  course_access: 'Course Access',
  course_certificate: 'Course Certificate',
  course_analytics: 'Course Academic Analytics',
  total_enrolled_users: 'Enrolled Scholars',
  total_reviews_received: 'Student Feedback',
  switch_to_student: 'Switch to Student',
  edit_profile: 'Edit Profile',
  activities: 'Activities',
  profile: 'Profile',
  log_out: 'Log Out',
};

// Helper to create a configured test store for React Redux Provider
function createTestStore(userOverrides = {}) {
  const rootReducer = combineReducers({
    user: userReducer,
    settings: settingsReducer,
    language: languageReducer,
    invitors: invitorsReducer,
    helpers: helpersReducer,
  });

  return configureStore({
    reducer: rootReducer,
    preloadedState: {
      user: {
        userData: {
          id: 1,
          name: 'Dr. Kwesi Appiah, CA',
          email: 'kwesi.appiah@icag.edu.gh',
          profile: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
          is_instructor: true,
          instructor_process_status: 'approved',
          instructor_details: {
            id: 1,
            type: 'individual',
            personal_details: {
              first_name: 'Kwesi',
              last_name: 'Appiah',
            },
          },
          ...userOverrides,
        },
      } as any,
      settings: {
        data: {
          horizontal_logo: '/logo.png',
          instructor_mode: 'multi',
        },
      } as any,
      language: {
        currentLanguage: 'en',
        currentTranslations: academicTranslations,
        isRTL: false,
      } as any,
      invitors: {
        data: [],
      } as any,
    },
  });
}

// Client mount helper for components with useEffect / isClient guards
function renderClient(ui: React.ReactElement, store = createTestStore()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Provider store={store}>{ui}</Provider>);
  });
  return {
    container,
    html: container.innerHTML,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('Challenger 2: Financial Scrubbing & Academic Center Empirical Stress Suite', () => {
  beforeEach(() => {
    mockStore.reset();
    document.body.innerHTML = '';
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. API Verification: /api/instructor/performance
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. API Endpoint Stress Test: /api/instructor/performance', () => {
    it('returns clean academic indicators and status 200 for valid instructor', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformanceApi(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.center_type).toBe('Academic Performance Center');
      expect(data.data.instructor_id).toBe(1);
      expect(typeof data.data.total_assigned_courses).toBe('number');
      expect(typeof data.data.enrolled_students).toBe('number');
      expect(typeof data.data.average_completion_rate).toBe('number');
      expect(typeof data.data.icag_mock_pass_rate).toBe('number');
      expect(typeof data.data.pending_assignments_to_grade).toBe('number');
      expect(typeof data.data.active_classroom_discussions).toBe('number');
    });

    it('dynamically adapts total_assigned_courses and active discussions to mockStore changes', async () => {
      // Initially, tutor 1 has 1 course in mockStore
      const initialReq = createRequest('/api/instructor/performance?instructorId=1');
      const initialRes = await getInstructorPerformanceApi(initialReq);
      const { data: initialData } = await parseResponse(initialRes);
      const initialCourses = initialData.data.total_assigned_courses;

      // Add 2 new courses assigned to tutor 1
      mockStore.courses.push(
        {
          id: 991,
          title: 'ICAG Public Sector Accounting',
          slug: 'icag-public-sector-accounting',
          price: 600,
          status: 'published',
          assigned_tutor_id: 1,
          level: 'Level 2',
        },
        {
          id: 992,
          title: 'ICAG Advanced Taxation',
          slug: 'icag-advanced-taxation',
          price: 750,
          status: 'published',
          assigned_tutor_id: 1,
          level: 'Level 3',
        }
      );

      // Add discussions for course 991
      mockStore.discussions.push(
        {
          id: 'disc-991-1',
          course_id: 991,
          user_id: 10,
          author_name: 'Student Kojo',
          author_role: 'student',
          content: 'Question on IPSAS 24',
          created_at: new Date().toISOString(),
        },
        {
          id: 'disc-991-2',
          course_id: 991,
          user_id: 11,
          author_name: 'Student Ama',
          author_role: 'student',
          content: 'Clarification on Cash Flow Statement',
          created_at: new Date().toISOString(),
        }
      );

      const updatedReq = createRequest('/api/instructor/performance?instructorId=1');
      const updatedRes = await getInstructorPerformanceApi(updatedReq);
      const { data: updatedData } = await parseResponse(updatedRes);

      expect(updatedData.data.total_assigned_courses).toBe(initialCourses + 2);
      expect(updatedData.data.active_classroom_discussions).toBeGreaterThanOrEqual(2);
    });

    it('adversarial injection: explicitly requesting earnings/wallet in query does not leak financial keys', async () => {
      const maliciousUrl =
        '/api/instructor/performance?instructorId=1&wallet_balance=5000&total_earnings=10000&payout=true&revenue=80000&commission=20';
      const req = createRequest(maliciousUrl);
      const res = await getInstructorPerformanceApi(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);

      // Verify serialized JSON does not contain any financial keys
      const jsonString = JSON.stringify(data.data);
      expect(jsonString).not.toContain('wallet_balance_ghs');
      expect(jsonString).not.toContain('earnings_total_ghs');
      expect(jsonString).not.toContain('payout_requests');
      expect(jsonString).not.toContain('5000');
      expect(jsonString).not.toContain('80000');

      // Verify that Object.keys of the returned payload contains strictly academic keys
      const returnedKeys = Object.keys(data.data);
      const forbiddenKeys = [
        'wallet_balance_ghs',
        'earnings_total_ghs',
        'payout_requests',
        'wallet',
        'earnings',
        'payout',
        'revenue',
        'commission',
      ];
      forbiddenKeys.forEach((key) => {
        expect(returnedKeys).not.toContain(key);
      });
    });

    it('returns status 400 when instructorId parameter is missing', async () => {
      const req = createRequest('/api/instructor/performance');
      const res = await getInstructorPerformanceApi(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Instructor ID is required');
    });

    it('handles non-existent instructorId gracefully with 0 assigned courses', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=999999');
      const res = await getInstructorPerformanceApi(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.data.instructor_id).toBe(999999);
      expect(data.data.total_assigned_courses).toBe(0);
      expect(data.data.active_classroom_discussions).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Component Scrutiny: InstructorSidebar.tsx
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Component Scrutiny: InstructorSidebar.tsx', () => {
    it('verifies that no earnings, wallet, or payout links are rendered in InstructorSidebar', () => {
      const { html, cleanup } = renderClient(
        <SidebarProvider>
          <InstructorSidebar />
        </SidebarProvider>
      );

      // Assert complete absence of financial navigation targets
      expect(html).not.toContain('/instructor/earnings');
      expect(html).not.toContain('/instructor/payout');
      expect(html).not.toContain('/instructor/refund-requests');
      expect(html).not.toContain('wallet');
      expect(html).not.toContain('revenue');

      // Assert presence of academic center link and title
      expect(html).toContain('/instructor/dashboard');
      expect(html).toContain('Academic Performance Center');
      expect(html).toContain('/instructor/my-course');
      expect(html).toContain('/instructor/assignments');
      expect(html).toContain('/instructor/student-quiz-reports');

      // Assert faculty lead designation
      expect(html).toContain('Faculty Lead');

      cleanup();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Component Scrutiny: ProfileDropdown.tsx
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Component Scrutiny: ProfileDropdown.tsx', () => {
    it('verifies instructor profile dropdown contains no /instructor/earnings link', () => {
      const { html, cleanup } = renderClient(<ProfileDropdown isInstructor={true} />);

      expect(html).not.toContain('/instructor/earnings');
      expect(html).not.toContain('instructor/earnings');
      expect(html).not.toContain('payout');
      expect(html).not.toContain('withdrawal');

      cleanup();
    });

    it('verifies student profile dropdown switches cleanly to instructor dashboard without earnings links', () => {
      const { html, cleanup } = renderClient(<ProfileDropdown isInstructor={false} />);

      expect(html).not.toContain('/instructor/earnings');
      expect(html).not.toContain('instructor/earnings');

      cleanup();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Component Scrutiny: StatsOverview.tsx
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Component Scrutiny: StatsOverview.tsx', () => {
    it('renders 5 clean academic indicators with accurate formatting', () => {
      const performanceData: AcademicPerformanceData = {
        instructor_id: 1,
        center_type: 'Academic Performance Center Overview',
        total_assigned_courses: 5,
        enrolled_students: 210,
        average_completion_rate: 82.4,
        icag_mock_pass_rate: 89.1,
        pending_assignments_to_grade: 12,
        active_classroom_discussions: 6,
      };

      const { html, cleanup } = renderClient(<StatsOverview performanceData={performanceData} />);

      // Verify academic metrics are displayed
      expect(html).toContain('Assigned Courses');
      expect(html).toContain('5');
      expect(html).toContain('Active Learners');
      expect(html).toContain('210');
      expect(html).toContain('Completion Rate');
      expect(html).toContain('82.4%');
      expect(html).toContain('ICAG Mock Pass Rate');
      expect(html).toContain('89.1%');
      expect(html).toContain('Pending Submissions');
      expect(html).toContain('12');

      // Verify non-academic / commercial strings are absent
      expect(html).not.toContain('Total Earnings');
      expect(html).not.toContain('Courses Sold');
      expect(html).not.toContain('Wallet Balance');

      cleanup();
    });

    it('adversarial injection: legacy commercial properties in data prop are completely ignored', () => {
      const legacyData: any = {
        total_courses: { value: 3 },
        courses_sold: { value: 888777 },
        total_earnings: { value: 54000 },
        wallet_balance: { value: 12500 },
      };

      const performanceData: AcademicPerformanceData = {
        instructor_id: 1,
        total_assigned_courses: 3,
        enrolled_students: 45,
        average_completion_rate: 75.0,
        icag_mock_pass_rate: 80.0,
        pending_assignments_to_grade: 4,
      };

      const { html, cleanup } = renderClient(
        <StatsOverview data={legacyData} performanceData={performanceData} />
      );

      expect(html).not.toContain('54000');
      expect(html).not.toContain('12500');
      expect(html).not.toContain('888777');
      expect(html).not.toContain('Total Earnings');
      expect(html).not.toContain('Courses Sold');

      cleanup();
    });

    it('robust fallbacks: handles null/undefined performanceData and data gracefully', () => {
      const { html, cleanup } = renderClient(
        <StatsOverview performanceData={null} data={undefined} />
      );

      expect(html).toContain('Academic Performance Center Overview');
      expect(html).toContain('78.5%'); // Default fallback completion rate
      expect(html).toContain('84.2%'); // Default fallback mock pass rate
      expect(html).toContain('15'); // Default fallback pending assignments
      expect(html).not.toContain('NaN');

      cleanup();
    });

    it('boundary rates: formats 0% and 100% cleanly without decimal drift', () => {
      const zeroData: AcademicPerformanceData = {
        total_assigned_courses: 0,
        enrolled_students: 0,
        average_completion_rate: 0,
        icag_mock_pass_rate: 0,
        pending_assignments_to_grade: 0,
      };

      const { html: htmlZero, cleanup: cleanupZero } = renderClient(
        <StatsOverview performanceData={zeroData} />
      );
      expect(htmlZero).toContain('0.0%');
      cleanupZero();

      const perfectData: AcademicPerformanceData = {
        total_assigned_courses: 10,
        enrolled_students: 500,
        average_completion_rate: 100,
        icag_mock_pass_rate: 100,
        pending_assignments_to_grade: 0,
      };

      const { html: htmlPerfect, cleanup: cleanupPerfect } = renderClient(
        <StatsOverview performanceData={perfectData} />
      );
      expect(htmlPerfect).toContain('100.0%');
      cleanupPerfect();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Component Scrutiny: CourseStatistics.tsx
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Component Scrutiny: CourseStatistics.tsx', () => {
    it('verifies CourseStatistics strips course prices, total earnings, and sales counts', () => {
      const mockCourseDetail: any = {
        course_details: {
          id: 101,
          title: 'Financial Accounting & Reporting (ICAG Level 2)',
          slug: 'financial-accounting-reporting-icag-level-2',
          price: 850,
          discount_price: 750,
          short_description: 'Official ICAG syllabus for Financial Accounting & Reporting.',
          created_at: '2026-01-15T00:00:00.000Z',
          status: 'published',
          level: 'Level 2',
          certificate_enabled: true,
          language: { name: 'English' },
          author: {
            name: 'Dr. Kwesi Appiah, CA',
            profile: '/avatar.jpg',
          },
          ratings: {
            average: 4.9,
            count: 38,
          },
        },
        statistics: {
          analytics: {
            total_enrolled_users: { count: 185 },
            total_earnings: { amount: 157250 },
            total_sales: { count: 185 },
          },
          content_statistics: {
            total_duration: { formatted: '36 hrs' },
          },
        },
      };

      const { html, cleanup } = renderClient(<CourseStatistics course={mockCourseDetail} />);

      // Verify Institutional Curriculum Badge is displayed
      expect(html).toContain('Institutional Curriculum');
      expect(html).toMatch(/Syllabus Completion|Completion Rate/);
      expect(html).toContain('Enrolled Scholars');
      expect(html).toContain('185');
      expect(html).toContain('84.2%');

      // Verify tutor selling prices and sales earnings are NOT rendered
      expect(html).not.toContain('157250');
      expect(html).not.toContain('Total Earnings');
      expect(html).not.toContain('Total Sales');

      cleanup();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Academic Engagement & Performance Chart Components
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. Academic Engagement & Performance Chart Components', () => {
    it('renders AcademicEngagementCard with classroom threads, grading queue, and ICAG pass benchmark', () => {
      const perfData: AcademicPerformanceData = {
        active_classroom_discussions: 5,
        pending_assignments_to_grade: 9,
        icag_mock_pass_rate: 88.5,
      };

      const { html, cleanup } = renderClient(
        <AcademicEngagementCard performanceData={perfData} />
      );

      expect(html).toContain('Cohort Engagement');
      expect(html).toContain('5 Classroom Threads');
      expect(html).toContain('9 Pending Submissions');
      expect(html).toContain('88.5% Mock Exam Pass Rate');
      expect(html).toContain('Benchmark: 80% ICAG passing threshold');
      expect(html).toContain('/instructor/assignments');
      expect(html).toContain('/instructor/student-quiz-reports');
      expect(html).toContain('/instructor/my-course');

      cleanup();
    });

    it('renders AcademicPerformanceChart with academic metric legends and without financial series', () => {
      const customChartData: AcademicChartData = {
        yearly: [{ name: '2026', completionRate: 85, mockPassRate: 90, submissions: 120 }],
        monthly: [{ name: 'Jan', completionRate: 80, mockPassRate: 85, submissions: 20 }],
        weekly: [{ name: 'W1', completionRate: 78, mockPassRate: 84, submissions: 8 }],
      };

      const { html, cleanup } = renderClient(
        <AcademicPerformanceChart data={customChartData} />
      );

      expect(html).toContain('Academic Progress &amp; Exam Readiness');
      expect(html).toContain('Completion Rate (%)');
      expect(html).toContain('ICAG Mock Pass Rate');
      expect(html).toContain('Submissions');

      // Verify no revenue or sales chart titles
      expect(html).not.toContain('Sales Statistics');
      expect(html).not.toContain('Revenue Chart');
      expect(html).not.toContain('Earnings');

      cleanup();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Academic Metric Calculation Oracles & Invariants
  // ─────────────────────────────────────────────────────────────────────────────
  describe('7. Academic Metric Calculation Oracles & Mathematical Invariants', () => {
    it('oracle: syllabus progress calculation computes bounded percentage [0, 100]', () => {
      const calculateSyllabusProgress = (completedLectures: number, totalLectures: number): number => {
        if (!totalLectures || totalLectures <= 0) return 0;
        if (completedLectures < 0) return 0;
        const rate = (completedLectures / totalLectures) * 100;
        return Math.min(100, Math.max(0, parseFloat(rate.toFixed(1))));
      };

      expect(calculateSyllabusProgress(0, 30)).toBe(0);
      expect(calculateSyllabusProgress(15, 30)).toBe(50.0);
      expect(calculateSyllabusProgress(23, 30)).toBe(76.7);
      expect(calculateSyllabusProgress(30, 30)).toBe(100.0);
      expect(calculateSyllabusProgress(35, 30)).toBe(100.0); // Clamped
      expect(calculateSyllabusProgress(0, 0)).toBe(0); // Zero total avoids NaN
    });

    it('oracle: ICAG mock exam pass rate computes percentage meeting institutional pass threshold', () => {
      const calculateMockExamPassRate = (scores: number[], passingThreshold: number = 50): number => {
        if (!scores || scores.length === 0) return 0;
        const passedCount = scores.filter((score) => score >= passingThreshold).length;
        const rate = (passedCount / scores.length) * 100;
        return parseFloat(rate.toFixed(1));
      };

      // 10 students, 8 scored >= 50
      const cohort1 = [45, 52, 60, 78, 85, 90, 48, 65, 70, 82];
      expect(calculateMockExamPassRate(cohort1, 50)).toBe(80.0);

      // Higher ICAG benchmark threshold (65%)
      expect(calculateMockExamPassRate(cohort1, 65)).toBe(60.0);

      // Empty cohort avoids NaN
      expect(calculateMockExamPassRate([])).toBe(0);

      // All students passed
      expect(calculateMockExamPassRate([80, 85, 90])).toBe(100.0);

      // All students failed
      expect(calculateMockExamPassRate([20, 30, 40])).toBe(0.0);
    });

    it('oracle: assignment grading queue computes pending reviews accurately', () => {
      interface Submission {
        id: number;
        courseId: number;
        status: 'pending_review' | 'graded';
      }

      const submissions: Submission[] = [
        { id: 1, courseId: 101, status: 'pending_review' },
        { id: 2, courseId: 101, status: 'graded' },
        { id: 3, courseId: 102, status: 'pending_review' },
        { id: 4, courseId: 103, status: 'pending_review' },
        { id: 5, courseId: 102, status: 'graded' },
      ];

      const getPendingAssignmentCount = (list: Submission[], tutorCourseIds: number[]): number => {
        return list.filter(
          (sub) => tutorCourseIds.includes(sub.courseId) && sub.status === 'pending_review'
        ).length;
      };

      expect(getPendingAssignmentCount(submissions, [101, 102, 103])).toBe(3);
      expect(getPendingAssignmentCount(submissions, [101])).toBe(1);
      expect(getPendingAssignmentCount(submissions, [999])).toBe(0);
    });
  });
});
