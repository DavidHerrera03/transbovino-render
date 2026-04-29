import CampesinoLayout from "../CampesinoLayout";
import SolicitudWizard from "../../../components/SolicitudWizard";

function CrearSolicitud({ usuario, salir, setVistaInterna, vistaInterna }) {
  return (
    <CampesinoLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaInterna={vistaInterna}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>Crear solicitud</h1>
          <button style={styles.back} onClick={() => setVistaInterna("misSolicitudes")}>Volver</button>
        </div>

        <SolicitudWizard usuario={usuario} setVistaInterna={setVistaInterna} onSuccess={() => setVistaInterna("misSolicitudes")} />
      </div>
    </CampesinoLayout>
  );
}

const styles = {
  wrapper: { padding: "28px 24px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" },
  title: { fontSize: "20px", fontWeight: 700, margin: 0, color: "#0f172a" },
  back: { padding: "10px 16px", borderRadius: "10px", border: "1px solid #d0d5dd", background: "#fff", cursor: "pointer", fontWeight: 600 },
};

export default CrearSolicitud;
