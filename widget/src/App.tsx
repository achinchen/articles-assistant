import Widget from './components/Widget';
import './styles/globals.css';

import type { WidgetConfig } from './components/Widget/types';

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
    <Widget
      apiUrl={config.apiUrl}
      primaryColor={config.primaryColor}
      position={config.position}
      greeting={config.greeting}
      target={config.target}
    />
  );
}

export default App;