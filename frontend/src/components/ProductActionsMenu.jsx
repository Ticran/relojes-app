import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ProductActionsMenu({ product, onEdit, onMovement, onDelete }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const items = [
    { label: 'Editar', action: onEdit, danger: false },
    { label: 'Registrar movimiento', action: onMovement, danger: false },
    { label: 'Eliminar', action: onDelete, danger: true },
  ];

  useEffect(() => {
    setOpen(false);
  }, [product?.id]);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    const menuWidth = menu?.offsetWidth || 200;
    const menuHeight = menu?.offsetHeight || 140;
    const gap = 4;
    const viewportPadding = 8;

    let top = triggerRect.bottom + gap;
    if (top + menuHeight + viewportPadding > window.innerHeight && triggerRect.top - menuHeight - gap >= viewportPadding) {
      top = triggerRect.top - menuHeight - gap;
    }
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - menuHeight - viewportPadding));

    let left = triggerRect.right - menuWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const handleUpdate = () => updatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (menuRef.current && menuRef.current.contains(event.target)) return;
      if (triggerRef.current && triggerRef.current.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => itemRefs.current[0]?.focus());
    }
  }, [open]);

  function handleTriggerKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(event, index) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      itemRefs.current[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      itemRefs.current[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(index);
    }
  }

  function select(index) {
    const item = items[index];
    setOpen(false);
    triggerRef.current?.focus();
    if (item?.action) item.action(product);
  }

  return (
    <div className="product-actions" ref={containerRef}>
      <button
        type="button"
        className="product-actions__trigger"
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Acciones"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        ⋮
      </button>
      {open && createPortal(
        <ul
          className="product-actions__menu"
          role="menu"
          ref={menuRef}
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {items.map((item, index) => (
            <li key={item.label} role="none">
              {index === items.length - 1 && (
                <div className="product-actions__divider" role="separator" />
              )}
              <button
                type="button"
                role="menuitem"
                className={`product-actions__item${item.danger ? ' product-actions__item--danger' : ''}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => select(index)}
                onKeyDown={(event) => handleMenuKeyDown(event, index)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
