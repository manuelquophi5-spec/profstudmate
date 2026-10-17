"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FiLock,
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiZoomIn,
  FiZoomOut,
  FiRotateCw,
  FiShield,
  FiClock,
  FiArrowLeft,
  FiAlertTriangle,
} from "react-icons/fi";
import { useSelector } from "react-redux";
import { userDataSelector } from "@/redux/reducers/userSlice";
import { fetchBookById, requestDrmSession } from "@/utils/api/shop/bookstoreApi";
import { Book, DrmSessionResponse } from "@/types/bookstore";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BookReaderPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const bookId = resolvedParams.id;

  const userData = useSelector(userDataSelector) as any;
  const userId = userData?.id || 10; // Defaults to student user 10 in mock store

  const [book, setBook] = useState<Book | null>(null);
  const [drmSession, setDrmSession] = useState<DrmSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  // Reader state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(48);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [timeLeftMinutes, setTimeLeftMinutes] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    async function verifyAndLoad() {
      setIsLoading(true);
      setAccessDeniedError(null);

      try {
        // 1. Fetch book metadata
        try {
          const bookRes = await fetchBookById(bookId);
          if (bookRes && bookRes.data) {
            setBook(bookRes.data);
          }
        } catch {
          // Fallback basic book info
        }

        // 2. Request DRM session token from server
        const drmRes = await requestDrmSession({
          userId: Number(userId),
          bookId,
        });

        if (!drmRes.success || !drmRes.drm_session_token) {
          setAccessDeniedError(
            drmRes.error ||
              "DRM Access Denied: User has not purchased this digital study manual."
          );
          setIsLoading(false);
          return;
        }

        setDrmSession(drmRes);
        setIsLoading(false);

        // Session countdown
        timer = setInterval(() => {
          setTimeLeftMinutes((prev) => (prev > 1 ? prev - 1 : 1));
        }, 60000);
      } catch (err: any) {
        setAccessDeniedError(
          err.message ||
            "DRM Access Denied: User has not purchased this digital study manual."
        );
        setIsLoading(false);
      }
    }

    verifyAndLoad();

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [bookId, userId]);

  // Anti-piracy / DRM keyboard traps
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      ["p", "s", "u", "c"].includes(e.key.toLowerCase())
    ) {
      e.preventDefault();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm tracking-wide text-gray-300">
          Verifying ICAG DRM Entitlement & Establishing Secure Reading Session...
        </p>
      </div>
    );
  }

  // Access Denied (403) View
  if (accessDeniedError) {
    return (
      <div data-testid="drm-access-restricted" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border borderColor rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-lg">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <FiLock size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">DRM Access Restricted</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              {accessDeniedError}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2 text-left">
            <FiAlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
            <span>
              Official ICAG digital manuals are restricted exclusively to verified students who
              have purchased the study text or enrolled in a companion course bundle.
            </span>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/shop"
              className="w-full py-2.5 px-4 commonBtn !text-sm text-center font-medium"
            >
              Browse ICAG Bookstore
            </Link>
            <Link
              href="/courses"
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-[4px] text-center transition-colors"
            >
              Explore Course Bundles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated DRM Reader View
  return (
    <div
      data-testid="drm-reader-container"
      className="min-h-screen bg-gray-950 text-gray-100 flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Top DRM Navigation & Control Bar */}
      <header className="h-16 bg-gray-900 border-b border-gray-800 px-4 md:px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/shop"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1.5 px-3 bg-gray-800 rounded-lg"
          >
            <FiArrowLeft size={14} /> Bookstore
          </Link>
          <div className="hidden sm:block">
            <h2 className="font-semibold text-sm text-white line-clamp-1">
              {book?.title || "ICAG Official Study Text"}
            </h2>
            <span className="text-[11px] text-gray-400">{book?.level || "Professional Exam"}</span>
          </div>
        </div>

        {/* Center Page Controls */}
        <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-lg text-xs">
          <button
            data-testid="drm-prev-page"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Previous Page"
          >
            <FiChevronLeft size={16} />
          </button>
          <span data-testid="drm-page-counter" className="font-mono text-gray-200">
            Page {currentPage} / {totalPages}
          </span>
          <button
            data-testid="drm-next-page"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Next Page"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        {/* Right Zoom & DRM Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 bg-gray-800 px-2 py-1 rounded-md text-xs">
            <button
              data-testid="drm-zoom-out"
              onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
              className="p-1 hover:text-white"
              title="Zoom Out"
            >
              <FiZoomOut size={14} />
            </button>
            <span data-testid="drm-zoom-level" className="font-mono text-gray-300 w-10 text-center">{zoomLevel}%</span>
            <button
              data-testid="drm-zoom-in"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1 hover:text-white"
              title="Zoom In"
            >
              <FiZoomIn size={14} />
            </button>
          </div>

          <div data-testid="drm-security-badge" className="flex items-center gap-1.5 text-xs bg-green-950/60 border border-green-700/50 text-green-400 px-2.5 py-1 rounded-full">
            <FiShield size={12} />
            <span className="hidden sm:inline">DRM Protected</span>
          </div>
        </div>
      </header>

      {/* Dynamic Watermark Banner */}
      <div data-testid="drm-watermark-banner" className="bg-primary/20 border-b border-primary/30 py-1.5 px-4 text-center text-xs text-primary-200 flex items-center justify-center gap-4">
        <span>{drmSession?.watermark || `Licensed to ICAG Student ID: ${userId}`}</span>
        <span className="text-gray-400">•</span>
        <span className="flex items-center gap-1 text-gray-300">
          <FiClock size={12} /> Session expires in ~{timeLeftMinutes} mins
        </span>
      </div>

      {/* Main Document Reading Canvas */}
      <main className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-gray-950">
        <div
          data-testid="drm-canvas-doc"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          className="relative bg-white text-gray-900 w-full max-w-3xl min-h-[900px] shadow-2xl rounded-sm p-12 md:p-16 flex flex-col justify-between transition-transform duration-200 overflow-hidden"
        >
          {/* Security Background Canvas Watermark */}
          <div data-testid="drm-canvas-watermark" className="absolute inset-0 pointer-events-none opacity-[0.06] flex items-center justify-center -rotate-45 select-none overflow-hidden text-center">
            <div className="text-3xl font-extrabold uppercase tracking-widest text-black space-y-12">
              <p>{drmSession?.watermark || `ICAG STUDENT ${userId}`}</p>
              <p>CONFIDENTIAL &amp; PROTECTED</p>
              <p>{drmSession?.watermark || `ICAG STUDENT ${userId}`}</p>
            </div>
          </div>

          {/* Document Content Header */}
          <div className="border-b-2 border-gray-900 pb-4 flex justify-between items-baseline relative z-10">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-primary">
                Institute of Chartered Accountants, Ghana
              </p>
              <h1 className="text-xl font-black text-gray-900 mt-1">
                {book?.title || "Financial Accounting & Reporting"}
              </h1>
            </div>
            <span className="text-xs font-mono text-gray-500 font-semibold">
              Module {Math.ceil(currentPage / 8)}
            </span>
          </div>

          {/* Simulated Academic Content for Page */}
          <div className="space-y-6 my-8 text-sm leading-relaxed text-gray-800 relative z-10">
            <h2 className="text-base font-bold text-gray-900 border-l-4 border-primary pl-3">
              Section {currentPage}.1: Professional Accounting Framework &amp; IAS Standards
            </h2>
            <p>
              The primary purpose of financial statements prepared in accordance with International
              Financial Reporting Standards (IFRS) as adopted in the Republic of Ghana is to provide
              structured financial information about the reporting entity that is useful to existing
              and potential investors, lenders, and other creditors in making decisions relating to
              providing resources to the entity.
            </p>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-md my-4 font-mono text-xs">
              <p className="font-bold mb-1 text-gray-700">Key Formula &amp; Statutory Principle:</p>
              <p className="text-primary font-semibold">
                Revenue Recognition (IFRS 15): Core 5-Step Process
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-600">
                <li>Identify the contract(s) with a customer</li>
                <li>Identify the performance obligations in the contract</li>
                <li>Determine the transaction price in Ghanaian Cedis (GHS)</li>
                <li>Allocate the transaction price to the performance obligations</li>
                <li>Recognize revenue when (or as) the entity satisfies a performance obligation</li>
              </ol>
            </div>
            <p>
              Under Ghanaian Tax Laws and Companies Act 2019 (Act 992), books of accounts must be
              retained in the jurisdiction for a statutory minimum of six years. Tutors and students
              are encouraged to review practice examination past questions appended in Chapter 8.
            </p>
          </div>

          {/* Document Footer */}
          <div className="border-t border-gray-200 pt-4 flex justify-between items-center text-xs text-gray-500 relative z-10">
            <span>Official ICAG Professional Study Manual • Session: {drmSession?.drm_session_token?.slice(0, 16)}...</span>
            <span className="font-mono font-bold text-gray-800">Page {currentPage}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
