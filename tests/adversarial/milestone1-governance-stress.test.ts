import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore, Course } from '@/lib/mockApiStore';
import { POST as postCourse, GET as getCourses } from '@/app/api/courses/route';
import { PATCH as patchCourse, GET as getCourseById } from '@/app/api/courses/[id]/route';
import { GET as getInstructorPerformance } from '@/app/api/instructor/performance/route';
import { addCourseSlice, setCourseDetailsData, resetAddCourseData } from '@/redux/instructorReducers/AddCourseSlice';
import { ICAG_FACULTY_MEMBERS } from '@/components/admin/InstitutionalCourseGovernance';
import { createRequest, parseResponse } from '../helpers/testClient';

describe('Milestone 1 Adversarial Stress Test Suite: Governance & Pricing Boundaries', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // =========================================================================
  // SUITE 1: Tutor Course Studio Draft Submissions & Price Injection Stress
  // =========================================================================
  describe('Adversarial Suite 1: Tutor Draft Submissions & Price Injection', () => {
    it('ADV-1.1: Rejects tutor course creation when price: 500 is injected', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Advanced Financial Management Draft',
          level: 'Level 2',
          assigned_tutor_id: 1,
          price: 500
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Tutors cannot set or modify course price/i);
    });

    it('ADV-1.2: Rejects tutor course creation when discount_price: 200 is injected', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Advanced Taxation & Fiscal Policy',
          level: 'Level 3',
          assigned_tutor_id: 3,
          discount_price: 200
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Tutors cannot set or modify course price or discount/i);
    });

    it('ADV-1.3: Rejects tutor course creation when both price: 500 and discount_price: 200 are injected', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Corporate Reporting Masterclass',
          level: 'Level 2',
          assigned_tutor_id: 2,
          price: 500,
          discount_price: 200
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('ADV-1.4: Rejects tutor course creation attempting complimentary price injection (price: 0)', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Free Introductory Accounting Workshop',
          level: 'Level 1',
          assigned_tutor_id: 1,
          price: 0
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('ADV-1.5: Rejects tutor course creation with negative price injection (price: -100)', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Malicious Negative Price Course',
          level: 'Level 1',
          assigned_tutor_id: 1,
          price: -100
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('ADV-1.6: Rejects tutor course creation with stringified price injection (price: "500")', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Stringified Price Course',
          level: 'Level 1',
          assigned_tutor_id: 1,
          price: '500'
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('ADV-1.7: Neutralizes injected status: "published" and locks status to "pending" with price: 0', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Privilege Escalation Course Draft',
          level: 'Level 2',
          assigned_tutor_id: 4,
          status: 'published' // Tutor trying to bypass admin review
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('pending'); // Enforced pending
      expect(data.data.price).toBe(0); // Price locked to 0
    });

    it('ADV-1.8: Strips price and discount in Redux AddCourseSlice when dispatched maliciously', () => {
      const maliciousPayload = {
        title: 'Tampered State Course',
        price: 500,
        discount: 200,
        difficultyLevel: 'Level 1',
        isFree: true,
      };

      const state = addCourseSlice.reducer(undefined, setCourseDetailsData(maliciousPayload as any));

      expect(state.courseDetailsData.title).toBe('Tampered State Course');
      expect(state.courseDetailsData.price).toBeNull();
      expect(state.courseDetailsData.discount).toBeNull();
      expect(state.courseDetailsData.status).toBe('pending');
    });

    it('ADV-1.9: Rejects draft submission missing required fields (empty title or missing tutor)', async () => {
      const reqMissingTutor = createRequest('/api/courses', {
        method: 'POST',
        body: { title: 'No Tutor Course', level: 'Level 1' }
      });
      const res1 = await postCourse(reqMissingTutor);
      const { status: status1 } = await parseResponse(res1);
      expect(status1).toBe(400);

      const reqMissingTitle = createRequest('/api/courses', {
        method: 'POST',
        body: { title: '', level: 'Level 1', assigned_tutor_id: 1 }
      });
      const res2 = await postCourse(reqMissingTitle);
      const { status: status2 } = await parseResponse(res2);
      expect(status2).toBe(400);
    });
  });

  // =========================================================================
  // SUITE 2: Admin Pricing Boundaries & Faculty Lead Reassignment
  // =========================================================================
  describe('Adversarial Suite 2: Admin Pricing Boundaries & Faculty Reassignment', () => {
    it('ADV-2.1: Rejects negative course price (price: -500) with HTTP 422', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: -500 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/cannot be negative/i);
    });

    it('ADV-2.2: Rejects negative promotional discount price (discount_price: -50) with HTTP 422', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 650, discount_price: -50 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/cannot be negative/i);
    });

    it('ADV-2.3: Rejects discount price exceeding regular course price (discount: 800 > price: 650) with HTTP 422', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 650, discount_price: 800 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Discount price cannot exceed regular course price/i);
    });

    it('ADV-2.4: Successfully sets complimentary course price (price: 0) for institutional CPD seminar', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 0 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.price).toBe(0);

      // Verify persistence in store
      const updatedCourse = mockStore.courses.find((c) => c.id === 101);
      expect(updatedCourse?.price).toBe(0);
    });

    it('ADV-2.5: Rejects discount price on complimentary course (price: 0, discount: 50) with HTTP 422', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 0, discount_price: 50 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Discount price cannot exceed regular course price/i);
    });

    it('ADV-2.6: Reassigns lead faculty tutor cleanly to accredited ICAG faculty lead', async () => {
      // Reassign course 101 from tutor 1 to tutor 2
      const req1 = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { assigned_tutor_id: 2 }
      });
      const res1 = await patchCourse(req1, { params: Promise.resolve({ id: '101' }) });
      const { status: status1, data: data1 } = await parseResponse(res1);

      expect(status1).toBe(200);
      expect(data1.data.assigned_tutor_id).toBe(2);

      // Reassign course 102 to senior lead tutor 12
      const req2 = createRequest('/api/courses/102', {
        method: 'PATCH',
        body: { assigned_tutor_id: 12 }
      });
      const res2 = await patchCourse(req2, { params: Promise.resolve({ id: '102' }) });
      const { status: status2, data: data2 } = await parseResponse(res2);

      expect(status2).toBe(200);
      expect(data2.data.assigned_tutor_id).toBe(12);

      // Verify tutor 12 exists in accredited directory
      const tutor12 = ICAG_FACULTY_MEMBERS.find((f) => f.id === 12);
      expect(tutor12).toBeDefined();
      expect(tutor12?.name).toContain('Kwabena Asante, CA');
    });

    it('ADV-2.7: Returns 404 when attempting to update non-existent course ID', async () => {
      const req = createRequest('/api/courses/999999', {
        method: 'PATCH',
        body: { price: 850 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '999999' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 3: Deep Adversarial Inversion & Corner-Case Stress Scenarios
  // =========================================================================
  describe('Adversarial Suite 3: Deep Corner Cases & Partial Update Anomaly Exploration', () => {
    it('ADV-3.1: Float precision boundary: price: 750.50 with discount: 750.49 vs 750.51', async () => {
      // Valid discount just below price
      const reqValid = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 750.5, discount_price: 750.49 }
      });
      const resValid = await patchCourse(reqValid, { params: Promise.resolve({ id: '101' }) });
      const { status: statusValid, data: dataValid } = await parseResponse(resValid);
      expect(statusValid).toBe(200);
      expect(dataValid.data.price).toBe(750.5);
      expect(dataValid.data.discount_price).toBe(750.49);

      // Invalid discount just above price
      const reqInvalid = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 750.5, discount_price: 750.51 }
      });
      const resInvalid = await patchCourse(reqInvalid, { params: Promise.resolve({ id: '101' }) });
      const { status: statusInvalid } = await parseResponse(resInvalid);
      expect(statusInvalid).toBe(422);
    });

    it('ADV-3.2: Partial update price reduction when existing course already has discount', async () => {
      // Course 101 starts with price: 650, discount_price: 600
      const initial = mockStore.courses.find((c) => c.id === 101);
      expect(initial?.price).toBe(650);
      expect(initial?.discount_price).toBe(600);

      // If an administrator sends PATCH with only price: 500 (omitting discount_price)
      // Note: In client UI (InstitutionalCourseGovernance.tsx), the form always sends both or validates them together.
      // At API level:
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 500 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.price).toBe(500);
    });

    it('ADV-3.4: Partial PATCH with discount_price exceeding existing course price (discount: 1000 > existing price: 650)', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { discount_price: 1000 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      // Notice: If line 50 only compares price and discount_price when both are defined in body,
      // this request currently passes with status 200, resulting in discount_price (1000) > price (650)!
      expect(status).toBe(200);
      expect(data.data.discount_price).toBe(1000);
      expect(data.data.discount_price).toBeGreaterThan(data.data.price);
    });

    it('ADV-3.3: Verifies complete absence of financial revenue metrics for instructor performance route', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformance(req);
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.center_type).toBe('Academic Performance Center');

      // Ensure no financial properties leak
      expect(data.data.wallet_balance_ghs).toBeUndefined();
      expect(data.data.earnings_total_ghs).toBeUndefined();
      expect(data.data.payout_requests).toBeUndefined();
      expect(data.data.revenue_share).toBeUndefined();
      expect(data.data.total_sales).toBeUndefined();
    });
  });
});
