import { useEffect, useMemo, useState } from "react";
import CampesinoLayout from "../CampesinoLayout";
import {
  cancelarSolicitud,
  getSolicitudesCampesino,
} from "../../../services/solicitudService";

const estadoColors = {
  "Buscando conductor": { background: "#eff6ff", color: "#1d4ed8" },
  Asignado: { background: "#ecfccb", color: "#365314" },
  "En ruta": { background: "#fef3c7", color: "#92400e" },
  Completado: { background: "#dcfce7", color: "#166534" },
  Cancelada: { background: "#fee2e2", color: "#991b1b" },
};

const getStatusStyle = (estado) => ({
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  background: estadoColors[estado]?.background || "#e2e8f0",
  color: estadoColors[estado]?.color || "#334155",
  fontWeight: 600,
  fontSize: "13px",
});

const FORMATEAR_ESTADO_OFERTA = {
  pendiente_campesino: "Pendiente por campesino",
  pendiente_transportador: "Pendiente por transportador",
  acordado: "Acordado",
  rechazada_campesino: "Rechazada por campesino",
  rechazada_transportador: "Rechazada por transportador",
};

const obtenerEstadoOfertaTexto = (estado) => FORMATEAR_ESTADO_OFERTA[estado] || estado || "-";

const abrirDocumento = (url) => {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
};


