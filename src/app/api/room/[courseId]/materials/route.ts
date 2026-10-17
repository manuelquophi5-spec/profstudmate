import { NextRequest, NextResponse } from 'next/server';
import { mockStore, AcademicMaterial } from '@/lib/mockApiStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const cid = parseInt(courseId, 10);
  const materials = mockStore.materials.filter((m) => m.course_id === cid);

  return NextResponse.json({ success: true, count: materials.length, data: materials });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const cid = parseInt(courseId, 10);

    const body = await request.json();
    const { title, fileUrl, fileType, uploadedBy } = body;

    if (!title || !fileUrl || !uploadedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required material fields (title, fileUrl, uploadedBy)' },
        { status: 400 }
      );
    }

    const newMaterial: AcademicMaterial = {
      id: `m_${Date.now()}`,
      course_id: cid,
      title,
      file_url: fileUrl,
      file_type: fileType || 'pdf',
      uploaded_by: Number(uploadedBy),
      created_at: new Date().toISOString()
    };

    mockStore.materials.push(newMaterial);

    return NextResponse.json({ success: true, data: newMaterial }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
