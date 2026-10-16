import fs from "fs";
import path from "path";
import { createAdminClient } from "@/utils/supabase/server";

const DATA_BASE_DIR = path.join(process.cwd(), "data", "tenants");

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getTenantFilePath(businessId, fileName) {
  const safeId = String(businessId).replace(/[^a-zA-Z0-9_-]/g, "");
  const tenantDir = path.join(DATA_BASE_DIR, safeId);
  ensureDirectory(tenantDir);
  return path.join(tenantDir, fileName);
}

function readJsonFile(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) || defaultVal;
  } catch (err) {
    console.warn(`Failed to read tenant file ${filePath}:`, err.message);
    return defaultVal;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`Failed to write tenant file ${filePath}:`, err.message);
    return false;
  }
}

// ── Default Demonstration Expenses ─────────────────────────────
function getDefaultExpenses(businessId) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0];

  return [
    {
      id: "exp-demo-1",
      business_id: businessId,
      category: "ad_spend",
      amount: 2450,
      platform: "Facebook / Meta Ads",
      campaign_name: "Mega Festive Clearance CBO (High Purchase ROAS)",
      notes: "Daily ad budget for Dhaka & Chittagong delivery clusters",
      payment_method: "bKash Merchant",
      expense_date: today,
      user_email: "operator@smartinventory.app",
      created_at: new Date().toISOString(),
    },
    {
      id: "exp-demo-2",
      business_id: businessId,
      category: "packaging",
      amount: 1650,
      platform: "Local Packaging Mart",
      campaign_name: "",
      notes: "1,000 Poly Mailer Bags (10x14) + 4 rolls custom tamper-evident security tape",
      payment_method: "Cash",
      expense_date: today,
      user_email: "operator@smartinventory.app",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "exp-demo-3",
      business_id: businessId,
      category: "ad_spend",
      amount: 1200,
      platform: "TikTok Ads",
      campaign_name: "Oversized Tee UGC Video Funnel",
      notes: "Creator spark ad boost targeting fashion shoppers",
      payment_method: "Card",
      expense_date: yesterday,
      user_email: "operator@smartinventory.app",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "exp-demo-4",
      business_id: businessId,
      category: "salaries_rent",
      amount: 3000,
      platform: "Staff Payroll",
      campaign_name: "",
      notes: "Weekly warehouse packing boy & dispatch handler wage allowance",
      payment_method: "bKash Merchant",
      expense_date: yesterday,
      user_email: "admin@smartinventory.app",
      created_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    },
    {
      id: "exp-demo-5",
      business_id: businessId,
      category: "utilities_misc",
      amount: 850,
      platform: "Office & Internet",
      campaign_name: "",
      notes: "High-speed broadband optical fiber line + evening tea snacks for packing team",
      payment_method: "Cash",
      expense_date: threeDaysAgo,
      user_email: "operator@smartinventory.app",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];
}

