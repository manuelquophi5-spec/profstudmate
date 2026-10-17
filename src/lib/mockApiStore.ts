export interface BookRef {
  id: string;
  title: string;
  price_ghs: number;
  format: 'digital' | 'physical' | 'both';
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  price: number; // Institutional price in GHS (set by Admin)
  discount_price?: number; // Institutional discount in GHS (set by Admin)
  status: 'draft' | 'pending' | 'published' | 'rejected';
  assigned_tutor_id: number;
  level: 'Level 1' | 'Level 2' | 'Level 3';
  syllabus?: string[];
  lectures_count?: number;
  attached_books?: BookRef[];
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  level: 'Level 1' | 'Level 2' | 'Level 3';
  format: 'digital' | 'physical' | 'both';
  price_ghs: number;
  isbn?: string;
  cover_image: string;
  is_available: boolean;
  stock_quantity?: number;
}

export interface CartItem {
  id: string;
  type: 'course' | 'book' | 'bundle';
  course_id?: number;
  book_id?: string;
  title: string;
  price_ghs: number;
  is_bundle?: boolean;
  bundle_discount_ghs?: number;
  delivery_type?: 'digital' | 'shipping' | 'campus_pickup';
  pickup_campus?: 'Accra Main' | 'Kumasi' | 'Takoradi';
}

export interface ClassroomDiscussion {
  id: string;
  course_id: number;
  user_id: number;
  author_name: string;
  author_role: 'admin' | 'tutor' | 'student';
  content: string;
  created_at: string;
}

export interface AcademicMaterial {
  id: string;
  course_id: number;
  title: string;
  file_url: string;
  file_type: 'pdf' | 'slides' | 'notes';
  uploaded_by: number;
  created_at: string;
}

export interface PaystackTransaction {
  reference: string;
  user_id: number;
  email: string;
  amount_in_pesewas: number;
  currency: 'GHS';
  status: 'pending' | 'success' | 'failed';
  cart_items: CartItem[];
  billing_details: {
    student_name: string;
    icag_id?: string;
    phone: string;
    address?: string;
  };
  paid_at?: string;
}

export interface Invoice {
  invoice_number: string;
  reference: string;
  user_id: number;
  student_name: string;
  icag_id: string;
  currency: 'GHS';
  items: {
    title: string;
    type: string;
    price_ghs: number;
    bundle_discount_ghs?: number;
    final_price_ghs: number;
  }[];
  subtotal_ghs: number;
  discount_total_ghs: number;
  total_ghs: number;
  issued_at: string;
  payment_method: 'Paystack Card' | 'MTN Mobile Money' | 'Telecel Cash' | 'AT Money';
}

// Initial deterministic state
const initialCourses: Course[] = [
  {
    id: 101,
    title: 'Financial Accounting (Level 1)',
    slug: 'financial-accounting-level-1',
    price: 650,
    discount_price: 600,
    status: 'published',
    assigned_tutor_id: 1,
    level: 'Level 1',
    syllabus: ['Intro to Accounting Standards', 'Double Entry Ledger', 'Financial Statements Presentation'],
    lectures_count: 24,
    attached_books: [
      { id: 'b101', title: 'ICAG Financial Accounting Study Text', price_ghs: 150, format: 'both' }
    ]
  },
  {
    id: 102,
    title: 'Business Management & Law (Level 1)',
    slug: 'business-management-and-law-level-1',
    price: 600,
    status: 'published',
    assigned_tutor_id: 2,
    level: 'Level 1',
    syllabus: ['Ghanaian Commercial Law', 'Corporate Governance Principles', 'Contracts & Sales'],
    lectures_count: 18,
    attached_books: [
      { id: 'b102', title: 'Business Law Manual & Question Bank', price_ghs: 140, format: 'physical' }
    ]
  },
  {
    id: 201,
    title: 'Public Sector Accounting & Finance (Level 2)',
    slug: 'public-sector-accounting-finance-level-2',
    price: 850,
    status: 'published',
    assigned_tutor_id: 1,
    level: 'Level 2',
    syllabus: ['PFMA Act 2016', 'IPSAS Framework', 'Public Budgeting'],
    lectures_count: 30
  },
  {
    id: 301,
    title: 'Advanced Taxation & Fiscal Policy (Level 3)',
    slug: 'advanced-taxation-fiscal-policy-level-3',
    price: 1100,
    discount_price: 1000,
    status: 'published',
    assigned_tutor_id: 3,
    level: 'Level 3',
    syllabus: ['Ghana Revenue Authority Tax Acts', 'Transfer Pricing Regulations', 'International Taxation'],
    lectures_count: 36
  }
];

