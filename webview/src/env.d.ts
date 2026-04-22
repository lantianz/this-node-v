/// <reference types="vite/client" />

interface VsCodeApi<State> {
  getState(): State | undefined;
  postMessage(message: unknown): void;
  setState(state: State): void;
}

declare function acquireVsCodeApi<State = unknown>(): VsCodeApi<State>;

declare global {
  interface Window {
    __THIS_NODE_V_VSCODE__?: VsCodeApi<unknown>;
  }
}

export {};
