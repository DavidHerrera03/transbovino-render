import SidebarCampesino from "../../components/SidebarCampesino";
import NavbarCampesino from "../../components/NavbarCampesino";

function CampesinoLayout({ children, usuario, salir, setVistaInterna, vistaInterna = "dashboard" }) {
  return (
    <div style={styles.container}>
      <SidebarCampesino setVistaInterna={setVistaInterna} vistaInterna={vistaInterna} />
      <div style={styles.main}>
        <NavbarCampesino usuario={usuario} salir={salir} />
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

export default CampesinoLayout;
