import { Firestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { FirebaseStorage, ref, uploadBytes, listAll, getDownloadURL } from 'firebase/storage';

/**
 * @fileOverview Omavalvonnan liiketoimintalogiikka ja tietokantaoperaatiot.
 * Keskittyy "wisemisa"-tietokantaan.
 */

export interface MonitoringRecord {
  id?: string;
  date: any;
  recordedBy: string;
  targetName: string;
  value: string;
  comment?: string;
  status: boolean;
  method: 'manual' | 'bluetooth' | 'paper_sync';
  category?: string;
  additionalData?: any;
}

export interface MonitoringTemplate {
  id: string;
  name: string;
  category: string;
  targetLimit: string;
  type: 'temperature' | 'sensory' | 'boolean' | 'date' | 'text';
}

export const getRegulatoryUrl = async (db: Firestore): Promise<string | null> => {
  try {
    const settingsRef = doc(db, 'settings', 'global');
    const snap = await getDoc(settingsRef);
    return snap.exists() ? snap.data().regulatoryUrl || null : null;
  } catch (error) {
    console.error("Error fetching regulatory URL", error);
    return null;
  }
};

export const saveMonitoringRecord = async (db: Firestore, record: Partial<MonitoringRecord>) => {
  try {
    const recordData = {
      ...record,
      date: serverTimestamp(),
      status: true
    };
    await addDoc(collection(db, 'selfMonitoringRecords'), recordData);
    return { success: true };
  } catch (error) {
    console.error("Monitoring Service: Error saving record", error);
    throw error;
  }
};

export const handleBluetoothMeasurement = async () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve("4.5"), 1500);
  });
};

// Storage helpers
export const uploadDocument = async (storage: FirebaseStorage, file: File) => {
  const fileRef = ref(storage, `monitoring-docs/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  return fileRef;
};

export const listDocuments = async (storage: FirebaseStorage) => {
  const listRef = ref(storage, 'monitoring-docs');
  const res = await listAll(listRef);
  const files = await Promise.all(
    res.items.map(async (item) => ({
      name: item.name,
      url: await getDownloadURL(item),
    }))
  );
  return files;
};

export const getMonitoringTemplates = async (db: Firestore): Promise<MonitoringTemplate[]> => {
  try {
    const colRef = collection(db, 'monitoringTemplates');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as MonitoringTemplate));
  } catch (error) {
    console.error("Error fetching templates", error);
    return [];
  }
};

export const addMonitoringTemplate = async (db: Firestore, template: Omit<MonitoringTemplate, 'id'>) => {
  const colRef = collection(db, 'monitoringTemplates');
  await addDoc(colRef, { ...template });
};
