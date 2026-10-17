import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Book, BookFormatFilter, BookLevel } from '@/types/bookstore';

interface BookstoreState {
  books: Book[];
  selectedLevel: BookLevel;
  selectedFormat: BookFormatFilter;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  ownedBookIds: string[];
}

const initialState: BookstoreState = {
  books: [],
  selectedLevel: 'All',
  selectedFormat: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,
  ownedBookIds: ['b101'], // user 10 initial state
};

export const bookstoreSlice = createSlice({
  name: 'bookstore',
  initialState,
  reducers: {
    setBooks: (state, action: PayloadAction<Book[]>) => {
      state.books = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setSelectedLevel: (state, action: PayloadAction<BookLevel>) => {
      state.selectedLevel = action.payload;
    },
    setSelectedFormat: (state, action: PayloadAction<BookFormatFilter>) => {
      state.selectedFormat = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setOwnedBookIds: (state, action: PayloadAction<string[]>) => {
      state.ownedBookIds = action.payload;
    },
    grantBookAccess: (state, action: PayloadAction<string>) => {
      if (!state.ownedBookIds.includes(action.payload)) {
        state.ownedBookIds.push(action.payload);
      }
    },
  },
});

export const {
  setBooks,
  setSelectedLevel,
  setSelectedFormat,
  setSearchQuery,
  setIsLoading,
  setError,
  setOwnedBookIds,
  grantBookAccess,
} = bookstoreSlice.actions;

export default bookstoreSlice.reducer;

// Selectors
export const selectBookstoreState = (state: RootState) => (state as any).bookstore || initialState;
export const selectBooks = (state: RootState) => selectBookstoreState(state).books;
export const selectSelectedLevel = (state: RootState) => selectBookstoreState(state).selectedLevel;
export const selectSelectedFormat = (state: RootState) => selectBookstoreState(state).selectedFormat;
export const selectSearchQuery = (state: RootState) => selectBookstoreState(state).searchQuery;
export const selectIsBookstoreLoading = (state: RootState) => selectBookstoreState(state).isLoading;
export const selectOwnedBookIds = (state: RootState) => selectBookstoreState(state).ownedBookIds;
