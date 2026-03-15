/**
 * @fileOverview Keskitetyt laskentafunktiot Wisemisa Bisto -sovellukselle.
 * Eristää business-logiikan UI-komponentteista.
 */

export interface Ingredient {
  weight: number;
  price: number;
  waste: number;
}

export interface RecipeCalcResult {
  totalGrossWeight: number;
  totalNetWeight: number;
  totalCost: number;
  totalWasteCost: number;
  portionWeight: number;
  portionCost: number;
}

/**
 * Laskee reseptin painot ja kustannukset.
 */
export function calculateRecipe(ingredients: Ingredient[], portions: number): RecipeCalcResult {
  let totalGrossWeight = 0;
  let totalNetWeight = 0;
  let totalCost = 0;
  let totalWasteCost = 0;

  ingredients.forEach(ing => {
    const weight = Number(ing.weight) || 0;
    const price = Number(ing.price) || 0;
    const wastePercent = Number(ing.waste) || 0;

    const cost = weight * price;
    const wasteWeight = weight * (wastePercent / 100);
    const netWeight = weight - wasteWeight;
    const wasteCost = wasteWeight * price;

    totalGrossWeight += weight;
    totalNetWeight += netWeight;
    totalCost += cost;
    totalWasteCost += wasteCost;
  });

  const port = portions > 0 ? portions : 1;

  return {
    totalGrossWeight,
    totalNetWeight,
    totalCost,
    totalWasteCost,
    portionWeight: totalNetWeight / port,
    portionCost: totalCost / port
  };
}

/**
 * Laskee annoskortin katteen ja kokonaiskustannukset.
 */
export function calculateDish(
  recipeCosts: { cost: number; weight: number }[],
  manualIngredients: Ingredient[],
  sellingPrice: number
) {
  let totalCost = 0;
  let totalWeight = 0;

  recipeCosts.forEach(r => {
    totalCost += r.cost;
    totalWeight += r.weight;
  });

  manualIngredients.forEach(ing => {
    const weight = Number(ing.weight) || 0;
    const price = Number(ing.price) || 0;
    const wastePercent = Number(ing.waste) || 0;
    const netWeight = weight * (1 - (wastePercent / 100));
    
    totalCost += weight * price;
    totalWeight += netWeight;
  });

  const margin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  return {
    totalCost,
    totalWeight,
    margin
  };
}

/**
 * Laskee hävikin kustannuksen yhdelle riville.
 */
export function calculateWasteEntry(weight: string | number, pricePerKg: number): number {
  const weightNum = typeof weight === 'string' ? Number(weight.replace(',', '.')) : weight;
  return (weightNum || 0) * pricePerKg;
}
