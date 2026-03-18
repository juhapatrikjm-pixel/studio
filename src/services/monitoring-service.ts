
import {
  Firestore,
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  addDoc,
  serverTimestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface MonitoringRecord {
  id?: string;
  userId: string;
  date: Date | Timestamp | null;
  recordedBy: string;
  targetName: string;
  category: string;
  productName?: string;
  supplier?: string;
  value?: string;
  value2?: string;
  time?: string;
  time2?: string;
  comment?: string;
  status?: boolean;
  updatedAt: Date | Timestamp | null;
}

export interface MonitoringTemplate {
  id: string;
  name: string;
  category: string;
  type: 'temperature' | 'checklist' | 'date';
}

// Template management
export const getTemplates = async (db: Firestore): Promise<MonitoringTemplate[]> => {
  try {
    const q = query(collection(db, 'monitoringTemplates'));
    const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MonitoringTemplate));
  } catch (error) {
    console.error("Error fetching templates:", error);
    throw error;
  }
};

export const addTemplate = async (db: Firestore, template: Omit<MonitoringTemplate, 'id'>) => {
  try {
    await addDoc(collection(db, 'monitoringTemplates'), template);
  } catch (error) {
    console.error("Error adding template:", error);
    throw error;
  }
};

export const deleteTemplate = async (db: Firestore, templateId: string) => {
  try {
    if (!templateId) return;
    await deleteDoc(doc(db, 'monitoringTemplates', templateId));
  } catch (error) {
    console.error("Error deleting template:", error);
    throw error;
  }
};

// Active records management
export const getActiveRecords = async (db: Firestore, userId: string): Promise<MonitoringRecord[]> => {
  try {
    const q = query(collection(db, `users/${userId}/activeMonitoring`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MonitoringRecord));
  } catch (error) {
    console.error("Error fetching active records:", error);
    throw error;
  }
};

export const saveActiveRecord = async (db: Firestore, userId: string, record: Partial<MonitoringRecord>) => {
  try {
    if (!record.category || !record.targetName) throw new Error("Category and targetName are required");
    const recordId = record.id || `${record.category}_${record.targetName}`.replace(/[^a-zA-Z0-9_]/g, '');
    const docRef = doc(db, `users/${userId}/activeMonitoring`, recordId);
    await setDoc(docRef, { ...record, id: recordId }, { merge: true });
  } catch (error) {
    console.error("Error saving active record:", error);
    throw error;
  }
};

// Archiving
export const archiveMonitoringDay = async (db: Firestore, userId: string, recordedBy: string) => {
  try {
    const batch = writeBatch(db);
    const activeRecordsRef = collection(db, `users/${userId}/activeMonitoring`);
    const snapshot = await getDocs(activeRecordsRef);

    if (snapshot.empty) return;

    const historyRef = doc(collection(db, `users/${userId}/monitoringHistory`));
    const archiveData = snapshot.docs.map(d => d.data());

    batch.set(historyRef, {
      createdAt: serverTimestamp(),
      recordedBy,
      records: archiveData,
      date: snapshot.docs[0].data().date
    });

    snapshot.docs.forEach(d => {
      batch.delete(d.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error archiving monitoring day:", error);
    throw error;
  }
};

// File uploads
const uploadFile = async (db: Firestore, userId: string, file: Blob | File, folderId: string, type: string, fileName: string) => {
  try {
    const storage = getStorage();
    const filePath = `users/${userId}/${folderId}/${Date.now()}-${fileName}`;
    const storageRef = ref(storage, filePath);

    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    await addDoc(collection(db, 'cloudFiles'), {
        folderId,
        type,
        name: fileName,
        url: downloadURL,
        path: filePath,
        size: file.size,
        contentType: file.type,
        createdAt: serverTimestamp(),
        userId,
    });

    return { url: downloadURL, name: fileName };
  } catch (error) {
    console.error(`Error uploading file ${fileName}:`, error);
    throw error;
  }
}

export const uploadArchiveFile = async (db: Firestore, userId: string, file: Blob, fileName: string) => {
    const reportFile = new File([file], fileName, { type: 'application/pdf' });
    return uploadFile(db, userId, reportFile, 'omavalvonta_arkisto', 'report', fileName);
};

export const uploadFormFile = async (db: Firestore, userId: string, file: File) => {
    return uploadFile(db, userId, file, 'omavalvonta_arkisto', 'form', file.name);
};
