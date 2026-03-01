export interface Permit {
  name: string;
  agency: string;
  cost: string;
  costMin: number;
  costMax: number;
  timeline: string;
  url: string;
}

const BL = "https://www.chicago.gov/city/en/depts/bacp/sbc/business_licensing.html";
const FOOD = "https://www.chicago.gov/city/en/depts/cdph/provdrs/healthy_restaurants/svcs/retail_food_establishment_license.html";
const SANI = "https://www.chicago.gov/city/en/depts/cdph/provdrs/healthy_restaurants/svcs/food_sanitation_managercertificate.html";
const BLDG = "https://www.chicago.gov/city/en/depts/bldgs/provdrs/permit.html";
const FIRE = "https://www.chicago.gov/city/en/depts/cfd/provdrs/fire_prev_bureau.html";
const TAX = "https://mytax.illinois.gov";
const COSMO = "https://idfpr.illinois.gov/profs/cosmo.asp";
const COO = "https://www.chicago.gov/city/en/depts/bldgs/provdrs/cert_of_occupancy.html";
const LIQ = "https://www.chicago.gov/city/en/depts/bacp/supp_info/liquor_license_information.html";
const CDPH = "https://www.chicago.gov/city/en/depts/cdph.html";

const basePermits: Record<string, Permit[]> = {
  Restaurant: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Retail Food Establishment License", agency: "CDPH", cost: "$330", costMin: 330, costMax: 330, timeline: "6-8 weeks", url: FOOD },
    { name: "Food Sanitation Manager Certificate", agency: "CDPH", cost: "$100", costMin: 100, costMax: 100, timeline: "2-3 weeks", url: SANI },
    { name: "Building Permit", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Fire Inspection", agency: "CFD", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: FIRE },
    { name: "Sign Permit", agency: "DOBS", cost: "$100-$500", costMin: 100, costMax: 500, timeline: "2-4 weeks", url: BLDG },
    { name: "Sales Tax Registration", agency: "IL Dept of Revenue", cost: "Free", costMin: 0, costMax: 0, timeline: "1 week", url: TAX },
  ],
  Retail: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Sales Tax Registration", agency: "IL Dept of Revenue", cost: "Free", costMin: 0, costMax: 0, timeline: "1 week", url: TAX },
    { name: "Building Permit (if renovating)", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Sign Permit", agency: "DOBS", cost: "$100-$500", costMin: 100, costMax: 500, timeline: "2-4 weeks", url: BLDG },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
  ],
  Salon: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Cosmetology/Barber License", agency: "IDFPR", cost: "$50-$150", costMin: 50, costMax: 150, timeline: "4-6 weeks", url: COSMO },
    { name: "Sanitation Inspection", agency: "CDPH", cost: "$100", costMin: 100, costMax: 100, timeline: "2-3 weeks", url: CDPH },
    { name: "Building Permit (if renovating)", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Sign Permit", agency: "DOBS", cost: "$100-$500", costMin: 100, costMax: 500, timeline: "2-4 weeks", url: BLDG },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
  ],
  Office: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
    { name: "Building Permit (if renovating)", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Sales Tax Registration (if selling goods)", agency: "IL Dept of Revenue", cost: "Free", costMin: 0, costMax: 0, timeline: "1 week", url: TAX },
  ],
  "Coffee Shop": [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Retail Food Establishment License", agency: "CDPH", cost: "$330", costMin: 330, costMax: 330, timeline: "6-8 weeks", url: FOOD },
    { name: "Food Sanitation Manager Certificate", agency: "CDPH", cost: "$100", costMin: 100, costMax: 100, timeline: "2-3 weeks", url: SANI },
    { name: "Fire Inspection", agency: "CFD", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: FIRE },
    { name: "Sign Permit", agency: "DOBS", cost: "$100-$500", costMin: 100, costMax: 500, timeline: "2-4 weeks", url: BLDG },
    { name: "Sales Tax Registration", agency: "IL Dept of Revenue", cost: "Free", costMin: 0, costMax: 0, timeline: "1 week", url: TAX },
  ],
  Gym: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Physical Fitness Facility License", agency: "BACP", cost: "$300", costMin: 300, costMax: 300, timeline: "4-6 weeks", url: BL },
    { name: "Building Permit", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Fire Inspection", agency: "CFD", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: FIRE },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
    { name: "Sign Permit", agency: "DOBS", cost: "$100-$500", costMin: 100, costMax: 500, timeline: "2-4 weeks", url: BLDG },
  ],
  Daycare: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Childcare License", agency: "DCFS", cost: "$200", costMin: 200, costMax: 200, timeline: "8-12 weeks", url: "https://www.illinois.gov/dcfs" },
    { name: "Building Permit", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Fire Inspection", agency: "CFD", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: FIRE },
    { name: "Health Inspection", agency: "CDPH", cost: "$100", costMin: 100, costMax: 100, timeline: "2-3 weeks", url: CDPH },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
  ],
  Medical: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Professional License", agency: "IDFPR", cost: "$300-$500", costMin: 300, costMax: 500, timeline: "6-8 weeks", url: "https://idfpr.illinois.gov" },
    { name: "Building Permit", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Fire Inspection", agency: "CFD", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: FIRE },
    { name: "Health Inspection", agency: "CDPH", cost: "$100", costMin: 100, costMax: 100, timeline: "2-3 weeks", url: CDPH },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
    { name: "Medical Waste Permit", agency: "IEPA", cost: "$200", costMin: 200, costMax: 200, timeline: "4-6 weeks", url: "https://www2.illinois.gov/epa" },
  ],
  Hotel: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Hotel/Motel License", agency: "BACP", cost: "$500", costMin: 500, costMax: 500, timeline: "6-8 weeks", url: BL },
    { name: "Food Service License (if serving food)", agency: "CDPH", cost: "$330", costMin: 330, costMax: 330, timeline: "6-8 weeks", url: FOOD },
    { name: "Fire Inspection", agency: "CFD", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: FIRE },
    { name: "Building Permit", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
  ],
  Bar: [
    { name: "Business License", agency: "BACP", cost: "$250", costMin: 250, costMax: 250, timeline: "4-6 weeks", url: BL },
    { name: "Liquor License", agency: "City of Chicago", cost: "$4,400", costMin: 4400, costMax: 4400, timeline: "8-12 weeks", url: LIQ },
    { name: "Late Hour License (if open past 2am)", agency: "BACP", cost: "$1,000", costMin: 1000, costMax: 1000, timeline: "6-8 weeks", url: BL },
    { name: "Fire Inspection", agency: "CFD", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: FIRE },
    { name: "Building Permit", agency: "DOBS", cost: "$500-$2,000", costMin: 500, costMax: 2000, timeline: "4-8 weeks", url: BLDG },
    { name: "Certificate of Occupancy", agency: "DOBS", cost: "$150", costMin: 150, costMax: 150, timeline: "3-4 weeks", url: COO },
    { name: "Sign Permit", agency: "DOBS", cost: "$100-$500", costMin: 100, costMax: 500, timeline: "2-4 weeks", url: BLDG },
  ],
};