// ── Default Demonstration Courier Reconciliations ───────────────
function getDefaultReconciliations(businessId) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  return [
    {
      id: "rec-demo-1",
      business_id: businessId,
      order_id: "ord-8841",
      consignment_id: "SF-8841029",
      tracking_code: "SFBD-8841029-TRK",
      courier: "Steadfast",
      customer_name: "Tamim Ahmed",
      customer_phone: "01700000000",
      order_amount: 6800,
      collected_amount: 6800,
      delivery_charge: 120,
      cod_fee: 68,
      payout_amount: 6162,
      expected_payout: 6612,
      variance: -450, // Short paid by 450 BDT!
      status: "SHORT_PAID",
      days_in_transit: 3,
      settlement_date: yesterday,
      claim_status: "NONE",
      claim_notes: "Discrepancy: Courier deducted excess ৳450 return charge on successfully delivered consignment.",
      batch_reference: "SF-PAYOUT-BATCH-2026-904",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "rec-demo-2",
      business_id: businessId,
      order_id: "ord-8842",
      consignment_id: "SF-8841030",
      tracking_code: "SFBD-8841030-TRK",
      courier: "Steadfast",
      customer_name: "Sabbir Hossain",
      customer_phone: "01712345678",
      order_amount: 3450,
      collected_amount: 3450,
      delivery_charge: 60,
      cod_fee: 35,
      payout_amount: 3355,
      expected_payout: 3355,
      variance: 0,
      status: "SETTLED",
      days_in_transit: 2,
      settlement_date: yesterday,
      claim_status: "NONE",
      claim_notes: "Full payout settled in bKash Merchant batch #SF-904.",
      batch_reference: "SF-PAYOUT-BATCH-2026-904",
      created_at: new Date(Date.now() - 86400000 * 2.5).toISOString(),
    },
    {
      id: "rec-demo-3",
      business_id: businessId,
      order_id: "ord-8843",
      consignment_id: "PTH-992101",
      tracking_code: "PTHBD-992101",
      courier: "Pathao",
      customer_name: "Nusrat Jahan",
      customer_phone: "01811223344",
      order_amount: 2900,
      collected_amount: 2900,
      delivery_charge: 70,
      cod_fee: 29,
      payout_amount: 0,
      expected_payout: 2801,
      variance: 0,
      status: "PENDING_PAYOUT",
      days_in_transit: 2,
      settlement_date: null,
      claim_status: "NONE",
      claim_notes: "Delivered to customer. Scheduled for next Tuesday weekly bank payout cycle.",
      batch_reference: "PTH-CYCLE-PENDING",
      created_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    },
    {
      id: "rec-demo-4",
      business_id: businessId,
      order_id: "ord-8844",
      consignment_id: "REDX-77192",
      tracking_code: "REDX-HUB-77192",
      courier: "RedX",
      customer_name: "Rafiul Karim",
      customer_phone: "01915678901",
      order_amount: 4200,
      collected_amount: 0,
      delivery_charge: 120,
      cod_fee: 0,
      payout_amount: 0,
      expected_payout: 4080,
      variance: -4200,
      status: "LOST_STUCK",
      days_in_transit: 9, // Stuck > 7 days!
      settlement_date: null,
      claim_status: "NONE",
      claim_notes: "Warning: Parcel stuck in Gazipur sorting hub for 9 consecutive days without movement scan. Immediate claim recommended.",
      batch_reference: "UNSETTLED",
      created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
    },
    {
      id: "rec-demo-5",
      business_id: businessId,
      order_id: "ord-8845",
      consignment_id: "SF-8841032",
      tracking_code: "SFBD-8841032-TRK",
      courier: "Steadfast",
      customer_name: "Kamrul Islam",
      customer_phone: "01623456789",
      order_amount: 1850,
      collected_amount: 1850,
      delivery_charge: 60,
      cod_fee: 18,
      payout_amount: 1772,
      expected_payout: 1772,
      variance: 0,
      status: "SETTLED",
      days_in_transit: 1,
      settlement_date: today,
      claim_status: "NONE",
      claim_notes: "Same-day delivery settled. Clean reconciliation.",
      batch_reference: "SF-PAYOUT-BATCH-2026-905",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

// ─────────────────────────────────────────────────────────────────
// EXPENSES REPOSITORY METHODS
// ─────────────────────────────────────────────────────────────────

export async function getTenantExpenses(businessId) {
  if (!businessId) return [];

  // 1. Try Supabase Postgres Table
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("expenses")
      .select("*")
      .eq("business_id", businessId)
      .order("expense_date", { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length > 0) return data;
    }
  } catch (err) {
    // Table missing or Supabase connection issue; fall through to file store
  }

  // 2. Resilient Tenant File Storage Fallback
  const filePath = getTenantFilePath(businessId, "expenses.json");
  let records = readJsonFile(filePath, null);

  if (!records || records.length === 0) {
    records = getDefaultExpenses(businessId);
    writeJsonFile(filePath, records);
  }

  return records;
}

export async function saveTenantExpense(businessId, expenseData) {
  if (!businessId) throw new Error("Missing business_id.");

  const newId = `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const record = {
    id: expenseData.id || newId,
    business_id: businessId,
    category: expenseData.category || "utilities_misc",
    amount: Number(expenseData.amount) || 0,
    platform: expenseData.platform || "",
    campaign_name: expenseData.campaign_name || "",
    notes: expenseData.notes || "",
    payment_method: expenseData.payment_method || "bKash Merchant",
    expense_date: expenseData.expense_date || new Date().toISOString().split("T")[0],
    user_email: expenseData.user_email || "admin@smartinventory.app",
    created_at: new Date().toISOString(),
  };

  // 1. Try Supabase insert
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("expenses").insert(record).select().single();
    if (!error && data) return data;
  } catch (err) {
    // Continue to file store
  }

  // 2. Save in tenant file store
  const filePath = getTenantFilePath(businessId, "expenses.json");
  const existing = readJsonFile(filePath, getDefaultExpenses(businessId));
  const updated = [record, ...existing];
  writeJsonFile(filePath, updated);

  return record;
}

export async function deleteTenantExpense(businessId, expenseId) {
  if (!businessId || !expenseId) return false;

  // 1. Try Supabase delete
  try {
    const admin = createAdminClient();
    await admin.from("expenses").delete().eq("id", expenseId).eq("business_id", businessId);
  } catch (err) {
    // Continue to file store
  }

  // 2. File store delete
  const filePath = getTenantFilePath(businessId, "expenses.json");
  const existing = readJsonFile(filePath, getDefaultExpenses(businessId));
  const filtered = existing.filter((e) => e.id !== expenseId);
  writeJsonFile(filePath, filtered);

  return true;
}

// ─────────────────────────────────────────────────────────────────
// RECONCILIATION REPOSITORY METHODS
// ─────────────────────────────────────────────────────────────────

export async function getTenantReconciliations(businessId) {
  if (!businessId) return [];

  // 1. Try Supabase Postgres Table
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("reconciliation_records")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length > 0) return data;
    }
  } catch (err) {
    // Table missing or Supabase connection issue; fall through to file store
  }

  // 2. Resilient Tenant File Storage Fallback
  const filePath = getTenantFilePath(businessId, "reconciliations.json");
  let records = readJsonFile(filePath, null);

  if (!records || records.length === 0) {
    records = getDefaultReconciliations(businessId);
    writeJsonFile(filePath, records);
  }

  return records;
}

export async function saveTenantReconciliation(businessId, recordData) {
  if (!businessId) throw new Error("Missing business_id.");

  const newId = `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const orderAmount = Number(recordData.order_amount) || 0;
  const collectedAmount = Number(recordData.collected_amount) || orderAmount;
  const deliveryCharge = Number(recordData.delivery_charge) || 0;
  const codFee = Number(recordData.cod_fee) || Math.round(collectedAmount * 0.01);
  const payoutAmount = Number(recordData.payout_amount) || 0;
  const expectedPayout = Math.max(0, collectedAmount - deliveryCharge - codFee);
  const variance = payoutAmount - expectedPayout;

  let computedStatus = recordData.status;
  if (!computedStatus) {
    if (variance < -5) {
      computedStatus = "SHORT_PAID";
    } else if (payoutAmount >= expectedPayout && expectedPayout > 0) {
      computedStatus = "SETTLED";
    } else if (Number(recordData.days_in_transit || 0) >= 7) {
      computedStatus = "LOST_STUCK";
    } else {
      computedStatus = "PENDING_PAYOUT";
    }
  }

  const record = {
    id: recordData.id || newId,
    business_id: businessId,
    order_id: recordData.order_id || null,
    consignment_id: recordData.consignment_id || `CS-${Date.now()}`,
    tracking_code: recordData.tracking_code || recordData.consignment_id || "",
    courier: recordData.courier || "Steadfast",
    customer_name: recordData.customer_name || "Customer",
    customer_phone: recordData.customer_phone || "",
    order_amount: orderAmount,
    collected_amount: collectedAmount,
    delivery_charge: deliveryCharge,
    cod_fee: codFee,
    payout_amount: payoutAmount,
    expected_payout: expectedPayout,
    variance: variance,
    status: computedStatus,
    days_in_transit: Number(recordData.days_in_transit) || 0,
    settlement_date: recordData.settlement_date || null,
    claim_status: recordData.claim_status || "NONE",
    claim_notes: recordData.claim_notes || "",
    batch_reference: recordData.batch_reference || "MANUAL-UPLOAD",
    created_at: new Date().toISOString(),
  };

  // 1. Try Supabase insert
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("reconciliation_records").insert(record).select().single();
    if (!error && data) return data;
  } catch (err) {
    // Continue to file store
  }

  // 2. Save in tenant file store
  const filePath = getTenantFilePath(businessId, "reconciliations.json");
  const existing = readJsonFile(filePath, getDefaultReconciliations(businessId));
  const updated = [record, ...existing.filter((r) => r.consignment_id !== record.consignment_id)];
  writeJsonFile(filePath, updated);

  return record;
}

export async function batchSaveTenantReconciliations(businessId, recordsList) {
  if (!businessId || !Array.isArray(recordsList)) return [];

  const processed = [];
  for (const item of recordsList) {
    const saved = await saveTenantReconciliation(businessId, item);
    processed.push(saved);
  }
  return processed;
}

export async function updateTenantReconciliation(businessId, recordId, updates) {
  if (!businessId || !recordId) return null;

  // 1. Try Supabase update
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("reconciliation_records")
      .update(updates)
      .eq("id", recordId)
      .eq("business_id", businessId)
      .select()
      .single();
    if (!error && data) return data;
  } catch (err) {
    // Continue to file store
  }

  // 2. File store update
  const filePath = getTenantFilePath(businessId, "reconciliations.json");
  const existing = readJsonFile(filePath, getDefaultReconciliations(businessId));
  let updatedRecord = null;
  const modified = existing.map((r) => {
    if (r.id === recordId) {
      updatedRecord = { ...r, ...updates };
      return updatedRecord;
    }
    return r;
  });

  writeJsonFile(filePath, modified);
  return updatedRecord;
}
