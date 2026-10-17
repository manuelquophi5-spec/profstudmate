"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import StatsOverview, { AcademicPerformanceData } from "@/components/instructor/dashboard/StatsOverview";
import AcademicPerformanceChart from "@/components/instructor/dashboard/AcademicPerformanceChart";
import AcademicEngagementCard from "@/components/instructor/dashboard/AcademicEngagementCard";
import CoursesTable from "@/components/instructor/dashboard/CoursesTable";
import ProfileCompletionCard from "@/components/instructor/ProfileCompletionCard";
import EmptyCourseView from "@/components/instructor/EmptyCourseView";
import { getInstructorDashboard, GetInstructorDashboardParams, InstructorDashboardData, OverviewStats, ProfileCompletion } from "@/utils/api/instructor/dashboad/getInstructorDashboard";
import { extractErrorMessage } from "@/utils/helpers";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { userDataSelector } from "@/redux/reducers/userSlice";
import { UserDetails } from "@/utils/api/user/getUserDetails";

export default function InstructorDashboard() {
  // Redux user state for identifying faculty lead
  const userData = useSelector(userDataSelector) as UserDetails;
  const tutorId = userData?.id || userData?.instructor_details?.id || 1;

  // Local state for dashboard and academic performance data
  const [dashboardData, setDashboardData] = useState<InstructorDashboardData | null>(null);
  const [performanceData, setPerformanceData] = useState<AcademicPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real academic performance metrics from /api/instructor/performance
  const fetchAcademicPerformance = async (id: number) => {
    try {
      const response = await fetch(`/api/instructor/performance?instructorId=${id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPerformanceData(result.data);
        }
      }
    } catch (error) {
      console.error("Error fetching academic performance:", error);
    }
  };

  // Fetch legacy dashboard data (course inventory, profile completion)
  const fetchInstructorDashboard = async (params?: {
    id?: number;
    page?: number;
    per_page?: number;
  }) => {
    setIsLoading(true);

    try {
      const apiParams: GetInstructorDashboardParams = {
        id: params?.id,
        page: params?.page,
        per_page: params?.per_page,
      };

      const response = await getInstructorDashboard(apiParams);

      if (response) {
        if (!response.error) {
          if (response.data) {
            setDashboardData(response.data);
          }
        } else {
          console.log("API error:", response.message);
          if (response.message !== "Your instructor account has been suspended. Please contact support.") {
            toast.error(response.message || "Failed to fetch dashboard data");
            setDashboardData(null);
          }
        }
      } else {
        setDashboardData(null);
      }
    } catch (error) {
      extractErrorMessage(error);
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch both academic performance metrics and dashboard data on mount
  useEffect(() => {
    fetchInstructorDashboard();
    fetchAcademicPerformance(tutorId);
  }, [tutorId]);

  const profileCompletion = dashboardData?.profile_completion;
  const totalCourses = performanceData?.total_assigned_courses ?? (dashboardData?.overview_stats && dashboardData?.overview_stats?.total_courses.value) ?? 1;

  return (
    <div className="space-y-6">
      {profileCompletion?.percentage && profileCompletion?.percentage < 100 && (
        <ProfileCompletionCard profileCompletion={profileCompletion as ProfileCompletion} />
      )}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="w-full h-80 bg-gray-400" />
          <div className="grid grid-cols-1 between-1200-1399:!grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="between-1200-1399:!col-span-12 xl:col-span-2">
              <Skeleton className="w-full h-80 bg-gray-400" />
            </div>
            <div className="between-1200-1399:!col-span-12">
              <Skeleton className="w-full h-80 bg-gray-400" />
            </div>
          </div>
          <div>
            <Skeleton className="w-full h-80 bg-gray-400" />
          </div>
        </div>
      ) : Number(totalCourses) >= 0 ? (
        <div className="space-y-6">
          {/* Academic Performance Center Overview (Syllabus completion, ICAG pass rates, active learners) */}
          <StatsOverview
            data={dashboardData?.overview_stats as OverviewStats}
            performanceData={performanceData}
          />

          {/* Academic Performance Trends & Cohort Engagement Layout (replaces Sales Chart & Most Selling) */}
          <div className="grid grid-cols-1 between-1200-1399:!grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="between-1200-1399:!col-span-12 xl:col-span-2">
              <AcademicPerformanceChart />
            </div>
            <div className="between-1200-1399:!col-span-12">
              <AcademicEngagementCard performanceData={performanceData} />
            </div>
          </div>

          {/* Institutional Courses Management Table */}
          <CoursesTable />
        </div>
      ) : (
        !isLoading && <EmptyCourseView />
      )}
    </div>
  );
}
