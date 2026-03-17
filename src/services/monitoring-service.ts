import { Firestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';

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
  // Kylmälaitteet
  { name: 'Kylmiö 1', category: 'Kylmäketju', targetLimit: 'max +6 °C', type: 'temperature' },
  { name: 'Pakastin 1', category: 'Kylmäketju', targetLimit: 'max -18 °C', type: 'temperature' },
  
  // Valmistus
  { name: 'Kuumennus (liha/kala)', category: 'Valmistus & Jäähdytys', targetLimit: 'min +70 °C', type: 'temperature' },
  { name: 'Jäähdytys (alku)', category: 'Valmistus & Jäähdytys', targetLimit: 'Kirjaa alkulämpö', type: 'temperature' },
  { name: 'Uudelleenlämmitys', category: 'Valmistus & Jäähdytys', targetLimit: 'min +70 °C', type: 'temperature' },

  // Buffet
  { name: 'Buffet Lämmin täyttö', category: 'Tarjoilu & Buffet', targetLimit: 'min +60 °C', type: 'temperature' },
  { name: 'Buffet Kylmä täyttö', category: 'Tarjoilu & Buffet', targetLimit: 'max +6 °C', type: 'temperature' },

  // Astianpesu
  { name: 'Pesuvesi (tunneli/kupu)', category: 'Hygienia & Astianpesu', targetLimit: 'min +60 °C', type: 'temperature' },
  { name: 'Huuhteluvesi', category: 'Hygienia & Astianpesu', targetLimit: 'min +80 °C', type: 'temperature' },

  // Siivous
  { name: 'Keittiön yleispuhtaus', category: 'Siivous & Arviointi', targetLimit: 'Sanallinen arvio', type: 'text' },
  { name: 'Siivousliikkeen laatu', category: 'Siivous & Arviointi', targetLimit: 'Sopimuksen mukainen', type: 'text' },

  // Laitteet
  { name: 'Rasvakeittimen öljynvaihto', category: 'Laitteet & Huolto', targetLimit: 'Kirjaa pvm', type: 'date' },

  // Vastaanotto
  { name: 'Saapuva kuorma', category: 'Vastaanotto', targetLimit: 'Ohjeen mukaan', type: 'temperature' },
];

/**
 * Hakee valvontakohteet. Jos tyhjä, alustaa oletukset.
 */
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

/**
 * Tallentaa uuden valvontakohteen (Admin).
 */
export const addMonitoringTemplate = async (db: Firestore, template: Omit<MonitoringTemplate, 'id'>) => {
  const colRef = collection(db, 'monitoringTemplates');
  await addDoc(colRef, { ...template });
};

/**
 * Poistaa valvontakohteen (Admin).
 */
export const deleteMonitoringTemplate = async (db: Firestore, id: string) => {
  await deleteDoc(doc(db, 'monitoringTemplates', id));
};

/**
 * Tallentaa uuden mittauksen.
 */
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

/**
 * Keittiömestarin auditointi.
 */
export const acknowledgeMonitoring = async (db: Firestore, userId: string, userName: string) => {
  try {
    await addDoc(collection(db, 'monitoringAudits'), {
      type: 'chef_audit',
      userId,
      userName,
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Monitoring Service: Error acknowledging monitoring", error);
    throw error;
  }
};

/**
 * Bluetooth-mittauksen simulointi.
 */
export const handleBluetoothMeasurement = async () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve("4.5"), 1500);
  });
};
