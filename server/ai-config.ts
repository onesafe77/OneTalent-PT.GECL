import OpenAI from "openai";

// Determine if we have a valid key. If not, fallback to dummy to prevent crash on init.
// Klien ini menembak OpenRouter, jadi OPENROUTER_API_KEY didahulukan. Dulu OPENAI_API_KEY
// menang: di Railway variabel itu berisi kunci OpenAI asli -> OpenRouter membalas 401.
// Nilai dirapikan (spasi, baris baru, tanda kutip) karena sering ikut tertempel di dasbor.
export const kunciOpenRouter = () =>
    [process.env.OPENROUTER_API_KEY, process.env.OPENAI_API_KEY]
        .map((v) => (v || "").trim().replace(/^["']|["']$/g, "").trim())
        .find(Boolean) || "";
const apiKey = kunciOpenRouter();

// Base configuration for OpenRouter
export const openRouterClient = new OpenAI({
    apiKey: apiKey || "dummy-key",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "https://onetalent.gecl.co.id", // Optional, for including your app on openrouter.ai rankings.
        "X-Title": "OneTalent GECL", // Optional. Shows in rankings on openrouter.ai.
    }
});

/**
 * Common OpenRouter Models
 * Add to this list as needed.
 */
export const AI_MODELS = {
    // Use for fast text tasks (replaces gemini-1.5-flash / gemini-2.0-flash)
    FAST_TEXT: "openai/gpt-4o-mini",
    // Model chat Mystic (agen berpustaka). Bisa diganti tanpa deploy ulang lewat variabel CHAT_MODEL.
    CHAT: process.env.CHAT_MODEL || "openai/gpt-4o-mini",

    // Use for vision tasks (if supported by the specific model on OR)
    VISION: "openai/gpt-4o-mini",

    // Use for reasoning / extraction where GPT-4 series was previously used
    SMART_EXTRACTION: "openai/gpt-4o-mini",

    // Conversational / "AI bot" reasoning (Telegram Safety Patrol bot).
    // Nous Hermes 4 70B via OpenRouter — pintar untuk percakapan, hemat biaya.
    SMART_CHAT: "nousresearch/hermes-4-70b",

    // Embedding
    EMBEDDING: "openai/text-embedding-3-small"
};
