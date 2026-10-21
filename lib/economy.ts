export type EssencePack = {
  id: "small" | "medium" | "large";
  name: string;
  essence: number;
  displayPrice: string;
  stripePriceId?: string;
  description: string;
};

export const ESSENCE_PACKS: EssencePack[] = [
  { id: "small", name: "Starter", essence: 100, displayPrice: "$0.99", stripePriceId: process.env.STRIPE_PRICE_ESSENCE_SMALL, description: "A little support for the stories you love." },
  { id: "medium", name: "Reader", essence: 550, displayPrice: "$4.99", stripePriceId: process.env.STRIPE_PRICE_ESSENCE_MEDIUM, description: "More chapters, more creators supported.", },
  { id: "large", name: "Collector", essence: 1_200, displayPrice: "$9.99", stripePriceId: process.env.STRIPE_PRICE_ESSENCE_LARGE, description: "Best value for frequent readers." }
];

export const AD_REWARD_ESSENCE = Math.max(1, Number(process.env.AD_REWARD_ESSENCE || 5));
export const AD_DAILY_LIMIT = Math.max(1, Number(process.env.AD_DAILY_LIMIT || 5));
export const ESSENCE_PER_UNLOCK_DEFAULT = 10;
export const DAILY_RESONANCE = 3;

export function packById(id: string) {
  return ESSENCE_PACKS.find((pack) => pack.id === id);
}
