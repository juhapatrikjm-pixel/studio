
import { z } from "zod";

/**
 * @fileOverview Keskitetyt Zod-skeemat datan validointiin.
 * Auttaa estämään syöttövirheet ja varmistaa Firestore-datan laadun.
 */

// Apuohjelma pilkkujen muuttamiseksi pisteiksi numeroarvoissa
const coerceNumber = z.preprocess((val) => {
  if (typeof val === 'string') {
    const processed = val.replace(',', '.').trim();
    return processed === '' ? undefined : Number(processed);
  }
  return val;
}, z.number().nonnegative());

export const financialSchema = z.object({
  date: z.string().min(1, "Päivämäärä vaaditaan"),
  revenue: coerceNumber.min(0, "Myynti ei voi olla negatiivinen"),
  foodCost: coerceNumber.optional().default(0),
  workHours: coerceNumber.optional().default(0),
  laborCost: coerceNumber.optional().default(0),
  otherExpenses: coerceNumber.optional().default(0),
  comment: z.string().optional(),
  entryType: z.enum(['daily', 'monthly'])
});

export const wasteEntrySchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  weight: coerceNumber.gt(0, "Painon on oltava suurempi kuin 0"),
  cost: coerceNumber.nonnegative(),
  type: z.enum(['prep', 'waste']),
  monthId: z.string().min(1),
  date: z.any() // Firestore timestamp
});

export const userProfileSchema = z.object({
  companyName: z.string().min(2, "Yrityksen nimi on liian lyhyt"),
  userName: z.string().min(2, "Nimi on liian lyhyt"),
  title: z.string().optional(),
  workPhone: z.string().optional(),
  personalPhone: z.string().optional(),
  address: z.string().optional(),
  businessId: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal(''))
});
