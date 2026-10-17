import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { POST as postCourse } from '@/app/api/courses/route';
import { PATCH as patchCourse } from '@/app/api/courses/[id]/route';
import { GET as getInstructorPerformance } from '@/app/api/instructor/performance/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 2: Governance & Academic Boundaries (Features 1 - 4)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 1 Boundaries
  describe('Feature 1 Boundaries: Strip Tutor Price & Discount Authoring', () => {
    it('T2-F1-01: Rejects tutor draft even if price is submitted as 0', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: 'Draft Zero Price', level: 'Level 1', assigned_tutor_id: 1, price: 0 }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });

    it('T2-F1-02: Rejects tutor draft with negative price input', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: 'Negative Price Draft', level: 'Level 1', assigned_tutor_id: 1, price: -50 }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });

    it('T2-F1-03: Rejects tutor draft with stringified price payload', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: 'String Price Draft', level: 'Level 1', assigned_tutor_id: 1, price: '650' }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });

    it('T2-F1-04: Rejects tutor draft containing nested discount object', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: 'Discount Object Draft', level: 'Level 1', assigned_tutor_id: 1, discount_price: 100 }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });

    it('T2-F1-05: Rejects whitespace-only title when pricing is attempted', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: '   ', level: 'Level 1', assigned_tutor_id: 1, price: 200 }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect([400, 403]).toContain(status);
    });
  });

  // Feature 2 Boundaries
  describe('Feature 2 Boundaries: Tutor Academic Draft Submission', () => {
    it('T2-F2-01: Rejects draft submission with empty title string', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: '', level: 'Level 1', assigned_tutor_id: 1 }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F2-02: Rejects draft submission with missing level', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: 'No Level Course', assigned_tutor_id: 1 }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F2-03: Rejects draft submission with missing tutor ID', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: { title: 'Orphan Course', level: 'Level 2' }
      });
      const res = await postCourse(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F2-04: Formats slug cleanly for titles with complex symbols and punctuation', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'IFRS 9: Financial Instruments — Recognition & Measurement (Ghana 2026)!',
          level: 'Level 3',
          assigned_tutor_id: 1
        }
      });
      const res = await postCourse(req);
      const { data } = await parseResponse(res);
      expect(data.data.slug).toMatch(/^[a-z0-9-]+$/);
      expect(data.data.slug).not.toContain('—');
      expect(data.data.slug).not.toContain('!');
    });

    it('T2-F2-05: Handles non-array syllabus safely without crashing', async () => {
      const req = createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Syllabus Edge Case',
          level: 'Level 1',
          assigned_tutor_id: 1,
          syllabus: 'Should be an array'
        }
      });
      const res = await postCourse(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(Array.isArray(data.data.syllabus)).toBe(true);
    });
  });

  // Feature 3 Boundaries
  describe('Feature 3 Boundaries: Institutional Pricing & Review Console', () => {
    it('T2-F3-01: Admin cannot set negative course price in GHS', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: -250 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('cannot be negative');
    });

    it('T2-F3-02: Admin cannot set negative promotional discount price in GHS', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 500, discount_price: -10 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('cannot be negative');
    });

    it('T2-F3-03: Admin cannot set discount price higher than official course price', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 500, discount_price: 650 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(422);
      expect(data.error).toContain('Discount price cannot exceed regular course price');
    });

    it('T2-F3-04: Updating pricing for non-existent course returns 404 Not Found', async () => {
      const req = createRequest('/api/courses/999999', {
        method: 'PATCH',
        body: { price: 800 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '999999' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('T2-F3-05: Admin can set course price to exactly 0 GHS for complimentary seminars', async () => {
      const req = createRequest('/api/courses/101', {
        method: 'PATCH',
        body: { price: 0 }
      });
      const res = await patchCourse(req, { params: Promise.resolve({ id: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.price).toBe(0);
    });
  });

  // Feature 4 Boundaries
  describe('Feature 4 Boundaries: Academic Performance Center Dashboard', () => {
    it('T2-F4-01: Missing instructorId query returns 400 Bad Request', async () => {
      const req = createRequest('/api/instructor/performance');
      const res = await getInstructorPerformance(req);
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F4-02: Handles instructor with no assigned courses gracefully', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=999');
      const res = await getInstructorPerformance(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.total_assigned_courses).toBe(0);
    });

    it('T2-F4-03: Strips financial metrics even when query explicitly requests earnings', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1&include_earnings=true&wallet=true');
      const res = await getInstructorPerformance(req);
      const { data } = await parseResponse(res);
      expect(data.data.wallet_balance_ghs).toBeUndefined();
      expect(data.data.earnings_total_ghs).toBeUndefined();
    });

    it('T2-F4-04: Non-numeric instructorId returns bad request or default without crash', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=invalid_tutor');
      const res = await getInstructorPerformance(req);
      const { status } = await parseResponse(res);
      expect([200, 400]).toContain(status);
    });

    it('T2-F4-05: Performance center metrics remain bounded within valid percentages', async () => {
      const req = createRequest('/api/instructor/performance?instructorId=1');
      const res = await getInstructorPerformance(req);
      const { data } = await parseResponse(res);
      expect(data.data.average_completion_rate).toBeGreaterThanOrEqual(0);
      expect(data.data.average_completion_rate).toBeLessThanOrEqual(100);
      expect(data.data.icag_mock_pass_rate).toBeGreaterThanOrEqual(0);
      expect(data.data.icag_mock_pass_rate).toBeLessThanOrEqual(100);
    });
  });
});
