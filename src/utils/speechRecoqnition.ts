import { sendAudioMessageToWebSocket } from './sendMessageToWebsocket';

export const startRecording = (
  setIsRecording: (isRecording: boolean) => void,
  setText: (text: string) => void,
  messages: any[],
  recognitionRef: React.MutableRefObject<any>,
  setMessages: (messages: any[]) => void,
  setIsAISpeaking: (isSpeaking: boolean) => void,
  playAudio: (audioData: string, audioMimeType: string, response: string) => Promise<void>,
  setAIVolume: (volume: number) => void
) => {
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
        sendAudioMessageToWebSocket(
          { text: finalTranscript, messages },
          { setMessages, setText, /* setIsAISpeaking */ playAudio, setAIVolume }
        );
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    setText(interimTranscript);
    console.log('Messages:', messages);
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
  };

  recognition.onend = () => {
    setIsRecording(false);
    console.log('Speech recognition ended');
  };

  recognition.start();
};

export const stopRecording = (recognitionRef: React.MutableRefObject<any>) => {
  if (recognitionRef.current) {
    recognitionRef.current.stop();
    recognitionRef.current = null;
  }
};