import type { WidgetConfig, SDKOptions } from './components/types';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Widget from './App';
import './styles/globals.css';
import { FRAME_ID } from './constants';

declare global {
  interface Window {
    ArticlesAssistantSDK?: {
      init: (options: SDKOptions) => void;
      destroy: () => void;
    };
  }
}

class ArticlesAssistantSDK {
  private frame: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private iframeRoot: ReactDOM.Root | null = null;

  init(options: SDKOptions) {
    const { config, container } = options;
    
    if (!config.apiUrl) {
      console.error('ArticlesAssistant: apiUrl is required');
      return;
    }

    this.destroy();
    this.create(config, container);
  }

  private create(config: WidgetConfig, container?: string) {
    this.createFrame(container);
    this.createIframe(config);
  }

  private createFrame(container?: string) {
    if (this.frame) return;
    this.frame = document.createElement('div');
    this.frame.id = FRAME_ID;

    let target: HTMLElement;
    if (container) {
      target = document.querySelector(container) as HTMLElement;
      if (!target) {
        return console.error(`ArticlesAssistant: Container element "${container}" not found`);
      }
    } else {
      target = document.body;
    }
    
    target.appendChild(this.frame);
  }

  private createIframe(config: WidgetConfig) {
    if (this.iframe || !this.frame) return;

    this.addResponsiveStyles();
    
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'articles-assistant-chat-iframe';
    this.iframe.className = 'articles-assistant-iframe';

    this.frame.appendChild(this.iframe);

    this.iframe.onload = () => {
      const iframeDoc = this.iframe!.contentDocument || this.iframe!.contentWindow?.document;
      if (!iframeDoc) return;

      const parentStyles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');

      iframeDoc.documentElement.innerHTML = `
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Articles Assistant Chat</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { height: 100%; font-family: system-ui, -apple-system, sans-serif; }
            #root { height: 100%; }
            ${parentStyles}
          </style>
        </head>
        <body>
          <div id="root"></div>
        </body>
      `;

    };

    this.iframe.src = 'about:blank';    
    this.iframeRoot = ReactDOM.createRoot(this.frame);
    
    this.iframeRoot.render(
      React.createElement(React.StrictMode, null,
        React.createElement(Widget, {
          apiUrl: config.apiUrl,
          primaryColor: config.primaryColor,
          position: config.position,
          greeting: config.greeting,
          target: config.target,
          locale: config.locale,
        })
      )
    );
  }

  private addResponsiveStyles() {
    if (document.getElementById('articles-assistant-styles')) return;

    const style = document.createElement('style');
    style.id = 'articles-assistant-styles';
    style.textContent = `
      .articles-assistant-iframe {
        position: fixed;
        border: none;
        z-index: 9998;
        transition: all 0.3s ease-out;
      }

      /* Desktop styles */
      @media (min-width: 769px) {
        .articles-assistant-iframe {
          bottom: 100px;
          right: 24px;
          width: 400px;
          height: 600px;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      }

      /* Mobile styles - full screen */
      @media (max-width: 768px) {
        .articles-assistant-iframe {
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          border-radius: 0;
          box-shadow: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
  private destroyIframe() {
    if (this.iframeRoot) {
      this.iframeRoot.unmount();
      this.iframeRoot = null;
    }

    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
  }

  destroy() {
    this.destroyIframe();

    if (this.iframeRoot && this.iframe) {
      this.iframeRoot.unmount();
      this.iframeRoot = null;
    }

    if (this.iframe && this.iframe.id === FRAME_ID) {
      this.iframe.remove();
      this.iframe = null;
    }

    const styleElement = document.getElementById('articles-assistant-styles');
    if (styleElement) styleElement.remove();
  }
}

const sdk = new ArticlesAssistantSDK();

window.ArticlesAssistantSDK = {
  init: (options: SDKOptions) => sdk.init(options),
  destroy: () => sdk.destroy(),
};

if (window.ArticlesAssistant) {
  sdk.init({ config: window.ArticlesAssistant });
}

export default sdk;