const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

// ---- Settings ----------------------------------------------------------
const EXCEL_FILE = path.join(__dirname, "CONSOLIDATED_PUNCHLIST.xlsx"); // same folder as this script
const SHEET_NAME = "SUMMARY";
const OUTPUT_FILE = path.join(__dirname, "punchlist-data.json");
const HISTORY_FILE = path.join(__dirname, "punchlist-history.json"); // one line saved per day
// -------------------------------------------------------------------------

function rawValue(cell) {
  let v = cell.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) v = v.result;
    else if (Array.isArray(v.richText)) v = v.richText.map(t => t.text).join("");
    else if ("text" in v) v = v.text;
  }
  return v;
}
const text = cell => {
  const v = rawValue(cell);
  return v === null || v === undefined || v instanceof Date || typeof v === "object" ? "" : String(v).trim();
};
const pad = n => String(n).padStart(2, "0");

// Date cell -> "YYYY-MM-DD", or null ("-", blank, text)
function toISO(v) {
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const us = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) return `${us[3]}-${pad(us[1])}-${pad(us[2])}`;
    const iso = v.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
  }
  return null;
}

const COLUMNS = {
  no: "pl-no", location: "location", designNo: "design no", wbsNo: "wbs no",
  issue: "sms recommendation", action: "required action", party: "responsible party",
  status: "remarks", start: "start date", finish: "finish date", note: "reference images"
};

async function main() {
  if (!fs.existsSync(EXCEL_FILE)) throw new Error(`${path.basename(EXCEL_FILE)} not found in this folder.`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`Worksheet "${SHEET_NAME}" not found.`);

  // Find the header row and map each column by its heading
  let headerRow = 0;
  const col = {};
  for (let r = 1; r <= Math.min(10, sheet.rowCount) && !headerRow; r++) {
    for (let c = 1; c <= sheet.columnCount; c++) {
      const t = text(sheet.getRow(r).getCell(c)).toLowerCase().replace(/\s+/g, " ");
      for (const [key, label] of Object.entries(COLUMNS)) if (t.startsWith(label)) col[key] = c;
    }
    if (col.no && col.action && col.status) headerRow = r;
  }
  if (!headerRow) throw new Error("Header row not found (expected PL-NO., REQUIRED ACTION, REMARKS...).");

  const items = [];
  let current = null;
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const get = key => (col[key] ? text(row.getCell(col[key])) : "");
    const no = get("no");
    const action = { issue: get("issue"), action: get("action"), party: get("party"),
      status: get("status").toUpperCase(), note: get("note") };
    if (!no && !action.issue && !action.action && !action.party && !action.status) continue;

    // A new punch list item starts when the PL number changes (merged cells repeat or leave it blank)
    if (no && (!current || no !== current.no)) {
      current = { no, location: get("location"), designNo: get("designNo"), wbsNo: get("wbsNo"), actions: [] };
      items.push(current);
    }
    if (!current) continue;

    action.status = action.status || "NO STATUS";
    action.start = col.start ? toISO(rawValue(row.getCell(col.start))) : null;
    action.finish = col.finish ? toISO(rawValue(row.getCell(col.finish))) : null;
    action.dateIssue = !!(action.start && action.finish && action.finish < action.start);
    current.actions.push(action);
  }
  if (!items.length) throw new Error("No punch list rows found.");

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ sheet: sheet.name, items }), "utf8");

  // Daily snapshot for the trend chart (one line per day, replaced if run again the same day)
  const all = items.flatMap(i => i.actions);
  const byStatus = {};
  all.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let history = { days: [] };
  if (fs.existsSync(HISTORY_FILE)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")); }
    catch (e) { throw new Error(`${path.basename(HISTORY_FILE)} could not be read. Fix or delete it, then run again.`); }
    if (!Array.isArray(history.days)) history = { days: [] };
  }
  history.days = history.days.filter(d => d.date !== date);
  history.days.push({ date, items: items.length, actions: all.length, byStatus });
  history.days.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history), "utf8");

  console.log("Punch list conversion successful!");
  console.log("Punch list items:", items.length, "| Actions:", all.length);
  console.log("By status:", JSON.stringify(byStatus));
  console.log("Days saved in history:", history.days.length);
}

main().catch(error => { console.error("Conversion failed:", error.message); process.exitCode = 1; });
