export const sendAudioMessageToWebSocket = async (
  { text, messages }: { text: string, messages: any[] },
  { setMessages, setText, playAudio, setAIVolume }: {
    setMessages: (messages: any[]) => void,
    setText: (text: string) => void,
    playAudio: (audioData: string, audioMimeType: string, response: string) => Promise<void>,
    setAIVolume: (volume: number) => void
  }
) => {
  try {
    const newMessages = [...messages, { text, isUser: true }];
    setMessages(newMessages);
    setText("");

    const response = await fetch("/api/realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    let accumulatedResponse = '';
    let currentChunk = '';
    let audioChunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      currentChunk += chunk;

      // Process complete events only
      const events = currentChunk.split('\n\n');
      currentChunk = events.pop() || ''; // Keep incomplete chunk

      for (const event of events) {
        if (!event.startsWith('data: ')) continue;
        
        try {
          const jsonStr = event.slice(6).trim();
          console.log('Processing chunk:', jsonStr.slice(0, 100) + '...'); // Debug log
          
          const jsonData = JSON.parse(jsonStr);

          if (jsonData.response) {
            accumulatedResponse = jsonData.response;
            setMessages([...newMessages, { text: accumulatedResponse, isUser: false }]);
          }

          if (jsonData.audioChunk) {
            audioChunks.push(jsonData.audioChunk);
            // Handle audio chunk
            if (jsonData.audioMimeType) {
              await playAudio(jsonData.audioChunk, jsonData.audioMimeType, accumulatedResponse);
            }
          }
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          continue;
        }
      }
    }

    if (audioChunks.length === 0) {
      const utterance = new SpeechSynthesisUtterance(accumulatedResponse);
      utterance.onend = () => setAIVolume(0);
      window.speechSynthesis.speak(utterance);
    }

  } catch (error) {
    console.error("Error in WebSocket communication:", error);
    throw error;
  }
};