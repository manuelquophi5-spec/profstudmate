import React from "react";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/commonComp/Breadcrumb";
import { BookstoreCatalog } from "@/components/pagesComponent/shop/BookstoreCatalog";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICAG/ICAT Bookstore | Official Study Texts & Revision Manuals",
  description:
    "Official prescribed textbooks, question banks, and digital revision manuals for ICAG and CITG professional accountancy qualifications in Ghana.",
};

export default function ShopPage() {
  return (
    <Layout>
      <Breadcrumb
        title="ICAG / ICAT Official Bookstore"
        firstElement="Bookstore"
      />
      <main className="min-h-screen bg-gray-50/50">
        <BookstoreCatalog />
      </main>
    </Layout>
  );
}
