import { useState, useEffect, useContext } from "react";
import "./App.css";
import Sidebar, { SECTIONS } from "./components/Sidebar.jsx";
import Summary from "./components/Summary.jsx";
import Products from "./components/Products.jsx";
import Movements from "./components/Movements.jsx";
import Login from "./components/Login.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import useProducts from "./hooks/useProducts.js";
import { ToastProvider, ToastContext } from "./context/ToastContext.jsx";
import {
  login as doLogin,
  logout as doLogout,
  getCurrentUser,
} from "./services/auth.js";

const SECTION_INFO = {
  resumen: {
    title: "Resumen",
    description: "Estado general del negocio según el inventario actual.",
  },
  productos: {
    title: "Productos",
    description: "Administración del catálogo de relojes y accesorios.",
  },
  movimientos: {
    title: "Movimientos",
    description: "Historial de entradas y salidas de stock.",
  },
  pedidos: {
    title: "Pedidos",
    description: "Seguimiento de los pedidos recibidos.",
  },
  ventas: {
    title: "Ventas",
    description: "Resumen de las ventas realizadas.",
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [active, setActive] = useState("resumen");
  const [menuOpen, setMenuOpen] = useState(false);
  // Única fuente de verdad del inventario, compartida por Resumen y Productos.
  const {
    items,
    movements,
    hydrated,
    productsWarning,
    movementsWarning,
    addProduct,
    updateProduct,
    removeProduct,
    adjustStock,
  } = useProducts(user?.id);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(username, password) {
    const u = await doLogin(username, password);
    setUser(u);
    return u;
  }

  async function handleLogout() {
    try {
      await doLogout();
    } finally {
      setUser(null);
    }
  }

  if (authLoading) {
    return (
      <div className="login">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const current = SECTION_INFO[active];
  const currentLabel =
    SECTIONS.find((s) => s.id === active)?.label ?? current.title;

  function handleSelect(id) {
    setActive(id);
    setMenuOpen(false);
  }

  function ToastHost() {
    const { toasts, dismiss } = useContext(ToastContext);
    return <ToastContainer toasts={toasts} dismiss={dismiss} />;
  }

  return (
    <ToastProvider>
      <div className={menuOpen ? "layout layout--menu-open" : "layout"}>
        <div
          className="layout__overlay"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
        <Sidebar
          active={active}
          onSelect={handleSelect}
          onClose={() => setMenuOpen(false)}
          user={user}
          onLogout={handleLogout}
        />

        <div className="layout__main">
          {active !== "resumen" && (
            <header className="topbar">
              <button
                type="button"
                className="topbar__menu-btn"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menú"
                aria-expanded={menuOpen}
              >
                ☰
              </button>
              <div>
                <h1 className="topbar__title">{current.title}</h1>
                <p className="topbar__subtitle">{current.description}</p>
              </div>
            </header>
          )}

          <main className="content">
            {active === "resumen" ? (
              <Summary
                items={items}
                movements={movements}
                user={user}
                hydrated={hydrated}
                productsWarning={productsWarning}
                movementsWarning={movementsWarning}
                onCreate={addProduct}
                onAdjustStock={adjustStock}
                menuOpen={menuOpen}
                onOpenMenu={() => setMenuOpen(true)}
                onShowAllMovements={() => handleSelect("movimientos")}
              />
            ) : active === "productos" ? (
              <Products
                items={items}
                movements={movements}
                productsWarning={productsWarning}
                onCreate={addProduct}
                onUpdate={updateProduct}
                onDelete={removeProduct}
                onAdjustStock={adjustStock}
              />
            ) : active === "movimientos" ? (
              <Movements
                movements={movements}
                items={items}
                movementsWarning={movementsWarning}
              />
            ) : (
              <section
                aria-labelledby="section-title"
                className="card card--placeholder"
              >
                <h2 id="section-title">{currentLabel}</h2>
                <p>Sección en construcción. Próximamente disponible.</p>
              </section>
            )}
          </main>
        </div>
      </div>
      <ToastHost />
    </ToastProvider>
  );
}

export default App;
