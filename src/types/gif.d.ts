declare module 'gif.js-upgrade' {
  export interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: string | number | null;
    dither?: boolean | string;
    debug?: boolean;
  }

  export interface FrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  export default class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      image: CanvasRenderingContext2D | HTMLCanvasElement | HTMLImageElement | ImageData,
      options?: FrameOptions
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'abort', callback: () => void): void;
    render(): void;
    abort(): void;
    running: boolean;
    options: GIFOptions;
  }
}
