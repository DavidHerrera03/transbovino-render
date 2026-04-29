import { COLORS } from "../constants/theme";

function NavbarCampesino({ usuario, salir }) {
  return (
    <div style={styles.nav}>
      <div style={styles.title}>Panel Campesino</div>
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
    color: COLORS.campesino.primary,
    fontWeight: 600,
  },
  right: { display: "flex", gap: "12px", alignItems: "center" },
  button: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    background: COLORS.campesino.primary,
    color: "#fff",
    fontWeight: 600,
  },
};

export default NavbarCampesino;
