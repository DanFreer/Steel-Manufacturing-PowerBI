/**
 * Steel manufacturing star-schema CSV generator.
 * Open in browser console OR run with: node generate_data.js
 */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "data");
fs.mkdirSync(OUT, { recursive: true });

let seed = 42;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function randInt(min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function normalInt(mean, std) {
  const u1 = 1 - rnd();
  const u2 = 1 - rnd();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
  return Math.max(0, Math.round(mean + std * z));
}
function round(n, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

const holidays = new Set([
  "2025-01-01", "2025-05-26", "2025-07-04",
  "2025-09-01", "2025-11-27", "2025-12-25",
]);

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

// --- DimDate ---
const dimDateRows = [["DateKey", "Date", "Year", "Quarter", "Month", "MonthNum", "WeekOfYear", "DayOfWeek", "DayOfWeekNum", "IsWeekday", "IsHoliday", "IsProductionDay"]];
const workdays = [];
for (let d = new Date("2025-01-01T12:00:00"); d <= new Date("2025-12-31T12:00:00"); d.setDate(d.getDate() + 1)) {
  const ds = fmt(d);
  const dow = d.getDay();
  const isWeekday = dow >= 1 && dow <= 5;
  const isHoliday = holidays.has(ds);
  const isProductionDay = isWeekday && !isHoliday;
  dimDateRows.push([
    ds.replace(/-/g, ""),
    ds,
    d.getFullYear(),
    "Q" + Math.ceil((d.getMonth() + 1) / 3),
    monthNames[d.getMonth()],
    d.getMonth() + 1,
    isoWeek(new Date(d)),
    dayNames[dow],
    dow === 0 ? 7 : dow,
    isWeekday,
    isHoliday,
    isProductionDay,
  ]);
  if (isProductionDay) workdays.push(parseInt(ds.replace(/-/g, ""), 10));
}

// --- DimProduct ---
const products = [
  [1, "PLT-100 Base Plate", "Plasma Cut", "A36 Steel", 120, 0.028, "Plasma Cutting"],
  [2, "BRG-200 Bearing Housing", "Milled", "4140 Steel", 85, 0.022, "Milling"],
  [3, "CHN-300 Frame Channel", "Bent", "A572 Steel", 100, 0.025, "Bending"],
  [4, "BKT-400 Bracket Assembly", "Welded", "A36 Steel", 95, 0.03, "Welding"],
];
const dimProductRows = [["ProductKey", "ProductName", "ProductType", "MaterialGrade", "TargetDailyQty", "DefectRateTarget", "PrimaryDepartment"], ...products];

// --- DimDepartment ---
const departments = [
  [1, "Plasma Cutting", "Day", 110, 8],
  [2, "Milling", "Day", 88, 6],
  [3, "Bending", "Day", 72, 5],
  [4, "Welding", "Day", 96, 10],
  [5, "Quality Inspection", "Day", 40, 4],
  [6, "Shipping", "Day", 32, 4],
];
const dimDeptRows = [["DepartmentKey", "DepartmentName", "Shift", "AvgDailyHours", "Headcount"], ...departments];

// --- Facts ---
const prodRows = [["ProductionKey", "DateKey", "ProductKey", "QuantityProduced", "QuantityScrapped", "RunHours"]];
const qualRows = [["QualityKey", "DateKey", "ProductKey", "Defects", "UnitsInspected", "DefectRate"]];
const laborRows = [["LaborKey", "DateKey", "DepartmentKey", "LaborHours", "OvertimeHours", "Headcount"]];
const shipRows = [["ShippingKey", "DateKey", "OrdersShipped", "OrdersOnTime", "OrdersLate"]];

let pk = 1, qk = 1, lk = 1, sk = 1;

for (const dateKey of workdays) {
  const badDay = rnd() < 0.05;
  let dayProducedTotal = 0;

  for (const p of products) {
    const [productKey, , , , target, rate] = p;
    let defects;
    if (badDay) {
      defects = Math.round(randInt(Math.round(target * 0.06), Math.round(target * 0.10)));
    } else {
      defects = normalInt(target * rate, target * rate * 0.2);
    }
    const noise = randInt(-8, 8);
    const scrap = Math.round(defects * 0.65);
    const qty = Math.max(0, target + noise - scrap);
    const runHours = round(7.5 + (rnd() * 0.5 - 0.25), 2);
    const inspected = qty + defects;

    prodRows.push([pk, dateKey, productKey, qty, scrap, runHours]);
    qualRows.push([qk, dateKey, productKey, defects, inspected, round(defects / Math.max(inspected, 1), 4)]);
    pk++;
    qk++;
    dayProducedTotal += qty;
  }

  for (const dept of departments) {
    const [deptKey, , , avgHrs, headcount] = dept;
    const hrs = round(avgHrs * (0.93 + rnd() * 0.14), 1);
    const ot = dayProducedTotal > 380 ? round(rnd() * 2.5, 1) : 0;
    laborRows.push([lk, dateKey, deptKey, hrs, ot, headcount]);
    lk++;
  }

  const orders = randInt(18, 27);
  let onTimeRate = 0.88 + rnd() * 0.09;
  if (badDay) onTimeRate -= 0.04 + rnd() * 0.06;
  const onTime = Math.max(0, Math.min(orders, Math.round(orders * onTimeRate)));
  shipRows.push([sk, dateKey, orders, onTime, orders - onTime]);
  sk++;
}

function toCsv(rows) {
  return rows.map((r) => r.map(String).join(",")).join("\n") + "\n";
}

fs.writeFileSync(path.join(OUT, "DimDate.csv"), toCsv(dimDateRows));
fs.writeFileSync(path.join(OUT, "DimProduct.csv"), toCsv(dimProductRows));
fs.writeFileSync(path.join(OUT, "DimDepartment.csv"), toCsv(dimDeptRows));
fs.writeFileSync(path.join(OUT, "FactProduction.csv"), toCsv(prodRows));
fs.writeFileSync(path.join(OUT, "FactQuality.csv"), toCsv(qualRows));
fs.writeFileSync(path.join(OUT, "FactLabor.csv"), toCsv(laborRows));
fs.writeFileSync(path.join(OUT, "FactShipping.csv"), toCsv(shipRows));

console.log(`Workdays: ${workdays.length}`);
console.log(`FactProduction: ${prodRows.length - 1} rows`);
console.log(`FactQuality: ${qualRows.length - 1} rows`);
console.log(`FactLabor: ${laborRows.length - 1} rows`);
console.log(`FactShipping: ${shipRows.length - 1} rows`);
console.log(`Output: ${OUT}`);
