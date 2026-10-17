"use client";

import React, { useState, useEffect, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/commonComp/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSelector } from "react-redux";
import { userDataSelector } from "@/redux/reducers/userSlice";
import {
  Video,
  Lock,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  Send,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface DiscussionMessage {
  id: number;
  course_id: number;
  author_id: number;
  author_name: string;
  author_role: "student" | "tutor" | "admin";
  content: string;
  created_at: string;
}

interface StudyMaterial {
  id: number;
  course_id: number;
  title: string;
  file_url: string;
  format: string;
  size?: string;
  created_at?: string;
}

interface RoomData {
  course_id: number;
  course_title: string;
  level: string;
  assigned_tutor_id: number;
  live_lecture: {
    topic: string;
    scheduled_start: string;
    duration_minutes: number;
    zoom_join_url: string;
    passcode: string;
  };
  discussions: DiscussionMessage[];
  study_materials: StudyMaterial[];
}

interface VirtualClassroomHubProps {
  courseId: string;
}

export default function VirtualClassroomHub({ courseId }: VirtualClassroomHubProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = useSelector(userDataSelector) as any;
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDenied, setIsDenied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"discussion" | "materials" | "session">("discussion");
  const [newMessage, setNewMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedPasscode, setCopiedPasscode] = useState<boolean>(false);

  const userId = currentUser?.id || 10;
  const userRole = currentUser?.role || (currentUser?.is_instructor ? "tutor" : "student");
  const userName = currentUser?.name || currentUser?.username || "ICAG Scholar";

  const fetchRoomData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/room/${courseId}?userId=${userId}&role=${userRole}`, {
        headers: {
          "x-user-id": String(userId),
          "x-user-role": userRole,
        },
      });

      if (res.status === 403) {
        setIsDenied(true);
        setIsLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setRoomData(json.data);
        setIsDenied(false);
      } else {
        toast.error(json.error || "Failed to load classroom data");
      }
    } catch (err) {
      console.error("Error loading classroom:", err);
      toast.error("Network error while connecting to virtual classroom");
    } finally {
      setIsLoading(false);
    }
  }, [courseId, userId, userRole]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/room/${courseId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          authorName: userName,
          authorRole: userRole,
          content: newMessage.trim(),
        }),
      });

      const json = await res.json();
      if (res.status === 201 && json.data) {
        setRoomData((prev) =>
          prev
            ? {
                ...prev,
                discussions: [json.data, ...prev.discussions],
              }
            : prev
        );
        setNewMessage("");
        toast.success("Question posted to classroom feed");
      } else {
        toast.error(json.error || "Failed to post message");
      }
    } catch (err) {
      console.error("Failed to post message:", err);
      toast.error("Failed to submit message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPasscode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPasscode(true);
    toast.success("Zoom passcode copied to clipboard");
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Connecting to Virtual Classroom Hub...</h2>
          <p className="text-gray-500 text-sm mt-1">Verifying ICAG institutional course enrollment credentials</p>
        </div>
      </Layout>
    );
  }

  if (isDenied) {
    return (
      <Layout>
        <div className="container py-20">
          <Card className="max-w-2xl mx-auto p-8 text-center bg-white border border-red-200 shadow-sm rounded-xl">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Institutional Enrollment Required</h1>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Access to this virtual classroom and live Zoom lecture hub is strictly restricted to students actively
              registered for this ICAG course.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/course-details/${courseId}`}>
                <Button className="primaryBg text-white w-full sm:w-auto">View Course & Register</Button>
              </Link>
              <Link href="/my-learnings">
                <Button variant="outline" className="w-full sm:w-auto">Return to My Learnings</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!roomData) return null;

  return (
    <Layout>
      <Breadcrumb
        title={roomData.course_title}
        firstElement="Virtual Classroom"
        secondElement={roomData.level}
      />

      <div className="container py-8">
        {/* Live Zoom Class Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 sm:p-8 mb-8 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-xs">
                  ICAG Live Lecture Hub
                </Badge>
                <span className="text-xs text-slate-300 font-medium">| {roomData.level}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {roomData.live_lecture.topic}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Scheduled Session</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>{roomData.live_lecture.duration_minutes} Minutes Duration</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                  <span className="text-slate-400">Passcode:</span>
                  <span className="font-mono font-semibold text-white">{roomData.live_lecture.passcode}</span>
                  <button
                    onClick={() => handleCopyPasscode(roomData.live_lecture.passcode)}
                    className="ml-1 text-slate-400 hover:text-white transition-colors"
                    title="Copy passcode"
                  >
                    {copiedPasscode ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
              <a
                href={roomData.live_lecture.zoom_join_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 shadow-sm">
                  <Video className="w-5 h-5" />
                  <span>Join Live Lecture via Zoom</span>
                  <ExternalLink className="w-4 h-4 opacity-75" />
                </Button>
              </a>
              <span className="text-[11px] text-center text-slate-400">
                Authenticated for {userRole.toUpperCase()} ID #{userId}
              </span>
            </div>
          </div>
        </div>

        {/* Classroom Tabs Navigation */}
        <div className="flex border-b border-gray-200 mb-6 space-x-8">
          <button
            onClick={() => setActiveTab("discussion")}
            className={`pb-3.5 font-medium text-sm sm:text-base flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "discussion"
                ? "border-primary primaryColor"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Academic Discussions ({roomData.discussions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("materials")}
            className={`pb-3.5 font-medium text-sm sm:text-base flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "materials"
                ? "border-primary primaryColor"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Handouts & Study Repository ({roomData.study_materials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("session")}
            className={`pb-3.5 font-medium text-sm sm:text-base flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "session"
                ? "border-primary primaryColor"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Syllabus & Guidance</span>
          </button>
        </div>

        {/* Tab 1: Academic Discussion Feed */}
        {activeTab === "discussion" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-xs">
              <form onSubmit={handlePostMessage} className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Posting as <strong>{userName}</strong> ({userRole})</span>
                  </div>
                  <span className="text-gray-400">Classroom discussions are monitored by ICAG Academic Board</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question or share academic analysis on this course..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow bg-gray-50 border-gray-200"
                  />
                  <Button type="submit" disabled={isSubmitting || !newMessage.trim()} className="primaryBg text-white shrink-0">
                    <Send className="w-4 h-4 mr-1.5" />
                    <span>Post</span>
                  </Button>
                </div>
              </form>
            </Card>

            <div className="space-y-3">
              {roomData.discussions.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-white border border-dashed rounded-xl">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="font-medium">No discussions yet in this course</p>
                  <p className="text-xs text-gray-400 mt-0.5">Be the first to post a question for your lecturer and classmates.</p>
                </div>
              ) : (
                roomData.discussions.map((msg) => (
                  <Card key={msg.id} className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{msg.author_name}</span>
                        {msg.author_role === "tutor" && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none text-[10px] font-semibold">
                            Lead Faculty
                          </Badge>
                        )}
                        {msg.author_role === "admin" && (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none text-[10px] font-semibold">
                            Academic Admin
                          </Badge>
                        )}
                        {msg.author_role === "student" && (
                          <Badge variant="outline" className="text-gray-600 text-[10px]">
                            Student
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">{msg.created_at}</span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.content}</p>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Study Materials & Handouts */}
        {activeTab === "materials" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roomData.study_materials.length === 0 ? (
                <div className="col-span-2 p-12 text-center text-gray-500 bg-white border border-dashed rounded-xl">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="font-medium">No supplemental study materials posted yet</p>
                </div>
              ) : (
                roomData.study_materials.map((mat) => (
                  <Card key={mat.id} className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:shadow-xs transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">{mat.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span className="uppercase font-semibold">{mat.format}</span>
                          {mat.size && <span>• {mat.size}</span>}
                        </div>
                      </div>
                    </div>

                    <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </Button>
                    </a>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Syllabus Guidance */}
        {activeTab === "session" && (
          <Card className="p-6 bg-white border border-gray-200 rounded-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">ICAG Academic Guidance & Conduct</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              This virtual classroom space is an official academic learning environment for students of the Institute of Chartered Accountants, Ghana.
              All participants are required to adhere to the ICAG Code of Professional Conduct.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 mb-1">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Attendance & Live Participation</span>
                </div>
                <p className="text-xs text-gray-600">
                  Join scheduled Zoom lectures with your registered student name and ID to receive accredited study hours.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 mb-1">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>Intellectual Property Protection</span>
                </div>
                <p className="text-xs text-gray-600">
                  Course handouts, recordings, and live lecture links are strictly proprietary to ICAG and must not be distributed externally.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
