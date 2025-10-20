import Widget from './components';
import './styles/globals.css';
import { LocaleProvider } from './contexts/LocaleContext';

import type { WidgetConfig } from './components/types';

declare global {
  interface Window {
    ArticlesAssistant?: WidgetConfig;
  }
}

function App() {
  const config = window.ArticlesAssistant || {
    apiUrl: import.meta.env.VITE_API_URL,
    primaryColor: '#0066FF',
    position: 'right',
    greeting: 'How can I help you?',
    target: '#root',
    locale: 'zh',
  } as WidgetConfig;

  return (
    <LocaleProvider locale={config.locale}>
      <Widget
        apiUrl={config.apiUrl}
        primaryColor={config.primaryColor}
        position={config.position}
        greeting={config.greeting}
        target={config.target}
        locale={config.locale}
      />
    </LocaleProvider>
  );
}

export default App;