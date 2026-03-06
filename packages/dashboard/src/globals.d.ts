/// <reference types="vite/client" />

import { Buffer as BufferType } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof BufferType;
  }
}

export {};

