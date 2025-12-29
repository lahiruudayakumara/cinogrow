import api from "../config/api";

export type DetectionResult =
  | {
      status: "infected";
      stage: string;
      results: { type: string; name: string; confidence: number }[];
    }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

export async function detectPestDisease(fileUri: string): Promise<DetectionResult> {
  const urls = [api.API_BASE_URL, ...api.FALLBACK_URLS];
  const form = new FormData();
  // @ts-ignore: React Native FormData uri typing
  form.append("file", {
    uri: fileUri,
    name: "image.jpg",
    type: "image/jpeg",
  });

  let lastErr: any = null;
  for (const base of urls) {
    const url = `${base.replace(/\/$/, "")}/detect`;
    console.log("Sending request to:", url);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), api.TIMEOUT || 10000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: form as any,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        // Try to parse error body
        let message = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {}
        lastErr = new Error(message);
        continue;
      }
      const data = (await res.json()) as DetectionResult;
      console.log("Response data:", data);
      return data;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  return { status: "error", message: lastErr?.message || "Network error" };
}
