import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.OPENWEATHER_KEY; // definí OPENWEATHER_KEY en .env
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing OPENWEATHER_KEY" }), {
      status: 500,
    });
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?q=Buenos%20Aires,AR&units=metric&lang=es&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok)
    return new Response(JSON.stringify({ error: "weather fetch failed" }), {
      status: 502,
    });
  const data = await res.json();
  return new Response(
    JSON.stringify({
      temp: data.main?.temp,
      desc: data.weather?.[0]?.description ?? "",
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=300",
      },
    }
  );
};
