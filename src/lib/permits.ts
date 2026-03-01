export interface Permit {
  name: string;
  agency: string;
  cost: number;
  timeline: string;
  url: string;
}

const basePermits: Record<string, Permit[]> = {
  Restaurant: [
    { name: "Business License", agency: "BACP", cost: 250, timeline: "4-6 weeks", url: "https://chicago.gov/bacp" },
    { name: "Retail Food License", agency: "CDPH", cost: 330, timeline: "6-8 weeks", url: "https://chicago.gov/health" },
    { name: "Food Sanitation Certificate", agency: "CDPH", cost: 100, timeline: "2 weeks", url: "https://chicago.gov/health" },
    { name: "Fire Inspection", agency: "CFD", cost: 150, timeline: "3-4 weeks", url: "https://chicago.gov/fire" },
    { name: "Sales Tax Registration", agency: "IL Dept of Revenue", cost: 0, timeline: "1 week", url: "https://mytax.illinois.gov" },
  ],
  Retail: [
    { name: "Business License", agency: "BACP", cost: 250, timeline: "4-6 weeks", url: "https://chicago.gov/bacp" },
    { name: "Sales Tax Registration", agency: "IL Dept of Revenue", cost: 0, timeline: "1 week", url: "https://mytax.illinois.gov" },
  ],
  Salon: [
    { name: "Business License", agency: "BACP", cost: 250, timeline: "4-6 weeks", url: "https://chicago.gov/bacp" },
    { name: "Cosmetology License", agency: "IDFPR", cost: 50, timeline: "2-3 weeks", url: "https://idfpr.illinois.gov" },
  ],
  Office: [
    { name: "Business License", agency: "BACP", cost: 250, timeline: "4-6 weeks", url: "https://chicago.gov/bacp" },
  ],
};

const liquorPermit: Permit = {
  name: "Liquor License", agency: "City of Chicago", cost: 4400, timeline: "8-12 weeks", url: "https://chicago.gov/liquor",
};

export function getPermits(businessType: string, sellsAlcohol: boolean): Permit[] {
  const type = Object.keys(basePermits).includes(businessType) ? businessType : "Office";
  const permits = [...(basePermits[type] || basePermits.Office)];
  if (sellsAlcohol) permits.push(liquorPermit);
  return permits;
}

export function getTotalCost(permits: Permit[]): number {
  return permits.reduce((sum, p) => sum + p.cost, 0);
}

export function getMaxTimeline(permits: Permit[]): string {
  const weeks = permits.map(p => {
    const match = p.timeline.match(/(\d+)/g);
    return match ? Math.max(...match.map(Number)) : 0;
  });
  return `${Math.max(...weeks)} weeks`;
}
