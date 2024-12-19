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

       /*  const sendMessageToWebSocket = async () => { 
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
             console.log('AISpeaking:', isAISpeaking);
              console.time('audioPlayback');
              await playAudio(data.audioData, data.audioMimeType, data.response);
              console.timeEnd('audioPlayback');
              setIsAISpeaking(false); 
              console.log('AISpeaking:', isAISpeaking);
            } else {
              console.warn('No audio data received');
              // Fallback: Use browser's built-in speech synthesis
              const utterance = new SpeechSynthesisUtterance(data.response);
             setIsAISpeaking(true);
             console.log('AISpeaking:', isAISpeaking);
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
      }; */


      /*   client.on('conversation.item.completed', ({ item }: any) => {
    console.log('Conversation item completed:', item);
    if (item.type === 'message' && item.role === 'assistant' && item.formatted && item.formatted.audio) {
      console.log('Playing audio response...');
      setIsAISpeaking(true);
      console.log('AISpeaking:', isAISpeaking);
    } else {
      console.log('No audio content in this item.');
    }
  });

  client.on('response.cancel', ({ item }: any) => {
   console.log('Response cancelled:', item);
  }); */

  /*   const client = new RealtimeClient({
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
   */