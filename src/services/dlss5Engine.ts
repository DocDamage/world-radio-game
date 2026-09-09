// GPU Hardware Detection & DLSS 5 Neural Rendering Service
// Inspired by DocDamage/dlss5-launcher

export interface GpuArchitectureInfo {
  vendor: string;
  renderer: string;
  isNvidiaRtx: boolean;
  generation: string | null; // 'RTX 20 (Turing)' | 'RTX 30 (Ampere)' | 'RTX 40 (Ada Lovelace)' | 'RTX 50 (Blackwell)' | 'Universal'
  architectureSm: string | null; // 'sm_75', 'sm_86', 'sm_89', 'sm_120'
  supportsDlss5: boolean;
  supportsFrameGen: boolean;
  webGpuSupported: boolean;
}

export type DlssMode = 'off' | 'dlaa' | 'quality' | 'balanced' | 'performance' | 'ultra_performance';

export interface DlssConfig {
  enabled: boolean;
  mode: DlssMode;
  renderScale: number; // e.g. 0.67 for Quality, 0.5 for Performance, 1.0 for DLAA
  sharpness: number; // 0.0 - 1.0
  frameGen: boolean;
  frameGenMultiplier: number; // 2x, 3x, 4x
  neuralReconstruction: boolean;
  hdrUplift: boolean;
  simulatedLatencyMs: number;
}

export class Dlss5Engine {
  private gpuInfo: GpuArchitectureInfo | null = null;
  private config: DlssConfig = {
    enabled: true,
    mode: 'quality',
    renderScale: 0.67,
    sharpness: 0.75,
    frameGen: true,
    frameGenMultiplier: 2,
    neuralReconstruction: true,
    hdrUplift: true,
    simulatedLatencyMs: 0.8
  };

  public detectGpu(): GpuArchitectureInfo {
    if (this.gpuInfo) return this.gpuInfo;

    let vendor = 'Unknown';
    let renderer = 'Standard GPU';

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
          renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        }
      }
    } catch (err) {
      console.warn('WebGL GPU detection error:', err);
    }

    const rLower = renderer.toLowerCase();
    const isNvidia = rLower.includes('nvidia') || rLower.includes('geforce') || rLower.includes('rtx');
    
    let isNvidiaRtx = false;
    let generation: string | null = null;
    let architectureSm: string | null = null;
    let supportsDlss5 = false;
    let supportsFrameGen = false;

    if (isNvidia) {
      if (/\brtx\s*50\d\d\b|\b50\d\d\b|blackwell/i.test(renderer)) {
        isNvidiaRtx = true;
        generation = 'RTX 50 (Blackwell)';
        architectureSm = 'sm_120';
        supportsDlss5 = true;
        supportsFrameGen = true;
      } else if (/\brtx\s*40\d\d\b|\b40\d\d\b|ada\b/i.test(renderer)) {
        isNvidiaRtx = true;
        generation = 'RTX 40 (Ada Lovelace)';
        architectureSm = 'sm_89';
        supportsDlss5 = true;
        supportsFrameGen = true;
      } else if (/\brtx\s*30\d\d\b|\b30\d\d\b|ampere/i.test(renderer)) {
        isNvidiaRtx = true;
        generation = 'RTX 30 (Ampere)';
        architectureSm = 'sm_86';
        supportsDlss5 = true;
        supportsFrameGen = true; // Enabled via DLSS 5 universal patch
      } else if (/\brtx\s*20\d\d\b|\b20\d\d\b|turing/i.test(renderer)) {
        isNvidiaRtx = true;
        generation = 'RTX 20 (Turing)';
        architectureSm = 'sm_75';
        supportsDlss5 = true;
        supportsFrameGen = false;
      } else {
        isNvidiaRtx = true;
        generation = 'RTX Series (Ampere+)';
        architectureSm = 'sm_86';
        supportsDlss5 = true;
        supportsFrameGen = true;
      }
    } else {
      // Non-Nvidia fallback (AMD FSR / Intel XeSS / Universal Neural fallback)
      generation = 'Universal Neural Shader';
      architectureSm = 'universal';
      supportsDlss5 = true;
      supportsFrameGen = false;
    }

    const webGpuSupported = 'gpu' in navigator;

    this.gpuInfo = {
      vendor,
      renderer,
      isNvidiaRtx,
      generation,
      architectureSm,
      supportsDlss5,
      supportsFrameGen,
      webGpuSupported
    };

    return this.gpuInfo;
  }

  public getConfig(): DlssConfig {
    return this.config;
  }

  public setMode(mode: DlssMode) {
    this.config.mode = mode;
    switch (mode) {
      case 'off':
        this.config.enabled = false;
        this.config.renderScale = 1.0;
        break;
      case 'dlaa':
        this.config.enabled = true;
        this.config.renderScale = 1.0;
        this.config.sharpness = 0.5;
        break;
      case 'quality':
        this.config.enabled = true;
        this.config.renderScale = 0.67;
        this.config.sharpness = 0.7;
        break;
      case 'balanced':
        this.config.enabled = true;
        this.config.renderScale = 0.58;
        this.config.sharpness = 0.75;
        break;
      case 'performance':
        this.config.enabled = true;
        this.config.renderScale = 0.50;
        this.config.sharpness = 0.85;
        break;
      case 'ultra_performance':
        this.config.enabled = true;
        this.config.renderScale = 0.33;
        this.config.sharpness = 0.95;
        break;
    }
  }

  public setFrameGen(enabled: boolean, multiplier = 2) {
    this.config.frameGen = enabled;
    this.config.frameGenMultiplier = multiplier;
  }

  public setSharpness(sharpness: number) {
    this.config.sharpness = Math.max(0, Math.min(1, sharpness));
  }

  public setHdrUplift(enabled: boolean) {
    this.config.hdrUplift = enabled;
  }
}

export const dlss5 = new Dlss5Engine();
