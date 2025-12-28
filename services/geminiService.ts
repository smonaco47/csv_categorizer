
import { GoogleGenAI, Type } from "@google/genai";
import { CategorizedItem, CategorizationOptions } from "../types";

export const categorizeData = async (
  texts: string[], 
  options: CategorizationOptions = {}
): Promise<CategorizedItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Dedup for efficiency
  const uniqueTexts = Array.from(new Set(texts))
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  if (uniqueTexts.length === 0) return [];

  const batchSize = 100;
  const results: CategorizedItem[] = [];

  const { maxCategories, predefinedCategories } = options;

  let promptContext = "";
  if (predefinedCategories && predefinedCategories.length > 0) {
    promptContext += `\nCRITICAL: You MUST prioritize using these specific categories: ${predefinedCategories.join(', ')}. If an item clearly does not fit any of these, use the category 'Other'.`;
  }
  if (maxCategories && maxCategories > 0) {
    promptContext += `\nCRITICAL: Do not create more than ${maxCategories} unique categories in total. Merge similar themes to stay under this limit.`;
  }

  for (let i = 0; i < uniqueTexts.length; i += batchSize) {
    const chunk = uniqueTexts.slice(i, i + batchSize);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorize the following text entries. ${promptContext}
        
        Entries to process:
        ${chunk.map((t, idx) => `${idx + 1}. "${t}"`).join('\n')}
      `,
      config: {
        systemInstruction: "You are a senior data analyst. Your task is to categorize a list of text inputs into concise, logical, and meaningful categories. Follow constraints strictly. Return only the JSON array.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalText: { type: Type.STRING, description: "The exact text provided in the input list." },
              category: { type: Type.STRING, description: "A concise 1-3 word category name." },
              confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0." },
              reason: { type: Type.STRING, description: "Brief explanation of why it fits this category." }
            },
            required: ["originalText", "category", "confidence", "reason"]
          }
        }
      }
    });

    try {
      const parsed: CategorizedItem[] = JSON.parse(response.text || '[]');
      results.push(...parsed);
    } catch (e) {
      console.error("Failed to parse Gemini response for batch", i, e);
      chunk.forEach(t => results.push({ 
        originalText: t, 
        category: 'Uncategorized', 
        confidence: 0, 
        reason: 'Processing Error' 
      }));
    }
  }

  return results;
};
