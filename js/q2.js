/* Q2 Road users: compare two years by change in count, % change or share of total. */
(function () {
  let data, years, metric = "count";
  const fromSel = d3.select("#q2-from"), toSel = d3.select("#q2-to");

  function compute() {
    const from = +fromSel.property("value"), to = +toSel.property("value");
    const byYear = d3.rollup(data, (v) => d3.sum(v, (d) => d[COL.hosp]), (d) => d[COL.year], (d) => d[COL.roadUser]);
    const totalTo = d3.sum(byYear.get(to).values());
    const users = Array.from(new Set(data.map((d) => d[COL.roadUser])));
    const rows = users.map((u) => {
      const a = byYear.get(from).get(u) || 0, b = byYear.get(to).get(u) || 0;
      return {
        user: u, from: a, to: b,
        count: b - a,
        pct: a > 0 ? (b / a - 1) * 100 : NaN,
        share: (b / totalTo) * 100
      };
    });
    return { from, to, rows };
  }

  function draw() {
    const { from, to, rows } = compute();
    const val = (r) => r[metric];
    rows.sort((a, b) => d3.descending(val(a), val(b)));

    // Warn when a series break falls inside the chosen period
    const crossed = BREAKS.filter((b) => b.year > Math.min(from, to) && b.year <= Math.max(from, to));
    d3.select("#q2-warning")
      .property("hidden", crossed.length === 0 || metric === "share")
      .html(crossed.length ? `<strong>Note:</strong> counting rules changed in ${crossed.map((b) => `${b.state} (${b.year})`).join(" and ")} within this period, so part of the change may reflect counting rules rather than real change.` : "");

    const titles = {
      count: `Change in people hospitalised by road user, ${from} to ${to}`,
      pct: `Percentage change in people hospitalised by road user, ${from} to ${to}`,
      share: `Share of all road crash hospitalisations by road user, ${to}`
    };
    d3.select("#q2-title").text(titles[metric]);
    renderLegend("#q2-legend", metric === "share" ? [] : [
      { label: "Increase", color: COLORS.series1 },
      { label: "Decrease", color: COLORS.series2 }
    ]);

    // On narrow screens the road user name sits above its bar.
    const narrow = d3.select("#q2-chart").node().clientWidth < 620;
    const labelH = narrow ? 18 : 0;
    const barH = narrow ? 20 : 26, gap = 8 + labelH;
    const m = { top: 8 + labelH, right: 64, bottom: 30, left: narrow ? 8 : 230 };
    const f = makeFrame("#q2-chart", m.top + m.bottom + rows.length * (barH + gap), m);
    const vals = rows.map(val).filter((v) => !Number.isNaN(v));
    const lo = Math.min(0, d3.min(vals)), hi = Math.max(0, d3.max(vals));
    // Leave room left of zero for labels on negative bars.
    const x = d3.scaleLinear().domain([lo, hi]).nice().range([lo < 0 ? 56 : 0, f.innerW]);
    const y = d3.scaleBand().domain(rows.map((r) => r.user)).range([0, rows.length * (barH + gap)]).paddingInner(gap / (barH + gap));
    const tickFmt = metric === "count" ? d3.format("~s") : (v) => v + "%";
    const ticks = narrow ? 4 : 6;

    f.g.append("g").attr("class", "grid").attr("transform", `translate(0,${y.range()[1]})`)
      .call(d3.axisBottom(x).ticks(ticks).tickSize(-y.range()[1]).tickFormat(""));
    f.g.append("g").attr("class", "axis no-domain").attr("transform", `translate(0,${y.range()[1]})`)
      .call(d3.axisBottom(x).ticks(ticks).tickFormat(tickFmt).tickSize(0).tickPadding(8));

    // Row labels
    f.g.selectAll(".rlabel").data(rows).join("text").attr("class", "muted-label rlabel")
      .attr("x", narrow ? 0 : -12).attr("y", (r) => (narrow ? y(r.user) - 5 : y(r.user) + y.bandwidth() / 2)).attr("dy", narrow ? 0 : "0.35em")
      .attr("text-anchor", narrow ? "start" : "end").style("fill", COLORS.ink).text((r) => r.user);

    const color = (r) => (metric === "share" || val(r) >= 0 ? COLORS.series1 : COLORS.series2);
    // Bars: rounded at the data end only (via a path)
    const barPath = (r) => {
      const v = val(r);
      if (Number.isNaN(v)) return "";
      const x0 = x(0), x1 = x(v), top = y(r.user), h = y.bandwidth(), rad = Math.min(4, Math.abs(x1 - x0));
      if (x1 >= x0) return `M${x0},${top}H${x1 - rad}Q${x1},${top} ${x1},${top + rad}V${top + h - rad}Q${x1},${top + h} ${x1 - rad},${top + h}H${x0}Z`;
      return `M${x0},${top}H${x1 + rad}Q${x1},${top} ${x1},${top + rad}V${top + h - rad}Q${x1},${top + h} ${x1 + rad},${top + h}H${x0}Z`;
    };
    f.g.selectAll(".bar").data(rows).join("path").attr("class", "bar")
      .attr("d", barPath).attr("fill", color);

    // Zero line
    f.g.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", y.range()[1]).attr("stroke", COLORS.ink).attr("stroke-width", 1);

    // Value labels
    const labelText = (r) => {
      const v = val(r);
      if (Number.isNaN(v)) return "n/a";
      return metric === "count" ? fmtSigned(v) : metric === "pct" ? fmtPct(v) : d3.format(".1f")(v) + "%";
    };
    f.g.selectAll(".vlabel").data(rows).join("text").attr("class", "value-label vlabel")
      .attr("x", (r) => (Number.isNaN(val(r)) ? x(0) + 6 : val(r) >= 0 ? x(val(r)) + 6 : x(val(r)) - 6))
      .attr("y", (r) => y(r.user) + y.bandwidth() / 2).attr("dy", "0.35em")
      .attr("text-anchor", (r) => (val(r) < 0 ? "end" : "start"))
      .text(labelText);

    // Hover targets (full row, bigger than the bar)
    f.g.selectAll(".hit").data(rows).join("rect").attr("class", "hit")
      .attr("x", -m.left).attr("width", f.innerW + m.left + m.right).attr("y", (r) => y(r.user) - gap + 4).attr("height", barH + gap)
      .attr("fill", "transparent")
      .on("mousemove", (event, r) => {
        d3.select(event.currentTarget).attr("fill", "rgba(255,208,70,0.18)");
        showTip(event, `<strong>${r.user}</strong><br>${from}: ${fmt(r.from)}<br>${to}: ${fmt(r.to)}<br>Change: ${fmtSigned(r.count)}${Number.isNaN(r.pct) ? "" : " (" + fmtPct(r.pct) + ")"}<br>Share of ${to} total: ${d3.format(".1f")(r.share)}%`);
      })
      .on("mouseleave", (event) => { d3.select(event.currentTarget).attr("fill", "transparent"); hideTip(); });

    renderTable("#q2-table", rows, [
      { key: "user", label: "Road user" },
      { key: "from", label: String(from), num: true, format: fmt },
      { key: "to", label: String(to), num: true, format: fmt },
      { key: "count", label: "Change", num: true, format: fmtSigned },
      { key: "pct", label: "% change", num: true, format: fmtPct },
      { key: "share", label: `Share ${to} (%)`, num: true, format: d3.format(".1f") }
    ]);
  }

  loadCSV("data/q2_roaduser.csv")
    .then((rows) => {
      data = rows;
      years = Array.from(new Set(rows.map((d) => d[COL.year]))).sort();
      fromSel.selectAll("option").data(years).join("option").attr("value", (d) => d).text((d) => d);
      toSel.selectAll("option").data(years).join("option").attr("value", (d) => d).text((d) => d);
      fromSel.property("value", years[0]);
      toSel.property("value", years[years.length - 1]);
      fromSel.on("change", draw);
      toSel.on("change", draw);
      wireToggle("#q2-metric", "metric", (v) => { metric = v; draw(); });
      draw();
      onResize(draw);
    })
    .catch((e) => showError("#q2-chart", e));
})();
