
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
  value2?: string; 
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
  type: 'temperature' | 'checklist' | 'cooling' | 'buffet' | 'cleaning' | 'oil_change';
}

/**
 * Tallentaa aktiivisen merkinnän Firestoreen (omavalvonta_active).
 */
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

/**
 * Hakee kaikki aktiiviset merkinnät tietokannasta.
 */
export const getActiveRecords = async (db: Firestore, userId: string) => {
  const colRef = collection(db, 'omavalvonta_active');
  const q = query(colRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
};

/**
 * Siirtää aktiiviset tiedot arkistoon ja tyhjentää aktiivisen työtilan.
 */
export const archiveMonitoringDay = async (db: Firestore, userId: string, userName: string, isManual = false) => {
  const activeRecords = await getActiveRecords(db, userId);
  
  const batch = writeBatch(db);
  const archiveDate = new Date();
  const dateStr = `${archiveDate.getDate()}.${archiveDate.getMonth() + 1}.`;
  const archiveId = `archive_${userId}_${archiveDate.getTime()}`;

  // 1. Luodaan arkistomerkintä raportteihin
  const archiveRef = doc(db, 'omavalvonta_archive', archiveId);
  batch.set(archiveRef, {
    userId,
    userName,
    date: archiveDate,
    dateStr,
    isManual,
    records: isManual ? [] : activeRecords,
    createdAt: serverTimestamp()
  });

  // 2. Tyhjennetään aktiiviset (jos ei manuaalinen kuittaus tyhjältä pohjalta)
  activeRecords.forEach(r => {
    if (r.id) {
      batch.delete(doc(db, 'omavalvonta_active', r.id));
    }
  });

  // 3. Tallennetaan arkistomerkintä Dokumenttiarkistoon näkyviin
  const fileRef = doc(db, 'cloudFiles', `archive_${archiveId}`);
  batch.set(fileRef, {
    id: `archive_${archiveId}`,
    name: `Tehty ${dateStr}${isManual ? ' (Manuaalinen)' : ''}`,
    type: 'application/pdf',
    size: 'Raportti',
    folderId: 'omavalvonta_arkisto',
    createdAt: serverTimestamp()
  });

  // 4. Päivitetään globaali hälytyssyöte Ohjauspaneelin Pulse-moduulia varten
  const pulseRef = doc(db, 'selfMonitoringRecords', archiveId);
  batch.set(pulseRef, {
    date: archiveDate,
    recordedBy: userName,
    type: isManual ? 'manual_archive' : 'daily_archive'
  });

  await batch.commit();
};

/**
 * Hakee ja alustaa valvontakohteet.
 */
export const getTemplates = async (db: Firestore) => {
  const snap = await getDocs(collection(db, 'monitoringTemplates'));
  if (snap.empty) {
    const defaults: Omit<MonitoringTemplate, 'id'>[] = [
      { name: "Kylmiö 1", category: "Kylmälaitteet", targetLimit: "max +6 °C", type: 'temperature' },
      { name: "Pakastin 1", category: "Kylmälaitteet", targetLimit: "max -18 °C", type: 'temperature' },
      { name: "Raaka-aineet", category: "Kuumennus", targetLimit: "min +70 °C", type: 'temperature' },
      { name: "Broileri", category: "Kuumennus", targetLimit: "min +78 °C", type: 'temperature' },
      { name: "Uudelleenkuumennus", category: "Kuumennus", targetLimit: "min +70 °C", type: 'temperature' },
      { name: "Jäähdytys (Pääruoka)", category: "Jäähdytys", targetLimit: "< 6 °C / 4h", type: 'cooling' },
      { name: "Lämmin Buffet", category: "Buffet", targetLimit: "min +60 °C", type: 'buffet' },
      { name: "Kylmä Buffet", category: "Buffet", targetLimit: "max +12 °C", type: 'buffet' },
      { name: "Pesuvesi", category: "Astianpesu", targetLimit: "60-65 °C", type: 'temperature' },
      { name: "Huuhteluvesi", category: "Astianpesu", targetLimit: "> 80 °C", type: 'temperature' },
      { name: "Pesuainetaso", category: "Astianpesu", targetLimit: "OK", type: 'checklist' },
      { name: "Kuorman lämpötila", category: "Vastaanotto", targetLimit: "max +6 °C", type: 'temperature' },
      { name: "Työtasot", category: "Puhdistus", type: 'cleaning' },
      { name: "Rasvakeitin 1", category: "Laitteet", targetLimit: "Öljynvaihto", type: 'oil_change' },
    ];
    
    const batch = writeBatch(db);
    defaults.forEach(d => {
      const newRef = doc(collection(db, 'monitoringTemplates'));
      batch.set(newRef, { ...d, id: newRef.id });
    });
    await batch.commit();
    return getTemplates(db);
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
