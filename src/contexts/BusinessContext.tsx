import React, { createContext, useContext, useState, ReactNode } from "react";

export interface BusinessData {
  id?: string;
  name: string;
  type: string;
  sellsFood: boolean;
  sellsAlcohol: boolean;
  budget: number;
  employees: number;
  launchDate: string;
  hasLocation: boolean;
  address: string;
  area: string;
  sqft: number;
  rentBudget: number;
  targetCustomers: string[];
  avgTicket: number;
  dailyCustomers: number;
  openTime: string;
  closeTime: string;
  supplierProximity: boolean;
  parkingNeeded: boolean;
  outdoorSpace: boolean;
}

export const defaultBusinessData: BusinessData = {
  name: "", type: "Restaurant", sellsFood: false, sellsAlcohol: false,
  budget: 0, employees: 1, launchDate: "", hasLocation: false,
  address: "", area: "Loop", sqft: 0, rentBudget: 0,
  targetCustomers: [], avgTicket: 0, dailyCustomers: 0,
  openTime: "09:00", closeTime: "17:00",
  supplierProximity: false, parkingNeeded: false, outdoorSpace: false,
};

interface BusinessContextType {
  data: BusinessData;
  setData: React.Dispatch<React.SetStateAction<BusinessData>>;
  businesses: BusinessData[];
  setBusinesses: React.Dispatch<React.SetStateAction<BusinessData[]>>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BusinessData>(defaultBusinessData);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);

  return (
    <BusinessContext.Provider value={{ data, setData, businesses, setBusinesses }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
