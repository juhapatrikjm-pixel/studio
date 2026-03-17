import { Firestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { FirebaseStorage, ref, uploadBytes, listAll, getDownloadURL } from 'firebase/storage';

/**
 * @fileOverview Omavalvonnan liiketoimintalogiikka ja tietokantaoperaatiot.
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
  category: string;
}

export interface MonitoringTemplate {
  id: string;
  name: string;
  category: string;
  targetLimit: string;
  type: 'temperature' | 'sensory' | 'boolean' | 'text' | 'date';
}

export const getRegulatoryUrl = async (db: Firestore): Promise<string | null> => {
  try {
    const settingsRef = doc(db, 'settings', 'global');
    const snap = await getDoc(settingsRef);
    return snap.exists() ? snap.data().regulatoryUrl || null : null;
  } catch (error) {
    return null;
  }
};

export const saveRegulatoryUrl = async (db: Firestore, url: string) => {
  const settingsRef = doc(db, 'settings', 'global');
  await setDoc(settingsRef, { regulatoryUrl: url }, { merge: true });
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
    console.error("Error saving record", error);
    throw error;
  }
};

export const getMonitoringTemplates = async (db: Firestore): Promise<MonitoringTemplate[]> => {
  const colRef = collection(db, 'monitoringTemplates');
  const snap = await getDocs(colRef);
  let templates = snap.docs.map(d => ({ ...d.data(), id: d.id } as MonitoringTemplate));
  
  if (templates.length === 0) {
    const defaults: Omit<MonitoringTemplate, 'id'>[] = [
      { name: "Kylmiö 1", category: "Kylmälaitteet", targetLimit: "max +6 °C", type: "temperature" },
      { name: "Pakastin 1", category: "Kylmälaitteet", targetLimit: "max -18 °C", type: "temperature" },
      { name: "Lounaskeitto", category: "Kuumennus", targetLimit: "min +70 °C", type: "temperature" },
      { name: "Uudelleenkuumennus (prep)", category: "Kuumennus", targetLimit: "min +70 °C", type: "temperature" },
      { name: "Raaka-aine mittaus", category: "Kuumennus", targetLimit: "min +70 °C", type: "temperature" },
      { name: "Raaka-aine (Broileri)", category: "Kuumennus", targetLimit: "min +78 °C", type: "temperature" },
      { name: "Jäähdytysseuranta", category: "Jäähdytys", targetLimit: "60 -> 6 °C / 4h", type: "text" },
      { name: "Kuorman lämpötila", category: "Vastaanotto", targetLimit: "pakaste -18 / tuore +6", type: "temperature" },
      { name: "Keittiön tasot", category: "Puhdistus", targetLimit: "Puhdas", type: "boolean" },
      { name: "Pesuvesi", category: "Astianpesu", targetLimit: "min +60 °C", type: "temperature" },
      { name: "Huuhteluvesi", category: "Astianpesu", targetLimit: "min +80 °C", type: "temperature" },
      { name: "Buffet Lämmin", category: "Buffet", targetLimit: "min +60 °C", type: "temperature" },
      { name: "Buffet Kylmä", category: "Buffet", targetLimit: "max +12 °C", type: "temperature" },
      { name: "Lämmin raaka-aine (Buffet)", category: "Buffet", targetLimit: "min +60 °C", type: "temperature" },
      { name: "Kylmä raaka-aine (Buffet)", category: "Buffet", targetLimit: "max +12 °C", type: "temperature" },
    ];
    
    const batch = writeBatch(db);
    for (const t of defaults) {
      const newRef = doc(collection(db, 'monitoringTemplates'));
      batch.set(newRef, t);
    }
    await batch.commit();
    return getMonitoringTemplates(db);
  }
  
  return templates;
};

export const addTemplate = async (db: Firestore, template: Omit<MonitoringTemplate, 'id'>) => {
  await addDoc(collection(db, 'monitoringTemplates'), template);
};

export const deleteTemplate = async (db: Firestore, id: string) => {
  await deleteDoc(doc(db, 'monitoringTemplates', id));
};

export const archiveDay = async (db: Firestore, date: string, user: string) => {
  const id = `archive_${date}_${Math.random().toString(36).substr(2, 5)}`;
  await setDoc(doc(db, 'uploadedRecipes', id), {
    id,
    name: `Tehtävä ${date}`,
    type: 'application/pdf-mock',
    size: '0.1 MB',
    folderId: 'omavalvonta_arkisto',
    createdAt: serverTimestamp(),
    recordedBy: user
  });
};
