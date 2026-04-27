
import { GoogleGenAI } from "@google/genai";
import { Difficulty, Orientation } from "../types";

export const generateColoringImage = async (
  prompt: string, 
  difficulty: Difficulty, 
  orientation: Orientation,
  baseImage?: string,
  referenceImage?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Customizing prompt based on difficulty
  let detailLevel = "thick lines, simple shapes, large empty areas, easy to color, cartoon style";
  if (difficulty === Difficulty.SMALL) {
    detailLevel = "intricate details, thin lines, many small patterns, zentangle style, detailed backgrounds";
  } else if (difficulty === Difficulty.MEDIUM) {
    detailLevel = "medium line thickness, clear subjects, some background detail, fun patterns";
  }

  // Base instructions for a consistent style
  const styleInstructions = `Create a black and white coloring book page for a 6 year old child. 
    Style: purely black outlines on a pure white background, no shading, no gray colors, clean line art. 
    Complexity: ${detailLevel}. Ensure high quality, fun and friendly design. 
    Orientation: ${orientation === Orientation.LANDSCAPE ? 'Landscape (wider than tall)' : 'Portrait (taller than wide)'}.`;

  const contents: any = { parts: [] };

  // Case 1: Incremental update of an existing coloring page
  if (baseImage) {
    const base64Data = baseImage.split(',')[1];
    contents.parts.push({
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    });
    contents.parts.push({
      text: `Based on this existing coloring page, make a minor change or addition as described: "${prompt}". Keep the overall structure and style identical, just modify the specific part requested. Instruction: ${styleInstructions}`
    });
  } 
  // Case 2: Creating a coloring page from a photo/reference image
  else if (referenceImage) {
    const refBase64Data = referenceImage.split(',')[1];
    contents.parts.push({
      inlineData: {
        data: refBase64Data,
        mimeType: 'image/jpeg'
      }
    });
    const userPromptText = prompt ? ` and incorporating this idea: "${prompt}"` : "";
    contents.parts.push({
      text: `Transform this photo/image into a coloring page${userPromptText}. ${styleInstructions}`
    });
  }
  // Case 3: Pure text/voice prompt
  else {
    contents.parts.push({
      text: `User input: "${prompt}". ${styleInstructions}`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: {
        imageConfig: {
          aspectRatio: orientation === Orientation.LANDSCAPE ? "4:3" : "3:4"
        }
      }
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("No image generated");
    return imageUrl;
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};
