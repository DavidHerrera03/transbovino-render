import { COLORS } from "../constants/theme";

function NavbarTransportador({ usuario, salir }) {
  return (
    <div style={styles.nav}>
      <div style={styles.title}>Panel Transportador</div>
      <div style={styles.right}>
        <span>{usuario?.nombre} {usuario?.apellido}</span>
        <button onClick={salir} style={styles.button}>Cerrar sesión</button>
      </div>
    </div>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    background: "#fff",
    borderBottom: "1px solid #E5E7EB",
    boxSizing: "border-box",
  },
  title: {
    color: COLORS.transportador.primary,
    fontWeight: 600,
  },
  right: { display: "flex", gap: "12px", alignItems: "center" },
  button: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    background: COLORS.transportador.primary,
    color: "#fff",
    fontWeight: 600,
  },
};

export default NavbarTransportador;
