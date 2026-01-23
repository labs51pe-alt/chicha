
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem } from "../types";

export const getAIRecommendation = async (userPrompt: string, menu: MenuItem[]) => {
  // FIX: Always initialize GoogleGenAI inside the call to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const menuContext = menu.map(item => `${item.name} (${item.category}): ${item.description} - S/ ${item.price}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Eres el "Churre Malcriado", el asistente virtual de una sanguchería piurana con mucha chispa y sabor.
      Tu objetivo es recomendar platos del menú basado en lo que el usuario pida.
      Usa un lenguaje muy coloquial piurano (usa palabras como "ya pues", "churre", "habla", "bacán").
      
      MENU DISPONIBLE:
      ${menuContext}
      
      PREGUNTA DEL USUARIO:
      ${userPrompt}
      
      Responde en formato JSON con la siguiente estructura:
      {
        "message": "Tu respuesta amigable en texto",
        "recommendedItemIds": ["id1", "id2"] // IDs de los items del menú que recomiendas
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            recommendedItemIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["message", "recommendedItemIds"]
        }
      }
    });

    // FIX: Access response.text property directly as per latest SDK guidelines
    const responseText = response.text || "{}";
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      message: "¡Uy churre! Se me chispoteó el sistema, pero yo te recomiendo la Malcriada que nunca falla.",
      recommendedItemIds: ["1"]
    };
  }
};
