"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Upload, Plus, Trash2, Calendar, FileSpreadsheet, Layers, DollarSign, Briefcase, Search, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Project {
  id: number;
  project_name: string;
  rfp_number: string;
  bid_due_date: string;
  vendor_price_list: string;
  date_needed_by: string;
  milestone_dates?: any;
}

interface MTOLine {
  id?: number;
  project_id?: number;
  item_code: string;
  description: string;
  qty: number;
  neca_rate: number;
  total_hours?: number;
  price_per_unit: number;
  per_unit: string;
  total_cost?: number;
}

interface LaborRate {
  id?: number;
  project_id?: number;
  position_name: string;
  hourly_rate: number;
}

export default function MTOForm({ onProjectChange }: { onProjectChange?: (id: number | "") => void }) {
  const [activeTab, setActiveTab] = useState<"mto" | "labor" | "catalog">("mto");
  
  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [projectInfo, setProjectInfo] = useState<Project>({
    id: 0,
    project_name: "",
    rfp_number: "",
    bid_due_date: "",
    vendor_price_list: "",
    date_needed_by: "",
  });

  // MTO state
  const [mtoLines, setMtoLines] = useState<MTOLine[]>([]);
  
  // Labor Rates state
  const [laborRates, setLaborRates] = useState<LaborRate[]>([]);
  
  // Catalog state
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Modal / Add row state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customItem, setCustomItem] = useState<MTOLine>({
    item_code: "",
    description: "",
    qty: 1,
    neca_rate: 0.05,
    price_per_unit: 1.0,
    per_unit: "EACH",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isExcelImporting, setIsExcelImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Load projects list initially
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch project specific data when selectedProjectId changes
  useEffect(() => {
    if (onProjectChange) {
      onProjectChange(selectedProjectId);
    }
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === Number(selectedProjectId));
      if (proj) {
        setProjectInfo(proj);
        fetchProjectData(proj.id);
      }
    } else {
      setMtoLines([]);
      setLaborRates([]);
      setProjectInfo({
        id: 0,
        project_name: "",
        rfp_number: "",
        bid_due_date: "",
        vendor_price_list: "",
        date_needed_by: "",
      });
    }
  }, [selectedProjectId, projects]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    }
  };

  const fetchProjectData = async (projId: number) => {
    // 1. Fetch MTO lines
    const { data: mtoData } = await supabase
      .from("project_mto")
      .select("*")
      .eq("project_id", projId)
      .order("created_at", { ascending: true });
    if (mtoData) setMtoLines(mtoData);

    // 2. Fetch Labor Rates
    const { data: laborData } = await supabase
      .from("labor_rates")
      .select("*")
      .eq("project_id", projId);
    
    if (laborData && laborData.length > 0) {
      setLaborRates(laborData);
    } else {
      // Seed default labor rates for overrides
      const defaultRates: LaborRate[] = [
        { position_name: "Foreman", hourly_rate: 85.0 },
        { position_name: "Journeyman", hourly_rate: 75.0 },
        { position_name: "Apprentice", hourly_rate: 45.0 },
      ];
      setLaborRates(defaultRates);
    }
  };

  const handleCreateProject = async () => {
    const newProjName = prompt("Enter new project name:");
    if (!newProjName) return;

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          project_name: newProjName,
          rfp_number: "RFP-" + Math.floor(Math.random() * 10000),
          bid_due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          vendor_price_list: "Standard Price List",
          date_needed_by: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setProjects((prev) => [data, ...prev]);
      setSelectedProjectId(data.id);
    } else {
      alert("Error creating project: " + error?.message);
    }
  };

  const handleSaveProjectInfo = async () => {
    if (!selectedProjectId) return;
    const { error } = await supabase
      .from("projects")
      .update({
        project_name: projectInfo.project_name,
        rfp_number: projectInfo.rfp_number,
        bid_due_date: projectInfo.bid_due_date || null,
        vendor_price_list: projectInfo.vendor_price_list,
        date_needed_by: projectInfo.date_needed_by || null,
      })
      .eq("id", selectedProjectId);

    if (!error) {
      // Update calendar reminder
      fetch("/api/outlook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectInfo.project_name,
          bidDueDate: projectInfo.bid_due_date,
          assignedEmail: "estimator@enetk.com",
        }),
      });

      alert("Project specifications updated successfully!");
      fetchProjects();
    } else {
      alert("Error saving project details: " + error.message);
    }
  };

  const handleSaveLaborRates = async () => {
    if (!selectedProjectId) return;
    
    // Clean old rates and insert overrides
    await supabase.from("labor_rates").delete().eq("project_id", selectedProjectId);
    
    const newRates = laborRates.map((lr) => ({
      project_id: selectedProjectId,
      position_name: lr.position_name,
      hourly_rate: lr.hourly_rate,
    }));

    const { error } = await supabase.from("labor_rates").insert(newRates);
    if (!error) {
      alert("Labor rates overrides saved successfully!");
      fetchProjectData(Number(selectedProjectId));
    } else {
      alert("Error saving labor rates: " + error.message);
    }
  };

  const handleAddCustomLine = async () => {
    if (!selectedProjectId) return;
    
    const calculatedHours = customItem.qty * customItem.neca_rate;
    const calculatedCost = customItem.qty * customItem.price_per_unit;

    const { data, error } = await supabase
      .from("project_mto")
      .insert([
        {
          project_id: selectedProjectId,
          item_code: customItem.item_code,
          description: customItem.description,
          qty: customItem.qty,
          neca_rate: customItem.neca_rate,
          total_hours: calculatedHours,
          price_per_unit: customItem.price_per_unit,
          per_unit: customItem.per_unit,
          total_cost: calculatedCost,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setMtoLines((prev) => [...prev, data]);
      setIsAddingCustom(false);
      setCustomItem({
        item_code: "",
        description: "",
        qty: 1,
        neca_rate: 0.05,
        price_per_unit: 1.0,
        per_unit: "EACH",
      });
    } else {
      alert("Error adding item: " + error?.message);
    }
  };

  const handleDeleteMTOItem = async (id: number) => {
    const { error } = await supabase.from("project_mto").delete().eq("id", id);
    if (!error) {
      setMtoLines((prev) => prev.filter((item) => item.id !== id));
    } else {
      alert("Error deleting item: " + error.message);
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExcelImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
        
        // Expect: [Unit, Cost Code, Part #, Description, NECA rate, Price]
        // Header on row 0, data starts on row 1
        const parsedRows = rawRows.slice(1).map((row: any) => ({
          unit: String(row[0] || "EACH"),
          cost_code: String(row[1] || ""),
          part_number: String(row[2] || ""),
          description: String(row[3] || ""),
          neca_rate: parseFloat(row[4]) || 0.0,
          default_price: parseFloat(row[5]) || 0.0,
        })).filter(r => r.description || r.part_number);

        const { error } = await supabase.from("materials_master").insert(parsedRows);
        if (error) throw error;
        
        alert(`Successfully imported ${parsedRows.length} materials into master catalog!`);
      } catch (err: any) {
        console.error(err);
        alert(`Error importing Excel: ${err.message}`);
      } finally {
        setIsExcelImporting(false);
        if (excelInputRef.current) excelInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBlueprintOCR = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const resJson = await response.json();
      if (resJson.mockTakeoff) {
        // Bulk save takeoffs to Supabase project_mto
        const formattedTakeoffs = resJson.mockTakeoff.map((takeoff: any) => ({
          project_id: selectedProjectId,
          item_code: takeoff.itemCode,
          description: takeoff.description,
          qty: takeoff.qty,
          neca_rate: 0.06, // default rate
          total_hours: takeoff.qty * 0.06,
          price_per_unit: 1.5,
          per_unit: "EACH",
          total_cost: takeoff.qty * 1.5,
        }));

        const { error } = await supabase.from("project_mto").insert(formattedTakeoffs);
        if (!error) {
          alert(`Success! Vision model extracted and added ${formattedTakeoffs.length} lines to takeoff!`);
          fetchProjectData(Number(selectedProjectId));
        } else {
          alert("Error inserting takeoff lines: " + error.message);
        }
      } else {
        alert(resJson.message || resJson.error || "OCR Processing Complete.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading drawing for AI Takeoff.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const searchCatalog = async () => {
    if (!catalogQuery) {
      setCatalogItems([]);
      return;
    }
    const { data } = await supabase
      .from("materials_master")
      .select("*")
      .or(`description.ilike.%${catalogQuery}%,part_number.ilike.%${catalogQuery}%,cost_code.ilike.%${catalogQuery}%`)
      .limit(10);
    
    if (data) setCatalogItems(data);
  };

  const selectCatalogItem = (item: any) => {
    setCustomItem({
      item_code: item.part_number || item.cost_code || "",
      description: item.description || "",
      qty: 1,
      neca_rate: item.neca_rate || 0.05,
      price_per_unit: item.default_price || 1.0,
      per_unit: item.unit || "EACH",
    });
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
      line.item_code,
      line.description,
      line.qty,
      line.neca_rate,
      (line.qty * line.neca_rate).toFixed(2),
      line.price_per_unit,
      line.per_unit,
      (line.qty * line.price_per_unit).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MTO_${projectInfo.project_name || "project"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Math Calculations
  const totalHours = mtoLines.reduce((acc, line) => acc + (line.qty * line.neca_rate), 0);
  const totalCost = mtoLines.reduce((acc, line) => acc + (line.qty * line.price_per_unit), 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto text-slate-800">
      {/* Project Selector Bar */}
      <div className="card flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Briefcase className="text-rose-800" size={24} />
          <div className="flex-1">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Estimate</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
              className="input py-1.5 px-3 font-semibold text-slate-800 bg-white/70"
            >
              <option value="">-- Select Project Estimate --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleCreateProject} className="btn btn-primary w-full md:w-auto">
          + New Estimate Project
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("mto")}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "mto" ? "border-rose-800 text-rose-800" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers size={16} /> MTO Worksheet
        </button>
        <button
          onClick={() => setActiveTab("labor")}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "labor" ? "border-rose-800 text-rose-800" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <DollarSign size={16} /> Labor Rates Sheets
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "catalog" ? "border-rose-800 text-rose-800" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileSpreadsheet size={16} /> Excel Materials Master
        </button>
      </div>

      {/* MTO TAB CONTENT */}
      {activeTab === "mto" && (
        <div className="flex flex-col gap-6">
          {selectedProjectId ? (
            <>
              {/* Project Specs */}
              <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-rose-900 border-b pb-2">Project Specifications</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="label uppercase tracking-wider text-xs">Project Name</label>
                      <input
                        type="text"
                        className="input"
                        value={projectInfo.project_name}
                        onChange={(e) => setProjectInfo({ ...projectInfo, project_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label uppercase tracking-wider text-xs">RFP Number</label>
                      <input
                        type="text"
                        className="input"
                        value={projectInfo.rfp_number}
                        onChange={(e) => setProjectInfo({ ...projectInfo, rfp_number: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4 md:border-l md:pl-6">
                  <h3 className="text-lg font-bold text-rose-900 border-b pb-2">Schedule & Milestones</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="label uppercase tracking-wider text-xs">Bid Due Date</label>
                      <input
                        type="date"
                        className="input"
                        value={projectInfo.bid_due_date || ""}
                        onChange={(e) => setProjectInfo({ ...projectInfo, bid_due_date: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label uppercase tracking-wider text-xs">Vendor Price List</label>
                        <input
                          type="text"
                          className="input"
                          value={projectInfo.vendor_price_list || ""}
                          onChange={(e) => setProjectInfo({ ...projectInfo, vendor_price_list: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label uppercase tracking-wider text-xs">Needed By</label>
                        <input
                          type="date"
                          className="input"
                          value={projectInfo.date_needed_by || ""}
                          onChange={(e) => setProjectInfo({ ...projectInfo, date_needed_by: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-end gap-2 pt-2 border-t">
                  <button onClick={handleSaveProjectInfo} className="btn btn-primary">
                    Save Specifications
                  </button>
                </div>
              </div>

              {/* MTO Table */}
              <div className="card flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <h3 className="text-xl font-bold text-rose-900">Material Takeoff Worksheet</h3>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      ref={fileInputRef}
                      onChange={handleBlueprintOCR}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="btn flex items-center gap-2 bg-rose-50 text-rose-900 border-rose-200"
                    >
                      <Upload size={16} />
                      {isUploading ? "AI Takeoff Extracting..." : "Gemini Vision OCR Blueprint"}
                    </button>
                    <button onClick={exportToCSV} className="btn flex items-center gap-2">
                      <Download size={16} /> Export MTO CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs uppercase">
                      <tr>
                        <th colSpan={3} className="px-4 py-3 border-r border-slate-200">Item Info</th>
                        <th colSpan={2} className="px-4 py-3 border-r border-slate-200">Labor Setup</th>
                        <th colSpan={4} className="px-4 py-3">Material Cost Setup</th>
                      </tr>
                      <tr className="bg-slate-100/50">
                        <th className="px-4 py-2 border-r border-slate-200">Item Code</th>
                        <th className="px-4 py-2 border-r border-slate-200">Description</th>
                        <th className="px-4 py-2 border-r border-slate-200">Qty</th>
                        <th className="px-4 py-2 border-r border-slate-200">NECA Rate</th>
                        <th className="px-4 py-2 border-r border-slate-200">Total Hours</th>
                        <th className="px-4 py-2 border-r border-slate-200">Price/Unit</th>
                        <th className="px-4 py-2 border-r border-slate-200">Unit</th>
                        <th className="px-4 py-2 border-r border-slate-200">Total Cost</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mtoLines.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-medium">
                            No takeoff items added yet. Click "Add Custom Item" or upload blueprint drawing.
                          </td>
                        </tr>
                      ) : (
                        mtoLines.map((line) => (
                          <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono text-xs">{line.item_code}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{line.description}</td>
                            <td className="px-4 py-3 font-mono font-bold">{line.qty.toLocaleString()}</td>
                            <td className="px-4 py-3 font-mono">{line.neca_rate}</td>
                            <td className="px-4 py-3 font-mono text-rose-900 font-bold">
                              {(line.qty * line.neca_rate).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-mono">${line.price_per_unit.toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs uppercase font-bold text-slate-500">{line.per_unit}</td>
                            <td className="px-4 py-3 font-mono text-rose-900 font-bold">
                              ${(line.qty * line.price_per_unit).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => line.id && handleDeleteMTOItem(line.id)}
                                className="text-red-600 hover:text-red-700 transition-colors p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-center border-t pt-4">
                  <button onClick={() => setIsAddingCustom(true)} className="btn btn-primary flex items-center gap-1">
                    <Plus size={16} /> Add Custom Item
                  </button>
                </div>

                {/* Totals Footer */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                  <div className="flex gap-4 items-center">
                    <Calendar size={18} className="text-slate-500" />
                    <div>
                      <span className="text-xs text-slate-500 font-bold block uppercase">Est Date Needed By</span>
                      <span className="font-semibold text-slate-800">{projectInfo.date_needed_by || "Not Specified"}</span>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-bold block uppercase">Total Hours</span>
                      <span className="text-xl font-bold text-rose-900 font-mono">{totalHours.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-bold block uppercase">Total Cost</span>
                      <span className="text-xl font-bold text-rose-900 font-mono">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-12 text-slate-500">
              Please select or create an active project estimate from the dropdown above.
            </div>
          )}
        </div>
      )}

      {/* LABOR TAB CONTENT */}
      {activeTab === "labor" && (
        <div className="card flex flex-col gap-6">
          {selectedProjectId ? (
            <>
              <div>
                <h3 className="text-xl font-bold text-rose-900 mb-2">Project Labor Rate Sheet</h3>
                <p className="text-slate-500 text-sm">
                  Configure the default position rates below for this estimate project. Overrides apply automatically to takeoff calculations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {laborRates.map((rate, idx) => (
                  <div key={idx} className="bg-white/50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                    <span className="font-bold text-slate-700">{rate.position_name}</span>
                    <div className="flex items-center gap-1 bg-white border rounded-lg px-3 py-1.5 shadow-inner">
                      <span className="text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        className="w-full focus:outline-none font-mono font-bold text-lg"
                        value={rate.hourly_rate}
                        onChange={(e) => {
                          const updated = [...laborRates];
                          updated[idx].hourly_rate = parseFloat(e.target.value) || 0;
                          setLaborRates(updated);
                        }}
                      />
                      <span className="text-xs text-slate-500 font-medium">/hr</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button onClick={handleSaveLaborRates} className="btn btn-primary">
                  Save Labor Rate Overrides
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Please select an active project estimate.
            </div>
          )}
        </div>
      )}

      {/* CATALOG TAB CONTENT */}
      {activeTab === "catalog" && (
        <div className="card flex flex-col gap-6">
          <div>
            <h3 className="text-xl font-bold text-rose-900 mb-2">Materials Master catalog Database</h3>
            <p className="text-slate-500 text-sm">
              Manage the core company pricing and labor (NECA) catalogs. Upload your existing material sheets directly via Excel.
            </p>
          </div>

          {/* Catalog Excel Import Panel */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">Excel Import (xlsx / csv)</span>
              <span className="text-slate-500 text-xs block">
                Format required: Header row, followed by columns: [Unit, Cost Code, Part #, Description, NECA rate, Price]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                ref={excelInputRef}
                onChange={handleExcelImport}
                className="hidden"
              />
              <button
                onClick={() => excelInputRef.current?.click()}
                disabled={isExcelImporting}
                className="btn btn-primary flex items-center gap-2"
              >
                <FileSpreadsheet size={18} />
                {isExcelImporting ? "Parsing & Bulk Uploading..." : "Choose & Import Spreadsheet"}
              </button>
            </div>
          </div>

          {/* Search catalog */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border bg-white rounded-lg px-3 py-2">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalog by keyword, part #, or cost code..."
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCatalog()}
                  className="w-full focus:outline-none text-slate-800"
                />
              </div>
              <button onClick={searchCatalog} className="btn bg-rose-50 border-rose-200 text-rose-900">
                Search Catalog
              </button>
            </div>

            {catalogItems.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-2">
                <div className="bg-slate-50 p-2 text-xs font-bold text-slate-500 uppercase tracking-wide border-b">
                  Query Results ({catalogItems.length})
                </div>
                <div className="divide-y">
                  {catalogItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        selectCatalogItem(item);
                        alert(`Selected: ${item.description || item.part_number}. Go to MTO Worksheet -> Add Custom Item to edit values.`);
                      }}
                      className="p-3 hover:bg-rose-50/30 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{item.description}</span>
                        <span className="text-xs text-slate-400">Part: {item.part_number} | Code: {item.cost_code}</span>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-600 font-mono">
                        <span>NECA: {item.neca_rate} hr</span>
                        <span>Price: ${item.default_price}</span>
                        <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase">
                          Select Item
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom MTO Line Modal */}
      {isAddingCustom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg bg-white flex flex-col gap-6 shadow-2xl">
            <div className="border-b pb-3 flex justify-between items-center">
              <h3 className="text-xl font-bold text-rose-900">Add Takeoff Item</h3>
              <button onClick={() => setIsAddingCustom(false)} className="text-slate-500 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Item Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 1/2 EMT Steel Conduit"
                  value={customItem.description}
                  onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Item Code / Part #</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. C-101"
                  value={customItem.item_code}
                  onChange={(e) => setCustomItem({ ...customItem, item_code: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input
                  type="number"
                  className="input font-mono"
                  value={customItem.qty}
                  onChange={(e) => setCustomItem({ ...customItem, qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">NECA rate (hours)</label>
                <input
                  type="number"
                  step="0.001"
                  className="input font-mono"
                  value={customItem.neca_rate}
                  onChange={(e) => setCustomItem({ ...customItem, neca_rate: parseFloat(e.target.value) || 0.0 })}
                />
              </div>
              <div>
                <label className="label">Price per Unit ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input font-mono"
                  value={customItem.price_per_unit}
                  onChange={(e) => setCustomItem({ ...customItem, price_per_unit: parseFloat(e.target.value) || 0.0 })}
                />
              </div>
              <div>
                <label className="label">Per Unit</label>
                <input
                  type="text"
                  className="input"
                  placeholder="EACH / FT / C"
                  value={customItem.per_unit}
                  onChange={(e) => setCustomItem({ ...customItem, per_unit: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setIsAddingCustom(false)} className="btn bg-slate-100 hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={handleAddCustomLine} className="btn btn-primary">
                Add to Takeoff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