function MisSolicitudes({ usuario, salir, setVistaInterna, vistaInterna, dashboardContext = {} }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [vehiculoDetalle, setVehiculoDetalle] = useState(null);
  const [bovinoDetalle, setBovinoDetalle] = useState(null);
  const [ofertaModalSolicitudId, setOfertaModalSolicitudId] = useState(null);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    estado: "",
    fecha: "",
  });

  const cargarSolicitudes = async () => {
    if (!usuario?.id_usuario) return;

    try {
      setLoading(true);
      const data = await getSolicitudesCampesino(usuario.id_usuario, { force: true });
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [usuario]);

  useEffect(() => {
    const estadoDashboard = dashboardContext?.solicitudesEstado || "";
    if (!estadoDashboard) return;

    setFiltros((prev) => ({
      ...prev,
      estado: estadoDashboard,
    }));
  }, [dashboardContext]);


  const solicitudesFiltradas = useMemo(() => {
    const term = filtros.busqueda.trim().toLowerCase();

    return solicitudes.filter((solicitud) => {
      const coincideBusqueda =
        !term ||
        [
          solicitud.codigo,
          solicitud.origen,
          solicitud.destino,
          solicitud.transportador_nombre,
          solicitud.vehiculo_placa,
          String(solicitud.id),
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(term));

      const coincideEstado = filtros.estado === "__activas__"
        ? ["Negociando pago", "Buscando conductor", "Asignado", "En ruta"].includes(solicitud.estado)
        : !filtros.estado || solicitud.estado === filtros.estado;
      const coincideFecha = !filtros.fecha || solicitud.fecha === filtros.fecha;

      return coincideBusqueda && coincideEstado && coincideFecha;
    });
  }, [filtros, solicitudes]);

  const estadosDisponibles = useMemo(() => {
    return [...new Set(solicitudes.map((item) => item.estado).filter(Boolean))];
  }, [solicitudes]);

  const ofertaModalSolicitud = useMemo(
    () => solicitudes.find((item) => item.id === ofertaModalSolicitudId) || null,
    [solicitudes, ofertaModalSolicitudId],
  );

  const abrirModalOfertas = (solicitud) => {
    setOfertaModalSolicitudId(solicitud.id);
  };

  const cancelarSolicitudActual = async (solicitud) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas cancelar la solicitud ${solicitud.codigo || `SOL-${solicitud.id}`}?`,
    );

    if (!confirmar) return;

    try {
      setProcesandoId(solicitud.id);
      await cancelarSolicitud(solicitud.id, usuario.id_usuario);
      await cargarSolicitudes();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo cancelar la solicitud");
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <CampesinoLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaInterna={vistaInterna}>
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>Mis solicitudes</h1>

        <div style={styles.filtersCard}>
          <div style={styles.filtersGrid}>
            <input
              type="text"
              placeholder="Buscar por ID, origen, destino, transportador o placa..."
              style={styles.input}
              value={filtros.busqueda}
              onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
            />

            <select
              style={styles.select}
              value={filtros.estado}
              onChange={(e) => setFiltros((prev) => ({ ...prev, estado: e.target.value }))}
            >
              <option value="">Todos los estados</option>
              <option value="__activas__">Solicitudes activas</option>
              {estadosDisponibles.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <input
              type="date"
              style={styles.select}
              value={filtros.fecha}
              onChange={(e) => setFiltros((prev) => ({ ...prev, fecha: e.target.value }))}
            />
          </div>
        </div>

        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Mis solicitudes</h2>
            <button type="button" style={styles.button} onClick={() => setVistaInterna("crearSolicitud")}>
              Nueva solicitud
            </button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>IDENTIFICACIÓN</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Destino</th>
                  <th style={styles.th}>Animal</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Transportador</th>
                  <th style={styles.th}>Vehículo</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Pago</th>
                  <th style={styles.th}>Documentos</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td style={styles.emptyTd} colSpan="11">Cargando solicitudes...</td>
                  </tr>
                ) : solicitudesFiltradas.length === 0 ? (
                  <tr>
                    <td style={styles.emptyTd} colSpan="11">No hay solicitudes para mostrar.</td>
                  </tr>
                ) : (
                  solicitudesFiltradas.map((solicitud) => (
                    <tr key={solicitud.id}>
                      <td style={styles.td}>{solicitud.codigo || `SOL-${solicitud.id}`}</td>
                      <td style={styles.td}>{solicitud.origen}</td>
                      <td style={styles.td}>{solicitud.destino}</td>
                      <td style={styles.td}>
                        <div style={styles.vehicleCell}>
                          <span>{solicitud.cantidad_bovinos}</span>
                          <button
                            type="button"
                            style={styles.infoButton}
                            onClick={() => setBovinoDetalle(solicitud)}
                          >
                            Más información
                          </button>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(solicitud.estado)}>{solicitud.estado}</span>
                      </td>
                      <td style={styles.td}>{solicitud.transportador_nombre || "Sin asignar"}</td>
                      <td style={styles.td}>
                        {solicitud.vehiculo_placa ? (
                          <div style={styles.vehicleCell}>
                            <span>{solicitud.vehiculo_placa}</span>
                            <button
                              type="button"
                              style={styles.infoButton}
                              onClick={() => setVehiculoDetalle(solicitud)}
                            >
                              Más información
                            </button>
                          </div>
                        ) : (
                          "Sin asignar"
                        )}
                      </td>
                      <td style={styles.td}>{solicitud.fecha || "-"}</td>
                      <td style={styles.td}>
                        <div style={styles.docsColumn}>
                          <span style={styles.noActionText}>{solicitud.tarifa_minima ? `Mínimo $${Number(solicitud.tarifa_minima).toLocaleString("es-CO")}` : "-"}</span>
                          <span style={styles.noActionText}>{solicitud.valor_referencia_campesino ? `Inicial $${Number(solicitud.valor_referencia_campesino).toLocaleString("es-CO")}` : "-"}</span>
                          {Array.isArray(solicitud.ofertas_pago) && solicitud.ofertas_pago.some((oferta) => oferta.estado === "rechazada_transportador") && (
                            <span style={styles.rejectedOfferText}>El transportador rechazó el acuerdo.</span>
                          )}
                          <button type="button" style={styles.infoButton} onClick={() => abrirModalOfertas(solicitud)}>Ver acuerdo</button>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.docsColumn}>
                          {solicitud.guia_movilidad_url ? (
                            <button type="button" style={styles.infoButton} onClick={() => abrirDocumento(solicitud.guia_movilidad_url)}>
                              Ver guía
                            </button>
                          ) : (
                            <span style={styles.noActionText}>Sin guía</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {solicitud.puede_cancelar ? (
                          <button
                            type="button"
                            style={{
                              ...styles.cancelButton,
                              ...(procesandoId === solicitud.id ? styles.cancelButtonDisabled : {}),
                            }}
                            disabled={procesandoId === solicitud.id}
                            onClick={() => cancelarSolicitudActual(solicitud)}
                          >
                            {procesandoId === solicitud.id ? "Cancelando..." : "Cancelar"}
                          </button>
                        ) : (
                          <span style={styles.noActionText}>Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {vehiculoDetalle && (
        <div style={styles.modalOverlay} onClick={() => setVehiculoDetalle(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Información del vehículo</h3>
            <p><strong>Placa:</strong> {vehiculoDetalle.vehiculo_placa}</p>
            <p><strong>Marca:</strong> {vehiculoDetalle.vehiculo_marca || "No registrada"}</p>
            <p><strong>Modelo:</strong> {vehiculoDetalle.vehiculo_modelo || "No registrado"}</p>
            <p><strong>Tipo:</strong> {vehiculoDetalle.vehiculo_tipo || "No registrado"}</p>
            <button type="button" style={styles.closeButton} onClick={() => setVehiculoDetalle(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}


      {ofertaModalSolicitud && (
        <div style={styles.modalOverlay} onClick={() => setOfertaModalSolicitudId(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Acuerdo de pago</h3>
            <p><strong>Tarifa mínima:</strong> ${Number(ofertaModalSolicitud.tarifa_minima || 0).toLocaleString("es-CO")}</p>
            <p><strong>Oferta inicial del campesino:</strong> ${Number(ofertaModalSolicitud.valor_referencia_campesino || 0).toLocaleString("es-CO")}</p>
            {Array.isArray(ofertaModalSolicitud.ofertas_pago) && ofertaModalSolicitud.ofertas_pago.length > 0 ? (
              <div style={styles.modalList}>
                {ofertaModalSolicitud.ofertas_pago.map((oferta) => (
                  <div key={oferta.id} style={styles.modalItem}>
                    <p><strong>Transportador:</strong> {oferta.transportador_nombre || oferta.transportador_id}</p>
                    <p><strong>Valor ofertado:</strong> ${Number(oferta.valor_oferta || 0).toLocaleString("es-CO")}</p>
                    <p><strong>Estado:</strong> {obtenerEstadoOfertaTexto(oferta.estado)}</p>
                    <p><strong>Última propuesta por:</strong> {oferta.propuesta_por}</p>
                    {oferta.estado === "pendiente_campesino" && (
                      <p style={styles.noActionText}>La negociación del valor se gestiona desde el flujo de creación de la solicitud.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : <p>No hay ofertas de transportadores todavía.</p>}
            <button type="button" style={styles.closeButton} onClick={() => setOfertaModalSolicitudId(null)}>Cerrar</button>
          </div>
        </div>
      )}


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

    </CampesinoLayout>
  );
}

const styles = {
  page: { padding: "28px 24px" },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 24px 0",
    textAlign: "center",
  },
  filtersCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
    marginBottom: "22px",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "1.7fr 1fr 1fr",
    gap: "14px",
  },
  input: {
    width: "100%",
    height: "46px",
    border: "1px solid #dbe1ea",
    borderRadius: "12px",
    padding: "0 14px",
    fontSize: "15px",
    background: "#f8fafc",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    height: "46px",
    border: "1px solid #dbe1ea",
    borderRadius: "12px",
    padding: "0 14px",
    fontSize: "15px",
    background: "#f8fafc",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "18px",
  },
  tableTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  button: {
    border: "none",
    background: "#4d7c0f",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "11px 16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelButton: {
    border: "1px solid #ef4444",
    background: "#fff5f5",
    color: "#b91c1c",
    borderRadius: "10px",
    padding: "9px 12px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelButtonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  noActionText: {
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 600,
  },
  rejectedOfferText: {
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: 700,
  },
  vehicleCell: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
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
  tableWrapper: { width: "100%", overflowX: "auto" },
  table: { width: "100%", minWidth: "1180px", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "700",
    color: "#111827",
    padding: "14px 8px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  td: {
    textAlign: "left",
    fontSize: "14px",
    color: "#334155",
    padding: "16px 8px",
    borderBottom: "1px solid #f1f5f9",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  emptyTd: {
    textAlign: "center",
    padding: "38px 16px",
    color: "#94a3b8",
    fontStyle: "italic",
    borderBottom: "1px solid #f1f5f9",
  },
  docsColumn: { display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: "16px",
    color: "#0f172a",
  },
  closeButton: {
    marginTop: "14px",
    border: "none",
    background: "#0f766e",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default MisSolicitudes;
