import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/shop',
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { mockStore } from '@/lib/mockApiStore';
import bookstoreReducer, {
  bookstoreSlice,
  setBooks,
  setSelectedLevel,
  setSelectedFormat,
  setSearchQuery,
  grantBookAccess,
  setOwnedBookIds,
} from '@/redux/reducers/bookstoreSlice';
import cartReducer, { addBookToCart } from '@/redux/reducers/cartSlice';
import userReducer from '@/redux/reducers/userSlice';
import { Book } from '@/types/bookstore';
import { BookstoreCatalog } from '@/components/pagesComponent/shop/BookstoreCatalog';
import { BookCard } from '@/components/pagesComponent/shop/BookCard';
import { GET as getShopBooks } from '@/app/api/shop/books/route';
import { GET as getBooksApi } from '@/app/api/books/route';
import { GET as getBookById } from '@/app/api/shop/books/[id]/route';
import { createRequest, parseResponse } from '../../helpers/testClient';

const sampleBooks: Book[] = [
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
    stock_quantity: 45,
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
    stock_quantity: 30,
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
    stock_quantity: 100,
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
    is_available: false,
    stock_quantity: 0,
  },
];

function createTestStore(preloadedState?: any) {
  const rootReducer = combineReducers({
    bookstore: bookstoreReducer,
    cart: cartReducer,
    user: userReducer,
  });

  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}

