/* Q5 Length of stay: average bed days by age group over time, one group highlighted. */
(function () {
  let data, selected = "75+";

  function draw() {
    const series = AGE_ORDER.map((age) => ({
      age,
      values: data.filter((d) => d[COL.age] === age).sort((a, b) => a[COL.year] - b[COL.year])
    }));

    const m = { top: 40, right: 92, bottom: 36, left: 48 };
    const f = makeFrame("#q5-chart", 420, m);
    const x = d3.scaleLinear().domain([2011, 2021]).range([0, f.innerW]);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d[COL.avgBedDays])]).nice().range([f.innerH, 0]);

    f.g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(6).tickSize(-f.innerW).tickFormat(""));
    f.g.append("g").attr("class", "axis no-domain").call(d3.axisLeft(y).ticks(6).tickSize(0).tickPadding(8));
    f.g.append("g").attr("class", "axis").attr("transform", `translate(0,${f.innerH})`)
      .call(d3.axisBottom(x).tickValues(f.innerW < 560 ? [2011, 2013, 2015, 2017, 2019, 2021] : d3.range(2011, 2022)).tickFormat(d3.format("d")).tickSizeOuter(0));
    f.g.append("text").attr("class", "muted-label").attr("x", -m.left).attr("y", -24).text("Average bed days");

    // Annotation: 2014–2016 rise
    f.g.append("rect").attr("x", x(2014)).attr("width", x(2016) - x(2014)).attr("y", 0).attr("height", f.innerH)
      .attr("fill", "#FFD046").attr("opacity", 0.16);
    f.g.append("text").attr("class", "annotation-text").attr("x", x(2014) + 4).attr("y", -8)
      .text(f.innerW < 560 ? "2014–16: sharp rise" : "2014–2016: averages rose sharply. The data can't say why.");

    const line = d3.line().x((d) => x(d[COL.year])).y((d) => y(d[COL.avgBedDays]));
    // Context lines first, highlighted line last so it sits on top.
    const ordered = series.slice().sort((a, b) => (a.age === selected) - (b.age === selected));
    f.g.selectAll(".ln").data(ordered).join("path").attr("class", "ln")
      .attr("fill", "none")
      .attr("stroke", (s) => (s.age === selected ? COLORS.series1 : COLORS.context))
      .attr("stroke-width", (s) => (s.age === selected ? 3 : 1.5))
      .attr("d", (s) => line(s.values));

    // Direct end labels, nudged apart so they don't overlap.
    const ends = series.map((s) => {
      const last = s.values[s.values.length - 1];
      return { age: s.age, y: y(last[COL.avgBedDays]), v: last[COL.avgBedDays] };
    }).sort((a, b) => a.y - b.y);
    const minGap = 14;
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < minGap) ends[i].y = ends[i - 1].y + minGap;
    f.g.selectAll(".end").data(ends).join("text").attr("class", "end")
      .attr("x", f.innerW + 8).attr("y", (e) => e.y).attr("dy", "0.35em")
      .style("font", (e) => (e.age === selected ? "700 12px Inter, system-ui, sans-serif" : "500 12px Inter, system-ui, sans-serif"))
      .style("fill", (e) => (e.age === selected ? COLORS.ink : COLORS.muted))
      .text((e) => `${e.age}: ${fmt1(e.v)}`);

    const sel = series.find((s) => s.age === selected);
    f.g.selectAll(".pt").data(sel.values).join("circle").attr("class", "pt")
      .attr("cx", (d) => x(d[COL.year])).attr("cy", (d) => y(d[COL.avgBedDays])).attr("r", 4)
      .attr("fill", COLORS.series1).attr("stroke", "#fff").attr("stroke-width", 2);

    // Crosshair tooltip listing all age groups for the hovered year
    const rule = f.g.append("line").attr("y1", 0).attr("y2", f.innerH).attr("stroke", COLORS.ink).attr("stroke-opacity", 0.35).style("display", "none");
    f.g.append("rect").attr("width", f.innerW).attr("height", f.innerH).attr("fill", "transparent")
      .on("mousemove", (event) => {
        const yr = Math.round(x.invert(d3.pointer(event)[0]));
        if (yr < 2011 || yr > 2021) return;
        rule.style("display", null).attr("x1", x(yr)).attr("x2", x(yr));
        const lines = series.slice().reverse().map((s) => {
          const d = s.values.find((v) => v[COL.year] === yr);
          const txt = `${s.age}: ${fmt1(d[COL.avgBedDays])} days`;
          return s.age === selected ? `<strong>${txt}</strong>` : `<span class="tt-muted">${txt}</span>`;
        });
        showTip(event, `<strong>${yr}</strong><br>${lines.join("<br>")}`);
      })
      .on("mouseleave", () => { rule.style("display", "none"); hideTip(); });
  }

  function drawPills() {
    d3.select("#q5-pills").selectAll("button").data(AGE_ORDER).join("button")
      .attr("type", "button")
      .attr("aria-pressed", (a) => String(a === selected))
      .text((a) => a)
      .on("click", (event, a) => { selected = a; drawPills(); draw(); });
  }

  loadCSV("data/q5_bed_days.csv")
    .then((rows) => {
      data = rows;
      drawPills();
      draw();
      onResize(draw);
      const table = d3.range(2011, 2022).map((yr) => {
        const r = { yr };
        AGE_ORDER.forEach((a) => { const d = rows.find((v) => v[COL.year] === yr && v[COL.age] === a); r[a] = d ? d[COL.avgBedDays] : NaN; });
        return r;
      });
      renderTable("#q5-table", table, [{ key: "yr", label: "Year" }].concat(AGE_ORDER.map((a) => ({ key: a, label: a, num: true, format: fmt1 }))));
    })
    .catch((e) => showError("#q5-chart", e));
})();
