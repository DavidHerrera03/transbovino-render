import { useEffect, useMemo, useState } from "react";
import TransportadorLayout from "./TransportadorLayout";
import solicitudesIcon from "../../assets/icons/Solicitudes.png";
import viajesIcon from "../../assets/icons/Viajes.png";
import vehiculosIcon from "../../assets/icons/Vehiculos.png";
import { getMisViajesTransportador } from "../../services/transportadorService";
import { getVehiculos } from "../../services/vehiculoService";

function Dashboard({ usuario, salir, setVistaInterna, vistaInterna }) {
  const [loading, setLoading] = useState(false);
  const [viajes, setViajes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.id_usuario) return;
      try {
        setLoading(true);
        const [dataViajes, dataVehiculos] = await Promise.all([
          getMisViajesTransportador(usuario.id_usuario),
          getVehiculos(usuario.id_usuario),
        ]);
        setViajes(Array.isArray(dataViajes) ? dataViajes : []);
        setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
      } catch (error) {
        console.error("Error cargando dashboard transportador:", error);
        setViajes([]);
        setVehiculos([]);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [usuario]);

  const resumen = useMemo(() => {
    const asignados = viajes.filter((item) => item.estado === "Asignado").length;
    const enRuta = viajes.filter((item) => item.estado === "En ruta").length;
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();
    const completadosMes = viajes.filter((item) => {
      if (item.estado !== "Completado" || !item.fecha) return false;
      const fecha = new Date(`${item.fecha}T00:00:00`);
      return !Number.isNaN(fecha.getTime()) && fecha.getMonth() === mes && fecha.getFullYear() === anio;
    }).length;

    return {
      asignados,
      enRuta,
      completadosMes,
      vehiculos: vehiculos.length,
    };
  }, [viajes, vehiculos]);

  const cards = [
    {
      title: "Viajes asignados",
      value: resumen.asignados,
      detail: "Ir a viajes asignados",
      icon: solicitudesIcon,
      onClick: () => setVistaInterna("misViajes", { viajesEstado: "Asignado" }),
    },
    {
      title: "En ruta",
      value: resumen.enRuta,
      detail: "Ver viajes en curso",
      icon: viajesIcon,
      onClick: () => setVistaInterna("misViajes", { viajesEstado: "En ruta" }),
    },
    {
      title: "Completadas del mes",
      value: resumen.completadosMes,
      detail: "Ver viajes finalizados",
      icon: viajesIcon,
      onClick: () => setVistaInterna("misViajes", { viajesEstado: "Completado" }),
    },
    {
      title: "Vehículos",
      value: resumen.vehiculos,
      detail: "Ir a mis vehículos",
      icon: vehiculosIcon,
      onClick: () => setVistaInterna("misVehiculos"),
    },
  ];

  const recientes = useMemo(() => viajes.slice(0, 5), [viajes]);

  return (
    <TransportadorLayout
      usuario={usuario}
      salir={salir}
      setVistaInterna={setVistaInterna}
      vistaInterna={vistaInterna}
    >
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Resumen operativo del transportador.</p>
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
            <h2 style={styles.tableTitle}>Mis viajes recientes</h2>
            <button type="button" style={styles.linkButton} onClick={() => setVistaInterna("misViajes")}>
              Ver todos
            </button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID viaje</th>
                  <th style={styles.th}>Solicitud</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Destino</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Vehículo</th>
                </tr>
              </thead>
              <tbody>
                {recientes.length > 0 ? (
                  recientes.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>{item.id_viaje || item.id}</td>
                      <td style={styles.td}>{item.solicitud_codigo || `SOL-${item.solicitud_id}`}</td>
                      <td style={styles.td}>{item.origen || "-"}</td>
                      <td style={styles.td}>{item.destino || "-"}</td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(item.estado)}>{item.estado || "Sin estado"}</span>
                      </td>
                      <td style={styles.td}>{item.fecha || "-"}</td>
                      <td style={styles.td}>{item.vehiculo_placa || "Sin vehículo"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={styles.emptyTd} colSpan="7">
                      {loading ? "Cargando información..." : "No hay viajes registrados todavía."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TransportadorLayout>
  );
}

const estadoColors = {
  Asignado: { background: "#ecfccb", color: "#365314" },
  "En ruta": { background: "#fef3c7", color: "#92400e" },
  Completado: { background: "#dcfce7", color: "#166534" },
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
    background: "#eef3fb",
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
    color: "#001B5A",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableWrapper: { overflowX: "auto", padding: "10px 0 0" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "760px" },
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
