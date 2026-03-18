import { Firestore, doc, setDoc, serverTimestamp, increment, writeBatch, getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fetchWholesalePrices } from '@/ai/flows/fetch-wholesale-prices-flow';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
      totalPrepCost: increment(entry.type === 'prep' ? entry.cost : 0),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Waste Service: logWasteEntry error", error);
    throw error;
  }
};

/**
 * Generoi PDF-raportin kuukauden hävikistä ja tallentaa sen arkistoon.
 */
export const generateAndArchiveMonthlyReport = async (db: Firestore, userId: string, monthId: string, monthName: string) => {
  try {
    // 1. Hae kaikki kuukauden kirjaukset
    const entriesRef = collection(db, 'wasteEntries');
    const q = query(entriesRef, where('monthId', '==', monthId), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(d => d.data());

    if (entries.length === 0) throw new Error("Ei kirjauksia tälle kuukaudelle.");

    // 2. Luo PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Otsikko
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(184, 115, 51); // Copper color
    doc.text(`HAVIKKIRAPORTTI: ${monthName.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Luotu: ${new Date().toLocaleDateString('fi-FI')}`, pageWidth / 2, 28, { align: 'center' });

    // Yhteenveto
    const totalWaste = entries.filter(e => e.type === 'waste').reduce((sum, e) => sum + e.cost, 0);
    const totalPrep = entries.filter(e => e.type === 'prep').reduce((sum, e) => sum + e.cost, 0);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Yhteenveto:`, 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`- Varsinainen havikki: ${totalWaste.toFixed(2)} EUR`, 14, 52);
    doc.text(`- Esivalmistelu (Prep-hukka): ${totalPrep.toFixed(2)} EUR`, 14, 58);
    doc.setFont("helvetica", "bold");
    doc.text(`YHTEENSA: ${(totalWaste + totalPrep).toFixed(2)} EUR`, 14, 66);

    // Taulukko
    const tableBody = entries.map(e => [
      new Date(e.date?.toDate()).toLocaleDateString('fi-FI'),
      e.productName,
      e.type === 'waste' ? 'HAVIKKI' : 'PREP',
      `${e.weight} kg`,
      `${e.cost.toFixed(2)} EUR`
    ]);

    (doc as any).autoTable({
      startY: 75,
      head: [['Pvm', 'Tuote', 'Tyyppi', 'Maara', 'Kustannus']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [184, 115, 51] },
      styles: { fontSize: 9 }
    });

    // 3. Muunna Blobiksi ja lataa Storageen
    const pdfBlob = doc.output('blob');
    const storage = getStorage();
    const fileName = `havikki-raportti-${monthId}.pdf`;
    const filePath = `reports/${userId}/waste/${fileName}`;
    const storageRef = ref(storage, filePath);

    const uploadResult = await uploadBytes(storageRef, pdfBlob);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // 4. Tallenna viite cloudFiles-kokoelmaan
    const fileId = `waste_report_${monthId}`;
    await setDoc(doc(db, 'cloudFiles', fileId), {
      id: fileId,
      name: `Hävikkiraportti ${monthName}`,
      url: downloadURL,
      type: 'application/pdf',
      category: 'waste_report',
      monthId: monthId,
      userId: userId,
      createdAt: serverTimestamp(),
      size: `${(pdfBlob.size / 1024).toFixed(1)} KB`
    });

    // 5. Merkitse kuukausi arkistoiduksi
    await setDoc(doc(db, 'monthlyWaste', monthId), {
      isArchived: true,
      reportUrl: downloadURL,
      archivedAt: serverTimestamp()
    }, { merge: true });

    return { url: downloadURL };
  } catch (error) {
    console.error("Waste Service: archive error", error);
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

    const currentProducts = await getDocs(collection(db, 'wasteProducts'));
    currentProducts.forEach(p => batch.delete(p.ref));

    groups.forEach(g => {
      batch.set(doc(db, 'wasteGroups', g.id), g);
    });

    aiData.products.forEach((p, idx) => {
      const pid = `ai_prod_${idx}_${Date.now()}`;
      const groupMatch = groups.find(g => g.name === p.category);
      const groupId = groupMatch ? groupMatch.id : 'dry';

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
