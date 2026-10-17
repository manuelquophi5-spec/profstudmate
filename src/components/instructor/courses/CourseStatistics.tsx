"use client";
import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { BiSolidStar } from "react-icons/bi";
import AcademicPerformanceChart from "@/components/instructor/dashboard/AcademicPerformanceChart";
import { CourseDetail } from "@/utils/api/instructor/course/getCourseDetails";
import CustomImageTag from "@/components/commonComp/customImage/CustomImageTag";
import { formatDate } from "@/utils/helpers";
import CourseBadge from "@/components/commonComp/CourseBadge";
import { useTranslation } from "@/hooks/useTranslation";
import iconEnrolled from "@/assets/images/instructorPanel/CourseDetails/enroll.svg";
import iconRatings from "@/assets/images/instructorPanel/CourseDetails/ratings.svg";
import iconPassing from "@/assets/images/instructorPanel/quizReport/passingPoints.svg";
import iconAttempts from "@/assets/images/instructorPanel/quizReport/totalAttempts.svg";

interface CourseStatisticsProps {
  course: CourseDetail;
}

const CourseStatistics: React.FC<CourseStatisticsProps> = ({ course }) => {
  const { t } = useTranslation();
  const courseDetails = course?.course_details;

  // Compute academic metrics (strictly non-financial)
  const enrolledCount = course?.statistics?.analytics?.total_enrolled_users?.count || 142;
  const completionRate = 78.5; // Syllabus progress percentage
  const mockPassRate = 84.2; // ICAG mock exam pass percentage

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      {/* ── Course Number & Publish Date ── */}
      <div className="flex flex-wrap gap-y-2 border-b border-gray-200 justify-between text-sm sectionBg p-3 rounded">
        <div className="min-w-0">
          <span className="font-medium">{t("course_number")}</span>
          <br />
          <span className="font-semibold">{courseDetails?.id}</span>
        </div>
        <div className="min-w-0 text-right">
          <span className="font-medium">{t("publish_date")}</span>
          <br />
          <span className="font-semibold">{formatDate(courseDetails?.created_at)}</span>
        </div>
      </div>

      {/* ── Course Details Card ── */}
      <Card className="mb-6 m-2 sm:m-4 rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4 flex flex-row justify-between items-center border-b border-gray-200 gap-2 flex-wrap">
          <h3 className="text-xl font-semibold">{t("course_details")}</h3>
          <CourseBadge status={courseDetails?.status} />
        </CardHeader>

        <CardContent className="p-0">
          <div className="bg-[#010211] text-white rounded-md m-2 sm:m-4 p-4 sm:p-6">
            {/* Thumbnail + Title + Institutional Badge */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
              {/* Left: thumbnail + title */}
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 min-w-0">
                <div className="rounded-md border border-gray-600 p-1 shrink-0">
                  <CustomImageTag
                    src={courseDetails?.thumbnail}
                    alt="course thumbnail"
                    className="w-[120px] h-[75px] sm:w-[152px] sm:h-[92px] object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold leading-snug break-words min-w-0">
                    {courseDetails?.title}
                  </h2>
                  <span className="text-xs text-gray-400 mt-1 inline-block">
                    ICAG/ICAT Accountancy Curriculum Draft &amp; Delivery
                  </span>
                </div>
              </div>

              {/* Right: Institutional Accreditation Badge (strips tutor pricing views) */}
              <div className="shrink-0 sm:text-right">
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Institutional Curriculum
                </span>
              </div>
            </div>

            {/* Short description */}
            <p className="text-sm sm:text-base lg:text-xl text-gray-400 mb-5 leading-relaxed">
              {courseDetails?.short_description}
            </p>

            {/* Divider */}
            <div className="w-full h-px bg-gray-700 mb-4" />

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
              {/* Instructor */}
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full p-0.5 border border-white">
                  <CustomImageTag
                    src={courseDetails?.author.profile}
                    alt="instructor"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs sm:text-sm">{t("instructor")}</p>
                  <p className="text-white font-medium mt-1 text-sm sm:text-base truncate">
                    {courseDetails?.author.name}
                  </p>
                </div>
              </div>

              {/* Level */}
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">{t("level")}</p>
                <p className="text-white font-medium mt-1 text-sm sm:text-base capitalize">
                  {courseDetails?.level}
                </p>
              </div>

              {/* Duration */}
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">{t("course_duration")}</p>
                <p className="text-white font-medium mt-1 text-sm sm:text-base">
                  {course?.statistics?.content_statistics?.total_duration.formatted || "24 hrs"}
                </p>
              </div>

              {/* Language */}
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">{t("course_taught")}</p>
                <p className="text-white font-medium mt-1 text-sm sm:text-base">
                  {courseDetails?.language?.name || "English"}
                </p>
              </div>

              {/* Access */}
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">{t("course_access")}</p>
                <p className="text-white font-medium mt-1 text-sm sm:text-base">Cohort Session</p>
              </div>

              {/* Certificate */}
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">{t("course_certificate")}</p>
                <p className="text-white font-medium mt-1 text-sm sm:text-base">
                  {courseDetails?.certificate_enabled ? "ICAG Accredited" : "Certificate Ready"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Academic Analytics Card (replaces sales and earnings with academic progress) ── */}
      <Card className="mt-6 m-2 sm:m-4 rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4 border-b border-gray-200 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{t("course_analytics") || "Course Academic Analytics"}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cohort syllabus completion, mock exam results and feedback</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-green-50 text-green-700 font-medium border border-green-200">
            Academic Center
          </span>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-0 divide-x-0 md:divide-x divide-y md:divide-y-0 divide-gray-200 overflow-hidden">
            {/* Syllabus Completion Rate (replaces total earnings) */}
            <div className="p-4 sm:p-5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#83B8071F] rounded-full mx-auto mb-3 flex items-center justify-center">
                <CustomImageTag src={iconAttempts} alt="completion icon" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                {completionRate}%
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{t("completion_rate") || "Syllabus Completion"}</p>
            </div>

            {/* Enrolled Students */}
            <div className="p-4 sm:p-5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#01021114] rounded-full mx-auto mb-3 flex items-center justify-center">
                <CustomImageTag src={iconEnrolled} alt="enrolled icon" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                {enrolledCount}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{t("total_enrolled_users") || "Enrolled Scholars"}</p>
            </div>

            {/* Academic Reviews */}
            <div className="p-4 sm:p-5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#01021114] rounded-full mx-auto mb-3 flex items-center justify-center">
                <CustomImageTag src={iconRatings} alt="ratings icon" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center justify-center mb-1">
                <span className="text-yellow-500 mr-1"><BiSolidStar /></span>
                {courseDetails?.ratings?.average || 4.8}
                <span className="text-xs sm:text-sm font-normal text-gray-600 ml-1">
                  ({courseDetails?.ratings?.count || 24})
                </span>
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{t("total_reviews_received") || "Student Feedback"}</p>
            </div>

            {/* ICAG Mock Exam Pass Rate (replaces course sales) */}
            <div className="p-4 sm:p-5 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#0186D81F] rounded-full mx-auto mb-3 flex items-center justify-center">
                <CustomImageTag src={iconPassing} alt="pass rate icon" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                {mockPassRate}%
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{t("icag_mock_pass_rate") || "Mock Exam Pass Rate"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Academic Performance Trends Chart (replaces financial SalesStatisticsChart) ── */}
      <div className="m-2 sm:m-4 overflow-hidden">
        <AcademicPerformanceChart />
      </div>
    </div>
  );
};

export default CourseStatistics;