const initialBooks: Book[] = [
  {
    id: 'b101',
    title: 'ICAG Financial Accounting Study Text',
    slug: 'icag-financial-accounting-study-text',
    level: 'Level 1',
    format: 'both',
    price_ghs: 150,
    isbn: '978-9988-1-2345-1',
    cover_image: '/images/books/financial-acc.jpg',
    is_available: true,
    stock_quantity: 45
  },
  {
    id: 'b102',
    title: 'Business Law Manual & Question Bank',
    slug: 'business-law-manual-question-bank',
    level: 'Level 1',
    format: 'physical',
    price_ghs: 140,
    isbn: '978-9988-1-2345-2',
    cover_image: '/images/books/bus-law.jpg',
    is_available: true,
    stock_quantity: 30
  },
  {
    id: 'b201',
    title: 'Public Sector Accounting Guide (Level 2)',
    slug: 'public-sector-accounting-guide',
    level: 'Level 2',
    format: 'digital',
    price_ghs: 180,
    isbn: '978-9988-2-3456-3',
    cover_image: '/images/books/public-sector.jpg',
    is_available: true,
    stock_quantity: 100
  },
  {
    id: 'b301',
    title: 'Advanced Taxation Practice Manual (Level 3)',
    slug: 'advanced-taxation-practice-manual',
    level: 'Level 3',
    format: 'both',
    price_ghs: 220,
    isbn: '978-9988-3-4567-4',
    cover_image: '/images/books/adv-tax.jpg',
    is_available: true,
    stock_quantity: 20
  }
];

// In-memory state
class MockStore {
  courses: Course[] = JSON.parse(JSON.stringify(initialCourses));
  books: Book[] = JSON.parse(JSON.stringify(initialBooks));
  enrollments: Map<number, Set<number>> = new Map([
    // user 10 (student) enrolled in course 101
    [10, new Set([101])]
  ]);
  ownedBooks: Map<number, Set<string>> = new Map([
    // user 10 owns book b101
    [10, new Set(['b101'])]
  ]);
  discussions: ClassroomDiscussion[] = [
    {
      id: 'd1',
      course_id: 101,
      user_id: 1,
      author_name: 'Dr. Kwesi Appiah (Lead Tutor)',
      author_role: 'tutor',
      content: 'Welcome to Financial Accounting Level 1. Please download the revised syllabus and read Module 1 before tomorrow.',
      created_at: '2026-10-10T09:00:00Z'
    },
    {
      id: 'd2',
      course_id: 101,
      user_id: 10,
      author_name: 'Kofi Mensah',
      author_role: 'student',
      content: 'Could you clarify the IFRS 15 revenue recognition principles for long-term construction contracts?',
      created_at: '2026-10-11T14:30:00Z'
    }
  ];
  materials: AcademicMaterial[] = [
    {
      id: 'm1',
      course_id: 101,
      title: 'Week 1 Lecture Slides - Framework & IAS 1',
      file_url: '/materials/course101/week1-ias1.pdf',
      file_type: 'slides',
      uploaded_by: 1,
      created_at: '2026-10-09T10:00:00Z'
    }
  ];
  transactions: Map<string, PaystackTransaction> = new Map();
  invoices: Map<string, Invoice> = new Map();
  drmSessions: Map<string, { userId: number; bookId: string; expiresAt: number }> = new Map();
  fulfillmentOrders: Map<string, any> = new Map();

  reset() {
    this.courses = JSON.parse(JSON.stringify(initialCourses));
    this.books = JSON.parse(JSON.stringify(initialBooks));
    this.enrollments = new Map([
      [10, new Set([101])]
    ]);
    this.ownedBooks = new Map([
      [10, new Set(['b101'])]
    ]);
    this.discussions = [
      {
        id: 'd1',
        course_id: 101,
        user_id: 1,
        author_name: 'Dr. Kwesi Appiah (Lead Tutor)',
        author_role: 'tutor',
        content: 'Welcome to Financial Accounting Level 1. Please download the revised syllabus and read Module 1 before tomorrow.',
        created_at: '2026-10-10T09:00:00Z'
      },
      {
        id: 'd2',
        course_id: 101,
        user_id: 10,
        author_name: 'Kofi Mensah',
        author_role: 'student',
        content: 'Could you clarify the IFRS 15 revenue recognition principles for long-term construction contracts?',
        created_at: '2026-10-11T14:30:00Z'
      }
    ];
    this.materials = [
      {
        id: 'm1',
        course_id: 101,
        title: 'Week 1 Lecture Slides - Framework & IAS 1',
        file_url: '/materials/course101/week1-ias1.pdf',
        file_type: 'slides',
        uploaded_by: 1,
        created_at: '2026-10-09T10:00:00Z'
      }
    ];
    this.transactions.clear();
    this.invoices.clear();
    this.drmSessions.clear();
    this.fulfillmentOrders.clear();
  }

  isEnrolled(userId: number, courseId: number): boolean {
    return this.enrollments.get(userId)?.has(courseId) ?? false;
  }

  enroll(userId: number, courseId: number) {
    if (!this.enrollments.has(userId)) {
      this.enrollments.set(userId, new Set());
    }
    this.enrollments.get(userId)!.add(courseId);
  }

  ownsBook(userId: number, bookId: string): boolean {
    return this.ownedBooks.get(userId)?.has(bookId) ?? false;
  }

  grantBook(userId: number, bookId: string) {
    if (!this.ownedBooks.has(userId)) {
      this.ownedBooks.set(userId, new Set());
    }
    this.ownedBooks.get(userId)!.add(bookId);
  }
}

export const mockStore = new MockStore();
