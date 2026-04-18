/**
 * Claude provider stub for the optional LLM layer.
 *
 * The default `complete()` does not hit the network. Pass `options.fetch`
 * to inject a real fetch (or a mock) and `options.endpoint` to override
 * the API URL. Requires Node 18+ for the global `fetch` if you don't
 * inject one.
 */
class ClaudeProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.model = options.model || 'claude-3-5-sonnet-20240620';
    this.fetchImpl = options.fetch || (typeof fetch !== 'undefined' ? fetch : null);
    this.endpoint = options.endpoint || 'https://api.anthropic.com/v1/messages';
    this.maxTokens = options.maxTokens || 1024;
    this.live = options.live === true;
  }

  /**
   * Returns the prompt unchanged unless the provider is configured to call
   * the live API (`options.live === true` and an `apiKey` is present).
   * @param {string} prompt
   * @returns {Promise<object>}
   */
  async complete(prompt) {
    if (!this.live || !this.apiKey) {
      return {
        model: this.model,
        prompt,
        note: 'ClaudeProvider stub. Pass { live: true } and an API key to call the API.'
      };
    }
    if (!this.fetchImpl) {
      throw new Error('ClaudeProvider: no fetch implementation available. Use Node 18+ or pass options.fetch.');
    }
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ClaudeProvider: ${response.status} ${response.statusText} ${text}`);
    }
    return response.json();
  }
}

module.exports = ClaudeProvider;
