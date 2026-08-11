const STORAGE_KEY = "pa-sop-live.v1";
const CONFIG_KEY = "pa-sop-live.supabase";
const SETTINGS_KEY = "pa-sop-live.settings";
const VAT_RATE = 0.2;
const DEFAULT_SETTINGS = { financialStart: "2026-01-01" };
const DEFAULT_SUPABASE = {
  url: "https://uumxoduzsuckwabhjvij.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bXhvZHV6c3Vja3dhYmhqdmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDM5MzUsImV4cCI6MjA5NDY3OTkzNX0.-eB6OtihnUIId6ZWzP7GH__GFI6c_bGeo1GJ4HyZz6o"
};

const roles = {
  director: {
    label: "Director",
    views: ["dashboard", "notifications", "planner", "jobs", "quotes", "team", "cnc", "timesheets", "holidays", "invoices", "payments", "accommodation", "shared-costs", "cashflow", "reports", "settings"]
  },
  projectManager: {
    label: "Project Manager",
    views: ["dashboard", "notifications", "planner", "jobs", "quotes", "cnc", "timesheets", "holidays", "invoices", "payments", "accommodation", "shared-costs"]
  },
  accounts: {
    label: "Accounts / Admin",
    views: ["dashboard", "notifications", "planner", "quotes", "team", "invoices", "payments", "accommodation", "cashflow", "shared-costs", "reports"]
  },
  workshop: {
    label: "Workshop / CNC",
    views: ["dashboard", "notifications", "planner", "jobs", "cnc", "timesheets", "holidays"]
  },
  estimator: {
    label: "Estimator",
    views: ["dashboard", "jobs", "quotes", "cnc", "reports"]
  },
  site: {
    label: "Site Men",
    views: ["dashboard", "timesheets", "holidays"]
  }
};

const viewLabels = {
  dashboard: "Dashboard",
  notifications: "Notifications",
  planner: "Planner",
  jobs: "Jobs",
  quotes: "Quotes",
  team: "Team & Payroll",
  cnc: "CNC Operations",
  timesheets: "Timesheets",
  holidays: "Holidays",
  invoices: "Invoices",
  payments: "Payments Out",
  accommodation: "Accommodation",
  "shared-costs": "Shared Costs",
  cashflow: "Cashflow",
  reports: "Reports",
  settings: "Settings"
};

const cncStages = ["Drawing Received", "Breakdown Needed", "Programming", "Ready to Cut", "Cutting", "Edging / Assembly", "Quality Check", "Complete"];
const timesheetActivities = ["Site work", "Cleaning up", "Unloading lorries", "Loading vans", "Moving materials", "Workshop prep", "Snagging", "Travel", "Other"];

const seed = {
  users: [
    { id: "u-director", name: "Director", role: "director", pin: "2468", employmentType: "PAYE", hourlyRate: 0, cisRate: 0, taxRate: 20, niRate: 8, pensionRate: 5, active: true },
    { id: "u-pm", name: "Project Manager", role: "projectManager", pin: "2468", employmentType: "PAYE", hourlyRate: 0, cisRate: 0, taxRate: 20, niRate: 8, pensionRate: 5, active: true },
    { id: "u-accounts", name: "Accounts", role: "accounts", pin: "2468", employmentType: "PAYE", hourlyRate: 0, cisRate: 0, taxRate: 20, niRate: 8, pensionRate: 5, active: true },
    { id: "u-workshop", name: "Workshop", role: "workshop", pin: "2468", employmentType: "PAYE", hourlyRate: 0, cisRate: 0, taxRate: 20, niRate: 8, pensionRate: 5, active: true },
    { id: "u-estimator", name: "Estimator", role: "estimator", pin: "2468", employmentType: "PAYE", hourlyRate: 0, cisRate: 0, taxRate: 20, niRate: 8, pensionRate: 5, active: true },
    { id: "u-site", name: "Site Operative", role: "site", pin: "1001", employmentType: "CIS", hourlyRate: 0, cisRate: 20, taxRate: 0, niRate: 0, pensionRate: 0, active: true }
  ],
  jobs: [
    { id: crypto.randomUUID(), number: "P&A-001", client: "Example Client", contractor: "", address: "Site address", description: "", status: "Live", start: todayIso(), finish: "", value: 0, labourBudget: 0, materialBudget: 0 }
  ],
  cnc: [],
  timesheets: [],
  holidays: [],
  jobMaterials: [],
  quotes: [],
  quoteMaterials: [],
  suppliers: [],
  invoices: [],
  payments: [],
  sharedCosts: [],
  planner: []
};

