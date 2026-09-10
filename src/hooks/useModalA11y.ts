import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

// Open-dialog stack: only the topmost dialog reacts to Escape, so stacked
// dialogs (e.g. the mission debrief over a game modal) close one at a time.
const openDialogStack: number[] = [];
let nextDialogId = 1;

interface UseModalA11yOptions {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Shared accessibility behavior for every modal in the app:
 * - dialog semantics: spread `dialogProps` onto the modal card element
 * - Escape closes only the topmost open dialog
 * - Tab / Shift+Tab focus is trapped inside the dialog
 * - focus moves into the dialog on open and restores to the opener on close
 *
 * Call this before any early `if (!isOpen) return null` render guard.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose
}: UseModalA11yOptions) {
  const containerRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const dialogId = nextDialogId++;
    openDialogStack.push(dialogId);

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move focus into the dialog once it has rendered
    const focusRaf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      if (container.contains(document.activeElement)) return;
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) focusables[0].focus();
    });

    const isTopmost = () => openDialogStack[openDialogStack.length - 1] === dialogId;

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === 'Escape' && isTopmost()) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(el => el.offsetParent !== null || el === document.activeElement);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (!container.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(focusRaf);
      window.removeEventListener('keydown', handleKeyDown, true);
      const idx = openDialogStack.indexOf(dialogId);
      if (idx >= 0) openDialogStack.splice(idx, 1);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  // Spread onto the modal card element for dialog semantics
  const dialogProps = {
    role: 'dialog' as const,
    'aria-modal': true as const,
    tabIndex: -1 as const
  };

  return { containerRef, dialogProps };
}
