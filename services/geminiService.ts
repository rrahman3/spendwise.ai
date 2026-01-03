
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Receipt } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const extractReceiptData = async (base64Image: string): Promise<Partial<Receipt>> => {
  const model = 'gemini-3-flash-preview';

  const prompt = `You are a world-class financial auditor. Extract data from this receipt with surgical precision.
  
  FIELD INSTRUCTIONS:
  1. type: 'purchase' or 'refund'.
  2. storeName: The trade name of the merchant.
  3. items: Array of objects. For each item:
     - name: Descriptive product name.
     - quantity: Number of units.
     - price: THE UNIT PRICE (Price for exactly ONE unit).
     - lineTotal: The total cost for that line (qty * unit price).
     - category: High-level group (e.g., Groceries, Dining, Electronics, Health, Apparel, Home, fee).
     - subcategory: Specific type (e.g., Dairy, Produce, Fast Food, Pharmacy, tax 1, tax 2).
  4. source: scan
  5. date: The date of the purchase format YYYY-MM-DD.
  6. time: The time of the purchase HH:MM:SS.
  
  TAX EXTRACTION RULES:
  - Identify all Taxes (Sales Tax, VAT, GST, etc.) as separate items in the 'items' array.
  - For Tax items:
    - category: Must be 'fee'.
    - subcategory: Use 'tax 1' for standard rates (e.g., ~6-8% general tax). Use 'tax 2' for reduced rates (e.g., ~1-2% grocery/essential tax).
    - If the rate isn't explicitly listed, use your best guess for 'tax 1' or 'tax 2' based on the store type and item categories.
    - quantity: 1.
    - price: The total tax amount for that rate.
    - s
  
  CRITICAL MATH LOGIC:
  - If a receipt shows "2 @ 5.00 ... 10.00", the 'price' is 5.00 and 'quantity' is 2.
  - If it ONLY shows "2 x MILK ... 12.00", you MUST divide 12 by 2 and set 'price' to 6.00.
  - DO NOT put the total line cost in the 'price' field if quantity is > 1.
  
  INTELLIGENT CATEGORIZATION:
  - Use the Store Name and Item Name to determine the most logical Category and Subcategory. 
  - Be specific. "Grocery > Produce" is better than just "Food".
  
  Return strictly valid JSON.`;

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
          source: { type: Type.STRING },
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
        required: ["storeName", "date", "time", "total", "items", "source"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const extractReceiptsFromCsv = async (
  csvText: string, 
  onProgress: (progress: number) => void
): Promise<Receipt[]> => {
  const model = 'gemini-3-flash-preview';
  const lines = csvText.split('\n');
  const totalLines = lines.length;
  const chunkSize = 50; // Process 50 lines at a time
  let allReceipts: Receipt[] = [];

  const promptTemplate = `
    Please process the following CSV data and convert it into a JSON array of receipt objects.
    The CSV format uses 'RH' for a receipt header and 'RI' for a receipt item.

    The final JSON must follow this structure:
    [
      {
        "id": "string",
        "storeName": "string",
        "date": "string",
        "total": "number",
        "items": [
          {
            "name": "string",
            "quantity": "number",
            "price": "number"
          }
        ],
        "currency": "string",
        "createdAt": "number",
        "source": "csv"
      }
    ]

    - Each 'RH' line marks the beginning of a new receipt.
    - The lines immediately following an 'RH' line are the 'RI' (items) for that receipt.
    - Generate a unique ID for each receipt.
    - Set the 'createdAt' field to the current Unix timestamp in milliseconds.
    - The 'source' field must always be set to 'csv'.
  `;

  for (let i = 0; i < totalLines; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: promptTemplate },
          { text: chunk }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                storeName: { type: Type.STRING },
                date: { type: Type.STRING },
                total: { type: Type.NUMBER },
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            quantity: { type: Type.NUMBER },
                            price: { type: Type.NUMBER },
                        },
                        required: ["name", "quantity", "price"]
                    }
                },
                currency: { type: Type.STRING },
                createdAt: { type: Type.NUMBER },
                source: { type: Type.STRING }
            },
            required: ["id", "storeName", "date", "total", "items", "currency", "createdAt", "source"]
          }
        }
      }
    });

    const receiptsFromChunk = JSON.parse(response.text || '[]');
    allReceipts = [...allReceipts, ...receiptsFromChunk];
    const progress = Math.min(((i + chunkSize) / totalLines) * 100, 100);
    onProgress(progress);
  }

  return allReceipts;
};


export const chatWithHistory = async (history: Receipt[], userQuestion: string): Promise<string> => {
  const model = 'gemini-3-pro-preview';

  const context = JSON.stringify(history.map(r => ({
    store: r.storeName,
    date: r.date,
    total: r.total,
    items: r.items,
    source: r.source
  })));

  const systemPrompt = `You are a professional financial assistant. 
  You have access to the user's receipt history: ${context}.
  Each receipt has a 'source' field ('scan' or 'csv').
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
