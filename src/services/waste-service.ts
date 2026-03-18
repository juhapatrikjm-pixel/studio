import { Firestore, doc, setDoc, serverTimestamp, increment, writeBatch, getDocs, collection } from 'firebase/firestore';
import { fetchWholesalePrices } from '@/ai/flows/fetch-wholesale-prices-flow';

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

/**
 * Alustaa tuotetietokannan AI-pohjaisilla hinnoilla suomalaisista tukuista.
 */
export const initializeWithAIPrices = async (db: Firestore, groups: any[]) => {
  try {
    const aiData = await fetchWholesalePrices();
    const batch = writeBatch(db);

    // 1. Tyhjennetään vanhat tuotteet (huom: batch-rajoitus huomioitava tuotannossa)
    const currentProducts = await getDocs(collection(db, 'wasteProducts'));
    currentProducts.forEach(p => batch.delete(p.ref));

    // 2. Varmistetaan ryhmät
    groups.forEach(g => {
      batch.set(doc(db, 'wasteGroups', g.id), g);
    });

    // 3. Lisätään AI-generoidut tuotteet
    aiData.products.forEach((p, idx) => {
      const pid = `ai_prod_${idx}_${Date.now()}`;
      // Etsitään vastaava ryhmä-ID nimen perusteella
      const groupMatch = groups.find(g => g.name === p.category);
      const groupId = groupMatch ? groupMatch.id : 'dry'; // Default to dry if no match

      batch.set(doc(db, 'wasteProducts', pid), {
        id: pid,
        groupId: groupId,
        name: p.name,
        pricePerKg: p.pricePerKg,
        source: p.source,
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    return { count: aiData.products.length, timestamp: aiData.timestamp };
  } catch (error) {
    console.error("Waste Service: initializeWithAIPrices error", error);
    throw error;
  }
};

export const initializeProductDatabase = async (db: Firestore, groups: any[], productsData: Record<string, any[]>) => {
  try {
    const batch = writeBatch(db);
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
