"use client";

import React, { useState, useRef } from "react";
import { Download, Upload, Plus } from "lucide-react";

export default function MTOForm() {
  const [projectInfo, setProjectInfo] = useState({
    projectName: "Riverside Data Center",
    rfpNumber: "RFP-2026-042",
    bidDueDate: "2026-07-15",
    vendorPriceList: "Graybar 2026 Q2",
    dateNeededBy: "2026-08-01",
  });

  const [mtoLines, setMtoLines] = useState([
    {
      id: 1,
      itemCode: "C-1234",
      description: "3/4\" EMT Conduit",
      qty: 1000,
      neca: 0.05,
      pricePerUnit: 0.85,
      perUnit: "EACH",
    },
    {
      id: 2,
      itemCode: "W-8899",
      description: "#12 THHN Copper Wire (Black)",
      qty: 5000,
      neca: 0.005,
      pricePerUnit: 0.12,
      perUnit: "FT",
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalHours = mtoLines.reduce((acc, line) => acc + line.qty * line.neca, 0);
  const totalCost = mtoLines.reduce(
    (acc, line) => acc + line.qty * line.pricePerUnit,
    0
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.mockTakeoff) {
        // Map the OCR result to our table structure
        const newLines = data.mockTakeoff.map((item: any, idx: number) => ({
          id: Date.now() + idx,
          itemCode: item.itemCode,
          description: item.description,
          qty: item.qty,
          neca: 0.05, // Placeholder rates
          pricePerUnit: 1.50, // Placeholder prices
          perUnit: "EACH"
        }));
        setMtoLines(prev => [...prev, ...newLines]);
      } else {
        alert(data.message || data.error || "Failed to process blueprint.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting OCR API.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "ITEM CODE",
      "ITEM DESCRIPTION",
      "QTY",
      "NECA",
      "Total Hours",
      "Price per Unit",
      "Per Unit",
      "Total Cost",
    ];
    const rows = mtoLines.map((line) => [
      line.itemCode,
      line.description,
      line.qty,
      line.neca,
      (line.qty * line.neca).toFixed(2),
      line.pricePerUnit,
      line.perUnit,
      (line.qty * line.pricePerUnit).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MTO_${projectInfo.projectName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel w-full max-w-6xl mx-auto p-6 text-rose-950 flex flex-col gap-6 !bg-white/40 !border-rose-900/10">
      {/* HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-rose-900/20 pb-6">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-rose-900">
            Project Information
          </h2>
          <div className="space-y-3">
            <div className="flex flex-col">
              <label className="text-xs text-rose-800/80 uppercase tracking-wider mb-1 font-bold">
                Project Name
              </label>
              <input
                type="text"
                className="glass-input !text-rose-950 !bg-white/50 !border-rose-900/20 focus:!ring-rose-800"
                value={projectInfo.projectName}
                onChange={(e) =>
                  setProjectInfo({ ...projectInfo, projectName: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-rose-800/80 uppercase tracking-wider mb-1 font-bold">
                RFP Number
              </label>
              <input
                type="text"
                className="glass-input !text-rose-950 !bg-white/50 !border-rose-900/20 focus:!ring-rose-800"
                value={projectInfo.rfpNumber}
                onChange={(e) =>
                  setProjectInfo({ ...projectInfo, rfpNumber: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-end space-y-3">
          <div className="flex flex-col">
            <label className="text-xs text-rose-800/80 uppercase tracking-wider mb-1 font-bold">
              Bid Due Date
            </label>
            <input
              type="date"
              className="glass-input !text-rose-950 !bg-white/50 !border-rose-900/20 focus:!ring-rose-800"
              value={projectInfo.bidDueDate}
              onChange={(e) =>
                setProjectInfo({ ...projectInfo, bidDueDate: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-rose-800/80 uppercase tracking-wider mb-1 font-bold">
              Vendor Price List
            </label>
            <input
              type="text"
              className="glass-input !text-rose-950 !bg-white/50 !border-rose-900/20 focus:!ring-rose-800"
              value={projectInfo.vendorPriceList}
              onChange={(e) =>
                setProjectInfo({
                  ...projectInfo,
                  vendorPriceList: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-rose-900">Material Takeoff (MTO)</h3>
        <div className="flex gap-3">
          <input
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 text-white transition-colors shadow-md disabled:opacity-50"
          >
            <Upload size={16} />
            {isUploading ? "Processing..." : "Import Bluebeam/OCR"}
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-500 hover:bg-stone-600 text-white transition-colors shadow-md"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="overflow-x-auto rounded-xl border border-rose-900/20 glass !bg-white/60">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-rose-100/50 border-b border-rose-900/20 text-rose-900">
            <tr>
              <th colSpan={3} className="px-4 py-3 border-r border-rose-900/20">
                Item Information
              </th>
              <th
                colSpan={2}
                className="px-4 py-3 border-r border-rose-900/20 font-bold"
              >
                Labor
              </th>
              <th colSpan={3} className="px-4 py-3 font-bold">
                Material
              </th>
            </tr>
            <tr className="bg-rose-50/50">
              <th className="px-4 py-2 border-r border-rose-900/20">ITEM CODE</th>
              <th className="px-4 py-2 border-r border-rose-900/20">
                ITEM DESCRIPTION
              </th>
              <th className="px-4 py-2 border-r border-rose-900/20">QTY</th>
              <th className="px-4 py-2 border-r border-rose-900/20">NECA</th>
              <th className="px-4 py-2 border-r border-rose-900/20">
                Total Hours
              </th>
              <th className="px-4 py-2 border-r border-rose-900/20">
                Price per Unit
              </th>
              <th className="px-4 py-2 border-r border-rose-900/20">Per Unit</th>
              <th className="px-4 py-2">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {mtoLines.map((line) => (
              <tr
                key={line.id}
                className="border-b border-rose-900/10 hover:bg-white/50 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-rose-950 font-medium">{line.itemCode}</td>
                <td className="px-4 py-3 font-medium">{line.description}</td>
                <td className="px-4 py-3 font-mono font-bold text-rose-800">{line.qty.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-stone-700">{line.neca}</td>
                <td className="px-4 py-3 font-mono font-bold text-rose-900">
                  {(line.qty * line.neca).toFixed(2)}
                </td>
                <td className="px-4 py-3 font-mono text-stone-700">${line.pricePerUnit}</td>
                <td className="px-4 py-3 text-xs font-bold text-stone-600">{line.perUnit}</td>
                <td className="px-4 py-3 font-mono font-bold text-rose-900">
                  ${(line.qty * line.pricePerUnit).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Add Row Button */}
        <div className="p-3 bg-white/30 flex justify-center border-t border-rose-900/10">
          <button className="flex items-center gap-1 text-rose-800/80 hover:text-rose-900 transition-colors text-sm font-semibold">
            <Plus size={16} /> Add Custom Item
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-4">
        <div className="flex flex-col">
          <label className="text-xs text-rose-800/80 uppercase tracking-wider mb-1 font-bold">
            Date Needed By
          </label>
          <input
            type="date"
            className="glass-input !text-rose-950 !bg-white/50 !border-rose-900/20 focus:!ring-rose-800"
            value={projectInfo.dateNeededBy}
            onChange={(e) =>
              setProjectInfo({ ...projectInfo, dateNeededBy: e.target.value })
            }
          />
        </div>
        
        <div className="flex gap-8 bg-white/60 p-4 rounded-xl border border-rose-900/20 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs text-rose-800/80 uppercase font-bold">Total Hours</span>
            <span className="text-2xl font-bold text-rose-900 font-mono">
              {totalHours.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-rose-800/80 uppercase font-bold">Total Cost</span>
            <span className="text-2xl font-bold text-rose-900 font-mono">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
