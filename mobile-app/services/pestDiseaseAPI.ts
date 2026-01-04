import api from "../config/api";

export type DetectionResult =
  | {
      status: "infected";
      name: string;
      confidence: number;
      severity: "High" | "Medium" | "Low";
      recommendation?: string;
      category?: string;
      affected_area?: string;
      symptoms?: string[];
      cause?: string;
      life_cycle?: string;
      recommendations?: string[];
    }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

export async function detectPestDisease(
  fileUri: string,
  mode: "normal" | "advanced" = "normal"
): Promise<DetectionResult> {
  const urls = [api.API_BASE_URL, ...(api.FALLBACK_URLS || [])];
  const form = new FormData();
  // @ts-ignore: React Native FormData uri typing
  form.append("file", { uri: fileUri, name: "image.jpg", type: "image/jpeg" });

  let lastErr: any = null;

  for (const base of urls) {
    const url = `${base.replace(/\/$/, "")}/detect?mode=${mode}`;
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
        let msg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.message) msg = errData.message;
        } catch {}
        lastErr = new Error(msg);
        continue;
      }

      const data = (await res.json()) as DetectionResult;
      return data;
    } catch (e: any) {
      lastErr = e;
      continue;
    }
  }

  return { status: "error", message: lastErr?.message || "Network error" };
}