import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import InstitutionalCourseGovernance from "@/components/admin/InstitutionalCourseGovernance";

export const metadata: Metadata = {
  title: "Course Governance & Admin Pricing Console | ICAG eLMS",
  description: "Institutional Course Governance and official course pricing console for ICAG/ICAT Ghana administration."
};

export default function AdminCoursesPage() {
  return (
    <Layout>
      <div className="bg-[#F8F9FA] min-h-[calc(100vh-140px)] py-8">
        <div className="container mx-auto px-4 md:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <Link href="/" className="hover:text-[#5a5bb5] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500">Admin Console</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-[#5a5bb5]">Course Governance &amp; Pricing</span>
          </nav>

          {/* Main Console Component */}
          <InstitutionalCourseGovernance />
        </div>
      </div>
    </Layout>
  );
}
