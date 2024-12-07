import Head from "next/head";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./Home.module.scss";
import MessageBubble from "../components/MessageBubble";
import LoginButton from "../components/LoginButton/LoginButton";
import { RealtimeClient } from '@openai/realtime-api-beta';

interface Message {
  text: string;
  isUser: boolean;
}

export default function Home() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiVolume, setAIVolume] = useState(0);

  const client = new RealtimeClient({
  apiKey: 'sk-4Gh5uU_zxcELEBagEP5ZnZGTUVwjkCCb_CX78dlrHoT3BlbkFJdE1mmW56hxL-ayRANfUbBQ65AHVTOgWiEN1XRTP2kA',
  dangerouslyAllowAPIKeyInBrowser: true,
});

 useEffect(() => {
  try {
    console.log('Attempting to connect...');
    client.connect();
    /* startAudioStream(); */
    console.log('Connection established successfully.');
  } catch (error) {
    console.error('Error connecting to OpenAI Realtime API:', error);
    console.log('Connection attempt failed. Retrying in 5 seconds...');
    /* setTimeout(main, 5000); */
  }
  }, [])

  const { data: session } = useSession();

  const playAudio = async (audioData: string, audioMimeType: string, fallbackText: string) => {
    try {
      console.log("Attempting to play audio, length:", audioData.length);

      // Convert base64 to ArrayBuffer
      const binaryString = atob(audioData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log("Converted to Uint8Array, length:", bytes.length);
      console.log("First 20 bytes:", bytes.slice(0, 20));
      console.log("Last 20 bytes:", bytes.slice(-20));

      // Convert PCM to WAV
      const wavBuffer = createWavFromPcm(bytes);

      // Create blob and URL
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);

      // Create audio element and play
      const audio = new Audio(audioUrl);
      
      audio.oncanplay = () => {
        console.log('Audio can be played');
        audio.play().catch(e => console.error('Error playing audio:', e));
      };

      audio.onended = () => {
        console.log('Audio playback finished');
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('Audio error:', e);
        // Fallback to speech synthesis
        const utterance = new SpeechSynthesisUtterance(fallbackText);
        window.speechSynthesis.speak(utterance);
      };

    } catch (error) {
      console.error('Error setting up audio playback:', error);
      // Fallback: Use browser's built-in speech synthesis
      const utterance = new SpeechSynthesisUtterance(fallbackText);
      window.speechSynthesis.speak(utterance);
    }
  };

  function createWavFromPcm(pcmData: Uint8Array): ArrayBuffer {
    const numChannels = 1; // Mono
    const sampleRate = 24000; // Assuming 24kHz sample rate, adjust if needed
    const bitsPerSample = 16; // Assuming 16-bit PCM, adjust if needed

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // ByteRate
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); // BlockAlign
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);

    // Combine header and PCM data
    const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.length);
    wavBuffer.set(new Uint8Array(wavHeader), 0);
    wavBuffer.set(pcmData, wavHeader.byteLength);

    return wavBuffer.buffer;
  }

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  

  client.on('conversation.item.completed', ({ item }: any) => {
    console.log('Conversation item completed:', item);
  
    if (item.type === 'message' && item.role === 'assistant' && item.formatted && item.formatted.audio) {
      console.log('Playing audio response...');
     /*  playAudio(item.formatted.audio); */
    } else {
      console.log('No audio content in this item.');
    }
  });

  const handleSendNormalMessage = async () => {
    // Add the user's message to the list
    const newMessages = [...messages, { text, isUser: true }];
    setMessages(newMessages);
    setText(""); // Clear the input field

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const stream = response.body as ReadableStream;
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let message = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value);
        message += chunk;
        setCurrentMessage(message); // Update the current message with each chunk
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, isUser: false },
      ]);
      setCurrentMessage(""); // Clear the current message

      // Scroll to the bottom of the messages
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error fetching haiku:", error);
    }
  };

  const sendMessageToWebSocket = async () => { 
    try {
      const newMessages = [...messages, { text, isUser: true }];
      setMessages(newMessages);
      setText(""); // Clear the input fiel

      console.log(newMessages);
      
      const response = await fetch("/api/realtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      console.timeEnd('apiRequest');
      console.log('API response received');

      console.time('jsonParse');
      const data = await response.json();

      console.timeEnd('jsonParse');
      console.log('Response data parsed');

      console.log("Received data:", {
        responseLength: data.response.length,
        audioDataLength: data.audioData ? data.audioData.length : 0,
        audioMimeType: data.audioMimeType
      });

      if (data.audioData && data.audioMimeType) {
        console.log("Audio data received, length:", data.audioData.length);
       setIsAISpeaking(true);
       /*   simulateAISpeaking(); */
        console.time('audioPlayback');
        await playAudio(data.audioData, data.audioMimeType, data.response);
        console.timeEnd('audioPlayback');
        setIsAISpeaking(false); 
      } else {
        console.warn('No audio data received');
        // Fallback: Use browser's built-in speech synthesis
        const utterance = new SpeechSynthesisUtterance(data.response);
       setIsAISpeaking(true);
        /*  simulateAISpeaking(); */
        utterance.onend = () => {
           setIsAISpeaking(false);
          setAIVolume(0); 
        };
        window.speechSynthesis.speak(utterance);
      }
  
      /* setMessages(messages);
      setCurrentMessage("") */
    }
    catch (error) {
    console.error("Error sending message to WebSocket:", error);
  }
};

  const handleSendMessage = () => {
    sendMessageToWebSocket();
    setText(''); // Clear the input field
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSendNormalMessage();
    }
  };

 /*  if (!session) {
    return (
      <>
        <LoginButton />
      </>
    );
  } */

  return (
    <>
      <Head>
        <title>ChatBot Demo</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.container}>
        <h1>ChatBot demo</h1>
        <div className={styles.messagesContainer}>
          {messages.map((message, index) =>
            message.isUser ? (
              <MessageBubble
                key={index}
                message={message.text}
                isUser={message.isUser}
              />
            ) : (
              <div key={index} className={styles.botMessage}>
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            )
          )}
          {currentMessage && (
            <div className={styles.botMessage}>
              <ReactMarkdown>{currentMessage}</ReactMarkdown>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter text"
        />
        <button onClick={handleSendMessage}>Send realtime</button>
        <button onClick={handleSendNormalMessage}>Send to normal</button>
      </div>
    </>
  );
}
