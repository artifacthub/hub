import { resolve } from 'node:path';
import { MessageChannel } from 'node:worker_threads';

import { waitFor } from '@testing-library/dom';
import { build } from 'vite';
import { vi } from 'vitest';

import packageSummary from './api/__fixtures__/index/1.json';
import searchResults from './layout/__fixtures__/Group/2.json';

describe('Widget entry point', () => {
  it('renders standalone and grouped widgets with shadow styles from the browser bundle', async () => {
    const result = await build({
      root: resolve(import.meta.dirname, '..'),
      configFile: resolve(import.meta.dirname, '../vite.config.ts'),
      configLoader: 'runner',
      logLevel: 'silent',
      build: {
        minify: false,
        sourcemap: false,
        write: false,
        rolldownOptions: {
          output: {
            format: 'iife',
          },
        },
      },
    });

    if (Array.isArray(result) || !('output' in result)) {
      throw new Error('Expected a single widget build output');
    }
    const entry = result.output.find((output) => output.type === 'chunk' && output.isEntry);
    if (!entry || entry.type !== 'chunk') {
      throw new Error('Expected a widget entry bundle');
    }

    const iframe = document.createElement('iframe');
    const messageChannels: MessageChannel[] = [];
    document.body.appendChild(iframe);

    try {
      const frameDocument = iframe.contentDocument!;
      const consoleError = vi.fn();
      const consoleWarn = vi.fn();
      const runtimeError = vi.fn();
      Object.assign(iframe.contentWindow!, {
        MessageChannel: class extends MessageChannel {
          constructor() {
            super();
            messageChannels.push(this);
          }
        },
        TextEncoder,
        console: { ...console, error: consoleError, warn: consoleWarn },
        fetch: vi.fn(async (url: string) => {
          return new Response(JSON.stringify(url.includes('/search?') ? searchResults : packageSummary), {
            headers: { 'Content-Type': 'application/json' },
          });
        }),
      });
      iframe.contentWindow!.addEventListener('error', runtimeError);
      frameDocument.body.innerHTML = `
        <div class="artifacthub-widget"
          data-url="https://artifacthub.io/packages/helm/artifact-hub/artifact-hub"></div>
        <div class="artifacthub-widget-group"
          data-url="https://artifacthub.io/packages/search"></div>
      `;

      const script = frameDocument.createElement('script');
      script.textContent = entry.code;
      frameDocument.body.appendChild(script);

      await waitFor(
        () => {
          expect(runtimeError).not.toHaveBeenCalled();
          expect(consoleError).not.toHaveBeenCalled();
          expect(consoleWarn).not.toHaveBeenCalled();
          for (const selector of ['.artifacthub-widget', '.artifacthub-widget-group']) {
            const shadowRoot = frameDocument.querySelector(`${selector} > section`)?.shadowRoot;
            const packageLink = shadowRoot?.querySelector('a');
            expect(shadowRoot?.querySelector('[data-testid="cardWrapper"]')).toBeInTheDocument();
            expect(shadowRoot?.querySelector('style[data-styled]')).toBeInTheDocument();
            expect(packageLink).toHaveAttribute(
              'href',
              'https://artifacthub.io/packages/helm/artifact-hub/artifact-hub'
            );
            expect(packageLink).toHaveTextContent(packageSummary.name);
          }
        },
        { container: frameDocument.body }
      );
    } finally {
      for (const channel of messageChannels) {
        channel.port1.close();
        channel.port2.close();
      }
      iframe.remove();
    }
  });
});
