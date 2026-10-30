const SECTIONS = [
  { id: "resumen", label: "Resumen" },
  { id: "productos", label: "Productos" },
  { id: "movimientos", label: "Movimientos" },
  { id: "pedidos", label: "Pedidos" },
  { id: "ventas", label: "Ventas" },
];

function Sidebar({ active, onSelect, onClose, user, onLogout }) {
  return (
    <aside className="sidebar" aria-label="Navegación del panel">
      <div className="sidebar__brand">
        <svg
          className="sidebar__logo"
          viewBox="0 0 32 32"
          role="img"
          aria-label="Relojes App"
        >
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="var(--sidebar-acento)"
            strokeWidth="2"
          />
          <circle cx="16" cy="16" r="1.6" fill="var(--sidebar-acento)" />
          <line
            x1="16"
            y1="16"
            x2="16"
            y2="8.5"
            stroke="var(--sidebar-texto)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="16"
            x2="21"
            y2="18.5"
            stroke="var(--sidebar-texto)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="4"
            x2="16"
            y2="6.5"
            stroke="var(--sidebar-acento)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="25.5"
            x2="16"
            y2="28"
            stroke="var(--sidebar-acento)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="4"
            y1="16"
            x2="6.5"
            y2="16"
            stroke="var(--sidebar-acento)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="25.5"
            y1="16"
            x2="28"
            y2="16"
            stroke="var(--sidebar-acento)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
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
                    ? "sidebar__link sidebar__link--active"
                    : "sidebar__link"
                }
                aria-current={active === section.id ? "page" : undefined}
                onClick={() => onSelect(section.id)}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__divider" />
        {user && (
          <div className="sidebar__user">
            <span className="sidebar__username">{user.username}</span>
            {user.role && (
              <span className="sidebar__role">
                {user.role === "owner" ? "Propietario" : user.role}
              </span>
            )}
          </div>
        )}
        <button type="button" className="sidebar__logout" onClick={onLogout}>
          <svg
            className="sidebar__logout-icon"
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
          >
            <path d="M5 4h8v2H7v12h6v2H5z" />
            <path d="M11 11h6l-2-2 .7.7L17.7 12l-2 2L15 12.7l2-2H11z" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
export { SECTIONS };
