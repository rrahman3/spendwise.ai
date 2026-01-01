
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Receipt } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const extractReceiptData = async (base64Image: string): Promise<Partial<Receipt>> => {
  const model = 'gemini-3-flash-preview';

  const prompt = `Extract all details from this receipt image. 
  Include: 
  - storeName (string)
  - date (string, YYYY-MM-DD format preferred)
  - time (string, HH:MM:SS format preferred, use 00:00:00 if unknown)
  - total (number)
  - currency (string, e.g., USD, EUR)
  - items (array of objects with 'name', 'quantity', 'price', 'category', and 'subcategory')
  
  Categorize items into common types like Groceries, Electronics, Clothing, etc.
  Provide a more specific subcategory (e.g., if category is Groceries, subcategory might be Dairy, Produce, or Snacks).
  If information is missing, use sensible defaults.`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          storeName: { type: Type.STRING },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
          total: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                price: { type: Type.NUMBER },
                category: { type: Type.STRING },
                subcategory: { type: Type.STRING }
              },
              required: ["name", "quantity", "price"]
            }
          }
        },
        required: ["storeName", "date", "time", "total", "items"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const chatWithHistory = async (history: Receipt[], userQuestion: string): Promise<string> => {
  const model = 'gemini-3-pro-preview';

  const context = JSON.stringify(history.map(r => ({
    store: r.storeName,
    date: r.date,
    total: r.total,
    items: r.items
  })));

  const systemPrompt = `You are a professional financial assistant. 
  You have access to the user's receipt history: ${context}.
  Answer the user's questions accurately based ONLY on this history. 
  If they ask about trends, summarize them. If they ask about specific items, find them.
  Be concise and helpful. Use markdown formatting.`;

  const response = await ai.models.generateContent({
    model,
    contents: userQuestion,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
    }
  });

  return response.text || "I couldn't process that question. Please try again.";
};
