import Head from "next/head";
import { useSession } from "next-auth/react";
import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./Home.module.scss";
import MessageBubble from "../components/MessageBubble";
import LoginButton from "../components/LoginButton/LoginButton";

interface Message {
  text: string;
  isUser: boolean;
}

export default function Home() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession();

  const handleFetchHaiku = async () => {
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleFetchHaiku();
    }
  };

  if (!session) {
    return (
      <>
        <LoginButton />
      </>
    );
  }

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
        <button onClick={handleFetchHaiku}>Send</button>
      </div>
    </>
  );
}
