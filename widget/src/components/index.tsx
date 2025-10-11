import type { WidgetConfig } from './types';
import { Suspense, useEffect } from 'react';
import FloatingButton from './FloatingButton';
import ChatWindow from './ChatWindow';
import { useWidget } from './hooks/useWidget';

interface WidgetProps extends WidgetConfig {}

export default function Widget({
  primaryColor = '#0066FF',
  position = 'right',
  apiUrl,
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
      close();
    } else {
      toggle();
    }
  };

  return (
    <div 
      className={`fixed z-50 flex flex-col gap-6 ${
        position === 'right' ? 'bottom-6 right-6 items-end' : 'bottom-6 left-6'
      }`}
      style={{ '--primary': primaryColor } as React.CSSProperties}
    >
      <Suspense fallback={<div>Loading...</div>}>
        {
          isOpen && (
            <ChatWindow
              apiUrl={apiUrl}
              onClose={close}
            />
          )
        }
      </Suspense>
      <FloatingButton
        isOpen={isOpen}
        onClick={onToggle}
      />
    </div>
  );
}