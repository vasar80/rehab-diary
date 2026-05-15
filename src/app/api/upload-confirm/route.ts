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

export async function POST(request: NextRequest) {
  try {
    const { fileName, patientId, patientName } = await request.json();
    if (!fileName || !patientId) {
      return NextResponse.json({ error: 'fileName and patientId required' }, { status: 400 });
    }

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const folderName = (patientName && patientName.trim()) || patientId;
    const safeFolderName = folderName.replace(/'/g, "\\'");

    const folderQuery = await drive.files.list({
      q: `name='${safeFolderName}' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const folderId = folderQuery.data.files?.[0]?.id;
    if (!folderId) {
      return NextResponse.json({ error: 'Patient folder not found' }, { status: 404 });
    }

    const safeFileName = fileName.replace(/'/g, "\\'");
    const fileQuery = await drive.files.list({
      q: `name='${safeFileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, webViewLink, webContentLink, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const file = fileQuery.data.files?.[0];
    if (!file) {
      return NextResponse.json({ error: 'File not found on Drive' }, { status: 404 });
    }

    return NextResponse.json({
      id: file.id,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Confirm failed';
    console.error('Upload confirm error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
