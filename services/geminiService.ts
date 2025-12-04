import { GoogleGenAI, Type } from "@google/genai";

// Safe access to process.env for browser environments
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export interface ExtractedAppointment {
  title: string;
  clientName: string;
  start: string; // ISO
  end: string;   // ISO
  notes: string;
}

export const analyzeSchedulingRequest = async (
  prompt: string, 
  currentDate: string
): Promise<ExtractedAppointment | null> => {
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Please configure process.env.API_KEY");
    return null;
  }

  try {
    const systemInstruction = `
      You are a scheduling assistant. 
      The current date and time is: ${currentDate}.
      Extract appointment details from the user's natural language request.
      If the duration is not specified, assume 1 hour.
      Return dates in ISO 8601 format.
      If the user does not specify a date, assume today or the next logical occurrence based on "tomorrow", "next friday", etc.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Service or purpose of appointment" },
            clientName: { type: Type.STRING, description: "Name of the client" },
            start: { type: Type.STRING, description: "Start date time ISO 8601" },
            end: { type: Type.STRING, description: "End date time ISO 8601" },
            notes: { type: Type.STRING, description: "Any extra details" }
          },
          required: ["title", "start", "end"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ExtractedAppointment;
    }
    return null;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};

export const generateReminderMessage = async (
  clientName: string,
  time: string,
  service: string
): Promise<string> => {
  if (!apiKey) return `Olá ${clientName}, lembrete do seu agendamento: ${service} às ${time}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a polite, short WhatsApp reminder message for a client named ${clientName} about their appointment for ${service} at ${time}. Portuguese language.`,
    });
    return response.text || '';
  } catch (e) {
    return `Olá ${clientName}, lembrete do seu agendamento: ${service} às ${time}.`;
  }
};