import VidriLogo from "./VidriLogo.jsx";

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
        <VidriLogo variant="dark" size={27} />
        <span className="sidebar__name">Vidri</span>
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
