import { Firestore, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Reseptiikan liiketoimintalogiikka ja tietokantaoperaatiot.
 */

export const calculatePortionMargin = (cost: number, sellingPrice: number): number => {
  if (!sellingPrice || sellingPrice <= 0) return 0;
  return ((sellingPrice - cost) / sellingPrice) * 100;
};

export const calculateLaborCost = (timeInHours: number, hourlyRate: number): number => {
  return (timeInHours || 0) * (hourlyRate || 0);
};

export const performMakeVsBuyAnalysis = (inHouseCost: number, externalPrice: number) => {
  const diff = externalPrice - inHouseCost;
  return {
    isCheaperToMake: diff > 0,
    savings: Math.abs(diff),
    recommendation: diff > 0 ? "VALMISTA ITSE" : "OSTA VALMIINA"
  };
};

export const saveRecipe = async (db: Firestore, data: any) => {
  try {
    const docRef = doc(db, 'recipes', data.id);
    await setDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Recipe Service: saveRecipe error", error);
    throw error;
  }
};

export const deleteRecipe = async (db: Firestore, id: string) => {
  try {
    await deleteDoc(doc(db, 'recipes', id));
    return { success: true };
  } catch (error) {
    console.error("Recipe Service: deleteRecipe error", error);
    throw error;
  }
};

export const saveDish = async (db: Firestore, data: any) => {
  try {
    const docRef = doc(db, 'dishes', data.id);
    await setDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Recipe Service: saveDish error", error);
    throw error;
  }
};

export const deleteDish = async (db: Firestore, id: string) => {
  try {
    await deleteDoc(doc(db, 'dishes', id));
    return { success: true };
  } catch (error) {
    console.error("Recipe Service: deleteDish error", error);
    throw error;
  }
};
