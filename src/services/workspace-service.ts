import { Firestore, doc, addDoc, collection, serverTimestamp, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';

/**
 * @fileOverview Ohjauspaneelin ja yhteisten toimintojen palvelukerros.
 */

export const addMaintenanceNote = async (db: Firestore, text: string, user: string) => {
  try {
    await addDoc(collection(db, 'maintenanceNotes'), {
      text,
      createdAt: serverTimestamp(),
      createdBy: user,
      status: 'active'
    });
    return { success: true };
  } catch (error) {
    console.error("Workspace Service: addMaintenanceNote error", error);
    throw error;
  }
};

export const deleteMaintenanceNote = async (db: Firestore, id: string) => {
  try {
    await deleteDoc(doc(db, 'maintenanceNotes', id));
    return { success: true };
  } catch (error) {
    console.error("Workspace Service: deleteMaintenanceNote error", error);
    throw error;
  }
};

export const acknowledgeShiftInfo = async (db: Firestore, infoId: string, user: string) => {
  try {
    const docRef = doc(db, 'shiftInfos', infoId);
    await updateDoc(docRef, {
      acknowledgedBy: arrayUnion(user)
    });
    return { success: true };
  } catch (error) {
    console.error("Workspace Service: acknowledgeShiftInfo error", error);
    throw error;
  }
};

export const saveShiftInfo = async (db: Firestore, data: any) => {
  try {
    await addDoc(collection(db, 'shiftInfos'), {
      ...data,
      createdAt: serverTimestamp(),
      acknowledgedBy: []
    });
    return { success: true };
  } catch (error) {
    console.error("Workspace Service: saveShiftInfo error", error);
    throw error;
  }
};
