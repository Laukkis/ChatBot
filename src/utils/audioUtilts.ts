// audioUtils.ts

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };
  
  export const createWavFromPcm = (pcmData: Uint8Array): ArrayBuffer => {
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
  };
  
  export const playAudio = async (audioData: string, audioMimeType: string, fallbackText: string) => {
    try {
      console.log("Attempting to play audio, length:", audioData.length);
  
      // Convert base64 to ArrayBuffer
      const arrayBuffer = base64ToArrayBuffer(audioData);
      const bytes = new Uint8Array(arrayBuffer);
  
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
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };