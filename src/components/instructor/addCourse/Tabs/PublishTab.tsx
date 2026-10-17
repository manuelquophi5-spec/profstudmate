"use client";
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCourseTab } from "@/contexts/CourseTabContext";
import { updateCourseStatus } from "@/utils/api/instructor/createCourseApis/create-course/updateCourseStatus";
import { useDispatch, useSelector } from "react-redux";
import { createdCourseIdSelector, resetCourseRelatedData } from "@/redux/reducers/helpersReducer";
import toast from "react-hot-toast";
import { useParams, usePathname, useRouter } from "next/navigation";
import { addCourseDataSelector, resetAddCourseData, setCourseDetailsData } from "@/redux/instructorReducers/AddCourseSlice";
import { resetCurriculamData } from "@/redux/instructorReducers/createCourseReducers/curriculamSlice";
import { Input } from "@/components/ui/input";
import { CourseDetailsDataType } from "@/types/instructorTypes/instructorTypes";
import { useTranslation } from "@/hooks/useTranslation";
import { getCurrencySymbol } from "@/utils/helpers";
import { IoInformationCircle } from "react-icons/io5";

export default function PublishTab() {

  const { goToPreviousTab } = useCourseTab();
  const router = useRouter();
  const createdCourseId = useSelector(createdCourseIdSelector);
  const createCourseData = useSelector(addCourseDataSelector);
  const { courseDetailsData } = createCourseData;
  const dispatch = useDispatch();
  const { slug } = useParams();

  const pathname = usePathname();
  const isEditCourse = pathname.includes('edit-course');

  const { t } = useTranslation();

  const handleCertificateToggle = (checked: boolean) => {
    dispatch(setCourseDetailsData({ certificateEnabled: checked } as CourseDetailsDataType));
  };

  const handleUpdateCourseStatus = async () => {
    try {
      // Validate that we have a course ID
      if (!createdCourseId) {
        console.error("No course ID available for status update");
        return;
      }

      // R1 / Feature 2: Tutors cannot publish courses directly.
      // Submitting the course updates status to 'pending' for institutional admin review.
      const status = 'pending';

      const certificate_enabled = courseDetailsData?.certificateEnabled ? '1' : '0';
      const certificate_fee = 0; // Certificate fees are institutionally managed; stripped from tutor authoring

      const response = await updateCourseStatus(
        createdCourseId,
        status,
        certificate_enabled,
        certificate_fee
      );

      if (response.success) {
        toast.success(response.message || "Academic curriculum draft submitted successfully for institutional review.");
        dispatch(resetAddCourseData());
        dispatch(resetCourseRelatedData());
        dispatch(resetCurriculamData());
        router.push('/instructor/my-course');
      } else {
        console.error("Failed to update course status:", response.error);
        toast.error(response.error || `${slug ? 'Failed to update course' : 'Failed to submit course'}`);
        // Handle error (e.g., show error toast)
      }
    } catch (error) {
      console.error("Error updating course status:", error);
      // Handle unexpected errors
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col bg-white rounded-lg">
        {/* Main Content */}
        <div className="flex-grow">
          <div className={`p-3 md:p-4 ${courseDetailsData?.isFree ? "" : "border-b border-gray-200"}`}>
            <h2 className="text-base md:text-lg lg:text-xl font-medium">
              {t("publish_settings")}
            </h2>
          </div>

          {/* divider */}

          <div className="p-3 sm:p-4 space-y-4">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="space-y-0.5">
                <label htmlFor="certificate" className="text-sm md:text-base font-medium cursor-pointer">
                  ICAG/ICAT Course Completion Certificate
                </label>
                <p className="text-xs text-muted-foreground">
                  Enable institutional certificate issuance upon student syllabus and assessment completion.
                </p>
              </div>
              <Switch id="certificate" checked={courseDetailsData?.certificateEnabled} onCheckedChange={handleCertificateToggle} />
            </div>
            <div className="border flex p-3.5 items-start gap-3 border-blue-200 rounded-lg bg-blue-50/60 text-blue-900">
              <IoInformationCircle className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
              <div className="text-xs md:text-sm space-y-1">
                <p className="font-medium text-blue-950">Institutional Governance &amp; Draft Review Notice</p>
                <p className="text-blue-900 leading-relaxed">
                  Tutors author curriculum content and submit academic drafts for administrative review. Selling prices,
                  discounts, and certification fees are determined directly by ICAG/ICAT administration in Ghanaian Cedis (GHS)
                  prior to public catalog activation.
                </p>
              </div>
            </div>
          </div>

        </div>
      </Card>

      {/* Footer Navigation */}
      <div className="flex justify-end items-center gap-4 p-3 sectionBg">
        <Button
          variant="ghost"
          className="w-auto text-sm md:text-base"
          onClick={goToPreviousTab}
        >
          {t("previous")}
        </Button>
        <Button
          size="lg"
          className="w-full md:w-auto px-4 md:px-6 lg:px-8 text-sm md:text-base bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-sm"
          onClick={() => handleUpdateCourseStatus()}
        >
          Submit Academic Draft for Review
        </Button>
      </div>
    </div>
  );
}
