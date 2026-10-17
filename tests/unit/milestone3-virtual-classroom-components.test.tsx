import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getRoom } from '@/app/api/room/[courseId]/route';
import { GET as getDiscussions, POST as postDiscussion } from '@/app/api/room/[courseId]/discussions/route';
import { GET as getMaterials, POST as postMaterial } from '@/app/api/room/[courseId]/materials/route';
import { createRequest, parseResponse } from '../helpers/testClient';

describe('Milestone 3 Unit & Component Verification Suite (Features 9, 10, 11, 12)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 9: Isolated Virtual Classroom Hub Data
  describe('Feature 9: Virtual Classroom Hub Room Contract & Channels', () => {
    it('returns course metadata, level, live lecture details, and discussions for enrolled student', async () => {
      // User 10 is enrolled in Course 101
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.course_id).toBe(101);
      expect(data.data.course_title).toContain('Financial Accounting');
      expect(data.data.level).toBe('Level 1');
      expect(data.data.assigned_tutor_id).toBe(1);
      expect(Array.isArray(data.data.discussions)).toBe(true);
      expect(Array.isArray(data.data.study_materials)).toBe(true);
    });

    it('returns 404 Not Found when requesting non-existent course room', async () => {
      const req = createRequest('/api/room/99999?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '99999' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  // Feature 10: Live Classroom & Zoom Security
  describe('Feature 10: Live Classroom Zoom Link Security', () => {
    it('generates authenticated Zoom join link containing student token and passcode', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);

      expect(data.data.live_lecture).toBeDefined();
      expect(data.data.live_lecture.topic).toContain('ICAG');
      expect(data.data.live_lecture.duration_minutes).toBe(90);
      expect(data.data.live_lecture.zoom_join_url).toContain('https://icag-ghana.zoom.us/j/');
      expect(data.data.live_lecture.zoom_join_url).toContain('token_101_10');
      expect(data.data.live_lecture.passcode).toBe('ICAG2026');
    });

    it('provides assigned lead faculty with authorized room and credentials', async () => {
      // Tutor 1 is assigned to course 101
      const req = createRequest('/api/room/101?userId=1&role=tutor');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.data.course_id).toBe(101);
      expect(data.data.live_lecture.zoom_join_url).toContain('token_101_1');
    });
  });

  // Feature 11: Strict Course Enrollment Isolation (403 Barrier)
  describe('Feature 11: Strict Course Enrollment Isolation', () => {
    it('returns 403 Forbidden when unenrolled student attempts to access room', async () => {
      // User 11 is NOT enrolled in course 101
      const req = createRequest('/api/room/101?userId=11&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied');
      expect(data.course_id).toBe(101);
    });

    it('returns 403 Forbidden when unassigned tutor attempts to access room', async () => {
      // Tutor 2 is assigned to course 102, NOT 101
      const req = createRequest('/api/room/101?userId=2&role=tutor');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied');
    });

    it('allows Institute Administrator universal access to all course rooms', async () => {
      const req = createRequest('/api/room/101?userId=999&role=admin');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(data.data.course_id).toBe(101);
    });
  });

  // Feature 12: Academic Discussions & Study Materials Persistence
  describe('Feature 12: Discussions & Materials Management', () => {
    it('allows posting an academic question and appends it to course discussions', async () => {
      const postReq = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: {
          userId: 10,
          authorName: 'Kofi Mensah',
          authorRole: 'student',
          content: 'What is the accounting treatment for right-of-use asset depreciation under IFRS 16?',
        },
      });

      const postRes = await postDiscussion(postReq, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(postRes);

      expect(status).toBe(201);
      expect(data.data.course_id).toBe(101);
      expect(data.data.content).toContain('IFRS 16');

      // Verify discussion persists on retrieval
      const getReq = createRequest('/api/room/101/discussions');
      const getRes = await getDiscussions(getReq, { params: Promise.resolve({ courseId: '101' }) });
      const { data: discussionsData } = await parseResponse(getRes);

      const found = discussionsData.data.find((d: any) => d.content.includes('IFRS 16'));
      expect(found).toBeDefined();
      expect(found.author_name).toBe('Kofi Mensah');
    });

    it('rejects discussion post with missing content or author info', async () => {
      const badReq = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: {
          userId: 10,
          content: '',
        },
      });

      const badRes = await postDiscussion(badReq, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(badRes);

      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('retrieves persistent study materials for the course', async () => {
      const req = createRequest('/api/room/101/materials');
      const res = await getMaterials(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);

      expect(status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0].title).toBeDefined();
      expect(data.data[0].file_url).toBeDefined();
    });
  });
});
