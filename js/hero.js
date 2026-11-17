/* Hero visual: small area chart of annual hospitalisations with the latest value called out. */
(function () {
  let data;

  function draw() {
    const m = { top: 28, right: 64, bottom: 26, left: 8 };
    const f = makeFrame("#hero-chart", 220, m);
    const x = d3.scaleLinear().domain(d3.extent(data, (d) => d[COL.year])).range([0, f.innerW]);
    const y = d3.scaleLinear().domain([0, 45000]).range([f.innerH, 0]);

    f.g.append("path")
      .datum(data)
      .attr("fill", "#E4E1F2")
      .attr("d", d3.area().x((d) => x(d[COL.year])).y0(f.innerH).y1((d) => y(d[COL.hosp])).curve(d3.curveMonotoneX));
    f.g.append("path")
      .datum(data)
      .attr("fill", "none").attr("stroke", COLORS.series1).attr("stroke-width", 2.5)
      .attr("d", d3.line().x((d) => x(d[COL.year])).y((d) => y(d[COL.hosp])).curve(d3.curveMonotoneX));

    f.g.append("g").attr("class", "axis no-domain")
      .attr("transform", `translate(0,${f.innerH})`)
      .call(d3.axisBottom(x).tickValues([2011, 2016, 2021]).tickFormat(d3.format("d")).tickSize(0).tickPadding(8));

    const first = data[0], last = data[data.length - 1];
    [first, last].forEach((d) => {
      f.g.append("circle").attr("cx", x(d[COL.year])).attr("cy", y(d[COL.hosp])).attr("r", 5)
        .attr("fill", COLORS.series1).attr("stroke", "#fff").attr("stroke-width", 2);
    });
    f.g.append("text").attr("class", "value-label").attr("x", x(first[COL.year])).attr("y", y(first[COL.hosp]) - 12)
      .text(fmt(first[COL.hosp]));
    f.g.append("text").attr("class", "value-label").attr("x", x(last[COL.year])).attr("y", y(last[COL.hosp]) - 12)
      .attr("text-anchor", "end").style("font-size", "15px").text(fmt(last[COL.hosp]));
  }

  loadCSV("data/q1_annual.csv")
    .then((rows) => { data = rows.sort((a, b) => a[COL.year] - b[COL.year]); draw(); onResize(draw); })
    .catch((e) => showError("#hero-chart", e));
})();
