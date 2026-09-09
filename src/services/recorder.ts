// Live Stream Recorder supporting direct chunk fetch & MediaRecorder
export class RadioStreamRecorder {
  private abortController: AbortController | null = null;
  private audioChunks: Uint8Array[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private timerInterval: number | null = null;
  private onTimeUpdate?: (seconds: number) => void;
  private contentType: string = 'audio/mpeg';

  public async startRecording(
    streamUrl: string,
    onTimeUpdate?: (seconds: number) => void
  ): Promise<boolean> {
    try {
      this.onTimeUpdate = onTimeUpdate;
      this.audioChunks = [];
      this.abortController = new AbortController();

      // Proxy url through local vite dev server to avoid browser CORS blocks
      const proxyUrl = `/stream-proxy?url=${encodeURIComponent(streamUrl)}`;

      // Fetch the audio stream directly
      const response = await fetch(proxyUrl, {
        signal: this.abortController.signal,
        headers: { Accept: '*/*' }
      });

      if (!response.ok || !response.body) {
        throw new Error(`Direct stream fetch failed with status ${response.status}`);
      }

      this.contentType = response.headers.get('content-type') || 'audio/mpeg';
      const reader = response.body.getReader();

      this.isRecording = true;
      this.startTime = Date.now();

      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = window.setInterval(() => {
        if (this.onTimeUpdate) {
          const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
          this.onTimeUpdate(elapsed);
        }
      }, 500);

      // Read stream loop in background
      (async () => {
        try {
          while (this.isRecording) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value && value.length > 0) {
              this.audioChunks.push(value);
            }
          }
        } catch {
          // Stream cancelled/stopped
        }
      })();

      return true;
    } catch (err) {
      console.warn('Stream fetch recording error:', err);
      return false;
    }
  }

  public stopRecording(stationName: string, placeName: string): Blob | null {
    if (!this.isRecording) return null;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.isRecording = false;

    // Package chunks into downloadable blob
    // Copy chunk arrays into a continuous blob
    const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const ext = this.contentType.includes('aac') || this.contentType.includes('m4a') ? 'aac' : 'mp3';
    const blob = new Blob([combined], { type: this.contentType });
    this.downloadBlob(blob, stationName, placeName, ext);

    return blob;
  }

  public downloadBlob(blob: Blob, stationName: string, placeName: string, extension = 'mp3') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const cleanStation = (stationName || 'Radio').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanPlace = (placeName || 'Live').replace(/[^a-zA-Z0-9_-]/g, '_');
    
    a.download = `${cleanStation}_${cleanPlace}_${dateStr}.${extension}`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const streamRecorder = new RadioStreamRecorder();

