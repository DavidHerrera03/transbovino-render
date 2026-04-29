import { COLORS } from "../constants/theme";
function NavbarAdmin({ usuario, salir }) {
  return (
    <header style={styles.nav}>
      <div>
        <div style={styles.title}>Panel administrador</div>
        <div style={styles.sub}>Control total de campesinos, transportadores, fincas, bovinos, vehículos, solicitudes y viajes.</div>
      </div>
      <div style={styles.right}>
        <span>{usuario?.nombre} {usuario?.apellido}</span>
        <button onClick={salir} style={styles.button}>Cerrar sesión</button>
      </div>
    </header>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "18px 24px",
    background: "#fff",
    borderBottom: "1px solid #E5E7EB",
  },
  title: { fontSize: "20px", fontWeight: 700, color: COLORS.admin.primary },
  sub: { fontSize: "13px", color: "#64748B", marginTop: "4px", maxWidth: "700px" },
  right: { display: "flex", alignItems: "center", gap: "12px", fontWeight: 500 },
  button: {
    background: COLORS.admin.primary,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
};

export default NavbarAdmin;
