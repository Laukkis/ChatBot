import Head from "next/head";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./Home.module.scss";
import MessageBubble from "../components/MessageBubble";
import LoginButton from "../components/LoginButton/LoginButton";
import { RealtimeClient } from '@openai/realtime-api-beta';
import { playAudio } from "@/utils/audioUtilts";
import { Canvas } from 'react-three-fiber';
import AvatarContent from '@/components/AvatarContent/AvatarContent';

interface Message {
  text: string;
  isUser: boolean;
}

export default function Home() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiVolume, setAIVolume] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const client = new RealtimeClient({
  apiKey: 'sk-4Gh5uU_zxcELEBagEP5ZnZGTUVwjkCCb_CX78dlrHoT3BlbkFJdE1mmW56hxL-ayRANfUbBQ65AHVTOgWiEN1XRTP2kA',
  dangerouslyAllowAPIKeyInBrowser: true,
});

 useEffect(() => {
  try {
    console.log('Attempting to connect...');
    client.connect();
    console.log('Connection established successfully.');
  } catch (error) {
    console.error('Error connecting to OpenAI Realtime API:', error);
    console.log('Connection attempt failed. Retrying in 5 seconds...');
  }
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      console.log('Canvas is focused');
    };

    const handleBlur = () => {
      console.log('Canvas is not focused');
    };

    const canvasElement = canvasRef.current;

    if (canvasElement) {
      canvasElement.tabIndex = 0;
      canvasElement.addEventListener('focus', handleFocus);
      canvasElement.addEventListener('blur', handleBlur);
    }

    // Cleanup event listeners on component unmount
    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('focus', handleFocus);
        canvasElement.removeEventListener('blur', handleBlur);
      }
    };
  }, []);

  client.on('conversation.item.completed', ({ item }: any) => {
    console.log('Conversation item completed:', item);
    if (item.type === 'message' && item.role === 'assistant' && item.formatted && item.formatted.audio) {
      console.log('Playing audio response...');
    } else {
      console.log('No audio content in this item.');
    }
  });

  const handleSendNormalMessage = async () => {
    const newMessages = [...messages, { text, isUser: true }];
    setMessages(newMessages);
    setText("");

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
        setCurrentMessage(message);
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
    }
    catch (error) {
    console.error("Error sending message to WebSocket:", error);
  }
};

const sendAudioMessageToWebSocket = async ({text}: any) => { 
  try {
    const newMessages = [...messages, { text, isUser: true }];
    setMessages(newMessages);
    setText(""); // Clear the input fiel
    
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

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      console.log('Speech recognition started');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      console.log('Speech recognition result event:', event);
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript.trim();
          sendAudioMessageToWebSocket({ text: finalTranscript });
          
      
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setText(interimTranscript);
      console.log('Messages:', messages);
    };

    recognition.onerror = (event : any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
      console.log('Speech recognition ended');
    };

    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  return (
    <>
      <Head>
        <title>ChatBot Demo</title>
        <meta name="description" content="AI chatbot" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <>
       {/*  <h1>ChatBot demo</h1>
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
        /> */}
    
    <div className={styles.avatarContainer}>
      <Canvas ref={canvasRef} frameloop="always" shadows camera={{position: [0,0,8], fov:42 }}>
        <AvatarContent />
      </Canvas>
      <button onClick={handleSendMessage}>Send realtime</button>
        <button onClick={handleSendNormalMessage}>Send to normal</button>
        <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'End conversation' : 'Start Conversation'}
      </button>
    </div>
       
      </>
    </>
  );
}
