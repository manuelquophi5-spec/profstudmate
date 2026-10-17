import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getRoom } from '@/app/api/room/[courseId]/route';
import { GET as getDiscussions, POST as postDiscussion } from '@/app/api/room/[courseId]/discussions/route';
import { GET as getMaterials, POST as postMaterial } from '@/app/api/room/[courseId]/materials/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 1: Course-Specific Communication & Live Classrooms (Features 9 - 12)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Feature 9: Isolated Virtual Classroom Hub (/room/[courseId])
  describe('Feature 9: Isolated Virtual Classroom Hub (/room/[courseId])', () => {
    it('T1-F9-01: Enrolled student accesses virtual classroom hub data', async () => {
      // User 10 is enrolled in course 101
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.course_id).toBe(101);
      expect(data.data.course_title).toContain('Financial Accounting');
    });

    it('T1-F9-02: Classroom hub returns active academic discussions', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.discussions.length).toBeGreaterThan(0);
      expect(data.data.discussions[0].content).toBeDefined();
    });

    it('T1-F9-03: Classroom hub returns repository of study materials', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.study_materials.length).toBeGreaterThan(0);
      expect(data.data.study_materials[0].title).toBeDefined();
    });

    it('T1-F9-04: Classroom hub returns scheduled live lecture topic and duration', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.live_lecture.topic).toContain('ICAG');
      expect(data.data.live_lecture.duration_minutes).toBe(90);
    });

    it('T1-F9-05: Enrolled student posts question in classroom discussion channel', async () => {
      const postReq = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: {
          userId: 10,
          authorName: 'Kofi Mensah',
          authorRole: 'student',
          content: 'What is the deadline for submitting Assignment 2 on IFRS 16?'
        }
      });
      const postRes = await postDiscussion(postReq, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(postRes);
      expect(status).toBe(201);
      expect(data.data.content).toContain('IFRS 16');
      expect(data.data.course_id).toBe(101);
    });
  });

  // Feature 10: Live Classrooms & Zoom Link Security
  describe('Feature 10: Live Classrooms & Zoom Link Security', () => {
    it('T1-F10-01: Provides authorized Zoom join URL with security token to enrolled student', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.live_lecture.zoom_join_url).toMatch(/^https:\/\/icag-ghana\.zoom\.us\/j\//);
      expect(data.data.live_lecture.zoom_join_url).toContain('token_101_10');
    });

    it('T1-F10-02: Provides faculty lead with authorized lecture credentials', async () => {
      // Tutor 1 is assigned to course 101
      const req = createRequest('/api/room/101?userId=1&role=tutor');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.live_lecture.zoom_join_url).toBeDefined();
    });

    it('T1-F10-03: Allows institutional administrator to access Zoom classroom', async () => {
      const req = createRequest('/api/room/101?userId=999&role=admin');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.live_lecture.zoom_join_url).toBeDefined();
    });

    it('T1-F10-04: Enforces meeting passcode presence for Zoom security', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.live_lecture.passcode).toBe('ICAG2026');
    });

    it('T1-F10-05: Returns scheduled lecture start timestamp in ISO format', async () => {
      const req = createRequest('/api/room/101?userId=10&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data.live_lecture.scheduled_start).toBeDefined();
      expect(new Date(data.data.live_lecture.scheduled_start).getTime()).toBeGreaterThan(0);
    });
  });

  // Feature 11: Strict Course Enrollment Isolation (403 Barrier)
  describe('Feature 11: Strict Course Enrollment Isolation (403 Barrier)', () => {
    it('T1-F11-01: Rejects unenrolled student with HTTP 403 Forbidden', async () => {
      // User 25 is NOT enrolled in course 101
      const req = createRequest('/api/room/101?userId=25&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access denied: You are not enrolled in this course');
    });

    it('T1-F11-02: Rejects unassigned tutor with HTTP 403 Forbidden', async () => {
      // Tutor 2 is assigned to course 102, NOT 101
      const req = createRequest('/api/room/101?userId=2&role=tutor');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('T1-F11-03: Prevents unenrolled student from viewing Zoom lecture link', async () => {
      const req = createRequest('/api/room/101?userId=33&role=student');
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.data).toBeUndefined();
    });

    it('T1-F11-04: Prevents unenrolled student from posting discussions in classroom', async () => {
      const req = createRequest('/api/room/101/discussions', {
        method: 'POST',
        body: {
          userId: 33,
          authorName: 'Intruder',
          authorRole: 'student',
          content: 'Spamming unenrolled course'
        }
      });
      const res = await postDiscussion(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(403);
      expect(data.error).toContain('Cannot post in unenrolled course room');
    });

    it('T1-F11-05: Enforces 403 barrier when student requests room via request headers', async () => {
      const req = createRequest('/api/room/101', {
        headers: {
          'x-user-id': '77',
          'x-user-role': 'student'
        }
      });
      const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
      const { status } = await parseResponse(res);
      expect(status).toBe(403);
    });
  });

  // Feature 12: Persistence of Academic Materials Across Sessions
  describe('Feature 12: Persistence of Academic Materials Across Sessions', () => {
    it('T1-F12-01: Persists discussion messages across multiple calls', async () => {
      await postDiscussion(
        createRequest('/api/room/101/discussions', {
          method: 'POST',
          body: {
            userId: 10,
            authorName: 'Kofi Mensah',
            authorRole: 'student',
            content: 'Persistent question on double-entry principles'
          }
        }),
        { params: Promise.resolve({ courseId: '101' }) }
      );

      const listReq = createRequest('/api/room/101/discussions');
      const listRes = await getDiscussions(listReq, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(listRes);
      const found = data.data.find((d: any) => d.content.includes('double-entry principles'));
      expect(found).toBeDefined();
    });

    it('T1-F12-02: Uploads and persists academic study materials per course', async () => {
      const uploadReq = createRequest('/api/room/101/materials', {
        method: 'POST',
        body: {
          courseId: 101,
          title: 'IAS 7 Statement of Cash Flows Handout',
          fileUrl: '/materials/course101/ias7-handout.pdf',
          fileType: 'pdf',
          uploadedBy: 1
        }
      });
      const uploadRes = await postMaterial(uploadReq, { params: Promise.resolve({ courseId: '101' }) });
      const { status, data } = await parseResponse(uploadRes);
      expect(status).toBe(201);
      expect(data.data.title).toContain('Statement of Cash Flows');

      const getReq = createRequest('/api/room/101/materials');
      const getRes = await getMaterials(getReq, { params: Promise.resolve({ courseId: '101' }) });
      const { data: materialsData } = await parseResponse(getRes);
      const exists = materialsData.data.some((m: any) => m.title.includes('Statement of Cash Flows'));
      expect(exists).toBe(true);
    });

    it('T1-F12-03: Ensures discussions from course 101 do not leak into course 102', async () => {
      await postDiscussion(
        createRequest('/api/room/101/discussions', {
          method: 'POST',
          body: {
            userId: 10,
            authorName: 'Kofi Mensah',
            content: 'Specific to course 101 only'
          }
        }),
        { params: Promise.resolve({ courseId: '101' }) }
      );

      const req102 = createRequest('/api/room/102/discussions');
      const res102 = await getDiscussions(req102, { params: Promise.resolve({ courseId: '102' }) });
      const { data } = await parseResponse(res102);
      const leaked = data.data.some((d: any) => d.content.includes('Specific to course 101 only'));
      expect(leaked).toBe(false);
    });

    it('T1-F12-04: Ensures academic study materials from course 101 do not leak into course 102', async () => {
      const req102 = createRequest('/api/room/102/materials');
      const res102 = await getMaterials(req102, { params: Promise.resolve({ courseId: '102' }) });
      const { data } = await parseResponse(res102);
      const leaked = data.data.some((m: any) => m.course_id === 101);
      expect(leaked).toBe(false);
    });

    it('T1-F12-05: Returns author role and creation timestamp on persistent discussions', async () => {
      const req = createRequest('/api/room/101/discussions');
      const res = await getDiscussions(req, { params: Promise.resolve({ courseId: '101' }) });
      const { data } = await parseResponse(res);
      expect(data.data[0].author_role).toBeDefined();
      expect(data.data[0].created_at).toBeDefined();
    });
  });
});
