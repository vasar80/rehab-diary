import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set');
  const key = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
}

async function getOrCreatePatientFolder(
  drive: ReturnType<typeof google.drive>,
  folderName: string
): Promise<string> {
  if (!PARENT_FOLDER_ID) throw new Error('GOOGLE_DRIVE_FOLDER_ID env var not set');

  const safeName = folderName.replace(/'/g, "\\'");

  const existing = await drive.files.list({
    q: `name='${safeName}' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [PARENT_FOLDER_ID],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  return folder.data.id!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, mimeType, fileSize, patientId, patientName, title } = body;

    if (!filename || !mimeType || !fileSize || !patientId) {
      return NextResponse.json(
        { error: 'filename, mimeType, fileSize, patientId required' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const folderName = (patientName && patientName.trim()) || patientId;
    const patientFolderId = await getOrCreatePatientFolder(drive, folderName);

    const ext = filename.split('.').pop() || 'mp4';
    const finalName = title
      ? `${title}_${new Date().toISOString().split('T')[0]}.${ext}`
      : filename;

    const client = await auth.getClient();
    const tokenResp = await client.getAccessToken();
    const accessToken = tokenResp.token;
    if (!accessToken) throw new Error('Failed to get access token');

    const origin =
      request.headers.get('origin') ||
      (request.headers.get('referer')
        ? new URL(request.headers.get('referer')!).origin
        : '');

    const initResp = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': String(fileSize),
          ...(origin ? { Origin: origin } : {}),
        },
        body: JSON.stringify({
          name: finalName,
          parents: [patientFolderId],
          mimeType,
        }),
      }
    );

    if (!initResp.ok) {
      const errText = await initResp.text();
      throw new Error(`Drive init failed: ${initResp.status} ${errText}`);
    }

    const uploadUrl = initResp.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL returned from Drive');

    return NextResponse.json({ uploadUrl, fileName: finalName });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Init failed';
    console.error('Upload init error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
