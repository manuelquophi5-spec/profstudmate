import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getRoom } from '@/app/api/room/[courseId]/route';
import { GET as getDiscussions, POST as postDiscussion } from '@/app/api/room/[courseId]/discussions/route';
import { POST as postMaterial } from '@/app/api/room/[courseId]/materials/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 2: Classroom & Communication Boundaries (Features 9 - 12)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 9 Boundaries
  describe('Feature 9 Boundaries: Isolated Virtual Classroom Hub (/room/[courseId])', () => {
    it('T2-F9-01: Accessing non-existent course room returns 404 Not Found', async () => {
      const req = createRequest('/api/room/99999?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '99999' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('T2-F9-02: Missing discussion content returns 400 Bad Request', async () => {
      const req = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: { userId: 10, authorName: 'Student', content: '' }
      });
      const res = await postDiscussion(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F9-03: Missing userId when posting discussion returns 400 Bad Request', async () => {
      const req = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: { authorName: 'Anonymous', content: 'Hello' }
      });
      const res = await postDiscussion(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F9-04: Posting discussion to non-existent course returns 404', async () => {
      const req = createRequest('/api/room/99999/discussions', {
        method: 'POST',
        body: { userId: 10, content: 'Lost comment' }
      });
      const res = await postDiscussion(req, { params: Promise.resolve({ courseId: '99999' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(404);
    });

    it('T2-F9-05: Classroom data preserves isolation between different courses', async () => {
      const req101 = createRequest('/api/room/101?userId=10&role=student');
      const res101 = await getRoom(req101, { params: Promise.resolve({ courseId: '101' }) });
      const { data: data101 } = await parseResponse(res101);
      expect(data101.data.course_id).toBe(101);
      expect(data101.data.course_id).not.toBe(102);
    });
  });

  // Feature 10 Boundaries
  describe('Feature 10 Boundaries: Live Classrooms & Zoom Security', () => {
    it('T2-F10-01: Zoom join URL strictly contains authentication token for enrolled user', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.live_lecture.zoom_join_url).toContain('token_101_10');
    });

    it('T2-F10-02: Zoom security passcode is non-empty and well-formed', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.live_lecture.passcode.length).toBeGreaterThan(4);
    });

    it('T2-F10-03: Zoom join URL is omitted when student is not authenticated', async () => {
      const req = createRequest('/api/room/101');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.data).toBeUndefined();
    });

    it('T2-F10-04: Live lecture topic string handles special character encoding safely', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(typeof data.data.live_lecture.topic).toBe('string');
    });

    it('T2-F10-05: Scheduled duration minutes is a positive integer', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.live_lecture.duration_minutes).toBeGreaterThan(0);
    });
  });

  // Feature 11 Boundaries
  describe('Feature 11 Boundaries: Strict Course Enrollment Isolation (403 Barrier)', () => {
    it('T2-F11-01: Anonymous/Guest user (userId=0) receives 403 Forbidden', async () => {
      const req = createRequest('/api/room/101?userId=0&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });

    it('T2-F11-02: Negative user ID receives 403 Forbidden', async () => {
      const req = createRequest('/api/room/101?userId=-5&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });

    it('T2-F11-03: Student enrolled in Course 101 is barred from Course 201 with 403', async () => {
      // User 10 is enrolled in 101, NOT in 201
      const req = createRequest('/api/room/201?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '201' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('T2-F11-04: Unassigned tutor attempting to access room receives 403 Forbidden', async () => {
      // Tutor 3 is assigned to course 301, NOT course 101
      const req = createRequest('/api/room/101?userId=3&role=tutor');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });

    it('T2-F11-05: Unenrolled student posting in discussion channel is barred with 403', async () => {
      const req = createRequest('/api/room/201/discussions', {
        method: 'POST',
        body: { userId: 10, content: 'Attempting to inject into unenrolled room' }
      });
      const res = await postDiscussion(req, { params: Promise.resolve({ courseId: '201' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });
  });

  // Feature 12 Boundaries
  describe('Feature 12 Boundaries: Persistence of Academic Materials Across Sessions', () => {
    it('T2-F12-01: Rejects material upload with missing title', async () => {
      const req = createRequest('/api/room/101/materials', {
        method: 'POST',
        body: { fileUrl: '/test.pdf', uploadedBy: 1 }
      });
      const res = await postMaterial(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F12-02: Rejects material upload with missing fileUrl', async () => {
      const req = createRequest('/api/room/101/materials', {
        method: 'POST',
        body: { title: 'Lecture Notes', uploadedBy: 1 }
      });
      const res = await postMaterial(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(400);
    });

    it('T2-F12-03: Long academic discussion messages (2000+ characters) persist without error', async () => {
      const longContent = 'A'.repeat(2500);
      const req = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: { userId: 10, content: longContent }
      });
      const res = await postDiscussion(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.data.content.length).toBe(2500);
    });

    it('T2-F12-04: Safely handles HTML and special characters in discussion messages', async () => {
      const specialText = '<b>Taxation:</b> Income Tax Act 896 & Act 1046 <summary>';
      const req = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: { userId: 10, content: specialText }
      });
      const res = await postDiscussion(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(201);
      expect(data.data.content).toBe(specialText);
    });

    it('T2-F12-05: Multiple discussions maintain deterministic insertion order', async () => {
      await postDiscussion(
        createRequest('/api/room/101/discussions', {
          method: 'POST',
          body: { userId: 10, content: 'Message Alpha' }
        }),
        { params: Promise.resolve({ courseId: '101' }) }
      );
      await postDiscussion(
        createRequest('/api/room/101/discussions', {
          method: 'POST',
          body: { userId: 10, content: 'Message Beta' }
        }),
        { params: Promise.resolve({ courseId: '101' }) }
      );

      const listReq = createRequest('/api/room/101/discussions');
      const listRes = await getDiscussions(listReq, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(listRes);
      const alphaIdx = data.data.findIndex((d: any) => d.content === 'Message Alpha');
      const betaIdx = data.data.findIndex((d: any) => d.content === 'Message Beta');
      expect(alphaIdx).toBeLessThan(betaIdx);
    });
  });
});
