import { NextApiRequest, NextApiResponse } from 'next';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { PassThrough } from 'stream';

dotenv.config();

// Global state
let ws: WebSocket | null = null;
let currentResponse = false;
let activePromisesCount = 0;
let currentController: AbortController | null = null;

// Reset state between requests
function resetState() {
  currentResponse = false;
  activePromisesCount = 0;
}

function cancelCurrentResponse() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
  resetState();
}

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
    
    // Cancel any ongoing response
    if (currentResponse) {
      cancelCurrentResponse();
    }
    
    const { messages } = req.body;

    const message = messages.map((msg: any) => ({
      role: msg.isUser ? "user" : "assistant",
      content: msg.text,
      type: 'text'
    }));

    currentController = new AbortController();
    const signal = currentController.signal;
    
    try {
      console.time('socketConnection');
      const socket = await getWebSocket();
      console.timeEnd('socketConnection');

      let response = '';
      let audioBuffer: Buffer[] = [];
      let isResponseComplete = false;
      let isAudioComplete = false;
      let isTextComplete = false;
      let speechEndTimeout: NodeJS.Timeout | null = null;
      const SPEECH_END_DELAY = 1000;

      const userEvent = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: message[0].content }]
        }
      };

      console.time('socketSend');
      socket.send(JSON.stringify(userEvent));
      socket.send(JSON.stringify({ type: 'response.create' }));
      console.timeEnd('socketSend');

      console.time('aiResponseTime');
      activePromisesCount++;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      await new Promise<void>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
            ws = null;
          }
          res.write(`data: ${JSON.stringify({ cancelled: true })}\n\n`);
          res.end();
          reject(new Error('Request aborted'));
        });

        const messageHandler = async (data: WebSocket.Data) => {
          try {
            if (signal.aborted) return;
            
            const parsedData = JSON.parse(data.toString());
            
            if (parsedData.type === 'error') {
              console.error("API Error:", parsedData.error);
              reject(new Error(parsedData.error.message));
              return;
            }

            if (parsedData.type === 'conversation.item.create' && parsedData.item.role === 'assistant') {
              response += parsedData.item.content[0].text;
              currentResponse = true;
              res.write(`data: ${JSON.stringify({ response })}\n\n`);
            }

            if (parsedData.type === 'response.audio.delta') {
              const chunk = Buffer.from(parsedData.delta, 'base64');
              
              if (speechEndTimeout) {
                clearTimeout(speechEndTimeout);
              }

              audioBuffer.push(chunk);

              speechEndTimeout = setTimeout(() => {
                const completeAudio = Buffer.concat(audioBuffer);
                
                res.write(`data: ${JSON.stringify({ 
                  audioChunk: completeAudio.toString('base64'),
                  audioMimeType: determineAudioMimeType(completeAudio),
                  timestamp: Date.now(),
                  isComplete: true
                })}\n\n`);
                
                isAudioComplete = true;
                if (isTextComplete) {
                  finishResponse();
                }
              }, SPEECH_END_DELAY);
            }

            if (parsedData.type === 'response.done') {
              console.timeEnd('aiResponseTime');
              isTextComplete = true;
              
              if (isAudioComplete) {
                finishResponse();
              }
            }

          } catch (error) {
            console.error('Error processing message:', error);
            reject(error);
          }
        };

        const finishResponse = async () => {
          if (speechEndTimeout) {
            clearTimeout(speechEndTimeout);
          }
          
          if (!signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            res.write(`data: ${JSON.stringify({ 
              audioComplete: true
            })}\n\n`);
            
            console.timeEnd('totalApiTime');
            isResponseComplete = true;
            audioBuffer = [];
            currentController = null;
            resetState();
          }
          resolve();
        };

        socket.on('message', messageHandler);
      }).catch(error => {
        if (error.message === 'Request aborted') {
          // Handled in abort listener
          return;
        }
        throw error;
      });

      if (isResponseComplete) {
        res.end();
      }

    } catch (error) {
      console.error("Error in API handler:", error);
      res.status(500).json({ error: 'An error occurred while processing the request' });
    }
    activePromisesCount--;
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

function determineAudioMimeType(buffer: Buffer): string {
  const header = buffer.slice(0, 4).toString('hex');
  if (header.startsWith('fff3') || header.startsWith('fff2')) return 'audio/mpeg';
  if (header.startsWith('5249')) return 'audio/wav';
  if (header.startsWith('4f676753')) return 'audio/ogg';
  if (header.startsWith('664c6143')) return 'audio/flac';
  return 'audio/mp3';
}