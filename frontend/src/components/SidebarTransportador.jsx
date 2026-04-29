import { useEffect, useMemo, useState } from "react";
import logo from "../assets/transbovino-logo.png";
import dashboardIcon from "../assets/icons/Dashboard.png";
import solicitudesIcon from "../assets/icons/Solicitudes.png";
import viajesIcon from "../assets/icons/Viajes.png";
import vehiculosIcon from "../assets/icons/Vehiculos.png";
import perfilIcon from "../assets/icons/Perfil.png";
import { COLORS } from "../constants/theme";

const items = [
  { key: "dashboard", label: "Dashboard", icon: dashboardIcon },
  { key: "solicitudes", label: "Solicitudes", icon: solicitudesIcon },
  { key: "misViajes", label: "Mis viajes", icon: viajesIcon },
  {
    key: "vehiculos",
    label: "Vehículos",
    icon: vehiculosIcon,
    children: [
      { key: "misVehiculos", label: "Mis vehículos" },
      { key: "agregarVehiculo", label: "Agregar vehículo" },
    ],
  },
  { key: "perfil", label: "Perfil", icon: perfilIcon },
];

const parentByChild = {
  misVehiculos: "vehiculos",
  agregarVehiculo: "vehiculos",
  vehiculos: "vehiculos",
  perfil: "perfil",
  editarPerfil: "perfil",
  solicitudes: "solicitudes",
  misViajes: "misViajes",
  dashboard: "dashboard",
};

function SidebarTransportador({ setVistaInterna, vistaInterna = "dashboard" }) {
  const vistaPadreActiva = useMemo(
    () => parentByChild[vistaInterna] || vistaInterna || "dashboard",
    [vistaInterna]
  );

  const [expanded, setExpanded] = useState(vistaPadreActiva === "vehiculos" ? "vehiculos" : null);

  useEffect(() => {
    if (vistaPadreActiva === "vehiculos") {
      setExpanded("vehiculos");
    }
  }, [vistaPadreActiva]);

  const handleItemClick = (item) => {
    if (!item.children) {
      setExpanded(null);
      setVistaInterna(item.key);
      return;
    }

    const isExpanded = expanded === item.key;
    setExpanded(isExpanded ? null : item.key);
    const destino = isExpanded ? item.key : item.children[0].key;
    setVistaInterna(destino);
  };

  return (
    <div style={styles.sidebar}>
      <div style={styles.brandBlock}>
        <div style={styles.brandRow}>
          <img src={logo} alt="Logo TransBovino" style={styles.logoImage} />
          <div style={styles.brandText}>
            <h2 style={styles.logo}>TransBovino</h2>
            <p style={styles.subtitle}>Transportador</p>
          </div>
        </div>
      </div>

      <div style={styles.menu}>
        {items.map((item) => {
          const isParentActive = vistaPadreActiva === item.key;
          const isExpanded = expanded === item.key;

          return (
            <div key={item.key} style={styles.itemGroup}>
              <button
                type="button"
                style={{
                  ...styles.item,
                  ...(isParentActive ? styles.itemActive : {}),
                }}
                onClick={() => handleItemClick(item)}
              >
                <div style={styles.itemContent}>
                  <img src={item.icon} alt="" style={{ ...styles.itemIcon, ...(isParentActive ? styles.itemIconActive : {}) }} />
                  <span>{item.label}</span>
                </div>
                {item.children ? <span style={styles.chevron}>{isExpanded ? "−" : "+"}</span> : null}
              </button>

              {item.children && isExpanded ? (
                <div style={styles.submenu}>
                  {item.children.map((child) => {
                    const activo = vistaInterna === child.key;
                    return (
                      <button
                        type="button"
                        key={child.key}
                        style={{
                          ...styles.subitem,
                          ...(activo ? styles.subitemActive : {}),
                        }}
                        onClick={() => setVistaInterna(child.key)}
                      >
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "320px",
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${COLORS.transportador.primaryDark} 0%, ${COLORS.transportador.primary} 100%)`,
    color: "white",
    padding: "28px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    boxSizing: "border-box",
    boxShadow: "8px 0 24px rgba(0,0,0,0.08)",
  },
  brandBlock: { padding: "2px 8px 8px" },
  brandRow: { display: "flex", alignItems: "center", gap: "10px" },
  logoImage: { width: "56px", height: "56px", objectFit: "contain", flexShrink: 0 },
  brandText: { minWidth: 0 },
  logo: { margin: "0 0 6px 0", color: "#fff", fontSize: "1.75rem", lineHeight: 1 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontSize: "14px", margin: 0 },
  menu: { display: "flex", flexDirection: "column", gap: "12px" },
  itemGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  item: {
    background: "rgba(255,255,255,0.06)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "14px",
    padding: "15px 14px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 500,
    transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  itemContent: { display: "flex", alignItems: "center", gap: "12px" },
  itemActive: {
    background: COLORS.transportador.primarySoft,
    borderColor: "rgba(255,255,255,0.55)",
    transform: "translateX(2px)",
  },
  itemIcon: { width: "20px", height: "20px", objectFit: "contain", flexShrink: 0, filter: "brightness(0)" },
  itemIconActive: { filter: "brightness(0) invert(1)" },
  chevron: { fontSize: "22px", lineHeight: 1,
    whiteSpace: "nowrap", fontWeight: 300 },
  submenu: { display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "18px" },
  subitem: {
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    padding: "12px 14px 12px 18px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  },
  subitemActive: {
    background: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.45)",
    color: "#fff",
  },
};

export default SidebarTransportador;
