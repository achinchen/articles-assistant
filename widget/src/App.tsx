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
    apiUrl: '',
  };

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