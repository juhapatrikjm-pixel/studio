import { Firestore, collection, query, getDocs, addDoc, serverTimestamp, doc, setDoc, deleteDoc, where, writeBatch, Timestamp } from 'firebase/firestore';

/**
 * @fileOverview Omavalvonnan liiketoimintalogiikka ja tietokantaoperaatiot.
 * Toteuttaa "State-First" -arkkitehtuurin (Active -> Archive).
 */

export interface MonitoringRecord {
  id?: string;
  date: any;
  recordedBy: string;
  targetName: string;
  value: string;
  comment?: string;
  status: boolean;
  category: string;
  type?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  startTemp?: string;
  endTemp?: string;
  dishName?: string;
  displayTime?: string;
  temp1?: string;
  temp2?: string;
  chemicalsOk?: boolean;
}

export const saveActiveRecord = async (db: Firestore, userId: string, record: Partial<MonitoringRecord>) => {
  if (!record.targetName) return;
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

  // 1. Siirretään arkistoon
  const archiveRef = doc(db, 'omavalvonta_archive', archiveId);
  batch.set(archiveRef, {
    userId,
    userName,
    date: archiveDate,
    dateStr,
    records: activeRecords,
    createdAt: serverTimestamp()
  });

  // 2. Tyhjennetään aktiiviset
  activeRecords.forEach(r => {
    if (r.id) {
      batch.delete(doc(db, 'omavalvonta_active', r.id));
    }
  });

  // 3. Luodaan näkyvä merkintä tiedostoarkistoon
  const fileRef = doc(db, 'uploadedRecipes', `file_${archiveId}`);
  batch.set(fileRef, {
    id: `file_${archiveId}`,
    name: `Tehty ${dateStr}`,
    type: 'application/omavalvonta-report',
    size: '---',
    folderId: 'omavalvonta_arkisto',
    createdAt: serverTimestamp(),
    recordedBy: userName
  });

  await batch.commit();
};

export const getMonitoringTemplates = async (db: Firestore) => {
  const defaults = [
    { name: "Kylmiö 1", category: "Kylmälaitteet", targetLimit: "max +6 °C" },
    { name: "Pakastin 1", category: "Kylmälaitteet", targetLimit: "max -18 °C" },
    { name: "Lounas Buffet Lämmin", category: "Kuumennus", targetLimit: "min +70 °C" },
    { name: "Työtasot", category: "Puhdistus", targetLimit: "Puhdas" },
    { name: "Lattiakaivot", category: "Puhdistus", targetLimit: "Puhdas" },
  ];
  return defaults;
};
