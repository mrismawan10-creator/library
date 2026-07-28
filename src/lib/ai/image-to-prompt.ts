import "server-only";

import { z } from "zod";
import { AI_VISION_MODEL, getAiClient } from "./client";

/**
 * Image-to-prompt (inspired by TimFIV/image-to-prompt).
 *
 * Sends an image to a vision-capable model over the same OpenAI-compatible
 * client the rest of the app uses, and asks for a single-paragraph prompt that
 * could recreate the image with an AI image generator. Two styles: a rich
 * "detailed" paragraph and a short "concise" one. Output is plain prose — no
 * lists, no markdown — so it drops straight into a prompt field.
 */

export const imageStyleSchema = z.enum(["detailed", "concise"]);
export type ImageStyle = z.infer<typeof imageStyleSchema>;

const STYLE_INSTRUCTION: Record<ImageStyle, string> = {
  detailed:
    "Write ONE rich, detailed paragraph that could be used as a prompt to recreate this image with an AI image generator. Cover the subject, setting, composition, lighting, colors, mood, art style, and medium. Do not use lists, headings, or line breaks — a single flowing paragraph only.",
  concise:
    "Write ONE short paragraph (one to three sentences) capturing the essence of this image as a prompt for an AI image generator: the main subject, style, and mood. Do not use lists or line breaks — a single paragraph only.",
};

const SYSTEM_INSTRUCTION = `You are an expert at reverse-engineering images into prompts for AI image generators.
Describe only what is visible. Never add commentary, disclaimers, or markdown.
Match the language of any prominent text in the image, otherwise use English.
Return the prompt text and nothing else.`;

export async function imageToPrompt(
  dataUrl: string,
  style: ImageStyle,
): Promise<string> {
  const client = getAiClient();

  const completion = await client.chat.completions.create({
    model: AI_VISION_MODEL,
    temperature: 0.4,
    max_tokens: style === "detailed" ? 500 : 160,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      {
        role: "user",
        content: [
          { type: "text", text: STYLE_INSTRUCTION[style] },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from the vision model.");

  // Collapse any stray line breaks so the result is a single paragraph.
  return text.replace(/\s*\n+\s*/g, " ").trim();
}
