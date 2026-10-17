const SECTIONS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Productos' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'ventas', label: 'Ventas' },
];

function Sidebar({ active, onSelect, onClose }) {
  return (
    <aside className="sidebar" aria-label="Navegación del panel">
      <div className="sidebar__brand">
        <svg
          className="sidebar__logo"
          viewBox="0 0 32 32"
          role="img"
          aria-label="Relojes App"
        >
          <circle cx="16" cy="16" r="13" fill="none" stroke="#B49A64" strokeWidth="2" />
          <circle cx="16" cy="16" r="1.6" fill="#B49A64" />
          <line x1="16" y1="16" x2="16" y2="8.5" stroke="#F7F5F0" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="16" x2="21" y2="18.5" stroke="#F7F5F0" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="4" x2="16" y2="6.5" stroke="#B49A64" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="16" y1="25.5" x2="16" y2="28" stroke="#B49A64" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="4" y1="16" x2="6.5" y2="16" stroke="#B49A64" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="25.5" y1="16" x2="28" y2="16" stroke="#B49A64" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="sidebar__name">Relojes App</span>
        <button
          type="button"
          className="sidebar__close"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <p className="sidebar__caption">Panel administrativo</p>

      <nav aria-label="Secciones">
        <ul className="sidebar__nav">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                className={
                  active === section.id
                    ? 'sidebar__link sidebar__link--active'
                    : 'sidebar__link'
                }
                aria-current={active === section.id ? 'page' : undefined}
                onClick={() => onSelect(section.id)}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
export { SECTIONS };
