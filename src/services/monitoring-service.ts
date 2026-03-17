import { Firestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc, where, writeBatch, Timestamp } from 'firebase/firestore';

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
  archived?: boolean;
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
      status: true,
      archived: false
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
      // KYLMÄLAITTEET
      { name: "Kylmiö 1", category: "Kylmälaitteet", targetLimit: "max +6 °C", type: "temperature" },
      { name: "Pakastin 1", category: "Kylmälaitteet", targetLimit: "max -18 °C", type: "temperature" },
      
      // KUUMENNUS
      { name: "Uudelleen kuumennettavat esivalmisteet", category: "Kuumennus", targetLimit: "min +70 °C", type: "temperature" },
      { name: "Raaka-aineiden mittaus", category: "Kuumennus", targetLimit: "min +70 °C", type: "temperature" },
      { name: "Raaka-aine (Broileri)", category: "Kuumennus", targetLimit: "min +78 °C", type: "temperature" },
      
      // JÄÄHDYTYS
      { name: "Jäähdytysseuranta", category: "Jäähdytys", targetLimit: "60 -> 6 °C / 4h", type: "text" },
      
      // VASTAANOTTO
      { name: "Kuorman lämpötila", category: "Vastaanotto", targetLimit: "pakaste -18 / tuore +6", type: "temperature" },
      { name: "Aistinvarainen arvio", category: "Vastaanotto", targetLimit: "OK", type: "boolean" },
      
      // PUHDISTUS
      { name: "Keittiön yleispuhtaus (oma arvio)", category: "Puhdistus", targetLimit: "Puhdas", type: "text" },
      { name: "Siivousliikkeen laatu", category: "Puhdistus", targetLimit: "Hyvä", type: "text" },
      { name: "Päivittäiset rutiinit", category: "Puhdistus", targetLimit: "Suoritettu", type: "boolean" },
      
      // ASTIANPESU
      { name: "Pesuvesi", category: "Astianpesu", targetLimit: "min +60 °C", type: "temperature" },
      { name: "Huuhteluvesi", category: "Astianpesu", targetLimit: "min +80 °C", type: "temperature" },
      
      // BUFFET
      { name: "Buffet Lämmin (tuote)", category: "Buffet", targetLimit: "min +60 °C", type: "temperature" },
      { name: "Buffet Kylmä (tuote)", category: "Buffet", targetLimit: "max +12 °C", type: "temperature" },
      { name: "Lämmin raaka-aine (Buffet)", category: "Buffet", targetLimit: "min +60 °C", type: "temperature" },
      { name: "Kylmä raaka-aine (Buffet)", category: "Buffet", targetLimit: "max +12 °C", type: "temperature" },
      
      // LAITTEET
      { name: "Rasvakeittimen öljynvaihto", category: "Laitteet", targetLimit: "Pvm", type: "date" },
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

export const archiveDay = async (db: Firestore, dateStr: string, user: string) => {
  // 1. Luodaan raportti arkistoon
  const id = `archive_${dateStr}_${Math.random().toString(36).substr(2, 5)}`;
  await setDoc(doc(db, 'uploadedRecipes', id), {
    id,
    name: `Tehtävä ${dateStr}`,
    type: 'application/pdf-mock',
    size: '0.1 MB',
    folderId: 'omavalvonta_arkisto',
    createdAt: serverTimestamp(),
    recordedBy: user
  });

  // 2. Merkitään päivän kirjaukset arkistoiduiksi (vain demo-tasolla tässä, oikeassa sovelluksessa tehtäisiin batch-update)
  // Tässä prototyypissä riittää että arkistoituna näkyy uusi tiedosto
};
