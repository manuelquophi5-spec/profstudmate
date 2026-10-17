"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Tag,
  UserCheck,
  BookOpen,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ChevronRight,
  ExternalLink,
  Save,
  Check
} from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Course Interface matching mockApiStore / Interface Contracts
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
  price: number;
  discount_price?: number;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  assigned_tutor_id: number;
  level: 'Level 1' | 'Level 2' | 'Level 3';
  syllabus?: string[];
  lectures_count?: number;
  attached_books?: BookRef[];
}

// Faculty Tutor Directory
export const ICAG_FACULTY_MEMBERS = [
  { id: 1, name: "Dr. Kwesi Appiah, CA", specialty: "Financial Accounting & Public Sector (Level 1 & 2)" },
  { id: 2, name: "Nana Ama Mensah, Esq., CA", specialty: "Commercial Law & Corporate Governance (Level 1)" },
  { id: 3, name: "Prof. Emmanuel Osei, CA, CITG", specialty: "Advanced Taxation & Fiscal Policy (Level 3)" },
  { id: 4, name: "Anthony Boateng, CA, CISA", specialty: "Audit, Assurance & IT for Accountants (Level 1 & 2)" },
  { id: 5, name: "Dr. Abena Frimpong, CA", specialty: "Advanced Audit, Ethics & Corporate Strategy (Level 3)" },
  { id: 12, name: "Kwabena Asante, CA", specialty: "Senior Professional Practice Lead (All Levels)" }
];

