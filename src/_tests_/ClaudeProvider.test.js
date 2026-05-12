const ClaudeProvider = require('../llm/providers/ClaudeProvider');

describe('ClaudeProvider', () => {
  test('returns prompt in stub mode', async () => {
    const provider = new ClaudeProvider(null);

    const result = await provider.complete('hello');

    expect(result.prompt).toBe('hello');
    expect(result.note).toContain('stub');
  });

  test('uses injected fetch in live mode', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ text: 'ok' }] })
    }));
    const provider = new ClaudeProvider('key', {
      live: true,
      fetch: fetchImpl,
      endpoint: 'https://example.test/messages'
    });

    const result = await provider.complete('prompt');

    expect(fetchImpl).toHaveBeenCalledWith('https://example.test/messages', expect.objectContaining({
      method: 'POST'
    }));
    expect(result.content[0].text).toBe('ok');
  });
});
