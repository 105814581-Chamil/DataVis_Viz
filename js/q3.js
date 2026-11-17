/* Q3 Who is injured: age × sex mirrored bars and remoteness small multiples, driven by a year slider. */
(function () {
  let ageSex, remote, year = 2021, timer = null;
  const SEXES = [
    { key: "Male", label: "Male", color: COLORS.series1 },
    { key: "Female", label: "Female", color: COLORS.series2 }
  ];
  const AREAS = ["Major Cities", "Regional", "Remote"];

  function drawAgeSex() {
    const rows = AGE_ORDER.map((age) => {
      const r = { age };
      SEXES.forEach((s) => {
        r[s.key] = d3.sum(ageSex.filter((d) => d[COL.year] === year && d[COL.age] === age && d[COL.sex] === s.key), (d) => d[COL.hosp]);
      });
      return r;
    });
    // Fixed scale across all years, so bars are comparable while the slider moves.
    const maxAll = d3.max(ageSex.filter((d) => SEXES.some((s) => s.key === d[COL.sex])), (d) => d[COL.hosp]);

    d3.select("#q3a-title").text(`People hospitalised by age group and sex, ${year}`);
    renderLegend("#q3a-legend", SEXES.map((s) => ({ label: s.label, color: s.color })));

    const m = { top: 8, right: 12, bottom: 30, left: 12 };
    const f = makeFrame("#q3a-chart", 340, m);
    const mid = f.innerW / 2, labelW = 48;
    const xL = d3.scaleLinear().domain([0, maxAll]).nice().range([mid - labelW / 2, 0]);
    const xR = d3.scaleLinear().domain([0, maxAll]).nice().range([mid + labelW / 2, f.innerW]);
    const y = d3.scaleBand().domain(AGE_ORDER).range([0, f.innerH]).padding(0.22);

    const axisB = (scale) => d3.axisBottom(scale).ticks(3).tickFormat(d3.format("~s")).tickSize(-f.innerH);
    f.g.append("g").attr("class", "grid").attr("transform", `translate(0,${f.innerH})`).call(axisB(xL).tickFormat(""));
    f.g.append("g").attr("class", "grid").attr("transform", `translate(0,${f.innerH})`).call(axisB(xR).tickFormat(""));
    f.g.append("g").attr("class", "axis no-domain").attr("transform", `translate(0,${f.innerH})`).call(axisB(xL).tickSize(0).tickPadding(8));
    f.g.append("g").attr("class", "axis no-domain").attr("transform", `translate(0,${f.innerH})`).call(axisB(xR).tickSize(0).tickPadding(8));

    f.g.selectAll(".age").data(rows).join("text").attr("class", "muted-label age")
      .attr("x", mid).attr("y", (r) => y(r.age) + y.bandwidth() / 2).attr("dy", "0.35em")
      .attr("text-anchor", "middle").style("fill", COLORS.ink).text((r) => r.age);

    f.g.selectAll(".bm").data(rows).join("rect").attr("class", "bm")
      .attr("x", (r) => xL(r.Male)).attr("y", (r) => y(r.age))
      .attr("width", (r) => xL(0) - xL(r.Male)).attr("height", y.bandwidth()).attr("rx", 3)
      .attr("fill", COLORS.series1);
    f.g.selectAll(".bf").data(rows).join("rect").attr("class", "bf")
      .attr("x", xR(0)).attr("y", (r) => y(r.age))
      .attr("width", (r) => xR(r.Female) - xR(0)).attr("height", y.bandwidth()).attr("rx", 3)
      .attr("fill", COLORS.series2);

    const total = d3.sum(rows, (r) => r.Male + r.Female);
    f.g.selectAll(".hit").data(rows).join("rect").attr("class", "hit")
      .attr("x", 0).attr("width", f.innerW).attr("y", (r) => y(r.age) - (y.step() - y.bandwidth()) / 2).attr("height", y.step())
      .attr("fill", "transparent")
      .on("mousemove", (event, r) => {
        d3.select(event.currentTarget).attr("fill", "rgba(255,208,70,0.18)");
        showTip(event, `<strong>Age ${r.age}, ${year}</strong><br>Male: ${fmt(r.Male)}<br>Female: ${fmt(r.Female)}<br>${d3.format(".1f")(((r.Male + r.Female) / total) * 100)}% of the year's total`);
      })
      .on("mouseleave", (event) => { d3.select(event.currentTarget).attr("fill", "transparent"); hideTip(); });

    const other = d3.sum(ageSex.filter((d) => d[COL.year] === year && !SEXES.some((s) => s.key === d[COL.sex])), (d) => d[COL.hosp]);
    d3.select("#q3a-note").text(`Not shown: ${other} hospitalisation${other === 1 ? "" : "s"} in ${year} with sex recorded as intersex, indeterminate or missing, and any records with missing age. Source: BITRE (2023).`);

    renderTable("#q3a-table", rows, [
      { key: "age", label: "Age group" },
      { key: "Male", label: "Male", num: true, format: fmt },
      { key: "Female", label: "Female", num: true, format: fmt }
    ]);
  }

  function drawRemote() {
    const container = d3.select("#q3b-chart");
    container.selectAll("*").remove();
    const width = Math.max(320, container.node().clientWidth);
    const cols = width < 420 ? 1 : 3;
    const panelW = (width - (cols - 1) * 16) / cols, panelH = 170;
    const rowsN = Math.ceil(AREAS.length / cols);
    const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${rowsN * (panelH + 16)}`).attr("width", width).attr("height", rowsN * (panelH + 16));
    const years = d3.range(2011, 2022);

    AREAS.forEach((area, i) => {
      const series = years.map((yr) => ({ yr, v: d3.sum(remote.filter((d) => d[COL.year] === yr && d[COL.remoteness] === area), (d) => d[COL.hosp]) }));
      const m = { top: 26, right: 12, bottom: 24, left: 44 };
      const g = svg.append("g").attr("transform", `translate(${(i % cols) * (panelW + 16)},${Math.floor(i / cols) * (panelH + 16)})`);
      const iw = panelW - m.left - m.right, ih = panelH - m.top - m.bottom;
      const inner = g.append("g").attr("transform", `translate(${m.left},${m.top})`);
      const x = d3.scaleLinear().domain([2011, 2021]).range([0, iw]);
      const y = d3.scaleLinear().domain([0, d3.max(series, (d) => d.v)]).nice().range([ih, 0]);

      g.append("text").attr("x", 0).attr("y", 14).style("font", "700 13px Inter, system-ui, sans-serif").style("fill", COLORS.ink).text(area);
      inner.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(3).tickSize(-iw).tickFormat(""));
      inner.append("g").attr("class", "axis no-domain").call(d3.axisLeft(y).ticks(3).tickFormat(d3.format("~s")).tickSize(0).tickPadding(6));
      inner.append("g").attr("class", "axis no-domain").attr("transform", `translate(0,${ih})`)
        .call(d3.axisBottom(x).tickValues([2011, 2016, 2021]).tickFormat(d3.format("d")).tickSize(0).tickPadding(6));
      inner.append("path").datum(series).attr("fill", "none").attr("stroke", COLORS.series1).attr("stroke-width", 2)
        .attr("d", d3.line().x((d) => x(d.yr)).y((d) => y(d.v)));
      const sel = series.find((d) => d.yr === year);
      inner.append("circle").attr("cx", x(sel.yr)).attr("cy", y(sel.v)).attr("r", 5.5).attr("fill", COLORS.series1).attr("stroke", "#fff").attr("stroke-width", 2);
      inner.append("text").attr("class", "value-label").attr("x", x(sel.yr)).attr("y", y(sel.v) - 10)
        .attr("text-anchor", sel.yr > 2018 ? "end" : sel.yr < 2013 ? "start" : "middle").text(fmt(sel.v));
      inner.append("rect").attr("width", iw).attr("height", ih).attr("fill", "transparent")
        .on("mousemove", (event) => {
          const yr = Math.round(x.invert(d3.pointer(event)[0]));
          const d = series.find((s) => s.yr === yr);
          if (d) showTip(event, `<strong>${area}, ${yr}</strong><br>${fmt(d.v)} people hospitalised`);
        })
        .on("mouseleave", hideTip);
    });

    const missing = d3.sum(remote.filter((d) => d[COL.year] === year && !AREAS.includes(d[COL.remoteness])), (d) => d[COL.hosp]);
    d3.select("#q3b-note").text(`Each panel has its own scale because Remote counts are much smaller. The dot marks ${year}. Not shown: ${fmt(missing)} hospitalisations in ${year} with home remoteness missing. Remoteness is where the person lives, not where the crash happened.`);

    const tableRows = d3.range(2011, 2022).map((yr) => {
      const r = { yr };
      AREAS.concat(["Missing"]).forEach((a) => { r[a] = d3.sum(remote.filter((d) => d[COL.year] === yr && d[COL.remoteness] === a), (d) => d[COL.hosp]); });
      return r;
    });
    renderTable("#q3b-table", tableRows, [{ key: "yr", label: "Year" }].concat(
      AREAS.concat(["Missing"]).map((a) => ({ key: a, label: a, num: true, format: fmt }))
    ));
  }

  function setYear(y) {
    year = y;
    d3.select("#q3-year").property("value", y);
    d3.select("#q3-year-out").text(y);
    drawAgeSex();
    drawRemote();
  }

  function togglePlay() {
    const btn = d3.select("#q3-play");
    if (timer) {
      clearInterval(timer); timer = null;
      btn.attr("aria-label", "Play through the years").html('<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 2 L14 8 L4 14 Z" fill="currentColor"/></svg>');
    } else {
      if (year === 2021) setYear(2011);
      btn.attr("aria-label", "Pause").html('<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" fill="currentColor"/></svg>');
      timer = setInterval(() => {
        if (year >= 2021) { togglePlay(); return; }
        setYear(year + 1);
      }, 900);
    }
  }

  Promise.all([loadCSV("data/q3_age_sex.csv"), loadCSV("data/q3_remoteness.csv")])
    .then(([a, r]) => {
      ageSex = a; remote = r;
      d3.select("#q3-year").on("input", function () { setYear(+this.value); });
      d3.select("#q3-play").on("click", togglePlay);
      setYear(2021);
      onResize(() => { drawAgeSex(); drawRemote(); });
    })
    .catch((e) => showError("#q3a-chart", e));
})();
