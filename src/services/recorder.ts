// Live Stream Recorder supporting direct chunk fetch & MediaRecorder
export class RadioStreamRecorder {
  private abortController: AbortController | null = null;
  private audioChunks: Uint8Array[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private timerInterval: number | null = null;
  private onTimeUpdate?: (seconds: number) => void;
  private contentType: string = 'audio/mpeg';

  /**
   * Fetch candidates for a stream URL, in priority order.
   *
   * In development, the local Vite dev server provides `/stream-proxy`.
   * In production, we first attempt the direct stream URL (many stations send permissive
   * CORS headers). If configured, custom proxy URL `import.meta.env.VITE_STREAM_PROXY_URL`
   * is queried, followed by `/stream-proxy` if hosted behind a proxy container.
   */
  private buildFetchCandidates(streamUrl: string): string[] {
    const encoded = encodeURIComponent(streamUrl);
    const localProxyUrl = `/stream-proxy?url=${encoded}`;
    const customProxyBase = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STREAM_PROXY_URL;
    const customProxyUrl = customProxyBase ? `${customProxyBase}${customProxyBase.includes('?') ? '&' : '?'}url=${encoded}` : null;
    const isDev = Boolean(typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV);

    if (isDev) {
      return customProxyUrl ? [localProxyUrl, customProxyUrl, streamUrl] : [localProxyUrl, streamUrl];
    }

    const candidates = [streamUrl];
    if (customProxyUrl) candidates.push(customProxyUrl);
    candidates.push(localProxyUrl);
    return candidates;
  }

  public async startRecording(
    streamUrl: string,
    onTimeUpdate?: (seconds: number) => void,
    onError?: (reason: string) => void
  ): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      onError?.('You are offline — reconnect to the internet before recording.');
      return false;
    }

    // Try each candidate transport until one starts streaming chunks
    for (const candidateUrl of this.buildFetchCandidates(streamUrl)) {
      const started = await this.tryStartRecording(candidateUrl, onTimeUpdate);
      if (started) return true;
    }

    const isDev = Boolean(typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV);
    onError?.(
      isDev
        ? 'Recording failed — stream connection was refused or audio format is unsupported. Try another station.'
        : 'Recording unavailable for this stream — the station blocks direct CORS capture outside a configured stream proxy. Try another station.'
    );
    return false;
  }

  private async tryStartRecording(
    fetchUrl: string,
    onTimeUpdate?: (seconds: number) => void
  ): Promise<boolean> {
    try {
      this.onTimeUpdate = onTimeUpdate;
      this.audioChunks = [];
      this.abortController = new AbortController();

      // Fetch the audio stream (directly, or via the dev-server proxy)
      const response = await fetch(fetchUrl, {
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
      this.cleanupFailedStart();
      return false;
    }
  }

  /** Abort a half-open attempt so the next candidate starts cleanly. */
  private cleanupFailedStart() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRecording = false;
    this.audioChunks = [];
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

