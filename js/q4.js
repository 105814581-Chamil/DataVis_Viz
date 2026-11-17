/* Q4 Counterparty: heatmap of each road user's share by counterparty (rows add to 100%). */
(function () {
  let data;
  // Shorter display names; the full name shows in the tooltip and table.
  const SHORT = {
    "Car, pick-up truck or van": "Car, pick-up or van",
    "Non-collision transport accident": "Non-collision",
    "Other and unspecified transport accidents": "Other or unspecified",
    "Fixed or stationary object": "Fixed object",
    "Heavy transport vehicle or bus": "Heavy vehicle or bus",
    "Pedestrian or animal": "Pedestrian or animal",
    "2- or 3- wheeled motor vehicle": "2- or 3-wheeled vehicle",
    "Pedal cycle": "Pedal cycle",
    "Other non-motor vehicle": "Other non-motor",
    "Train": "Train"
  };
  const short = (c) => SHORT[c] || c;

  function draw() {
    // Order rows by road user total, columns by overall counterparty total.
    const userTotals = d3.rollups(data, (v) => v[0][COL.roadUserTotal], (d) => d[COL.roadUser]).sort((a, b) => b[1] - a[1]);
    const cpTotals = d3.rollups(data, (v) => d3.sum(v, (d) => d[COL.hosp]), (d) => d[COL.counterparty]).sort((a, b) => b[1] - a[1]);
    const users = userTotals.map((d) => d[0]);
    const cps = cpTotals.map((d) => d[0]);
    const lookup = new Map(data.map((d) => [d[COL.roadUser] + "|" + d[COL.counterparty], d]));

    const container = d3.select("#q4-chart");
    const narrow = container.node().clientWidth < 700;
    const m = { top: narrow ? 120 : 70, right: 8, bottom: 8, left: 220 };
    const cellH = 30;
    const f = makeFrame("#q4-chart", m.top + m.bottom + users.length * cellH, m, 680);
    const x = d3.scaleBand().domain(cps).range([0, f.innerW]).paddingInner(0.06);
    const y = d3.scaleBand().domain(users).range([0, users.length * cellH]).paddingInner(0.08);
    const maxShare = d3.max(data, (d) => d[COL.share]);
    const color = d3.scaleSequential(SEQ_RAMP).domain([0, maxShare]);

    // Column headers (wrapped, or rotated when narrow)
    const head = f.g.selectAll(".col").data(cps).join("text").attr("class", "muted-label col").style("fill", COLORS.ink);
    if (narrow) {
      head.attr("transform", (c) => `translate(${x(c) + x.bandwidth() / 2},-8) rotate(-55)`).text(short);
    } else {
      head.attr("x", (c) => x(c) + x.bandwidth() / 2).attr("y", -m.top + 14).attr("text-anchor", "middle").text(short);
      wrapText(head, x.bandwidth() + 2);
    }
    // Row headers
    f.g.selectAll(".row").data(users).join("text").attr("class", "muted-label row")
      .attr("x", -10).attr("y", (u) => y(u) + y.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "end")
      .style("fill", COLORS.ink).text((u) => u);

    // Cells
    const cells = [];
    users.forEach((u) => cps.forEach((c) => cells.push({ u, c, d: lookup.get(u + "|" + c) })));
    const cell = f.g.selectAll(".cell").data(cells).join("g").attr("class", "cell")
      .attr("transform", (k) => `translate(${x(k.c)},${y(k.u)})`);
    cell.append("rect").attr("width", x.bandwidth()).attr("height", y.bandwidth()).attr("rx", 3)
      .attr("fill", (k) => (k.d ? color(k.d[COL.share]) : "#FFFFFF"))
      .attr("stroke", (k) => (k.d ? "none" : "#E2DACB"));
    // Selective labels: only shares of 5% or more
    cell.filter((k) => k.d && k.d[COL.share] >= 5 && x.bandwidth() > 30).append("text")
      .attr("x", x.bandwidth() / 2).attr("y", y.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
      .style("font", "600 11px Inter, system-ui, sans-serif")
      .style("fill", (k) => (k.d[COL.share] > maxShare * 0.45 ? "#FFFFFF" : COLORS.ink))
      .text((k) => Math.round(k.d[COL.share]) + "%");
    cell.on("mousemove", (event, k) => {
        d3.select(event.currentTarget).select("rect").attr("stroke", COLORS.ink).attr("stroke-width", 2);
        showTip(event, k.d
          ? `<strong>${k.u}</strong><br>Counterparty: ${k.c}<br>${d3.format(".1f")(k.d[COL.share])}% of ${k.u.toLowerCase()} hospitalisations<br>${fmt(k.d[COL.hosp])} of ${fmt(k.d[COL.roadUserTotal])}`
          : `<strong>${k.u}</strong><br>Counterparty: ${k.c}<br>No recorded cases`);
      })
      .on("mouseleave", (event, k) => {
        d3.select(event.currentTarget).select("rect").attr("stroke", k.d ? "none" : "#E2DACB").attr("stroke-width", 1);
        hideTip();
      });

    // Colour legend
    d3.select("#q4-legend").html("");
    const lg = d3.select("#q4-legend").append("span").attr("class", "legend-item");
    lg.append("span").text("0%");
    lg.append("span").attr("class", "swatch ramp").style("background", `linear-gradient(90deg, ${SEQ_RAMP(0)}, ${SEQ_RAMP(0.5)}, ${SEQ_RAMP(1)})`);
    lg.append("span").text(`${Math.round(maxShare)}% of the road user's hospitalisations`);

    renderTable("#q4-table", data.slice().sort((a, b) => d3.ascending(a[COL.roadUser], b[COL.roadUser]) || b[COL.share] - a[COL.share]), [
      { key: COL.roadUser, label: "Road user" },
      { key: COL.counterparty, label: "Counterparty" },
      { key: COL.hosp, label: "Hospitalisations", num: true, format: fmt },
      { key: COL.roadUserTotal, label: "Road user total", num: true, format: fmt },
      { key: COL.share, label: "Share (%)", num: true, format: d3.format(".1f") }
    ]);
  }

  loadCSV("data/q4_counterparty.csv")
    .then((rows) => { data = rows; draw(); onResize(draw); })
    .catch((e) => showError("#q4-chart", e));
})();
