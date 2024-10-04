import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  organization: process.env.ORGANIZATION,
  project: process.env.PROJECT,
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(ws: WebSocket, message: string) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: message },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    console.log("Sending chunk:", content); // Debug log
    ws.send(content);
  }
  ws.close();
}

const server = createServer();

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket) => {
  console.log("New client connected");

  ws.on("message", async (message: string) => {
    console.log(`Received message: ${message}`);
    await generateResponse(ws, message);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(5000, (err?: Error) => {
  if (err) {
    console.error("Server error:", err);
    throw err;
  }
  console.log("> WebSocket server ready on ws://localhost:5000");
});
