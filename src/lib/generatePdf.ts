import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BusinessData } from "@/contexts/BusinessContext";
import { getPermits, getTotalCostRange, getMaxTimeline, PERMIT_DISCLAIMER, type Permit } from "@/lib/permits";

export function generateReport(data: BusinessData, viability: number) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const primary = [30, 100, 220] as const; // accent blue
  const dark = [20, 20, 30] as const;

  // ─── Header ───
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Bizlo", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Chicago Small Business Intelligence", 14, 26);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 14, 34);
  y = 50;

  // ─── Business Name ───
  doc.setTextColor(...dark);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(data.name || "Business Report", 14, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${data.type} • ${data.hasLocation ? data.address : data.area}`, 14, y);
  y += 14;

  // ─── Viability Score ───
  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Viability Score", 14, y);
  y += 8;

  const riskLabel = viability >= 70 ? "Low Risk" : viability >= 40 ? "Medium Risk" : "High Risk";
  const riskColor: readonly [number, number, number] = viability >= 70 ? [34, 197, 94] : viability >= 40 ? [234, 179, 8] : [239, 68, 68];

  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...riskColor);
  doc.text(`${viability}`, 14, y + 12);

  doc.setFontSize(12);
  doc.text(riskLabel, 50, y + 12);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("/ 100", 35, y + 12);
  y += 22;

  // ─── Business Summary Table ───
  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Business Summary", 14, y);
  y += 4;

  const summaryRows = [
    ["Business Name", data.name || "—"],
    ["Type", data.type],
    ["Budget", `$${data.budget.toLocaleString()}`],
    ["Employees", String(data.employees)],
    ["Target Opening", data.launchDate || "TBD"],
    ["Location", data.hasLocation ? data.address : `${data.area} (searching)`],
    ["Square Footage", data.sqft ? `${data.sqft.toLocaleString()} sq ft` : "—"],
    ["Rent Budget", data.rentBudget ? `$${data.rentBudget.toLocaleString()}/mo` : "—"],
    ["Target Customers", data.targetCustomers.length ? data.targetCustomers.join(", ") : "—"],
    ["Avg Ticket", data.avgTicket ? `$${data.avgTicket}` : "—"],
    ["Daily Customers", data.dailyCustomers ? String(data.dailyCustomers) : "—"],
    ["Hours", `${data.openTime} – ${data.closeTime}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: summaryRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, textColor: [100, 100, 100] },
      1: { textColor: [20, 20, 30] },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ─── Permits Section ───
  const permits: Permit[] = getPermits(data.type, data.sellsAlcohol);
  const costRange = getTotalCostRange(permits);
  const maxTimeline = getMaxTimeline(permits);

  // Check if we need a new page
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Required Permits & Licenses", 14, y);
  y += 4;

  const permitRows = permits.map(p => [p.name, p.agency, p.cost, p.timeline]);

  autoTable(doc, {
    startY: y,
    head: [["Permit", "Agency", "Cost", "Timeline"]],
    body: permitRows,
    theme: "striped",
    headStyles: { fillColor: [...primary], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Cost summary
  const costStr = costRange.min === costRange.max
    ? `$${costRange.min.toLocaleString()}`
    : `$${costRange.min.toLocaleString()} – $${costRange.max.toLocaleString()}`;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text(`Total Estimated Cost: ${costStr}`, 14, y);
  doc.setTextColor(...dark);
  doc.text(`Max Timeline: ${maxTimeline}`, pageWidth - 14 - doc.getTextWidth(`Max Timeline: ${maxTimeline}`), y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(130, 130, 130);
  doc.text(PERMIT_DISCLAIMER, 14, y);
  y += 10;

  // ─── Footer on every page ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(245, 245, 250);
    doc.rect(0, pageH - 16, pageWidth, 16, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text("Generated by Bizlo — Chicago Small Business Intelligence", 14, pageH - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14 - doc.getTextWidth(`Page ${i} of ${totalPages}`), pageH - 6);
  }

  // ─── Save ───
  const safeName = (data.name || "bizlo-report").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  doc.save(`${safeName}-report.pdf`);
}
