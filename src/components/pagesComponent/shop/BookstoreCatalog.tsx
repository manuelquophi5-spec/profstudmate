"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FiSearch, FiBookOpen, FiFilter, FiCheckCircle } from "react-icons/fi";
import { Book, BookFormatFilter, BookLevel } from "@/types/bookstore";
import { fetchBooks } from "@/utils/api/shop/bookstoreApi";
import { BookCard } from "./BookCard";
import CourseCardSkeleton from "@/components/skeletons/CourseCardSkeleton";
import { useDispatch, useSelector } from "react-redux";
import {
  selectBooks,
  selectSelectedFormat,
  selectSelectedLevel,
  selectSearchQuery,
  setBooks,
  setSelectedFormat,
  setSelectedLevel,
  setSearchQuery,
} from "@/redux/reducers/bookstoreSlice";
import toast from "react-hot-toast";

const LEVEL_OPTIONS: { label: string; value: BookLevel }[] = [
  { label: "All Levels", value: "All" },
  { label: "Level 1", value: "Level 1" },
  { label: "Level 2", value: "Level 2" },
  { label: "Level 3", value: "Level 3" },
];

const FORMAT_OPTIONS: { label: string; value: BookFormatFilter }[] = [
  { label: "All Formats", value: "all" },
  { label: "Digital Manuals", value: "digital" },
  { label: "Physical Manuals", value: "physical" },
];

export const BookstoreCatalog: React.FC = () => {
  const dispatch = useDispatch();
  const books = useSelector(selectBooks);
  const selectedLevel = useSelector(selectSelectedLevel);
  const selectedFormat = useSelector(selectSelectedFormat);
  const searchQuery = useSelector(selectSearchQuery);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchBooks({
        level: selectedLevel !== "All" ? selectedLevel : undefined,
        format: selectedFormat !== "all" ? selectedFormat : undefined,
        search: searchQuery || undefined,
      });

      if (res && res.success && Array.isArray(res.data)) {
        dispatch(setBooks(res.data));
      } else {
        dispatch(setBooks([]));
      }
    } catch (err: any) {
      console.error("Error loading books:", err);
      setError(err.message || "Failed to load study texts.");
      toast.error("Could not load bookstore catalog. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, selectedLevel, selectedFormat, searchQuery]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Client-side additional filtering to guarantee immediate responsive search
  const filteredBooks = useMemo(() => {
    return books.filter((book: Book) => {
      // Level check
      if (selectedLevel !== "All" && book.level.toLowerCase() !== selectedLevel.toLowerCase()) {
        return false;
      }

      // Format check
      if (selectedFormat !== "all") {
        if (selectedFormat === "digital" && book.format !== "digital" && book.format !== "both") {
          return false;
        }
        if (selectedFormat === "physical" && book.format !== "physical" && book.format !== "both") {
          return false;
        }
      }

      // Search keyword
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = book.title.toLowerCase().includes(query);
        const matchesLevel = book.level.toLowerCase().includes(query);
        const matchesIsbn = book.isbn ? book.isbn.toLowerCase().includes(query) : false;
        const matchesSlug = book.slug.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLevel && !matchesIsbn && !matchesSlug) {
          return false;
        }
      }

      return true;
    });
  }, [books, selectedLevel, selectedFormat, searchQuery]);

  return (
    <div data-testid="bookstore-catalog" className="container py-8 space-y-8">
      {/* Search & Filter Header Bar */}
      <div className="bg-white border borderColor rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              data-testid="bookstore-search-input"
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              placeholder="Search study texts by title, subject, or ISBN..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border borderColor rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                data-testid="bookstore-search-clear"
                onClick={() => dispatch(setSearchQuery(""))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Counter */}
          <div data-testid="bookstore-count" className="text-xs text-gray-500 flex items-center gap-1.5 self-center">
            <FiBookOpen size={14} className="primaryColor" />
            <span>
              Showing <strong className="text-gray-800">{filteredBooks.length}</strong> study texts
            </span>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t borderColor">
          {/* Level Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <FiFilter size={12} /> Level:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  data-testid={`filter-level-${opt.value === "All" ? "all" : opt.value.replace("Level ", "")}`}
                  onClick={() => dispatch(setSelectedLevel(opt.value))}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    selectedLevel === opt.value
                      ? "commonBtn !py-1 !px-3 shadow-xs"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Format:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  data-testid={`filter-format-${opt.value}`}
                  onClick={() => dispatch(setSelectedFormat(opt.value))}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    selectedFormat === opt.value
                      ? "bg-gray-900 text-white shadow-xs"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <CourseCardSkeleton key={`book-skeleton-${idx}`} />
          ))}
        </div>
      ) : error ? (
        <div className="py-16 text-center bg-white border borderColor rounded-2xl p-8 space-y-4 max-w-lg mx-auto">
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={loadBooks} className="commonBtn !text-sm">
            Retry Loading
          </button>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div data-testid="no-books-found" className="py-16 text-center bg-white border borderColor rounded-2xl p-8 space-y-4">
          <FiBookOpen size={48} className="mx-auto text-gray-300" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-700">No Study Texts Found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              No prescribed books match your current filters. Try resetting the qualification level,
              format filter, or search keyword.
            </p>
          </div>
          <button
            data-testid="reset-filters-btn"
            onClick={() => {
              dispatch(setSelectedLevel("All"));
              dispatch(setSelectedFormat("all"));
              dispatch(setSearchQuery(""));
            }}
            className="commonBtn !text-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div data-testid="book-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book: Book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Institutional Guarantee Footer Box */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <FiCheckCircle size={22} className="primaryColor" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-900">
              Official ICAG Examination Text Guarantee
            </h4>
            <p className="text-xs text-gray-600">
              All books and study manuals are authored and updated per the latest Institute of
              Chartered Accountants, Ghana examination syllabus.
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-4 flex-shrink-0">
          <span>• Instant Digital DRM</span>
          <span>• Campus Collection</span>
          <span>• Courier Shipping</span>
        </div>
      </div>
    </div>
  );
};
