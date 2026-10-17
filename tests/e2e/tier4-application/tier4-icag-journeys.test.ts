import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getCourses, POST as postCourse } from '@/app/api/courses/route';
import { PATCH as patchCourse } from '@/app/api/courses/[id]/route';
import { GET as getInstructorPerformance } from '@/app/api/instructor/performance/route';
import { GET as getBooks } from '@/app/api/shop/books/route';
import { POST as postBundle } from '@/app/api/shop/bundles/route';
import { POST as postFulfillment } from '@/app/api/shop/fulfillment/route';
import { POST as postDrm } from '@/app/api/shop/drm/route';
import { GET as getRoom } from '@/app/api/room/[courseId]/route';
import { GET as getDiscussions, POST as postDiscussion } from '@/app/api/room/[courseId]/discussions/route';
import { GET as getMaterials, POST as postMaterial } from '@/app/api/room/[courseId]/materials/route';
import { POST as initPaystack } from '@/app/api/payments/paystack/initialize/route';
import { POST as verifyPaystack } from '@/app/api/payments/paystack/verify/route';
import { POST as webhookPaystack } from '@/app/api/payments/paystack/webhook/route';
import { GET as getInvoice } from '@/app/api/invoices/[reference]/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 4: Real-World ICAG/ICAT Application Scenarios (Workload Journeys 1 - 8)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  // Scenario 1
  it('T4-SCENARIO-01: Level 1 Student Onboarding, Course + Study Text Bundle Purchase with MTN MoMo, Immediate Enrollment & Book Access', async () => {
    const studentId = 101;
    const studentEmail = 'kweku.mensah@accountant.gh';

    // Step 1: Browse bookstore catalog for Level 1 study texts
    const catalogRes = await getBooks(createRequest('/api/shop/books?level=Level 1'));
    const { data: catalogData } = await parseResponse(catalogRes);
    expect(catalogData.data.length).toBeGreaterThan(0);
    const studyText = catalogData.data.find((b: any) => b.id === 'b101');
    expect(studyText).toBeDefined();

    // Step 2: Configure course companion bundle (Financial Accounting Level 1 + Study Text)
    const bundleRes = await postBundle(
      createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: studentId, courseId: 101, bookId: studyText.id, isBundleSelected: true }
      })
    );
    const { data: bundleData } = await parseResponse(bundleRes);
    expect(bundleData.bundle_discount_ghs).toBe(50);
    const expectedTotal = bundleData.total_ghs; // 600 + 150 - 50 = 700 GHS

    // Step 3: Initiate Paystack checkout with MTN Mobile Money
    const checkoutRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: studentEmail,
          amount_ghs: expectedTotal,
          currency: 'GHS',
          paymentChannel: 'mobile_money',
          billingDetails: {
            userId: studentId,
            studentName: 'Kweku Mensah',
            icagId: 'ICAG/STU/2026/0442',
            phone: '0244123456'
          },
          cartItems: [
            {
              id: 'bundle_101',
              type: 'bundle',
              course_id: 101,
              book_id: studyText.id,
              title: 'ICAG Financial Accounting Level 1 Course & Study Text',
              price_ghs: 750,
              bundle_discount_ghs: 50
            }
          ]
        }
      })
    );
    const { data: checkoutData } = await parseResponse(checkoutRes);
    const paymentRef = checkoutData.data.reference;
    expect(checkoutData.data.amount_in_pesewas).toBe(70000);

    // Step 4: Paystack verification callback
    const verifyRes = await verifyPaystack(
      createRequest('/api/payments/paystack/verify', {
        method: 'POST',
        body: { reference: paymentRef, payment_method: 'MTN Mobile Money' }
      })
    );
    const { data: verifyData } = await parseResponse(verifyRes);
    expect(verifyData.transaction.status).toBe('success');
    expect(mockStore.isEnrolled(studentId, 101)).toBe(true);
    expect(mockStore.ownsBook(studentId, 'b101')).toBe(true);

    // Step 5: Immediate Virtual Classroom access
    const roomRes = await getRoom(createRequest(`/api/room/101?userId=${studentId}&role=student`), {
      params: Promise.resolve({ courseId: '101' })
    });
    const { status: roomStatus, data: roomData } = await parseResponse(roomRes);
    expect(roomStatus).toBe(200);
    expect(roomData.data.live_lecture.zoom_join_url).toBeDefined();

    // Step 6: In-browser DRM reader access to companion manual
    const drmRes = await postDrm(
      createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: studentId, bookId: 'b101' }
      })
    );
    const { status: drmStatus, data: drmData } = await parseResponse(drmRes);
    expect(drmStatus).toBe(200);
    expect(drmData.watermark).toContain(`ICAG Student ID: ${studentId}`);
  });

  // Scenario 2
  it('T4-SCENARIO-02: Tutor Curriculum Draft Submission, Admin GHS Pricing Approval, and Course Catalog Publication', async () => {
    const tutorId = 5;

    // Step 1: Tutor attempts to set price in draft -> rejected by institutional governance barrier
    const rogueDraftRes = await postCourse(
      createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Advanced Corporate Financial Management',
          level: 'Level 3',
          assigned_tutor_id: tutorId,
          price: 1500
        }
      })
    );
    expect(rogueDraftRes.status).toBe(403);

    // Step 2: Tutor submits clean academic curriculum draft
    const draftRes = await postCourse(
      createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Advanced Corporate Financial Management',
          level: 'Level 3',
          assigned_tutor_id: tutorId,
          syllabus: [
            'International Financial Management',
            'Mergers and Acquisitions Valuation',
            'Derivatives and Risk Hedging'
          ],
          lectures_count: 32
        }
      })
    );
    const { data: draftData } = await parseResponse(draftRes);
    const courseId = draftData.data.id;
    expect(draftData.data.status).toBe('pending');
    expect(draftData.data.price).toBe(0);

    // Step 3: Institute Administrator reviews draft, sets official GHS price and publishes
    const adminApprovalRes = await patchCourse(
      createRequest(`/api/courses/${courseId}`, {
        method: 'PATCH',
        body: {
          price: 1200,
          discount_price: 1100,
          status: 'published',
          assigned_tutor_id: tutorId
        }
      }),
      { params: Promise.resolve({ id: String(courseId) }) }
    );
    const { data: approvalData } = await parseResponse(adminApprovalRes);
    expect(approvalData.data.status).toBe('published');
    expect(approvalData.data.price).toBe(1200);
    expect(approvalData.data.discount_price).toBe(1100);

    // Step 4: Verify Tutor Academic Performance Center reflects assigned course
    const perfRes = await getInstructorPerformance(createRequest(`/api/instructor/performance?instructorId=${tutorId}`));
    const { data: perfData } = await parseResponse(perfRes);
    expect(perfData.data.total_assigned_courses).toBeGreaterThan(0);
    expect(perfData.data.wallet_balance_ghs).toBeUndefined();
  });

  // Scenario 3
  it('T4-SCENARIO-03: Physical Study Manual Purchase with Campus Collection (Accra Main) & Tracking Generation', async () => {
    const studentId = 103;

    // Step 1: Browse for physical manual
    const bookRes = await getBooks(createRequest('/api/shop/books?format=physical'));
    const { data: bookData } = await parseResponse(bookRes);
    const physicalManual = bookData.data.find((b: any) => b.id === 'b102');
    expect(physicalManual).toBeDefined();

    // Step 2: Select campus collection at Accra Main
    const fulfillRes = await postFulfillment(
      createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: studentId,
          bookId: physicalManual.id,
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main'
        }
      })
    );
    const { data: fulfillData } = await parseResponse(fulfillRes);
    expect(fulfillData.data.pickup_campus).toBe('Accra Main');
    const collectionCode = fulfillData.data.collection_code;
    expect(collectionCode).toBeDefined();

    // Step 3: Pay for physical study manual via Paystack
    const checkoutRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'abena.boateng@icag.edu.gh',
          amount_ghs: physicalManual.price_ghs,
          billingDetails: {
            userId: studentId,
            studentName: 'Abena Boateng',
            icagId: 'ICAG/REG/2026/0881'
          },
          cartItems: [
            {
              id: 'cart_b102',
              type: 'book',
              book_id: physicalManual.id,
              title: physicalManual.title,
              price_ghs: physicalManual.price_ghs,
              delivery_type: 'campus_pickup',
              pickup_campus: 'Accra Main'
            }
          ]
        }
      })
    );
    const { data: checkoutData } = await parseResponse(checkoutRes);
    const ref = checkoutData.data.reference;

    // Step 4: Verify payment and generate digital invoice
    await verifyPaystack(createRequest('/api/payments/paystack/verify', { method: 'POST', body: { reference: ref } }));

    // Step 5: Download digital invoice confirming collection details
    const invoiceRes = await getInvoice(createRequest(`/api/invoices/${ref}`), { params: Promise.resolve({ reference: ref }) });
    const { data: invoiceData } = await parseResponse(invoiceRes);
    expect(invoiceData.data.items[0].title).toBe(physicalManual.title);
    expect(invoiceData.data.total_ghs).toBe(physicalManual.price_ghs);
  });

  // Scenario 4
  it('T4-SCENARIO-04: Virtual Classroom Live Lecture: Enrolled Student Access vs Unenrolled Student 403 Rejection', async () => {
    const courseId = 201; // Public Sector Accounting Level 2
    const enrolledStudentId = 104;
    const unenrolledStudentId = 105;

    mockStore.enroll(enrolledStudentId, courseId);

    // Step 1: Unenrolled student attempts access -> 403 Forbidden
    const unenrolledRes = await getRoom(
      createRequest(`/api/room/${courseId}?userId=${unenrolledStudentId}&role=student`),
      { params: Promise.resolve({ courseId: String(courseId) }) }
    );
    const { status: unenrolledStatus, data: unenrolledData } = await parseResponse(unenrolledRes);
    expect(unenrolledStatus).toBe(403);
    expect(unenrolledData.error).toContain('Access denied');

    // Step 2: Enrolled student accesses virtual classroom hub -> 200 OK
    const enrolledRes = await getRoom(
      createRequest(`/api/room/${courseId}?userId=${enrolledStudentId}&role=student`),
      { params: Promise.resolve({ courseId: String(courseId) }) }
    );
    const { status: enrolledStatus, data: enrolledData } = await parseResponse(enrolledRes);
    expect(enrolledStatus).toBe(200);
    expect(enrolledData.data.live_lecture.zoom_join_url).toMatch(/^https:\/\/icag-ghana\.zoom\.us\/j\//);

    // Step 3: Enrolled student posts academic inquiry in course discussion channel
    const postRes = await postDiscussion(
      createRequest(`/api/room/${courseId}/discussions`, {
        method: 'POST',
        body: {
          userId: enrolledStudentId,
          authorName: 'Enrolled Scholar',
          authorRole: 'student',
          content: 'Could you review the IPSAS 24 presentation of budget information in financial statements?'
        }
      }),
      { params: Promise.resolve({ courseId: String(courseId) }) }
    );
    expect(postRes.status).toBe(201);

    // Step 4: Verify discussion persists in room
    const discListRes = await getDiscussions(createRequest(`/api/room/${courseId}/discussions`), {
      params: Promise.resolve({ courseId: String(courseId) })
    });
    const { data: discListData } = await parseResponse(discListRes);
    const exists = discListData.data.some((d: any) => d.content.includes('IPSAS 24'));
    expect(exists).toBe(true);
  });

  // Scenario 5
  it('T4-SCENARIO-05: Full ICAG Accountancy Student Multi-Course Progression (Level 1 to Level 2) with Duplicate Prevention', async () => {
    const studentId = 106;

    // Step 1: Student enrolls in Level 1 course 101
    mockStore.enroll(studentId, 101);
    expect(mockStore.isEnrolled(studentId, 101)).toBe(true);

    // Step 2: Student attempts to re-purchase Level 1 course 101 -> double-charging waived
    const duplicateCheckRes = await postBundle(
      createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: studentId, courseId: 101, isBundleSelected: false }
      })
    );
    const { data: duplicateData } = await parseResponse(duplicateCheckRes);
    expect(duplicateData.double_charge_prevented).toBe(true);
    expect(duplicateData.total_ghs).toBe(0);

    // Step 3: Student progresses to Level 2 course 201 purchase
    const level2Res = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'progressing.student@icag.edu.gh',
          amount_ghs: 850,
          billingDetails: { userId: studentId, studentName: 'Kwesi Progress' },
          cartItems: [{ id: 'c201', type: 'course', course_id: 201, title: 'Public Sector Accounting Level 2', price_ghs: 850 }]
        }
      })
    );
    const { data: level2Data } = await parseResponse(level2Res);
    const ref = level2Data.data.reference;

    await verifyPaystack(createRequest('/api/payments/paystack/verify', { method: 'POST', body: { reference: ref } }));

    // Step 4: Student now holds active enrollments in both Level 1 and Level 2
    expect(mockStore.isEnrolled(studentId, 101)).toBe(true);
    expect(mockStore.isEnrolled(studentId, 201)).toBe(true);
  });

  // Scenario 6
  it('T4-SCENARIO-06: Course Discussion, Academic Q&A, and Zoom Join URL Resolution for Faculty Lead vs Enrolled Student', async () => {
    const courseId = 101;
    const tutorId = 1; // Faculty lead for 101
    const studentId = 10; // Enrolled student for 101

    // Step 1: Faculty lead accesses room and posts announcement
    const tutorRoomRes = await getRoom(
      createRequest(`/api/room/${courseId}?userId=${tutorId}&role=tutor`),
      { params: Promise.resolve({ courseId: String(courseId) }) }
    );
    const { status: tutorStatus, data: tutorRoomData } = await parseResponse(tutorRoomRes);
    expect(tutorStatus).toBe(200);
    expect(tutorRoomData.data.live_lecture.zoom_join_url).toBeDefined();

    // Step 2: Faculty lead posts lecture notes PDF
    const uploadRes = await postMaterial(
      createRequest(`/api/room/${courseId}/materials`, {
        method: 'POST',
        body: {
          courseId,
          title: 'Module 3: Accounting for Property, Plant and Equipment (IAS 16)',
          fileUrl: '/materials/course101/ias16-complete.pdf',
          fileType: 'pdf',
          uploadedBy: tutorId
        }
      }),
      { params: Promise.resolve({ courseId: String(courseId) }) }
    );
    expect(uploadRes.status).toBe(201);

    // Step 3: Enrolled student reads materials in room hub
    const studentRoomRes = await getRoom(
      createRequest(`/api/room/${courseId}?userId=${studentId}&role=student`),
      { params: Promise.resolve({ courseId: String(courseId) }) }
    );
    const { data: studentRoomData } = await parseResponse(studentRoomRes);
    const hasMaterial = studentRoomData.data.study_materials.some((m: any) => m.title.includes('IAS 16'));
    expect(hasMaterial).toBe(true);
  });

  // Scenario 7
  it('T4-SCENARIO-07: Digital Study Manual DRM Reader Session Creation, Token Verification, and Streaming', async () => {
    const studentId = 107;
    const bookId = 'b201'; // Public Sector Accounting Guide

    // Step 1: Student not entitled receives 403 when requesting DRM session
    const preDrmRes = await postDrm(
      createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: studentId, bookId }
      })
    );
    expect(preDrmRes.status).toBe(403);

    // Step 2: Student purchases digital study manual
    mockStore.grantBook(studentId, bookId);

    // Step 3: Request authenticated DRM reader session
    const drmRes = await postDrm(
      createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: studentId, bookId }
      })
    );
    const { status, data: drmData } = await parseResponse(drmRes);
    expect(status).toBe(200);
    expect(drmData.drm_session_token).toBeDefined();
    expect(drmData.stream_endpoint).toContain(`/api/shop/drm/stream?token=${drmData.drm_session_token}`);
    expect(drmData.watermark).toBe(`Licensed to ICAG Student ID: ${studentId}`);
  });

  // Scenario 8
  it('T4-SCENARIO-08: Paystack Payment Webhook Signature Verification, Idempotent Processing, and PDF Invoice Download', async () => {
    const studentId = 108;
    const amount = 850;

    // Step 1: Initialize Paystack checkout
    const initRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'webhook.audit@icag.edu.gh',
          amount_ghs: amount,
          billingDetails: {
            userId: studentId,
            studentName: 'Audit Candidate',
            icagId: 'ICAG/REG/2026/0999'
          },
          cartItems: [{ id: 'c201', type: 'course', course_id: 201, title: 'Public Sector Accounting', price_ghs: 850 }]
        }
      })
    );
    const { data: initData } = await parseResponse(initRes);
    const ref = initData.data.reference;

    // Step 2: Asynchronous Paystack webhook delivery with HMAC verification
    const webhookRes = await webhookPaystack(
      createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'mock-valid-signature' },
        body: { event: 'charge.success', data: { reference: ref } }
      })
    );
    const { status: hookStatus, data: hookData } = await parseResponse(webhookRes);
    expect(hookStatus).toBe(200);
    expect(hookData.status).toBe(true);

    // Step 3: Confirm student entitlement granted
    expect(mockStore.isEnrolled(studentId, 201)).toBe(true);

    // Step 4: Redelivery of duplicate webhook is idempotent
    const duplicateWebhookRes = await webhookPaystack(
      createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'mock-valid-signature' },
        body: { event: 'charge.success', data: { reference: ref } }
      })
    );
    expect(duplicateWebhookRes.status).toBe(200);

    // Step 5: Download official digital PDF invoice
    const invRes = await getInvoice(createRequest(`/api/invoices/${ref}`), { params: Promise.resolve({ reference: ref }) });
    const { data: invData } = await parseResponse(invRes);
    expect(invData.data.student_name).toBe('Audit Candidate');
    expect(invData.data.currency_symbol).toBe('GH₵');
    expect(invData.data.download_pdf_url).toContain(`/api/invoices/${ref}/pdf`);
    expect(invData.data.institution.name).toContain('Institute of Chartered Accountants (Ghana)');
  });
});