let supabaseConfig = loadSupabaseConfig();
let appSettings = loadAppSettings();
let db = loadDb();
let session = JSON.parse(sessionStorage.getItem("pa-sop-session") || "null");
let currentView = "dashboard";
let toast = "";
let syncStatus = hasSupabase() ? "Supabase configured" : "Local browser storage";
let editingAccommodationId = "";
let editingRecord = { type: "", id: "" };
let sharedCostTab = "Fixed";
let plannerMonth = todayIso().slice(0, 7);
let timesheetWeek = weekStartIso(todayIso());
let timesheetMode = "week";
let timesheetDay = todayIso();
let timesheetDetail = { userId: "", date: "" };
let timesheetSection = "viewer";
let payrollWeek = weekStartIso(todayIso());
let holidayWeek = weekStartIso(todayIso());
let holidayMode = "week";
let holidayDay = todayIso();
let activeSections = {
  planner: "calendar",
  jobs: "register",
  quotes: "register",
  team: "payroll",
  cnc: "tracker",
  holidays: "viewer",
  invoices: "register",
  payments: "register",
  accommodation: "register",
  sharedCosts: "register",
  cashflow: "moneyIn",
  settings: "database"
};
let openAddPanel = "";
let selectedJobId = "";
saveDb();

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toLocalDate(value) {
  const [year, month, day] = String(value || todayIso()).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function localDateIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDaysIso(value, days) {
  const date = toLocalDate(value);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

function weekStartIso(value) {
  const date = toLocalDate(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateIso(date);
}

function shortDate(value) {
  return toLocalDate(value).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function loadDb() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return normalizeDb(saved ? JSON.parse(saved) : structuredClone(seed));
}

function loadSupabaseConfig() {
  try {
    return { ...DEFAULT_SUPABASE, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_SUPABASE };
  }
}

function loadAppSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveAppSettings(settings) {
  appSettings = { ...appSettings, financialStart: settings.financialStart || DEFAULT_SETTINGS.financialStart };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
}

function saveSupabaseConfig(config) {
  supabaseConfig = {
    url: String(config.url || "").replace(/\/$/, ""),
    anonKey: String(config.anonKey || "")
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(supabaseConfig));
}

function hasSupabase() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

async function supabaseRequest(table, { method = "GET", query = "select=*", body = null } = {}) {
  if (!hasSupabase()) throw new Error("Supabase is not configured");
  const url = `${supabaseConfig.url}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "resolution=merge-duplicates,return=representation" : "return=representation"
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!response.ok) throw new Error(`${table} ${method} failed: ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

function remoteToDb(rows) {
  return normalizeDb({
    users: rows.app_users.map(user => ({ id: user.id, name: user.full_name, role: user.role, pin: user.pin, employmentType: user.employment_type || "PAYE", hourlyRate: Number(user.hourly_rate || 0), cisRate: Number(user.cis_rate || 0), taxRate: Number(user.tax_rate || 0), niRate: Number(user.ni_rate || 0), pensionRate: Number(user.pension_rate || 0), active: user.active !== false })),
    jobs: rows.jobs.map(job => ({ id: job.id, number: job.number, client: job.client, contractor: job.contractor, address: job.address, description: job.description, status: job.status, accommodationNeeded: job.accommodation_needed === true, start: job.start_date, finish: job.finish_date, value: Number(job.value || 0), labourBudget: Number(job.labour_budget || 0), materialBudget: Number(job.material_budget || 0) })),
    cnc: rows.cnc_operations.map(item => ({ id: item.id, jobId: item.job_id || "", title: item.title, fileName: item.drawing_path || "", status: item.status, priority: item.priority, requiredBy: item.required_by || "", breakdownNotes: item.breakdown_notes || "", productionNotes: item.production_notes || "" })),
    timesheets: rows.timesheets.map(item => ({ id: item.id, date: item.work_date, userId: item.user_id, userName: item.user_name || "", jobId: item.job_id || "", activity: item.activity || "Site work", hours: Number(item.hours || 0), payrollStatus: item.payroll_status || "Unpaid", signIn: item.sign_in_time || "", signInLocation: item.sign_in_lat ? { lat: Number(item.sign_in_lat), lng: Number(item.sign_in_lng), accuracy: Number(item.sign_in_accuracy || 0) } : null, signOut: item.sign_out_time || "", signOutLocation: item.sign_out_lat ? { lat: Number(item.sign_out_lat), lng: Number(item.sign_out_lng), accuracy: Number(item.sign_out_accuracy || 0) } : null })),
    holidays: (rows.holiday_requests || []).map(item => ({ id: item.id, userId: item.user_id || "", userName: item.user_name || "", startDate: item.start_date || todayIso(), endDate: item.end_date || item.start_date || todayIso(), days: Number(item.days || 1), status: item.status || "Pending", reason: item.reason || "", decisionNote: item.decision_note || "" })),
    jobMaterials: (rows.job_materials || []).map(item => ({ id: item.id, jobId: item.job_id || "", paymentId: item.payment_id || "", materialName: item.material_name || "", supplier: item.supplier || "", netAmount: Number(item.net_amount || 0), vatAmount: Number(item.vat_amount || 0), purchaseDate: item.purchase_date || todayIso(), proofFile: item.proof_file || "", notes: item.notes || "" })),
    quotes: (rows.quotes || []).map(item => ({ id: item.id, jobId: item.job_id || "", jobName: item.job_name || "", accommodationNeeded: item.accommodation_needed === true, company: item.company || "", contactName: item.contact_name || "", contactRole: item.contact_role || "", phone: item.phone || "", email: item.email || "", siteAddress: item.site_address || "", leadSource: item.lead_source || "", nextAction: item.next_action || "", expectedStart: item.expected_start || "", quoteDeadline: item.quote_deadline || "", decisionMaker: item.decision_maker || "", priority: item.priority || "Normal", scope: item.scope || "", exclusions: item.exclusions || "", description: item.description || "", amount: Number(item.amount || 0), status: item.status || "Draft", quoteDate: item.quote_date || todayIso(), followUpDate: item.follow_up_date || "", notes: item.notes || "" })),
    quoteMaterials: (rows.quote_materials || []).map(item => ({ id: item.id, quoteId: item.quote_id || "", materialName: item.material_name || "", supplier: item.supplier || "", supplierCode: item.supplier_code || "", salesRep: item.sales_rep || "", website: item.website || "", email: item.email || "", supplierPhone: item.supplier_phone || "", quantity: Number(item.quantity || 0), unit: item.unit || "", unitPrice: Number(item.unit_price || 0), netAmount: Number(item.net_amount || 0), vatAmount: Number(item.vat_amount || 0), totalAmount: Number(item.total_amount || item.net_amount || 0), leadTime: item.lead_time || "", referenceFile: item.reference_file || "", orderStatus: item.order_status || "To order", notes: item.notes || "" })),
    suppliers: (rows.suppliers || []).map(item => ({ id: item.id, name: item.name || "", salesRep: item.sales_rep || "", email: item.email || "", phone: item.phone || "", website: item.website || "", notes: item.notes || "" })),
    invoices: rows.invoices.map(item => ({ id: item.id, jobId: item.job_id || "", description: item.description, amount: Number(item.amount || 0), vatApplies: item.vat_applies !== false, cisApplies: item.cis_applies === true, cisRate: Number(item.cis_rate ?? 20), cisAmount: item.cis_amount ?? "", status: item.status, paidDate: item.paid_date || "", dueDate: item.due_date || "" })),
    payments: rows.payments_out.map(item => ({ id: item.id, jobId: item.job_id || "", category: item.category || "Materials", description: item.description, accommodationAddress: item.accommodation_address || "", accommodationLocation: item.accommodation_location || "", accommodationContact: item.accommodation_contact || "", accommodationCheckInDate: item.accommodation_check_in_date || "", accommodationCheckOutDate: item.accommodation_check_out_date || "", accommodationCheckOutTime: item.accommodation_check_out_time || "", amount: Number(item.amount || 0), status: item.status, paymentDate: item.payment_date || "" })),
    sharedCosts: rows.shared_costs.map(item => ({ id: item.id, jobId: item.job_id || "", costType: item.cost_type || "Fixed", category: item.category || "General overhead", description: item.description, amount: Number(item.amount || 0), status: item.status, paymentDate: item.payment_date || "" })),
    planner: rows.planner_items.map(item => ({ id: item.id, jobId: item.job_id || "", userId: item.user_id || "", userIds: item.assigned_user_ids ? item.assigned_user_ids.split(",").filter(Boolean) : (item.user_id ? [item.user_id] : []), title: item.title, type: item.item_type || "Task", date: item.plan_date || todayIso(), time: item.plan_time || "", priority: item.priority || "Normal", status: item.status || "Open", notes: item.notes || "" }))
  });
}

async function loadRemoteDb() {
  const [app_users, jobs, cnc_operations, timesheets, holiday_requests, job_materials, quotes, quote_materials, suppliers, invoices, payments_out, shared_costs, planner_items] = await Promise.all([
    supabaseRequest("app_users"),
    supabaseRequest("jobs"),
    supabaseRequest("cnc_operations"),
    supabaseRequest("timesheets"),
    supabaseRequest("holiday_requests"),
    supabaseRequest("job_materials"),
    supabaseRequest("quotes"),
    supabaseRequest("quote_materials"),
    supabaseRequest("suppliers").catch(() => []),
    supabaseRequest("invoices"),
    supabaseRequest("payments_out"),
    supabaseRequest("shared_costs"),
    supabaseRequest("planner_items")
  ]);
  db = remoteToDb({ app_users, jobs, cnc_operations, timesheets, holiday_requests, job_materials, quotes, quote_materials, suppliers, invoices, payments_out, shared_costs, planner_items });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  syncStatus = "Connected to Supabase";
  return db;
}

function jobToRemote(job) {
  return { id: job.id, number: job.number, client: job.client, contractor: job.contractor, address: job.address, description: job.description, status: job.status, accommodation_needed: job.accommodationNeeded === true, start_date: job.start || null, finish_date: job.finish || null, value: job.value, labour_budget: job.labourBudget, material_budget: job.materialBudget };
}

function userToRemote(user) {
  return { id: user.id, full_name: user.name, role: user.role, pin: user.pin, employment_type: user.employmentType || "PAYE", hourly_rate: Number(user.hourlyRate || 0), cis_rate: Number(user.cisRate || 0), tax_rate: Number(user.taxRate || 0), ni_rate: Number(user.niRate || 0), pension_rate: Number(user.pensionRate || 0), active: user.active !== false };
}

function cncToRemote(item) {
  return { id: item.id, job_id: item.jobId || null, title: item.title, drawing_path: item.fileName || "", status: item.status, priority: item.priority, required_by: item.requiredBy || null, breakdown_notes: item.breakdownNotes || "", production_notes: item.productionNotes || "" };
}

function timesheetToRemote(item) {
  return { id: item.id, user_id: item.userId, user_name: item.userName, job_id: item.jobId || null, work_date: item.date, activity: item.activity || "Site work", hours: item.hours || 0, payroll_status: item.payrollStatus || "Unpaid", sign_in_time: item.signIn || "", sign_in_lat: item.signInLocation?.lat ?? null, sign_in_lng: item.signInLocation?.lng ?? null, sign_in_accuracy: item.signInLocation?.accuracy ?? null, sign_out_time: item.signOut || "", sign_out_lat: item.signOutLocation?.lat ?? null, sign_out_lng: item.signOutLocation?.lng ?? null, sign_out_accuracy: item.signOutLocation?.accuracy ?? null };
}

function holidayToRemote(item) {
  return { id: item.id, user_id: item.userId || null, user_name: item.userName || "", start_date: item.startDate || todayIso(), end_date: item.endDate || item.startDate || todayIso(), days: item.days || 1, status: item.status || "Pending", reason: item.reason || "", decision_note: item.decisionNote || "" };
}

function invoiceToRemote(item) {
  return { id: item.id, job_id: item.jobId || null, description: item.description, amount: item.amount, vat_applies: item.vatApplies !== false, cis_applies: item.cisApplies === true, cis_rate: item.cisRate ?? 20, cis_amount: item.cisAmount === "" ? null : item.cisAmount, status: item.status, paid_date: item.paidDate || null, due_date: item.dueDate || null };
}

function quoteToRemote(item) {
  return { id: item.id, job_id: item.jobId || null, job_name: item.jobName || "", accommodation_needed: item.accommodationNeeded === true, company: item.company || "", contact_name: item.contactName || "", contact_role: item.contactRole || "", phone: item.phone || "", email: item.email || "", site_address: item.siteAddress || "", lead_source: item.leadSource || "", next_action: item.nextAction || "", expected_start: item.expectedStart || null, quote_deadline: item.quoteDeadline || null, decision_maker: item.decisionMaker || "", priority: item.priority || "Normal", scope: item.scope || "", exclusions: item.exclusions || "", description: item.description || "", amount: item.amount || 0, status: item.status || "Draft", quote_date: item.quoteDate || todayIso(), follow_up_date: item.followUpDate || null, notes: item.notes || "" };
}

function quoteMaterialToRemote(item) {
  return { id: item.id, quote_id: item.quoteId || null, material_name: item.materialName || "", supplier: item.supplier || "", supplier_code: item.supplierCode || "", sales_rep: item.salesRep || "", website: item.website || "", email: item.email || "", supplier_phone: item.supplierPhone || "", quantity: item.quantity || 0, unit: item.unit || "", unit_price: item.unitPrice || 0, net_amount: item.netAmount || 0, vat_amount: item.vatAmount || 0, total_amount: item.totalAmount || item.netAmount || 0, lead_time: item.leadTime || "", reference_file: item.referenceFile || "", order_status: item.orderStatus || "To order", notes: item.notes || "" };
}

function supplierToRemote(item) {
  return { id: item.id, name: item.name || "", sales_rep: item.salesRep || "", email: item.email || "", phone: item.phone || "", website: item.website || "", notes: item.notes || "" };
}

function jobMaterialToRemote(item) {
  return { id: item.id, job_id: item.jobId || null, payment_id: item.paymentId || "", material_name: item.materialName || "", supplier: item.supplier || "", net_amount: item.netAmount || 0, vat_amount: item.vatAmount || 0, purchase_date: item.purchaseDate || todayIso(), proof_file: item.proofFile || "", notes: item.notes || "" };
}

function paymentToRemote(item) {
  return { id: item.id, job_id: item.jobId || null, category: item.category || "", description: item.description, accommodation_address: item.accommodationAddress || "", accommodation_location: item.accommodationLocation || "", accommodation_contact: item.accommodationContact || "", accommodation_check_in_date: item.accommodationCheckInDate || null, accommodation_check_out_date: item.accommodationCheckOutDate || null, accommodation_check_out_time: item.accommodationCheckOutTime || "", amount: item.amount, status: item.status, payment_date: item.paymentDate || null };
}

function sharedCostToRemote(item) {
  return { id: item.id, job_id: item.jobId || null, cost_type: item.costType || "Fixed", category: item.category || "", description: item.description, amount: item.amount, status: item.status, payment_date: item.paymentDate || null };
}

function plannerToRemote(item) {
  const userIds = item.userIds?.length ? item.userIds : (item.userId ? [item.userId] : []);
  return { id: item.id, job_id: item.jobId || null, user_id: userIds[0] || null, assigned_user_ids: userIds.join(","), title: item.title, item_type: item.type || "Task", plan_date: item.date || todayIso(), plan_time: item.time || "", priority: item.priority || "Normal", status: item.status || "Open", notes: item.notes || "" };
}

async function upsertRemote(table, payload) {
  if (!hasSupabase()) return;
  await supabaseRequest(table, { method: "POST", query: "on_conflict=id", body: payload });
}

function normalizeDb(input) {
  const normalized = {
    ...structuredClone(seed),
    ...input,
    users: (input.users || seed.users).map(user => ({
      employmentType: "PAYE",
      hourlyRate: 0,
      cisRate: 0,
      taxRate: 0,
      niRate: 0,
      pensionRate: 0,
      active: true,
      ...user
    })),
    jobs: (input.jobs || []).map(job => ({
      contractor: "",
      description: "",
      accommodationNeeded: false,
      labourBudget: 0,
      materialBudget: 0,
      ...job
    })),
    cnc: input.cnc || [],
    timesheets: (input.timesheets || []).map(row => ({ activity: "Site work", payrollStatus: "Unpaid", ...row })),
    holidays: (input.holidays || []).map(item => ({ userId: "", userName: "", startDate: todayIso(), endDate: todayIso(), days: 1, status: "Pending", reason: "", decisionNote: "", ...item })),
    jobMaterials: (input.jobMaterials || []).map(item => ({
      jobId: "",
      paymentId: "",
      materialName: "",
      supplier: "",
      netAmount: 0,
      vatAmount: 0,
      purchaseDate: todayIso(),
      proofFile: "",
      notes: "",
      ...item
    })),
    quotes: (input.quotes || []).map(quote => ({
      jobId: "",
      jobName: "",
      accommodationNeeded: false,
      company: "",
      contactName: "",
      contactRole: "",
      phone: "",
      email: "",
      siteAddress: "",
      leadSource: "",
      nextAction: "",
      expectedStart: "",
      quoteDeadline: "",
      decisionMaker: "",
      priority: "Normal",
      scope: "",
      exclusions: "",
      description: "",
      amount: 0,
      status: "Draft",
      quoteDate: todayIso(),
      followUpDate: "",
      notes: "",
      ...quote
    })),
    quoteMaterials: (input.quoteMaterials || []).map(item => ({
      quoteId: "",
      materialName: "",
      supplier: "",
      supplierCode: "",
      salesRep: "",
      website: "",
      email: "",
      supplierPhone: "",
      quantity: 0,
      unit: "",
      unitPrice: 0,
      netAmount: 0,
      vatAmount: 0,
      totalAmount: 0,
      leadTime: "",
      referenceFile: "",
      orderStatus: "To order",
      notes: "",
      ...item
    })),
    suppliers: (input.suppliers || []).map(item => ({
      name: "",
      salesRep: "",
      email: "",
      phone: "",
      website: "",
      notes: "",
      ...item
    })),
    invoices: (input.invoices || []).map(invoice => ({
      vatApplies: invoice.vatApplies !== false,
      cisApplies: invoice.cisApplies === true,
      cisRate: Number(invoice.cisRate ?? 20),
      cisAmount: invoice.cisAmount ?? "",
      paidDate: invoice.paidDate || "",
      ...invoice
    })),
    payments: (input.payments || []).map(payment => ({ category: payment.category || "Materials", paymentDate: payment.paymentDate || "", accommodationAddress: "", accommodationLocation: "", accommodationContact: "", accommodationCheckInDate: "", accommodationCheckOutDate: "", accommodationCheckOutTime: "", ...payment })),
    sharedCosts: (input.sharedCosts || []).map(cost => ({ costType: cost.costType || "Fixed", category: cost.category || "General overhead", paymentDate: cost.paymentDate || "", ...cost })),
    planner: (input.planner || []).map(item => ({
      jobId: "",
      userId: "",
      userIds: item.userIds || (item.userId ? [item.userId] : []),
      type: "Task",
      date: todayIso(),
      time: "",
      priority: "Normal",
      status: "Open",
      notes: "",
      ...item
    }))
  };
  return cleanOrphanJobMaterialData(normalized);
}

function cleanOrphanJobMaterialData(data) {
  const jobIds = new Set((data.jobs || []).map(job => job.id));
  const validMaterials = (data.jobMaterials || []).filter(item => item.jobId && jobIds.has(item.jobId));
  const validMaterialIds = new Set(validMaterials.map(item => item.id));
  const validPaymentIds = new Set(validMaterials.map(item => item.paymentId).filter(Boolean));
  const orphanPaymentIds = new Set((data.jobMaterials || []).filter(item => !validMaterialIds.has(item.id)).map(item => item.paymentId).filter(Boolean));
  return {
    ...data,
    jobMaterials: validMaterials,
    payments: (data.payments || []).filter(payment => {
      if (orphanPaymentIds.has(payment.id)) return false;
      if (payment.category === "Materials" && payment.jobId && !jobIds.has(payment.jobId)) return false;
      if (payment.category === "Materials" && validPaymentIds.has(payment.id)) return true;
      return true;
    })
  };
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

async function saveLocalAndRemote(table, payload) {
  saveDb();
  if (!hasSupabase()) return;
  const remotePayload = {
    app_users: userToRemote,
    jobs: jobToRemote,
    cnc_operations: cncToRemote,
    timesheets: timesheetToRemote,
    holiday_requests: holidayToRemote,
    job_materials: jobMaterialToRemote,
    quotes: quoteToRemote,
    quote_materials: quoteMaterialToRemote,
    suppliers: supplierToRemote,
    invoices: invoiceToRemote,
    payments_out: paymentToRemote,
    shared_costs: sharedCostToRemote,
    planner_items: plannerToRemote
  }[table](payload);
  await upsertRemote(table, remotePayload);
  syncStatus = "Saved to Supabase";
}

async function deleteLocalAndRemote(table, id) {
  saveDb();
  if (!hasSupabase()) return;
  await supabaseRequest(table, { method: "DELETE", query: `id=eq.${encodeURIComponent(id)}` });
  syncStatus = "Deleted from Supabase";
}

function tableNameForRecord(type) {
  return {
    user: "app_users",
    job: "jobs",
    holiday: "holiday_requests",
    jobMaterial: "job_materials",
    quote: "quotes",
    quoteMaterial: "quote_materials",
    supplier: "suppliers",
    invoice: "invoices",
    payments: "payments_out",
    sharedCosts: "shared_costs",
    planner: "planner_items"
  }[type];
}

function collectionForRecord(type) {
  return {
    user: db.users,
    job: db.jobs,
    holiday: db.holidays,
    jobMaterial: db.jobMaterials,
    quote: db.quotes,
    quoteMaterial: db.quoteMaterials,
    supplier: db.suppliers,
    invoice: db.invoices,
    payments: db.payments,
    sharedCosts: db.sharedCosts,
    planner: db.planner
  }[type];
}

async function deleteRecord(type, id) {
  if (!window.confirm("Remove this record?")) return;
  const tableName = tableNameForRecord(type);
  const linkedPaymentId = type === "jobMaterial" ? db.jobMaterials.find(item => item.id === id)?.paymentId : "";
  const linkedJobMaterials = type === "job" ? db.jobMaterials.filter(item => sameId(item.jobId, id)) : [];
  const linkedJobMaterialIds = linkedJobMaterials.map(item => item.id);
  const linkedJobPaymentIds = new Set([
    ...linkedJobMaterials.map(item => item.paymentId).filter(Boolean),
    ...db.payments.filter(item => type === "job" && sameId(item.jobId, id) && item.category === "Materials").map(item => item.id)
  ]);
  if (type === "job") db.jobs = db.jobs.filter(item => item.id !== id);
  if (type === "holiday") db.holidays = db.holidays.filter(item => item.id !== id);
  if (type === "jobMaterial") db.jobMaterials = db.jobMaterials.filter(item => item.id !== id);
  if (type === "quote") db.quotes = db.quotes.filter(item => item.id !== id);
  if (type === "quoteMaterial") db.quoteMaterials = db.quoteMaterials.filter(item => item.id !== id);
  if (type === "supplier") db.suppliers = db.suppliers.filter(item => item.id !== id);
  if (type === "invoice") db.invoices = db.invoices.filter(item => item.id !== id);
  if (type === "payments") db.payments = db.payments.filter(item => item.id !== id);
  if (type === "sharedCosts") db.sharedCosts = db.sharedCosts.filter(item => item.id !== id);
  if (type === "planner") db.planner = db.planner.filter(item => item.id !== id);
  if (type === "job") db.jobMaterials = db.jobMaterials.filter(item => !sameId(item.jobId, id));
  if (linkedPaymentId) db.payments = db.payments.filter(item => item.id !== linkedPaymentId);
  if (type === "job") db.payments = db.payments.filter(item => !linkedJobPaymentIds.has(item.id));
  await deleteLocalAndRemote(tableName, id).catch(error => { toast = error.message; });
  if (linkedPaymentId) await deleteLocalAndRemote("payments_out", linkedPaymentId).catch(error => { toast = error.message; });
  if (type === "job") {
    await Promise.all(linkedJobMaterialIds.map(materialId => deleteLocalAndRemote("job_materials", materialId).catch(error => { toast = error.message; })));
    await Promise.all([...linkedJobPaymentIds].map(paymentId => deleteLocalAndRemote("payments_out", paymentId).catch(error => { toast = error.message; })));
    if (selectedJobId === id) selectedJobId = "";
  }
  toast = toast || "Record removed";
}

function isEditing(type, id = "") {
  return editingRecord.type === type && (!id || editingRecord.id === id);
}

function selectOptions(options, selected = "") {
  return options.map(option => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function editPanel(type, item, body) {
  if (!item || !isEditing(type, item.id)) return "";
  const attr = type === "sharedCosts" ? "data-edit-shared-cost" : `data-edit-${type}`;
  return panel(`Edit ${type === "sharedCosts" ? "Shared Cost" : type[0].toUpperCase() + type.slice(1)}`, `<form class="form-grid" ${attr}>
    <input type="hidden" name="id" value="${item.id}">
    ${body}
    <div class="inline-actions wide"><button class="primary-button">Update</button><button class="secondary-button" type="button" data-cancel-edit>Cancel</button></div>
  </form>`);
}

function addPanel(key, title, body, buttonText = title) {
  if (openAddPanel !== key) {
    return `<div class="add-bar"><button class="primary-button" data-open-add="${key}">${escapeHtml(buttonText)}</button></div>`;
  }
  return panel(title, `${body}<div class="inline-actions wide"><button class="secondary-button" type="button" data-cancel-add>Cancel</button></div>`);
}

function csvImportPanel(type, title, columns) {
  return panel(title, `<form class="form-grid" data-import-csv="${type}">
    <label class="wide"><span>CSV file</span><input name="csv" type="file" accept=".csv,text/csv" required></label>
    <p class="note wide">Expected columns: ${escapeHtml(columns)}. You can export these from Excel as CSV.</p>
    <div class="inline-actions wide"><button class="secondary-button">Import CSV</button></div>
  </form>`);
}

function sectionSwitcher(view, sections) {
  return `<div class="tab-strip">${sections.map(section => `<button class="tab-button ${activeSections[view] === section.key ? "active" : ""}" data-section-view="${view}:${section.key}">${escapeHtml(section.label)}</button>`).join("")}</div>`;
}

function activeSection(view, fallback) {
  activeSections[view] ||= fallback;
  return activeSections[view];
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

function csvRows(text) {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return [];
  const headers = parsed[0].map(normalizeHeader);
  return parsed.slice(1).map(row => headers.reduce((item, header, index) => {
    if (header) item[header] = row[index] ?? "";
    return item;
  }, {}));
}

function csvValue(row, ...keys) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function parseMoneyValue(value) {
  const cleaned = String(value || "").replace(/[£,\s]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

function parseBool(value) {
  return ["yes", "y", "true", "1"].includes(String(value || "").trim().toLowerCase());
}

function csvDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return raw;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function titleCaseStatus(value, fallback = "Pending") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw.split(/\s+/).map(word => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`).join(" ");
}

function findJobByNumber(number) {
  const target = String(number || "").trim().toLowerCase();
  return db.jobs.find(job => String(job.number || "").trim().toLowerCase() === target) || null;
}

function findUserByName(name) {
  const target = String(name || "").trim().toLowerCase();
  return db.users.find(user => String(user.name || "").trim().toLowerCase() === target) || null;
}

async function saveImported(table, item) {
  await saveLocalAndRemote(table, item).catch(error => { toast = error.message; });
}

async function importCsv(type, text) {
  const rows = csvRows(text);
  let imported = 0;
  for (const row of rows) {
    if (type === "jobs") {
      const number = csvValue(row, "job_number", "number", "job");
      if (!number) continue;
      const existing = findJobByNumber(number);
      const job = existing || { id: crypto.randomUUID() };
      Object.assign(job, {
        number,
        client: csvValue(row, "client", "customer") || job.client || "",
        contractor: csvValue(row, "contractor", "main_contractor") || job.contractor || "",
        address: csvValue(row, "address", "site_address") || job.address || "",
        description: csvValue(row, "description", "works") || job.description || "",
        status: titleCaseStatus(csvValue(row, "status"), job.status || "Live"),
        accommodationNeeded: parseBool(csvValue(row, "accommodation_needed", "accommodation")),
        value: parseMoneyValue(csvValue(row, "value", "quote_value", "job_value")) || Number(job.value || 0),
        labourBudget: parseMoneyValue(csvValue(row, "labour_budget", "labour_budget_hours")) || Number(job.labourBudget || 0),
        materialBudget: parseMoneyValue(csvValue(row, "material_budget", "materials_budget")) || Number(job.materialBudget || 0),
        start: csvDate(csvValue(row, "start", "start_date")) || job.start || todayIso(),
        finish: csvDate(csvValue(row, "finish", "finish_date")) || job.finish || ""
      });
      if (!existing) db.jobs.push(job);
      await saveImported("jobs", job);
      imported += 1;
    }

    if (type === "timesheets") {
      const userName = csvValue(row, "man", "user", "employee", "name");
      const user = findUserByName(userName);
      const job = findJobByNumber(csvValue(row, "job_number", "job"));
      const activity = csvValue(row, "activity", "work_type") || (job ? "Site work" : csvValue(row, "job_number", "job") || "Site work");
      const item = {
        id: crypto.randomUUID(),
        date: csvDate(csvValue(row, "date", "timesheet_date")) || todayIso(),
        userId: user?.id || "",
        userName: user?.name || userName || "Unknown",
        jobId: job?.id || "",
        activity,
        hours: parseMoneyValue(csvValue(row, "hours", "hrs")),
        payrollStatus: titleCaseStatus(csvValue(row, "payroll_status"), "Unpaid"),
        signIn: csvValue(row, "sign_in", "signin"),
        signInLocation: null,
        signOut: csvValue(row, "sign_out", "signout"),
        signOutLocation: null,
        notes: csvValue(row, "notes")
      };
      if (!item.userName || (!item.hours && !item.signIn && !item.signOut)) continue;
      db.timesheets.push(item);
      await saveImported("timesheets", item);
      imported += 1;
    }

    if (type === "invoices") {
      const job = findJobByNumber(csvValue(row, "job_number", "job"));
      const cisAmount = csvValue(row, "cis_amount", "cis_value");
      const item = {
        id: crypto.randomUUID(),
        jobId: job?.id || "",
        description: csvValue(row, "description", "invoice_description") || "Imported invoice",
        amount: parseMoneyValue(csvValue(row, "net_amount", "amount", "net")),
        vatApplies: !["no", "n", "false", "0", "reverse", "reverse_charge"].includes(String(csvValue(row, "vat", "vat_charged", "vat_applies")).trim().toLowerCase()),
        cisApplies: parseBool(csvValue(row, "cis", "cis_deduction", "cis_applies")) || Boolean(cisAmount),
        cisRate: parseMoneyValue(csvValue(row, "cis_rate")) || 20,
        cisAmount: cisAmount === "" ? "" : parseMoneyValue(cisAmount),
        status: titleCaseStatus(csvValue(row, "status"), csvValue(row, "paid_date") ? "Paid" : "Pending"),
        dueDate: csvDate(csvValue(row, "due_date", "due")),
        paidDate: csvDate(csvValue(row, "paid_date", "paid"))
      };
      if (!item.amount && !item.description) continue;
      db.invoices.push(item);
      await saveImported("invoices", item);
      imported += 1;
    }

    if (type === "payments" || type === "accommodation") {
      const job = findJobByNumber(csvValue(row, "job_number", "job"));
      const item = {
        id: crypto.randomUUID(),
        jobId: job?.id || "",
        costType: "Variable",
        category: type === "accommodation" ? "Accommodation" : csvValue(row, "category", "type") || "Other",
        description: csvValue(row, "description", "payment_description") || (type === "accommodation" ? "Accommodation" : "Imported payment"),
        accommodationAddress: csvValue(row, "address", "accommodation_address"),
        accommodationLocation: csvValue(row, "location", "accommodation_location"),
        accommodationContact: csvValue(row, "contact", "booking_ref", "reference"),
        accommodationCheckInDate: csvDate(csvValue(row, "check_in", "check_in_date")),
        accommodationCheckOutDate: csvDate(csvValue(row, "check_out", "check_out_date")),
        accommodationCheckOutTime: csvValue(row, "check_out_time", "checkout_time"),
        paymentDate: csvDate(csvValue(row, "payment_date", "date")) || todayIso(),
        amount: parseMoneyValue(csvValue(row, "amount", "cost")),
        status: titleCaseStatus(csvValue(row, "status"), "Pending")
      };
      if (!item.amount && !item.description) continue;
      db.payments.push(item);
      await saveImported("payments_out", item);
      imported += 1;
    }
  }
  return imported;
}

function saveSession() {
  if (session) sessionStorage.setItem("pa-sop-session", JSON.stringify(session));
  else sessionStorage.removeItem("pa-sop-session");
}

function roleConfig() {
  return roles[session?.role] || roles.site;
}

function ownTimesheetsOnly() {
  return ["site", "workshop"].includes(session?.role);
}

function canView(view) {
  return Boolean(session && roleConfig().views.includes(view));
}

function setView(view) {
  currentView = canView(view) ? view : roleConfig().views[0];
}

function money(value) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function vatAmount(invoice) {
  return invoice.vatApplies === false ? 0 : Number(invoice.amount || 0) * VAT_RATE;
}

function grossAmount(invoice) {
  return Number(invoice.amount || 0) + vatAmount(invoice);
}

function cisDeduction(invoice) {
  if (!invoice.cisApplies) return 0;
  if (invoice.cisAmount !== "" && invoice.cisAmount !== undefined && !Number.isNaN(Number(invoice.cisAmount))) return Number(invoice.cisAmount || 0);
  return Number(invoice.amount || 0) * (Number(invoice.cisRate ?? 20) / 100);
}

function receivedAmount(invoice) {
  return Math.max(grossAmount(invoice) - cisDeduction(invoice), 0);
}

function sameId(a, b) {
  return String(a || "") === String(b || "");
}

function materialTotal(item) {
  return Number(item.netAmount || 0) + Number(item.vatAmount || 0);
}

function linkedMaterialPayment(item) {
  if (!item) return null;
  return db.payments.find(payment => payment.id === item.paymentId) || null;
}

function materialPaymentPayload(item, existingId = "") {
  return {
    id: existingId || crypto.randomUUID(),
    jobId: item.jobId || "",
    category: "Materials",
    description: `${item.materialName} - ${item.supplier}`,
    amount: materialTotal(item),
    status: item.paymentStatus || "Pending",
    paymentDate: item.purchaseDate || todayIso()
  };
}

function jobAccommodationLogged(jobId) {
  return db.payments.some(item => sameId(item.jobId, jobId) && item.category === "Accommodation");
}

function externalLink(url) {
  if (!url) return "-";
  const href = String(url).startsWith("http://") || String(url).startsWith("https://") ? String(url) : `https://${url}`;
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`;
}

function userLabel(id) {
  const user = db.users.find(item => item.id === id);
  return user ? escapeHtml(user.name) : "Unknown";
}

function userPayroll(row) {
  const user = db.users.find(item => item.id === row.userId) || {};
  const gross = Number(row.hours || 0) * Number(user.hourlyRate || 0);
  const isCis = user.employmentType === "CIS";
  const cis = isCis ? gross * (Number(user.cisRate || 0) / 100) : 0;
  const tax = !isCis ? gross * (Number(user.taxRate || 0) / 100) : 0;
  const ni = !isCis ? gross * (Number(user.niRate || 0) / 100) : 0;
  const pension = !isCis ? gross * (Number(user.pensionRate || 0) / 100) : 0;
  const deductions = cis + tax + ni + pension;
  return { gross, cis, tax, ni, pension, deductions, net: Math.max(gross - deductions, 0), user };
}

function jobCostSummary(jobId) {
  const timesheets = db.timesheets.filter(row => sameId(row.jobId, jobId));
  const labourHours = timesheets.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const labourCost = timesheets.reduce((sum, row) => sum + userPayroll(row).net, 0);
  const wagesPaid = db.payments.filter(item => sameId(item.jobId, jobId) && item.status === "Paid" && item.category === "Wages").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const materialRows = db.jobMaterials.filter(item => sameId(item.jobId, jobId));
  const materialPaymentIds = new Set(materialRows.map(item => item.paymentId).filter(Boolean));
  const directPaid = db.payments.filter(item => sameId(item.jobId, jobId) && item.status === "Paid" && item.category !== "Wages" && !materialPaymentIds.has(item.id)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const directPending = db.payments.filter(item => sameId(item.jobId, jobId) && item.status !== "Paid" && !materialPaymentIds.has(item.id)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const materialCost = materialRows.reduce((sum, item) => sum + materialTotal(item), 0);
  const sharedPaid = db.sharedCosts.filter(item => sameId(item.jobId, jobId) && item.status === "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const sharedPending = db.sharedCosts.filter(item => sameId(item.jobId, jobId) && item.status !== "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    labourHours,
    labourCost,
    wagesPaid,
    directPaid,
    directPending,
    materialCost,
    sharedPaid,
    sharedPending,
    actualPaid: wagesPaid + directPaid + sharedPaid,
    committedCost: labourCost + materialCost + directPaid + directPending + sharedPaid + sharedPending
  };
}

function paidInTotal() {
  return db.invoices.filter(item => item.status === "Paid" && inFinancialPeriod(item.paidDate || item.dueDate || todayIso())).reduce((sum, item) => sum + receivedAmount(item), 0);
}

function paidOutTotal() {
  return [...db.payments, ...db.sharedCosts].filter(item => item.status === "Paid" && inFinancialPeriod(item.paymentDate || todayIso())).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function inFinancialPeriod(date) {
  return !date || String(date) >= appSettings.financialStart;
}

function daysUntil(date) {
  if (!date) return 9999;
  const today = new Date(`${todayIso()}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

function dateInRange(date, start, end) {
  if (!date || !start) return false;
  const finalEnd = end || start;
  return String(date) >= String(start) && String(date) <= String(finalEnd);
}

function visibleHolidayRows() {
  return ownTimesheetsOnly() ? db.holidays.filter(item => item.userId === session.userId) : db.holidays;
}

function approvedHolidaysOnDate(date) {
  return visibleHolidayRows().filter(item => item.status === "Approved" && dateInRange(date, item.startDate, item.endDate));
}

function approvedHolidayForUserOnDate(userId, date) {
  return approvedHolidaysOnDate(date).find(item => sameId(item.userId, userId));
}

function plannerAssignedIds(item) {
  return item.userIds?.length ? item.userIds : (item.userId ? [item.userId] : []);
}

function plannerUnderstaffing(item) {
  const assignedIds = plannerAssignedIds(item);
  const off = assignedIds.map(userId => approvedHolidayForUserOnDate(userId, item.date)).filter(Boolean);
  return { assignedIds, off, available: Math.max(assignedIds.length - off.length, 0) };
}

function quoteWon(quote) {
  return ["Accepted", "Job Won"].includes(quote.status);
}

function quoteMaterialsToOrder(quoteId) {
  return db.quoteMaterials.filter(item => sameId(item.quoteId, quoteId) && item.orderStatus !== "Ordered");
}

function supplierKey(name) {
  return String(name || "Unknown supplier").trim().toLowerCase();
}

function supplierContactFor(name) {
  return db.suppliers.find(item => supplierKey(item.name) === supplierKey(name));
}

function supplierGroups(materials) {
  return materials.reduce((groups, item) => {
    const key = supplierKey(item.supplier);
    const supplier = supplierContactFor(item.supplier);
    if (!groups[key]) {
      groups[key] = {
        name: item.supplier || "Unknown supplier",
        salesRep: supplier?.salesRep || "",
        email: supplier?.email || "",
        supplierPhone: supplier?.phone || "",
        website: supplier?.website || "",
        notes: supplier?.notes || "",
        materials: []
      };
    }
    groups[key].materials.push(item);
    ["salesRep", "email", "supplierPhone", "website", "notes"].forEach(field => {
      if (!groups[key][field] && item[field]) groups[key][field] = item[field];
    });
    return groups;
  }, {});
}

function supplierDirectoryRows() {
  const groups = supplierGroups(db.quoteMaterials);
  db.suppliers.forEach(item => {
    const key = supplierKey(item.name);
    groups[key] ||= { name: item.name, salesRep: item.salesRep || "", email: item.email || "", supplierPhone: item.phone || "", website: item.website || "", notes: item.notes || "", materials: [] };
  });
  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
}

function supplierOrderDraft(job, supplier, materials) {
  const poRef = `PO-${job.number}-${String(supplier.name || "SUPPLIER").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8) || "SUPPLIER"}-${todayIso().replace(/-/g, "")}`;
  const lines = materials.map(item => {
    const qty = `${Number(item.quantity || 0) || ""}${item.unit ? ` ${item.unit}` : ""}`.trim() || "TBC";
    const code = item.supplierCode || "N/A";
    const price = Number(item.totalAmount || item.netAmount || 0) ? ` - ${money(item.totalAmount || item.netAmount)}` : "";
    return `${qty} | ${code} | ${item.materialName || "Material"}${price}`;
  }).join("\n");
  return `PURCHASE ORDER - P&A FORMA

PO reference: ${poRef}
Job reference: ${job.number}
Job/client: ${job.client}
Supplier: ${supplier.name}
FAO: ${supplier.salesRep || "Sales"}

Please process the following order:

Quantity | Supplier code | Item
${lines}

Delivery/site:
${job.address || "TBC"}

Please confirm availability, lead time, and expected delivery date by return email.

Regards
P&A Forma`;
}

function mailtoLink(email, subject, body, label = "Draft email") {
  if (!email) return `<button class="mini-button" type="button" disabled>No email</button>`;
  return `<a class="mini-button" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">${escapeHtml(label)}</a>`;
}

function wonQuoteForJob(jobId) {
  return db.quotes.find(quote => sameId(quote.jobId, jobId) && quoteWon(quote));
}

function uniqueJobNumber(base) {
  const cleanBase = String(base || "Won Quote").trim().replace(/\s+/g, " ").slice(0, 60) || "Won Quote";
  const existing = new Set(db.jobs.map(job => String(job.number || "").toLowerCase()));
  if (!existing.has(cleanBase.toLowerCase())) return cleanBase;
  let index = 2;
  while (existing.has(`${cleanBase}-${index}`.toLowerCase())) index += 1;
  return `${cleanBase}-${index}`;
}

async function ensureJobForWonQuote(quote) {
  if (!quoteWon(quote)) return null;
  let job = db.jobs.find(item => sameId(item.id, quote.jobId));
  if (!job) {
    job = {
      id: crypto.randomUUID(),
      number: uniqueJobNumber(quote.jobName || quote.company || quote.description || "Won Quote"),
      client: quote.company || quote.contactName || "Quote won",
      contractor: quote.contactName || "",
      address: quote.siteAddress || "",
      description: quote.description || quote.scope || "",
      status: "Upcoming",
      accommodationNeeded: quote.accommodationNeeded === true,
      start: quote.expectedStart || "",
      finish: "",
      value: Number(quote.amount || 0),
      labourBudget: 0,
      materialBudget: quoteMaterialsToOrder(quote.id).reduce((sum, item) => sum + Number(item.totalAmount || item.netAmount || 0), 0)
    };
    db.jobs.push(job);
    quote.jobId = job.id;
    await saveLocalAndRemote("jobs", job).catch(error => { toast = `Job created locally. Check Supabase sync: ${error.message}`; });
  } else {
    job.accommodationNeeded = job.accommodationNeeded || quote.accommodationNeeded === true;
    job.value = Number(job.value || 0) || Number(quote.amount || 0);
    job.materialBudget = Number(job.materialBudget || 0) || quoteMaterialsToOrder(quote.id).reduce((sum, item) => sum + Number(item.totalAmount || item.netAmount || 0), 0);
    await saveLocalAndRemote("jobs", job).catch(error => { toast = `Job updated locally. Check Supabase sync: ${error.message}`; });
  }
  await saveLocalAndRemote("quotes", quote).catch(error => { toast = `Quote linked locally. Check Supabase sync: ${error.message}`; });
  return job;
}

function notifications() {
  const items = [];
  db.planner.filter(item => item.status !== "Done" && daysUntil(item.date) <= 3).forEach(item => {
    const diff = daysUntil(item.date);
    items.push({ tone: diff < 0 ? "urgent" : diff === 0 ? "active" : "soon", source: "Planner", date: item.date, title: item.title, detail: `${item.type} - ${jobLabel(item.jobId)}${item.time ? ` at ${item.time}` : ""}` });
  });
  db.cnc.filter(item => item.status !== "Complete" && item.requiredBy && daysUntil(item.requiredBy) <= 3).forEach(item => {
    const diff = daysUntil(item.requiredBy);
    items.push({ tone: diff < 0 ? "urgent" : "soon", source: "CNC", date: item.requiredBy, title: item.title, detail: `${item.status} - ${jobLabel(item.jobId)}` });
  });
  db.invoices.filter(item => item.status !== "Paid" && item.dueDate && daysUntil(item.dueDate) <= 0).forEach(item => {
    items.push({ tone: "urgent", source: "Invoice", date: item.dueDate, title: item.description, detail: `${jobLabel(item.jobId)} - ${money(receivedAmount(item))} due` });
  });
  db.quotes.filter(item => item.status !== "Accepted" && item.status !== "Declined" && item.followUpDate && daysUntil(item.followUpDate) <= 1).forEach(item => {
    const diff = daysUntil(item.followUpDate);
    items.push({ tone: diff < 0 ? "urgent" : "soon", source: "Quote", date: item.followUpDate, title: item.company || item.description, detail: `${item.contactName || "Contact"} - ${money(item.amount)} follow up` });
  });
  db.quotes.filter(quoteWon).forEach(item => {
    const toOrder = quoteMaterialsToOrder(item.id);
    if (!toOrder.length) return;
    items.push({ tone: "urgent", source: "Quote", date: todayIso(), title: `${item.company || item.description} won`, detail: `${toOrder.length} quote material${toOrder.length === 1 ? "" : "s"} to order` });
  });
  db.jobs.filter(job => job.accommodationNeeded && !jobAccommodationLogged(job.id)).forEach(job => {
    items.push({ tone: "soon", source: "Accommodation", date: todayIso(), title: `${job.number} - ${job.client}`, detail: "Accommodation needed but no accommodation cost has been logged" });
  });
  const pendingHolidayCount = visibleHolidayRows().filter(item => item.status === "Pending").length;
  if (pendingHolidayCount) items.push({ tone: "soon", source: "Holiday", date: todayIso(), title: `${pendingHolidayCount} holiday request${pendingHolidayCount === 1 ? "" : "s"} pending`, detail: "Review Timesheets holiday requests" });
  visibleHolidayRows().filter(item => item.status === "Approved" && daysUntil(item.startDate) <= 7 && daysUntil(item.endDate || item.startDate) >= 0).forEach(item => {
    items.push({ tone: daysUntil(item.startDate) <= 1 ? "soon" : "active", source: "Holiday", date: item.startDate, title: `${item.userName} off`, detail: `${Number(item.days || 0).toFixed(1)} day(s), ${item.startDate} to ${item.endDate}` });
  });
  db.planner.filter(item => !ownTimesheetsOnly() && item.status !== "Done" && plannerAssignedIds(item).length && daysUntil(item.date) <= 14).forEach(item => {
    const staffing = plannerUnderstaffing(item);
    if (!staffing.off.length) return;
    items.push({
      tone: staffing.available === 0 ? "urgent" : "soon",
      source: "Staffing",
      date: item.date,
      title: `${item.title} understaffed`,
      detail: `${staffing.off.map(row => row.userName).join(", ")} off. ${staffing.available}/${staffing.assignedIds.length} assigned available for ${jobLabel(item.jobId)}`
    });
  });
  const wagesDue = db.timesheets.filter(row => row.payrollStatus !== "Paid" && Number(row.hours || 0) > 0);
  if (wagesDue.length) items.push({ tone: "soon", source: "Payroll", date: todayIso(), title: `${wagesDue.length} wage entries due`, detail: "Review Team & Payroll" });
  return items.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function badge(text, tone = "") {
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
}

function table(headers, rows) {
  if (!rows.length) return `<p class="note">Nothing here yet.</p>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function actionButtons(type, id) {
  return `<div class="row-actions"><button class="mini-button" data-edit-record="${type}:${id}">Edit</button><button class="mini-button danger-button" data-delete-record="${type}:${id}">Remove</button></div>`;
}

function jobActionButtons(id) {
  return `<div class="row-actions"><button class="primary-button mini-button" data-view-job="${id}">Open Job</button><button class="mini-button" data-edit-record="job:${id}">Edit</button><button class="mini-button danger-button" data-delete-record="job:${id}">Remove</button></div>`;
}

function panel(title, body) {
  return `<section class="panel"><div class="panel-head"><h2>${title}</h2></div>${body}</section>`;
}

function metric(label, value, tone = "") {
  return `<article class="metric ${tone}"><span>${label}</span><strong>${value}</strong></article>`;
}

function render() {
  document.body.classList.toggle("logged-out", !session);
  if (!session) {
    document.getElementById("nav").innerHTML = "";
    document.getElementById("pageTitle").textContent = "Sign In";
    document.getElementById("sessionBar").innerHTML = "";
    document.getElementById("app").innerHTML = renderLogin();
    renderToast();
    return;
  }

  if (!canView(currentView)) currentView = roleConfig().views[0];
  document.getElementById("nav").innerHTML = roleConfig().views.map(view => `<button class="nav-button ${currentView === view ? "active" : ""}" data-view="${view}">${viewLabels[view]}</button>`).join("");
  document.getElementById("pageTitle").textContent = viewLabels[currentView];
  document.getElementById("sessionBar").innerHTML = `<div class="session-bar"><strong>${roles[session.role].label}</strong><span class="note">${escapeHtml(session.name)}</span><button class="mini-button" data-sign-out>Sign out</button></div>`;
  document.getElementById("app").innerHTML = ({
    dashboard: renderDashboard,
    notifications: renderNotifications,
    planner: renderPlanner,
    jobs: renderJobs,
    quotes: renderQuotes,
    team: renderTeam,
    cnc: renderCnc,
    timesheets: renderTimesheets,
    holidays: renderHolidays,
    invoices: renderInvoices,
    payments: renderPayments,
    accommodation: renderAccommodation,
    "shared-costs": renderSharedCosts,
    cashflow: renderCashflow,
    reports: renderReports,
    settings: renderSettings
  })[currentView]();
  renderToast();
}

function renderLogin() {
  return `<div class="login-shell">
    <article class="login-card">
      <p class="eyebrow">Live SOP</p>
      <h2>Sign in by role</h2>
      <p class="note">Use PIN 2468 for office roles. Site demo PIN is 1001.</p>
      <form class="form-grid" data-login>
        <label><span>User</span><select name="userId">${db.users.map(user => `<option value="${user.id}">${escapeHtml(user.name)} - ${roles[user.role].label}</option>`).join("")}</select></label>
        <label><span>PIN</span><input name="pin" type="password" inputmode="numeric"></label>
        <div class="inline-actions wide"><button class="primary-button">Sign in</button></div>
      </form>
    </article>
    <article class="login-card">
      <p class="eyebrow">Next phase</p>
      <h2>Database ready</h2>
      <p class="note">This build runs locally now and is shaped for Supabase tables, auth policies, and cloud file storage.</p>
    </article>
  </div>`;
}

function renderDashboard() {
  const openCnc = db.cnc.filter(item => item.status !== "Complete");
  const signedIn = db.timesheets.filter(item => item.date === todayIso() && item.signIn && !item.signOut);
  const alerts = notifications();
  return `<div class="metric-grid">
    ${metric("Live jobs", db.jobs.length)}
    ${metric("Open CNC", openCnc.length, openCnc.length ? "soon" : "healthy")}
    ${metric("Signed in now", signedIn.length, signedIn.length ? "active" : "")}
    ${metric("Notifications", alerts.length, alerts.length ? "soon" : "healthy")}
    ${session.role === "director" ? metric("Cash position", money(paidInTotal() - paidOutTotal()), paidInTotal() - paidOutTotal() < 0 ? "urgent" : "healthy") : ""}
  </div>
  <div class="two-col">
    ${panel("Today Sign Ins", table(["Man", "Job", "In", "Location"], signedIn.map(row => [escapeHtml(row.userName), escapeHtml(jobLabel(row.jobId)), row.signIn, locationLabel(row.signInLocation)])))}
    ${panel("Notifications", notificationTable(alerts.slice(0, 8)))}
    ${panel("CNC Needs Attention", table(["Job", "Title", "Status", "Due"], openCnc.slice(0, 8).map(item => [jobLabel(item.jobId), escapeHtml(item.title), badge(item.status, item.status === "Complete" ? "healthy" : "soon"), item.requiredBy || "-"])))}
  </div>`;
}

function notificationTable(items) {
  return table(["Source", "Date", "Title", "Detail", "Action"], items.map(item => {
    const target = notificationTarget(item);
    return [badge(item.source, item.tone), item.date || "-", escapeHtml(item.title), escapeHtml(item.detail), `<button class="mini-button" data-notification-target="${target.view}:${target.section}">Open</button>`];
  }));
}

function notificationTarget(item) {
  return {
    Planner: { view: "planner", section: "calendar" },
    CNC: { view: "cnc", section: "tracker" },
    Invoice: { view: "invoices", section: "register" },
    Quote: { view: "quotes", section: "suppliers" },
    Accommodation: { view: "accommodation", section: "add" },
    Holiday: { view: "holidays", section: "viewer" },
    Staffing: { view: "planner", section: "staffing" },
    Payroll: { view: "team", section: "payroll" }
  }[item.source] || { view: "notifications", section: "" };
}

function renderNotifications() {
  const alerts = notifications();
  return `<section class="section-head"><div><h2>Notifications</h2><p class="note">Live alerts from planner, CNC due dates, invoices, and payroll.</p></div></section>
  <div class="metric-grid">
    ${metric("Total alerts", alerts.length, alerts.length ? "soon" : "healthy")}
    ${metric("Urgent", alerts.filter(item => item.tone === "urgent").length, alerts.some(item => item.tone === "urgent") ? "urgent" : "")}
    ${metric("Due today", alerts.filter(item => item.date === todayIso()).length, alerts.some(item => item.date === todayIso()) ? "active" : "")}
  </div>
  ${panel("Notification Feed", notificationTable(alerts))}`;
}

function renderPlanner() {
  const section = activeSection("planner", "calendar");
  const editing = db.planner.find(item => isEditing("planner", item.id));
  const rows = [...db.planner].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const monthStart = new Date(`${plannerMonth}-01T00:00:00`);
  const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return `<section class="section-head"><div><h2>Planner</h2><p class="note">Plan site visits, CNC work, invoice follow-ups, deliveries, and reminders.</p></div></section>
  ${sectionSwitcher("planner", [{ key: "calendar", label: "Calendar" }, { key: "register", label: "Planner Register" }, { key: "add", label: "Add Item" }, { key: "holidays", label: "Holiday Cover" }, { key: "staffing", label: "Staffing Warnings" }])}
  ${editPanel("planner", editing, plannerFields(editing))}
  ${section === "add" ? addPanel("planner", "Add Planner Item", `<form class="form-grid" data-add-planner>${plannerFields()}<div class="inline-actions wide"><button class="primary-button">Add planner item</button></div></form>`, "Add planner item") : ""}
  ${section === "calendar" ? panel("Calendar", `<div class="calendar-toolbar"><button class="secondary-button" data-planner-month="-1">Previous</button><strong>${monthLabel}</strong><button class="secondary-button" data-planner-today>Today</button><button class="secondary-button" data-planner-month="1">Next</button></div>${renderPlannerCalendar(monthStart)}`) : ""}
  ${section === "holidays" ? panel("Approved Holidays On Planner", table(["Man", "Start", "End", "Days", "Status"], approvedPlannerHolidays().map(item => [escapeHtml(item.userName), escapeHtml(item.startDate), escapeHtml(item.endDate), Number(item.days || 0).toFixed(1), badge("Approved", "healthy")]))) : ""}
  ${section === "staffing" ? panel("Understaffing Warnings", table(["Date", "Job", "Planner item", "Assigned", "Off", "Available"], understaffedPlannerRows().map(row => [row.date, jobLabel(row.jobId), escapeHtml(row.title), row.assigned, row.off, badge(row.available, row.available.startsWith("0/") ? "urgent" : "soon")]))) : ""}
  ${section === "register" ? panel("Planner", table(["Date", "Time", "Type", "Job", "Assigned", "Available", "Title", "Priority", "Status", "Action"], rows.map(item => {
    const staffing = plannerUnderstaffing(item);
    return [item.date, item.time || "-", badge(item.type, item.type === "CNC" ? "active" : ""), jobLabel(item.jobId), assignedUsersLabel(item), staffing.assignedIds.length ? badge(`${staffing.available}/${staffing.assignedIds.length}`, staffing.off.length ? "soon" : "healthy") : "-", escapeHtml(item.title), badge(item.priority, item.priority === "Urgent" ? "urgent" : item.priority === "High" ? "soon" : ""), badge(item.status, item.status === "Done" ? "healthy" : "soon"), actionButtons("planner", item.id)];
  }))) : ""}`;
}

function approvedPlannerHolidays() {
  return db.holidays
    .filter(item => item.status === "Approved" && daysUntil(item.endDate || item.startDate) >= -7)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

function understaffedPlannerRows() {
  return db.planner
    .filter(item => item.status !== "Done" && plannerAssignedIds(item).length)
    .map(item => {
      const staffing = plannerUnderstaffing(item);
      return {
        ...item,
        assigned: `${staffing.assignedIds.length}`,
        off: staffing.off.map(row => row.userName).join(", "),
        available: `${staffing.available}/${staffing.assignedIds.length}`,
        offCount: staffing.off.length
      };
    })
    .filter(item => item.offCount)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function shiftMonth(monthValue, offset) {
  const date = new Date(`${monthValue}-01T00:00:00`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function renderPlannerCalendar(monthStart) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDayOffset = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const headings = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - firstDayOffset + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return `<div class="calendar-day muted-day"></div>`;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const items = db.planner.filter(item => item.date === date).sort((a, b) => String(a.time).localeCompare(String(b.time)));
    const holidays = approvedHolidaysOnDate(date);
    return `<div class="calendar-day ${date === todayIso() ? "today" : ""}">
      <div class="calendar-date">${dayNumber}</div>
      <div class="calendar-items">
        ${holidays.map(item => `<div class="calendar-item holiday"><strong>Holiday ${Number(item.days || 0).toFixed(1)}d</strong><span>${escapeHtml(item.userName)} off</span></div>`).join("")}
        ${items.map(item => {
          const staffing = plannerUnderstaffing(item);
          const tone = staffing.off.length ? "urgent" : item.priority === "Urgent" ? "urgent" : item.priority === "High" ? "soon" : "";
          const offText = staffing.off.length ? ` (${staffing.off.length} off)` : "";
          return `<button class="calendar-item ${tone}" data-edit-record="planner:${item.id}"><strong>${escapeHtml(item.time || item.type)}${offText}</strong><span>${escapeHtml(item.title)}</span></button>`;
        }).join("")}
      </div>
    </div>`;
  }).join("");
  return `<div class="calendar-grid">${headings.map(day => `<div class="calendar-heading">${day}</div>`).join("")}${cells}</div>`;
}

function plannerFields(item = {}) {
  return `
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions(item.jobId || "")}</select></label>
    <label><span>Assigned men</span><select name="userIds" multiple size="5">${userOptionsMultiple(item.userIds || (item.userId ? [item.userId] : []))}</select></label>
    <label><span>Type</span><select name="type">${selectOptions(["Task", "Site Visit", "CNC", "Delivery", "Invoice Follow-up", "Reminder"], item.type || "Task")}</select></label>
    <label><span>Priority</span><select name="priority">${selectOptions(["Normal", "High", "Urgent"], item.priority || "Normal")}</select></label>
    <label><span>Date</span><input name="date" type="date" value="${escapeHtml(item.date || todayIso())}" required></label>
    <label><span>Time</span><input name="time" type="time" value="${escapeHtml(item.time || "")}"></label>
    <label class="wide"><span>Title</span><input name="title" value="${escapeHtml(item.title || "")}" required></label>
    <label><span>Status</span><select name="status">${selectOptions(["Open", "In Progress", "Done"], item.status || "Open")}</select></label>
    <label class="wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(item.notes || "")}</textarea></label>
  `;
}

function renderJobs() {
  const selectedJob = db.jobs.find(job => sameId(job.id, selectedJobId));
  if (selectedJob) return renderJobDetail(selectedJob);
  const section = activeSection("jobs", "register");
  const editing = db.jobs.find(job => isEditing("job", job.id));
  const jobIds = new Set(db.jobs.map(job => job.id));
  const validMaterials = db.jobMaterials.filter(item => item.jobId && jobIds.has(item.jobId));
  const materialNet = validMaterials.reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
  const materialVat = validMaterials.reduce((sum, item) => sum + Number(item.vatAmount || 0), 0);
  return `<section class="section-head"><div><h2>Jobs</h2><p class="note">Live job register for role workspaces.</p></div></section>
  <div class="metric-grid">
    ${metric("Materials net", money(materialNet))}
    ${metric("Materials VAT", money(materialVat))}
    ${metric("Materials total", money(materialNet + materialVat), materialNet + materialVat ? "soon" : "")}
  </div>
  ${sectionSwitcher("jobs", [{ key: "register", label: "Job Register" }, { key: "add", label: "Add Job" }, { key: "import", label: "Import CSV" }])}
  ${editPanel("job", editing, `
    <label><span>Job number</span><input name="number" value="${escapeHtml(editing?.number || "")}" required></label>
    <label><span>Client</span><input name="client" value="${escapeHtml(editing?.client || "")}" required></label>
    <label><span>Main contractor</span><input name="contractor" value="${escapeHtml(editing?.contractor || "")}"></label>
    <label><span>Status</span><select name="status">${selectOptions(["Live", "Upcoming", "On Site", "In Production", "Complete"], editing?.status || "Live")}</select></label>
    <label><span>Accommodation needed</span><select name="accommodationNeeded"><option value="false" ${editing?.accommodationNeeded ? "" : "selected"}>No</option><option value="true" ${editing?.accommodationNeeded ? "selected" : ""}>Yes</option></select></label>
    <label class="wide"><span>Site address</span><input name="address" value="${escapeHtml(editing?.address || "")}"></label>
    <label class="wide"><span>Description</span><input name="description" value="${escapeHtml(editing?.description || "")}"></label>
    <label><span>Start</span><input name="start" type="date" value="${escapeHtml(editing?.start || "")}"></label>
    <label><span>Finish</span><input name="finish" type="date" value="${escapeHtml(editing?.finish || "")}"></label>
    <label><span>Value</span><input name="value" type="number" step="0.01" value="${Number(editing?.value || 0)}"></label>
    <label><span>Labour budget hours</span><input name="labourBudget" type="number" step="0.25" value="${Number(editing?.labourBudget || 0)}"></label>
    <label><span>Material budget</span><input name="materialBudget" type="number" step="0.01" value="${Number(editing?.materialBudget || 0)}"></label>
  `)}
  ${section === "add" ? addPanel("job", "Add Job", `<form class="form-grid" data-add-job>
    <label><span>Job number</span><input name="number" required></label>
    <label><span>Client</span><input name="client" required></label>
    <label><span>Main contractor</span><input name="contractor"></label>
    <label><span>Status</span><select name="status"><option>Live</option><option>Upcoming</option><option>On Site</option><option>In Production</option><option>Complete</option></select></label>
    <label><span>Accommodation needed</span><select name="accommodationNeeded"><option value="false">No</option><option value="true">Yes</option></select></label>
    <label class="wide"><span>Site address</span><input name="address"></label>
    <label class="wide"><span>Description</span><input name="description"></label>
    <label><span>Start</span><input name="start" type="date"></label>
    <label><span>Finish</span><input name="finish" type="date"></label>
    <label><span>Value</span><input name="value" type="number"></label>
    <label><span>Labour budget hours</span><input name="labourBudget" type="number"></label>
    <label><span>Material budget</span><input name="materialBudget" type="number"></label>
    <div class="inline-actions wide"><button class="primary-button">Add job</button></div>
  </form>`, "Add job") : ""}
  ${section === "import" ? csvImportPanel("jobs", "Import Jobs CSV", "job_number, client, contractor, address, description, status, start, finish, value, labour_budget, material_budget, accommodation_needed") : ""}
  ${section === "register" ? panel("Job Register", table(["Number", "Client", "Contractor", "Dates", "Status", "Accommodation", "Value", "Hours", "Labour cost", "Materials", "Paid out", "Committed cost", "Margin", "Paid in", "Action"], db.jobs.map(job => {
    const invoices = db.invoices.filter(invoice => sameId(invoice.jobId, job.id));
    const paid = invoices.filter(invoice => invoice.status === "Paid").reduce((sum, invoice) => sum + receivedAmount(invoice), 0);
    const costs = jobCostSummary(job.id);
    const margin = Number(job.value || 0) - costs.committedCost;
    return [`<button class="text-button" data-view-job="${job.id}">${escapeHtml(job.number)}</button>`, `<button class="text-button" data-view-job="${job.id}">${escapeHtml(job.client)}</button>`, escapeHtml(job.contractor || "-"), `${job.start || "-"} - ${job.finish || "-"}`, badge(job.status, job.status === "Complete" ? "healthy" : "active"), badge(job.accommodationNeeded ? "Yes" : "No", job.accommodationNeeded && !jobAccommodationLogged(job.id) ? "soon" : ""), money(job.value), costs.labourHours.toFixed(1), money(costs.labourCost), money(costs.materialCost), money(costs.actualPaid), money(costs.committedCost), badge(money(margin), margin < 0 ? "urgent" : "healthy"), money(paid), jobActionButtons(job.id)];
  }))) : ""}
  `;
}

function renderJobDetail(job) {
  const costs = jobCostSummary(job.id);
  const paidIn = db.invoices.filter(invoice => sameId(invoice.jobId, job.id) && invoice.status === "Paid").reduce((sum, invoice) => sum + receivedAmount(invoice), 0);
  const margin = Number(job.value || 0) - costs.committedCost;
  const editing = isEditing("job", job.id) ? job : null;
  const editingMaterial = db.jobMaterials.find(item => isEditing("jobMaterial", item.id));
  const editingQuoteMaterial = db.quoteMaterials.find(item => isEditing("quoteMaterial", item.id));
  const wonQuote = wonQuoteForJob(job.id);
  const quoteMaterials = wonQuote ? quoteMaterialsToOrder(wonQuote.id) : [];
  const orderGroups = Object.values(supplierGroups(quoteMaterials));
  return `<section class="section-head"><div><h2>${escapeHtml(job.number)} - ${escapeHtml(job.client)}</h2><p class="note">${escapeHtml(job.address || "Job detail")}</p></div><button class="secondary-button" data-back-jobs>Back to jobs</button></section>
  <div class="metric-grid">
    ${metric("Job value", money(job.value))}
    ${metric("Labour cost", money(costs.labourCost))}
    ${metric("Materials", money(costs.materialCost), costs.materialCost ? "soon" : "")}
    ${metric("Paid out", money(costs.actualPaid))}
    ${metric("Committed cost", money(costs.committedCost))}
    ${metric("Margin", money(margin), margin < 0 ? "urgent" : "healthy")}
    ${metric("Paid in", money(paidIn))}
  </div>
  ${editPanel("job", editing, `
    <label><span>Job number</span><input name="number" value="${escapeHtml(editing?.number || "")}" required></label>
    <label><span>Client</span><input name="client" value="${escapeHtml(editing?.client || "")}" required></label>
    <label><span>Main contractor</span><input name="contractor" value="${escapeHtml(editing?.contractor || "")}"></label>
    <label><span>Status</span><select name="status">${selectOptions(["Live", "Upcoming", "On Site", "In Production", "Complete"], editing?.status || "Live")}</select></label>
    <label><span>Accommodation needed</span><select name="accommodationNeeded"><option value="false" ${editing?.accommodationNeeded ? "" : "selected"}>No</option><option value="true" ${editing?.accommodationNeeded ? "selected" : ""}>Yes</option></select></label>
    <label class="wide"><span>Site address</span><input name="address" value="${escapeHtml(editing?.address || "")}"></label>
    <label class="wide"><span>Description</span><input name="description" value="${escapeHtml(editing?.description || "")}"></label>
    <label><span>Start</span><input name="start" type="date" value="${escapeHtml(editing?.start || "")}"></label>
    <label><span>Finish</span><input name="finish" type="date" value="${escapeHtml(editing?.finish || "")}"></label>
    <label><span>Value</span><input name="value" type="number" step="0.01" value="${Number(editing?.value || 0)}"></label>
    <label><span>Labour budget hours</span><input name="labourBudget" type="number" step="0.25" value="${Number(editing?.labourBudget || 0)}"></label>
    <label><span>Material budget</span><input name="materialBudget" type="number" step="0.01" value="${Number(editing?.materialBudget || 0)}"></label>
  `)}
  ${panel("Job Details", `<div class="detail-grid">
    <div><span class="note">Main contractor</span><strong>${escapeHtml(job.contractor || "-")}</strong></div>
    <div><span class="note">Status</span><strong>${escapeHtml(job.status)}</strong></div>
    <div><span class="note">Accommodation needed</span><strong>${job.accommodationNeeded ? (jobAccommodationLogged(job.id) ? "Yes - logged" : "Yes - not logged") : "No"}</strong></div>
    <div><span class="note">Dates</span><strong>${escapeHtml(job.start || "-")} - ${escapeHtml(job.finish || "-")}</strong></div>
    <div><span class="note">Description</span><strong>${escapeHtml(job.description || "-")}</strong></div>
  </div><div class="inline-actions"><button class="secondary-button" data-edit-record="job:${job.id}">Edit job</button></div>`)}
  ${quoteMaterials.length ? panel("Materials To Order From Quote", table(["Material", "Qty", "Supplier", "Code", "Cost", "Reference", "Status", "Action"], quoteMaterials.map(item => [
    `<button class="text-button" data-edit-record="quoteMaterial:${item.id}">${escapeHtml(item.materialName || "-")}</button>`,
    `${Number(item.quantity || 0) || "-"} ${escapeHtml(item.unit || "")}`,
    escapeHtml(item.supplier || "-"),
    escapeHtml(item.supplierCode || "-"),
    money(item.totalAmount || item.netAmount),
    escapeHtml(item.referenceFile || "-"),
    badge(item.orderStatus || "To order", "urgent"),
    actionButtons("quoteMaterial", item.id)
  ]))) : ""}
  ${orderGroups.length ? panel("Supplier Purchase Orders", table(["Supplier", "Contact", "Materials", "Purchase order"], orderGroups.map(group => [
    escapeHtml(group.name),
    `${escapeHtml(group.salesRep || "-")}<br>${group.email ? `<a href="mailto:${escapeHtml(group.email)}">${escapeHtml(group.email)}</a>` : "-"}<br><span class="note">${escapeHtml(group.supplierPhone || group.website || "")}</span>`,
    group.materials.map(item => `${escapeHtml(item.materialName || "-")} (${Number(item.quantity || 0) || "-"} ${escapeHtml(item.unit || "")}${item.supplierCode ? `, ${escapeHtml(item.supplierCode)}` : ""})`).join("<br>"),
    mailtoLink(group.email, `Purchase Order - ${job.number} - ${job.client}`, supplierOrderDraft(job, group, group.materials), "Create PO email")
  ]))) : ""}
  ${editPanel("quoteMaterial", editingQuoteMaterial, quoteMaterialFields(editingQuoteMaterial))}
  ${editPanel("jobMaterial", editingMaterial, `
    <label><span>Job</span><select name="jobId">${jobOptions(editingMaterial?.jobId || "")}</select></label>
    <label><span>Material</span><input name="materialName" value="${escapeHtml(editingMaterial?.materialName || "")}" required></label>
    <label><span>Supplier</span><input name="supplier" value="${escapeHtml(editingMaterial?.supplier || "")}" required></label>
    <label><span>Purchase date</span><input name="purchaseDate" type="date" value="${escapeHtml(editingMaterial?.purchaseDate || todayIso())}"></label>
    <label><span>Net cost</span><input name="netAmount" type="number" step="0.01" value="${Number(editingMaterial?.netAmount || 0)}"></label>
    <label><span>VAT cost</span><input name="vatAmount" type="number" step="0.01" value="${Number(editingMaterial?.vatAmount || 0)}"></label>
    <label><span>Proof upload</span><input name="proof" type="file" accept="image/*,.pdf"></label>
    <input type="hidden" name="existingProofFile" value="${escapeHtml(editingMaterial?.proofFile || "")}">
    <p class="note">Current proof: ${escapeHtml(editingMaterial?.proofFile || "None uploaded")}</p>
    <label class="wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(editingMaterial?.notes || "")}</textarea></label>
    <label><span>Payment status</span><select name="paymentStatus">${selectOptions(["Pending", "Paid"], linkedMaterialPayment(editingMaterial)?.status || "Pending")}</select></label>
  `)}
  ${renderJobMaterialsForJob(job)}`;
}

function renderJobMaterialsForJob(job) {
  const rows = db.jobMaterials
    .filter(item => sameId(item.jobId, job.id))
    .sort((a, b) => String(b.purchaseDate || "").localeCompare(String(a.purchaseDate || "")));
  const net = rows.reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
  const vat = rows.reduce((sum, item) => sum + Number(item.vatAmount || 0), 0);
  return panel("Materials", `
      <div class="metric-grid">
        ${metric("Net", money(net))}
        ${metric("VAT", money(vat))}
        ${metric("Total", money(net + vat), net + vat ? "soon" : "")}
      </div>
      ${addPanel(`job-material-${job.id}`, "Add Material To Job", `<form class="form-grid" data-add-job-material>
        <input type="hidden" name="jobId" value="${job.id}">
        <label><span>Material</span><input name="materialName" required></label>
        <label><span>Supplier</span><input name="supplier" required></label>
        <label><span>Purchase date</span><input name="purchaseDate" type="date" value="${todayIso()}"></label>
        <label><span>Net cost</span><input name="netAmount" type="number" step="0.01"></label>
        <label><span>VAT cost</span><input name="vatAmount" type="number" step="0.01"></label>
        <label><span>Payment status</span><select name="paymentStatus"><option>Pending</option><option>Paid</option></select></label>
        <label><span>Proof upload</span><input name="proof" type="file" accept="image/*,.pdf"></label>
        <label class="wide"><span>Notes</span><textarea name="notes" rows="3"></textarea></label>
        <div class="inline-actions wide">
          <button class="primary-button" name="afterSave" value="another">Save material & add another</button>
          <button class="secondary-button" name="afterSave" value="close">Save material & close</button>
        </div>
      </form>`, "Add material")}
      ${table(["Purchase date", "Material", "Supplier", "Net", "VAT", "Total", "Payment", "Proof", "Notes", "Action"], rows.map(item => {
          const payment = linkedMaterialPayment(item);
          return [
            escapeHtml(item.purchaseDate || "-"),
            escapeHtml(item.materialName || "-"),
            escapeHtml(item.supplier || "-"),
            money(item.netAmount),
            money(item.vatAmount),
            money(materialTotal(item)),
            badge(payment?.status || "Pending", payment?.status === "Paid" ? "healthy" : "soon"),
            escapeHtml(item.proofFile || "-"),
            escapeHtml(item.notes || "-"),
            actionButtons("jobMaterial", item.id)
          ];
      }))}
    `);
}

function quoteMaterialLineFields() {
  return `<div class="quote-material-line" data-quote-material-line>
    <div class="quote-material-line-head">
      <strong>Material line</strong>
      <button class="mini-button danger-button" type="button" data-remove-quote-material-line>Remove</button>
    </div>
    <div class="quote-material-line-grid">
      <label><span>Item name</span><input data-material-field="materialName" placeholder="Board, edging, fittings"></label>
      <label><span>Quantity</span><input data-material-field="quantity" type="number" step="0.01" data-calc-quantity></label>
      <label><span>Unit</span><input data-material-field="unit" placeholder="sheets / lm / item"></label>
      <label><span>Unit price</span><input data-material-field="unitPrice" type="number" step="0.01" data-calc-unit-price></label>
      <label><span>Total</span><input data-material-field="totalAmount" type="number" step="0.01" readonly data-calc-total></label>
      <label><span>Supplier</span><input data-material-field="supplier"></label>
      <label><span>Supplier code</span><input data-material-field="supplierCode"></label>
      <label><span>Supplier quote / picture</span><input data-material-field="reference" type="file" accept="image/*,.pdf"></label>
    </div>
  </div>`;
}

function collectQuoteMaterialLines(form) {
  return [...form.querySelectorAll("[data-quote-material-line]")].map(line => {
    const field = name => line.querySelector(`[data-material-field="${name}"]`);
    const file = field("reference")?.files?.[0];
    const quantity = Number(field("quantity")?.value || 0);
    const unitPrice = Number(field("unitPrice")?.value || 0);
    const totalAmount = materialLineTotal(quantity, unitPrice, field("totalAmount")?.value || 0);
    return {
      materialName: field("materialName")?.value.trim() || "",
      supplier: field("supplier")?.value.trim() || "",
      supplierCode: field("supplierCode")?.value.trim() || "",
      quantity,
      unit: field("unit")?.value.trim() || "",
      unitPrice,
      netAmount: totalAmount,
      vatAmount: 0,
      totalAmount,
      referenceFile: file?.name || ""
    };
  }).filter(item => item.materialName || item.supplier || item.totalAmount);
}

function quoteMaterialFields(item = {}) {
  return `
    <label><span>Linked quote</span><select name="quoteId"><option value="">General supplier</option>${quoteOptions(item.quoteId || "")}</select></label>
    <label><span>Material</span><input name="materialName" value="${escapeHtml(item.materialName || "")}" required></label>
    <label><span>Supplier</span><input name="supplier" value="${escapeHtml(item.supplier || "")}" required></label>
    <label><span>Supplier code</span><input name="supplierCode" value="${escapeHtml(item.supplierCode || "")}"></label>
    <label><span>Sales rep</span><input name="salesRep" value="${escapeHtml(item.salesRep || "")}"></label>
    <label><span>Rep phone</span><input name="supplierPhone" value="${escapeHtml(item.supplierPhone || "")}"></label>
    <label><span>Website</span><input name="website" value="${escapeHtml(item.website || "")}"></label>
    <label><span>Email</span><input name="email" type="email" value="${escapeHtml(item.email || "")}"></label>
    <label><span>Quantity</span><input name="quantity" type="number" step="0.01" value="${Number(item.quantity || 0)}" data-calc-quantity></label>
    <label><span>Unit</span><input name="unit" value="${escapeHtml(item.unit || "")}" placeholder="sheets / lm / item"></label>
    <label><span>Unit price</span><input name="unitPrice" type="number" step="0.01" value="${Number(item.unitPrice || 0)}" data-calc-unit-price></label>
    <label><span>Net cost</span><input name="netAmount" type="number" step="0.01" value="${Number(item.netAmount || 0)}"></label>
    <label><span>VAT cost</span><input name="vatAmount" type="number" step="0.01" value="${Number(item.vatAmount || 0)}"></label>
    <label><span>Total</span><input name="totalAmount" type="number" step="0.01" value="${materialLineTotal(item.quantity, item.unitPrice, item.totalAmount || item.netAmount)}" readonly data-calc-total></label>
    <label><span>Lead time</span><input name="leadTime" value="${escapeHtml(item.leadTime || "")}" placeholder="3 days / 2 weeks"></label>
    <label><span>Supplier quote / picture</span><input name="reference" type="file" accept="image/*,.pdf"></label>
    <input type="hidden" name="existingReferenceFile" value="${escapeHtml(item.referenceFile || "")}">
    <p class="note">Current reference: ${escapeHtml(item.referenceFile || "None uploaded")}</p>
    <label><span>Order status</span><select name="orderStatus">${selectOptions(["To order", "Quoted", "Ordered"], item.orderStatus || "To order")}</select></label>
    <label class="wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(item.notes || "")}</textarea></label>
  `;
}

function supplierFields(item = {}) {
  return `
    <label><span>Supplier name</span><input name="name" value="${escapeHtml(item.name || "")}" placeholder="Lathams / CPC / Hafele" required></label>
    <label><span>Sales rep</span><input name="salesRep" value="${escapeHtml(item.salesRep || "")}"></label>
    <label><span>Email</span><input name="email" type="email" value="${escapeHtml(item.email || "")}"></label>
    <label><span>Phone</span><input name="phone" value="${escapeHtml(item.phone || "")}"></label>
    <label><span>Website</span><input name="website" value="${escapeHtml(item.website || "")}"></label>
    <label class="wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(item.notes || "")}</textarea></label>
  `;
}

function renderQuotes() {
  const section = activeSection("quotes", "register");
  const editing = db.quotes.find(quote => isEditing("quote", quote.id));
  const editingMaterial = db.quoteMaterials.find(item => isEditing("quoteMaterial", item.id));
  const editingSupplier = db.suppliers.find(item => isEditing("supplier", item.id));
  const openQuotes = db.quotes.filter(quote => quote.status !== "Accepted" && quote.status !== "Declined");
  const followUpsDue = openQuotes.filter(quote => quote.followUpDate && daysUntil(quote.followUpDate) <= 0).length;
  return `<section class="section-head"><div><h2>Quotes</h2><p class="note">Track quote values, contact details, and follow-up dates before they become live jobs.</p></div></section>
  <div class="metric-grid">
    ${metric("Quotes open", openQuotes.length)}
    ${metric("Open quote value", money(openQuotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0)))}
    ${metric("Follow ups due", followUpsDue, followUpsDue ? "soon" : "")}
  </div>
  ${sectionSwitcher("quotes", [{ key: "register", label: "Quote Register" }, { key: "add", label: "Add Quote" }, { key: "suppliers", label: "Materials / Suppliers" }, { key: "supplierDb", label: "Supplier Database" }, { key: "addSupplier", label: "Add Supplier" }])}
  ${editPanel("supplier", editingSupplier, supplierFields(editingSupplier))}
  ${editPanel("quote", editing, `
    <label><span>Linked job</span><select name="jobId"><option value="">Not linked</option>${jobOptions(editing?.jobId || "")}</select></label>
    <label><span>Company / client</span><input name="company" value="${escapeHtml(editing?.company || "")}" required></label>
    <label><span>Contact name</span><input name="contactName" value="${escapeHtml(editing?.contactName || "")}" required></label>
    <label><span>Contact role</span><input name="contactRole" value="${escapeHtml(editing?.contactRole || "")}" placeholder="QS / PM / Buyer"></label>
    <label><span>Phone</span><input name="phone" value="${escapeHtml(editing?.phone || "")}"></label>
    <label><span>Email</span><input name="email" type="email" value="${escapeHtml(editing?.email || "")}"></label>
    <label><span>Lead source</span><input name="leadSource" value="${escapeHtml(editing?.leadSource || "")}" placeholder="Referral / tender / repeat client"></label>
    <label><span>Quote date</span><input name="quoteDate" type="date" value="${escapeHtml(editing?.quoteDate || todayIso())}"></label>
    <label><span>Follow up date</span><input name="followUpDate" type="date" value="${escapeHtml(editing?.followUpDate || "")}"></label>
    <label><span>Expected start</span><input name="expectedStart" type="date" value="${escapeHtml(editing?.expectedStart || "")}"></label>
    <label><span>Quote deadline</span><input name="quoteDeadline" type="date" value="${escapeHtml(editing?.quoteDeadline || "")}"></label>
    <label><span>Quote value</span><input name="amount" type="number" step="0.01" value="${Number(editing?.amount || 0)}"></label>
    <label><span>Job name</span><input name="jobName" value="${escapeHtml(editing?.jobName || "")}" placeholder="Job name once won"></label>
    <label><span>Accommodation needed</span><select name="accommodationNeeded"><option value="false" ${editing?.accommodationNeeded ? "" : "selected"}>No</option><option value="true" ${editing?.accommodationNeeded ? "selected" : ""}>Yes</option></select></label>
    <label><span>Status</span><select name="status">${selectOptions(["Lead", "Survey booked", "Pricing", "Draft", "Sent", "Follow up", "Job Won", "Accepted", "Declined"], editing?.status || "Draft")}</select></label>
    <label><span>Priority</span><select name="priority">${selectOptions(["Low", "Normal", "High", "Urgent"], editing?.priority || "Normal")}</select></label>
    <label><span>Decision maker</span><input name="decisionMaker" value="${escapeHtml(editing?.decisionMaker || "")}"></label>
    <label class="wide"><span>Site address</span><input name="siteAddress" value="${escapeHtml(editing?.siteAddress || "")}"></label>
    <label class="wide"><span>Works / description</span><input name="description" value="${escapeHtml(editing?.description || "")}" required></label>
    <label class="wide"><span>Scope / inclusions</span><textarea name="scope" rows="3">${escapeHtml(editing?.scope || "")}</textarea></label>
    <label class="wide"><span>Exclusions / risks</span><textarea name="exclusions" rows="3">${escapeHtml(editing?.exclusions || "")}</textarea></label>
    <label class="wide"><span>Next action</span><input name="nextAction" value="${escapeHtml(editing?.nextAction || "")}" placeholder="Call client, revise price, wait for drawings"></label>
    <label class="wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(editing?.notes || "")}</textarea></label>
  `)}
  ${section === "add" ? addPanel("quote", "Add Quote", `<form class="form-grid" data-add-quote>
    <label><span>Linked job</span><select name="jobId"><option value="">Not linked</option>${jobOptions()}</select></label>
    <label><span>Company / client</span><input name="company" required></label>
    <label><span>Contact name</span><input name="contactName" required></label>
    <label><span>Contact role</span><input name="contactRole" placeholder="QS / PM / Buyer"></label>
    <label><span>Phone</span><input name="phone"></label>
    <label><span>Email</span><input name="email" type="email"></label>
    <label><span>Lead source</span><input name="leadSource" placeholder="Referral / tender / repeat client"></label>
    <label><span>Quote date</span><input name="quoteDate" type="date" value="${todayIso()}"></label>
    <label><span>Follow up date</span><input name="followUpDate" type="date"></label>
    <label><span>Expected start</span><input name="expectedStart" type="date"></label>
    <label><span>Quote deadline</span><input name="quoteDeadline" type="date"></label>
    <label><span>Quote value</span><input name="amount" type="number" step="0.01"></label>
    <label><span>Job name</span><input name="jobName" placeholder="Job name once won"></label>
    <label><span>Accommodation needed</span><select name="accommodationNeeded"><option value="false">No</option><option value="true">Yes</option></select></label>
    <label><span>Status</span><select name="status">${selectOptions(["Lead", "Survey booked", "Pricing", "Draft", "Sent", "Follow up", "Job Won", "Accepted", "Declined"], "Lead")}</select></label>
    <label><span>Priority</span><select name="priority">${selectOptions(["Low", "Normal", "High", "Urgent"], "Normal")}</select></label>
    <label><span>Decision maker</span><input name="decisionMaker"></label>
    <label class="wide"><span>Site address</span><input name="siteAddress"></label>
    <label class="wide"><span>Works / description</span><input name="description" required></label>
    <label class="wide"><span>Scope / inclusions</span><textarea name="scope" rows="3"></textarea></label>
    <label class="wide"><span>Exclusions / risks</span><textarea name="exclusions" rows="3"></textarea></label>
    <label class="wide"><span>Next action</span><input name="nextAction" placeholder="Call client, revise price, wait for drawings"></label>
    <label class="wide"><span>Notes</span><textarea name="notes" rows="3"></textarea></label>
    <div class="wide quote-material-lines-shell">
      <div class="quote-material-lines-head">
        <h3>Materials required for quote</h3>
        <button class="secondary-button" type="button" data-add-quote-material-line>Add another material</button>
      </div>
      <div data-quote-material-lines>${quoteMaterialLineFields()}</div>
    </div>
    <div class="inline-actions wide"><button class="primary-button">Save quote</button></div>
  </form>`, "Add quote") : ""}
  ${section === "register" ? panel("Quote Register", table(["Quote date", "Company", "Contact", "Next action", "Description", "Value", "Follow up", "Priority", "Status", "Materials", "Action"], db.quotes.map(quote => [
    escapeHtml(quote.quoteDate || "-"),
    escapeHtml(quote.company || "-"),
    `${escapeHtml(quote.contactName || "-")}<br><span class="note">${escapeHtml(quote.phone || quote.email || quote.contactRole || "-")}</span>`,
    escapeHtml(quote.nextAction || "-"),
    escapeHtml(quote.description || "-"),
    money(quote.amount),
    quote.followUpDate ? escapeHtml(quote.followUpDate) : "-",
    badge(quote.priority || "Normal", quote.priority === "Urgent" ? "urgent" : quote.priority === "High" ? "soon" : ""),
    badge(quote.status || "Draft", quoteWon(quote) ? "healthy" : daysUntil(quote.followUpDate) <= 0 && quote.status !== "Declined" ? "soon" : ""),
    badge(`${quoteMaterialsToOrder(quote.id).length} to order`, quoteWon(quote) && quoteMaterialsToOrder(quote.id).length ? "urgent" : ""),
    actionButtons("quote", quote.id)
  ]))) : ""}
  ${editPanel("quoteMaterial", editingMaterial, quoteMaterialFields(editingMaterial))}
  ${section === "addSupplier" ? addPanel("supplier", "Add Supplier", `<form class="form-grid" data-add-supplier>
    ${supplierFields()}
    <div class="inline-actions wide"><button class="primary-button">Save supplier</button></div>
  </form>`, "Add supplier") : ""}
  ${section === "suppliers" ? panel("Materials & Suppliers / Order List", table(["Quote", "Material", "Qty", "Supplier", "Code", "Costs", "Lead time", "Reference", "Order", "Contact", "Notes", "Action"], db.quoteMaterials.map(item => [
    quoteLabel(item.quoteId),
    escapeHtml(item.materialName || "-"),
    `${Number(item.quantity || 0) || "-"} ${escapeHtml(item.unit || "")}`,
    escapeHtml(item.supplier || "-"),
    escapeHtml(item.supplierCode || "-"),
    `${money(item.unitPrice)} unit<br><span class="note">${money(materialLineTotal(item.quantity, item.unitPrice, item.totalAmount || item.netAmount))} total</span>`,
    escapeHtml(item.leadTime || "-"),
    escapeHtml(item.referenceFile || "-"),
    badge(item.orderStatus || "To order", item.orderStatus === "Ordered" ? "healthy" : "urgent"),
    `${escapeHtml(item.salesRep || "-")}<br>${item.email ? `<a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>` : externalLink(item.website)}<br><span class="note">${escapeHtml(item.supplierPhone || "")}</span>`,
    escapeHtml(item.notes || "-"),
    actionButtons("quoteMaterial", item.id)
  ]))) : ""}
  ${section === "supplierDb" ? panel("Supplier Database", table(["Supplier", "Sales rep", "Email", "Phone", "Website", "Materials quoted", "Action"], supplierDirectoryRows().map(group => [
    escapeHtml(group.name),
    escapeHtml(group.salesRep || "-"),
    group.email ? `<a href="mailto:${escapeHtml(group.email)}">${escapeHtml(group.email)}</a>` : "-",
    escapeHtml(group.supplierPhone || "-"),
    externalLink(group.website),
    String(group.materials.length),
    `<div class="row-actions">${db.suppliers.find(item => supplierKey(item.name) === supplierKey(group.name)) ? actionButtons("supplier", db.suppliers.find(item => supplierKey(item.name) === supplierKey(group.name)).id) : `<button class="mini-button" data-section-view="quotes:suppliers">View materials</button>`}</div>`
  ]))) : ""}`;
}

function renderTeam() {
  const section = activeSection("team", "payroll");
  const editingUser = db.users.find(user => isEditing("user", user.id));
  const payrollRows = db.timesheets.filter(row => row.payrollStatus !== "Paid" && Number(row.hours || 0) > 0);
  const payrollTotal = payrollRows.reduce((sum, row) => sum + userPayroll(row).net, 0);
  const weekEnd = addDaysIso(payrollWeek, 6);
  const weeklyRows = db.timesheets.filter(row => row.date >= payrollWeek && row.date <= weekEnd && Number(row.hours || 0) > 0);
  const weeklyPayroll = Object.values(weeklyRows.reduce((users, row) => {
    const payroll = userPayroll(row);
    const key = row.userId || row.userName;
    users[key] ||= { userId: row.userId || "", name: row.userName || userLabel(row.userId), type: payroll.user.employmentType || "PAYE", entries: [], hours: 0, gross: 0, deductions: 0, net: 0, unpaidNet: 0, paidNet: 0 };
    users[key].entries.push(row.id);
    users[key].hours += Number(row.hours || 0);
    users[key].gross += payroll.gross;
    users[key].deductions += payroll.deductions;
    users[key].net += payroll.net;
    if (row.payrollStatus === "Paid") users[key].paidNet += payroll.net;
    else users[key].unpaidNet += payroll.net;
    return users;
  }, {})).sort((a, b) => a.name.localeCompare(b.name));
  const weeklyNet = weeklyPayroll.reduce((sum, row) => sum + row.net, 0);
  const weeklyUnpaid = weeklyPayroll.reduce((sum, row) => sum + row.unpaidNet, 0);
  return `<section class="section-head"><div><h2>Team & Payroll</h2><p class="note">Add and remove men, set PAYE/CIS status, and move paid wages into cashflow.</p></div></section>
  <div class="metric-grid">
    ${metric("Active men", db.users.filter(user => user.active !== false).length)}
    ${metric("CIS men", db.users.filter(user => user.active !== false && user.employmentType === "CIS").length)}
    ${metric("Week net payable", money(weeklyNet), weeklyNet ? "soon" : "healthy")}
    ${metric("Unpaid this week", money(weeklyUnpaid), weeklyUnpaid ? "soon" : "healthy")}
  </div>
  ${sectionSwitcher("team", [{ key: "payroll", label: "Weekly Payroll" }, { key: "men", label: "Men Register" }, { key: "add", label: "Add Man" }])}
  ${section === "payroll" ? `<div class="toolbar">
    <div class="inline-actions">
      <button class="secondary-button" data-payroll-shift="-7">Previous week</button>
      <button class="secondary-button" data-payroll-today>Current week</button>
      <button class="secondary-button" data-payroll-shift="7">Next week</button>
    </div>
    <form class="inline-actions" data-payroll-jump>
      <label><span>Payroll week</span><input name="date" type="date" value="${escapeHtml(payrollWeek)}"></label>
      <button class="secondary-button">Go</button>
    </form>
  </div>
  ${panel(`Payroll Week - ${shortDate(payrollWeek)} to ${shortDate(weekEnd)}`, table(["Man", "Type", "Hours", "Gross", "Deductions", "Net payable", "Paid", "Still due", "Action"], weeklyPayroll.map(row => [
    escapeHtml(row.name),
    escapeHtml(row.type),
    row.hours.toFixed(2),
    money(row.gross),
    money(row.deductions),
    money(row.net),
    money(row.paidNet),
    money(row.unpaidNet),
    row.unpaidNet > 0 ? `<button class="mini-button" data-pay-wage-week="${escapeHtml(row.userId || row.name)}">Mark week paid</button>` : badge("Paid", "healthy")
  ])))}` : ""}
  ${section === "add" ? addPanel("user", "Add Man", `<form class="form-grid" data-add-user>
    <label><span>Name</span><input name="name" required></label>
    <label><span>Role access</span><select name="role">${Object.entries(roles).map(([value, role]) => `<option value="${value}">${role.label}</option>`).join("")}</select></label>
    <label><span>PIN</span><input name="pin" inputmode="numeric" required></label>
    <label><span>Employment type</span><select name="employmentType"><option value="PAYE">PAYE</option><option value="CIS">Self employed / CIS</option></select></label>
    <label><span>Hourly rate</span><input name="hourlyRate" type="number" step="0.01" value="0"></label>
    <label><span>CIS rate %</span><input name="cisRate" type="number" step="0.01" value="20"></label>
    <label><span>PAYE tax %</span><input name="taxRate" type="number" step="0.01" value="20"></label>
    <label><span>National Insurance %</span><input name="niRate" type="number" step="0.01" value="8"></label>
    <label><span>Pension %</span><input name="pensionRate" type="number" step="0.01" value="5"></label>
    <div class="inline-actions wide"><button class="primary-button">Add man</button></div>
  </form>`, "Add man") : ""}
  ${editPanel("user", editingUser, userFields(editingUser, "Update man"))}
  ${section === "men" ? panel("Men Register", table(["Name", "Access", "Type", "Rate", "Deductions", "Status", "Action"], db.users.map(user => [
    escapeHtml(user.name),
    roles[user.role]?.label || user.role,
    escapeHtml(user.employmentType || "PAYE"),
    money(user.hourlyRate),
    user.employmentType === "CIS" ? `CIS ${Number(user.cisRate || 0)}%` : `Tax ${Number(user.taxRate || 0)}% / NI ${Number(user.niRate || 0)}% / Pension ${Number(user.pensionRate || 0)}%`,
    badge(user.active === false ? "Inactive" : "Active", user.active === false ? "soon" : "healthy"),
    `<div class="row-actions"><button class="mini-button" data-edit-record="user:${user.id}">Edit</button><button class="mini-button" data-toggle-user="${user.id}">${user.active === false ? "Restore" : "Make inactive"}</button><button class="mini-button danger-button" data-delete-user="${user.id}">Delete completely</button></div>`
  ]))) : ""}`;
}

function userFields(user = {}) {
  return `
    <label><span>Name</span><input name="name" value="${escapeHtml(user.name || "")}" required></label>
    <label><span>Role access</span><select name="role">${Object.entries(roles).map(([value, role]) => `<option value="${value}" ${user.role === value ? "selected" : ""}>${role.label}</option>`).join("")}</select></label>
    <label><span>PIN</span><input name="pin" inputmode="numeric" value="${escapeHtml(user.pin || "")}" required></label>
    <label><span>Employment type</span><select name="employmentType"><option value="PAYE" ${user.employmentType !== "CIS" ? "selected" : ""}>PAYE</option><option value="CIS" ${user.employmentType === "CIS" ? "selected" : ""}>Self employed / CIS</option></select></label>
    <label><span>Hourly rate</span><input name="hourlyRate" type="number" step="0.01" value="${Number(user.hourlyRate || 0)}"></label>
    <label><span>CIS rate %</span><input name="cisRate" type="number" step="0.01" value="${Number(user.cisRate || 0)}"></label>
    <label><span>PAYE tax %</span><input name="taxRate" type="number" step="0.01" value="${Number(user.taxRate || 0)}"></label>
    <label><span>National Insurance %</span><input name="niRate" type="number" step="0.01" value="${Number(user.niRate || 0)}"></label>
    <label><span>Pension %</span><input name="pensionRate" type="number" step="0.01" value="${Number(user.pensionRate || 0)}"></label>
    <label><span>Status</span><select name="active"><option value="true" ${user.active === false ? "" : "selected"}>Active</option><option value="false" ${user.active === false ? "selected" : ""}>Inactive</option></select></label>
  `;
}

function payrollReceiverList(day) {
  return `<div class="receiver-list">${Object.values(day.receivers).map(receiver => `<div><strong>${escapeHtml(receiver.name)}</strong><span>${receiver.hours.toFixed(2)} hrs - ${money(receiver.net)} net</span></div>`).join("")}</div>`;
}

function periodDays() {
  const start = timesheetMode === "day" ? timesheetDay : timesheetWeek;
  return Array.from({ length: timesheetMode === "day" ? 1 : 7 }, (_, index) => addDaysIso(start, index));
}

function holidayPeriodDays() {
  const start = holidayMode === "day" ? holidayDay : holidayWeek;
  return Array.from({ length: holidayMode === "day" ? 1 : 7 }, (_, index) => addDaysIso(start, index));
}

function rowInPeriod(row, days) {
  return days.includes(row.date);
}

function holidayInPeriod(row, days) {
  return days.some(day => dateInRange(day, row.startDate, row.endDate));
}

function timesheetUsers(rows, holidayRows) {
  const users = new Map();
  if (ownTimesheetsOnly()) users.set(session.userId, { id: session.userId, name: session.name });
  db.users.filter(user => user.active !== false).forEach(user => {
    if (!ownTimesheetsOnly() || user.id === session.userId) users.set(user.id, { id: user.id, name: user.name });
  });
  rows.forEach(row => users.set(row.userId || row.userName, { id: row.userId || row.userName, name: row.userName || userLabel(row.userId) }));
  holidayRows.forEach(row => users.set(row.userId || row.userName, { id: row.userId || row.userName, name: row.userName || userLabel(row.userId) }));
  return [...users.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function renderTimesheetWeek(rows, holidayRows) {
  const days = periodDays();
  const periodRows = rows.filter(row => rowInPeriod(row, days));
  const periodHolidays = holidayRows.filter(row => holidayInPeriod(row, days));
  const users = timesheetUsers(periodRows, periodHolidays);
  return panel(timesheetMode === "day" ? `Timesheets - ${shortDate(timesheetDay)}` : `Timesheets - Week ${shortDate(timesheetWeek)} to ${shortDate(addDaysIso(timesheetWeek, 6))}`, `
    <div class="week-grid">
      ${users.map(user => {
        const userRows = periodRows.filter(row => sameId(row.userId, user.id) || row.userName === user.name);
        const userHolidays = periodHolidays.filter(row => sameId(row.userId, user.id) || row.userName === user.name);
        const totalHours = userRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
        return `<article class="week-card">
          <header><strong>${escapeHtml(user.name)}</strong><span>${totalHours.toFixed(2)} hrs</span></header>
          <div class="day-grid" style="--day-count:${days.length}">
            ${days.map(day => {
              const dayRows = userRows.filter(row => row.date === day);
              const dayHolidays = userHolidays.filter(row => dateInRange(day, row.startDate, row.endDate));
              const dayHours = dayRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
              const isSelected = timesheetDetail.userId === user.id && timesheetDetail.date === day;
              return `<button class="day-cell ${isSelected ? "selected" : ""}" type="button" data-timesheet-detail="${escapeHtml(user.id)}:${day}">
                <div class="day-cell-head"><strong>${shortDate(day)}</strong><span>${dayHours.toFixed(2)} hrs</span></div>
                ${dayRows.map(row => `<div class="timesheet-chip"><b>${jobLabel(row.jobId)}</b><span>${escapeHtml(row.activity || "Site work")} - ${Number(row.hours || 0).toFixed(2)} hrs</span>${row.signIn || row.signOut ? `<small>${row.signIn || "-"} to ${row.signOut || "-"}</small>` : ""}</div>`).join("")}
                ${dayHolidays.map(row => `<div class="timesheet-chip holiday-chip"><b>Holiday</b><span>${Number(row.days || 0).toFixed(1)} day(s) - ${escapeHtml(row.status)}</span></div>`).join("")}
                ${!dayRows.length && !dayHolidays.length ? `<span class="note">No entry</span>` : ""}
              </button>`;
            }).join("")}
          </div>
        </article>`;
      }).join("") || `<p class="note">No entries in this period.</p>`}
    </div>
  `);
}

function renderTimesheetDetail(rows, holidayRows) {
  if (!timesheetDetail.userId || !timesheetDetail.date) return "";
  const user = db.users.find(item => sameId(item.id, timesheetDetail.userId));
  const name = user?.name || timesheetDetail.userId;
  const dayRows = rows.filter(row => row.date === timesheetDetail.date && (sameId(row.userId, timesheetDetail.userId) || row.userName === name));
  const dayHolidays = holidayRows.filter(row => (sameId(row.userId, timesheetDetail.userId) || row.userName === name) && dateInRange(timesheetDetail.date, row.startDate, row.endDate));
  const dayHours = dayRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  return panel(`${escapeHtml(name)} - ${shortDate(timesheetDetail.date)}`, `
    <div class="metric-grid">
      ${metric("Hours", dayHours.toFixed(2))}
      ${metric("Entries", dayRows.length)}
      ${metric("Holiday", dayHolidays.length ? dayHolidays.map(row => row.status).join(", ") : "No")}
      ${metric("Payroll", dayRows.some(row => row.payrollStatus !== "Paid" && Number(row.hours || 0) > 0) ? "Unpaid" : "Clear", dayRows.some(row => row.payrollStatus !== "Paid" && Number(row.hours || 0) > 0) ? "soon" : "healthy")}
    </div>
    ${table(["Job", "Work type", "Hours", "Payroll", "Sign in", "In location", "Sign out", "Out location"], dayRows.map(row => [
      jobLabel(row.jobId),
      escapeHtml(row.activity || "Site work"),
      Number(row.hours || 0).toFixed(2),
      badge(row.payrollStatus || "Unpaid", row.payrollStatus === "Paid" ? "healthy" : "soon"),
      row.signIn || "-",
      locationLabel(row.signInLocation),
      row.signOut || "-",
      locationLabel(row.signOutLocation)
    ]))}
    ${dayHolidays.length ? `<div class="table-wrap"><table><thead><tr><th>Holiday</th><th>Dates</th><th>Days</th><th>Status</th><th>Notes</th></tr></thead><tbody>${dayHolidays.map(row => `<tr><td>${escapeHtml(row.userName)}</td><td>${escapeHtml(row.startDate)} - ${escapeHtml(row.endDate)}</td><td>${Number(row.days || 0).toFixed(1)}</td><td>${badge(row.status, row.status === "Approved" ? "healthy" : row.status === "Denied" ? "urgent" : "soon")}</td><td>${escapeHtml(row.reason || "-")}</td></tr>`).join("")}</tbody></table></div>` : ""}
  `);
}

function renderHolidayWeek(holidayRows, days = periodDays(), mode = timesheetMode) {
  const rows = holidayRows.filter(row => holidayInPeriod(row, days));
  return panel(mode === "day" ? "Holiday Requests - Day View" : "Holiday Requests - Week View", table(["Man", "Dates", "Days", "Status", "Notes", "Decision", "Action"], rows.map(row => [
    escapeHtml(row.userName),
    `${escapeHtml(row.startDate)} - ${escapeHtml(row.endDate)}`,
    Number(row.days || 0).toFixed(1),
    badge(row.status, row.status === "Approved" ? "healthy" : row.status === "Denied" ? "urgent" : "soon"),
    escapeHtml(row.reason || "-"),
    escapeHtml(row.decisionNote || "-"),
    ownTimesheetsOnly() ? `<button class="mini-button danger-button" data-delete-record="holiday:${row.id}">Remove</button>` : `<div class="row-actions"><button class="mini-button" data-holiday-status="${row.id}:Approved">Approve</button><button class="mini-button danger-button" data-holiday-status="${row.id}:Denied">Deny</button><button class="mini-button danger-button" data-delete-record="holiday:${row.id}">Remove</button></div>`
  ])));
}

function renderCnc() {
  const section = activeSection("cnc", "tracker");
  const stages = cncStages.map(stage => ({ stage, items: db.cnc.filter(item => item.status === stage) }));
  return `<section class="section-head"><div><h2>CNC Operations</h2><p class="note">Upload drawings, break them down, and track production.</p></div></section>
  ${sectionSwitcher("cnc", [{ key: "tracker", label: "Live Tracker" }, { key: "register", label: "Drawing Register" }, { key: "add", label: "Add Drawing" }])}
  ${section === "add" ? addPanel("cnc", "Add CNC Drawing", `<form class="form-grid" data-add-cnc>
    <label><span>Linked job</span><select name="jobId">${jobOptions()}</select></label>
    <label><span>Title</span><input name="title" required></label>
    <label><span>Required by</span><input name="requiredBy" type="date"></label>
    <label><span>Priority</span><select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></label>
    <label class="wide"><span>Drawing upload</span><input name="drawing" type="file" accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp"></label>
    <label class="wide"><span>Breakdown notes</span><textarea name="breakdownNotes" rows="4"></textarea></label>
    <div class="inline-actions wide"><button class="primary-button">Add CNC drawing</button></div>
  </form>`, "Add CNC drawing") : ""}
  ${section === "tracker" ? panel("Live Tracker", `<div class="tracker">${stages.map(group => `<div class="stage"><strong>${group.stage}</strong>${group.items.map(item => `<div class="stage-item"><b>${escapeHtml(item.title)}</b><br><span class="note">${jobLabel(item.jobId)} ${item.requiredBy ? `due ${item.requiredBy}` : ""}</span><div class="inline-actions"><button class="mini-button" data-next-cnc="${item.id}">Next</button></div></div>`).join("") || `<span class="note">No items</span>`}</div>`).join("")}</div>`) : ""}
  ${section === "register" ? panel("Drawing Register", table(["Job", "Title", "Drawing", "Status", "Priority", "Action"], db.cnc.map(item => [jobLabel(item.jobId), escapeHtml(item.title), item.fileName ? escapeHtml(item.fileName) : "-", badge(item.status, item.status === "Complete" ? "healthy" : "soon"), item.priority, `<button class="mini-button danger-button" data-delete-cnc="${item.id}">Delete</button>`]))) : ""}`;
}

function renderTimesheets() {
  const ownOnly = ownTimesheetsOnly();
  if (ownOnly && timesheetSection === "import") timesheetSection = "viewer";
  const rows = db.timesheets.filter(row => !ownOnly || row.userId === session.userId);
  const activeUsers = db.users.filter(user => user.active !== false);
  const signedIn = rows.filter(row => row.date === todayIso() && row.signIn && !row.signOut);
  const days = periodDays();
  const periodRows = rows.filter(row => rowInPeriod(row, days));
  return `<section class="section-head"><div><h2>Timesheets</h2><p class="note">One daily entry for attendance and job hours.</p></div></section>
  <div class="metric-grid">
    ${metric("Signed in now", signedIn.length, signedIn.length ? "active" : "")}
    ${metric(timesheetMode === "day" ? "Day hours" : "Week hours", periodRows.reduce((sum, row) => sum + Number(row.hours || 0), 0).toFixed(1))}
    ${metric("Unpaid entries", rows.filter(row => row.payrollStatus !== "Paid" && Number(row.hours || 0) > 0).length, "soon")}
    ${metric("Entries shown", periodRows.length)}
  </div>
  <div class="tab-strip">
    <button class="tab-button ${timesheetSection === "viewer" ? "active" : ""}" data-timesheet-section="viewer">Timesheet Viewer</button>
    <button class="tab-button ${timesheetSection === "entry" ? "active" : ""}" data-timesheet-section="entry">Daily Entry</button>
    ${ownOnly ? "" : `<button class="tab-button ${timesheetSection === "import" ? "active" : ""}" data-timesheet-section="import">Import CSV</button>`}
  </div>
  ${timesheetSection === "viewer" ? `<div class="toolbar">
    <div class="inline-actions">
      <button class="secondary-button" data-timesheet-shift="-7">Previous week</button>
      <button class="secondary-button" data-timesheet-today>Current week</button>
      <button class="secondary-button" data-timesheet-shift="7">Next week</button>
    </div>
    <form class="inline-actions" data-timesheet-jump>
      <label><span>Jump to date</span><input name="date" type="date" value="${escapeHtml(timesheetDay)}"></label>
      <button class="secondary-button">Go</button>
    </form>
    <div class="inline-actions">
      <button class="tab-button ${timesheetMode === "week" ? "active" : ""}" data-timesheet-mode="week">Week view</button>
      <button class="tab-button ${timesheetMode === "day" ? "active" : ""}" data-timesheet-mode="day">Day view</button>
    </div>
  </div>
  <div class="tab-strip day-tabs">
    ${Array.from({ length: 7 }, (_, index) => addDaysIso(timesheetWeek, index)).map(day => `<button class="tab-button ${timesheetDay === day ? "active" : ""}" data-timesheet-day="${day}">${shortDate(day)}</button>`).join("")}
  </div>` : ""}
  ${timesheetSection === "entry" ? panel("Daily Timesheet Entry", `<form class="form-grid" data-timesheet-entry>
    ${ownOnly ? "" : `<label><span>Man</span><select name="userId">${activeUsers.map(user => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("")}</select></label>`}
    <label><span>Date</span><input name="date" type="date" value="${todayIso()}"></label>
    <label><span>Job / activity</span><select name="jobId">${timesheetJobOptions()}</select></label>
    <label><span>Hours to allocate</span><input name="hours" type="number" step="0.25" placeholder="Optional"></label>
    <label class="wide"><span>Notes</span><input name="notes" placeholder="Optional"></label>
    <div class="inline-actions wide"><button class="primary-button" name="action" value="in">Sign in</button><button class="secondary-button" name="action" value="out">Sign out</button><button class="secondary-button" name="action" value="hours">Allocate hours only</button></div>
  </form><p class="note">Sign in/out records location. Allocating hours only does not attach location.</p>`) : ""}
  ${!ownOnly && timesheetSection === "import" ? csvImportPanel("timesheets", "Import Timesheets CSV", "man, date, job_number, activity, hours, sign_in, sign_out, payroll_status, notes") : ""}
  ${timesheetSection === "viewer" ? `${renderTimesheetWeek(rows, [])}${renderTimesheetDetail(rows, [])}` : ""}
  `;
}

function renderHolidays() {
  const section = activeSection("holidays", "viewer");
  const ownOnly = ownTimesheetsOnly();
  const holidayRows = db.holidays.filter(row => !ownOnly || row.userId === session.userId);
  const activeUsers = db.users.filter(user => user.active !== false);
  const days = holidayPeriodDays();
  const periodRows = holidayRows.filter(row => holidayInPeriod(row, days));
  const pending = holidayRows.filter(row => row.status === "Pending").length;
  const approved = periodRows.filter(row => row.status === "Approved").length;
  return `<section class="section-head"><div><h2>Holidays</h2><p class="note">Request, approve, and review holidays separately from job hours.</p></div></section>
  <div class="metric-grid">
    ${metric("Pending", pending, pending ? "soon" : "healthy")}
    ${metric(holidayMode === "day" ? "Day requests" : "Week requests", periodRows.length)}
    ${metric("Approved shown", approved, approved ? "active" : "")}
    ${metric("Total holiday records", holidayRows.length)}
  </div>
  ${sectionSwitcher("holidays", [{ key: "viewer", label: "Holiday Viewer" }, { key: "request", label: "Request Holiday" }])}
  ${section === "viewer" ? `<div class="toolbar">
    <div class="inline-actions">
      <button class="secondary-button" data-holiday-shift="-7">Previous week</button>
      <button class="secondary-button" data-holiday-today>Current week</button>
      <button class="secondary-button" data-holiday-shift="7">Next week</button>
    </div>
    <form class="inline-actions" data-holiday-jump>
      <label><span>Jump to date</span><input name="date" type="date" value="${escapeHtml(holidayDay)}"></label>
      <button class="secondary-button">Go</button>
    </form>
    <div class="inline-actions">
      <button class="tab-button ${holidayMode === "week" ? "active" : ""}" data-holiday-mode="week">Week view</button>
      <button class="tab-button ${holidayMode === "day" ? "active" : ""}" data-holiday-mode="day">Day view</button>
    </div>
  </div>
  <div class="tab-strip day-tabs">
    ${Array.from({ length: 7 }, (_, index) => addDaysIso(holidayWeek, index)).map(day => `<button class="tab-button ${holidayDay === day ? "active" : ""}" data-holiday-day="${day}">${shortDate(day)}</button>`).join("")}
  </div>` : ""}
  ${section === "request" ? panel("Holiday Request", `<form class="form-grid" data-add-holiday>
    ${ownOnly ? "" : `<label><span>Man</span><select name="userId">${activeUsers.map(user => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("")}</select></label>`}
    <label><span>Start date</span><input name="startDate" type="date" value="${todayIso()}" required></label>
    <label><span>End date</span><input name="endDate" type="date" value="${todayIso()}" required></label>
    <label><span>Days requested</span><select name="days"><option value="0.5">0.5 day</option><option value="1" selected>1 day</option><option value="1.5">1.5 days</option><option value="2">2 days</option><option value="3">3 days</option><option value="4">4 days</option><option value="5">5 days</option></select></label>
    <label class="wide"><span>Reason / notes</span><input name="reason" placeholder="Optional"></label>
    <div class="inline-actions wide"><button class="primary-button">Request holiday</button></div>
  </form>`) : ""}
  ${section === "viewer" ? renderHolidayWeek(holidayRows, days, holidayMode) : ""}`;
}

function renderInvoices() {
  const section = activeSection("invoices", "register");
  const editing = db.invoices.find(invoice => isEditing("invoice", invoice.id));
  return `<section class="section-head"><div><h2>Invoices</h2><p class="note">Net, VAT, CIS deduction, and actual cash received.</p></div></section>
  ${sectionSwitcher("invoices", [{ key: "register", label: "Invoice Register" }, { key: "add", label: "Add Invoice" }, { key: "import", label: "Import CSV" }])}
  ${editPanel("invoice", editing, `
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions(editing?.jobId || "")}</select></label>
    <label><span>Description</span><input name="description" value="${escapeHtml(editing?.description || "")}" required></label>
    <label><span>Net amount</span><input name="amount" type="number" step="0.01" value="${Number(editing?.amount || 0)}" required></label>
    <label><span>VAT charged</span><select name="vatApplies"><option value="true" ${editing?.vatApplies === false ? "" : "selected"}>Yes</option><option value="false" ${editing?.vatApplies === false ? "selected" : ""}>No / reverse charge</option></select></label>
    <label><span>CIS deduction</span><select name="cisApplies"><option value="false" ${editing?.cisApplies ? "" : "selected"}>No</option><option value="true" ${editing?.cisApplies ? "selected" : ""}>Yes</option></select></label>
    <label><span>CIS rate %</span><input name="cisRate" type="number" step="0.01" value="${Number(editing?.cisRate ?? 20)}"></label>
    <label><span>CIS amount override</span><input name="cisAmount" type="number" step="0.01" value="${editing?.cisAmount ?? ""}" placeholder="Optional"></label>
    <label><span>Status</span><select name="status">${selectOptions(["Pending", "Paid"], editing?.status || "Pending")}</select></label>
    <label><span>Due date</span><input name="dueDate" type="date" value="${escapeHtml(editing?.dueDate || "")}"></label>
    <label><span>Paid date</span><input name="paidDate" type="date" value="${escapeHtml(editing?.paidDate || "")}"></label>
  `)}
  ${section === "add" ? addPanel("invoice", "Add Invoice", `<form class="form-grid" data-add-invoice>
    <label><span>Job</span><select name="jobId">${jobOptions()}</select></label>
    <label><span>Description</span><input name="description" required></label>
    <label><span>Net amount</span><input name="amount" type="number" required></label>
    <label><span>VAT charged</span><select name="vatApplies"><option value="true">Yes</option><option value="false">No / reverse charge</option></select></label>
    <label><span>CIS deduction</span><select name="cisApplies"><option value="false">No</option><option value="true">Yes</option></select></label>
    <label><span>CIS rate %</span><input name="cisRate" type="number" value="20" step="0.01"></label>
    <label><span>CIS amount override</span><input name="cisAmount" type="number" step="0.01" placeholder="Optional"></label>
    <label><span>Due date</span><input name="dueDate" type="date"></label>
    <label><span>Status</span><select name="status"><option>Pending</option><option>Paid</option></select></label>
    <div class="inline-actions wide"><button class="primary-button">Save invoice</button></div>
  </form>`, "Add invoice") : ""}
  ${section === "import" ? csvImportPanel("invoices", "Import Invoices CSV", "job_number, description, net_amount, vat_charged, cis_deduction, cis_rate, cis_amount, due_date, paid_date, status") : ""}
  ${section === "register" ? panel("Invoice Register", table(["Job", "Description", "Net", "VAT", "Total inc VAT", "CIS", "Received", "Status", "Action"], db.invoices.map(invoice => [jobLabel(invoice.jobId), escapeHtml(invoice.description), money(invoice.amount), money(vatAmount(invoice)), money(grossAmount(invoice)), money(cisDeduction(invoice)), money(receivedAmount(invoice)), badge(invoice.status, invoice.status === "Paid" ? "healthy" : "soon"), actionButtons("invoice", invoice.id)]))) : ""}`;
}

function renderPayments() {
  const section = activeSection("payments", "register");
  return `<section class="section-head"><div><h2>Payments Out</h2></div></section>
  ${sectionSwitcher("payments", [{ key: "register", label: "Payments Register" }, { key: "add", label: "Add Payment" }, { key: "import", label: "Import CSV" }])}
  ${section === "import" ? csvImportPanel("payments", "Import Payments Out CSV", "job_number, category, description, amount, payment_date, status") : ""}
  ${renderMoneySection("payments", "Payments Out", "data-add-payment", ["Materials", "Hardware", "Fuel", "Vans", "Wages", "Subcontractors", "Other"], db.payments.filter(item => item.category !== "Accommodation"), section)}`;
}

function renderAccommodation() {
  const section = activeSection("accommodation", "register");
  const rows = db.payments.filter(item => item.category === "Accommodation");
  const paid = rows.filter(item => item.status === "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = rows.filter(item => item.status !== "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const editing = rows.find(item => item.id === editingAccommodationId);
  return `<section class="section-head"><div><h2>Accommodation</h2><p class="note">Accommodation costs are kept separate here and still feed Payments Out and Cashflow.</p></div></section>
  <div class="metric-grid">
    ${metric("Accommodation paid", money(paid), paid ? "soon" : "")}
    ${metric("Accommodation pending", money(pending), pending ? "soon" : "")}
  </div>
  ${sectionSwitcher("accommodation", [{ key: "register", label: "Accommodation Register" }, { key: "add", label: "Add Accommodation" }, { key: "import", label: "Import CSV" }])}
  ${section === "import" ? csvImportPanel("accommodation", "Import Accommodation CSV", "job_number, description, address, location, contact, check_in, check_out, check_out_time, amount, payment_date, status") : ""}
  ${editing ? panel("Edit Accommodation Cost", `<form class="form-grid" data-edit-accommodation>
    <input type="hidden" name="id" value="${editing.id}">
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions(editing.jobId)}</select></label>
    <label><span>Description</span><input name="description" value="${escapeHtml(editing.description)}" required></label>
    <label class="wide"><span>Accommodation address</span><input name="accommodationAddress" value="${escapeHtml(editing.accommodationAddress || "")}" placeholder="Hotel / house address"></label>
    <label><span>Location</span><input name="accommodationLocation" value="${escapeHtml(editing.accommodationLocation || "")}" placeholder="Town / area"></label>
    <label><span>Contact / booking ref</span><input name="accommodationContact" value="${escapeHtml(editing.accommodationContact || "")}" placeholder="Optional"></label>
    <label><span>Check-in date</span><input name="accommodationCheckInDate" type="date" value="${escapeHtml(editing.accommodationCheckInDate || "")}"></label>
    <label><span>Check-out date</span><input name="accommodationCheckOutDate" type="date" value="${escapeHtml(editing.accommodationCheckOutDate || "")}"></label>
    <label><span>Check-out time</span><input name="accommodationCheckOutTime" type="time" value="${escapeHtml(editing.accommodationCheckOutTime || "")}"></label>
    <label><span>Payment date</span><input name="paymentDate" type="date" value="${escapeHtml(editing.paymentDate || todayIso())}"></label>
    <label><span>Amount</span><input name="amount" type="number" step="0.01" value="${Number(editing.amount || 0)}" required></label>
    <label><span>Status</span><select name="status"><option ${editing.status === "Pending" ? "selected" : ""}>Pending</option><option ${editing.status === "Paid" ? "selected" : ""}>Paid</option></select></label>
    <div class="inline-actions wide"><button class="primary-button">Update accommodation</button><button class="secondary-button" type="button" data-cancel-accommodation-edit>Cancel</button></div>
  </form>`) : ""}
  ${section === "add" ? addPanel("accommodation", "Add Accommodation Cost", `<form class="form-grid" data-add-accommodation>
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions()}</select></label>
    <label><span>Description</span><input name="description" required></label>
    <label class="wide"><span>Accommodation address</span><input name="accommodationAddress" placeholder="Hotel / house address"></label>
    <label><span>Location</span><input name="accommodationLocation" placeholder="Town / area"></label>
    <label><span>Contact / booking ref</span><input name="accommodationContact" placeholder="Optional"></label>
    <label><span>Check-in date</span><input name="accommodationCheckInDate" type="date"></label>
    <label><span>Check-out date</span><input name="accommodationCheckOutDate" type="date"></label>
    <label><span>Check-out time</span><input name="accommodationCheckOutTime" type="time"></label>
    <label><span>Payment date</span><input name="paymentDate" type="date" value="${todayIso()}"></label>
    <label><span>Amount</span><input name="amount" type="number" required></label>
    <label><span>Status</span><select name="status"><option>Pending</option><option>Paid</option></select></label>
    <div class="inline-actions wide"><button class="primary-button">Save accommodation</button></div>
  </form>`, "Add accommodation") : ""}
  ${section === "register" ? panel("Accommodation Register", table(["Job", "Description", "Address", "Location", "Check in", "Check out", "Out time", "Contact / Ref", "Amount", "Status", "Action"], rows.map(row => [jobLabel(row.jobId), escapeHtml(row.description), escapeHtml(row.accommodationAddress || "-"), escapeHtml(row.accommodationLocation || "-"), escapeHtml(row.accommodationCheckInDate || "-"), escapeHtml(row.accommodationCheckOutDate || "-"), escapeHtml(row.accommodationCheckOutTime || "-"), escapeHtml(row.accommodationContact || "-"), money(row.amount), badge(row.status, row.status === "Paid" ? "healthy" : "soon"), actionButtons("payments", row.id)]))) : ""}`;
}

function renderSharedCosts() {
  const section = activeSection("sharedCosts", "register");
  const fixedCategories = ["Rent", "Rates", "Insurance", "Software", "Accountant", "Phones / Internet", "Vehicle leases", "General overhead"];
  const variableCategories = ["Cleaning up", "Unloading lorries", "Loading lorries", "Loading vans", "Moving materials", "Materials support", "Fuel", "Repairs", "Small tools", "Consumables", "Travel", "Ad hoc labour", "Other variable"];
  const categories = sharedCostTab === "Fixed" ? fixedCategories : variableCategories;
  const rows = db.sharedCosts.filter(item => (item.costType || "Fixed") === sharedCostTab);
  const editing = db.sharedCosts.find(item => isEditing("sharedCosts", item.id));
  const fixedRows = db.sharedCosts.filter(item => (item.costType || "Fixed") === "Fixed" && inFinancialPeriod(item.paymentDate || todayIso()));
  const fixedPaid = db.sharedCosts.filter(item => (item.costType || "Fixed") === "Fixed" && item.status === "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const variablePaid = db.sharedCosts.filter(item => item.costType === "Variable" && item.status === "Paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recovery = overheadRecovery(fixedRows);
  return `<section class="section-head"><div><h2>Shared Costs</h2><p class="note">Split office and overhead spend between fixed monthly costs and variable running costs.</p></div></section>
  <div class="metric-grid">
    ${metric("Fixed paid", money(fixedPaid), fixedPaid ? "soon" : "")}
    ${metric("Variable paid", money(variablePaid), variablePaid ? "soon" : "")}
  </div>
  <div class="tab-strip"><button class="tab-button ${sharedCostTab === "Fixed" ? "active" : ""}" data-shared-cost-tab="Fixed">Fixed Costs</button><button class="tab-button ${sharedCostTab === "Variable" ? "active" : ""}" data-shared-cost-tab="Variable">Variable Costs</button></div>
  ${sectionSwitcher("sharedCosts", [{ key: "register", label: "Cost Register" }, { key: "add", label: "Add Cost" }, { key: "recovery", label: "Overhead Recovery" }])}
  ${sharedCostTab === "Fixed" && section === "recovery" ? panel("Overhead Recovery", `<div class="metric-grid">
    ${metric("Fixed overhead total", money(recovery.fixedTotal), recovery.fixedTotal ? "soon" : "")}
    ${metric("Active payroll men", recovery.employeeCount)}
    ${metric("Recovery per employee", money(recovery.perEmployee))}
    ${metric("Recovery per labour hour", money(recovery.perHour))}
  </div>`) : ""}
  ${editPanel("sharedCosts", editing, `
    <label><span>Type</span><select name="costType">${selectOptions(["Fixed", "Variable"], editing?.costType || sharedCostTab)}</select></label>
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions(editing?.jobId || "")}</select></label>
    <label><span>Description</span><input name="description" value="${escapeHtml(editing?.description || "")}" required></label>
    <label><span>Category</span><select name="category">${selectOptions([...(sharedCostTab === "Fixed" ? fixedCategories : variableCategories), editing?.category || ""].filter(Boolean), editing?.category || categories[0])}</select></label>
    <label><span>Payment date</span><input name="paymentDate" type="date" value="${escapeHtml(editing?.paymentDate || todayIso())}"></label>
    <label><span>Amount</span><input name="amount" type="number" step="0.01" value="${Number(editing?.amount || 0)}" required></label>
    <label><span>Status</span><select name="status">${selectOptions(["Pending", "Paid"], editing?.status || "Pending")}</select></label>
  `)}
  ${section === "add" ? addPanel(`shared-${sharedCostTab}`, `Add ${sharedCostTab} Cost`, `<form class="form-grid" data-add-shared-cost>
    <input type="hidden" name="costType" value="${sharedCostTab}">
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions()}</select></label>
    <label><span>Description</span><input name="description" required></label>
    <label><span>Category</span><select name="category">${categories.map(category => `<option>${category}</option>`).join("")}</select></label>
    <label><span>Payment date</span><input name="paymentDate" type="date" value="${todayIso()}"></label>
    <label><span>Amount</span><input name="amount" type="number" required></label>
    <label><span>Status</span><select name="status"><option>Pending</option><option>Paid</option></select></label>
    <div class="inline-actions wide"><button class="primary-button">Save ${sharedCostTab.toLowerCase()} cost</button></div>
  </form>`, `Add ${sharedCostTab.toLowerCase()} cost`) : ""}
  ${section === "register" ? panel(`${sharedCostTab} Costs`, table(["Job", "Category", "Description", "Amount", "Status", "Action"], rows.map(row => [jobLabel(row.jobId), escapeHtml(row.category || "-"), escapeHtml(row.description), money(row.amount), badge(row.status, row.status === "Paid" ? "healthy" : "soon"), actionButtons("sharedCosts", row.id)]))) : ""}`;
}

function overheadRecovery(fixedRows) {
  const fixedTotal = fixedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const payrollUsers = db.users.filter(user => user.active !== false && Number(user.hourlyRate || 0) > 0);
  const employeeCount = payrollUsers.length || db.users.filter(user => user.active !== false).length || 1;
  const monthlyHours = employeeCount * 160;
  return {
    fixedTotal,
    employeeCount,
    perEmployee: fixedTotal / employeeCount,
    perHour: monthlyHours ? fixedTotal / monthlyHours : 0
  };
}

function renderMoneySection(key, title, attr, categories = ["General"], rowsOverride = null, section = "register") {
  const rows = rowsOverride || db[key];
  const type = key;
  const editing = collectionForRecord(type)?.find(item => isEditing(type, item.id));
  return `
  ${editPanel(type, editing, `
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions(editing?.jobId || "")}</select></label>
    <label><span>Description</span><input name="description" value="${escapeHtml(editing?.description || "")}" required></label>
    <label><span>Category</span><select name="category">${selectOptions(categories, editing?.category || categories[0])}</select></label>
    <label><span>Payment date</span><input name="paymentDate" type="date" value="${escapeHtml(editing?.paymentDate || todayIso())}"></label>
    <label><span>Amount</span><input name="amount" type="number" step="0.01" value="${Number(editing?.amount || 0)}" required></label>
    <label><span>Status</span><select name="status">${selectOptions(["Pending", "Paid"], editing?.status || "Pending")}</select></label>
  `)}
  ${section === "add" ? addPanel(key, `Add ${title.slice(0, -1)}`, `<form class="form-grid" ${attr}>
    <label><span>Job</span><select name="jobId"><option value="">General</option>${jobOptions()}</select></label>
    <label><span>Description</span><input name="description" required></label>
    <label><span>Category</span><select name="category">${categories.map(category => `<option>${category}</option>`).join("")}</select></label>
    <label><span>Payment date</span><input name="paymentDate" type="date" value="${todayIso()}"></label>
    <label><span>Amount</span><input name="amount" type="number" required></label>
    <label><span>Status</span><select name="status"><option>Pending</option><option>Paid</option></select></label>
    <div class="inline-actions wide"><button class="primary-button">Save</button></div>
  </form>`, `Add ${title.slice(0, -1).toLowerCase()}`) : ""}
  ${section === "register" ? panel(title, table(["Job", "Category", "Description", "Amount", "Status", "Action"], rows.map(row => [jobLabel(row.jobId), escapeHtml(row.category || "-"), escapeHtml(row.description), money(row.amount), badge(row.status, row.status === "Paid" ? "healthy" : "soon"), actionButtons(key, row.id)]))) : ""}`;
}

function renderCashflow() {
  const section = activeSection("cashflow", "summary");
  const paidIn = paidInTotal();
  const pendingIn = db.invoices.filter(item => item.status !== "Paid" && inFinancialPeriod(item.dueDate || todayIso())).reduce((sum, item) => sum + receivedAmount(item), 0);
  const paidOut = paidOutTotal();
  const pendingOut = [...db.payments, ...db.sharedCosts].filter(item => item.status !== "Paid" && inFinancialPeriod(item.paymentDate || todayIso())).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return `<div class="metric-grid">
    ${metric("Tracking from", appSettings.financialStart)}
    ${metric("Money in paid", money(paidIn), "healthy")}
    ${metric("Money in pending", money(pendingIn), pendingIn ? "soon" : "")}
    ${metric("Money out paid", money(paidOut), "soon")}
    ${metric("Money out pending", money(pendingOut), pendingOut ? "soon" : "")}
    ${metric("Net cash movement", money(paidIn - paidOut), paidIn - paidOut < 0 ? "urgent" : "healthy")}
  </div>
  ${sectionSwitcher("cashflow", [{ key: "moneyIn", label: "Money In" }, { key: "moneyOut", label: "Money Out" }, { key: "breakdown", label: "Breakdown" }])}
  ${section === "moneyIn" ? panel("Paid Invoices", table(["Date", "Job", "Net", "VAT", "CIS", "Received"], db.invoices.filter(item => item.status === "Paid" && inFinancialPeriod(item.paidDate || item.dueDate || todayIso())).map(item => [item.paidDate || "-", jobLabel(item.jobId), money(item.amount), money(vatAmount(item)), money(cisDeduction(item)), money(receivedAmount(item))]))) : ""}
  ${section === "moneyOut" ? panel("Paid Out", table(["Date", "Source", "Job", "Category", "Amount"], [...db.payments.map(item => ({ source: "Payment", ...item })), ...db.sharedCosts.map(item => ({ source: "Shared cost", ...item }))].filter(item => item.status === "Paid" && inFinancialPeriod(item.paymentDate || todayIso())).map(item => [item.paymentDate || "-", item.source, jobLabel(item.jobId), escapeHtml(item.category || "-"), money(item.amount)]))) : ""}
  ${section === "breakdown" ? panel("Money Out Breakdown", table(["Category", "Paid"], Object.entries([...db.payments, ...db.sharedCosts].filter(item => item.status === "Paid" && inFinancialPeriod(item.paymentDate || todayIso())).reduce((groups, item) => {
    groups[item.category || "Other"] = (groups[item.category || "Other"] || 0) + Number(item.amount || 0);
    return groups;
  }, {})).map(([category, amount]) => [escapeHtml(category), money(amount)]))) : ""}`;
}

function renderReports() {
  const periodInvoices = db.invoices.filter(item => inFinancialPeriod(item.paidDate || item.dueDate || todayIso()));
  const periodTimesheets = db.timesheets.filter(item => inFinancialPeriod(item.date));
  const invoiced = periodInvoices.reduce((sum, item) => sum + grossAmount(item), 0);
  const cis = periodInvoices.reduce((sum, item) => sum + cisDeduction(item), 0);
  const hours = periodTimesheets.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const labourCost = periodTimesheets.reduce((sum, item) => sum + userPayroll(item).net, 0);
  const committedCost = db.jobs.reduce((sum, job) => sum + jobCostSummary(job.id).committedCost, 0);
  return `<div class="metric-grid">
    ${metric("Tracking from", appSettings.financialStart)}
    ${metric("Jobs", db.jobs.length)}
    ${metric("CNC drawings", db.cnc.length)}
    ${metric("Timesheet hours", hours.toFixed(1))}
    ${metric("Labour actual", money(labourCost), labourCost ? "soon" : "")}
    ${metric("Committed job cost", money(committedCost), committedCost ? "soon" : "")}
    ${metric("Open invoices", db.invoices.filter(i => i.status !== "Paid").length)}
    ${metric("Invoiced inc VAT", money(invoiced))}
    ${metric("CIS held", money(cis), cis ? "soon" : "")}
    ${metric("Paid in", money(paidInTotal()), "healthy")}
    ${metric("Paid out", money(paidOutTotal()), "soon")}
  </div>`;
}

function renderSettings() {
  const section = activeSection("settings", "database");
  return `${sectionSwitcher("settings", [{ key: "database", label: "Database" }, { key: "financial", label: "Financial Period" }, { key: "local", label: "Local Data" }])}
    ${section === "financial" ? panel("Financial Period", `<form class="form-grid" data-save-settings>
      <label><span>Start tracking from</span><input name="financialStart" type="date" value="${escapeHtml(appSettings.financialStart)}"></label>
      <div class="inline-actions wide"><button class="primary-button">Save start date</button></div>
      <p class="note wide">Cashflow and reports use this date. Default is 1 January 2026.</p>
    </form>`) : ""}
    ${section === "database" ? panel("Database Connection", `<form class="form-grid" data-save-supabase>
      <label class="wide"><span>Supabase project URL</span><input name="url" value="${escapeHtml(supabaseConfig.url || "")}" placeholder="https://your-project.supabase.co"></label>
      <label class="wide"><span>Supabase anon public key</span><textarea name="anonKey" rows="4" placeholder="Paste anon key">${escapeHtml(supabaseConfig.anonKey || "")}</textarea></label>
      <div class="inline-actions wide"><button class="primary-button">Save and connect</button><button class="secondary-button" type="button" data-sync-supabase>Sync from Supabase</button></div>
      <p class="note wide">${escapeHtml(syncStatus)}</p>
    </form>`) : ""}
    ${section === "local" ? panel("Local Data", `<button class="danger-button" data-reset-local>Reset local live demo data</button>`) : ""}`;
}

function jobOptions(selectedId = "") {
  return db.jobs.map(job => `<option value="${job.id}" ${sameId(job.id, selectedId) ? "selected" : ""}>${escapeHtml(job.number)} - ${escapeHtml(job.client)}</option>`).join("");
}

function quoteOptions(selectedId = "") {
  return db.quotes.map(quote => `<option value="${quote.id}" ${quote.id === selectedId ? "selected" : ""}>${escapeHtml(quote.company || "Quote")} - ${escapeHtml(quote.description || quote.quoteDate || "")}</option>`).join("");
}

function timesheetJobOptions(selectedId = "") {
  const jobs = db.jobs.map(job => `<option value="${job.id}" ${sameId(job.id, selectedId) ? "selected" : ""}>${escapeHtml(job.number)} - ${escapeHtml(job.client)}</option>`).join("");
  const activities = timesheetActivities.filter(activity => activity !== "Site work").map(activity => `<option value="activity:${escapeHtml(activity)}" ${selectedId === `activity:${activity}` ? "selected" : ""}>${escapeHtml(activity)}</option>`).join("");
  return `<optgroup label="Jobs">${jobs}</optgroup><optgroup label="Site activities">${activities}</optgroup>`;
}

function parseTimesheetJob(value) {
  if (String(value || "").startsWith("activity:")) return { jobId: "", activity: String(value).replace("activity:", "") };
  return { jobId: value || "", activity: "Site work" };
}

function userOptions(selectedId = "") {
  return db.users.filter(user => user.active !== false).map(user => `<option value="${user.id}" ${user.id === selectedId ? "selected" : ""}>${escapeHtml(user.name)}</option>`).join("");
}

function userOptionsMultiple(selectedIds = []) {
  return db.users.filter(user => user.active !== false).map(user => `<option value="${user.id}" ${selectedIds.includes(user.id) ? "selected" : ""}>${escapeHtml(user.name)}</option>`).join("");
}

function assignedUsersLabel(item) {
  const ids = plannerAssignedIds(item);
  return ids.length ? ids.map(id => userLabel(id)).join(", ") : "Unassigned";
}

function jobLabel(id) {
  const job = db.jobs.find(item => sameId(item.id, id));
  return job ? `${escapeHtml(job.number)} - ${escapeHtml(job.client)}` : "General";
}

function quoteLabel(id) {
  const quote = db.quotes.find(item => item.id === id);
  return quote ? `${escapeHtml(quote.company || "Quote")} - ${escapeHtml(quote.description || quote.quoteDate || "")}` : "General supplier";
}

function locationLabel(location) {
  if (!location) return "-";
  return `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`;
}

async function currentLocation() {
  if (!navigator.geolocation) return null;
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function renderToast() {
  document.querySelectorAll(".toast").forEach(node => node.remove());
  if (!toast) return;
  document.body.insertAdjacentHTML("beforeend", `<div class="toast">${escapeHtml(toast)}</div>`);
  setTimeout(() => {
    toast = "";
    document.querySelectorAll(".toast").forEach(node => node.remove());
  }, 2500);
}

function materialLineTotal(quantity, unitPrice, fallback = 0) {
  const qty = Number(quantity || 0);
  const price = Number(unitPrice || 0);
  if (!qty || !price) return Number(fallback || 0);
  return Number((qty * price).toFixed(2));
}

function updateMaterialTotal(form) {
  const quantity = form.querySelector("[data-calc-quantity]");
  const unitPrice = form.querySelector("[data-calc-unit-price]");
  const total = form.querySelector("[data-calc-total]");
  if (!quantity || !unitPrice || !total) return;
  const calculated = materialLineTotal(quantity.value, unitPrice.value, "");
  total.value = calculated ? calculated.toFixed(2) : "";
}

document.addEventListener("input", event => {
  if (!event.target.closest("[data-calc-quantity], [data-calc-unit-price]")) return;
  const line = event.target.closest("[data-quote-material-line]");
  const container = line || event.target.closest("form");
  if (container) updateMaterialTotal(container);
});

document.addEventListener("click", async event => {
  const addQuoteMaterialLine = event.target.closest("[data-add-quote-material-line]");
  if (addQuoteMaterialLine) {
    const form = addQuoteMaterialLine.closest("form");
    const lines = form?.querySelector("[data-quote-material-lines]");
    if (lines) lines.insertAdjacentHTML("beforeend", quoteMaterialLineFields());
    return;
  }
  const removeQuoteMaterialLine = event.target.closest("[data-remove-quote-material-line]");
  if (removeQuoteMaterialLine) {
    const line = removeQuoteMaterialLine.closest("[data-quote-material-line]");
    const lines = line?.parentElement;
    if (lines && lines.querySelectorAll("[data-quote-material-line]").length > 1) {
      line.remove();
    } else {
      line?.querySelectorAll("input").forEach(input => { input.value = ""; });
    }
    return;
  }
  const view = event.target.closest("[data-view]");
  if (view) {
    setView(view.dataset.view);
    openAddPanel = "";
    if (view.dataset.view !== "jobs") selectedJobId = "";
    render();
    return;
  }
  const notificationButton = event.target.closest("[data-notification-target]");
  if (notificationButton) {
    const [viewName, section] = notificationButton.dataset.notificationTarget.split(":");
    if (!canView(viewName)) {
      toast = "Your role does not have access to that area";
      render();
      return;
    }
    currentView = viewName;
    if (section) activeSections[viewName] = section;
    openAddPanel = "";
    const addKeys = {
      accommodation: { add: "accommodation" },
      jobs: { add: "job" },
      quotes: { add: "quote", addSupplier: "supplier" },
      team: { add: "user" },
      cnc: { add: "cnc" },
      invoices: { add: "invoice" },
      payments: { add: "payments" },
      sharedCosts: { add: `shared-${sharedCostTab}` },
      planner: { add: "planner" }
    };
    openAddPanel = addKeys[viewName]?.[section] || "";
    selectedJobId = "";
    editingRecord = { type: "", id: "" };
    editingAccommodationId = "";
    render();
    return;
  }
  const viewJob = event.target.closest("[data-view-job]");
  if (viewJob) {
    selectedJobId = viewJob.dataset.viewJob;
    openAddPanel = "";
    editingRecord = { type: "", id: "" };
    render();
    return;
  }
  if (event.target.closest("[data-back-jobs]")) {
    selectedJobId = "";
    openAddPanel = "";
    editingRecord = { type: "", id: "" };
    render();
    return;
  }
  const openAdd = event.target.closest("[data-open-add]");
  if (openAdd) {
    openAddPanel = openAdd.dataset.openAdd;
    editingRecord = { type: "", id: "" };
    editingAccommodationId = "";
    render();
    return;
  }
  if (event.target.closest("[data-cancel-add]")) {
    openAddPanel = "";
    render();
    return;
  }
  const sectionButton = event.target.closest("[data-section-view]");
  if (sectionButton) {
    const [view, section] = sectionButton.dataset.sectionView.split(":");
    activeSections[view] = section;
    openAddPanel = "";
    const addKeys = {
      jobs: { add: "job" },
      quotes: { add: "quote", addSupplier: "supplier" },
      team: { add: "user" },
      cnc: { add: "cnc" },
      invoices: { add: "invoice" },
      payments: { add: "payments" },
      accommodation: { add: "accommodation" },
      sharedCosts: { add: `shared-${sharedCostTab}` },
      planner: { add: "planner" }
    };
    openAddPanel = addKeys[view]?.[section] || "";
    editingRecord = { type: "", id: "" };
    editingAccommodationId = "";
    render();
    return;
  }
  const plannerMonthButton = event.target.closest("[data-planner-month]");
  if (plannerMonthButton) {
    plannerMonth = shiftMonth(plannerMonth, Number(plannerMonthButton.dataset.plannerMonth || 0));
    render();
    return;
  }
  if (event.target.closest("[data-planner-today]")) {
    plannerMonth = todayIso().slice(0, 7);
    render();
    return;
  }
  const timesheetShift = event.target.closest("[data-timesheet-shift]");
  if (timesheetShift) {
    timesheetWeek = addDaysIso(timesheetWeek, Number(timesheetShift.dataset.timesheetShift || 0));
    timesheetDay = addDaysIso(timesheetDay, Number(timesheetShift.dataset.timesheetShift || 0));
    timesheetDetail = { userId: "", date: "" };
    render();
    return;
  }
  if (event.target.closest("[data-timesheet-today]")) {
    timesheetWeek = weekStartIso(todayIso());
    timesheetDay = todayIso();
    timesheetDetail = { userId: "", date: "" };
    render();
    return;
  }
  const timesheetModeButton = event.target.closest("[data-timesheet-mode]");
  if (timesheetModeButton) {
    timesheetMode = timesheetModeButton.dataset.timesheetMode;
    render();
    return;
  }
  const timesheetSectionButton = event.target.closest("[data-timesheet-section]");
  if (timesheetSectionButton) {
    timesheetSection = timesheetSectionButton.dataset.timesheetSection;
    render();
    return;
  }
  const timesheetDayButton = event.target.closest("[data-timesheet-day]");
  if (timesheetDayButton) {
    timesheetDay = timesheetDayButton.dataset.timesheetDay;
    timesheetMode = "day";
    timesheetDetail = { userId: "", date: "" };
    render();
    return;
  }
  const timesheetDetailButton = event.target.closest("[data-timesheet-detail]");
  if (timesheetDetailButton) {
    const [userId, date] = timesheetDetailButton.dataset.timesheetDetail.split(":");
    timesheetDetail = { userId, date };
    timesheetDay = date;
    timesheetWeek = weekStartIso(date);
    timesheetMode = "day";
    render();
    return;
  }
  const holidayShift = event.target.closest("[data-holiday-shift]");
  if (holidayShift) {
    holidayWeek = addDaysIso(holidayWeek, Number(holidayShift.dataset.holidayShift || 0));
    holidayDay = addDaysIso(holidayDay, Number(holidayShift.dataset.holidayShift || 0));
    render();
    return;
  }
  if (event.target.closest("[data-holiday-today]")) {
    holidayWeek = weekStartIso(todayIso());
    holidayDay = todayIso();
    render();
    return;
  }
  const holidayModeButton = event.target.closest("[data-holiday-mode]");
  if (holidayModeButton) {
    holidayMode = holidayModeButton.dataset.holidayMode;
    render();
    return;
  }
  const holidayDayButton = event.target.closest("[data-holiday-day]");
  if (holidayDayButton) {
    holidayDay = holidayDayButton.dataset.holidayDay;
    holidayMode = "day";
    render();
    return;
  }
  const payrollShift = event.target.closest("[data-payroll-shift]");
  if (payrollShift) {
    payrollWeek = addDaysIso(payrollWeek, Number(payrollShift.dataset.payrollShift || 0));
    render();
    return;
  }
  if (event.target.closest("[data-payroll-today]")) {
    payrollWeek = weekStartIso(todayIso());
    render();
    return;
  }
  if (event.target.closest("[data-sign-out]")) {
    session = null;
    saveSession();
    render();
    return;
  }
  const nextCnc = event.target.closest("[data-next-cnc]");
  if (nextCnc) {
    const item = db.cnc.find(row => row.id === nextCnc.dataset.nextCnc);
    if (item) item.status = cncStages[Math.min(cncStages.indexOf(item.status) + 1, cncStages.length - 1)];
    if (item) await saveLocalAndRemote("cnc_operations", item);
    render();
    return;
  }
  const deleteCnc = event.target.closest("[data-delete-cnc]");
  if (deleteCnc) {
    db.cnc = db.cnc.filter(item => item.id !== deleteCnc.dataset.deleteCnc);
    await deleteLocalAndRemote("cnc_operations", deleteCnc.dataset.deleteCnc).catch(error => { toast = error.message; });
    render();
    return;
  }
  const toggleUser = event.target.closest("[data-toggle-user]");
  if (toggleUser) {
    const user = db.users.find(item => item.id === toggleUser.dataset.toggleUser);
    if (user) {
      user.active = user.active === false;
      await saveLocalAndRemote("app_users", user).catch(error => { toast = error.message; });
    }
    render();
    return;
  }
  const deleteUser = event.target.closest("[data-delete-user]");
  if (deleteUser) {
    const user = db.users.find(item => item.id === deleteUser.dataset.deleteUser);
    if (!user) return;
    if (user.id === session.userId) {
      toast = "You cannot delete the user you are signed in as";
      render();
      return;
    }
    if (!window.confirm(`Delete ${user.name} completely from the men register? Historic timesheets and payroll records will stay for reporting.`)) return;
    db.users = db.users.filter(item => item.id !== user.id);
    db.planner.forEach(item => {
      item.userIds = (item.userIds || []).filter(id => id !== user.id);
      if (item.userId === user.id) item.userId = item.userIds[0] || "";
    });
    saveDb();
    await deleteLocalAndRemote("app_users", user.id).catch(error => { toast = error.message; });
    await Promise.all(db.planner.map(item => saveLocalAndRemote("planner_items", item).catch(error => { toast = error.message; })));
    toast = toast || "Man deleted from register";
    render();
    return;
  }
  const payWage = event.target.closest("[data-pay-wage]");
  if (payWage) {
    const row = db.timesheets.find(item => item.id === payWage.dataset.payWage);
    if (row) {
      const payroll = userPayroll(row);
      row.payrollStatus = "Paid";
      const payment = {
        id: crypto.randomUUID(),
        jobId: row.jobId || "",
        category: "Wages",
        description: `${payroll.user.employmentType || "PAYE"} wages - ${row.userName} - ${row.date}`,
        amount: payroll.net,
        status: "Paid",
        paymentDate: todayIso()
      };
      db.payments.push(payment);
      await saveLocalAndRemote("timesheets", row).catch(error => { toast = error.message; });
      await saveLocalAndRemote("payments_out", payment).catch(error => { toast = error.message; });
      toast = "Wage marked paid and added to cashflow";
    }
    render();
    return;
  }
  const payWageDay = event.target.closest("[data-pay-wage-day]");
  if (payWageDay) {
    const rows = db.timesheets.filter(row => row.date === payWageDay.dataset.payWageDay && row.payrollStatus !== "Paid" && Number(row.hours || 0) > 0);
    const net = rows.reduce((sum, row) => sum + userPayroll(row).net, 0);
    rows.forEach(row => { row.payrollStatus = "Paid"; });
    const payment = {
      id: crypto.randomUUID(),
      jobId: "",
      category: "Wages",
      description: `Daily wages - ${payWageDay.dataset.payWageDay}`,
      amount: net,
      status: "Paid",
      paymentDate: payWageDay.dataset.payWageDay
    };
    db.payments.push(payment);
    await Promise.all(rows.map(row => saveLocalAndRemote("timesheets", row).catch(error => { toast = error.message; })));
    await saveLocalAndRemote("payments_out", payment).catch(error => { toast = error.message; });
    toast = "Payroll day marked paid and added to cashflow";
    render();
    return;
  }
  const payWageWeek = event.target.closest("[data-pay-wage-week]");
  if (payWageWeek) {
    const key = payWageWeek.dataset.payWageWeek;
    const weekEnd = addDaysIso(payrollWeek, 6);
    const rows = db.timesheets.filter(row => {
      const rowKey = row.userId || row.userName;
      return row.date >= payrollWeek && row.date <= weekEnd && row.payrollStatus !== "Paid" && Number(row.hours || 0) > 0 && rowKey === key;
    });
    const net = rows.reduce((sum, row) => sum + userPayroll(row).net, 0);
    const name = rows[0]?.userName || userLabel(rows[0]?.userId) || "Payroll";
    rows.forEach(row => { row.payrollStatus = "Paid"; });
    const payment = {
      id: crypto.randomUUID(),
      jobId: "",
      category: "Wages",
      description: `Weekly wages - ${name} - ${payrollWeek} to ${weekEnd}`,
      amount: net,
      status: "Paid",
      paymentDate: weekEnd
    };
    if (rows.length) db.payments.push(payment);
    await Promise.all(rows.map(row => saveLocalAndRemote("timesheets", row).catch(error => { toast = error.message; })));
    if (rows.length) await saveLocalAndRemote("payments_out", payment).catch(error => { toast = error.message; });
    toast = rows.length ? "Weekly payroll marked paid and added to cashflow" : "No unpaid payroll found for that week";
    render();
    return;
  }
  const holidayStatus = event.target.closest("[data-holiday-status]");
  if (holidayStatus) {
    const [id, status] = holidayStatus.dataset.holidayStatus.split(":");
    const item = db.holidays.find(row => row.id === id);
    if (item) {
      item.status = status;
      item.decisionNote = `${status} by ${session.name} on ${todayIso()}`;
      await saveLocalAndRemote("holiday_requests", item).catch(error => { toast = error.message; });
      toast = `Holiday ${status.toLowerCase()}`;
    }
    render();
    return;
  }
  const editButton = event.target.closest("[data-edit-record]");
  if (editButton) {
    const [type, id] = editButton.dataset.editRecord.split(":");
    openAddPanel = "";
    const payment = db.payments.find(item => item.id === id);
    if (type === "payments" && currentView === "accommodation" && payment?.category === "Accommodation") {
      editingAccommodationId = id;
      render();
      return;
    }
    editingRecord = { type, id };
    render();
    return;
  }
  if (event.target.closest("[data-cancel-edit]")) {
    editingRecord = { type: "", id: "" };
    render();
    return;
  }
  if (event.target.closest("[data-cancel-accommodation-edit]")) {
    editingAccommodationId = "";
    render();
    return;
  }
  const sharedTab = event.target.closest("[data-shared-cost-tab]");
  if (sharedTab) {
    sharedCostTab = sharedTab.dataset.sharedCostTab;
    editingRecord = { type: "", id: "" };
    render();
    return;
  }
  const deleteButton = event.target.closest("[data-delete-record]");
  if (deleteButton) {
    const [type, id] = deleteButton.dataset.deleteRecord.split(":");
    await deleteRecord(type, id);
    render();
    return;
  }
  if (event.target.closest("[data-reset-local]")) {
    db = structuredClone(seed);
    saveDb();
    render();
  }
  if (event.target.closest("[data-sync-supabase]")) {
    loadRemoteDb().then(() => {
      toast = "Synced from Supabase";
      render();
    }).catch(error => {
      toast = error.message;
      render();
    });
  }
});

document.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  if (event.submitter?.name) values[event.submitter.name] = event.submitter.value;

  if (form.matches("[data-import-csv]")) {
    const file = form.querySelector('input[name="csv"]')?.files[0];
    if (!file) {
      toast = "Choose a CSV file to import";
      render();
      return;
    }
    const count = await importCsv(form.dataset.importCsv, await file.text());
    saveDb();
    toast = `${count} row${count === 1 ? "" : "s"} imported`;
    render();
    return;
  }

  if (form.matches("[data-timesheet-jump]")) {
    const date = values.date || todayIso();
    timesheetWeek = weekStartIso(date);
    timesheetDay = date;
    timesheetDetail = { userId: "", date: "" };
    render();
    return;
  }

  if (form.matches("[data-payroll-jump]")) {
    payrollWeek = weekStartIso(values.date || todayIso());
    render();
    return;
  }

  if (form.matches("[data-holiday-jump]")) {
    const date = values.date || todayIso();
    holidayWeek = weekStartIso(date);
    holidayDay = date;
    render();
    return;
  }

  if (form.matches("[data-login]")) {
    if (hasSupabase()) {
      try {
        await loadRemoteDb();
      } catch (error) {
        toast = `Supabase unavailable: ${error.message}`;
      }
    }
    const user = db.users.find(item => item.id === values.userId);
    if (!user || user.pin !== values.pin) {
      toast = "Sign in details do not match";
      render();
      return;
    }
    session = { userId: user.id, name: user.name, role: user.role };
    saveSession();
    setView("dashboard");
    render();
    return;
  }

  if (form.matches("[data-save-supabase]")) {
    saveSupabaseConfig(values);
    try {
      await loadRemoteDb();
      toast = "Connected to Supabase";
    } catch (error) {
      toast = error.message;
    }
    render();
    return;
  }

  if (form.matches("[data-save-settings]")) {
    saveAppSettings(values);
    toast = "Financial start date saved";
    render();
    return;
  }

  if (form.matches("[data-add-job]")) {
    const job = {
      id: crypto.randomUUID(),
      number: values.number,
      client: values.client,
      contractor: values.contractor,
      address: values.address,
      description: values.description,
      status: values.status,
      accommodationNeeded: values.accommodationNeeded === "true",
      value: Number(values.value || 0),
      labourBudget: Number(values.labourBudget || 0),
      materialBudget: Number(values.materialBudget || 0),
      start: values.start || todayIso(),
      finish: values.finish || ""
    };
    db.jobs.push(job);
    await saveLocalAndRemote("jobs", job);
    openAddPanel = "";
    setView("jobs");
    render();
    return;
  }

  if (form.matches("[data-edit-job]")) {
    const job = db.jobs.find(item => item.id === values.id);
    if (job) {
      Object.assign(job, {
        number: values.number,
        client: values.client,
        contractor: values.contractor,
        address: values.address,
        description: values.description,
        status: values.status,
        accommodationNeeded: values.accommodationNeeded === "true",
        value: Number(values.value || 0),
        labourBudget: Number(values.labourBudget || 0),
        materialBudget: Number(values.materialBudget || 0),
        start: values.start || "",
        finish: values.finish || ""
      });
      await saveLocalAndRemote("jobs", job);
      editingRecord = { type: "", id: "" };
      toast = "Job updated";
    }
    setView("jobs");
    render();
    return;
  }

  if (form.matches("[data-add-user]")) {
    const user = {
      id: crypto.randomUUID(),
      name: values.name,
      role: values.role,
      pin: values.pin,
      employmentType: values.employmentType,
      hourlyRate: Number(values.hourlyRate || 0),
      cisRate: values.employmentType === "CIS" ? Number(values.cisRate || 0) : 0,
      taxRate: values.employmentType === "PAYE" ? Number(values.taxRate || 0) : 0,
      niRate: values.employmentType === "PAYE" ? Number(values.niRate || 0) : 0,
      pensionRate: values.employmentType === "PAYE" ? Number(values.pensionRate || 0) : 0,
      active: true
    };
    db.users.push(user);
    await saveLocalAndRemote("app_users", user);
    openAddPanel = "";
    setView("team");
    render();
    return;
  }

  if (form.matches("[data-edit-user]")) {
    const user = db.users.find(item => item.id === values.id);
    if (user) {
      Object.assign(user, {
        name: values.name,
        role: values.role,
        pin: values.pin,
        employmentType: values.employmentType,
        hourlyRate: Number(values.hourlyRate || 0),
        cisRate: values.employmentType === "CIS" ? Number(values.cisRate || 0) : 0,
        taxRate: values.employmentType === "PAYE" ? Number(values.taxRate || 0) : 0,
        niRate: values.employmentType === "PAYE" ? Number(values.niRate || 0) : 0,
        pensionRate: values.employmentType === "PAYE" ? Number(values.pensionRate || 0) : 0,
        active: values.active !== "false"
      });
      await saveLocalAndRemote("app_users", user);
      if (session.userId === user.id) {
        session = { userId: user.id, name: user.name, role: user.role };
        saveSession();
      }
      editingRecord = { type: "", id: "" };
      activeSections.team = "men";
      toast = "Man updated";
    }
    setView("team");
    render();
    return;
  }

  if (form.matches("[data-add-cnc]")) {
    const file = form.querySelector('input[name="drawing"]').files[0];
    const item = { id: crypto.randomUUID(), jobId: values.jobId, title: values.title, requiredBy: values.requiredBy, priority: values.priority, status: "Drawing Received", breakdownNotes: values.breakdownNotes, fileName: file?.name || "" };
    db.cnc.push(item);
    await saveLocalAndRemote("cnc_operations", item);
    openAddPanel = "";
    setView("cnc");
    render();
    return;
  }

  if (form.matches("[data-add-planner]")) {
    const selectedUserIds = new FormData(form).getAll("userIds");
    const item = {
      id: crypto.randomUUID(),
      jobId: values.jobId || "",
      userId: selectedUserIds[0] || "",
      userIds: selectedUserIds,
      title: values.title,
      type: values.type,
      date: values.date || todayIso(),
      time: values.time || "",
      priority: values.priority,
      status: values.status,
      notes: values.notes || ""
    };
    db.planner.push(item);
    await saveLocalAndRemote("planner_items", item);
    openAddPanel = "";
    setView("planner");
    render();
    return;
  }

  if (form.matches("[data-edit-planner]")) {
    const item = db.planner.find(row => row.id === values.id);
    if (item) {
      const selectedUserIds = new FormData(form).getAll("userIds");
      Object.assign(item, {
        jobId: values.jobId || "",
        userId: selectedUserIds[0] || "",
        userIds: selectedUserIds,
        title: values.title,
        type: values.type,
        date: values.date || todayIso(),
        time: values.time || "",
        priority: values.priority,
        status: values.status,
        notes: values.notes || ""
      });
      await saveLocalAndRemote("planner_items", item);
      editingRecord = { type: "", id: "" };
      toast = "Planner item updated";
    }
    setView("planner");
    render();
    return;
  }

  if (form.matches("[data-timesheet-entry]")) {
    const date = values.date || todayIso();
    const userId = ownTimesheetsOnly() ? session.userId : values.userId;
    const user = db.users.find(item => item.id === userId) || session;
    const hours = Number(values.hours || 0);
    const action = values.action || "hours";
    const selection = parseTimesheetJob(values.jobId);
    let saved = false;
    let location = null;

    if (action.includes("in")) {
      location ||= await currentLocation();
      const open = db.timesheets.find(row => row.date === date && row.userId === userId && sameId(row.jobId, selection.jobId) && row.signIn && !row.signOut);
      const row = open || { id: crypto.randomUUID(), date, userId, userName: user.name, jobId: selection.jobId, activity: selection.activity, hours: 0, payrollStatus: "Unpaid", signIn: "", signInLocation: null, signOut: "", signOutLocation: null };
      row.activity = row.activity || selection.activity;
      row.signIn = row.signIn || nowTime();
      row.signInLocation = row.signInLocation || location;
      if (!open) db.timesheets.push(row);
      await saveLocalAndRemote("timesheets", row);
      saved = true;
    }

    if (action.includes("out")) {
      location ||= await currentLocation();
      const open = db.timesheets.find(row => row.date === date && row.userId === userId && row.signIn && !row.signOut);
      const row = open || { id: crypto.randomUUID(), date, userId, userName: user.name, jobId: selection.jobId, activity: selection.activity, hours: 0, payrollStatus: "Unpaid", signIn: "", signInLocation: null, signOut: "", signOutLocation: null };
      row.jobId = row.jobId || selection.jobId;
      row.activity = row.activity || selection.activity;
      row.signOut = nowTime();
      row.signOutLocation = location;
      if (!open) db.timesheets.push(row);
      await saveLocalAndRemote("timesheets", row);
      saved = true;
    }

    if (hours > 0) {
      const allocation = db.timesheets.find(row => row.date === date && row.userId === userId && sameId(row.jobId, selection.jobId) && (row.activity || "Site work") === selection.activity && !row.signIn && !row.signOut);
      if (allocation) {
        allocation.hours = Number(allocation.hours || 0) + hours;
        await saveLocalAndRemote("timesheets", allocation);
      } else {
        const item = { id: crypto.randomUUID(), date, userId, userName: user.name, jobId: selection.jobId, activity: selection.activity, hours, payrollStatus: "Unpaid", signIn: "", signInLocation: null, signOut: "", signOutLocation: null };
        db.timesheets.push(item);
        await saveLocalAndRemote("timesheets", item);
      }
      saved = true;
    }

    toast = saved ? "Timesheet saved" : "Nothing to save";
    setView("timesheets");
    render();
    return;
  }

  if (form.matches("[data-add-holiday]")) {
    const userId = ownTimesheetsOnly() ? session.userId : values.userId;
    const user = db.users.find(item => item.id === userId) || session;
    const item = {
      id: crypto.randomUUID(),
      userId,
      userName: user.name,
      startDate: values.startDate || todayIso(),
      endDate: values.endDate || values.startDate || todayIso(),
      days: Number(values.days || 1),
      status: "Pending",
      reason: values.reason || "",
      decisionNote: ""
    };
    db.holidays.push(item);
    await saveLocalAndRemote("holiday_requests", item).catch(error => { toast = error.message; });
    toast = toast || "Holiday request submitted";
    setView("holidays");
    render();
    return;
  }

  const moneyTargets = [
    ["[data-add-payment]", "payments", "payments"],
    ["[data-add-accommodation]", "payments", "accommodation", "Accommodation"],
    ["[data-add-shared-cost]", "sharedCosts", "shared-costs"]
  ];

  if (form.matches("[data-add-quote]")) {
    const materialLines = collectQuoteMaterialLines(form);
    const quote = {
      id: crypto.randomUUID(),
      jobId: values.jobId || "",
      jobName: values.jobName || "",
      accommodationNeeded: values.accommodationNeeded === "true",
      company: values.company,
      contactName: values.contactName,
      contactRole: values.contactRole || "",
      phone: values.phone || "",
      email: values.email || "",
      siteAddress: values.siteAddress || "",
      leadSource: values.leadSource || "",
      nextAction: values.nextAction || "",
      expectedStart: values.expectedStart || "",
      quoteDeadline: values.quoteDeadline || "",
      decisionMaker: values.decisionMaker || "",
      priority: values.priority || "Normal",
      scope: values.scope || "",
      exclusions: values.exclusions || "",
      description: values.description,
      amount: Number(values.amount || 0),
      status: values.status || "Draft",
      quoteDate: values.quoteDate || todayIso(),
      followUpDate: values.followUpDate || "",
      notes: values.notes || ""
    };
    db.quotes.push(quote);
    await saveLocalAndRemote("quotes", quote).catch(error => { toast = `Quote saved locally. Run the Supabase migration for online sync: ${error.message}`; });
    const materials = materialLines.map(line => ({
        id: crypto.randomUUID(),
        quoteId: quote.id,
        materialName: line.materialName || "Material",
        supplier: line.supplier || "",
        supplierCode: line.supplierCode || "",
        salesRep: "",
        website: "",
        email: "",
        quantity: line.quantity,
        unit: line.unit || "",
        unitPrice: line.unitPrice,
        netAmount: line.totalAmount,
        vatAmount: 0,
        totalAmount: line.totalAmount,
        leadTime: "",
        referenceFile: line.referenceFile || "",
        orderStatus: "To order",
        notes: ""
      }));
    db.quoteMaterials.push(...materials);
    await Promise.all(materials.map(material => saveLocalAndRemote("quote_materials", material).catch(error => { toast = `Quote saved locally. Run the Supabase migration for material sync: ${error.message}`; })));
    const createdJob = await ensureJobForWonQuote(quote);
    toast = toast || "Quote saved";
    if (createdJob) toast = `Quote won. Job created and ${materials.length} material${materials.length === 1 ? "" : "s"} flagged to order.`;
    openAddPanel = "";
    activeSections.quotes = "register";
    setView("quotes");
    render();
    return;
  }

  if (form.matches("[data-edit-quote]")) {
    const quote = db.quotes.find(item => item.id === values.id);
    if (quote) {
      Object.assign(quote, {
        jobId: values.jobId || "",
        jobName: values.jobName || "",
        accommodationNeeded: values.accommodationNeeded === "true",
        company: values.company,
        contactName: values.contactName,
        contactRole: values.contactRole || "",
        phone: values.phone || "",
        email: values.email || "",
        siteAddress: values.siteAddress || "",
        leadSource: values.leadSource || "",
        nextAction: values.nextAction || "",
        expectedStart: values.expectedStart || "",
        quoteDeadline: values.quoteDeadline || "",
        decisionMaker: values.decisionMaker || "",
        priority: values.priority || "Normal",
        scope: values.scope || "",
        exclusions: values.exclusions || "",
        description: values.description,
        amount: Number(values.amount || 0),
        status: values.status || "Draft",
        quoteDate: values.quoteDate || todayIso(),
        followUpDate: values.followUpDate || "",
        notes: values.notes || ""
      });
      await saveLocalAndRemote("quotes", quote).catch(error => { toast = `Quote updated locally. Run the Supabase migration for online sync: ${error.message}`; });
      const linkedJob = await ensureJobForWonQuote(quote);
      editingRecord = { type: "", id: "" };
      toast = toast || (linkedJob ? "Quote won and linked to Jobs" : "Quote updated");
    }
    setView("quotes");
    render();
    return;
  }

  if (form.matches("[data-add-job-material]")) {
    const file = form.querySelector('input[name="proof"]')?.files[0];
    const item = {
      id: crypto.randomUUID(),
      jobId: values.jobId || "",
      paymentId: "",
      materialName: values.materialName,
      supplier: values.supplier,
      netAmount: Number(values.netAmount || 0),
      vatAmount: Number(values.vatAmount || 0),
      purchaseDate: values.purchaseDate || todayIso(),
      proofFile: file?.name || "",
      notes: values.notes || "",
      paymentStatus: values.paymentStatus || "Pending"
    };
    const payment = materialPaymentPayload(item);
    item.paymentId = payment.id;
    db.jobMaterials.push(item);
    db.payments.push(payment);
    await saveLocalAndRemote("job_materials", item).catch(error => { toast = `Material saved locally. Check Supabase sync: ${error.message}`; });
    await saveLocalAndRemote("payments_out", payment).catch(error => { toast = `Material payment saved locally. Check Supabase sync: ${error.message}`; });
    openAddPanel = values.afterSave === "another" ? `job-material-${item.jobId}` : "";
    selectedJobId = item.jobId;
    setView("jobs");
    toast = toast || (values.afterSave === "another" ? "Material saved. Add the next material line." : "Material saved");
    render();
    return;
  }

  if (form.matches("[data-edit-jobMaterial]")) {
    const item = db.jobMaterials.find(row => row.id === values.id);
    if (item) {
      const file = form.querySelector('input[name="proof"]')?.files[0];
      Object.assign(item, {
        jobId: values.jobId || "",
        materialName: values.materialName,
        supplier: values.supplier,
        netAmount: Number(values.netAmount || 0),
        vatAmount: Number(values.vatAmount || 0),
        purchaseDate: values.purchaseDate || todayIso(),
        proofFile: file?.name || values.existingProofFile || "",
        notes: values.notes || "",
        paymentStatus: values.paymentStatus || linkedMaterialPayment(item)?.status || "Pending"
      });
      let payment = linkedMaterialPayment(item);
      if (payment) {
        Object.assign(payment, materialPaymentPayload(item, payment.id));
      } else {
        payment = materialPaymentPayload(item);
        item.paymentId = payment.id;
        db.payments.push(payment);
      }
      await saveLocalAndRemote("job_materials", item);
      await saveLocalAndRemote("payments_out", payment);
      editingRecord = { type: "", id: "" };
      toast = "Job material updated";
    }
    selectedJobId = item?.jobId || selectedJobId;
    setView("jobs");
    render();
    return;
  }

  if (form.matches("[data-add-quote-material]")) {
    const file = form.querySelector('input[name="reference"]')?.files[0];
    const materialTotal = materialLineTotal(values.quantity, values.unitPrice, values.totalAmount || values.netAmount);
    const item = {
      id: crypto.randomUUID(),
      quoteId: values.quoteId || "",
      materialName: values.materialName,
      supplier: values.supplier,
      supplierCode: values.supplierCode || "",
      salesRep: values.salesRep || "",
      supplierPhone: values.supplierPhone || "",
      website: values.website || "",
      email: values.email || "",
      quantity: Number(values.quantity || 0),
      unit: values.unit || "",
      unitPrice: Number(values.unitPrice || 0),
      netAmount: Number(values.netAmount || materialTotal || 0),
      vatAmount: Number(values.vatAmount || 0),
      totalAmount: materialTotal,
      leadTime: values.leadTime || "",
      referenceFile: file?.name || "",
      orderStatus: values.orderStatus || "To order",
      notes: values.notes || ""
    };
    db.quoteMaterials.push(item);
    await saveLocalAndRemote("quote_materials", item).catch(error => { toast = `Material saved locally. Run the Supabase migration for online sync: ${error.message}`; });
    toast = toast || "Quote material saved";
    openAddPanel = "";
    activeSections.quotes = "suppliers";
    setView("quotes");
    render();
    return;
  }

  if (form.matches("[data-add-supplier]")) {
    const item = {
      id: crypto.randomUUID(),
      name: values.name,
      salesRep: values.salesRep || "",
      email: values.email || "",
      phone: values.phone || "",
      website: values.website || "",
      notes: values.notes || ""
    };
    db.suppliers.push(item);
    await saveLocalAndRemote("suppliers", item).catch(error => { toast = `Supplier saved locally. Run the Supabase migration for online sync: ${error.message}`; });
    toast = toast || "Supplier saved";
    openAddPanel = "";
    activeSections.quotes = "supplierDb";
    setView("quotes");
    render();
    return;
  }

  if (form.matches("[data-edit-supplier]")) {
    const item = db.suppliers.find(row => row.id === values.id);
    if (item) {
      Object.assign(item, {
        name: values.name,
        salesRep: values.salesRep || "",
        email: values.email || "",
        phone: values.phone || "",
        website: values.website || "",
        notes: values.notes || ""
      });
      await saveLocalAndRemote("suppliers", item).catch(error => { toast = `Supplier updated locally. Run the Supabase migration for online sync: ${error.message}`; });
      editingRecord = { type: "", id: "" };
      toast = toast || "Supplier updated";
    }
    activeSections.quotes = "supplierDb";
    setView("quotes");
    render();
    return;
  }

  if (form.matches("[data-edit-quoteMaterial]")) {
    const item = db.quoteMaterials.find(row => row.id === values.id);
    if (item) {
      const file = form.querySelector('input[name="reference"]')?.files[0];
      const materialTotal = materialLineTotal(values.quantity, values.unitPrice, values.totalAmount || values.netAmount);
      Object.assign(item, {
        quoteId: values.quoteId || "",
        materialName: values.materialName,
        supplier: values.supplier,
        supplierCode: values.supplierCode || "",
        salesRep: values.salesRep || "",
        supplierPhone: values.supplierPhone || "",
        website: values.website || "",
        email: values.email || "",
        quantity: Number(values.quantity || 0),
        unit: values.unit || "",
        unitPrice: Number(values.unitPrice || 0),
        netAmount: Number(values.netAmount || materialTotal || 0),
        vatAmount: Number(values.vatAmount || 0),
        totalAmount: materialTotal,
        leadTime: values.leadTime || "",
        referenceFile: file?.name || values.existingReferenceFile || "",
        orderStatus: values.orderStatus || "To order",
        notes: values.notes || ""
      });
      await saveLocalAndRemote("quote_materials", item).catch(error => { toast = `Material updated locally. Run the Supabase migration for online sync: ${error.message}`; });
      editingRecord = { type: "", id: "" };
      toast = toast || "Supplier updated";
    }
    setView("quotes");
    render();
    return;
  }

  if (form.matches("[data-add-invoice]")) {
    const invoice = {
      id: crypto.randomUUID(),
      jobId: values.jobId || "",
      description: values.description,
      amount: Number(values.amount || 0),
      vatApplies: values.vatApplies !== "false",
      cisApplies: values.cisApplies === "true",
      cisRate: Number(values.cisRate ?? 20),
      cisAmount: values.cisAmount === "" ? "" : Number(values.cisAmount || 0),
      status: values.status,
      dueDate: values.dueDate || "",
      paidDate: values.status === "Paid" ? todayIso() : ""
    };
    db.invoices.push(invoice);
    await saveLocalAndRemote("invoices", invoice);
    openAddPanel = "";
    setView("invoices");
    render();
    return;
  }

  if (form.matches("[data-edit-invoice]")) {
    const invoice = db.invoices.find(item => item.id === values.id);
    if (invoice) {
      Object.assign(invoice, {
        jobId: values.jobId || "",
        description: values.description,
        amount: Number(values.amount || 0),
        vatApplies: values.vatApplies !== "false",
        cisApplies: values.cisApplies === "true",
        cisRate: Number(values.cisRate ?? 20),
        cisAmount: values.cisAmount === "" ? "" : Number(values.cisAmount || 0),
        status: values.status,
        dueDate: values.dueDate || "",
        paidDate: values.status === "Paid" ? values.paidDate || todayIso() : ""
      });
      await saveLocalAndRemote("invoices", invoice);
      editingRecord = { type: "", id: "" };
      toast = "Invoice updated";
    }
    setView("invoices");
    render();
    return;
  }

  if (form.matches("[data-edit-payments], [data-edit-shared-cost]")) {
    const type = form.matches("[data-edit-payments]") ? "payments" : "sharedCosts";
    const item = collectionForRecord(type).find(row => row.id === values.id);
    if (item) {
      Object.assign(item, {
        jobId: values.jobId || "",
        description: values.description,
        costType: type === "sharedCosts" ? values.costType || sharedCostTab : item.costType,
        category: values.category,
        paymentDate: values.paymentDate || todayIso(),
        amount: Number(values.amount || 0),
        status: values.status
      });
      await saveLocalAndRemote(tableNameForRecord(type), item);
      editingRecord = { type: "", id: "" };
      toast = "Record updated";
    }
    setView(type === "payments" ? "payments" : "shared-costs");
    render();
    return;
  }

  if (form.matches("[data-edit-accommodation]")) {
    const item = db.payments.find(row => row.id === values.id);
    if (item) {
      item.jobId = values.jobId || "";
      item.description = values.description;
      item.accommodationAddress = values.accommodationAddress || "";
      item.accommodationLocation = values.accommodationLocation || "";
      item.accommodationContact = values.accommodationContact || "";
      item.accommodationCheckInDate = values.accommodationCheckInDate || "";
      item.accommodationCheckOutDate = values.accommodationCheckOutDate || "";
      item.accommodationCheckOutTime = values.accommodationCheckOutTime || "";
      item.paymentDate = values.paymentDate || todayIso();
      item.amount = Number(values.amount || 0);
      item.status = values.status;
      item.category = "Accommodation";
      await saveLocalAndRemote("payments_out", item);
      editingAccommodationId = "";
      toast = "Accommodation updated";
    }
    setView("accommodation");
    render();
    return;
  }
  const target = moneyTargets.find(([selector]) => form.matches(selector));
  if (target) {
    const item = { id: crypto.randomUUID(), jobId: values.jobId || "", costType: values.costType || "Fixed", category: target[3] || values.category || "General", description: values.description, accommodationAddress: values.accommodationAddress || "", accommodationLocation: values.accommodationLocation || "", accommodationContact: values.accommodationContact || "", accommodationCheckInDate: values.accommodationCheckInDate || "", accommodationCheckOutDate: values.accommodationCheckOutDate || "", accommodationCheckOutTime: values.accommodationCheckOutTime || "", paymentDate: values.paymentDate || todayIso(), amount: Number(values.amount || 0), status: values.status };
    db[target[1]].push(item);
    await saveLocalAndRemote(target[1] === "payments" ? "payments_out" : "shared_costs", item);
    openAddPanel = "";
    setView(target[2]);
    render();
  }
});

render();
