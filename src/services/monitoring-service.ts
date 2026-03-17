import { Firestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';

/**
 * @fileOverview Omavalvonnan liiketoimintalogiikka ja tietokantaoperaatiot.
 * Keskittyy "wisemisa"-tietokantaan.
 */

export interface MonitoringRecord {
  id?: string;
  date: any;
  recordedBy: string;
  value?: string;
  status: boolean;
  method: 'manual' | 'bluetooth';
  values?: Record<string, string>;
}

/**
 * Hakee viimeisimmän omavalvontakirjauksen.
 */
export const getLatestMonitoringRecord = async (db: Firestore): Promise<MonitoringRecord | null> => {
  try {
    const q = query(collection(db, 'selfMonitoringRecords'), orderBy('date', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return { ...data, id: snap.docs[0].id } as MonitoringRecord;
  } catch (error) {
    console.error("Monitoring Service: Error fetching latest record", error);
    throw error;
  }
};

/**
 * Tallentaa uuden omavalvontakirjauksen.
 */
export const saveMonitoringRecord = async (db: Firestore, record: Partial<MonitoringRecord>) => {
  try {
    const recordData = {
      ...record,
      date: serverTimestamp(),
      method: record.method || 'manual',
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
 * Keittiömestarin manuaalinen hälytyksen kuittaus tai tarkistus.
 */
export const acknowledgeMonitoring = async (db: Firestore, userId: string, userName: string, type: 'manual_ack' | 'chef_audit' = 'manual_ack') => {
  try {
    const auditData = {
      type,
      userId,
      userName,
      timestamp: serverTimestamp(),
    };
    
    if (type === 'chef_audit') {
      await addDoc(collection(db, 'monitoringAudits'), auditData);
    } else {
      // Manuaalinen hälytyksen nollaus tallennetaan omana tietueenaan
      await addDoc(collection(db, 'selfMonitoringRecords'), {
        ...auditData,
        date: serverTimestamp(),
        recordedBy: userName,
        status: true,
        method: 'manual'
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Monitoring Service: Error acknowledging monitoring", error);
    throw error;
  }
};

/**
 * Simuloi Bluetooth-mittausta.
 */
export const handleBluetoothMeasurement = async () => {
  console.log("Bluetooth: Etsitään laitteita...");
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Bluetooth: Mittaus saatu: 4.2°C");
      resolve("4.2");
    }, 2000);
  });
};