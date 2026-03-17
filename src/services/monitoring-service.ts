import { Firestore, collection, query, getDocs, serverTimestamp, doc, setDoc, deleteDoc, where, writeBatch, orderBy } from 'firebase/firestore';

/**
 * @fileOverview Omavalvonnan liiketoimintalogiikka.
 * Toteuttaa "State-First" -arkkitehtuurin (Active -> Archive).
 */

export interface MonitoringRecord {
  id?: string;
  userId: string;
  date: any;
  recordedBy: string;
  targetName: string;
  category: string;
  value?: string;
  value2?: string; // Esim. Jäähdytyksen loppulämpö tai Buffan 2h mittaus
  time?: string;
  time2?: string;
  comment?: string;
  status?: boolean;
  updatedAt: any;
}

export interface MonitoringTemplate {
  id: string;
  name: string;
  category: string;
  targetLimit?: string;
  type: 'temperature' | 'checklist' | 'cooling' | 'buffet' | 'dishwash';
}

// Vastaus varmistuskysymykseen 1: Tässä tallennetaan data Firestoreen
export const saveActiveRecord = async (db: Firestore, userId: string, record: Partial<MonitoringRecord>) => {
  if (!record.targetName || !record.category) return;
  const id = `${userId}_${record.category}_${record.targetName.replace(/\s+/g, '_')}`;
  const docRef = doc(db, 'omavalvonta_active', id);
  
  await setDoc(docRef, {
    ...record,
    userId,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getActiveRecords = async (db: Firestore, userId: string) => {
  const colRef = collection(db, 'omavalvonta_active');
  const q = query(colRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
};

export const archiveMonitoringDay = async (db: Firestore, userId: string, userName: string) => {
  const activeRecords = await getActiveRecords(db, userId);
  if (activeRecords.length === 0) return;

  const batch = writeBatch(db);
  const archiveDate = new Date();
  const dateStr = archiveDate.toLocaleDateString('fi-FI');
  const archiveId = `archive_${userId}_${archiveDate.getTime()}`;

  const archiveRef = doc(db, 'omavalvonta_archive', archiveId);
  batch.set(archiveRef, {
    userId,
    userName,
    date: archiveDate,
    dateStr,
    records: activeRecords,
    createdAt: serverTimestamp()
  });

  activeRecords.forEach(r => {
    if (r.id) {
      batch.delete(doc(db, 'omavalvonta_active', r.id));
    }
  });

  // Lisätään arkistomerkintä myös dokumentteihin
  const fileRef = doc(db, 'uploadedRecipes', `omavalvonta_${archiveId}`);
  batch.set(fileRef, {
    id: `omavalvonta_${archiveId}`,
    name: `Tehty ${dateStr}`,
    type: 'application/pdf', // Simuloidaan raporttia
    size: '0.5 MB',
    folderId: 'omavalvonta_arkisto',
    createdAt: serverTimestamp()
  });

  await batch.commit();
};

export const getTemplates = async (db: Firestore) => {
  const snap = await getDocs(collection(db, 'monitoringTemplates'));
  if (snap.empty) {
    const defaults: Omit<MonitoringTemplate, 'id'>[] = [
      { name: "Kylmiö 1", category: "Kylmäketju", targetLimit: "max +6 °C", type: 'temperature' },
      { name: "Pakastin 1", category: "Kylmäketju", targetLimit: "max -18 °C", type: 'temperature' },
      { name: "Lounas Buffet Lämmin", category: "Buffet", targetLimit: "min +60 °C", type: 'buffet' },
      { name: "Salaattipöytä", category: "Buffet", targetLimit: "max +12 °C", type: 'buffet' },
      { name: "Broileri", category: "Kuumennus", targetLimit: "min +78 °C", type: 'temperature' },
      { name: "Uudelleenkuumennus", category: "Kuumennus", targetLimit: "min +70 °C", type: 'temperature' },
      { name: "Pesuvesi", category: "Astianpesu", targetLimit: "60-65 °C", type: 'temperature' },
      { name: "Huuhteluvesi", category: "Astianpesu", targetLimit: "> 80 °C", type: 'temperature' },
      { name: "Työtasot", category: "Puhdistus", type: 'checklist' },
      { name: "Lattiakaivot", category: "Puhdistus", type: 'checklist' },
    ];
    
    const batch = writeBatch(db);
    defaults.forEach(d => {
      const newRef = doc(collection(db, 'monitoringTemplates'));
      batch.set(newRef, { ...d, id: newRef.id });
    });
    await batch.commit();
    const freshSnap = await getDocs(collection(db, 'monitoringTemplates'));
    return freshSnap.docs.map(d => d.data() as MonitoringTemplate);
  }
  return snap.docs.map(d => d.data() as MonitoringTemplate);
};

export const addTemplate = async (db: Firestore, template: Omit<MonitoringTemplate, 'id'>) => {
  const newRef = doc(collection(db, 'monitoringTemplates'));
  await setDoc(newRef, { ...template, id: newRef.id });
};

export const deleteTemplate = async (db: Firestore, id: string) => {
  await deleteDoc(doc(db, 'monitoringTemplates', id));
};
