import { Firestore, doc, setDoc, serverTimestamp, increment, writeBatch, getDocs, collection } from 'firebase/firestore';

/**
 * @fileOverview Hävikinhallinnan liiketoimintalogiikka ja tietokantaoperaatiot.
 */

export const logWasteEntry = async (db: Firestore, entry: any, monthId: string) => {
  try {
    const entryId = entry.id || Math.random().toString(36).substr(2, 9);
    const batch = writeBatch(db);

    // 1. Tallenna yksittäinen kirjaus
    const entryRef = doc(db, 'wasteEntries', entryId);
    batch.set(entryRef, {
      ...entry,
      id: entryId,
      date: serverTimestamp()
    });

    // 2. Päivitä kuukauden kooste
    const monthlyRef = doc(db, 'monthlyWaste', monthId);
    batch.set(monthlyRef, {
      id: monthId,
      totalWasteCost: increment(entry.type === 'waste' ? entry.cost : 0),
      totalPrepCost: increment(entry.type === 'prep' ? entry.cost : 0)
    }, { merge: true });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Waste Service: logWasteEntry error", error);
    throw error;
  }
};

export const initializeProductDatabase = async (db: Firestore, groups: any[], productsData: Record<string, any[]>) => {
  try {
    const batch = writeBatch(db);

    // Poistetaan vanhat ensin (huom: rajoitettu määrä kerrallaan batchissä)
    const currentGroups = await getDocs(collection(db, 'wasteGroups'));
    currentGroups.forEach(g => batch.delete(doc(db, 'wasteGroups', g.id)));

    groups.forEach(g => {
      batch.set(doc(db, 'wasteGroups', g.id), g);
      const groupProducts = productsData[g.id] || [];
      groupProducts.forEach((p, idx) => {
        const pid = `${g.id}_${idx}`;
        batch.set(doc(db, 'wasteProducts', pid), {
          id: pid,
          groupId: g.id,
          name: p.name,
          pricePerKg: p.price
        });
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Waste Service: initializeProductDatabase error", error);
    throw error;
  }
};
