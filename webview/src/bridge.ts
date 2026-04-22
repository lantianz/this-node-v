import type { SidebarActionPayloadMap, SidebarActionType, SidebarState } from './types';

interface VsCodeApi<State> {
  getState(): State | undefined;
  postMessage(message: unknown): void;
  setState(state: State): void;
}

const fallbackApi: VsCodeApi<SidebarState> = {
  getState() {
    return undefined;
  },
  postMessage(message) {
    console.info('[this-node-v] sidebar action', message);
  },
  setState() {}
};

export function getVsCodeApi() {
  return (window.__THIS_NODE_V_VSCODE__ as VsCodeApi<SidebarState> | undefined) || fallbackApi;
}

export function postAction<T extends SidebarActionType>(
  type: T,
  payload?: SidebarActionPayloadMap[T]
) {
  getVsCodeApi().postMessage(payload === undefined ? { type } : { type, payload });
}