const liquorPermit: Permit = {
  name: "Liquor License", agency: "City of Chicago", cost: "$4,400", costMin: 4400, costMax: 4400, timeline: "8-12 weeks", url: LIQ,
};

export function getPermits(businessType: string, sellsAlcohol: boolean): Permit[] {
  const type = Object.keys(basePermits).includes(businessType) ? businessType : "Office";
  const permits = [...(basePermits[type] || basePermits.Office)];
  // Add liquor license if sells alcohol and not already included (Bar type already has it)
  if (sellsAlcohol && !permits.some(p => p.name === "Liquor License")) {
    permits.push(liquorPermit);
  }
  return permits;
}

export function getTotalCostRange(permits: Permit[]): { min: number; max: number } {
  return permits.reduce(
    (acc, p) => ({ min: acc.min + p.costMin, max: acc.max + p.costMax }),
    { min: 0, max: 0 }
  );
}

export function getTotalCost(permits: Permit[]): number {
  return permits.reduce((sum, p) => sum + p.costMin, 0);
}

export function getMaxTimeline(permits: Permit[]): string {
  const weeks = permits.map(p => {
    const match = p.timeline.match(/(\d+)/g);
    return match ? Math.max(...match.map(Number)) : 0;
  });
  return `${Math.max(...weeks)} weeks`;
}

export const PERMIT_DISCLAIMER = "This is not legal advice. Always verify requirements with the relevant Chicago city departments.";
