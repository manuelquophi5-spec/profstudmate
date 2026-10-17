import React from "react";
import VirtualClassroomHub from "@/components/pagesComponent/room/VirtualClassroomHub";

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default async function CourseRoomPage({ params }: PageProps) {
  const { courseId } = await params;
  return <VirtualClassroomHub courseId={courseId} />;
}
