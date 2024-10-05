import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  organization: process.env.ORGANIZATION,
  project: process.env.PROJECT,
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res
      .status(400)
      .json({ error: "Messages are required and should be an array" });
    return;
  }

  try {
    const formattedMessages = messages.map((msg) => ({
      role: msg.isUser ? "user" : "assistant",
      content: msg.text,
    }));

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: formattedMessages as OpenAI.ChatCompletionMessageParam[],
      stream: true,
    });

    res.setHeader("Content-Type", "application/octet-stream");
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      res.write(content);
    }
    res.end();
  } catch (error) {
    console.error("Error fetching haiku:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
