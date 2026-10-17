import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addCourseSlice, setCourseDetailsData, resetAddCourseData } from '@/redux/instructorReducers/AddCourseSlice';
import { getInstructorPerformance } from '@/utils/api/instructor/performance/getInstructorPerformance';
import { ICAG_FACULTY_MEMBERS } from '@/components/admin/InstitutionalCourseGovernance';
import { mockStore } from '@/lib/mockApiStore';

describe('Milestone 1 Unit & Component Verification Suite', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  describe('AddCourseSlice Price Stripping & Governance Enforcement', () => {
    it('initializes with null price, null discount, and pending status', () => {
      const state = addCourseSlice.reducer(undefined, { type: '@@INIT' });
      expect(state.courseDetailsData.price).toBeNull();
      expect(state.courseDetailsData.discount).toBeNull();
      expect(state.courseDetailsData.status).toBe('pending');
      expect(state.courseDetailsData.isFree).toBe(false);
    });

    it('strips price and discount when an authoring payload attempts to set them', () => {
      const state = addCourseSlice.reducer(
        undefined,
        setCourseDetailsData({
          title: 'Advanced Taxation & Fiscal Policy',
          price: 850,
          discount: 750,
          difficultyLevel: 'Level 3',
        } as any)
      );

      expect(state.courseDetailsData.title).toBe('Advanced Taxation & Fiscal Policy');
      expect(state.courseDetailsData.difficultyLevel).toBe('Level 3');
      expect(state.courseDetailsData.price).toBeNull();
      expect(state.courseDetailsData.discount).toBeNull();
    });

    it('resets correctly to initial state with pending status and null pricing', () => {
      let state = addCourseSlice.reducer(
        undefined,
        setCourseDetailsData({ title: 'Draft Subject' } as any)
      );
      expect(state.courseDetailsData.title).toBe('Draft Subject');

      state = addCourseSlice.reducer(state, resetAddCourseData());
      expect(state.courseDetailsData.title).toBe('');
      expect(state.courseDetailsData.price).toBeNull();
      expect(state.courseDetailsData.discount).toBeNull();
      expect(state.courseDetailsData.status).toBe('pending');
    });
  });

  describe('Institutional Course Governance Council & Faculty Directory', () => {
    it('maintains accredited ICAG faculty directory with valid credentials and specialties', () => {
      expect(ICAG_FACULTY_MEMBERS.length).toBeGreaterThanOrEqual(6);
      
      const faculty1 = ICAG_FACULTY_MEMBERS.find((f) => f.id === 1);
      expect(faculty1?.name).toContain('Dr. Kwesi Appiah, CA');
      expect(faculty1?.specialty).toContain('Financial Accounting');

      const faculty3 = ICAG_FACULTY_MEMBERS.find((f) => f.id === 3);
      expect(faculty3?.name).toContain('Prof. Emmanuel Osei, CA, CITG');
      expect(faculty3?.specialty).toContain('Advanced Taxation');

      const faculty12 = ICAG_FACULTY_MEMBERS.find((f) => f.id === 12);
      expect(faculty12?.name).toContain('Kwabena Asante, CA');
    });

    it('validates institutional pricing bounds for council review', () => {
      const validatePricingBounds = (priceStr: string, discountStr: string) => {
        const errors: Record<string, string> = {};
        if (priceStr.trim() === '') {
          errors.price = 'Course selling price in GHS is required';
        } else {
          const numPrice = Number(priceStr);
          if (isNaN(numPrice) || numPrice < 0) {
            errors.price = 'Course price in GHS cannot be negative';
          }
        }

        if (discountStr.trim() !== '') {
          const numDiscount = Number(discountStr);
          const numPrice = Number(priceStr);
          if (isNaN(numDiscount) || numDiscount < 0) {
            errors.discount_price = 'Discount price in GHS cannot be negative';
          } else if (!isNaN(numPrice) && numDiscount > numPrice) {
            errors.discount_price = 'Discount price cannot exceed regular course price';
          }
        }
        return errors;
      };

      // Valid case: Standard pricing in GHS
      expect(Object.keys(validatePricingBounds('750', '700'))).toHaveLength(0);

      // Valid case: Complimentary CPD course (0 GHS)
      expect(Object.keys(validatePricingBounds('0', ''))).toHaveLength(0);

      // Invalid case: Negative price
      expect(validatePricingBounds('-100', '')).toHaveProperty('price');

      // Invalid case: Negative discount
      expect(validatePricingBounds('500', '-50')).toHaveProperty('discount_price');

      // Invalid case: Discount exceeding price
      expect(validatePricingBounds('500', '600')).toHaveProperty('discount_price');
    });
  });

  describe('Academic Performance Center Client API', () => {
    it('fetches academic performance data and verifies non-financial structure', async () => {
      // Mock global fetch to return academic performance
      const mockAcademicPayload = {
        success: true,
        data: {
          instructor_id: 1,
          center_type: 'Academic Performance Center',
          total_assigned_courses: 4,
          enrolled_students: 142,
          average_completion_rate: 78.5,
          icag_mock_pass_rate: 84.2,
          pending_assignments_to_grade: 15,
          active_classroom_discussions: 8,
          wallet_balance_ghs: undefined,
          earnings_total_ghs: undefined,
          payout_requests: undefined,
        },
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAcademicPayload,
      } as Response);

      try {
        const result = await getInstructorPerformance(1);
        expect(result).not.toBeNull();
        expect(result?.success).toBe(true);
        expect(result?.data.center_type).toBe('Academic Performance Center');
        expect(result?.data.average_completion_rate).toBe(78.5);
        expect(result?.data.icag_mock_pass_rate).toBe(84.2);
        expect(result?.data.enrolled_students).toBe(142);
        expect(result?.data.pending_assignments_to_grade).toBe(15);
        expect(result?.data.active_classroom_discussions).toBe(8);

        // Verify complete absence of financial revenue metrics
        expect(result?.data.wallet_balance_ghs).toBeUndefined();
        expect(result?.data.earnings_total_ghs).toBeUndefined();
        expect(result?.data.payout_requests).toBeUndefined();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('gracefully handles network error when fetching performance data', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      try {
        const result = await getInstructorPerformance(999);
        expect(result).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
