import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set');
  }
  const key = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: SCOPES,
  });
}

async function getOrCreatePatientFolder(drive: ReturnType<typeof google.drive>, patientId: string): Promise<string> {
  if (!PARENT_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID env var not set');
  }

  const existing = await drive.files.list({
    q: `name='${patientId}' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: patientId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [PARENT_FOLDER_ID],
    },
    fields: 'id',
  });

  return folder.data.id!;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const patientId = formData.get('patientId') as string | null;
    const title = formData.get('title') as string | null;

    if (!file || !patientId) {
      return NextResponse.json(
        { error: 'File and patientId are required' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const patientFolderId = await getOrCreatePatientFolder(drive, patientId);

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileName = title
      ? `${title}_${new Date().toISOString().split('T')[0]}.${file.name.split('.').pop()}`
      : file.name;

    const uploaded = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [patientFolderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    return NextResponse.json({
      success: true,
      fileId: uploaded.data.id,
      webViewLink: uploaded.data.webViewLink,
      webContentLink: uploaded.data.webContentLink,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Video upload error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
