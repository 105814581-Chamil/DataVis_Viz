/* Q1 National trend: annual line (split at reporting breaks) or monthly heatmap. */
(function () {
  let annual, monthly, view = "annual";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Which segment a year belongs to (series breaks split the line).
  const segmentOf = (yr) => (yr < 2012 ? 0 : yr < 2017 ? 1 : 2);

  function drawAnnual() {
    const m = { top: 44, right: 24, bottom: 36, left: 64 };
    const f = makeFrame("#q1-chart", 380, m);
    const x = d3.scaleLinear().domain([2010.6, 2021.4]).range([0, f.innerW]);
    const y = d3.scaleLinear().domain([0, 45000]).range([f.innerH, 0]);

    f.g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-f.innerW).tickFormat(""));
    f.g.append("g").attr("class", "axis no-domain").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")).tickSize(0).tickPadding(8));
    f.g.append("g").attr("class", "axis").attr("transform", `translate(0,${f.innerH})`)
      .call(d3.axisBottom(x).tickValues(f.innerW < 560 ? [2011, 2013, 2015, 2017, 2019, 2021] : d3.range(2011, 2022)).tickFormat(d3.format("d")).tickSizeOuter(0));

    // Reporting breaks
    BREAKS.forEach((b, i) => {
      const bx = x(b.year - 0.5);
      f.g.append("line").attr("x1", bx).attr("x2", bx).attr("y1", -8).attr("y2", f.innerH)
        .attr("stroke", COLORS.accent).attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4");
      f.g.append("text").attr("class", "annotation-text").attr("x", bx + 6).attr("y", f.innerW < 560 ? -14 - i * 15 : -14)
        .text(f.innerW < 560 ? b.short : b.label);
    });

    // One path per segment so the line visibly breaks at the counting changes.
    const segments = d3.groups(annual, (d) => segmentOf(d[COL.year])).map((s) => s[1]);
    const line = d3.line().x((d) => x(d[COL.year])).y((d) => y(d[COL.hosp]));
    f.g.selectAll(".seg").data(segments).join("path").attr("class", "seg")
      .attr("fill", "none").attr("stroke", COLORS.series1).attr("stroke-width", 2.5).attr("d", line);
    f.g.selectAll(".pt").data(annual).join("circle").attr("class", "pt")
      .attr("cx", (d) => x(d[COL.year])).attr("cy", (d) => y(d[COL.hosp])).attr("r", 4)
      .attr("fill", COLORS.series1).attr("stroke", "#fff").attr("stroke-width", 2);

    // Direct labels: first, 2020 dip, last
    const lab = (yr, dy, anchor) => {
      const d = annual.find((r) => r[COL.year] === yr);
      if (!d) return;
      f.g.append("text").attr("class", "value-label").attr("x", x(yr)).attr("y", y(d[COL.hosp]) + dy)
        .attr("text-anchor", anchor).text(fmt(d[COL.hosp]));
    };
    lab(2011, 22, f.innerW < 560 ? "start" : "middle"); lab(2020, 20, "middle"); lab(2021, -12, "end");

    // Crosshair + tooltip
    const rule = f.g.append("line").attr("y1", 0).attr("y2", f.innerH).attr("stroke", COLORS.ink).attr("stroke-opacity", 0.35).style("display", "none");
    const focus = f.g.append("circle").attr("r", 6).attr("fill", COLORS.series1).attr("stroke", "#fff").attr("stroke-width", 2).style("display", "none");
    f.g.append("rect").attr("width", f.innerW).attr("height", f.innerH).attr("fill", "transparent")
      .on("mousemove", (event) => {
        const yr = Math.round(x.invert(d3.pointer(event)[0]));
        const d = annual.find((r) => r[COL.year] === yr);
        if (!d) return;
        const prev = annual.find((r) => r[COL.year] === yr - 1);
        let change = "";
        if (prev) {
          change = segmentOf(yr) === segmentOf(yr - 1)
            ? `${fmtSigned(d[COL.hosp] - prev[COL.hosp])} (${fmtPct((d[COL.hosp] / prev[COL.hosp] - 1) * 100)}) on ${yr - 1}`
            : `<span class="tt-muted">Counting rules changed, so not comparable with ${yr - 1}</span>`;
        }
        rule.style("display", null).attr("x1", x(yr)).attr("x2", x(yr));
        focus.style("display", null).attr("cx", x(yr)).attr("cy", y(d[COL.hosp]));
        showTip(event, `<strong>${yr}</strong><br>${fmt(d[COL.hosp])} people hospitalised<br>${change}`);
      })
      .on("mouseleave", () => { rule.style("display", "none"); focus.style("display", "none"); hideTip(); });

    renderTable("#q1-table", annual, [
      { key: COL.year, label: "Year" },
      { key: COL.hosp, label: "Hospitalisations", num: true, format: fmt }
    ]);
  }

  function drawMonthly() {
    const m = { top: 30, right: 16, bottom: 56, left: 44 };
    const f = makeFrame("#q1-chart", 440, m);
    const years = d3.range(2011, 2022);
    const x = d3.scaleBand().domain(years).range([0, f.innerW]).padding(0.06);
    const y = d3.scaleBand().domain(d3.range(1, 13)).range([0, f.innerH]).padding(0.08);
    const color = d3.scaleSequential(SEQ_RAMP).domain(d3.extent(monthly, (d) => d[COL.hosp]));

    f.g.append("g").attr("class", "axis no-domain").call(d3.axisLeft(y).tickFormat((mn) => MONTHS[mn - 1]).tickSize(0).tickPadding(6));
    f.g.append("g").attr("class", "axis no-domain").attr("transform", `translate(0,${f.innerH})`)
      .call(d3.axisBottom(x).tickFormat((yr) => (f.innerW < 560 ? "'" + String(yr).slice(2) : yr)).tickSize(0).tickPadding(8));

    f.g.selectAll(".cell").data(monthly).join("rect").attr("class", "cell")
      .attr("x", (d) => x(d[COL.year])).attr("y", (d) => y(d[COL.monthNum]))
      .attr("width", x.bandwidth()).attr("height", y.bandwidth()).attr("rx", 3)
      .attr("fill", (d) => color(d[COL.hosp]))
      .on("mousemove", (event, d) => showTip(event, `<strong>${d[COL.month]} ${d[COL.year]}</strong><br>${fmt(d[COL.hosp])} people hospitalised`))
      .on("mouseleave", hideTip);

    // Break markers above the columns
    BREAKS.forEach((b) => {
      const bx = x(b.year) - (x.step() * x.paddingInner()) / 2;
      f.g.append("line").attr("x1", bx).attr("x2", bx).attr("y1", -10).attr("y2", f.innerH)
        .attr("stroke", COLORS.accent).attr("stroke-width", 2).attr("stroke-dasharray", "5 4");
      f.g.append("text").attr("class", "annotation-text").attr("x", bx + 4).attr("y", -14).text(f.innerW < 560 ? b.short : b.label);
    });

    // Colour legend
    const lw = Math.min(220, f.innerW * 0.5);
    const lg = f.svg.append("g").attr("transform", `translate(${m.left},${f.height - 18})`);
    const id = "q1-grad";
    const grad = f.svg.append("defs").append("linearGradient").attr("id", id);
    grad.selectAll("stop").data([0, 0.5, 1]).join("stop").attr("offset", (t) => t).attr("stop-color", (t) => SEQ_RAMP(t));
    lg.append("text").attr("class", "muted-label").attr("y", 9).text("Fewer");
    lg.append("rect").attr("x", 44).attr("width", lw).attr("height", 10).attr("rx", 5).attr("fill", `url(#${id})`);
    lg.append("text").attr("class", "muted-label").attr("x", 52 + lw).attr("y", 9).text("More hospitalisations per month");

    renderTable("#q1-table", monthly, [
      { key: COL.year, label: "Year" },
      { key: COL.month, label: "Month" },
      { key: COL.hosp, label: "Hospitalisations", num: true, format: fmt }
    ]);
  }

  function draw() {
    d3.select("#q1-title").text(view === "annual"
      ? "People hospitalised after road crashes, Australia, 2011–2021"
      : "People hospitalised after road crashes by month, Australia, 2011–2021");
    view === "annual" ? drawAnnual() : drawMonthly();
  }

  Promise.all([loadCSV("data/q1_annual.csv"), loadCSV("data/q1_monthly.csv")])
    .then(([a, mth]) => {
      annual = a.sort((p, q) => p[COL.year] - q[COL.year]);
      monthly = mth;
      wireToggle("#q1-toggle", "view", (v) => { view = v; draw(); });
      draw();
      onResize(draw);
    })
    .catch((e) => showError("#q1-chart", e));
})();
