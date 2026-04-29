import SidebarAdmin from "../../components/SidebarAdmin";
import NavbarAdmin from "../../components/NavbarAdmin";

function AdminLayout({ children, usuario, salir, setVistaInterna, vistaActiva }) {
  return (
    <div style={styles.container}>
      <SidebarAdmin setVistaInterna={setVistaInterna} vistaActiva={vistaActiva} />
      <div style={styles.main}>
        <NavbarAdmin usuario={usuario} salir={salir} />
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", width: "100%" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  content: { flex: 1, padding: "24px", background: "#F5F7F8", width: "100%", boxSizing: "border-box" },
};

export default AdminLayout;
