import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  const apiKey = process.env.API_KEY || ''; 
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// 简单的对话生成
export const generateAIResponse = async (prompt: string, history: string[] = []): Promise<string> => {
  const ai = getAIClient();
  if (!ai) {
    await new Promise(r => setTimeout(r, 1000));
    return "API Key 未配置。请在环境变量中设置 API_KEY。";
  }

  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: `History: ${history.join('\n')}\nUser: ${prompt}`,
    });

    return response.text || "抱歉，我现在无法思考。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "服务暂时不可用。";
  }
};

// 结构化数据生成：用于 AI 配色实验
export interface ColorPalette {
  theme: string;
  colors: string[];
  description: string;
}

export const generateColorPalette = async (mood: string): Promise<ColorPalette> => {
  const ai = getAIClient();
  
  // Mock fallback if no key
  if (!ai) {
    await new Promise(r => setTimeout(r, 1500));
    return {
      theme: "演示模式 (无 Key)",
      colors: ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF5"],
      description: "这是一个演示配色，因为未检测到 API Key。请配置 Key 以体验 AI 生成。"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a color palette based on this mood/theme: "${mood}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING, description: "A creative name for the palette" },
            colors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of 5 hex color codes" 
            },
            description: { type: Type.STRING, description: "Why these colors fit the mood" }
          },
          required: ["theme", "colors", "description"]
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as ColorPalette;
  } catch (error) {
    console.error("Palette Gen Error:", error);
    throw new Error("生成配色失败");
  }
};