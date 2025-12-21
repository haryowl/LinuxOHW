import { useEffect } from 'react';

const useAriaHiddenFix = () => {
  useEffect(() => {
    const rootElement = document.getElementById('root');
    
    const fixAriaHidden = () => {
      if (rootElement && rootElement.getAttribute('aria-hidden') === 'true') {
        rootElement.removeAttribute('aria-hidden');
      }
    };

    // Fix immediately
    fixAriaHidden();

    // Set up a mutation observer to watch for aria-hidden changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          fixAriaHidden();
        }
      });
    });

    // Start observing
    if (rootElement) {
      observer.observe(rootElement, {
        attributes: true,
        attributeFilter: ['aria-hidden']
      });
    }

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);
};

export default useAriaHiddenFix; 