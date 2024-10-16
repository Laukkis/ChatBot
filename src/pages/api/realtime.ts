import { NextApiRequest, NextApiResponse } from 'next';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const ws = new WebSocket(url, {
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    ws.on('open', function open() {
      console.log('Connection opened');
      // Send a message to the server
      ws.send(JSON.stringify({ type: 'greeting', content: 'Hello, server!' }));
    });

    ws.on('message', function incoming(data) {
      console.log('Message from server:', data.toString());
    });

    ws.on('error', function error(err) {
      console.error('WebSocket error:', err);
    });

    ws.on('close', function close() {
      console.log('Connection closed');
    });

    res.status(200).json({ message: 'WebSocket connection initiated' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}