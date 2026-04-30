import { useEffect, useMemo, useState } from "react";
import TransportadorLayout from "./TransportadorLayout";
import solicitudesIcon from "../../assets/icons/Solicitudes.png";
import viajesIcon from "../../assets/icons/Viajes.png";
import vehiculosIcon from "../../assets/icons/Vehiculos.png";
import { getDashboardTransportador, getMisViajesTransportador } from "../../services/transportadorService";
import { getVehiculos } from "../../services/vehiculoService";

function Dashboard({ usuario, salir, setVistaInterna, vistaInterna }) {
  const [loading, setLoading] = useState(false);
  const [viajes, setViajes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [resumenBackend, setResumenBackend] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.id_usuario) return;
      try {
        setLoading(true);

        // Endpoint optimizado: una sola consulta al backend para el resumen.
        const dashboard = await getDashboardTransportador(usuario.id_usuario);
        setResumenBackend(dashboard || null);
        setViajes(Array.isArray(dashboard?.recientes) ? dashboard.recientes : []);

        // Mantengo esta consulta como respaldo para mostrar cantidad real de vehículos
        // si el endpoint optimizado no trae el dato por alguna razón.
        const dataVehiculos = await getVehiculos(usuario.id_usuario).catch(() => []);
        setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
      } catch (error) {
        console.error("Error cargando dashboard transportador:", error);

        // Respaldo: comportamiento anterior.
        try {
          const [dataViajes, dataVehiculos] = await Promise.all([
            getMisViajesTransportador(usuario.id_usuario),
            getVehiculos(usuario.id_usuario),
          ]);
          setViajes(Array.isArray(dataViajes) ? dataViajes : []);
          setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
          setResumenBackend(null);
        } catch (fallbackError) {
          console.error("Error cargando fallback dashboard transportador:", fallbackError);
          setViajes([]);
          setVehiculos([]);
          setResumenBackend(null);
        }
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [usuario]);

  const resumen = useMemo(() => {
    if (resumenBackend) {
      return {
        asignados: Number(resumenBackend.viajes_asignados || 0),
        enRuta: Number(resumenBackend.en_ruta || 0),
        completadosMes: Number(resumenBackend.completados || 0),
        vehiculos: Number(resumenBackend.vehiculos ?? vehiculos.length ?? 0),
      };
    }

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
  }, [viajes, vehiculos, resumenBackend]);

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
            <h2 style={styles.sectionTitle}>Mis viajes recientes</h2>
            <button type="button" style={styles.linkButton} onClick={() => setVistaInterna("misViajes")}>Ver todos</button>
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
                    <tr key={item.id || item.id_viaje}>
                      <td style={styles.td}>{item.id_viaje || item.id}</td>
                      <td style={styles.td}>{item.solicitud_codigo || item.solicitud_id || "-"}</td>
                      <td style={styles.td}>{item.origen}</td>
                      <td style={styles.td}>{item.destino}</td>
                      <td style={styles.td}>{item.estado}</td>
                      <td style={styles.td}>{item.fecha || "-"}</td>
                      <td style={styles.td}>{item.vehiculo_placa || item.id_vehiculo || "Sin vehículo"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={styles.emptyCell} colSpan="7">
                      {loading ? "Cargando viajes..." : "No hay viajes registrados todavía."}
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

const styles = {
  page: { display: "flex", flexDirection: "column", gap: "24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, color: "#0f172a", fontSize: "34px" },
  subtitle: { color: "#64748b", marginTop: "8px" },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" },
  cardButton: { border: "1px solid #e2e8f0", background: "#fff", borderRadius: "16px", padding: "22px", textAlign: "left", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,.05)" },
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#475569", fontSize: "15px" },
  cardIconWrap: { width: "42px", height: "42px", borderRadius: "14px", background: "#f0f9ff", display: "grid", placeItems: "center" },
  cardIcon: { width: "22px", height: "22px", objectFit: "contain" },
  cardValue: { display: "block", fontSize: "42px", color: "#0f172a", marginTop: "22px" },
  cardHint: { color: "#64748b", marginTop: "12px", display: "block" },
  tableCard: { background: "#fff", borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,.05)", overflow: "hidden" },
  tableHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 26px", borderBottom: "1px solid #e2e8f0" },
  sectionTitle: { margin: 0, fontSize: "24px", color: "#0f172a" },
  linkButton: { border: "none", background: "transparent", color: "#075985", fontWeight: 700, cursor: "pointer" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "18px 24px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" },
  td: { padding: "16px 24px", borderTop: "1px solid #e2e8f0", color: "#334155" },
  emptyCell: { padding: "34px", textAlign: "center", color: "#64748b", borderTop: "1px solid #e2e8f0" },
};

export default Dashboard;
