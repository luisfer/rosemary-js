declare class ClaudeProvider {
  constructor(apiKey?: string | null, options?: {
    model?: string;
    fetch?: (...args: unknown[]) => Promise<{ ok: boolean; status: number; statusText: string; text(): Promise<string>; json(): Promise<object> }>;
    endpoint?: string;
    maxTokens?: number;
    live?: boolean;
  });
  complete(prompt: string): Promise<object>;
}

export = ClaudeProvider;
