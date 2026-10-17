"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LuMessageSquare, LuClipboardCheck, LuGraduationCap, LuArrowRight } from "react-icons/lu";
import { AcademicPerformanceData } from "@/utils/api/instructor/performance/getInstructorPerformance";

interface AcademicEngagementCardProps {
  performanceData?: AcademicPerformanceData | null;
}

const AcademicEngagementCard: React.FC<AcademicEngagementCardProps> = ({ performanceData }) => {
  const { t } = useTranslation();

  const activeDiscussions = performanceData?.active_classroom_discussions ?? 2;
  const pendingAssignments = performanceData?.pending_assignments_to_grade ?? 15;
  const mockPassRate = performanceData?.icag_mock_pass_rate ?? 84.2;

  return (
    <Card className="bg-white rounded-2xl shadow-sm h-full flex flex-col justify-between">
      <CardHeader className="pb-4 border-b borderColor">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">
            {t("cohort_engagement") || "Cohort Engagement"}
          </CardTitle>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
            ICAG / ICAT
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Real-time student interaction and assessment grading queue
        </p>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-4 flex-1 flex flex-col justify-between">
        {/* Item 1: Active Classroom Discussions */}
        <div className="p-3.5 rounded-xl border border-gray-100 bg-[#F8F9FA] hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <LuMessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {activeDiscussions} {t("active_discussions") || "Classroom Threads"}
                </p>
                <p className="text-xs text-gray-500">
                  Student inquiries awaiting faculty response
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-8 px-2">
              <Link href="/instructor/assignments" className="flex items-center gap-1">
                <span className="text-xs font-medium">View</span>
                <LuArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Item 2: Pending Assignment Submissions */}
        <div className="p-3.5 rounded-xl border border-gray-100 bg-[#F8F9FA] hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <LuClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {pendingAssignments} {t("pending_submissions") || "Pending Submissions"}
                </p>
                <p className="text-xs text-gray-500">
                  Case study &amp; essay solutions awaiting review
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 h-8 px-2">
              <Link href="/instructor/assignments" className="flex items-center gap-1">
                <span className="text-xs font-medium">Grade</span>
                <LuArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Item 3: ICAG Exam Readiness Pass Rate */}
        <div className="p-3.5 rounded-xl border border-gray-100 bg-[#F8F9FA] hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <LuGraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {mockPassRate}% {t("mock_pass_rate") || "Mock Exam Pass Rate"}
                </p>
                <p className="text-xs text-gray-500">
                  Benchmark: 80% ICAG passing threshold
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-green-600 hover:text-green-700 h-8 px-2">
              <Link href="/instructor/student-quiz-reports" className="flex items-center gap-1">
                <span className="text-xs font-medium">Reports</span>
                <LuArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer Quick Action */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Institutional Faculty Hub</span>
          <Link
            href="/instructor/my-course"
            className="text-xs font-medium text-black hover:underline flex items-center gap-1"
          >
            Manage Curriculum <LuArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default AcademicEngagementCard;
