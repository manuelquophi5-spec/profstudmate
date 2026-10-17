"use client";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCourseTab } from "@/contexts/CourseTabContext";
import { FaAngleRight } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { setCourseDetailsData } from "@/redux/instructorReducers/AddCourseSlice";
import { CourseDetailsDataType } from "@/types/instructorTypes/instructorTypes";
import { useTranslation } from "@/hooks/useTranslation";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { isRTLSelector } from "@/redux/reducers/languageSlice";
import { ShieldCheck, BookOpen, Scale, Award } from "lucide-react";

interface PricingTabProps {
  handleCreateCourse: () => void;
  isCourseCreated: boolean;
}

const PricingTab: React.FC<PricingTabProps> = ({ handleCreateCourse, isCourseCreated }) => {
  const { goToPreviousTab } = useCourseTab();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isRTL = useSelector(isRTLSelector);

  // Ensure price and discount are explicitly cleared from Redux state on mount
  useEffect(() => {
    dispatch(
      setCourseDetailsData({
        price: null,
        discount: null,
        isFree: false,
      } as unknown as CourseDetailsDataType)
    );
  }, [dispatch]);

  // Handle continue to next tab (Curriculum)
  const handleContinue = () => {
    // Tutors do not author price or discount; proceed directly to curriculum draft creation
    handleCreateCourse();
  };

  return (
    <div className={`flex flex-col gap-6 ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="space-y-4 md:space-y-6 bg-white rounded-lg p-4 md:p-6 border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              {t("pricing")} &amp; Institutional Governance
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2.5 py-1 font-medium">
              ICAG / ICAT Governance
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Course tuition fees, currency rates (GHS), and discount structures are institutionally governed.
          </p>
        </div>

        {/* Institutional Governance Banner */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 via-slate-50/80 to-blue-50/30 p-5 md:p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base md:text-lg font-semibold text-gray-900">
                Institutional Course Pricing Policy
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                In strict adherence to ICAG/ICAT professional accountancy institute governance, course tuition fees,
                discount structures, and student payment terms are established centrally by the Institute Administration
                upon comprehensive academic review of submitted curriculum drafts.
              </p>
            </div>
          </div>

          {/* Governance Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/80 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <Scale className="w-4 h-4 shrink-0" />
                <span>Administrative Pricing</span>
              </div>
              <p className="text-xs text-gray-600 leading-normal">
                Official selling prices in Ghanaian Cedis (GHS) are determined by institute leadership matching ICAG/ICAT Level 1, 2, or 3 syllabus benchmarks.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/80 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Academic Draft Submission</span>
              </div>
              <p className="text-xs text-gray-600 leading-normal">
                Tutors author the academic syllabus, video lectures, chunked uploads, and assessments. Upon completion, the course enters institutional review (<span className="font-mono text-[11px] bg-gray-100 px-1 py-0.5 rounded">status: pending</span>).
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/80 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <Award className="w-4 h-4 shrink-0" />
                <span>Accreditation &amp; Review</span>
              </div>
              <p className="text-xs text-gray-600 leading-normal">
                Once reviewed and priced by administrators, the course is published to the public catalog and assigned to authorized lead faculty tutors.
              </p>
            </div>
          </div>

          {/* Informational Guidance Callout */}
          <div className="flex items-start gap-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg text-blue-900 text-xs md:text-sm">
            <HiOutlineInformationCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">No pricing authoring required from tutors.</span> Please click{" "}
              <span className="font-semibold text-gray-900">&quot;Save &amp; Continue&quot;</span> below to proceed to the{" "}
              <span className="font-medium">Curriculum &amp; Content</span> studio to configure your lectures, chapters, and quizzes.
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-end items-center gap-4 p-3 bg-white rounded-lg border border-gray-200">
        <Button
          variant="ghost"
          className="w-auto text-sm md:text-base"
          onClick={goToPreviousTab}
        >
          {t("previous")}
        </Button>
        <Button
          disabled={isCourseCreated}
          className="w-auto bg-black text-white hover:bg-black/90 px-4 md:px-6 text-sm md:text-base flex items-center gap-2"
          onClick={handleContinue}
        >
          {t("save_and_continue")}
          <FaAngleRight className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isRTL ? "rotate-180" : ""}`} />
        </Button>
      </div>
    </div>
  );
};

export default PricingTab;