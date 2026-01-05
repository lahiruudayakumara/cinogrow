import api from "../config/api";
import i18n from "../i18n/i18n";

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
      language?: "en" | "si" | "ta";
    }
  | { status: "invalid"; message: string; language?: string }
  | { status: "error"; message: string; language?: string };

function normalizeLang(lng?: string): "en" | "si" | "ta" {
  const code = (lng || i18n.resolvedLanguage || i18n.language || "en")
    .toLowerCase()
    .split("-")[0]
    .split("_")[0];
  if (code === "si" || code === "ta") return code;
  return "en";
}

export async function detectPestDisease(
  fileUri: string,
  mode: "normal" | "advanced" = "normal",
  lang?: "en" | "si" | "ta"
): Promise<DetectionResult> {
  const chosenLang = normalizeLang(lang);
  const urls = [api.API_BASE_URL, ...(api.FALLBACK_URLS || [])];
  const form = new FormData();
  // @ts-ignore React Native FormData typing
  form.append("file", { uri: fileUri, name: "image.jpg", type: "image/jpeg" });

  let lastErr: any = null;

  for (const base of urls) {
    const url = `${base.replace(/\/$/, "")}/detect?mode=${mode}&lang=${chosenLang}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), api.TIMEOUT || 10000);

      const res = await fetch(url, {
        method: "POST",
        body: form as any,
        signal: controller.signal,
        headers: {
          // Optional: helps proxies or logs, backend reads from query param
          "Accept-Language": chosenLang,
        },
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

  return { status: "error", message: lastErr?.message || "Network error", language: chosenLang };
}