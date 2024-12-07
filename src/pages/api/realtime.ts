import { NextApiRequest, NextApiResponse } from 'next';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import OpenAI from "openai";

// Load environment variables from .env file
dotenv.config();

let ws: WebSocket | null = null;


function getWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      console.time('websocketConnection');
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.timeEnd('websocketConnection');
        console.log('Using existing WebSocket connection');
        resolve(ws);
      } else {
        const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";
        ws = new WebSocket(url, {
          headers: {
            "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
            "OpenAI-Beta": "realtime=v1",
          },
        });
  
        ws.onopen = () => {
          console.timeEnd('websocketConnection');
          console.log("WebSocket connected");
          resolve(ws!);
        };
  
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
  
        ws.onclose = () => {
          console.log("WebSocket closed");
          ws = null;
        };
      }
    });
  }

  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
      console.time('totalApiTime');
      /* const { message, audioData, isCompressed } = req.body; */
      const { messages } = req.body;
  
      const message = messages.map((msg: any) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text,
        type: 'text'
      }));

      try {
        console.time('socketConnection');
        const socket = await getWebSocket();
        console.timeEnd('socketConnection');
  
        let response = '';
        let audioChunks: Buffer[] = [];
        let isResponseComplete = false;
  
        const userEvent = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: message[0].content }],
            
          }
        };
  
        console.time('socketSend');
        socket.send(JSON.stringify(userEvent));
        socket.send(JSON.stringify({type: 'response.create'}));
        console.timeEnd('socketSend');
  
        console.time('aiResponseTime');
        
        await new Promise<void>((resolve, reject) => {
          const messageHandler = (data: WebSocket.Data) => {
            const parsedData = JSON.parse(data.toString());
            console.log("Received message type:", parsedData.type);
            console.log(parsedData)
            
         if (parsedData.type === 'error') {
              console.error("API Error:", parsedData.error);
              reject(new Error(parsedData.error.message));
              return;
            }
            if (parsedData.type === 'conversation.item.create' && parsedData.item.role === 'assistant') {
              response += parsedData.item.content[0].text;
              console.log("Received response:", response);
            }
            if (parsedData.type === 'response.audio.delta') {
                const chunk = Buffer.from(parsedData.delta, 'base64');
                audioChunks.push(chunk);
              }
            if (parsedData.type === 'response.done') {
              console.timeEnd('aiResponseTime');
              isResponseComplete = true;
              socket.removeListener('message', messageHandler);
              resolve();
            } 
          };
  
          socket.on('message', messageHandler);
        });

        if (isResponseComplete) {
            const audioBuffer = Buffer.concat(audioChunks);
            console.log("Sending response:", response);
            console.log("Sending audio data, length:", audioBuffer.length);
            console.timeEnd('totalApiTime');
            res.status(200).json({ 
              response: response,
              audioData: audioBuffer.toString('base64'),
              audioMimeType: determineAudioMimeType(audioBuffer)
            });
          } else {
            throw new Error('Response was not completed');
          }
    
        } catch (error) {
          console.error("Error in API handler:", error);
          res.status(500).json({ error: 'An error occurred while processing the request' });
        }
      } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
      }
    }
    
    function determineAudioMimeType(buffer: Buffer): string {
      const header = buffer.slice(0, 4).toString('hex');
      console.log("Audio header:", header);
      if (header.startsWith('fff3') || header.startsWith('fff2')) return 'audio/mpeg';
      if (header.startsWith('5249')) return 'audio/wav'; // "RIFF" in hex
      if (header.startsWith('4f676753')) return 'audio/ogg';
      if (header.startsWith('664c6143')) return 'audio/flac'; // "fLaC" in hex
      return 'audio/mp3'; // Default to MP3 if unknown
    }