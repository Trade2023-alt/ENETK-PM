"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, Upload, Plus, Trash2, Calendar, FileSpreadsheet, Layers, DollarSign, Briefcase, Search, CheckCircle, Save, Settings, FileText, TrendingUp, Users, Truck, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Project {
  id: number;
  project_name: string;
  rfp_number: string;
  bid_due_date: string;
  vendor_price_list: string;
  date_needed_by: string;
  schedule?: any;
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
  mto_sheet: string;
}

interface LaborRate {
  id?: number;
  project_id?: number;
  position_name: string;
  hourly_rate: number;
}

interface LaborGridEntry {
  position_name: string;
  travelHours: number;
  numberOfDays: number;
  regularHours: number;
  overtimeHours: number;
  hourly_rate: number;
  perDiemTier: string;
}

interface OwnedEquipmentEntry {
  equipmentName: string;
  rateHour: number;
  rateDay: number;
  rateWeek: number;
  rateMonth: number;
  rateTrip: number;
  timeType: "Hour" | "Day" | "Week" | "Month" | "Trip";
  timeQty: number;
  deductPercent: number;
}

interface RentalEquipmentEntry {
  equipmentName: string;
  rateHour: number;
  rateDay: number;
  rateWeek: number;
  rateMonth: number;
  rateTrip: number;
  timeType: "Hour" | "Day" | "Week" | "Month" | "Trip";
  timeQty: number;
  markupPercent: number;
}

interface QuoteEntry {
  name: string;
  amount: number;
  markupPercent: number;
}

const DEFAULT_POSITIONS: LaborGridEntry[] = [
  { position_name: "Project Manager", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 160.00, perDiemTier: "JW/PF/PM/SRSYS" },
  { position_name: "Project Foreman", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 120.00, perDiemTier: "JW/PF/PM/SRSYS" },
  { position_name: "Journeyman Electrician", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 105.00, perDiemTier: "JW/PF/PM/SRSYS" },
  { position_name: "Apprentice Electrician - 4th Year", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 95.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "Apprentice Electrician - 3rd Year", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 95.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "Apprentice Electrician - 2nd Year", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 85.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "Apprentice Electrician - 1st Year", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 85.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "SR System Integrator", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 150.00, perDiemTier: "JW/PF/PM/SRSYS" },
  { position_name: "System Integrator 1", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 135.00, perDiemTier: "JW/PF/PM/SRSYS" },
  { position_name: "Auto Technician III", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 115.00, perDiemTier: "PLC/AUTO TECH" },
  { position_name: "Auto Technician II", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 105.00, perDiemTier: "PLC/AUTO TECH" },
  { position_name: "Auto Technician I", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 90.00, perDiemTier: "PLC/AUTO TECH" },
  { position_name: "AutoCad Drafter", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 110.00, perDiemTier: "PLC/AUTO TECH" },
  { position_name: "Panel Shop Tech (UL Listed Panels)", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 90.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "Equipment Operator", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 95.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "Service Technician (Non-On-Call)", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 95.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "Electrician/Tech", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 125.00, perDiemTier: "APP/EQUIP OPER/SERV" },
  { position_name: "Administrative/HSE", travelHours: 0, numberOfDays: 0, regularHours: 0, overtimeHours: 0, hourly_rate: 100.00, perDiemTier: "APP/EQUIP OPER/SERV" }
];

