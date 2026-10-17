import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '@/lib/mockApiStore';
import { GET as getCourses, POST as postCourse } from '@/app/api/courses/route';
import { GET as getCourseById, PATCH as patchCourse } from '@/app/api/courses/[id]/route';
import { GET as getBooks } from '@/app/api/shop/books/route';
import { POST as postBundle } from '@/app/api/shop/bundles/route';
import { POST as postFulfillment } from '@/app/api/shop/fulfillment/route';
import { POST as postDrm } from '@/app/api/shop/drm/route';
import { GET as getRoom } from '@/app/api/room/[courseId]/route';
import { GET as getMaterials, POST as postMaterial } from '@/app/api/room/[courseId]/materials/route';
import { POST as initPaystack } from '@/app/api/payments/paystack/initialize/route';
import { POST as verifyPaystack } from '@/app/api/payments/paystack/verify/route';
import { POST as webhookPaystack } from '@/app/api/payments/paystack/webhook/route';
import { GET as getInvoice } from '@/app/api/invoices/[reference]/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

describe('Tier 3: Cross-Feature Pairwise Integrations (Features 1 - 16)', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  it('T3-PAIR-01 (F1 + F3): Tutor submits draft without price; Admin assigns official GHS pricing', async () => {
    // F1: Tutor submits draft, price defaults to 0
    const draftRes = await postCourse(
      createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Financial Management Review',
          level: 'Level 2',
          assigned_tutor_id: 2,
          syllabus: ['Working Capital', 'Capital Budgeting']
        }
      })
    );
    const { data: draftData } = await parseResponse(draftRes);
    const courseId = draftData.data.id;
    expect(draftData.data.price).toBe(0);

    // F3: Admin reviews and sets official price in GHS
    const patchRes = await patchCourse(
      createRequest(`/api/courses/${courseId}`, {
        method: 'PATCH',
        body: { price: 820, discount_price: 780, status: 'published' }
      }),
      { params: Promise.resolve({ id: String(courseId) }) }
    );
    const { data: patchData } = await parseResponse(patchRes);
    expect(patchData.data.price).toBe(820);
    expect(patchData.data.discount_price).toBe(780);
    expect(patchData.data.status).toBe('published');
  });

  it('T3-PAIR-02 (F2 + F5): Tutor curriculum draft is approved and published into catalog', async () => {
    // F2: Submit draft
    const draftRes = await postCourse(
      createRequest('/api/courses', {
        method: 'POST',
        body: {
          title: 'Advanced Public Finance',
          level: 'Level 3',
          assigned_tutor_id: 1
        }
      })
    );
    const { data: draftData } = await parseResponse(draftRes);
    const courseId = draftData.data.id;

    // Approve & publish
    await patchCourse(
      createRequest(`/api/courses/${courseId}`, {
        method: 'PATCH',
        body: { status: 'published', price: 950 }
      }),
      { params: Promise.resolve({ id: String(courseId) }) }
    );

    // F5: Catalog query discovers published course
    const catalogRes = await getCourses(createRequest('/api/courses?level=Level 3&status=published'));
    const { data: catalogData } = await parseResponse(catalogRes);
    const found = catalogData.data.find((c: any) => c.id === courseId);
    expect(found).toBeDefined();
    expect(found.status).toBe('published');
  });

  it('T3-PAIR-03 (F3 + F13): Admin pricing in Ghanaian Cedis formats correctly in course details', async () => {
    await patchCourse(
      createRequest('/api/courses/102', {
        method: 'PATCH',
        body: { price: 680, discount_price: 620 }
      }),
      { params: Promise.resolve({ id: '102' }) }
    );

    const detailRes = await getCourseById(createRequest('/api/courses/102'), {
      params: Promise.resolve({ id: '102' })
    });
    const { data } = await parseResponse(detailRes);
    expect(data.data.price).toBe(680);
    expect(data.data.discount_price).toBe(620);
  });

  it('T3-PAIR-04 (F5 + F6): Bookstore catalog companion book bundles with Level 1 course', async () => {
    // F5: Retrieve book from bookstore
    const booksRes = await getBooks(createRequest('/api/shop/books?level=Level 1'));
    const { data: booksData } = await parseResponse(booksRes);
    const companionBook = booksData.data[0];
    expect(companionBook).toBeDefined();

    // F6: Bundle book with course
    const bundleRes = await postBundle(
      createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: companionBook.id, isBundleSelected: true }
      })
    );
    const { data: bundleData } = await parseResponse(bundleRes);
    expect(bundleData.mode).toBe('bundle');
    expect(bundleData.book.id).toBe(companionBook.id);
    expect(bundleData.bundle_discount_ghs).toBe(50);
  });

  it('T3-PAIR-05 (F6 + F8): Bundle selection with already owned textbook waives book charge', async () => {
    // User 10 owns b101
    const bundleRes = await postBundle(
      createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: 10, courseId: 102, bookId: 'b101', isBundleSelected: true }
      })
    );
    const { data } = await parseResponse(bundleRes);
    expect(data.book.already_owned).toBe(true);
    expect(data.book.effective_charge_ghs).toBe(0);
    expect(data.double_charge_prevented).toBe(true);
    // Student only pays course price (600 GHS)
    expect(data.total_ghs).toBe(600);
  });

  it('T3-PAIR-06 (F6 + F14): Course + companion textbook bundle executes Paystack MoMo payment', async () => {
    const bundleRes = await postBundle(
      createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { courseId: 101, bookId: 'b101', isBundleSelected: true }
      })
    );
    const { data: bundleData } = await parseResponse(bundleRes);
    const totalToPay = bundleData.total_ghs; // 700 GHS

    const initRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'bundle.student@icag.edu.gh',
          amount_ghs: totalToPay,
          paymentChannel: 'mobile_money',
          billingDetails: { userId: 70, studentName: 'Esi Mensah' },
          cartItems: [
            {
              id: 'bun_101',
              type: 'bundle',
              course_id: 101,
              book_id: 'b101',
              title: 'Financial Accounting Course + Study Text',
              price_ghs: 750,
              bundle_discount_ghs: 50
            }
          ]
        }
      })
    );
    const { status, data: initData } = await parseResponse(initRes);
    expect(status).toBe(200);
    expect(initData.data.amount_in_pesewas).toBe(70000);
    expect(initData.data.reference).toBeDefined();
  });

  it('T3-PAIR-07 (F7 + F15): Physical manual campus collection generates pickup code and invoice', async () => {
    // F7: Campus collection request
    const pickupRes = await postFulfillment(
      createRequest('/api/shop/fulfillment', {
        method: 'POST',
        body: {
          userId: 71,
          bookId: 'b102',
          deliveryType: 'campus_pickup',
          pickupCampus: 'Accra Main'
        }
      })
    );
    const { data: pickupData } = await parseResponse(pickupRes);
    expect(pickupData.data.collection_code).toMatch(/^ICAG-COL-\d+$/);

    // F15: Payment and Invoice generation
    const initRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'pickup@icag.edu.gh',
          amount_ghs: 140,
          billingDetails: { userId: 71, studentName: 'Kofi Campus', icagId: 'ICAG/ACC/2026/05' },
          cartItems: [{ id: 'b102', type: 'book', book_id: 'b102', title: 'Business Law Manual', price_ghs: 140 }]
        }
      })
    );
    const { data: initData } = await parseResponse(initRes);
    const ref = initData.data.reference;

    await verifyPaystack(createRequest('/api/payments/paystack/verify', { method: 'POST', body: { reference: ref } }));

    const invRes = await getInvoice(createRequest(`/api/invoices/${ref}`), { params: Promise.resolve({ reference: ref }) });
    const { data: invData } = await parseResponse(invRes);
    expect(invData.data.items[0].title).toBe('Business Law Manual');
    expect(invData.data.student_name).toBe('Kofi Campus');
  });

  it('T3-PAIR-08 (F7 + F16): Digital study manual checkout grants DRM reading session token', async () => {
    const studentId = 72;
    // Pay for digital manual
    const initRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'digital@icag.edu.gh',
          amount_ghs: 180,
          billingDetails: { userId: studentId },
          cartItems: [{ id: 'b201', type: 'book', book_id: 'b201', title: 'Public Sector Guide', price_ghs: 180 }]
        }
      })
    );
    const { data: initData } = await parseResponse(initRes);
    const ref = initData.data.reference;

    // F16: Fulfill entitlement via verification
    await verifyPaystack(createRequest('/api/payments/paystack/verify', { method: 'POST', body: { reference: ref } }));
    expect(mockStore.ownsBook(studentId, 'b201')).toBe(true);

    // F7: Start DRM session
    const drmRes = await postDrm(
      createRequest('/api/shop/drm', {
        method: 'POST',
        body: { userId: studentId, bookId: 'b201' }
      })
    );
    const { status, data: drmData } = await parseResponse(drmRes);
    expect(status).toBe(200);
    expect(drmData.drm_session_token).toBeDefined();
    expect(drmData.watermark).toContain(`ICAG Student ID: ${studentId}`);
  });

  it('T3-PAIR-09 (F8 + F14): Duplicate enrollment detection waives course fee before Paystack checkout', async () => {
    const studentId = 10; // Already enrolled in course 101
    const bundleRes = await postBundle(
      createRequest('/api/shop/bundles', {
        method: 'POST',
        body: { userId: studentId, courseId: 101, isBundleSelected: false }
      })
    );
    const { data: bundleData } = await parseResponse(bundleRes);
    expect(bundleData.course.already_enrolled).toBe(true);
    expect(bundleData.total_ghs).toBe(0);
    expect(bundleData.double_charge_prevented).toBe(true);
  });

  it('T3-PAIR-10 (F9 + F10): Virtual classroom hub embeds authenticated Zoom link for enrolled student', async () => {
    const req = createRequest('/api/room/101?userId=10&role=student');
    const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
    const { status, data } = await parseResponse(res);
    expect(status).toBe(200);
    expect(data.data.live_lecture.zoom_join_url).toMatch(/^https:\/\/icag-ghana\.zoom\.us\/j\//);
    expect(data.data.live_lecture.passcode).toBe('ICAG2026');
  });

  it('T3-PAIR-11 (F9 + F11): Virtual classroom hub enforces strict 403 barrier against unenrolled student', async () => {
    const req = createRequest('/api/room/101?userId=88&role=student');
    const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
    const { status, data } = await parseResponse(res);
    expect(status).toBe(403);
    expect(data.error).toContain('Access denied');
  });

  it('T3-PAIR-12 (F10 + F11): Unenrolled student receiving 403 cannot access Zoom join credentials', async () => {
    const req = createRequest('/api/room/101?userId=89&role=student');
    const res = await getRoom(req, { params: Promise.resolve({ courseId: '101' }) });
    const { status, data } = await parseResponse(res);
    expect(status).toBe(403);
    expect(data.data).toBeUndefined();
  });

  it('T3-PAIR-13 (F11 + F16): Paystack payment verification instantly converts 403 barrier to 200 OK classroom access', async () => {
    const studentId = 75;
    // Step 1: Pre-payment access is 403
    const preRes = await getRoom(createRequest(`/api/room/102?userId=${studentId}&role=student`), {
      params: Promise.resolve({ courseId: '102' })
    });
    expect(preRes.status).toBe(403);

    // Step 2: Pay via Paystack
    const initRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'instant@icag.edu.gh',
          amount_ghs: 600,
          billingDetails: { userId: studentId },
          cartItems: [{ id: 'c102', type: 'course', course_id: 102, title: 'Business Law', price_ghs: 600 }]
        }
      })
    );
    const { data: initData } = await parseResponse(initRes);
    const ref = initData.data.reference;

    // Step 3: Verify payment
    await verifyPaystack(createRequest('/api/payments/paystack/verify', { method: 'POST', body: { reference: ref } }));

    // Step 4: Post-payment access is now 200 OK!
    const postRes = await getRoom(createRequest(`/api/room/102?userId=${studentId}&role=student`), {
      params: Promise.resolve({ courseId: '102' })
    });
    const { status: postStatus, data: postData } = await parseResponse(postRes);
    expect(postStatus).toBe(200);
    expect(postData.data.course_id).toBe(102);
  });

  it('T3-PAIR-14 (F12 + F9): Lecture materials uploaded in classroom hub persist across page reloads', async () => {
    // Upload material
    await postMaterial(
      createRequest('/api/room/101/materials', {
        method: 'POST',
        body: {
          courseId: 101,
          title: 'IFRS 15 Revenue Contract Matrix',
          fileUrl: '/materials/course101/ifrs15-matrix.pdf',
          fileType: 'pdf',
          uploadedBy: 1
        }
      }),
      { params: Promise.resolve({ courseId: '101' }) }
    );

    // Query room hub
    const roomRes = await getRoom(createRequest('/api/room/101?userId=10&role=student'), {
      params: Promise.resolve({ courseId: '101' })
    });
    const { data: roomData } = await parseResponse(roomRes);
    const material = roomData.data.study_materials.find((m: any) => m.title.includes('IFRS 15 Revenue Contract Matrix'));
    expect(material).toBeDefined();
    expect(material.file_type).toBe('pdf');
  });

  it('T3-PAIR-15 (F13 + F15): Digital invoice reflects universal GHS formatting and line item subtotals', async () => {
    const initRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'currency@icag.edu.gh',
          amount_ghs: 850,
          billingDetails: { studentName: 'Ama Osei', icagId: 'ICAG/2026/777' },
          cartItems: [{ id: 'c201', type: 'course', course_id: 201, title: 'Public Sector Finance', price_ghs: 850 }]
        }
      })
    );
    const { data: initData } = await parseResponse(initRes);
    const ref = initData.data.reference;

    await verifyPaystack(createRequest('/api/payments/paystack/verify', { method: 'POST', body: { reference: ref } }));

    const invRes = await getInvoice(createRequest(`/api/invoices/${ref}`), { params: Promise.resolve({ reference: ref }) });
    const { data: invData } = await parseResponse(invRes);
    expect(invData.data.currency).toBe('GHS');
    expect(invData.data.currency_symbol).toBe('GH₵');
    expect(invData.data.total_ghs).toBe(850);
  });

  it('T3-PAIR-16 (F14 + F16): Paystack webhook receipt automatically and idempotently fulfills course enrollment', async () => {
    const studentId = 77;
    expect(mockStore.isEnrolled(studentId, 301)).toBe(false);

    const initRes = await initPaystack(
      createRequest('/api/payments/paystack/initialize', {
        method: 'POST',
        body: {
          email: 'webhook.pair@icag.edu.gh',
          amount_ghs: 1000,
          billingDetails: { userId: studentId, studentName: 'Webhook Pair Student' },
          cartItems: [{ id: 'c301', type: 'course', course_id: 301, title: 'Advanced Taxation', price_ghs: 1000 }]
        }
      })
    );
    const { data: initData } = await parseResponse(initRes);
    const ref = initData.data.reference;

    // Webhook executes
    const hookRes = await webhookPaystack(
      createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'mock-valid-signature' },
        body: { event: 'charge.success', data: { reference: ref } }
      })
    );
    expect(hookRes.status).toBe(200);
    expect(mockStore.isEnrolled(studentId, 301)).toBe(true);

    // Duplicate webhook execution remains idempotent
    const duplicateRes = await webhookPaystack(
      createRequest('/api/payments/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'mock-valid-signature' },
        body: { event: 'charge.success', data: { reference: ref } }
      })
    );
    expect(duplicateRes.status).toBe(200);
    expect(mockStore.isEnrolled(studentId, 301)).toBe(true);
  });
});
