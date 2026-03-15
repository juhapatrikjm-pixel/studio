
import { z } from "zod";

/**
 * @fileOverview Keskitetyt Zod-skeemat datan validointiin.
 * Auttaa estämään syöttövirheet ja varmistaa Firestore-datan laadun.
 */

// Apuohjelma, joka hyväksyy numeron tai merkkijonon ja muuntaa sen validiksi numeroksi
const numericValue = z.union([
  z.number(),
  z.string().transform((val) => {
    const processed = val.replace(',', '.').trim();
    return processed === '' ? 0 : Number(processed);
  })
]);

export const financialSchema = z.object({
  date: z.string().min(1, "Päivämäärä vaaditaan"),
  revenue: numericValue.pipe(z.number().nonnegative("Myynti ei voi olla negatiivinen")),
  foodCost: numericValue.pipe(z.number().nonnegative()).optional().default(0),
  workHours: numericValue.pipe(z.number().nonnegative()).optional().default(0),
  laborCost: numericValue.pipe(z.number().nonnegative()).optional().default(0),
  otherExpenses: numericValue.pipe(z.number().nonnegative()).optional().default(0),
  comment: z.string().optional(),
  entryType: z.enum(['daily', 'monthly'])
});

export const wasteEntrySchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  weight: numericValue.pipe(z.number().gt(0, "Painon on oltava suurempi kuin 0")),
  cost: numericValue.pipe(z.number().nonnegative()),
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
