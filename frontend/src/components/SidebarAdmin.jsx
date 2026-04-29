import logo from "../assets/transbovino-logo.png";
import dashboardIcon from "../assets/icons/Dashboard.png";
import solicitudesIcon from "../assets/icons/Solicitudes.png";
import viajesIcon from "../assets/icons/Viajes.png";
import vehiculosIcon from "../assets/icons/Vehiculos.png";
import usuariosIcon from "../assets/icons/Conductores_clientes.png";
import fincaIcon from "../assets/icons/Finca.png";
import bovinoIcon from "../assets/icons/Bovino.png";
import perfilIcon from "../assets/icons/Perfil.png";
import { COLORS } from "../constants/theme";

const items = [
  { key: "dashboard", label: "Dashboard", icon: dashboardIcon },
  { key: "solicitudes", label: "Solicitudes", icon: solicitudesIcon },
  { key: "viajes", label: "Viajes", icon: viajesIcon },
  { key: "vehiculos", label: "Vehículos", icon: vehiculosIcon },
  { key: "conductores", label: "Conductores", icon: usuariosIcon },
  { key: "clientes", label: "Clientes", icon: usuariosIcon },
  { key: "fincas", label: "Finca", icon: fincaIcon },
  { key: "bovinos", label: "Bovinos", icon: bovinoIcon },
  { key: "perfil", label: "Perfil", icon: perfilIcon },
];

function SidebarAdmin({ setVistaInterna, vistaActiva = "dashboard" }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandBlock}>
        <div style={styles.brandRow}>
          <img src={logo} alt="Logo TransBovino" style={styles.logoImage} />
          <div style={styles.brandText}>
            <h2 style={styles.logo}>TransBovino</h2>
            <p style={styles.subtitle}>Administrador</p>
          </div>
        </div>
      </div>

      <nav style={styles.menu}>
        {items.map((item) => {
          const activo = vistaActiva === item.key;
          return (
            <button
              key={item.key}
              style={{ ...styles.item, ...(activo ? styles.itemActive : {}) }}
              onClick={() => setVistaInterna(item.key)}
            >
              <img src={item.icon} alt="" style={{ ...styles.itemIcon, ...(activo ? styles.itemIconActive : {}) }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "320px",
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${COLORS.admin.primaryDark} 0%, ${COLORS.admin.primary} 100%)`,
    color: "white",
    padding: "24px 18px",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    boxShadow: "8px 0 24px rgba(0,0,0,0.12)",
  },
  brandBlock: {
    padding: "8px 8px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    marginBottom: "16px",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoImage: {
    width: "56px",
    height: "56px",
    objectFit: "contain",
  },
  brandText: { minWidth: 0 },
  logo: {
    margin: "0 0 6px 0",
    fontSize: "1.75rem",
    lineHeight: 1,
    whiteSpace: "nowrap",
    color: "#fff",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "rgba(255,255,255,0.82)",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  item: {
    padding: "16px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "#fff",
    textAlign: "left",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  itemActive: {
    background: COLORS.admin.primarySoft,
    borderColor: "rgba(255,255,255,0.4)",
  },
  itemIcon: {
    width: "20px",
    height: "20px",
    objectFit: "contain",
    flexShrink: 0,
    filter: "brightness(0)",
  },
  itemIconActive: {
    filter: "brightness(0) invert(1)",
  },
};

export default SidebarAdmin;