const DEFAULT_OWNED_EQUIPMENT: OwnedEquipmentEntry[] = [
  { equipmentName: "Augar & Bits", rateHour: 25.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Backhoe", rateHour: 150.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Excavator", rateHour: 150.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Excavator Compactor", rateHour: 0, rateDay: 500.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Forklift - All Terrain", rateHour: 150.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Front End Loader", rateHour: 150.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "GFPE Injection Testing", rateHour: 0, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 1250.00, timeType: "Trip", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Hart Modem", rateHour: 0, rateDay: 35.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Hydrovac Truck", rateHour: 270.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Hydrovac Disposal", rateHour: 0, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Hydrovac Water Cold", rateHour: 0, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 65.00, timeType: "Trip", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Hydrovac Water Nurse Tank", rateHour: 150.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Jumping Jack", rateHour: 0, rateDay: 150.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Pressure Calibrator", rateHour: 0, rateDay: 200.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Process Meter", rateHour: 0, rateDay: 25.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Scissor Lift", rateHour: 0, rateDay: 320.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Semi with Trailer", rateHour: 140.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Service Truck 1", rateHour: 40.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Service Truck 2", rateHour: 40.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Skid Trencher", rateHour: 150.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Skid Steer With Forks & Bucket", rateHour: 85.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Skid Steer Compactor", rateHour: 0, rateDay: 400.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Telehandler", rateHour: 150.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Trex Modem", rateHour: 0, rateDay: 35.00, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, deductPercent: 0 },
  { equipmentName: "Vermeer Trencher", rateHour: 165.00, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Hour", timeQty: 0, deductPercent: 0 }
];

export default function MTOForm({ onProjectChange }: { onProjectChange?: (id: number | "") => void }) {
  const [activeTab, setActiveTab] = useState<string>("Capsheet");
  
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
  
  // Estimating workspace state (persisted to projects.schedule)
  const [salesTaxRate, setSalesTaxRate] = useState<number>(8.5);
  const [materialMarkupRate, setMaterialMarkupRate] = useState<number>(27.0);
  const [subcontractorMarkupRate, setSubcontractorMarkupRate] = useState<number>(10.0);
  const [necaDiscountRate, setNecaDiscountRate] = useState<number>(80);
  const [travelRatePerHour, setTravelRatePerHour] = useState<number>(50.00);
  const [permitFee, setPermitFee] = useState<number>(475.63);
  const [directJobExpense, setDirectJobExpense] = useState<number>(0.0);
  const [grossTaxReceiptsRate, setGrossTaxReceiptsRate] = useState<number>(0.0);
  const [pAndPBondRate, setPAndPBondRate] = useState<number>(0.0);
  const [contractAllowablePOH, setContractAllowablePOH] = useState<number>(0.0);
  const [projectLengthDays, setProjectLengthDays] = useState<number>(0);
  const [manHoursPerDay, setManHoursPerDay] = useState<number>(8.00);
  const [jvHours, setJvHours] = useState<number>(0.0);
  const [appHours, setAppHours] = useState<number>(0.0);

  const [laborGrid, setLaborGrid] = useState<LaborGridEntry[]>(DEFAULT_POSITIONS);
  const [companyOwnedEquipment, setCompanyOwnedEquipment] = useState<OwnedEquipmentEntry[]>(DEFAULT_OWNED_EQUIPMENT);
  const [rentalEquipment, setRentalEquipment] = useState<RentalEquipmentEntry[]>([]);
  const [subQuotes, setSubQuotes] = useState<QuoteEntry[]>([]);
  const [matQuotes, setMatQuotes] = useState<QuoteEntry[]>([]);
  const [mtoSheetNames, setMtoSheetNames] = useState<string[]>([
    "CONTROL LOGIX",
    "1766-L32AWA",
    "2080-L70E-24QBBB",
    "1769-L19ER-BB1B",
    "1769-L30ER",
    "(accounted for in other sheets)",
    "5069-L310ER",
    "MTO8"
  ]);

  // Catalog search & upload state
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Add row modal / forms state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customItem, setCustomItem] = useState<MTOLine>({
    item_code: "",
    description: "",
    qty: 1,
    neca_rate: 0.05,
    price_per_unit: 1.0,
    per_unit: "EACH",
    mto_sheet: "MTO1"
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isExcelImporting, setIsExcelImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
        fetchProjectData(proj.id, proj);
      }
    } else {
      setMtoLines([]);
      setLaborGrid(DEFAULT_POSITIONS);
      setCompanyOwnedEquipment(DEFAULT_OWNED_EQUIPMENT);
      setRentalEquipment([]);
      setSubQuotes([]);
      setMatQuotes([]);
      setSalesTaxRate(8.5);
      setMaterialMarkupRate(27.0);
      setSubcontractorMarkupRate(10.0);
      setNecaDiscountRate(80);
      setTravelRatePerHour(50.0);
      setPermitFee(475.63);
      setDirectJobExpense(0.0);
      setGrossTaxReceiptsRate(0.0);
      setPAndPBondRate(0.0);
      setContractAllowablePOH(0.0);
      setProjectLengthDays(0);
      setManHoursPerDay(8.0);
      setJvHours(0.0);
      setAppHours(0.0);
      setMtoSheetNames([
        "CONTROL LOGIX",
        "1766-L32AWA",
        "2080-L70E-24QBBB",
        "1769-L19ER-BB1B",
        "1769-L30ER",
        "(accounted for in other sheets)",
        "5069-L310ER",
        "MTO8"
      ]);
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

  const fetchProjectData = async (projId: number, proj: Project) => {
    // 1. Fetch MTO lines
    const { data: mtoData } = await supabase
      .from("project_mto")
      .select("*")
      .eq("project_id", projId)
      .order("created_at", { ascending: true });
    
    if (mtoData) {
      // Map any missing mto_sheet lines to 'MTO1'
      const sanitized = mtoData.map((line: any) => ({
        ...line,
        mto_sheet: line.mto_sheet || "MTO1"
      }));
      setMtoLines(sanitized);
    }

    // 2. Hydrate estimating system states from schedule column if exists
    if (proj && proj.schedule && typeof proj.schedule === "object") {
      const sch = proj.schedule;
      if (sch.salesTaxRate !== undefined) setSalesTaxRate(sch.salesTaxRate);
      if (sch.materialMarkupRate !== undefined) setMaterialMarkupRate(sch.materialMarkupRate);
      if (sch.subcontractorMarkupRate !== undefined) setSubcontractorMarkupRate(sch.subcontractorMarkupRate);
      if (sch.necaDiscountRate !== undefined) setNecaDiscountRate(sch.necaDiscountRate);
      if (sch.travelRatePerHour !== undefined) setTravelRatePerHour(sch.travelRatePerHour);
      if (sch.permitFee !== undefined) setPermitFee(sch.permitFee);
      if (sch.directJobExpense !== undefined) setDirectJobExpense(sch.directJobExpense);
      if (sch.grossTaxReceiptsRate !== undefined) setGrossTaxReceiptsRate(sch.grossTaxReceiptsRate);
      if (sch.pAndPBondRate !== undefined) setPAndPBondRate(sch.pAndPBondRate);
      if (sch.contractAllowablePOH !== undefined) setContractAllowablePOH(sch.contractAllowablePOH);
      if (sch.projectLengthDays !== undefined) setProjectLengthDays(sch.projectLengthDays);
      if (sch.manHoursPerDay !== undefined) setManHoursPerDay(sch.manHoursPerDay);
      if (sch.jvHours !== undefined) setJvHours(sch.jvHours);
      if (sch.appHours !== undefined) setAppHours(sch.appHours);
      
      if (sch.laborGrid && Array.isArray(sch.laborGrid)) {
        setLaborGrid(sch.laborGrid);
      } else {
        setLaborGrid(DEFAULT_POSITIONS);
      }
      
      if (sch.companyOwnedEquipment && Array.isArray(sch.companyOwnedEquipment)) {
        setCompanyOwnedEquipment(sch.companyOwnedEquipment);
      } else {
        setCompanyOwnedEquipment(DEFAULT_OWNED_EQUIPMENT);
      }
      
      if (sch.rentalEquipment && Array.isArray(sch.rentalEquipment)) {
        setRentalEquipment(sch.rentalEquipment);
      } else {
        setRentalEquipment([]);
      }
      
      if (sch.subQuotes && Array.isArray(sch.subQuotes)) {
        setSubQuotes(sch.subQuotes);
      } else {
        setSubQuotes([]);
      }

      if (sch.matQuotes && Array.isArray(sch.matQuotes)) {
        setMatQuotes(sch.matQuotes);
      } else {
        setMatQuotes([]);
      }

      if (sch.mtoSheetNames && Array.isArray(sch.mtoSheetNames)) {
        setMtoSheetNames(sch.mtoSheetNames);
      } else {
        setMtoSheetNames([
          "CONTROL LOGIX",
          "1766-L32AWA",
          "2080-L70E-24QBBB",
          "1769-L19ER-BB1B",
          "1769-L30ER",
          "(accounted for in other sheets)",
          "5069-L310ER",
          "MTO8"
        ]);
      }
    } else {
      // Default configurations
      setLaborGrid(DEFAULT_POSITIONS);
      setCompanyOwnedEquipment(DEFAULT_OWNED_EQUIPMENT);
      setRentalEquipment([]);
      setSubQuotes([]);
      setMatQuotes([]);
      setSalesTaxRate(8.5);
      setMaterialMarkupRate(27.0);
      setSubcontractorMarkupRate(10.0);
      setNecaDiscountRate(80);
      setTravelRatePerHour(50.0);
      setPermitFee(475.63);
      setDirectJobExpense(0.0);
      setGrossTaxReceiptsRate(0.0);
      setPAndPBondRate(0.0);
      setContractAllowablePOH(0.0);
      setProjectLengthDays(0);
      setManHoursPerDay(8.0);
      setJvHours(0.0);
      setAppHours(0.0);
      setMtoSheetNames([
        "CONTROL LOGIX",
        "1766-L32AWA",
        "2080-L70E-24QBBB",
        "1769-L19ER-BB1B",
        "1769-L30ER",
        "(accounted for in other sheets)",
        "5069-L310ER",
        "MTO8"
      ]);
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
          schedule: {
            salesTaxRate: 8.5,
            materialMarkupRate: 27.0,
            subcontractorMarkupRate: 10.0,
            necaDiscountRate: 80,
            travelRatePerHour: 50.0,
            permitFee: 475.63,
            directJobExpense: 0.0,
            grossTaxReceiptsRate: 0.0,
            pAndPBondRate: 0.0,
            contractAllowablePOH: 0.0,
            projectLengthDays: 0,
            manHoursPerDay: 8.0,
            jvHours: 0.0,
            appHours: 0.0,
            laborGrid: DEFAULT_POSITIONS,
            companyOwnedEquipment: DEFAULT_OWNED_EQUIPMENT,
            rentalEquipment: [],
            subQuotes: [],
            matQuotes: [],
            mtoSheetNames: [
              "CONTROL LOGIX",
              "1766-L32AWA",
              "2080-L70E-24QBBB",
              "1769-L19ER-BB1B",
              "1769-L30ER",
              "(accounted for in other sheets)",
              "5069-L310ER",
              "MTO8"
            ]
          }
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

  const handleSaveEstimate = async () => {
    if (!selectedProjectId) return;
    setIsSaving(true);
    try {
      const scheduleObj = {
        salesTaxRate,
        materialMarkupRate,
        subcontractorMarkupRate,
        necaDiscountRate,
        travelRatePerHour,
        permitFee,
        directJobExpense,
        grossTaxReceiptsRate,
        pAndPBondRate,
        contractAllowablePOH,
        projectLengthDays,
        manHoursPerDay,
        jvHours,
        appHours,
        laborGrid,
        companyOwnedEquipment,
        rentalEquipment,
        subQuotes,
        matQuotes,
        mtoSheetNames
      };

      const { error } = await supabase
        .from("projects")
        .update({
          project_name: projectInfo.project_name,
          rfp_number: projectInfo.rfp_number,
          bid_due_date: projectInfo.bid_due_date || null,
          vendor_price_list: projectInfo.vendor_price_list,
          date_needed_by: projectInfo.date_needed_by || null,
          schedule: scheduleObj
        })
        .eq("id", selectedProjectId);

      if (error) throw error;

      // Sync calendar bid reminders in Outlook API
      fetch("/api/outlook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectInfo.project_name,
          bidDueDate: projectInfo.bid_due_date,
          assignedEmail: "estimator@enetk.com",
        }),
      }).catch(err => console.error("Error setting Outlook task:", err));

      alert("Full Estimate System saved to Supabase successfully!");
      fetchProjects();
    } catch (err: any) {
      console.error(err);
      alert("Error saving estimate details: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomLine = async () => {
    if (!selectedProjectId) return;
    
    const calculatedHours = customItem.qty * customItem.neca_rate;
    const calculatedCost = customItem.qty * customItem.price_per_unit;
    const activeMtoKey = activeTab; // e.g., "MTO1" to "MTO8"

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
          mto_sheet: activeMtoKey
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
        mto_sheet: activeMtoKey
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
    const activeMtoKey = activeTab; // MTO1 - MTO8
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const resJson = await response.json();
      if (resJson.mockTakeoff) {
        const formattedTakeoffs = resJson.mockTakeoff.map((takeoff: any) => ({
          project_id: selectedProjectId,
          item_code: takeoff.itemCode,
          description: takeoff.description,
          qty: takeoff.qty,
          neca_rate: 0.06,
          total_hours: takeoff.qty * 0.06,
          price_per_unit: 1.5,
          per_unit: "EACH",
          total_cost: takeoff.qty * 1.5,
          mto_sheet: activeMtoKey
        }));

        const { error } = await supabase.from("project_mto").insert(formattedTakeoffs);
        if (!error) {
          alert(`Success! Extracted ${formattedTakeoffs.length} lines to takeoff on sheet ${activeMtoKey}!`);
          fetchProjectData(Number(selectedProjectId), projectInfo);
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
      mto_sheet: activeTab.startsWith("MTO") ? activeTab : "MTO1"
    });
  };

  const exportMtoCSV = (sheetKey: string) => {
    const filtered = mtoLines.filter((l) => l.mto_sheet === sheetKey);
    const headers = [
      "ITEM CODE",
      "ITEM DESCRIPTION",
      "QTY",
      "NECA RATE",
      "Total Hours",
      "Price per Unit",
      "Per Unit",
      "Total Cost",
    ];
    const rows = filtered.map((line) => [
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
    const sheetIdx = parseInt(sheetKey.replace("MTO", "")) - 1;
    const nameStr = mtoSheetNames[sheetIdx] || sheetKey;
    link.setAttribute("download", `Takeoff_${nameStr.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // MATH FORMULAS & WORKSPACE SUMMARIES
  // ----------------------------------------------------

  // Group MTO hours & costs per MTO sheet (1 to 8)
  const getMtoSheetTotals = (sheetKey: string) => {
    const lines = mtoLines.filter((l) => l.mto_sheet === sheetKey);
    const hours = lines.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.neca_rate || 0), 0);
    const cost = lines.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.price_per_unit || 0), 0);
    return { hours, cost };
  };

  const mtoTotalsList = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
    const key = `MTO${i}`;
    const { hours, cost } = getMtoSheetTotals(key);
    return {
      key,
      title: mtoSheetNames[i - 1] || key,
      hours,
      cost
    };
  });

  const totalNecaHoursAllSheets = mtoTotalsList.reduce((sum, item) => sum + item.hours, 0);
  const totalMtoMaterialCostAllSheets = mtoTotalsList.reduce((sum, item) => sum + item.cost, 0);

  // Labor Sheet calculations
  const calculateLaborRow = (row: LaborGridEntry) => {
    const regLaborIncome = Number(row.regularHours || 0) * Number(row.hourly_rate || 0);
    const otLaborIncome = Number(row.overtimeHours || 0) * Number(row.hourly_rate || 0) * 1.5;
    const travelTime = Number(row.travelHours || 0) * Number(travelRatePerHour || 0);
    
    // Per diem rate mapping
    let perDiemRate = 5.00;
    if (row.perDiemTier === "JW/PF/PM/SRSYS") perDiemRate = 100.00;
    else if (row.perDiemTier === "PLC/AUTO TECH") perDiemRate = 50.00;
    
    const perDiem = Number(row.numberOfDays || 0) * perDiemRate;
    return { regLaborIncome, otLaborIncome, travelTime, perDiem };
  };

  const laborGridWithMath = laborGrid.map((row) => {
    const math = calculateLaborRow(row);
    return {
      ...row,
      ...math,
      totalRowCharge: math.regLaborIncome + math.otLaborIncome + math.travelTime + math.perDiem
    };
  });

  const laborTotals = laborGridWithMath.reduce(
    (totals, row) => {
      totals.regularHours += Number(row.regularHours || 0);
      totals.overtimeHours += Number(row.overtimeHours || 0);
      totals.travelHours += Number(row.travelHours || 0);
      totals.numberOfDays += Number(row.numberOfDays || 0);
      totals.regLaborIncome += row.regLaborIncome;
      totals.otLaborIncome += row.otLaborIncome;
      totals.travelTime += row.travelTime;
      totals.perDiem += row.perDiem;
      totals.totalLaborCharge += row.totalRowCharge;
      return totals;
    },
    { regularHours: 0, overtimeHours: 0, travelHours: 0, numberOfDays: 0, regLaborIncome: 0, otLaborIncome: 0, travelTime: 0, perDiem: 0, totalLaborCharge: 0 }
  );

  // Labor metrics
  const totalLaborHoursBilled = laborTotals.regularHours + laborTotals.overtimeHours;
  const projectLengthWeeks = (Number(projectLengthDays || 0) / 5).toFixed(2);
  const totalManWeeks = (Number(totalLaborHoursBilled) / (Number(manHoursPerDay || 8) * 5)).toFixed(2);
  const manHoursPerWeek = Number(manHoursPerDay || 8) * 5;

  // Equipment Sheet calculations
  const calculateOwnedEquipmentAmount = (item: OwnedEquipmentEntry) => {
    let rate = 0;
    if (item.timeType === "Hour") rate = item.rateHour;
    else if (item.timeType === "Day") rate = item.rateDay;
    else if (item.timeType === "Week") rate = item.rateWeek;
    else if (item.timeType === "Month") rate = item.rateMonth;
    else if (item.timeType === "Trip") rate = item.rateTrip;

    const baseAmount = Number(item.timeQty || 0) * rate;
    const deduct = baseAmount * (Number(item.deductPercent || 0) / 100);
    return { baseAmount, deduct, netAmount: baseAmount - deduct };
  };

  const calculateRentalEquipmentAmount = (item: RentalEquipmentEntry) => {
    let rate = 0;
    if (item.timeType === "Hour") rate = item.rateHour;
    else if (item.timeType === "Day") rate = item.rateDay;
    else if (item.timeType === "Week") rate = item.rateWeek;
    else if (item.timeType === "Month") rate = item.rateMonth;
    else if (item.timeType === "Trip") rate = item.rateTrip;

    const baseAmount = Number(item.timeQty || 0) * rate;
    const markup = baseAmount * (Number(item.markupPercent || 0) / 100);
    return { baseAmount, markup, netAmount: baseAmount + markup };
  };

  const companyOwnedEquipWithMath = companyOwnedEquipment.map((item) => {
    const math = calculateOwnedEquipmentAmount(item);
    return { ...item, ...math };
  });

  const rentalEquipWithMath = rentalEquipment.map((item) => {
    const math = calculateRentalEquipmentAmount(item);
    return { ...item, ...math };
  });

  const ownedEquipmentTotalAmount = companyOwnedEquipWithMath.reduce((sum, i) => sum + i.netAmount, 0);
  const rentalEquipmentTotalAmount = rentalEquipWithMath.reduce((sum, i) => sum + i.netAmount, 0);
  const equipmentGrandTotal = ownedEquipmentTotalAmount + rentalEquipmentTotalAmount;

  // Quotes Directory calculations
  const subcontractorQuotesWithMath = subQuotes.map((q) => {
    const markup = Number(q.amount || 0) * (Number(q.markupPercent || 0) / 100);
    return { ...q, markup, total: Number(q.amount || 0) + markup };
  });

  const subQuotesTotals = subcontractorQuotesWithMath.reduce(
    (acc, q) => {
      acc.subtotal += Number(q.amount || 0);
      acc.markup += q.markup;
      acc.total += q.total;
      return acc;
    },
    { subtotal: 0, markup: 0, total: 0 }
  );

  const materialQuotesWithMath = matQuotes.map((q) => {
    const markup = Number(q.amount || 0) * (Number(q.markupPercent || 0) / 100);
    return { ...q, markup, total: Number(q.amount || 0) + markup };
  });

  const matQuotesTotals = materialQuotesWithMath.reduce(
    (acc, q) => {
      acc.subtotal += Number(q.amount || 0);
      acc.markup += q.markup;
      acc.total += q.total;
      return acc;
    },
    { subtotal: 0, markup: 0, total: 0 }
  );

  // Material Summary calculations
  const matSummaryCommittedSubtotal = matQuotesTotals.total; // Material Quote Totals feed into Committed Subtotal
  const matSummaryCommoditySubtotal = totalMtoMaterialCostAllSheets;
  const matSummarySalesTax = matSummaryCommoditySubtotal * (Number(salesTaxRate || 0) / 100);
  const matSummaryMaterialMarkup = (matSummaryCommoditySubtotal + matSummarySalesTax) * (Number(materialMarkupRate || 0) / 100);
  const matSummaryGrandTotal = matSummaryCommittedSubtotal + matSummaryCommoditySubtotal + matSummarySalesTax + matSummaryMaterialMarkup;

  // Capsheet Final Calculations
  const capsheetLaborTotal = laborTotals.regLaborIncome + laborTotals.otLaborIncome;
  const capsheetSubcontractorMarkup = subQuotesTotals.subtotal * (Number(subcontractorMarkupRate || 0) / 100);
  const capsheetSubcontractorTotal = subQuotesTotals.subtotal + capsheetSubcontractorMarkup;
  
  const capsheetRunningTotalBeforePermits =
    capsheetLaborTotal +
    laborTotals.travelTime +
    laborTotals.perDiem +
    matSummaryGrandTotal +
    equipmentGrandTotal +
    Number(directJobExpense || 0) +
    capsheetSubcontractorTotal +
    Number(permitFee || 0);

  const capsheetGrossTaxTotal = capsheetRunningTotalBeforePermits * (Number(grossTaxReceiptsRate || 0) / 100);
  const capsheetTotalAfterGrossTax = capsheetRunningTotalBeforePermits + capsheetGrossTaxTotal;

  const capsheetPandPBondTotal = capsheetTotalAfterGrossTax * (Number(pAndPBondRate || 0) / 100);
  const capsheetFinalBid = capsheetTotalAfterGrossTax + capsheetPandPBondTotal;

  const capsheetPOHAmount = capsheetFinalBid * (Number(contractAllowablePOH || 0) / 100);
  const capsheetTotalIfAllowsPOH = capsheetFinalBid + capsheetPOHAmount;

  // Active sheet key list
  const sheetList = [
    { key: "Capsheet", name: "Cap Sheet", isMto: false },
    { key: "Labor", name: "Labor Sheet", isMto: false },
    { key: "MatSummary", name: "Material Summary", isMto: false },
    { key: "Equipment", name: "Equipment Sheet", isMto: false },
    { key: "SubQuotes", name: "Sub Quotes", isMto: false },
    { key: "MatQuotes", name: "Material Quotes", isMto: false },
    { key: "MTO1", name: mtoSheetNames[0] || "MTO1", isMto: true },
    { key: "MTO2", name: mtoSheetNames[1] || "MTO2", isMto: true },
    { key: "MTO3", name: mtoSheetNames[2] || "MTO3", isMto: true },
    { key: "MTO4", name: mtoSheetNames[3] || "MTO4", isMto: true },
    { key: "MTO5", name: mtoSheetNames[4] || "MTO5", isMto: true },
    { key: "MTO6", name: mtoSheetNames[5] || "MTO6", isMto: true },
    { key: "MTO7", name: mtoSheetNames[6] || "MTO7", isMto: true },
    { key: "MTO8", name: mtoSheetNames[7] || "MTO8", isMto: true },
    { key: "Catalog", name: "Materials Catalog", isMto: false }
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full text-slate-800 relative">
      {/* Sidebar Navigation - Excel Sidebar Style */}
      <div className="w-full xl:w-64 flex flex-col gap-4 shrink-0">
        {/* Project Selector */}
        <div className="glass-panel p-4 rounded-2xl border border-white/20 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="text-rose-900" size={20} />
            <span className="text-xs uppercase font-extrabold tracking-wider text-rose-900/60">Estimate Context</span>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
            className="input py-2 px-3 text-sm font-semibold text-slate-800 bg-white/70 focus:ring-rose-800/30"
          >
            <option value="">-- Select Active Bid --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-1">
            <button onClick={handleCreateProject} className="btn text-xs py-1.5 px-2 bg-white/60 text-rose-900 border-white hover:bg-white flex-1 font-bold">
              + New Estimate
            </button>
            {selectedProjectId && (
              <button
                onClick={handleSaveEstimate}
                disabled={isSaving}
                className="btn btn-primary text-xs py-1.5 px-2 flex items-center justify-center gap-1 font-bold"
              >
                <Save size={12} />
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>

        {/* Desktop Sidebar Tabs */}
        <div className="hidden xl:flex flex-col glass-panel p-3 rounded-2xl border border-white/20 divide-y divide-slate-100/50">
          <div className="pb-2 px-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Sheet Selector</div>
          <div className="flex flex-col gap-1 pt-2">
            {sheetList.map((sheet) => {
              const isActive = activeTab === sheet.key;
              const isMtoSheet = sheet.isMto;
              return (
                <button
                  key={sheet.key}
                  onClick={() => setActiveTab(sheet.key)}
                  className={`text-left px-3 py-2 text-xs rounded-xl font-bold flex justify-between items-center transition-all ${
                    isActive
                      ? "bg-rose-900 text-white shadow-md shadow-rose-900/20 translate-x-1"
                      : isMtoSheet
                      ? "bg-yellow-400/10 hover:bg-yellow-400/25 text-amber-900 border-l-[3px] border-yellow-400"
                      : "hover:bg-slate-100/80 text-slate-600 hover:text-slate-800"
                  }`}
                >
                  <span className="truncate pr-1">{sheet.name}</span>
                  {isMtoSheet && (
                    <span className="text-[10px] bg-yellow-400 text-amber-950 px-1 py-0.2 rounded font-sans font-extrabold">
                      Takeoff
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sheet Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {selectedProjectId ? (
          <>
            {/* Sheet view container */}
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/30 shadow-xl min-h-[500px]">
              
              {/* CAPSHEET VIEW */}
              {activeTab === "Capsheet" && (
                <div className="flex flex-col gap-6">
                  {/* Capsheet header */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4 flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-rose-900 flex items-center justify-center text-white font-black text-xs shadow-inner shadow-black/10">YES</div>
                        <div>
                          <h2 className="text-xl font-black text-rose-900 uppercase tracking-tight">YES LLC</h2>
                          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Electrical Service</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Master Estimating System</h3>
                      <p className="text-xs bg-rose-900/10 text-rose-950 font-bold px-2.5 py-0.5 rounded-full inline-block mt-1">Cap Sheet</p>
                    </div>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-100/50 p-4 rounded-2xl border border-slate-200/50">
                    <div>
                      <label className="label text-[10px] tracking-widest uppercase font-extrabold">Project Name</label>
                      <input
                        type="text"
                        className="input text-sm font-semibold bg-white/70"
                        value={projectInfo.project_name}
                        onChange={(e) => setProjectInfo({ ...projectInfo, project_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label text-[10px] tracking-widest uppercase font-extrabold">RFP Number</label>
                      <input
                        type="text"
                        className="input text-sm font-semibold bg-white/70"
                        value={projectInfo.rfp_number || ""}
                        onChange={(e) => setProjectInfo({ ...projectInfo, rfp_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label text-[10px] tracking-widest uppercase font-extrabold">Bid Due Date</label>
                      <input
                        type="date"
                        className="input text-sm font-semibold bg-white/70"
                        value={projectInfo.bid_due_date || ""}
                        onChange={(e) => setProjectInfo({ ...projectInfo, bid_due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Capsheet Calculations Grid */}
                  <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white/50 backdrop-blur shadow-sm">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-100/50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="px-6 py-3 w-1/2">Estimate Category</th>
                          <th className="px-6 py-3 text-right">Hours</th>
                          <th className="px-6 py-3 text-right">Rates / Markups</th>
                          <th className="px-6 py-3 text-right">Totals ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {/* Labor Section */}
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-rose-900">Regular Time Labor</td>
                          <td className="px-6 py-3.5 text-right font-mono">{laborTotals.regularHours.toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${laborTotals.regLaborIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-rose-900">Overtime Labor</td>
                          <td className="px-6 py-3.5 text-right font-mono">{laborTotals.overtimeHours.toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${laborTotals.otLaborIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="bg-rose-900/5 font-extrabold text-rose-950">
                          <td className="px-6 py-3.5 border-l-[6px] border-rose-900">Labor Subtotal</td>
                          <td className="px-6 py-3.5 text-right font-mono">{(laborTotals.regularHours + laborTotals.overtimeHours).toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-right font-mono">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${capsheetLaborTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-rose-900">Labor Travel (Drive Time)</td>
                          <td className="px-6 py-3.5 text-right font-mono">{laborTotals.travelHours.toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-right font-mono">${travelRatePerHour.toFixed(2)}/hr</td>
                          <td className="px-6 py-3.5 text-right font-mono">${laborTotals.travelTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-rose-900">Per Diem Total</td>
                          <td className="px-6 py-3.5 text-right font-mono">{laborTotals.numberOfDays} days</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${laborTotals.perDiem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        {/* Materials Section */}
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-emerald-800">Committed Materials Subtotal (Switchgear/Quotes)</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${matSummaryCommittedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-emerald-800">Commodity Takeoff Materials Subtotal</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${matSummaryCommoditySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-emerald-800">Sales Tax Amount</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right">
                            <input
                              type="number"
                              className="w-16 font-mono border rounded py-0.5 px-1 bg-yellow-400/20 text-right focus:outline-none focus:bg-white"
                              value={salesTaxRate}
                              onChange={(e) => setSalesTaxRate(parseFloat(e.target.value) || 0.0)}
                            /> %
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">${matSummarySalesTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-emerald-800">Material Markup Amount</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right">
                            <input
                              type="number"
                              className="w-16 font-mono border rounded py-0.5 px-1 bg-yellow-400/20 text-right focus:outline-none focus:bg-white"
                              value={materialMarkupRate}
                              onChange={(e) => setMaterialMarkupRate(parseFloat(e.target.value) || 0.0)}
                            /> %
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">${matSummaryMaterialMarkup.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="bg-emerald-900/5 font-extrabold text-emerald-950">
                          <td className="px-6 py-3.5 border-l-[6px] border-emerald-800">Material Total</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${matSummaryGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        {/* Equipment Section */}
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-indigo-800">Equipment Bid Total (Owned + Rental)</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${equipmentGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        {/* DJE Section */}
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-orange-800">Direct Job Expense (DJE)</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right">
                            <input
                              type="number"
                              className="w-24 font-mono border rounded py-0.5 px-1 bg-white focus:outline-none text-right font-bold"
                              value={directJobExpense}
                              onChange={(e) => setDirectJobExpense(parseFloat(e.target.value) || 0.0)}
                            />
                          </td>
                        </tr>

                        {/* Subcontractor Section */}
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-cyan-800">Subcontractor Quote Bid Subtotal</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${subQuotesTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-cyan-800">Subcontractor Markup</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right">
                            <input
                              type="number"
                              className="w-16 font-mono border rounded py-0.5 px-1 bg-yellow-400/20 text-right focus:outline-none focus:bg-white"
                              value={subcontractorMarkupRate}
                              onChange={(e) => setSubcontractorMarkupRate(parseFloat(e.target.value) || 0.0)}
                            /> %
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">${capsheetSubcontractorMarkup.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        {/* Permits & Totals */}
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-violet-800 font-extrabold">Electrical Permit Fee</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right">
                            <input
                              type="number"
                              className="w-24 font-mono border rounded py-0.5 px-1 bg-white focus:outline-none text-right font-bold"
                              value={permitFee}
                              onChange={(e) => setPermitFee(parseFloat(e.target.value) || 0.0)}
                            />
                          </td>
                        </tr>

                        <tr className="bg-slate-100 border-t border-b font-extrabold text-slate-800">
                          <td className="px-6 py-3.5 pl-8">Estimated Subtotal (Before Gross Tax)</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${capsheetRunningTotalBeforePermits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-slate-500">Gross Receipts Tax (MT)</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right">
                            <input
                              type="number"
                              className="w-16 font-mono border rounded py-0.5 px-1 bg-white text-right focus:outline-none"
                              value={grossTaxReceiptsRate}
                              onChange={(e) => setGrossTaxReceiptsRate(parseFloat(e.target.value) || 0.0)}
                            /> %
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">${capsheetGrossTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-slate-500 font-extrabold">P&P Bond Fee</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">
                            <input
                              type="number"
                              className="w-16 font-mono border rounded py-0.5 px-1 bg-white text-right focus:outline-none"
                              value={pAndPBondRate}
                              placeholder="0"
                              onChange={(e) => setPAndPBondRate(parseFloat(e.target.value) || 0.0)}
                            /> %
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">${capsheetPandPBondTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        {/* FINAL BID (High prominence yellow highlighted) */}
                        <tr className="bg-yellow-400 text-slate-900 text-lg font-black border-t-2 border-slate-400">
                          <td className="px-6 py-4">FINAL BID</td>
                          <td className="px-6 py-4 text-right text-slate-900/60">—</td>
                          <td className="px-6 py-4 text-right text-slate-900/60">—</td>
                          <td className="px-6 py-4 text-right font-mono">${capsheetFinalBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        {/* POH Allowable Contract Overrides */}
                        <tr>
                          <td className="px-6 py-3.5 pl-8 border-l-[4px] border-amber-600">Contract Allowable P&OH</td>
                          <td className="px-6 py-3.5 text-right text-slate-400">—</td>
                          <td className="px-6 py-3.5 text-right">
                            <input
                              type="number"
                              className="w-16 font-mono border rounded py-0.5 px-1 bg-yellow-400/20 text-right focus:outline-none focus:bg-white"
                              value={contractAllowablePOH}
                              onChange={(e) => setContractAllowablePOH(parseFloat(e.target.value) || 0.0)}
                            /> %
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">${capsheetPOHAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>

                        <tr className="bg-yellow-400 text-slate-900 font-black border-t border-slate-300">
                          <td className="px-6 py-3.5 pl-8">TOTAL IF CONTRACT ALLOWS P & OH</td>
                          <td className="px-6 py-3.5 text-right text-slate-900/60">—</td>
                          <td className="px-6 py-3.5 text-right text-slate-900/60">—</td>
                          <td className="px-6 py-3.5 text-right font-mono">${capsheetTotalIfAllowsPOH.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleSaveEstimate}
                      disabled={isSaving}
                      className="btn btn-primary shadow-lg hover:shadow-xl py-2.5 px-6 font-extrabold flex items-center gap-2"
                    >
                      <Save size={18} />
                      {isSaving ? "Saving Estimate..." : "Save Estimating Sheets"}
                    </button>
                  </div>
                </div>
              )}

              {/* LABOR VIEW */}
              {activeTab === "Labor" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-black text-rose-900">Project Crew Mix & Labor Hours Grid</h3>
                    <p className="text-slate-500 text-xs mt-1">Configure your worker schedules, per diem tiers, and labor billing charges override.</p>
                  </div>

                  {/* Left Metric blocks */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-100/50 p-4 rounded-2xl border border-slate-200/50">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-extrabold tracking-wider">Project Length (Days)</span>
                      <input
                        type="number"
                        className="w-full border rounded font-mono text-sm py-1 px-2 mt-1 bg-yellow-400/20 text-slate-800 font-bold focus:bg-white focus:outline-none"
                        value={projectLengthDays}
                        onChange={(e) => setProjectLengthDays(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-extrabold tracking-wider">Project Length (Weeks)</span>
                      <span className="text-lg font-black font-mono block mt-2 text-slate-700">{projectLengthWeeks}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-extrabold tracking-wider">Total Man Hours</span>
                      <span className="text-lg font-black font-mono block mt-2 text-rose-900 bg-yellow-400/25 px-2 py-0.5 rounded-md inline-block">{totalLaborHoursBilled.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-extrabold tracking-wider">Man Hours Per Day</span>
                      <input
                        type="number"
                        className="w-full border rounded font-mono text-sm py-1 px-2 mt-1 bg-yellow-400/20 text-slate-800 font-bold focus:bg-white focus:outline-none"
                        value={manHoursPerDay}
                        onChange={(e) => setManHoursPerDay(parseFloat(e.target.value) || 0.0)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-extrabold tracking-wider">Total Man Weeks</span>
                      <span className="text-lg font-black font-mono block mt-2 text-slate-700">{totalManWeeks}</span>
                    </div>
                  </div>

                  {/* Top sub grid: NECA Summary & travel setup */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* NECA discount details */}
                    <div className="lg:col-span-2 border border-slate-200/50 p-5 rounded-2xl bg-white/50 backdrop-blur flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase font-extrabold tracking-wider text-rose-900">NECA Hours Catalog Summary</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase">NECA Discount</span>
                          <div className="flex items-center border rounded px-1.5 py-0.5 bg-yellow-400/20">
                            <input
                              type="number"
                              className="w-10 text-right bg-transparent focus:outline-none font-mono font-bold text-xs"
                              value={necaDiscountRate}
                              onChange={(e) => setNecaDiscountRate(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-[10px] font-bold text-amber-950 ml-0.5">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-xs text-left border-collapse bg-white">
                          <thead className="bg-slate-50 border-b text-[9px] font-black uppercase text-slate-500 tracking-wider">
                            <tr>
                              <th className="px-3 py-2">MTO Takeoff Sheet</th>
                              <th className="px-3 py-2 text-right">NECA Hours</th>
                              <th className="px-3 py-2 text-right">Labor Discounted Hours</th>
                              <th className="px-3 py-2 text-right">% of Project</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-bold text-slate-600 font-mono">
                            {mtoTotalsList.map((item) => {
                              const discHours = item.hours * (necaDiscountRate / 100);
                              const projectPct = totalNecaHoursAllSheets > 0 ? (item.hours / totalNecaHoursAllSheets) * 100 : 0;
                              return (
                                <tr key={item.key} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 text-slate-800 font-sans">{item.title}</td>
                                  <td className="px-3 py-2 text-right">{item.hours.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-rose-900">{discHours.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-slate-400">{projectPct.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-100/50 font-extrabold text-slate-800 text-[13px] border-t">
                              <td className="px-3 py-2 font-sans text-xs">Total Estimated Hours</td>
                              <td className="px-3 py-2 text-right">{totalNecaHoursAllSheets.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-rose-900">{(totalNecaHoursAllSheets * (necaDiscountRate / 100)).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-slate-400">100.0%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Travel setup & per diem setup */}
                    <div className="border border-slate-200/50 p-5 rounded-2xl bg-white/50 backdrop-blur flex flex-col gap-4">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-rose-900 block border-b pb-2">Travel & Per Diem Parameters</span>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-600 font-bold">Travel Rate / Hour</span>
                          <div className="flex items-center border rounded py-1 px-2 bg-yellow-400/20 shadow-inner">
                            <span className="text-amber-950 font-extrabold text-xs mr-1">$</span>
                            <input
                              type="number"
                              className="w-16 text-right bg-transparent focus:outline-none font-mono font-bold text-sm text-slate-800"
                              value={travelRatePerHour}
                              onChange={(e) => setTravelRatePerHour(parseFloat(e.target.value) || 0.0)}
                            />
                          </div>
                        </div>

                        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-1 border-t pt-2">Per Diem Rates Setup</div>
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">JW / PM / Foreman</span>
                          <span className="font-mono font-bold text-slate-800">$100.00 / day</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">PLC / Auto Tech</span>
                          <span className="font-mono font-bold text-slate-800">$50.00 / day</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">Apprentice / Service</span>
                          <span className="font-mono font-bold text-slate-800">$5.00 / day</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Labor Grid */}
                  <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100/50 border-b text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="px-4 py-3 min-w-[200px]">Rate Charge Tier (Crew Mix)</th>
                          <th className="px-4 py-3 text-right bg-yellow-400/10">Travel Hrs</th>
                          <th className="px-4 py-3 text-right bg-yellow-400/10">No. of Days</th>
                          <th className="px-4 py-3 text-right bg-yellow-400/10">Reg Hours</th>
                          <th className="px-4 py-3 text-right bg-yellow-400/10">OT Hours</th>
                          <th className="px-4 py-3 text-right">Labor Charge</th>
                          <th className="px-4 py-3 text-right">Reg Income</th>
                          <th className="px-4 py-3 text-right">OT Income</th>
                          <th className="px-4 py-3 text-right">Travel Time</th>
                          <th className="px-4 py-3 text-right">Per Diem</th>
                          <th className="px-4 py-3 text-right font-extrabold">Total Charge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700 font-mono">
                        {laborGridWithMath.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-sans text-xs text-slate-800 font-semibold">{row.position_name}</td>
                            
                            {/* Input cells (Yellow background columns) */}
                            <td className="px-3 py-2 bg-yellow-400/5">
                              <input
                                type="number"
                                className="w-14 text-right bg-transparent focus:outline-none focus:bg-white border-b border-transparent focus:border-slate-300 font-mono font-semibold"
                                value={row.travelHours}
                                onChange={(e) => {
                                  const updated = [...laborGrid];
                                  updated[idx].travelHours = parseFloat(e.target.value) || 0.0;
                                  setLaborGrid(updated);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 bg-yellow-400/5">
                              <input
                                type="number"
                                className="w-14 text-right bg-transparent focus:outline-none focus:bg-white border-b border-transparent focus:border-slate-300 font-mono font-semibold"
                                value={row.numberOfDays}
                                onChange={(e) => {
                                  const updated = [...laborGrid];
                                  updated[idx].numberOfDays = parseInt(e.target.value) || 0;
                                  setLaborGrid(updated);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 bg-yellow-400/5">
                              <input
                                type="number"
                                className="w-14 text-right bg-transparent focus:outline-none focus:bg-white border-b border-transparent focus:border-slate-300 font-mono font-semibold"
                                value={row.regularHours}
                                onChange={(e) => {
                                  const updated = [...laborGrid];
                                  updated[idx].regularHours = parseFloat(e.target.value) || 0.0;
                                  setLaborGrid(updated);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 bg-yellow-400/5">
                              <input
                                type="number"
                                className="w-14 text-right bg-transparent focus:outline-none focus:bg-white border-b border-transparent focus:border-slate-300 font-mono font-semibold"
                                value={row.overtimeHours}
                                onChange={(e) => {
                                  const updated = [...laborGrid];
                                  updated[idx].overtimeHours = parseFloat(e.target.value) || 0.0;
                                  setLaborGrid(updated);
                                }}
                              />
                            </td>
                            
                            {/* Hourly rate input */}
                            <td className="px-4 py-2.5 text-right font-medium">
                              <input
                                type="number"
                                className="w-16 text-right bg-transparent focus:outline-none focus:bg-white border-b border-transparent focus:border-slate-300"
                                value={row.hourly_rate}
                                onChange={(e) => {
                                  const updated = [...laborGrid];
                                  updated[idx].hourly_rate = parseFloat(e.target.value) || 0.0;
                                  setLaborGrid(updated);
                                }}
                              />
                            </td>

                            {/* Mathematical outputs */}
                            <td className="px-4 py-2.5 text-right text-slate-500 font-normal">${row.regLaborIncome.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500 font-normal">${row.otLaborIncome.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500 font-normal">${row.travelTime.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500 font-normal">${row.perDiem.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-rose-900">${row.totalRowCharge.toFixed(2)}</td>
                          </tr>
                        ))}
                        
                        {/* Summary totals row */}
                        <tr className="bg-slate-100 font-black text-slate-900 border-t border-b text-[13px]">
                          <td className="px-4 py-3 font-sans text-xs">Total Crew Mix Bids</td>
                          <td className="px-3 py-2 text-right bg-yellow-400/5">{laborTotals.travelHours.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right bg-yellow-400/5">{laborTotals.numberOfDays}</td>
                          <td className="px-3 py-2 text-right bg-yellow-400/5">{laborTotals.regularHours.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right bg-yellow-400/5">{laborTotals.overtimeHours.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-slate-400">—</td>
                          <td className="px-4 py-3 text-right">${laborTotals.regLaborIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">${laborTotals.otLaborIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">${laborTotals.travelTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">${laborTotals.perDiem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-rose-900">${laborTotals.totalLaborCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MATERIAL SUMMARY VIEW */}
              {activeTab === "MatSummary" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-black text-emerald-900">Project Materials Takeoff Summary</h3>
                    <p className="text-slate-500 text-xs mt-1">Consolidates switchgear quotes with bulk material lists aggregated from MTO1–MTO8 takeoff worksheets.</p>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-100/50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Worksheet Name</th>
                          <th className="px-6 py-3 text-right">NECA Labor Hours</th>
                          <th className="px-6 py-3 text-right">Material Takeoff Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {mtoTotalsList.map((item) => (
                          <tr key={item.key} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3.5 pl-8 border-l-[4px] border-emerald-800">{item.title}</td>
                            <td className="px-6 py-3.5 text-right font-mono">{item.hours.toFixed(2)}</td>
                            <td className="px-6 py-3.5 text-right font-mono">${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t border-b">
                          <td className="px-6 py-3.5">Material Sheets Aggregated Total</td>
                          <td className="px-6 py-3.5 text-right font-mono text-emerald-900">{totalNecaHoursAllSheets.toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-right font-mono text-emerald-900">${totalMtoMaterialCostAllSheets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations breakdown card */}
                  <div className="border border-slate-200 p-5 rounded-2xl bg-white/50 backdrop-blur w-full max-w-md ml-auto flex flex-col gap-3 font-semibold text-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span>Committed (Material Quotes)</span>
                      <span className="font-mono">${matSummaryCommittedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Commodity Subtotal</span>
                      <span className="font-mono">${matSummaryCommoditySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Sales Tax ({salesTaxRate.toFixed(2)}%)</span>
                      <span className="font-mono">${matSummarySalesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Material Markup ({materialMarkupRate.toFixed(2)}%)</span>
                      <span className="font-mono">${matSummaryMaterialMarkup.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-base font-black border-t border-slate-200 pt-2 text-emerald-950">
                      <span>Total Material Bid</span>
                      <span className="font-mono">${matSummaryGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EQUIPMENT VIEW */}
              {activeTab === "Equipment" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h3 className="text-xl font-black text-indigo-900">Equipment Logistics & Rates Audits</h3>
                      <p className="text-slate-500 text-xs mt-1">Audit company owned heavy equipment or list rental configurations with custom markup factors.</p>
                    </div>
                    <div className="bg-indigo-900 text-white p-4 rounded-2xl flex flex-col gap-1 items-end min-w-[150px] shadow-md shadow-indigo-900/10">
                      <span className="text-[10px] uppercase font-bold text-indigo-200">Equipment Bid</span>
                      <span className="text-xl font-black font-mono">${equipmentGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Company owned equipment */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-900">1. Company Owned Equipment Catalog</span>
                    
                    <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white max-h-[300px] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100/50 border-b text-[9px] font-black uppercase text-slate-500 tracking-wider sticky top-0 bg-slate-50 z-10">
                          <tr>
                            <th className="px-4 py-2.5">Owned Equipment Item</th>
                            <th className="px-4 py-2.5 text-right">Rates (Hr / Day / Wk / Mo / Trip)</th>
                            <th className="px-4 py-2.5 text-center w-28 bg-yellow-400/5">Time Type</th>
                            <th className="px-4 py-2.5 text-right w-24 bg-yellow-400/5">Qty</th>
                            <th className="px-4 py-2.5 text-right">Base Amt</th>
                            <th className="px-4 py-2.5 text-center w-28">Deduct %</th>
                            <th className="px-4 py-2.5 text-right font-extrabold">Net Bid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700 font-mono">
                          {companyOwnedEquipWithMath.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-sans text-xs text-slate-800 font-semibold">{item.equipmentName}</td>
                              <td className="px-4 py-2 text-right text-slate-500 font-normal">
                                {item.rateHour > 0 && `H: $${item.rateHour} `}
                                {item.rateDay > 0 && `D: $${item.rateDay} `}
                                {item.rateWeek > 0 && `W: $${item.rateWeek} `}
                                {item.rateMonth > 0 && `M: $${item.rateMonth} `}
                                {item.rateTrip > 0 && `T: $${item.rateTrip} `}
                              </td>
                              
                              {/* Inputs */}
                              <td className="px-3 py-1 bg-yellow-400/5 text-center">
                                <select
                                  value={item.timeType}
                                  onChange={(e) => {
                                    const updated = [...companyOwnedEquipment];
                                    updated[idx].timeType = e.target.value as any;
                                    setCompanyOwnedEquipment(updated);
                                  }}
                                  className="text-xs border rounded p-0.5 focus:outline-none"
                                >
                                  <option value="Hour">Hour</option>
                                  <option value="Day">Day</option>
                                  <option value="Week">Week</option>
                                  <option value="Month">Month</option>
                                  <option value="Trip">Trip</option>
                                </select>
                              </td>
                              <td className="px-3 py-1 bg-yellow-400/5">
                                <input
                                  type="number"
                                  className="w-16 text-right bg-transparent focus:outline-none focus:bg-white border-b border-transparent focus:border-slate-300 text-xs font-semibold"
                                  value={item.timeQty}
                                  onChange={(e) => {
                                    const updated = [...companyOwnedEquipment];
                                    updated[idx].timeQty = parseFloat(e.target.value) || 0.0;
                                    setCompanyOwnedEquipment(updated);
                                  }}
                                />
                              </td>
                              
                              <td className="px-4 py-2 text-right text-slate-500 font-normal">${item.baseAmount.toFixed(2)}</td>
                              
                              {/* Deduct Dropdown */}
                              <td className="px-3 py-1 text-center">
                                <select
                                  value={item.deductPercent}
                                  onChange={(e) => {
                                    const updated = [...companyOwnedEquipment];
                                    updated[idx].deductPercent = parseFloat(e.target.value) || 0;
                                    setCompanyOwnedEquipment(updated);
                                  }}
                                  className="text-xs border rounded p-0.5 focus:outline-none bg-yellow-400/10"
                                >
                                  <option value="0">0%</option>
                                  <option value="10">10%</option>
                                  <option value="15">15%</option>
                                  <option value="20">20%</option>
                                </select>
                              </td>
                              
                              <td className="px-4 py-2 text-right font-extrabold text-indigo-900">${item.netAmount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rental equipment */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-900">2. Rental Equipment Subcontracting</span>
                      <button
                        onClick={() => {
                          const newRow: RentalEquipmentEntry = { equipmentName: "Custom Rental Item", rateHour: 0, rateDay: 0, rateWeek: 0, rateMonth: 0, rateTrip: 0, timeType: "Day", timeQty: 0, markupPercent: 10 };
                          setRentalEquipment([...rentalEquipment, newRow]);
                        }}
                        className="btn py-1 px-3 text-xs bg-indigo-50 border-indigo-200 text-indigo-900 font-bold flex items-center gap-1"
                      >
                        <PlusCircle size={14} /> Add Rental Equipment
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white max-h-[250px] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100/50 border-b text-[9px] font-black uppercase text-slate-500 tracking-wider sticky top-0 bg-slate-50 z-10">
                          <tr>
                            <th className="px-4 py-2.5">Rental Equipment Item Description</th>
                            <th className="px-4 py-2.5 text-right w-36">Default Day Rate ($)</th>
                            <th className="px-4 py-2.5 text-center w-28 bg-yellow-400/5">Time Type</th>
                            <th className="px-4 py-2.5 text-right w-24 bg-yellow-400/5">Qty</th>
                            <th className="px-4 py-2.5 text-right">Base Amt</th>
                            <th className="px-4 py-2.5 text-center w-28">Markup %</th>
                            <th className="px-4 py-2.5 text-right font-extrabold">Net Bid</th>
                            <th className="px-4 py-2.5 text-center w-12">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700 font-mono">
                          {rentalEquipment.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold font-sans">
                                No rental items added. Click "Add Rental Equipment" to build subcontractor rentals list.
                              </td>
                            </tr>
                          ) : (
                            rentalEquipWithMath.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2 font-sans text-xs">
                                  <input
                                    type="text"
                                    className="w-full bg-transparent font-medium border-b border-transparent focus:border-slate-300 py-0.5 focus:outline-none"
                                    value={item.equipmentName}
                                    onChange={(e) => {
                                      const updated = [...rentalEquipment];
                                      updated[idx].equipmentName = e.target.value;
                                      setRentalEquipment(updated);
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <input
                                    type="number"
                                    className="w-20 text-right bg-transparent border-b border-transparent focus:border-slate-300 py-0.5 focus:outline-none"
                                    value={item.rateDay}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0.0;
                                      const updated = [...rentalEquipment];
                                      updated[idx].rateDay = val;
                                      // Mirror to others to keep simple calculations
                                      updated[idx].rateHour = val / 8;
                                      updated[idx].rateWeek = val * 5;
                                      updated[idx].rateMonth = val * 20;
                                      setRentalEquipment(updated);
                                    }}
                                  />
                                </td>
                                
                                <td className="px-3 py-1 bg-yellow-400/5 text-center">
                                  <select
                                    value={item.timeType}
                                    onChange={(e) => {
                                      const updated = [...rentalEquipment];
                                      updated[idx].timeType = e.target.value as any;
                                      setRentalEquipment(updated);
                                    }}
                                    className="text-xs border rounded p-0.5 focus:outline-none"
                                  >
                                    <option value="Hour">Hour</option>
                                    <option value="Day">Day</option>
                                    <option value="Week">Week</option>
                                    <option value="Month">Month</option>
                                    <option value="Trip">Trip</option>
                                  </select>
                                </td>
                                <td className="px-3 py-1 bg-yellow-400/5">
                                  <input
                                    type="number"
                                    className="w-16 text-right bg-transparent focus:outline-none focus:bg-white border-b border-transparent focus:border-slate-300 text-xs font-semibold"
                                    value={item.timeQty}
                                    onChange={(e) => {
                                      const updated = [...rentalEquipment];
                                      updated[idx].timeQty = parseFloat(e.target.value) || 0.0;
                                      setRentalEquipment(updated);
                                    }}
                                  />
                                </td>
                                
                                <td className="px-4 py-2 text-right text-slate-500 font-normal">${item.baseAmount.toFixed(2)}</td>
                                
                                <td className="px-3 py-1 text-center">
                                  <select
                                    value={item.markupPercent}
                                    onChange={(e) => {
                                      const updated = [...rentalEquipment];
                                      updated[idx].markupPercent = parseFloat(e.target.value) || 0;
                                      setRentalEquipment(updated);
                                    }}
                                    className="text-xs border rounded p-0.5 focus:outline-none bg-yellow-400/10"
                                  >
                                    <option value="0">0%</option>
                                    <option value="10">10%</option>
                                    <option value="15">15%</option>
                                    <option value="20">20%</option>
                                  </select>
                                </td>
                                
                                <td className="px-4 py-2 text-right font-extrabold text-indigo-900">${item.netAmount.toFixed(2)}</td>
                                <td className="px-4 py-2 text-center">
                                  <button
                                    onClick={() => {
                                      setRentalEquipment(rentalEquipment.filter((_, i) => i !== idx));
                                    }}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBQUOTES VIEW */}
              {activeTab === "SubQuotes" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b pb-4 flex-wrap gap-4">
                    <div>
                      <h3 className="text-xl font-black text-cyan-900">Subcontractor Quotes Directory</h3>
                      <p className="text-slate-500 text-xs mt-1">Audit bids submitted by external specialty subcontractors (civil work, engineering, mechanical).</p>
                    </div>
                    <button
                      onClick={() => {
                        const newQ = { name: "Custom Subcontractor Name", amount: 0, markupPercent: 10 };
                        setSubQuotes([...subQuotes, newQ]);
                      }}
                      className="btn py-2 px-4 bg-cyan-50 border-cyan-200 text-cyan-900 font-bold flex items-center gap-1.5"
                    >
                      <PlusCircle size={16} /> Add Subcontractor Quote
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-100/50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Subcontractor Business / Bid Description</th>
                          <th className="px-6 py-3 text-right bg-yellow-400/5">Quote Amount ($)</th>
                          <th className="px-6 py-3 text-center">Markup Option</th>
                          <th className="px-6 py-3 text-right">Markup Amount</th>
                          <th className="px-6 py-3 text-right font-extrabold">Subcontractor Total</th>
                          <th className="px-6 py-3 text-center w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700 font-mono">
                        {subQuotes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-semibold font-sans">
                              No subcontractor bids recorded. Click "Add Subcontractor Quote" to record quote scopes.
                            </td>
                          </tr>
                        ) : (
                          subcontractorQuotesWithMath.map((q, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 font-sans text-xs">
                                <input
                                  type="text"
                                  className="w-full bg-transparent border-b border-transparent focus:border-slate-300 py-0.5 focus:outline-none font-semibold text-slate-800"
                                  value={q.name}
                                  onChange={(e) => {
                                    const updated = [...subQuotes];
                                    updated[idx].name = e.target.value;
                                    setSubQuotes(updated);
                                  }}
                                />
                              </td>
                              <td className="px-6 py-3 bg-yellow-400/5">
                                <input
                                  type="number"
                                  className="w-28 text-right bg-transparent border-b border-transparent focus:border-slate-300 py-0.5 focus:outline-none"
                                  value={q.amount}
                                  onChange={(e) => {
                                    const updated = [...subQuotes];
                                    updated[idx].amount = parseFloat(e.target.value) || 0.0;
                                    setSubQuotes(updated);
                                  }}
                                />
                              </td>
                              <td className="px-6 py-3 text-center">
                                <select
                                  value={q.markupPercent}
                                  onChange={(e) => {
                                    const updated = [...subQuotes];
                                    updated[idx].markupPercent = parseFloat(e.target.value) || 0;
                                    setSubQuotes(updated);
                                  }}
                                  className="text-xs border rounded p-0.5 focus:outline-none bg-yellow-400/10"
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="10">10%</option>
                                  <option value="15">15%</option>
                                  <option value="20">20%</option>
                                </select>
                              </td>
                              <td className="px-6 py-3 text-right text-slate-500 font-normal">${q.markup.toFixed(2)}</td>
                              <td className="px-6 py-3 text-right font-extrabold text-cyan-900">${q.total.toFixed(2)}</td>
                              <td className="px-6 py-3 text-center">
                                <button
                                  onClick={() => {
                                    setSubQuotes(subQuotes.filter((_, i) => i !== idx));
                                  }}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                        <tr className="bg-slate-100/50 font-black text-slate-900 border-t border-b text-[13px]">
                          <td className="px-6 py-3 font-sans text-xs">Total Subcontractor Estimates</td>
                          <td className="px-6 py-3 text-right bg-yellow-400/5">${subQuotesTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-center text-slate-400">—</td>
                          <td className="px-6 py-3 text-right">${subQuotesTotals.markup.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right text-cyan-900">${subQuotesTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-center text-slate-400">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MATERIAL QUOTES VIEW */}
              {activeTab === "MatQuotes" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b pb-4 flex-wrap gap-4">
                    <div>
                      <h3 className="text-xl font-black text-indigo-950">Vendor Specialty Material Packages</h3>
                      <p className="text-slate-500 text-xs mt-1">Manage vendor quotes for large equipment listings like switchgears, transformers, PLC panels, and specialized field devices.</p>
                    </div>
                    <button
                      onClick={() => {
                        const newQ = { name: "Custom Vendor Name", amount: 0, markupPercent: 27 };
                        setMatQuotes([...matQuotes, newQ]);
                      }}
                      className="btn py-2 px-4 bg-indigo-50 border-indigo-200 text-indigo-950 font-bold flex items-center gap-1.5"
                    >
                      <PlusCircle size={16} /> Add Material Quote
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-100/50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th className="px-6 py-3">Vendor / Material Specification</th>
                          <th className="px-6 py-3 text-right bg-yellow-400/5">Quote Amount ($)</th>
                          <th className="px-6 py-3 text-center">Markup Option</th>
                          <th className="px-6 py-3 text-right">Markup Amount</th>
                          <th className="px-6 py-3 text-right font-extrabold">Material Total</th>
                          <th className="px-6 py-3 text-center w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700 font-mono">
                        {matQuotes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-semibold font-sans">
                              No specialty material packages recorded. Click "Add Material Quote" to document Switchgear/Transformer bids.
                            </td>
                          </tr>
                        ) : (
                          materialQuotesWithMath.map((q, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 font-sans text-xs">
                                <input
                                  type="text"
                                  className="w-full bg-transparent border-b border-transparent focus:border-slate-300 py-0.5 focus:outline-none font-semibold text-slate-800"
                                  value={q.name}
                                  onChange={(e) => {
                                    const updated = [...matQuotes];
                                    updated[idx].name = e.target.value;
                                    setMatQuotes(updated);
                                  }}
                                />
                              </td>
                              <td className="px-6 py-3 bg-yellow-400/5">
                                <input
                                  type="number"
                                  className="w-28 text-right bg-transparent border-b border-transparent focus:border-slate-300 py-0.5 focus:outline-none"
                                  value={q.amount}
                                  onChange={(e) => {
                                    const updated = [...matQuotes];
                                    updated[idx].amount = parseFloat(e.target.value) || 0.0;
                                    setMatQuotes(updated);
                                  }}
                                />
                              </td>
                              <td className="px-6 py-3 text-center">
                                <select
                                  value={q.markupPercent}
                                  onChange={(e) => {
                                    const updated = [...matQuotes];
                                    updated[idx].markupPercent = parseFloat(e.target.value) || 0;
                                    setMatQuotes(updated);
                                  }}
                                  className="text-xs border rounded p-0.5 focus:outline-none bg-yellow-400/10"
                                >
                                  <option value="0">0%</option>
                                  <option value="15">15%</option>
                                  <option value="20">20%</option>
                                  <option value="27">27%</option>
                                  <option value="30">30%</option>
                                </select>
                              </td>
                              <td className="px-6 py-3 text-right text-slate-500 font-normal">${q.markup.toFixed(2)}</td>
                              <td className="px-6 py-3 text-right font-extrabold text-indigo-950">${q.total.toFixed(2)}</td>
                              <td className="px-6 py-3 text-center">
                                <button
                                  onClick={() => {
                                    setMatQuotes(matQuotes.filter((_, i) => i !== idx));
                                  }}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                        <tr className="bg-slate-100/50 font-black text-slate-900 border-t border-b text-[13px]">
                          <td className="px-6 py-3 font-sans text-xs">Total Switchgear & Materials Quote Bids</td>
                          <td className="px-6 py-3 text-right bg-yellow-400/5">${matQuotesTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-center text-slate-400">—</td>
                          <td className="px-6 py-3 text-right">${matQuotesTotals.markup.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-right text-indigo-950">${matQuotesTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-center text-slate-400">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MTO1 - MTO8 TAKEOFF VIEWS */}
              {activeTab.startsWith("MTO") && (
                <div className="flex flex-col gap-6">
                  {/* Worksheet rename toolbar */}
                  <div className="flex justify-between items-center border-b pb-4 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <Layers className="text-amber-800" size={24} />
                      <div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="text-xl font-black text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-rose-900 py-0.5 focus:outline-none"
                            value={mtoSheetNames[parseInt(activeTab.replace("MTO", "")) - 1] || activeTab}
                            onChange={(e) => {
                              const idx = parseInt(activeTab.replace("MTO", "")) - 1;
                              const updated = [...mtoSheetNames];
                              updated[idx] = e.target.value;
                              setMtoSheetNames(updated);
                            }}
                          />
                          <span className="text-[10px] bg-yellow-400 text-amber-950 px-2 py-0.5 rounded font-black font-sans uppercase">Active Sheet</span>
                        </div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-1">Master Estimating System / Material Takeoff Sheet</p>
                      </div>
                    </div>

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
                        className="btn py-2 px-3 text-xs bg-rose-50 border-rose-200 text-rose-900 font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Upload size={14} />
                        {isUploading ? "Extracting symbol counts..." : "Blueprint Vision OCR Takeoff"}
                      </button>
                      <button
                        onClick={() => exportMtoCSV(activeTab)}
                        className="btn py-2 px-3 text-xs bg-slate-50 border-slate-200 text-slate-700 font-bold flex items-center gap-1"
                      >
                        <Download size={14} /> Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Takeoff Grid */}
                  <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100/50 border-b text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        <tr>
                          <th colSpan={3} className="px-4 py-2 border-r">Material Specifications</th>
                          <th colSpan={2} className="px-4 py-2 border-r text-center">NECA Labor Setup</th>
                          <th colSpan={4} className="px-4 py-2 text-center">Vendor Material Unit Costs</th>
                        </tr>
                        <tr className="bg-slate-100/30">
                          <th className="px-4 py-2.5">Item Code / Part #</th>
                          <th className="px-4 py-2.5">Material Description</th>
                          <th className="px-4 py-2.5 text-right w-24 bg-yellow-400/5">Quantity</th>
                          <th className="px-4 py-2.5 text-right w-24 border-l">NECA Rate</th>
                          <th className="px-4 py-2.5 text-right w-28">Total Hours</th>
                          <th className="px-4 py-2.5 text-right w-28 border-l">Price / Unit ($)</th>
                          <th className="px-4 py-2.5 text-center w-20">Unit</th>
                          <th className="px-4 py-2.5 text-right w-32 font-extrabold">Total Cost</th>
                          <th className="px-4 py-2.5 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700 font-mono">
                        {mtoLines.filter((l) => l.mto_sheet === activeTab).length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-12 text-center text-slate-400 font-semibold font-sans text-xs">
                              No takeoff items recorded on this sheet. Click "+ Add Custom Takeoff Row" below or search/select from catalog.
                            </td>
                          </tr>
                        ) : (
                          mtoLines
                            .filter((l) => l.mto_sheet === activeTab)
                            .map((line, idx) => (
                              <tr key={line.id || idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2 font-mono text-xs">{line.item_code}</td>
                                <td className="px-4 py-2 font-sans text-xs font-semibold">{line.description}</td>
                                
                                {/* Edit quantity directly inline */}
                                <td className="px-3 py-1 bg-yellow-400/5">
                                  <input
                                    type="number"
                                    className="w-16 text-right bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none"
                                    value={line.qty}
                                    onChange={async (e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      // Update local state instantly
                                      const updated = mtoLines.map((row) =>
                                        row.id === line.id ? { ...row, qty: val, total_hours: val * row.neca_rate, total_cost: val * row.price_per_unit } : row
                                      );
                                      setMtoLines(updated);
                                      // Sync to DB
                                      if (line.id) {
                                        await supabase
                                          .from("project_mto")
                                          .update({ qty: val, total_hours: val * line.neca_rate, total_cost: val * line.price_per_unit })
                                          .eq("id", line.id);
                                      }
                                    }}
                                  />
                                </td>

                                <td className="px-4 py-2 text-right border-l text-slate-500 font-normal">
                                  <input
                                    type="number"
                                    step="0.001"
                                    className="w-16 text-right bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none"
                                    value={line.neca_rate}
                                    onChange={async (e) => {
                                      const val = parseFloat(e.target.value) || 0.0;
                                      const updated = mtoLines.map((row) =>
                                        row.id === line.id ? { ...row, neca_rate: val, total_hours: row.qty * val } : row
                                      );
                                      setMtoLines(updated);
                                      if (line.id) {
                                        await supabase
                                          .from("project_mto")
                                          .update({ neca_rate: val, total_hours: line.qty * val })
                                          .eq("id", line.id);
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-2 text-right font-black text-rose-900">{(line.qty * line.neca_rate).toFixed(2)}</td>
                                
                                <td className="px-4 py-2 text-right border-l text-slate-500 font-normal">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-16 text-right bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none"
                                    value={line.price_per_unit}
                                    onChange={async (e) => {
                                      const val = parseFloat(e.target.value) || 0.0;
                                      const updated = mtoLines.map((row) =>
                                        row.id === line.id ? { ...row, price_per_unit: val, total_cost: row.qty * val } : row
                                      );
                                      setMtoLines(updated);
                                      if (line.id) {
                                        await supabase
                                          .from("project_mto")
                                          .update({ price_per_unit: val, total_cost: line.qty * val })
                                          .eq("id", line.id);
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-2 text-center text-slate-400 font-normal">{line.per_unit}</td>
                                <td className="px-4 py-2 text-right font-black text-emerald-950">${(line.qty * line.price_per_unit).toFixed(2)}</td>
                                
                                <td className="px-4 py-2 text-center">
                                  <button
                                    onClick={() => line.id && handleDeleteMTOItem(line.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                        
                        {/* Tab sheets aggregated totals */}
                        <tr className="bg-slate-100 font-black text-slate-900 border-t border-b text-[12px]">
                          <td colSpan={3} className="px-4 py-3 font-sans text-xs">Takeoff Worksheet Totals</td>
                          <td className="px-4 py-3 text-right border-l text-slate-400">—</td>
                          <td className="px-4 py-3 text-right text-rose-900">{getMtoSheetTotals(activeTab).hours.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right border-l text-slate-400">—</td>
                          <td className="px-4 py-3 text-center text-slate-400">—</td>
                          <td className="px-4 py-3 text-right text-emerald-950">${getMtoSheetTotals(activeTab).cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-center text-slate-400">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setIsAddingCustom(true)}
                      className="btn py-2 px-6 bg-rose-900/10 border-rose-900/20 text-rose-900 hover:bg-rose-900/20 font-bold flex items-center gap-1"
                    >
                      <Plus size={16} /> Add Custom Takeoff Row
                    </button>
                  </div>
                </div>
              )}

              {/* MATERIALS CATALOG VIEW */}
              {activeTab === "Catalog" && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-xl font-black text-rose-900">Materials Master Database Catalog</h3>
                    <p className="text-slate-500 text-xs mt-1">Query bulk materials or upload standard pricing databases using Excel files.</p>
                  </div>

                  {/* Catalog Import */}
                  <div className="bg-slate-100/50 p-6 rounded-2xl border border-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="space-y-1">
                      <span className="font-extrabold text-slate-800 text-xs block uppercase tracking-wider">Excel Bulk Database Uploader</span>
                      <span className="text-slate-500 text-[10px] block uppercase tracking-wide">
                        Formatting: Header Row, followed by [Unit, Cost Code, Part #, Description, NECA Hours Rate, Catalog Price]
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
                        className="btn btn-primary py-2.5 px-4 font-bold flex items-center gap-2"
                      >
                        <FileSpreadsheet size={16} />
                        {isExcelImporting ? "Uploading catalog..." : "Choose & Upload Database"}
                      </button>
                    </div>
                  </div>

                  {/* Search query */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 border bg-white rounded-xl px-3 py-2">
                        <Search size={18} className="text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search database by keyword, description, or part #..."
                          value={catalogQuery}
                          onChange={(e) => setCatalogQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchCatalog()}
                          className="w-full focus:outline-none text-slate-800 text-sm font-semibold"
                        />
                      </div>
                      <button onClick={searchCatalog} className="btn bg-rose-50 border-rose-200 text-rose-900 font-bold px-5">
                        Search Catalog
                      </button>
                    </div>

                    {catalogItems.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-2 max-h-[300px] overflow-y-auto">
                        <div className="bg-slate-50 p-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b">
                          Catalog Database Query Results ({catalogItems.length})
                        </div>
                        <div className="divide-y divide-slate-100 font-bold text-slate-700">
                          {catalogItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                selectCatalogItem(item);
                                alert(`Selected ${item.description || item.part_number}. Switch to MTO1–MTO8 worksheets and click "Add Custom Takeoff Row" to append.`);
                              }}
                              className="p-3 hover:bg-rose-50/20 cursor-pointer flex justify-between items-center transition-colors text-xs"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{item.description}</span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Part: {item.part_number} | Code: {item.cost_code}</span>
                              </div>
                              <div className="flex gap-4 text-xs text-slate-600 font-mono items-center">
                                <span>NECA: {item.neca_rate} hr</span>
                                <span>Price: ${item.default_price}</span>
                                <span className="bg-rose-900 text-white px-2 py-0.5 rounded text-[9px] font-sans font-black uppercase">
                                  Select
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
            </div>

            {/* Bottom Tab Strip - Replicating Excel sheet-tabs at bottom (Screenshot 2) */}
            <div className="glass-panel p-2 rounded-2xl border border-white/20 flex gap-1 items-center overflow-x-auto shadow-inner bg-slate-100/50 backdrop-blur z-20">
              <span className="text-[9px] font-black text-slate-400 uppercase px-2 tracking-widest">Excel Workspace:</span>
              {sheetList.map((sheet) => {
                const isActive = activeTab === sheet.key;
                const isMtoSheet = sheet.isMto;
                return (
                  <button
                    key={sheet.key}
                    onClick={() => setActiveTab(sheet.key)}
                    className={`py-1 px-3.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? "bg-white text-rose-900 shadow-sm border-t-[3px] border-emerald-700"
                        : isMtoSheet
                        ? "bg-yellow-400 text-amber-950 hover:bg-yellow-350 shadow-sm shadow-yellow-400/20"
                        : "hover:bg-white/40 text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span>{sheet.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="glass-panel text-center py-20 text-slate-500 rounded-3xl border border-white/25">
            <Briefcase size={48} className="mx-auto text-slate-400 mb-3" />
            <p className="font-bold text-slate-700 text-lg">No Active Project Selected</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Please create a new project or select an active electrical estimate from the left drop-down to begin estimation auditing.</p>
          </div>
        )}
      </div>

      {/* Add Custom MTO Takeoff Line Modal */}
      {isAddingCustom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg bg-white/95 flex flex-col gap-6 shadow-2xl p-6 border border-white/30 rounded-3xl animate-in fade-in zoom-in duration-200">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">Add Takeoff Item</h3>
                <span className="text-[10px] font-black uppercase text-amber-950 bg-yellow-400 px-2 py-0.5 rounded block mt-1 w-max">
                  Sheet: {mtoSheetNames[parseInt(activeTab.replace("MTO", "")) - 1] || activeTab}
                </span>
              </div>
              <button onClick={() => setIsAddingCustom(false)} className="text-slate-400 hover:text-slate-600 font-extrabold text-lg">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label text-[10px] tracking-wider uppercase font-bold">Item Description</label>
                <input
                  type="text"
                  className="input text-sm font-semibold"
                  placeholder="e.g. RED LION CONTROLS IIoT Protocol Converter"
                  value={customItem.description}
                  onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-[10px] tracking-wider uppercase font-bold">Item Code / Part #</label>
                <input
                  type="text"
                  className="input text-sm font-mono"
                  placeholder="e.g. DA10D0C000000000"
                  value={customItem.item_code}
                  onChange={(e) => setCustomItem({ ...customItem, item_code: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-[10px] tracking-wider uppercase font-bold">Quantity</label>
                <input
                  type="number"
                  className="input text-sm font-mono"
                  value={customItem.qty}
                  onChange={(e) => setCustomItem({ ...customItem, qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label text-[10px] tracking-wider uppercase font-bold">NECA Labor Rate (hours)</label>
                <input
                  type="number"
                  step="0.001"
                  className="input text-sm font-mono"
                  value={customItem.neca_rate}
                  onChange={(e) => setCustomItem({ ...customItem, neca_rate: parseFloat(e.target.value) || 0.0 })}
                />
              </div>
              <div>
                <label className="label text-[10px] tracking-wider uppercase font-bold">Price per Unit ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input text-sm font-mono"
                  value={customItem.price_per_unit}
                  onChange={(e) => setCustomItem({ ...customItem, price_per_unit: parseFloat(e.target.value) || 0.0 })}
                />
              </div>
              <div>
                <label className="label text-[10px] tracking-wider uppercase font-bold">Per Unit</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="EA / FT / C"
                  value={customItem.per_unit}
                  onChange={(e) => setCustomItem({ ...customItem, per_unit: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button onClick={() => setIsAddingCustom(false)} className="btn py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
                Close
              </button>
              <button onClick={handleAddCustomLine} className="btn btn-primary py-2 px-5 font-bold text-xs">
                Add to Takeoff Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
