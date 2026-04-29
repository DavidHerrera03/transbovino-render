import { useEffect, useMemo, useState } from "react";
import TransportadorLayout from "../TransportadorLayout";
import {
  actualizarEstadoViajeTransportador,
  getMisViajesTransportador,
} from "../../../services/transportadorService";

const estadosFiltro = ["", "Asignado", "En ruta", "Completado"];
const estadosGestion = ["Asignado", "En ruta", "Completado"];
const ordenEstados = { Asignado: 0, "En ruta": 1, Completado: 2 };

const estadoColors = {
  Asignado: { background: "#ecfccb", color: "#365314" },
  "En ruta": { background: "#fef3c7", color: "#92400e" },
  Completado: { background: "#dcfce7", color: "#166534" },
};

const abrirDocumento = (url) => {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
};

const descargarDocumento = (url, nombre = "documento") => {
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function MisViajes({ usuario, salir, setVistaInterna, vistaInterna, dashboardContext = {} }) {
  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "",
    fecha: "",
  });
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardandoId, setGuardandoId] = useState(null);
  const [bovinoDetalle, setBovinoDetalle] = useState(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState({});

  const cargarViajes = async () => {
    if (!usuario?.id_usuario) return;

    setCargando(true);

    try {
      const data = await getMisViajesTransportador(usuario.id_usuario, {
        estado: filtros.estado,
        fecha: filtros.fecha,
      });
      const lista = Array.isArray(data) ? data : [];
      setViajes(lista);
      setEstadoSeleccionado((prev) => {
        const next = { ...prev };
        lista.forEach((viaje) => {
          if (!next[viaje.id]) {
            next[viaje.id] = viaje.estado;
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Error cargando viajes del transportador:", error);
      setViajes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarViajes();
  }, [usuario, filtros.estado, filtros.fecha]);

  useEffect(() => {
    const estadoDashboard = dashboardContext?.viajesEstado || "";
    if (!estadoDashboard) return;

    setFiltros((prev) => ({
      ...prev,
      estado: estadoDashboard,
    }));
  }, [dashboardContext]);

  const viajesFiltrados = useMemo(() => {
    const term = filtros.busqueda.trim().toLowerCase();

    return viajes.filter((viaje) => {
      if (!term) return true;

      return [
        viaje.solicitud_codigo,
        viaje.campesino_nombre,
        viaje.origen,
        viaje.destino,
        viaje.vehiculo_placa,
        viaje.vehiculo_marca,
        String(viaje.id_viaje),
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(term));
    });
  }, [filtros.busqueda, viajes]);

  const actualizarEstado = async (viaje) => {
    const nuevoEstado = estadoSeleccionado[viaje.id] || viaje.estado;

    if ((ordenEstados[nuevoEstado] ?? -1) < (ordenEstados[viaje.estado] ?? -1)) {
      alert("No puedes devolver el viaje a un estado anterior.");
      return;
    }

    try {
      setGuardandoId(viaje.id);
      await actualizarEstadoViajeTransportador(viaje.id, usuario.id_usuario, nuevoEstado);
      await cargarViajes();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo actualizar el estado del viaje");
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <TransportadorLayout
      usuario={usuario}
      salir={salir}
      setVistaInterna={setVistaInterna}
      vistaInterna={vistaInterna}
    >
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Mis viajes</h2>
          <p style={styles.description}>
            Aquí aparecen automáticamente las solicitudes que aceptaste. También puedes ver qué vehículo realizó cada viaje.
          </p>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={() => setVistaInterna("dashboard")}>
          Volver
        </button>
      </div>

      <div style={styles.filtersCard}>
        <div style={styles.filtersRow}>
          <input
            type="text"
            value={filtros.busqueda}
            onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
            placeholder="Buscar por solicitud, campesino, origen, destino o placa..."
            style={{ ...styles.input, minWidth: "280px" }}
          />

          <select
            value={filtros.estado}
            onChange={(e) => setFiltros((prev) => ({ ...prev, estado: e.target.value }))}
            style={styles.input}
          >
            <option value="">Todos los estados</option>
            {estadosFiltro.filter(Boolean).map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filtros.fecha}
            onChange={(e) => setFiltros((prev) => ({ ...prev, fecha: e.target.value }))}
            style={styles.input}
          />
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableScroller}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID viaje</th>
                <th style={styles.th}>Solicitud</th>
                <th style={styles.th}>Campesino</th>
                <th style={styles.th}>Vehículo</th>
                <th style={styles.th}>Origen</th>
                <th style={styles.th}>Destino</th>
                <th style={styles.th}>Animal</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Progreso</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Guía</th>
                <th style={styles.th}>Actualizar estado</th>
              </tr>
            </thead>
            <tbody>
              {viajesFiltrados.length > 0 ? (
                viajesFiltrados.map((viaje) => {
                  const porcentaje = Number(viaje.progreso || 0);
                  const estadoActual = estadoSeleccionado[viaje.id] || viaje.estado;
                  const estadosDisponiblesGestion = estadosGestion.filter((estado) => (ordenEstados[estado] ?? -1) >= (ordenEstados[viaje.estado] ?? -1));

                  return (
                    <tr key={viaje.id}>
                      <td style={styles.td}>{viaje.id_viaje}</td>
                      <td style={styles.td}>{viaje.solicitud_codigo || `SOL-${viaje.solicitud_id}`}</td>
                      <td style={styles.td}>{viaje.campesino_nombre}</td>
                      <td style={styles.td}>
                        {viaje.vehiculo_placa ? (
                          <div style={styles.vehicleBlock}>
                            <strong>{viaje.vehiculo_placa}</strong>
                            <small>{`${viaje.vehiculo_marca || ""} ${viaje.vehiculo_modelo || ""}`.trim()}</small>
                          </div>
                        ) : (
                          "Sin vehículo"
                        )}
                      </td>
                      <td style={styles.td}>{viaje.origen}</td>
                      <td style={styles.td}>{viaje.destino}</td>
                      <td style={styles.td}>
                        <div style={styles.vehicleCell}>
                          <span>{viaje.cantidad_bovinos}</span>
                          <button
                            type="button"
                            style={styles.infoButton}
                            onClick={() => setBovinoDetalle(viaje)}
                          >
                            Más información
                          </button>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.estadoBadge,
                            background: estadoColors[viaje.estado]?.background || "#e2e8f0",
                            color: estadoColors[viaje.estado]?.color || "#334155",
                          }}
                        >
                          {viaje.estado}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.progressWrapper}>
                          <div style={styles.progressTrack}>
                            <div style={{ ...styles.progressFill, width: `${Math.max(0, Math.min(100, porcentaje))}%` }} />
                          </div>
                          <span>{`${Math.max(0, Math.min(100, porcentaje))}%`}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{viaje.fecha || "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.docsColumn}>
                          {viaje.guia_movilidad_url ? (
                            <>
                              <button type="button" style={styles.infoButton} onClick={() => abrirDocumento(viaje.guia_movilidad_url)}>Ver guía</button>
                              <button type="button" style={styles.infoButton} onClick={() => descargarDocumento(viaje.guia_movilidad_download_url || viaje.guia_movilidad_url, viaje.guia_movilidad_nombre || "guia-movilidad")}>Descargar guía</button>
                            </>
                          ) : (
                            <span style={styles.emptyCellText}>Sin guía</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionColumn}>
                          <select
                            value={estadoActual}
                            onChange={(e) =>
                              setEstadoSeleccionado((prev) => ({
                                ...prev,
                                [viaje.id]: e.target.value,
                              }))
                            }
                            style={styles.selectEstado}
                          >
                            {estadosDisponiblesGestion.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            style={{
                              ...styles.saveButton,
                              ...(guardandoId === viaje.id || estadoActual === viaje.estado ? styles.saveButtonDisabled : {}),
                            }}
                            disabled={guardandoId === viaje.id || estadoActual === viaje.estado}
                            onClick={() => actualizarEstado(viaje)}
                          >
                            {guardandoId === viaje.id ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="12" style={styles.emptyCell}>
                    {cargando ? "Cargando viajes..." : "No hay viajes registrados todavía."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {bovinoDetalle && (
        <div style={styles.modalOverlay} onClick={() => setBovinoDetalle(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Información del bovino</h3>
            {Array.isArray(bovinoDetalle.bovinos) && bovinoDetalle.bovinos.length > 0 ? (
              <div style={styles.modalList}>
                {bovinoDetalle.bovinos.map((bovino) => (
                  <div key={bovino.id_bovino} style={styles.modalItem}>
                    <p><strong>Código:</strong> {bovino.codigo_bovino || `BOV-${bovino.id_bovino}`}</p>
                    <p><strong>Raza:</strong> {bovino.raza || "No registrada"}</p>
                    <p><strong>Peso promedio:</strong> {bovino.peso_promedio || 0} kg</p>
                    <p><strong>Edad:</strong> {bovino.edad || "No registrada"}</p>
                    <p><strong>Finca:</strong> {bovino.nombre_finca || "Sin finca"}</p>
                    <p><strong>Municipio:</strong> {bovino.municipio_finca || "Zipaquira"}</p>
                    <p><strong>Observaciones:</strong> {bovino.observaciones || "Sin observaciones"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No hay información detallada de bovinos para esta solicitud.</p>
            )}
            <button type="button" style={styles.closeButton} onClick={() => setBovinoDetalle(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

    </TransportadorLayout>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  title: {
    marginBottom: "6px",
  },
  description: {
    color: "#5f6b7a",
    maxWidth: "640px",
  },
  secondaryButton: {
    background: "#fff",
    color: "#1f2937",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "11px 16px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  filtersCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px 20px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
  },
  filtersRow: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    minWidth: "190px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d7dce3",
    background: "#fff",
    color: "#0f172a",
    fontSize: "15px",
  },
  tableCard: {
    background: "#fff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
  },
  tableScroller: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: "1440px",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "18px 20px",
    fontSize: "14px",
    textTransform: "uppercase",
    color: "#64748b",
    borderBottom: "1px solid #e5e7eb",
    background: "#fafafa",
  },
  td: {
    padding: "18px 20px",
    borderBottom: "1px solid #eef2f7",
    color: "#0f172a",
    verticalAlign: "middle",
  },
  vehicleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  vehicleCell: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "flex-start",
  },
  infoButton: {
    border: "none",
    background: "#e0f2fe",
    color: "#0c4a6e",
    borderRadius: "10px",
    padding: "8px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  estadoBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 600,
  },
  progressWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  progressTrack: {
    width: "120px",
    height: "10px",
    borderRadius: "999px",
    background: "#e5e7eb",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "#001B5A",
  },
  actionColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "flex-start",
  },
  selectEstado: {
    minWidth: "170px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #d7dce3",
    background: "#fff",
  },
  saveButton: {
    border: "none",
    background: "#001B5A",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
    minWidth: "120px",
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  emptyCell: {
    padding: "46px 20px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "15px",
  },
  docsColumn: { display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" },
  emptyCellText: { color: "#94a3b8", fontSize: "13px", fontWeight: 600 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1200 },
  modalCard: { width: "100%", maxWidth: "600px", background: "#fff", borderRadius: "18px", padding: "24px", boxShadow: "0 20px 45px rgba(15, 23, 42, 0.2)" },
  modalTitle: { marginTop: 0, marginBottom: "14px" },
  modalList: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" },
  modalItem: { padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" },
  closeButton: { marginTop: "18px", border: "none", background: "#001B5A", color: "#fff", borderRadius: "10px", padding: "10px 16px", fontWeight: 600, cursor: "pointer" },
};

export default MisViajes;