describe('Feature 5: ICAG/ICAT Bookstore Catalog Unit & Component Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    mockStore.reset();
    container = document.createElement('div');
    document.body.appendChild(container);
    // Mock global fetch for BookstoreCatalog component API calls
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const parsedUrl = new URL(url, 'http://localhost:3000');
      const level = parsedUrl.searchParams.get('level');
      const format = parsedUrl.searchParams.get('format');
      const search = parsedUrl.searchParams.get('search');

      let filtered = [...mockStore.books];
      if (level && level !== 'All') {
        filtered = filtered.filter((b) => b.level.toLowerCase() === level.toLowerCase());
      }
      if (format && format !== 'all') {
        filtered = filtered.filter((b) => b.format === format || b.format === 'both');
      }
      if (search) {
        filtered = filtered.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()));
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: filtered, currency: 'GHS', total: filtered.length }),
      });
    });
  });

  describe('1. Bookstore Redux State Management', () => {
    it('initializes with default filters: All levels, all formats, empty query', () => {
      const state = bookstoreSlice.reducer(undefined, { type: '@@INIT' });
      expect(state.selectedLevel).toBe('All');
      expect(state.selectedFormat).toBe('all');
      expect(state.searchQuery).toBe('');
      expect(state.books).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('updates level filter accurately', () => {
      let state = bookstoreSlice.reducer(undefined, setSelectedLevel('Level 1'));
      expect(state.selectedLevel).toBe('Level 1');
      state = bookstoreSlice.reducer(state, setSelectedLevel('Level 2'));
      expect(state.selectedLevel).toBe('Level 2');
      state = bookstoreSlice.reducer(state, setSelectedLevel('Level 3'));
      expect(state.selectedLevel).toBe('Level 3');
      state = bookstoreSlice.reducer(state, setSelectedLevel('All'));
      expect(state.selectedLevel).toBe('All');
    });

    it('updates format filter accurately', () => {
      let state = bookstoreSlice.reducer(undefined, setSelectedFormat('digital'));
      expect(state.selectedFormat).toBe('digital');
      state = bookstoreSlice.reducer(state, setSelectedFormat('physical'));
      expect(state.selectedFormat).toBe('physical');
      state = bookstoreSlice.reducer(state, setSelectedFormat('all'));
      expect(state.selectedFormat).toBe('all');
    });

    it('updates search query accurately', () => {
      const state = bookstoreSlice.reducer(undefined, setSearchQuery('taxation'));
      expect(state.searchQuery).toBe('taxation');
    });

    it('sets books list in state', () => {
      const state = bookstoreSlice.reducer(undefined, setBooks(sampleBooks));
      expect(state.books.length).toBe(4);
      expect(state.books[0].title).toBe('ICAG Financial Accounting Study Text');
    });

    it('grants book access idempotently without duplicating ownedBookIds', () => {
      let state = bookstoreSlice.reducer(undefined, setOwnedBookIds(['b101']));
      expect(state.ownedBookIds).toEqual(['b101']);

      state = bookstoreSlice.reducer(state, grantBookAccess('b102'));
      expect(state.ownedBookIds).toEqual(['b101', 'b102']);

      // Attempt granting already owned book
      state = bookstoreSlice.reducer(state, grantBookAccess('b101'));
      expect(state.ownedBookIds).toEqual(['b101', 'b102']);
    });
  });

  describe('2. BookCard Component Rendering & Interactions', () => {
    it('renders book title, level badge, and GHS pricing with GH₵ currency symbol', () => {
      const store = createTestStore({
        bookstore: { books: sampleBooks, selectedLevel: 'All', selectedFormat: 'all', searchQuery: '', isLoading: false, error: null, ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <BookCard book={sampleBooks[0]} />
          </Provider>
        );
      });

      expect(container.textContent).toContain('ICAG Financial Accounting Study Text');
      expect(container.textContent).toContain('Level 1');
      expect(container.textContent).toContain('GH₵ 150.00');
      expect(container.textContent).toContain('In Stock (45)');
      expect(container.textContent).toContain('Digital & Physical');
      root.unmount();
    });

    it('displays Out of Stock badge and disables Add to Cart when book is unavailable', () => {
      const store = createTestStore({
        bookstore: { books: sampleBooks, selectedLevel: 'All', selectedFormat: 'all', searchQuery: '', isLoading: false, error: null, ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <BookCard book={sampleBooks[3]} /> // b301 is unavailable
          </Provider>
        );
      });

      expect(container.textContent).toContain('Out of Stock');
      const addBtn = container.querySelector('[data-testid="add-to-cart-btn"]') as HTMLButtonElement;
      expect(addBtn).toBeDefined();
      expect(addBtn.disabled).toBe(true);
      root.unmount();
    });

    it('renders "Read Online" button when student owns the digital study manual', () => {
      const store = createTestStore({
        bookstore: { books: sampleBooks, selectedLevel: 'All', selectedFormat: 'all', searchQuery: '', isLoading: false, error: null, ownedBookIds: ['b101'] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <BookCard book={sampleBooks[0]} /> // b101 is owned
          </Provider>
        );
      });

      expect(container.textContent).toContain('Owned');
      const readBtn = container.querySelector('[data-testid="read-online-btn"]');
      expect(readBtn).not.toBeNull();
      expect(readBtn?.getAttribute('href')).toBe('/book-reader/b101');
      root.unmount();
    });

    it('renders "In Cart" button when book has already been added to cart', () => {
      const store = createTestStore({
        bookstore: { books: sampleBooks, selectedLevel: 'All', selectedFormat: 'all', searchQuery: '', isLoading: false, error: null, ownedBookIds: [] },
      });

      // Dispatch addBookToCart
      store.dispatch(addBookToCart({ book: sampleBooks[1] }));

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <BookCard book={sampleBooks[1]} />
          </Provider>
        );
      });

      const inCartBtn = container.querySelector('[data-testid="in-cart-btn"]') as HTMLButtonElement;
      expect(inCartBtn).not.toBeNull();
      expect(inCartBtn.disabled).toBe(true);
      expect(container.textContent).toContain('In Cart');
      root.unmount();
    });

    it('opens book detail modal with complete ICAG syllabus & fulfillment info', () => {
      const store = createTestStore({
        bookstore: { books: sampleBooks, selectedLevel: 'All', selectedFormat: 'all', searchQuery: '', isLoading: false, error: null, ownedBookIds: [] },
      });

      const root = createRoot(container);
      act(() => {
        root.render(
          <Provider store={store}>
            <BookCard book={sampleBooks[0]} />
          </Provider>
        );
      });

      const detailsBtn = container.querySelector('[data-testid="book-details-btn"]') as HTMLButtonElement;
      expect(detailsBtn).not.toBeNull();

      act(() => {
        detailsBtn.click();
      });

      // Dialog content renders into document.body
      expect(document.body.textContent).toContain('Official ICAG study text authored by the Institute of Chartered Accountants, Ghana');
      expect(document.body.textContent).toContain('978-9988-1-2345-1');
      expect(document.body.textContent).toContain('ICAG / CITG Ghana');
      root.unmount();
    });
  });

  describe('3. BookstoreCatalog Component Rendering & Live Filtering', () => {
    it('renders search input, level filters, format filters, and book grid', async () => {
      const store = createTestStore({
        bookstore: {
          books: sampleBooks,
          selectedLevel: 'All',
          selectedFormat: 'all',
          searchQuery: '',
          isLoading: false,
          error: null,
          ownedBookIds: ['b101'],
        },
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(
          <Provider store={store}>
            <BookstoreCatalog />
          </Provider>
        );
      });

      expect(container.querySelector('[data-testid="bookstore-catalog"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="bookstore-search-input"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="filter-level-all"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="filter-level-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="filter-level-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="filter-level-3"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="filter-format-all"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="filter-format-digital"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="filter-format-physical"]')).not.toBeNull();
      root.unmount();
    });

    it('filters catalog in real-time when level is selected', async () => {
      const store = createTestStore({
        bookstore: {
          books: sampleBooks,
          selectedLevel: 'Level 2',
          selectedFormat: 'all',
          searchQuery: '',
          isLoading: false,
          error: null,
          ownedBookIds: [],
        },
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(
          <Provider store={store}>
            <BookstoreCatalog />
          </Provider>
        );
      });

      expect(container.textContent).toContain('Public Sector Accounting Guide (Level 2)');
      expect(container.textContent).not.toContain('ICAG Financial Accounting Study Text');
      root.unmount();
    });

    it('filters catalog in real-time when search query is entered', async () => {
      const store = createTestStore({
        bookstore: {
          books: sampleBooks,
          selectedLevel: 'All',
          selectedFormat: 'all',
          searchQuery: 'taxation',
          isLoading: false,
          error: null,
          ownedBookIds: [],
        },
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(
          <Provider store={store}>
            <BookstoreCatalog />
          </Provider>
        );
      });

      expect(container.textContent).toContain('Advanced Taxation Practice Manual');
      expect(container.textContent).not.toContain('Business Law Manual');
      root.unmount();
    });

    it('shows empty state when no books match filters', async () => {
      const store = createTestStore({
        bookstore: {
          books: sampleBooks,
          selectedLevel: 'All',
          selectedFormat: 'all',
          searchQuery: 'nonexistent-subject-xyz',
          isLoading: false,
          error: null,
          ownedBookIds: [],
        },
      });

      const root = createRoot(container);
      await act(async () => {
        root.render(
          <Provider store={store}>
            <BookstoreCatalog />
          </Provider>
        );
      });

      expect(container.querySelector('[data-testid="no-books-found"]')).not.toBeNull();
      expect(container.textContent).toContain('No Study Texts Found');
      root.unmount();
    });
  });

  describe('4. Bookstore API Endpoints (/api/shop/books and /api/books)', () => {
    it('returns books with GHS currency from /api/shop/books', async () => {
      const req = createRequest('/api/shop/books');
      const res = await getShopBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.currency).toBe('GHS');
      expect(data.data.length).toBeGreaterThanOrEqual(4);
    });

    it('returns books with GHS currency from forwarded /api/books route', async () => {
      const req = createRequest('/api/books');
      const res = await getBooksApi(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.currency).toBe('GHS');
      expect(data.data.length).toBeGreaterThanOrEqual(4);
    });

    it('filters books by Level 2 and format digital on server', async () => {
      const req = createRequest('/api/shop/books?level=Level 2&format=digital');
      const res = await getShopBooks(req);
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      data.data.forEach((b: Book) => {
        expect(b.level).toBe('Level 2');
        expect(['digital', 'both']).toContain(b.format);
      });
    });

    it('retrieves single book by ID with stock quantity and ISBN', async () => {
      const req = createRequest('/api/shop/books/b101');
      const res = await getBookById(req, { params: Promise.resolve({ id: 'b101' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(200);
      expect(data.data.id).toBe('b101');
      expect(data.data.isbn).toBe('978-9988-1-2345-1');
      expect(data.data.price_ghs).toBe(150);
    });

    it('returns 404 for unknown book ID', async () => {
      const req = createRequest('/api/shop/books/unknown-999');
      const res = await getBookById(req, { params: Promise.resolve({ id: 'unknown-999' }) });
      const { status, data } = await parseResponse(res);
      expect(status).toBe(404);
      expect(data.error).toBe('Book not found');
    });
  });
});
