import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getCourses, POST as postCourse } from '@/app/api/courses/route';
import { GET as getCourseById, PATCH as patchCourse } from '@/app/api/courses/[id]/route';
import { GET as getInstructorPerformance } from '@/app/api/instructor/performance/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 1: Institutional Course Governance & Academic Center (Features 1 - 4)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 1: Strip Tutor Price & Discount Authoring
  describe('Feature 1: Strip Tutor Price & Discount Authoring', () => {
    it('T1-F1-01: Rejects tutor draft submission when course price is included', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Financial Reporting Review',
          level: 'Level 2',
          assigned_tutor_id: 2,
          price: 500
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Tutors cannot set or modify course price');
    });

    it('T1-F1-02: Rejects tutor draft submission when discount price is included', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Principles of Taxation',
          level: 'Level 2',
          assigned_tutor_id: 2,
          discount_price: 350
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Tutors cannot set or modify course price or discount');
    });

    it('T1-F1-03: Rejects tutor submission when both price and discount are authored', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Audit & Assurance Principles',
          level: 'Level 2',
          assigned_tutor_id: 3,
          price: 700,
          discount_price: 650
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('T1-F1-04: Permits tutor draft submission when pricing fields are omitted', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Management Accounting Level 1',
          level: 'Level 1',
          assigned_tutor_id: 1,
          syllabus: ['Cost Behavior', 'Standard Costing']
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.price).toBe(0);
    });

    it('T1-F1-05: Verifies newly created draft has price locked at 0 pending admin review', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Information Technology for Accountants',
          level: 'Level 1',
          assigned_tutor_id: 4
        }
      });
      const res = await postCourse(req);
      const { data } = await parseResponse(res);
      expect(data.data.price).toBe(0);
      expect(data.data.status).toBe('pending');
    });
  });

  // Feature 2: Tutor Academic Draft Submission
  describe('Feature 2: Tutor Academic Draft Submission', () => {
    it('T1-F2-01: Successfully submits comprehensive academic curriculum draft', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Advanced Audit & Professional Ethics',
          level: 'Level 3',
          assigned_tutor_id: 5,
          syllabus: ['ISA Standards', 'Auditor Liability in Ghana', 'Fraud Risk Assessment'],
          lectures_count: 28
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.data.title).toBe('Advanced Audit & Professional Ethics');
      expect(data.data.lectures_count).toBe(28);
      expect(data.data.syllabus.length).toBe(3);
    });

    it('T1-F2-02: Enforces validation requiring course title, level, and assigned tutor', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Incomplete Draft'
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(400);
      expect(data.error).toContain('Missing required course fields');
    });

    it('T1-F2-03: Sets draft status to pending upon submission', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Ghana Business Law Foundation',
          level: 'Level 1',
          assigned_tutor_id: 2
        }
      });
      const res = await postCourse(req);
      const { data } = await parseResponse(res);
      expect(data.data.status).toBe('pending');
    });

    it('T1-F2-04: Automatically formats URL-friendly slug from curriculum title', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Corporate Strategy & Governance (Level 3)',
          level: 'Level 3',
          assigned_tutor_id: 1
        }
      });
      const res = await postCourse(req);
      const { data } = await parseResponse(res);
      expect(data.data.slug).toBe('corporate-strategy-governance-level-3');
    });

    it('T1-F2-05: Lists submitted draft in pending review queries for institute admins', async () => {
      await postCourse(
        createRequest('/api/courses', {
          method: 'POST',
          body: {
            title: 'Draft for Review',
            level: 'Level 2',
            assigned_tutor_id: 3
          }
        })
      );
      const req = createRequest('/api/courses?status=pending');
      const res = await getCourses(req);
      const { data } = await parseResponse(res);
      const found = data.data.find((c: any) => c.title === 'Draft for Review');
      expect(found).toBeDefined();
      expect(found.status).toBe('pending');
    });
  });

  // Feature 3: Institutional Pricing & Review Console
  describe('Feature 3: Institutional Pricing & Review Console', () => {
    it('T1-F3-01: Institute admin sets official course selling price in GHS', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 750 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.price).toBe(750);
    });

    it('T1-F3-02: Institute admin sets promotional discount price in GHS', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 750, discount_price: 700 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.discount_price).toBe(700);
    });

    it('T1-F3-03: Institute admin approves draft course and publishes to catalog', async () => {
      const draftRes = await postCourse(
        createRequest('/api/courses', {
          method: 'POST',
          body: {
            title: 'Audit Standards Draft',
            level: 'Level 2',
            assigned_tutor_id: 1
          }
        })
      );
      const { data: draftData } = await parseResponse(draftRes);
      const courseId = draftData.data.id;

      const req = createRequest(`/api/courses/${courseId}`, {
        method: 'PATCH',
        body: { price: 800, status: 'published' }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: String(courseId) }) });
      const { data } = await parseResponse(res);
      expect(data.data.status).toBe('published');
      expect(data.data.price).toBe(800);
    });

    it('T1-F3-04: Institute admin reassigns lead faculty tutor for course', async () => {
      const req = createRequest('/api/courses/102', {
        method: 'PATCH',
        body: { assigned_tutor_id: 12 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '102' }) });
      const { data } = await parseResponse(res);
      expect(data.data.assigned_tutor_id).toBe(12);
    });

    it('T1-F3-05: Retrieves updated institutional pricing in course details view', async () => {
      await patchCourse(
        createRequest('/api/courses/101', {
          method: 'PATCH',
          body: { price: 920, discount_price: 880 }
        }),
        { params: Promise.resolve({ id: '101' }) }
      );
      const getReq = createRequest('/api/courses/101');
      const getRes = await getCourseById(getReq, { params: Promise.resolve({ id: '101' }) });
      const { data } = await parseResponse(getRes);
      expect(data.data.price).toBe(920);
      expect(data.data.discount_price).toBe(880);
    });
  });

  // Feature 4: Academic Performance Center Dashboard
  describe('Feature 4: Academic Performance Center Dashboard', () => {
    it('T1-F4-01: Performance center provides student syllabus completion rate', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformance(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.average_completion_rate).toBeGreaterThan(0);
      expect(data.data.center_type).toBe('Academic Performance Center');
    });

    it('T1-F4-02: Performance center displays ICAG mock exam pass rates', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformance(req);
      const { data } = await parseResponse(res);
      expect(data.data.icag_mock_pass_rate).toBeDefined();
      expect(data.data.icag_mock_pass_rate).toBe(84.2);
    });

    it('T1-F4-03: Performance center displays enrolled student count across tutor courses', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformance(req);
      const { data } = await parseResponse(res);
      expect(data.data.enrolled_students).toBe(142);
      expect(data.data.total_assigned_courses).toBeGreaterThan(0);
    });

    it('T1-F4-04: Displays pending assignments awaiting grading', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformance(req);
      const { data } = await parseResponse(res);
      expect(data.data.pending_assignments_to_grade).toBe(15);
    });

    it('T1-F4-05: Omits wallet balances, course-sales revenue, and payout requests', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformance(req);
      const { data } = await parseResponse(res);
      expect(data.data.wallet_balance_ghs).toBeUndefined();
      expect(data.data.earnings_total_ghs).toBeUndefined();
      expect(data.data.payout_requests).toBeUndefined();
    });
  });
});
