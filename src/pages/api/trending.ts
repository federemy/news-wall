import type { APIRoute } from "astro";
import { XMLParser } from "fast-xml-parser";

const FEEDS = [
  "https://www.clarin.com/rss/lo-ultimo/",
  "https://www.lanacion.com.ar/rss/lo-mas-importante/",
  "https://www.infobae.com/argentina/rss.xml",
  "https://www.pagina12.com.ar/rss/portada",
  "https://www.ambito.com/rss/ultimas-noticias.xml",
  "https://www.perfil.com/rss/ultimas-noticias.xml",
];

const STOP = new Set([
  // español básico
  "a",
  "al",
  "algo",
  "algunas",
  "algunos",
  "ante",
  "antes",
  "como",
  "con",
  "contra",
  "cual",
  "cuando",
  "de",
  "del",
  "desde",
  "donde",
  "dos",
  "el",
  "ella",
  "ellas",
  "ellos",
  "en",
  "entre",
  "era",
  "eran",
  "es",
  "esa",
  "esas",
  "ese",
  "eso",
  "esos",
  "esta",
  "estaba",
  "estaban",
  "estar",
  "este",
  "estos",
  "fue",
  "ha",
  "han",
  "hay",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "mas",
  "más",
  "me",
  "mi",
  "mis",
  "muy",
  "no",
  "nos",
  "o",
  "para",
  "pero",
  "por",
  "porque",
  "que",
  "qué",
  "se",
  "segun",
  "según",
  "ser",
  "si",
  "sí",
  "sin",
  "sobre",
  "su",
  "sus",
  "tambien",
  "también",
  "te",
  "tenia",
  "tenía",
  "tenían",
  "tiene",
  "tienen",
  "tu",
  "tus",
  "un",
  "una",
  "uno",
  "y",
  "ya",
  // ruido frecuente
  "video",
  "vivo",
  "minuto",
  "ultimo",
  "último",
  "ultima",
  "última",
  "hoy",
  "ayer",
  "manana",
  "mañana",
  "argentina",
  "buenos",
  "aires",
  "nacional",
  "provincia",
  "capital",
  "ciudad",
  // meses
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
  // días
  "lunes",
  "martes",
  "miercoles",
  "miércoles",
  "jueves",
  "viernes",
  "sabado",
  "sábado",
  "domingo",
  // ruido HTML/feeds
  "amp",
  "nbsp",
  "quot",
  "raquo",
  "laquo",
  "http",
  "https",
  "www",
]);

function stripHtmlEntities(s: string) {
  return s
    .replace(/<[^>]*>/g, " ") // tags
    .replace(/&[a-zA-Z#0-9]+;/g, " "); // entidades
}

function tokenize(text: string) {
  const clean = stripHtmlEntities(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-záéíóúüñ\s]/g, " "); // solo letras (quita números/ruido)
  return clean.split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));
}

export const GET: APIRoute = async () => {
  const parser = new XMLParser({
    ignoreAttributes: true,
    attributeNamePrefix: "",
  });

  const headlines: string[] = [];
  const freq = new Map<string, number>();

  await Promise.allSettled(
    FEEDS.map(async (url) => {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) return;
      const xml = await res.text();
      const data = parser.parse(xml);
      const items = data?.rss?.channel?.item || data?.feed?.entry || [];
      for (const it of items) {
        const title = String(it.title?.["#text"] || it.title || "");
        if (!title) continue;
        headlines.push(title.trim());

        // SOLO titulo para tokens (evita HTML del description)
        for (const token of tokenize(title)) {
          freq.set(token, (freq.get(token) || 0) + 1);
        }
      }
    })
  );

  // Palabras clave con umbral mínimo (>=2 apariciones)
  const keywords = [...freq.entries()]
    .filter(([_, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([w]) => w);

  return new Response(
    JSON.stringify({
      headlines: headlines.slice(0, 80),
      keywords,
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
      },
    }
  );
};
