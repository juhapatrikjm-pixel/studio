import { Firestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Talousseurannan palvelukerros.
 */

export const saveFinancialRecord = async (db: Firestore, data: any) => {
  try {
    const id = data.id || data.date;
    const docRef = doc(db, 'financialRecords', id);
    
    await setDoc(docRef, {
      ...data,
      id,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error("Finance Service: saveFinancialRecord error", error);
    throw error;
  }
};
