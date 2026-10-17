"use client";
import React from "react";
import StatsCard from "./StatsCard";
import { OverviewStats } from "@/utils/api/instructor/dashboad/getInstructorDashboard";
import { useTranslation } from "@/hooks/useTranslation";
import icon1 from "@/assets/images/instructorPanel/dashboard/totalCoursesIcon.svg";
import icon2 from "@/assets/images/instructorPanel/dashboard/enrollStudentIcon.svg";
import iconPassing from "@/assets/images/instructorPanel/quizReport/passingPoints.svg";
import iconAttempts from "@/assets/images/instructorPanel/quizReport/totalAttempts.svg";
import iconFeedback from "@/assets/images/instructorPanel/dashboard/ratingIcon.svg";
import { AcademicPerformanceData } from "@/utils/api/instructor/performance/getInstructorPerformance";
export type { AcademicPerformanceData };

interface StatsOverviewProps {
  data?: OverviewStats;
  performanceData?: AcademicPerformanceData | null;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ data, performanceData }) => {
  const { t } = useTranslation();

  // Academic Performance Center metrics (strictly non-financial)
  // Strips courses_sold, total_earnings, and wallet balances in compliance with ICAG/ICAT governance.
  const statsData = [
    {
      title: t("assigned_courses") || "Assigned Courses",
      value: performanceData?.total_assigned_courses ?? data?.total_courses?.value ?? 0,
      icon: icon1,
    },
    {
      title: t("active_learners") || "Active Learners",
      value: performanceData?.enrolled_students ?? data?.enrolled_students?.value ?? 0,
      icon: icon2,
    },
    {
      title: t("average_completion_rate") || "Completion Rate",
      value: `${(performanceData?.average_completion_rate ?? 78.5).toFixed(1)}%`,
      icon: iconAttempts,
    },
    {
      title: t("icag_mock_pass_rate") || "ICAG Mock Pass Rate",
      value: `${(performanceData?.icag_mock_pass_rate ?? 84.2).toFixed(1)}%`,
      icon: iconPassing,
    },
    {
      title: t("pending_assignments") || "Pending Submissions",
      value: performanceData?.pending_assignments_to_grade ?? 15,
      icon: iconFeedback,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="primaryBg p-3 sm:p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
          <div>
            <h2 className="text-white text-lg font-semibold">
              {performanceData?.center_type || "Academic Performance Center Overview"}
            </h2>
            <p className="text-xs text-gray-300 mt-0.5">
              ICAG/ICAT Student Progress, Examination Readiness &amp; Cohort Completion
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded bg-white/20 text-white">
            Academic Governance Active
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {statsData.map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
