import * as d3 from "d3";
import cloud from "d3-cloud";

export default async function setupWordCloud() {
  function drawWordCloud(
    wordsIn: Array<{ text: string; count: number } | string>
  ) {
    const svg = d3.select("#cloud");
    const svgEl = svg.node() as SVGSVGElement | null;
    if (!svgEl) return;

    // ⚠️ Medimos el CONTENEDOR (la card del centro), no el propio SVG
    const container = svgEl.parentElement as HTMLElement;
    const rect = container.getBoundingClientRect();
    const width = Math.max(100, Math.floor(rect.width));
    const height = Math.max(100, Math.floor(rect.height));

    // El SVG se ajusta al contenedor
    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const minF = 14;
    const maxF = Math.max(28, Math.min(72, Math.round(width / 14)));

    // Si viene {text,count} usamos la cuenta; si no, derivamos
    const hasCounts = typeof (wordsIn as any)[0] === "object";
    const data = hasCounts
      ? (wordsIn as any[]).map((d) => ({ text: d.text, count: d.count }))
      : (wordsIn as string[]).map((t, i, arr) => ({
          text: t,
          count: arr.length - i,
        }));

    const counts = data.map((d) => d.count);
    const scale = d3
      .scaleLinear()
      .domain([d3.min(counts) ?? 1, d3.max(counts) ?? 1])
      .range([minF, maxF]);

    const layout = (cloud() as any)
      .size([width, height])
      .padding(3)
      .rotate(() => 0)
      .font("system-ui")
      .fontSize((d: any) => scale(d.count))
      .words(data as any);

    layout.on("end", (placed: any[]) => {
      svg.selectAll("*").remove();
      const g = svg
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);
      g.selectAll("text")
        .data(placed.sort((a, b) => b.size - a.size))
        .enter()
        .append("text")
        .attr("class", "word")
        .style("font-size", (d: any) => d.size + "px")
        .style("font-family", "system-ui, sans-serif")
        .attr("text-anchor", "middle")
        .attr(
          "transform",
          (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`
        )
        .text((d: any) => d.text);
    });

    layout.start();
  }

  // Re-render al redimensionar (observamos el CONTENEDOR)
  const center = document.querySelector(".tile.center") as HTMLElement;
  const ro = new ResizeObserver(() => drawWordCloud(currentWords));
  if (center) ro.observe(center);

  async function loadDataAndRender() {
    const res = await fetch("/api/trending").catch(() => null);
    const data =
      res && res.ok
        ? await res.json()
        : { headlines: [], keywordsDetailed: [], keywords: [] };

    // ticker superior
    const headlines = data.headlines || [];
    try {
      const wres = await fetch("/api/weather");
      let prefix = "";
      if (wres.ok) {
        const w = await wres.json();
        prefix = `Clima Buenos Aires: ${Math.round(w.temp)}°C, ${w.desc}  •  `;
      }
      document.getElementById("headlineMarquee")!.textContent =
        prefix + [...headlines, ...headlines].join("  •  ");
    } catch {
      document.getElementById("headlineMarquee")!.textContent = [
        ...headlines,
        ...headlines,
      ].join("  •  ");
    }

    // nube centro
    const words = data.keywordsDetailed?.length
      ? data.keywordsDetailed.slice(0, 60)
      : (data.keywords || []).map((t: string, i: number, arr: string[]) => ({
          text: t,
          count: arr.length - i,
        }));

    drawWordCloud(words);

    const ro = new ResizeObserver(() => drawWordCloud(words as any));
    ro.observe(document.getElementById("cloud")!);
  }

  loadDataAndRender();
  setInterval(loadDataAndRender, 5 * 60 * 1000);
}
