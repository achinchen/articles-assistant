import type { WidgetConfig } from './types';
import { useEffect } from 'react';
import FloatingButton from './FloatingButton';
import { useWidget } from './hooks/useWidget';
import { ARTICLES_ASSISTANT_EVENTS } from '@/constants';

interface WidgetProps extends WidgetConfig {}

export default function Widget({
  apiUrl,
  primaryColor = '#0066FF',
  position = 'right',
  greeting = 'Hi! How can I help you?',
}: WidgetProps) {
  const { isOpen, toggle, close } = useWidget();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, close]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
  }, [primaryColor]);

  const onToggle = () => {
    if (isOpen) {
      document.dispatchEvent(new CustomEvent(ARTICLES_ASSISTANT_EVENTS.CLOSE_IFRAME));
      close();
    } else {
      document.dispatchEvent(new CustomEvent(ARTICLES_ASSISTANT_EVENTS.OPEN_IFRAME, {
        detail: { apiUrl, greeting }
      }));
      toggle();
    }
  };

  return (
    <div 
      className={`fixed z-50 ${
        position === 'right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
      }`}
      style={{ '--primary': primaryColor } as React.CSSProperties}
    >
      <FloatingButton
        isOpen={isOpen}
        onClick={onToggle}
      />
    </div>
  );
}