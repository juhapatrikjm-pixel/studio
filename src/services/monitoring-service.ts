import { Firestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, deleteDoc, writeBatch, Timestamp, onSnapshot } from 'firebase/firestore';

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
}

export interface MonitoringTemplate {
  id: string;
  name: string;
  category: string;
  targetLimit: string;
  type: 'temperature' | 'sensory' | 'boolean' | 'date' | 'text';
}

const DEFAULT_TEMPLATES: Omit<MonitoringTemplate, 'id'>[] = [
  { name: 'Kylmiö 1', category: 'Kylmäketju', targetLimit: 'max +6 °C', type: 'temperature' },
  { name: 'Pakastin 1', category: 'Kylmäketju', targetLimit: 'max -18 °C', type: 'temperature' },
  { name: 'Kylmät tuotteet', category: 'Kylmäketju', targetLimit: 'Säilytysohjeen mukaan', type: 'temperature' },
  
  { name: 'Kuumennus (liha/kala)', category: 'Valmistus & Jäähdytys', targetLimit: 'min +70 °C', type: 'temperature' },
  { name: 'Jäähdytys (alku)', category: 'Valmistus & Jäähdytys', targetLimit: 'Kirjaa alkulämpö', type: 'temperature' },
  { name: 'Uudelleenlämmitys', category: 'Valmistus & Jäähdytys', targetLimit: 'min +70 °C', type: 'temperature' },

  { name: 'Buffet Lämmin täyttö', category: 'Tarjoilu & Buffet', targetLimit: 'min +60 °C', type: 'temperature' },
  { name: 'Buffet Kylmä täyttö', category: 'Tarjoilu & Buffet', targetLimit: 'max +6 °C', type: 'temperature' },

  { name: 'Pesuvesi (tunneli/kupu)', category: 'Hygienia & Astianpesu', targetLimit: 'min +60 °C', type: 'temperature' },
  { name: 'Huuhteluvesi', category: 'Hygienia & Astianpesu', targetLimit: 'min +80 °C', type: 'temperature' },

  { name: 'Keittiön yleispuhtaus', category: 'Siivous & Arviointi', targetLimit: 'Sanallinen arvio', type: 'text' },
  { name: 'Siivousliikkeen laatu', category: 'Siivous & Arviointi', targetLimit: 'Sopimuksen mukainen', type: 'text' },

  { name: 'Rasvakeittimen öljynvaihto', category: 'Laitteet & Huolto', targetLimit: 'Kirjaa pvm', type: 'date' },

  { name: 'Saapuva kuorma', category: 'Vastaanotto', targetLimit: 'Ohjeen mukaan', type: 'temperature' },
];

export const getMonitoringTemplates = async (db: Firestore): Promise<MonitoringTemplate[]> => {
  try {
    const colRef = collection(db, 'monitoringTemplates');
    const snap = await getDocs(colRef);
    
    if (snap.empty) {
      const batch = writeBatch(db);
      DEFAULT_TEMPLATES.forEach((t) => {
        const newDoc = doc(colRef);
        batch.set(newDoc, { ...t, id: newDoc.id });
      });
      await batch.commit();
      const newSnap = await getDocs(colRef);
      return newSnap.docs.map(d => d.data() as MonitoringTemplate);
    }
    
    return snap.docs.map(d => d.data() as MonitoringTemplate);
  } catch (error) {
    console.error("Error fetching templates", error);
    return [];
  }
};

export const addMonitoringTemplate = async (db: Firestore, template: Omit<MonitoringTemplate, 'id'>) => {
  const colRef = collection(db, 'monitoringTemplates');
  await addDoc(colRef, { ...template });
};

export const deleteMonitoringTemplate = async (db: Firestore, id: string) => {
  await deleteDoc(doc(db, 'monitoringTemplates', id));
};

export const saveMonitoringRecord = async (db: Firestore, record: { targetName: string, value: string, comment?: string, recordedBy: string, method: 'manual' | 'bluetooth' | 'paper_sync' }) => {
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