export default function InstitutionalCourseGovernance() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // Review Modal State
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form State for Pricing & Assignment Review
  const [formPrice, setFormPrice] = useState<string>("");
  const [formDiscountPrice, setFormDiscountPrice] = useState<string>("");
  const [formStatus, setFormStatus] = useState<Course['status']>("pending");
  const [formTutorId, setFormTutorId] = useState<number>(1);
  const [formErrors, setFormErrors] = useState<{ price?: string; discount_price?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch Courses from API
  const fetchCourses = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch("/api/courses");
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setCourses(result.data);
      } else {
        toast.error("Failed to load institutional courses");
      }
    } catch (err: any) {
      console.error("Error fetching courses:", err);
      toast.error("Network error while loading courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ICAG_FACULTY_MEMBERS.find((f) => f.id === course.assigned_tutor_id)?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || course.status === statusFilter;
      const matchesLevel = levelFilter === "all" || course.level === levelFilter;

      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [courses, searchQuery, statusFilter, levelFilter]);

  // Statistics counts
  const stats = useMemo(() => {
    const total = courses.length;
    const pending = courses.filter((c) => c.status === "pending").length;
    const published = courses.filter((c) => c.status === "published").length;
    const drafts = courses.filter((c) => c.status === "draft").length;
    const rejected = courses.filter((c) => c.status === "rejected").length;
    return { total, pending, published, drafts, rejected };
  }, [courses]);

  // Open review modal
  const handleOpenReview = (course: Course) => {
    setSelectedCourse(course);
    setFormPrice(course.price !== undefined ? String(course.price) : "0");
    setFormDiscountPrice(course.discount_price !== undefined ? String(course.discount_price) : "");
    setFormStatus(course.status);
    setFormTutorId(course.assigned_tutor_id || 1);
    setFormErrors({});
    setIsReviewOpen(true);
  };

  // Validate form client-side
  const validateForm = (): boolean => {
    const errors: { price?: string; discount_price?: string; general?: string } = {};

    if (formPrice.trim() === "") {
      errors.price = "Course selling price in GHS is required (enter 0 for complimentary).";
    } else {
      const numPrice = Number(formPrice);
      if (isNaN(numPrice) || numPrice < 0) {
        errors.price = "Course price in GHS cannot be negative.";
      }
    }

    if (formDiscountPrice.trim() !== "") {
      const numDiscount = Number(formDiscountPrice);
      const numPrice = Number(formPrice);

      if (isNaN(numDiscount) || numDiscount < 0) {
        errors.discount_price = "Discount price in GHS cannot be negative.";
      } else if (!isNaN(numPrice) && numDiscount > numPrice) {
        errors.discount_price = "Discount price cannot exceed regular course price.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Institutional Review & Pricing Update
  const handleSubmitGovernance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const payload: {
        price: number;
        discount_price?: number;
        status: Course['status'];
        assigned_tutor_id: number;
      } = {
        price: Number(formPrice),
        status: formStatus,
        assigned_tutor_id: Number(formTutorId)
      };

      if (formDiscountPrice.trim() !== "") {
        payload.discount_price = Number(formDiscountPrice);
      }

      const response = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || "Failed to update course governance";
        setFormErrors({ general: errorMsg });
        toast.error(errorMsg);
        return;
      }

      toast.success(result.message || "Institutional pricing & governance updated successfully");
      setIsReviewOpen(false);

      // Refresh list
      await fetchCourses(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      const msg = err.message || "An unexpected error occurred";
      setFormErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to format tutor name
  const getTutorInfo = (tutorId: number) => {
    const faculty = ICAG_FACULTY_MEMBERS.find((f) => f.id === tutorId);
    return faculty ? faculty.name : `Faculty Tutor ID #${tutorId}`;
  };

  return (
    <div className="space-y-6">
      {/* Institutional Breadcrumb & Header */}
      <div className="bg-[#5a5bb5]/5 border border-[#5a5bb5]/20 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#5a5bb5] uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>ICAG / ICAT Institutional Governance Council</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Institutional Course Governance &amp; Admin Pricing Console
            </h1>
            <p className="text-sm text-gray-600 mt-1 max-w-3xl">
              Official institute council console for reviewing academic curriculum drafts, establishing official tuition fees and promotional discounts in Ghanaian Cedis (GHS), and appointing accredited lead faculty tutors.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCourses(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 bg-white border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Syncing..." : "Refresh Console"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium text-gray-500 uppercase">
                Total Courses
              </CardDescription>
              <GraduationCap className="w-4 h-4 text-[#5a5bb5]" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mt-1">
              {stats.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-gray-500">Across ICAG Levels 1, 2, &amp; 3</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200 bg-amber-50/30 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium text-amber-700 uppercase">
                Pending Drafts
              </CardDescription>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-amber-900 mt-1 flex items-center gap-2">
              {stats.pending}
              {stats.pending > 0 && (
                <span className="text-xs bg-amber-200 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-amber-700">Awaiting council pricing review</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-200 bg-emerald-50/30 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium text-emerald-700 uppercase">
                Published Active
              </CardDescription>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-900 mt-1">
              {stats.published}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-emerald-700">Live in student catalog with GHS fees</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium text-gray-500 uppercase">
                Lead Faculty Pool
              </CardDescription>
              <UserCheck className="w-4 h-4 text-[#5a5bb5]" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mt-1">
              {ICAG_FACULTY_MEMBERS.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-gray-500">Accredited Chartered Accountants</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by course title, slug, or lead faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-gray-200 text-sm focus-visible:ring-[#5a5bb5]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Level Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500 whitespace-nowrap">ICAG Level:</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-36 h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Level 1">Level 1 (Knowledge)</SelectItem>
                  <SelectItem value="Level 2">Level 2 (Application)</SelectItem>
                  <SelectItem value="Level 3">Level 3 (Strategic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList className="bg-gray-100 p-0.5 h-9">
                <TabsTrigger value="all" className="text-xs px-3">
                  All ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs px-3">
                  Pending ({stats.pending})
                </TabsTrigger>
                <TabsTrigger value="published" className="text-xs px-3">
                  Published ({stats.published})
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs px-3">
                  Draft ({stats.drafts})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs px-3">
                  Rejected ({stats.rejected})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Courses Governance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#5a5bb5] mb-3" />
            <p className="text-sm font-medium">Loading institutional course registry...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-semibold text-gray-700">No courses match the selected filters</p>
            <p className="text-xs text-gray-500 mt-1">Try resetting search or status filters to view all courses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-semibold text-gray-600">#</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Course &amp; Curriculum</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">ICAG Level</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Lead Faculty Tutor</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Official Pricing (GHS)</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600">Governance Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course, idx) => {
                  const facultyName = getTutorInfo(course.assigned_tutor_id);
                  const isPending = course.status === "pending";
                  const hasDiscount = course.discount_price !== undefined && course.discount_price < course.price;

                  return (
                    <TableRow key={course.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="text-center font-mono text-xs text-gray-400">
                        {idx + 1}
                      </TableCell>

                      {/* Course Title & Syllabus info */}
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-semibold text-gray-900 text-sm block">
                            {course.title}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                              /{course.slug}
                            </span>
                            {course.lectures_count !== undefined && (
                              <span>• {course.lectures_count} lectures</span>
                            )}
                            {course.syllabus && course.syllabus.length > 0 && (
                              <span>• {course.syllabus.length} syllabus modules</span>
                            )}
                            {course.attached_books && course.attached_books.length > 0 && (
                              <span className="text-[#5a5bb5] font-medium">
                                • {course.attached_books.length} bundled manual(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* ICAG Level */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            course.level === "Level 1"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : course.level === "Level 2"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-purple-200 bg-purple-50 text-purple-700"
                          }
                        >
                          {course.level}
                        </Badge>
                      </TableCell>

                      {/* Lead Faculty Tutor */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-800">{facultyName}</p>
                            <p className="text-[11px] text-gray-400 font-mono">Tutor ID: {course.assigned_tutor_id}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Official Pricing */}
                      <TableCell>
                        <div className="space-y-0.5">
                          {course.price === 0 ? (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Complimentary (GH₵ 0.00)
                            </span>
                          ) : (
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-gray-900 text-sm">
                                  GH₵ {course.discount_price !== undefined ? course.discount_price.toFixed(2) : course.price.toFixed(2)}
                                </span>
                                {hasDiscount && (
                                  <span className="text-xs text-gray-400 line-through">
                                    GH₵ {course.price.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              {hasDiscount && (
                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded inline-block">
                                  Save GH₵ {(course.price - (course.discount_price || 0)).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {course.status === "pending" && (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 font-medium flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </Badge>
                        )}
                        {course.status === "published" && (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-medium flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Published</span>
                          </Badge>
                        )}
                        {course.status === "draft" && (
                          <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-600 font-medium flex items-center gap-1 w-fit">
                            <Layers className="w-3 h-3" />
                            <span>Academic Draft</span>
                          </Badge>
                        )}
                        {course.status === "rejected" && (
                          <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800 font-medium flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            <span>Needs Revision</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isPending ? "default" : "outline"}
                          onClick={() => handleOpenReview(course)}
                          className={`text-xs h-8 px-3 ${
                            isPending
                              ? "bg-[#5a5bb5] hover:bg-[#4D4E9B] text-white"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                          <span>{isPending ? "Review & Price" : "Edit Governance"}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Review & Pricing Modal Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5a5bb5] uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Institutional Governance Review &amp; Pricing Determination</span>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 mt-1">
              {selectedCourse?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Establish official institutional tuition fee in Ghanaian Cedis (GHS), approve academic draft syllabus, and confirm lead faculty appointment.
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <form onSubmit={handleSubmitGovernance} className="space-y-6 pt-2">
              {/* General Form Error Alert */}
              {formErrors.general && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formErrors.general}</span>
                </div>
              )}

              {/* Section 1: Academic Draft Overview */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#5a5bb5]" />
                    <span>Curriculum Draft Inspection</span>
                  </span>
                  <Badge variant="outline" className="text-xs bg-white">
                    {selectedCourse.level}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">Course Slug:</span>
                    <span className="font-mono text-gray-700">{selectedCourse.slug}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Lectures Count:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedCourse.lectures_count || "Not specified"} lectures
                    </span>
                  </div>
                </div>

                {/* Submitted Syllabus Modules */}
                {selectedCourse.syllabus && selectedCourse.syllabus.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs block mb-1.5">Submitted Syllabus Modules:</span>
                    <ul className="space-y-1 bg-white p-3 rounded-md border border-gray-200 text-xs">
                      {selectedCourse.syllabus.map((topic, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Attached Companion Books */}
                {selectedCourse.attached_books && selectedCourse.attached_books.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs block mb-1.5">Attached Companion Textbooks:</span>
                    <div className="space-y-1">
                      {selectedCourse.attached_books.map((b) => (
                        <div key={b.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 text-xs">
                          <span className="font-medium text-gray-800">{b.title}</span>
                          <span className="text-[#5a5bb5] font-semibold">GH₵ {b.price_ghs.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Lead Faculty Tutor Assignment */}
              <div className="space-y-2">
                <Label htmlFor="tutorSelect" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#5a5bb5]" />
                  <span>Assign Lead Faculty Tutor</span>
                </Label>
                <Select
                  value={String(formTutorId)}
                  onValueChange={(val) => setFormTutorId(Number(val))}
                >
                  <SelectTrigger id="tutorSelect" className="w-full bg-white border-gray-300 text-sm">
                    <SelectValue placeholder="Select accredited lead tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICAG_FACULTY_MEMBERS.map((faculty) => (
                      <SelectItem key={faculty.id} value={String(faculty.id)}>
                        <div className="flex flex-col text-left py-0.5">
                          <span className="font-medium text-gray-900">{faculty.name} (ID: {faculty.id})</span>
                          <span className="text-xs text-gray-500">{faculty.specialty}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-500">
                  The lead tutor coordinates academic discussions and lecture schedules for this course.
                </p>
              </div>

              {/* Section 3: Official Pricing in Ghanaian Cedis (GHS) */}
              <div className="bg-[#5a5bb5]/5 border border-[#5a5bb5]/20 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#5a5bb5]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5a5bb5]">
                    Institutional Pricing (Ghanaian Cedis - GHS)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selling Price Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="priceInput" className="text-xs font-medium text-gray-700">
                      Official Course Selling Price (GHS) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                        GH₵
                      </span>
                      <Input
                        id="priceInput"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 750"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className={`pl-12 bg-white text-sm ${
                          formErrors.price ? "border-rose-500 focus-visible:ring-rose-400" : "border-gray-300"
                        }`}
                      />
                    </div>
                    {formErrors.price && (
                      <p className="text-xs text-rose-600 font-medium">{formErrors.price}</p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      Official price charged to students. Enter 0 for complimentary seminar.
                    </p>
                  </div>

                  {/* Discount Price Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="discountInput" className="text-xs font-medium text-gray-700">
                      Promotional Discount Price (GHS) <span className="text-gray-400">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                        GH₵
                      </span>
                      <Input
                        id="discountInput"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 700"
                        value={formDiscountPrice}
                        onChange={(e) => setFormDiscountPrice(e.target.value)}
                        className={`pl-12 bg-white text-sm ${
                          formErrors.discount_price ? "border-rose-500 focus-visible:ring-rose-400" : "border-gray-300"
                        }`}
                      />
                    </div>
                    {formErrors.discount_price && (
                      <p className="text-xs text-rose-600 font-medium">{formErrors.discount_price}</p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      Must not exceed the official selling price.
                    </p>
                  </div>
                </div>

                {/* Real-time Pricing Preview */}
                {formPrice !== "" && !isNaN(Number(formPrice)) && (
                  <div className="bg-white p-3 rounded border border-[#5a5bb5]/20 flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">Effective Student Price:</span>
                    <div className="text-right">
                      <span className="font-bold text-base text-gray-900">
                        GH₵ {formDiscountPrice !== "" && Number(formDiscountPrice) < Number(formPrice)
                          ? Number(formDiscountPrice).toFixed(2)
                          : Number(formPrice).toFixed(2)}
                      </span>
                      {formDiscountPrice !== "" && Number(formDiscountPrice) < Number(formPrice) && (
                        <span className="block text-[11px] text-emerald-600 font-medium">
                          Discount: GH₵ {(Number(formPrice) - Number(formDiscountPrice)).toFixed(2)} savings
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Governance Decision & Catalog Status */}
              <div className="space-y-2">
                <Label htmlFor="statusSelect" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#5a5bb5]" />
                  <span>Institutional Catalog Publication Decision</span>
                </Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as Course['status'])}
                >
                  <SelectTrigger id="statusSelect" className="w-full bg-white border-gray-300 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-700">Approve &amp; Publish to Student Catalog</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-amber-700">Keep in Pending Review</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span className="font-semibold text-rose-700">Reject &amp; Return to Faculty for Revision</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">Internal Curriculum Draft</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dialog Footer Actions */}
              <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReviewOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#5a5bb5] hover:bg-[#4D4E9B] text-white text-xs px-4"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving Decision...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5" />
                      Apply Institutional Pricing &amp; Approval
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
