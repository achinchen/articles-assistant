import React from 'react';
import ReactDOM from 'react-dom/client';
import Widget from './components/Widget';
import ChatWindow from './components/Widget/ChatWindow';
import type { WidgetConfig, SDKOptions } from './components/Widget/types';
import './styles/globals.css';
import { ARTICLES_ASSISTANT_EVENTS, ROOT_ID } from './constants';

declare global {
  interface Window {
    ArticlesAssistantSDK?: {
      init: (options: SDKOptions) => void;
      destroy: () => void;
    };
  }
}

class ArticlesAssistantSDK {
  private widgetRoot: ReactDOM.Root | null = null;
  private widgetContainer: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private iframeRoot: ReactDOM.Root | null = null;

  init(options: SDKOptions) {
    const { config, container } = options;
    
    if (!config.apiUrl) {
      console.error('ArticlesAssistant: apiUrl is required');
      return;
    }

    this.destroy();

    // Create and render the Widget component for the floating button
    this.createWidget(config, container);
    
    // Set up event listeners for iframe management
    this.setupEventListeners();
  }

  private createWidget(config: WidgetConfig, container?: HTMLElement | string) {
    let targetElement: HTMLElement;

    if (container) {
      if (typeof container === 'string') {
        const element = document.querySelector(container) as HTMLElement;
        if (!element) {
          console.error(`ArticlesAssistant: Container element "${container}" not found`);
          return;
        }
        targetElement = element;
      } else {
        targetElement = container;
      }
    } else {
      targetElement = document.createElement('div');
      targetElement.id = ROOT_ID;
      
      const node = config?.target ? document.querySelector(config?.target) as HTMLElement : document.body;
      node.appendChild(targetElement);
    }

    this.widgetContainer = targetElement;
    this.widgetRoot = ReactDOM.createRoot(targetElement);
    
    this.widgetRoot.render(
      React.createElement(React.StrictMode, null,
        React.createElement(Widget, {
          apiUrl: config.apiUrl,
          primaryColor: config.primaryColor,
          position: config.position,
          greeting: config.greeting,
          target: config.target,
        })
      )
    );
  }

  private setupEventListeners() {
    document.addEventListener(ARTICLES_ASSISTANT_EVENTS.OPEN_IFRAME, this.openIframe.bind(this) as EventListener);
    document.addEventListener(ARTICLES_ASSISTANT_EVENTS.CLOSE_IFRAME, this.closeIframe.bind(this) as EventListener);
  }

  private openIframe(event: Event) {
    const customEvent = event as CustomEvent;
    const { apiUrl, greeting } = customEvent.detail;
    this.createIframe(apiUrl, greeting);
  }

  private closeIframe() {
    this.destroyIframe();
  }

  private addResponsiveStyles() {
    // Check if styles already exist
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

  private createIframe(apiUrl: string, greeting: string) {
    if (this.iframe) return;

    this.addResponsiveStyles();

    this.iframe = document.createElement('iframe');
    this.iframe.id = 'articles-assistant-chat-iframe';
    this.iframe.className = 'articles-assistant-iframe';

    document.body.appendChild(this.iframe);

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

      requestAnimationFrame(() => {
        const rootElement = iframeDoc.getElementById('root');
        if (rootElement) {
          this.iframeRoot = ReactDOM.createRoot(rootElement);
          this.iframeRoot.render(
            React.createElement(React.StrictMode, null,
              React.createElement('div', {
                className: 'w-full h-full',
                style: { minHeight: '400px' }
              },
              React.createElement(ChatWindow, {
                apiUrl: apiUrl,
                greeting: greeting,
                onClose: () => {
                  document.dispatchEvent(new CustomEvent('articles-assistant-close-iframe'));
                },
                onNewMessage: () => {}
              })
              )
            )
          );
        }
      });
    };

    this.iframe.src = 'about:blank';
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

    if (this.widgetRoot) {
      this.widgetRoot.unmount();
      this.widgetRoot = null;
    }

    if (this.widgetContainer && this.widgetContainer.id === ROOT_ID) {
      this.widgetContainer.remove();
      this.widgetContainer = null;
    }

    const styleElement = document.getElementById('articles-assistant-styles');
    if (styleElement) styleElement.remove();

    document.removeEventListener(ARTICLES_ASSISTANT_EVENTS.OPEN_IFRAME, this.openIframe.bind(this) as EventListener);
    document.removeEventListener(ARTICLES_ASSISTANT_EVENTS.CLOSE_IFRAME, this.closeIframe.bind(this) as EventListener);
  }
}

const sdk = new ArticlesAssistantSDK();

window.ArticlesAssistantSDK = {
  init: (options: SDKOptions) => sdk.init(options),
  destroy: () => sdk.destroy(),
};

// Auto-initialize if global config exists
if (window.ArticlesAssistant) {
  sdk.init({ config: window.ArticlesAssistant });
}

export default sdk;