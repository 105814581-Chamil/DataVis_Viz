/* ===========================================================
   Shared helpers for all charts.
   Column names below match the KNIME CSV Writer outputs, so a
   group member can replace any file in /data with their own
   KNIME export without touching the chart code.
   =========================================================== */

const COL = {
  year: "Calendar year",
  month: "Month",
  monthNum: "Month number",
  hosp: "Hospitalisations",
  roadUser: "Road user",
  counterparty: "Counterparty",
  roadUserTotal: "Sum(Hospitalisations)",
  share: "Share (%)",
  age: "Age group",
  sex: "Sex",
  remoteness: "ABS remoteness area",
  bedDays: "Bed days",
  avgBedDays: "Avg bed days"
};

const COLORS = {
  ink: "#241E4E",
  muted: "#4F4B66",
  accent: "#960200",       // annotations (series breaks etc.)
  series1: "#4B40A0",      // amethyst – male / increase / highlighted series
  series2: "#CE6C47",      // burnt peach – female / decrease
  context: "#C9C5D8",      // de-emphasised lines
  grid: "#EEE8DA",
  surface: "#FFFFFF"
};

// Single-hue sequential ramp (light → dark amethyst) for heatmaps.
const SEQ_RAMP = d3.interpolateRgb("#F1EFF9", "#241E4E");

const AGE_ORDER = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
const BREAKS = [
  { year: 2012, state: "Victoria", label: "Victoria changes counting (2012)", short: "Vic change (2012)" },
  { year: 2017, state: "NSW", label: "NSW changes counting (2017)", short: "NSW change (2017)" }
];

const fmt = d3.format(",");
const fmt1 = d3.format(",.1f");
const fmtPct = (v) => (v > 0 ? "+" : "") + d3.format(".1f")(v) + "%";
const fmtSigned = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v));

/* ---------- Tooltip ---------- */
const tooltip = d3.select("body").append("div").attr("class", "tooltip").attr("aria-hidden", "true");

function showTip(event, html) {
  tooltip.html(html).style("opacity", 1);
  moveTip(event);
}
function moveTip(event) {
  const pad = 14;
  const node = tooltip.node();
  const w = node.offsetWidth, h = node.offsetHeight;
  let x = event.clientX + pad, y = event.clientY + pad;
  if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
  if (y + h > window.innerHeight - 8) y = event.clientY - h - pad;
  tooltip.style("left", x + "px").style("top", y + "px");
}
function hideTip() { tooltip.style("opacity", 0); }

/* ---------- Chart frame ---------- */
// Creates an SVG sized to the container's current width.
function makeFrame(selector, height, margin, minWidth = 300) {
  const container = d3.select(selector);
  container.selectAll("*").remove();
  const width = Math.max(minWidth, container.node().clientWidth);
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", width)
    .attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  return { svg, g, width, height, innerW: width - margin.left - margin.right, innerH: height - margin.top - margin.bottom };
}

/* ---------- Redraw on resize ---------- */
const redrawers = [];
function onResize(fn) { redrawers.push(fn); }
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => redrawers.forEach((fn) => fn()), 150);
});

/* ---------- Toggle buttons ---------- */
// Wires a group of buttons with aria-pressed; calls cb(value).
function wireToggle(selector, attr, cb) {
  const buttons = d3.selectAll(`${selector} button`);
  buttons.on("click", function () {
    buttons.attr("aria-pressed", "false");
    d3.select(this).attr("aria-pressed", "true");
    cb(this.dataset[attr]);
  });
}

/* ---------- Data table (accessible alternative to each chart) ---------- */
function renderTable(selector, rows, columns) {
  const wrap = d3.select(selector);
  wrap.selectAll("*").remove();
  const table = wrap.append("div").attr("class", "table-wrap").append("table");
  table.append("thead").append("tr").selectAll("th")
    .data(columns).join("th")
    .attr("scope", "col")
    .attr("class", (c) => (c.num ? "num" : null))
    .text((c) => c.label);
  table.append("tbody").selectAll("tr")
    .data(rows).join("tr")
    .selectAll("td")
    .data((r) => columns.map((c) => ({ c, v: r[c.key] })))
    .join("td")
    .attr("class", (d) => (d.c.num ? "num" : null))
    .text((d) => (d.v == null || Number.isNaN(d.v) ? "–" : d.c.format ? d.c.format(d.v) : d.v));
}

/* ---------- Legend ---------- */
function renderLegend(selector, items) {
  const legend = d3.select(selector);
  legend.selectAll("*").remove();
  const item = legend.selectAll(".legend-item").data(items).join("span").attr("class", "legend-item");
  item.append("span").attr("class", "swatch").style("background", (d) => d.color);
  item.append("span").text((d) => d.label);
}

/* ---------- Wrap long SVG labels onto several lines ---------- */
function wrapText(textSel, width) {
  textSel.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/);
    const x = text.attr("x") || 0;
    const y = text.attr("y") || 0;
    const dy = parseFloat(text.attr("dy") || 0);
    text.text(null);
    let line = [];
    let lineNo = 0;
    let tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
    for (const word of words) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width && line.length > 1) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNo * 1.15 + dy + "em").text(word);
      }
    }
  });
}

/* ---------- Load CSV with numeric conversion ---------- */
const NUMERIC = new Set([COL.year, COL.monthNum, COL.hosp, COL.roadUserTotal, COL.share, COL.bedDays, COL.avgBedDays]);
function loadCSV(path) {
  return d3.csv(path, (row) => {
    for (const k of Object.keys(row)) if (NUMERIC.has(k)) row[k] = +row[k];
    return row;
  });
}

function showError(selector, err) {
  d3.select(selector).html(
    `<p class="warning">Couldn't load the data for this chart. Open the site through a local web server (see README), not by double-clicking index.html.<br><small>${err}</small></p>`
  );
  console.error(err);
}
