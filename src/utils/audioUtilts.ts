interface AudioQueueItem {
  data: string;
  mime: string;
  text: string;
}

let currentAudio: HTMLAudioElement | null = null;
let isProcessing = false;
let audioQueue: AudioQueueItem[] = [];
let currentAudioUrl: string | null = null;

const cleanup = () => {
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
  isProcessing = false;
};

export const stopAudio = () => {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.oncanplay = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.remove();
    currentAudio = null;
  }
  cleanup();
  audioQueue = [];
};

export const handleServerEvent = (event: MessageEvent) => {
  const data = JSON.parse(event.data);
  if (data.cancelled || data.stopAudio) {
    console.log('Stopping audio playback');
    stopAudio();
  }
};

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
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.length);
  wavBuffer.set(new Uint8Array(wavHeader), 0);
  wavBuffer.set(pcmData, wavHeader.byteLength);

  return wavBuffer.buffer;
};

export const playAudio = async (audioData: string, audioMimeType: string, fallbackText: string): Promise<void> => {
  if (isProcessing) {
    audioQueue.push({ data: audioData, mime: audioMimeType, text: fallbackText });
    return;
  }

  try {
    isProcessing = true;
    stopAudio();

    const arrayBuffer = base64ToArrayBuffer(audioData);
    const bytes = new Uint8Array(arrayBuffer);
    
    let finalBuffer: ArrayBuffer;
    if (audioMimeType === 'audio/wav') {
      finalBuffer = arrayBuffer;
    } else {
      finalBuffer = createWavFromPcm(bytes);
    }

    const blob = new Blob([finalBuffer], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(blob);
    currentAudioUrl = audioUrl;
    const audio = new Audio();
    currentAudio = audio;

    await new Promise<void>((resolve, reject) => {
      audio.oncanplay = () => {
        if (!currentAudio) return;
        audio.play()
          .then(() => console.log('Playing audio chunk'))
          .catch(error => reject(error));
      };

      audio.onended = () => {
        cleanup();
        if (audioQueue.length > 0) {
          const next = audioQueue.shift();
          if (next) {
            playAudio(next.data, next.mime, next.text).catch(console.error);
          }
        }
        resolve();
      };

      audio.onerror = (error) => {
        console.error('Audio error:', error);
        cleanup();
        reject(error);
      };

      audio.src = audioUrl;
    });

  } catch (error) {
    console.error('Audio processing failed:', error);
    cleanup();
    throw error;
  }
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};