import Head from "next/head";
import { useState, useRef, useEffect } from "react";
import styles from "./Home.module.scss";
import { RealtimeClient } from '@openai/realtime-api-beta';
import { playAudio } from "@/utils/audioUtilts";
import { Canvas } from 'react-three-fiber';
import AvatarContent from '@/components/AvatarContent/AvatarContent';
import { sendAudioMessageToWebSocket } from "@/utils/sendMessageToWebsocket";
import { startRecording, stopRecording } from "@/utils/speechRecoqnition";

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

  useEffect(() => {
    console.log('isAISpeaking state changed:', isAISpeaking);
    // Add any additional logic you want to execute when isAISpeaking changes
  }, [isAISpeaking]);

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


const handleSendMessage = async () => {
  await sendAudioMessageToWebSocket(
    { text, messages },
    { setMessages, setText,/*  setIsAISpeaking, */ playAudio, setAIVolume }
  );
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
    
    <div className={styles.avatarContainer}>
      <Canvas ref={canvasRef} frameloop="always" shadows camera={{position: [0,0,8], fov:42 }}>
        <AvatarContent isAISpeaking={isAISpeaking} setIsAISpeaking={setIsAISpeaking} speechContent={'Hello, and welcome to our presentation on the future of artificial intelligence. Today, we will explore the incredible advancements in AI technology and how they are transforming various industries. From healthcare to finance, AI is revolutionizing the way we approach problem-solving and decision-making.In healthcare, AI is being used to analyze medical images, predict patient outcomes, and even assist in surgeries. This technology is helping doctors make more accurate diagnoses and provide better care to their patients.In finance, AI algorithms are being used to detect fraudulent transactions, manage investment portfolios, and provide personalized financial advice. These advancements are making financial services more efficient and secure.Moreover, AI is also making significant strides in the field of autonomous vehicles. Self-driving cars are becoming a reality, promising to reduce traffic accidents and improve transportation efficiency. As we continue to develop and integrate AI into our daily lives, it is crucial to consider the ethical implications and ensure that these technologies are used responsibly. By doing so, we can harness the power of AI to create a better, more efficient, and safer world for everyone.Thank you for joining us today. We hope you found this presentation informative and inspiring. If you have any questions, please feel free to ask.'}/>
      </Canvas>
      <button onClick={handleSendMessage}>Send realtime</button>
        <button onClick={handleSendNormalMessage}>Send to normal</button>
        <button
        onClick={
          isRecording
            ? () => stopRecording(recognitionRef)
            : () =>
                startRecording(
                  setIsRecording,
                  setText,
                  messages,
                  recognitionRef,
                  setMessages,
                  setIsAISpeaking,
                  playAudio,
                  setAIVolume
                )
        }
      >
        {isRecording ? 'End conversation' : 'Start Conversation'}
      </button>
    </div>      
      </>
    </>
  );
}
