import { Firestore, doc, addDoc, collection, serverTimestamp, setDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * @fileOverview Ohjauspaneelin ja yhteisten toimintojen palvelukerros.
 */

export const addMaintenanceNote = (db: Firestore, text: string, user: string) => {
  const maintenanceRef = collection(db, 'maintenanceNotes');
  const noteData = {
    text,
    createdAt: serverTimestamp(),
    createdBy: user,
    status: 'active'
  };

  addDoc(maintenanceRef, noteData).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: maintenanceRef.path,
      operation: 'create',
      requestResourceData: noteData
    }));
  });
};

export const deleteMaintenanceNote = (db: Firestore, id: string) => {
  if (!db || !id) return;
  const docRef = doc(db, 'maintenanceNotes', id);
  deleteDoc(docRef).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete'
    }));
  });
};

export const acknowledgeShiftInfo = (db: Firestore, infoId: string, user: string) => {
  const docRef = doc(db, 'shiftInfos', infoId);
  setDoc(docRef, {
    acknowledgedBy: arrayUnion(user)
  }, { merge: true }).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: { acknowledgedBy: 'arrayUnion' }
    }));
  });
};

export const saveShiftInfo = (db: Firestore, data: any) => {
  const shiftInfosRef = collection(db, 'shiftInfos');
  const infoData = {
    ...data,
    createdAt: serverTimestamp(),
    acknowledgedBy: []
  };

  addDoc(shiftInfosRef, infoData).catch(async (error) => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: shiftInfosRef.path,
      operation: 'create',
      requestResourceData: infoData
    }));
  });
};
