'use server';
/**
 * @fileOverview Genkit flow for fetching and simulating Finnish wholesale prices (Metro, Meiranova, Aimo).
 * 
 * - fetchWholesalePrices - Generates a list of common restaurant ingredients with up-to-date Finnish prices.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WholesaleProductSchema = z.object({
  name: z.string(),
  category: z.string(),
  pricePerKg: z.number(),
  source: z.string(),
});

const FetchWholesalePricesOutputSchema = z.object({
  products: z.array(WholesaleProductSchema),
  timestamp: z.string(),
});

export type FetchWholesalePricesOutput = z.infer<typeof FetchWholesalePricesOutputSchema>;

export async function fetchWholesalePrices(): Promise<FetchWholesalePricesOutput> {
  return fetchWholesalePricesFlow();
}

const fetchWholesalePricesPrompt = ai.definePrompt({
  name: 'fetchWholesalePricesPrompt',
  input: { schema: z.object({ date: z.string() }) },
  output: { schema: FetchWholesalePricesOutputSchema },
  prompt: `You are a professional purchasing agent for a Finnish restaurant. 
Today's date is {{{date}}}.

Your task is to generate a comprehensive list of 160 common restaurant ingredients used in Finland. 
Your list must contain exactly 20 ingredients for each of the following 8 categories: LIHA, KALA, MAITOTUOTTEET, HEVI, JUUREKSET, LEIPOMO, PAKASTEET, KUIVATUOTTEET.

For each item, provide a realistic wholesale price per kilogram (EUR/kg) based on current market trends in Finnish wholesalers like Metro, Meiranova, and Aimo.

Ensure prices are realistic for the Finnish market (e.g., Filet of Salmon might be 22-28 €/kg, Minced Beef 10-12 €/kg, Potatoes 1-1.5 €/kg).

Include the source (Metro, Meiranova, or Aimo) where the price was "fetched" from.`,
});

const fetchWholesalePricesFlow = ai.defineFlow(
  {
    name: 'fetchWholesalePricesFlow',
    inputSchema: z.void(),
    outputSchema: FetchWholesalePricesOutputSchema,
  },
  async () => {
    const { output } = await fetchWholesalePricesPrompt({ 
      date: new Date().toLocaleDateString('fi-FI') 
    });
    return output!;
  }
);
