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
