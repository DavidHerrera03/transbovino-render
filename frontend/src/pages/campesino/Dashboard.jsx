import { useEffect, useMemo, useState } from "react";
import CampesinoLayout from "./CampesinoLayout";
import solicitudesIcon from "../../assets/icons/Solicitudes.png";
import viajesIcon from "../../assets/icons/Viajes.png";
import bovinoIcon from "../../assets/icons/Bovino.png";
import fincaIcon from "../../assets/icons/Finca.png";
import { obtenerBovinosPorUsuario } from "../../services/bovinoService";
import { obtenerFincasUsuario } from "../../services/fincaService";
import { getSolicitudesCampesino } from "../../services/solicitudService";

const ESTADOS_ACTIVOS = ["Negociando pago", "Buscando conductor", "Asignado", "En ruta"];

function Dashboard({ usuario, salir, setVistaInterna }) {
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [bovinos, setBovinos] = useState([]);
  const [fincas, setFincas] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.id_usuario) return;
      try {
        setLoading(true);
        const [dataSolicitudes, dataBovinos, dataFincas] = await Promise.all([
          getSolicitudesCampesino(usuario.id_usuario),
          obtenerBovinosPorUsuario(usuario.id_usuario),
          obtenerFincasUsuario(usuario.id_usuario),
        ]);
        setSolicitudes(Array.isArray(dataSolicitudes) ? dataSolicitudes : []);
        setBovinos(Array.isArray(dataBovinos) ? dataBovinos : []);
        setFincas(Array.isArray(dataFincas) ? dataFincas : []);
      } catch (error) {
        console.error("Error cargando dashboard campesino:", error);
        setSolicitudes([]);
        setBovinos([]);
        setFincas([]);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [usuario]);

  const resumen = useMemo(() => {
    const activas = solicitudes.filter((item) => ESTADOS_ACTIVOS.includes(item.estado)).length;
    const enRuta = solicitudes.filter((item) => item.estado === "En ruta").length;
    const completadas = solicitudes.filter((item) => item.estado === "Completado").length;
    return {
      activas,
      enRuta,
      completadas,
      bovinos: bovinos.length,
      fincas: fincas.length,
    };
  }, [solicitudes, bovinos, fincas]);

  const recientes = useMemo(() => solicitudes.slice(0, 5), [solicitudes]);

  const cards = [
    {
      title: "Solicitudes activas",
      value: resumen.activas,
      detail: "Ver solicitudes en gestión",
      icon: solicitudesIcon,
      onClick: () => setVistaInterna("misSolicitudes", { solicitudesEstado: "__activas__" }),
    },
    {
      title: "En ruta",
      value: resumen.enRuta,
      detail: "Ver viajes en curso",
      icon: viajesIcon,
      onClick: () => setVistaInterna("misSolicitudes", { solicitudesEstado: "En ruta" }),
    },
    {
      title: "Completadas",
      value: resumen.completadas,
      detail: "Ver solicitudes finalizadas",
      icon: solicitudesIcon,
      onClick: () => setVistaInterna("misSolicitudes", { solicitudesEstado: "Completado" }),
    },
    {
      title: "Bovinos registrados",
      value: resumen.bovinos,
      detail: "Ir a mis bovinos",
      icon: bovinoIcon,
      onClick: () => setVistaInterna("misBovinos"),
    },
    {
      title: "Fincas registradas",
      value: resumen.fincas,
      detail: "Ir a mis fincas",
      icon: fincaIcon,
      onClick: () => setVistaInterna("misFincas"),
    },
  ];

  return (
    <CampesinoLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna}>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Resumen rápido de tu operación campesina.</p>
          </div>
        </div>

        <div style={styles.cardsGrid}>
          {cards.map((card) => (
            <button key={card.title} type="button" style={styles.cardButton} onClick={card.onClick}>
              <div style={styles.cardTopRow}>
                <span style={styles.cardTitle}>{card.title}</span>
                <span style={styles.cardIconWrap}>
                  <img src={card.icon} alt="" style={styles.cardIcon} />
                </span>
              </div>
              <strong style={styles.cardValue}>{loading ? "..." : card.value}</strong>
              <small style={styles.cardHint}>{card.detail}</small>
            </button>
          ))}
        </div>

        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Solicitudes recientes</h2>
            <button type="button" style={styles.linkButton} onClick={() => setVistaInterna("misSolicitudes")}>
              Ver todas
            </button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Destino</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Transportador</th>
                </tr>
              </thead>
              <tbody>
                {recientes.length > 0 ? (
                  recientes.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>{item.codigo || `SOL-${item.id}`}</td>
                      <td style={styles.td}>{item.origen || "-"}</td>
                      <td style={styles.td}>{item.destino || "-"}</td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(item.estado)}>{item.estado || "Sin estado"}</span>
                      </td>
                      <td style={styles.td}>{item.fecha || "-"}</td>
                      <td style={styles.td}>{item.transportador_nombre || "Sin asignar"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={styles.emptyTd} colSpan="6">
                      {loading ? "Cargando información..." : "No hay solicitudes registradas todavía."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CampesinoLayout>
  );
}

const estadoColors = {
  "Buscando conductor": { background: "#eff6ff", color: "#1d4ed8" },
  Asignado: { background: "#ecfccb", color: "#365314" },
  "En ruta": { background: "#fef3c7", color: "#92400e" },
  Completado: { background: "#dcfce7", color: "#166534" },
  Cancelada: { background: "#fee2e2", color: "#991b1b" },
};

const getStatusStyle = (estado) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 12px",
  borderRadius: "999px",
  background: estadoColors[estado]?.background || "#e2e8f0",
  color: estadoColors[estado]?.color || "#334155",
  fontWeight: 700,
  fontSize: "13px",
});

const styles = {
  page: { display: "flex", flexDirection: "column", gap: "22px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { margin: "8px 0 0", color: "#64748b" },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "18px",
  },
  cardButton: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    textAlign: "left",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
  },
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" },
  cardTitle: { color: "#475569", fontSize: "15px", lineHeight: 1.35 },
  cardValue: { color: "#0f172a", fontSize: "42px", lineHeight: 1 },
  cardHint: { color: "#64748b", fontSize: "13px" },
  cardIconWrap: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    background: "#eef6f0",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardIcon: {
    width: "18px",
    height: "18px",
    objectFit: "contain",
  },
  tableCard: {
    background: "#fff",
    borderRadius: "18px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 22px 0",
    gap: "16px",
  },
  tableTitle: { margin: 0, color: "#0f172a" },
  linkButton: {
    border: "none",
    background: "transparent",
    color: "#29650B",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableWrapper: { overflowX: "auto", padding: "10px 0 0" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "780px" },
  th: {
    padding: "16px 22px",
    color: "#64748b",
    fontSize: "13px",
    textTransform: "uppercase",
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    background: "#fafafa",
  },
  td: { padding: "16px 22px", color: "#0f172a", borderBottom: "1px solid #eef2f7" },
  emptyTd: { padding: "36px 22px", textAlign: "center", color: "#64748b" },
};

export default Dashboard;
