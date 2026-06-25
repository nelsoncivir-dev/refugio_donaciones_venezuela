import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize Gemini AI
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API routes FIRST
  app.post("/api/gemini/extract-missing-person", async (req, res) => {
    try {
      const { image } = req.body; // base64 string
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Check for valid format, extract mimeType and data
      const match = image.match(/^data:(image\/[a-zA-Z]*);base64,([^\"]*)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image format" });
      }

      const mimeType = match[1];
      const data = match[2];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data
              }
            },
            {
              text: "Extrae la información de la persona desaparecida o buscada de esta imagen. Si hay un nombre, descripción física, contacto, o último lugar visto, extráelo."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "El nombre de la persona desaparecida y un breve resumen, ejemplo 'Juan Pérez - Desaparecido en Caracas'."
              },
              description: {
                type: Type.STRING,
                description: "Descripción física detallada (edad, ropa, altura), último lugar donde fue visto, y cualquier otra información relevante."
              },
              contact: {
                type: Type.STRING,
                description: "Números de teléfono o redes sociales de contacto para reportar información."
              },
              address: {
                type: Type.STRING,
                description: "Última ubicación conocida (zona, ciudad o dirección exacta)."
              }
            },
            required: ["title", "description"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const extractedData = JSON.parse(text);
        return res.json(extractedData);
      }
      return res.status(500).json({ error: "No data extracted" });

    } catch (error) {
      console.error("Error extracting missing person data:", error);
      return res.status(500).json({ error: "Failed to extract data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
