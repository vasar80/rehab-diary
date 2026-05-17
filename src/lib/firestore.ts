import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { ContractItem, DailyEntry, RehabVideo, Patient, Therapist } from './types';

// --- Patients ---

export async function getPatient(patientId: string): Promise<Patient | null> {
  const snap = await getDoc(doc(db, 'patients', patientId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Patient) : null;
}

export async function getAllPatients(): Promise<Patient[]> {
  const snap = await getDocs(collection(db, 'patients'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Patient);
}

export async function savePatient(patient: Patient): Promise<void> {
  await setDoc(doc(db, 'patients', patient.id), {
    name: patient.name,
    email: patient.email,
    sex: patient.sex || null,
    startDate: patient.startDate,
    therapistId: patient.therapistId,
    externalId: patient.externalId || null,
    avatarUrl: patient.avatarUrl || null,
  });
}

// --- Therapists ---

export async function getTherapist(therapistId: string): Promise<Therapist | null> {
  const snap = await getDoc(doc(db, 'therapists', therapistId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Therapist) : null;
}

export async function getAllTherapists(): Promise<Therapist[]> {
  const snap = await getDocs(collection(db, 'therapists'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Therapist);
}

export async function saveTherapist(therapist: Therapist): Promise<void> {
  await setDoc(doc(db, 'therapists', therapist.id), {
    name: therapist.name,
    email: therapist.email,
    specialty: therapist.specialty || null,
    sex: therapist.sex || null,
    createdAt: therapist.createdAt || new Date().toISOString(),
  });
}

export async function getPatientsForTherapist(therapistId: string): Promise<Patient[]> {
  const q = query(collection(db, 'patients'), where('therapistId', '==', therapistId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Patient);
}

export async function assignTherapistToPatient(patientId: string, therapistId: string): Promise<void> {
  await updateDoc(doc(db, 'patients', patientId), { therapistId });
}

// --- Contract Items ---

export async function getContractItems(patientId: string): Promise<ContractItem[]> {
  const q = query(
    collection(db, 'contractItems'),
    where('patientId', '==', patientId),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContractItem);
}

export async function saveContractItem(item: ContractItem): Promise<string> {
  if (item.id && item.id.length > 0) {
    await setDoc(doc(db, 'contractItems', item.id), {
      patientId: item.patientId,
      type: item.type,
      text: item.text,
      icon: item.icon,
      isActive: item.isActive,
      createdAt: item.createdAt,
    });
    return item.id;
  }
  const ref = await addDoc(collection(db, 'contractItems'), {
    patientId: item.patientId,
    type: item.type,
    text: item.text,
    icon: item.icon,
    isActive: item.isActive,
    createdAt: item.createdAt,
  });
  return ref.id;
}

export async function toggleContractItemActive(itemId: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, 'contractItems', itemId), { isActive });
}

// --- Daily Entries ---

export async function getDailyEntries(patientId: string): Promise<DailyEntry[]> {
  const q = query(
    collection(db, 'dailyEntries'),
    where('patientId', '==', patientId),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyEntry);
}

export async function saveDailyEntry(entry: DailyEntry): Promise<string> {
  const data: DocumentData = {
    patientId: entry.patientId,
    date: entry.date,
    mood: entry.mood ?? null,
    didTherapy: entry.didTherapy,
    therapyMinutes: entry.therapyMinutes ?? null,
    feeling: entry.feeling ?? null,
    noTherapyReason: entry.noTherapyReason ?? null,
    practicedActions: entry.practicedActions ?? null,
    noPracticedActionsReason: entry.noPracticedActionsReason ?? null,
    selectedActions: entry.selectedActions ?? [],
    handInOtherActivities: entry.handInOtherActivities ?? null,
    noHandReason: entry.noHandReason ?? null,
    posture: entry.posture ?? null,
    noticedCompensations: entry.noticedCompensations ?? null,
    compensationTypes: entry.compensationTypes ?? [],
    compensationNotes: entry.compensationNotes ?? null,
    contractResponses: entry.contractResponses,
    notes: entry.notes ?? null,
    completedAt: entry.completedAt ?? null,
  };
  if (entry.id && !entry.id.startsWith('entry-')) {
    await setDoc(doc(db, 'dailyEntries', entry.id), data);
    return entry.id;
  }
  const ref = await addDoc(collection(db, 'dailyEntries'), data);
  return ref.id;
}

export async function deleteDailyEntry(entryId: string): Promise<void> {
  if (entryId && !entryId.startsWith('entry-')) {
    await deleteDoc(doc(db, 'dailyEntries', entryId));
  }
}

export async function getTodayEntry(patientId: string): Promise<DailyEntry | null> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'dailyEntries'),
    where('patientId', '==', patientId),
    where('date', '==', today)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as DailyEntry;
}

// --- Videos ---

export async function getVideos(patientId: string): Promise<RehabVideo[]> {
  const q = query(
    collection(db, 'videos'),
    where('patientId', '==', patientId),
    orderBy('uploadedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RehabVideo);
}

export async function saveVideo(video: RehabVideo): Promise<string> {
  const ref = await addDoc(collection(db, 'videos'), {
    patientId: video.patientId,
    title: video.title,
    date: video.date,
    thumbnailUrl: video.thumbnailUrl ?? null,
    googleDriveUrl: video.googleDriveUrl ?? null,
    driveFileId: video.driveFileId ?? null,
    duration: video.duration ?? null,
    notes: video.notes ?? null,
    uploadedAt: video.uploadedAt,
  });
  return ref.id;
}
