import { formatColombianPhone } from "../../../utils/formValidators";
import { useEffect, useMemo, useState } from "react";
import TransportadorLayout from "../TransportadorLayout";
import {
  aceptarSolicitudTransportador,
  getSolicitudesVigentesTransportador,
  proponerOfertaTransportador,
  rechazarSolicitudTransportador,
} from "../../../services/solicitudService";
import { getVehiculos } from "../../../services/vehiculoService";

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

function SolicitudesVigentes({ usuario, salir, setVistaInterna, vistaInterna }) {
  const [loading, setLoading] = useState(false);
  const [accionandoId, setAccionandoId] = useState(null);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState({});
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState({});
  const [bovinoDetalle, setBovinoDetalle] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [filtros, setFiltros] = useState({
    busqueda: "",
    fecha: "",
  });

  const cargarDatos = async () => {
    if (!usuario?.id_usuario) return;

    try {
      setLoading(true);
      const [dataSolicitudes, dataVehiculos] = await Promise.all([
        getSolicitudesVigentesTransportador(usuario.id_usuario),
        getVehiculos(usuario.id_usuario),
      ]);
      setSolicitudes(Array.isArray(dataSolicitudes) ? dataSolicitudes : []);
      setVehiculos(Array.isArray(dataVehiculos) ? dataVehiculos : []);
    } catch (error) {
      console.error(error);
      setSolicitudes([]);
      setVehiculos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [usuario]);

  const solicitudesFiltradas = useMemo(() => {
    const term = filtros.busqueda.trim().toLowerCase();

    return solicitudes.filter((solicitud) => {
      const coincideBusqueda =
        !term ||
        [
          solicitud.codigo,
          solicitud.campesino_nombre,
          solicitud.origen,
          solicitud.destino,
          String(solicitud.id),
        ]
          .filter(Boolean)
          .some((valor) => String(valor).toLowerCase().includes(term));

      const coincideFecha = !filtros.fecha || solicitud.fecha === filtros.fecha;
      return coincideBusqueda && coincideFecha;
    });
  }, [filtros, solicitudes]);

  const hayVehiculosDisponibles = useMemo(
    () => vehiculos.some((vehiculo) => vehiculo.disponible),
    [vehiculos],
  );

  const enviarOferta = async (solicitud) => {
    const valor = Number(ofertaSeleccionada[solicitud.id] || 0);
    if (!valor) {
      alert("Debes ingresar una oferta.");
      return;
    }
    try {
      setAccionandoId(solicitud.id);
      await proponerOfertaTransportador(solicitud.id, usuario.id_usuario, valor);
      await cargarDatos();
    } catch (error) {
      alert(error.message || "No se pudo enviar la oferta");
    } finally {
      setAccionandoId(null);
    }
  };

  const aceptarSolicitud = async (solicitud) => {
    const idVehiculo = Number(vehiculoSeleccionado[solicitud.id]);

    if (!idVehiculo) {
      alert("Debes seleccionar un vehículo para aceptar la solicitud.");
      return;
    }

    try {
      setAccionandoId(solicitud.id);
      await aceptarSolicitudTransportador(solicitud.id, usuario.id_usuario, idVehiculo);
      alert(`Aceptaste la solicitud ${solicitud.codigo} y se asignó el vehículo seleccionado.`);
      await cargarDatos();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo aceptar la solicitud");
    } finally {
      setAccionandoId(null);
    }
  };

  const rechazarSolicitud = async (solicitud) => {
    try {
      setAccionandoId(solicitud.id);
      await rechazarSolicitudTransportador(solicitud.id, usuario.id_usuario);
      await cargarDatos();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo rechazar la solicitud");
    } finally {
      setAccionandoId(null);
    }
  };

  return (
    <TransportadorLayout
      usuario={usuario}
      salir={salir}
      setVistaInterna={setVistaInterna}
      vistaInterna={vistaInterna}
    >
      <div style={styles.page}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>Solicitudes vigentes</h1>
            <p style={styles.subtitle}>
              Revisa las solicitudes que están buscando conductor. Para aceptarlas debes asignar un vehículo registrado.
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => setVistaInterna("misViajes")}>
            Ver mis viajes
          </button>
        </div>

        {!hayVehiculosDisponibles && !loading && (
          <div style={styles.warningCard}>
            Necesitas al menos un vehículo disponible para aceptar solicitudes. Registra uno nuevo o termina el viaje del vehículo que está ocupado.
          </div>
        )}

        <div style={styles.filtersCard}>
          <div style={styles.filtersRow}>
            <input
              type="text"
              placeholder="Buscar por solicitud, campesino, origen o destino..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
              style={{ ...styles.input, minWidth: "320px" }}
            />

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
                  <th style={styles.th}>Solicitud</th>
                  <th style={styles.th}>Campesino</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Destino</th>
                  <th style={styles.th}>Animal</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Hora</th>
                  <th style={styles.th}>Contacto</th>
                  <th style={styles.th}>Pago</th>
                  <th style={styles.th}>Vehículo</th>
                  <th style={styles.th}>Documentos</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="13" style={styles.emptyCell}>Cargando solicitudes...</td>
                  </tr>
                ) : solicitudesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="13" style={styles.emptyCell}>No hay solicitudes vigentes disponibles.</td>
                  </tr>
                ) : (
                  solicitudesFiltradas.map((solicitud) => {
                    const seleccionActual = Number(vehiculoSeleccionado[solicitud.id] || 0);
                    const vehiculoElegido = vehiculos.find((vehiculo) => vehiculo.id_vehiculo === seleccionActual);
                    const puedeAceptarOferta = !solicitud.oferta_pago || ["acordado", "pendiente_transportador"].includes(solicitud.oferta_pago?.estado);
                    const aceptarDeshabilitado =
                      accionandoId === solicitud.id ||
                      !seleccionActual ||
                      !vehiculoElegido?.disponible ||
                      !puedeAceptarOferta;

                    return (
                      <tr key={solicitud.id}>
                        <td style={styles.td}>{solicitud.codigo || `SOL-${solicitud.id}`}</td>
                        <td style={styles.td}>{solicitud.campesino_nombre}</td>
                        <td style={styles.td}>{solicitud.origen}</td>
                        <td style={styles.td}>{solicitud.destino}</td>
                        <td style={styles.td}>
                          <div style={styles.vehicleCell}>
                            <div style={styles.animalesBlock}>
                              <strong>{solicitud.cantidad_bovinos}</strong>
                              <small>{`≈ ${Number(solicitud.peso_total_bovinos || 0).toFixed(0)} kg`}</small>
                            </div>
                            <button
                              type="button"
                              style={styles.infoButton}
                              onClick={() => setBovinoDetalle(solicitud)}
                            >
                              Más información
                            </button>
                          </div>
                        </td>
                        <td style={styles.td}>{solicitud.fecha || "-"}</td>
                        <td style={styles.td}>{solicitud.hora_recogida || "-"}</td>
                        <td style={styles.td}>
                          <div style={styles.contactBlock}>
                            <span>{solicitud.contacto_entrega || "Sin contacto"}</span>
                            <small>{solicitud.telefono_contacto ? formatColombianPhone(solicitud.telefono_contacto) : "Sin teléfono"}</small>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.docsColumn}>
                            <span style={styles.noActionText}>{solicitud.distancia_km ? `${solicitud.distancia_km} km` : "-"}</span>
                            <span style={styles.noActionText}>{solicitud.tarifa_minima ? `Mínimo $${Number(solicitud.tarifa_minima).toLocaleString("es-CO")}` : "-"}</span>
                            <span style={styles.noActionText}>{solicitud.valor_referencia_campesino ? `Campesino $${Number(solicitud.valor_referencia_campesino).toLocaleString("es-CO")}` : "-"}</span>
                            <span style={styles.noActionText}>{solicitud.oferta_pago ? `Actual $${Number(solicitud.oferta_pago.valor_oferta).toLocaleString("es-CO")} · ${solicitud.oferta_pago.estado}` : "Sin oferta enviada"}</span>
                            <input
                              type="number"
                              min={solicitud.tarifa_minima || 0}
                              value={ofertaSeleccionada[solicitud.id] ?? (solicitud.oferta_pago?.estado === "pendiente_transportador" ? solicitud.oferta_pago.valor_oferta : solicitud.valor_referencia_campesino || solicitud.tarifa_minima || "")}
                              onChange={(e) => setOfertaSeleccionada((prev) => ({ ...prev, [solicitud.id]: e.target.value }))}
                              style={styles.selectVehicle}
                              placeholder="Tu oferta"
                            />
                            <div style={styles.paymentActions}>
                              <button
                                type="button"
                                style={{
                                  ...styles.paymentButton,
                                  ...(accionandoId === solicitud.id ? styles.disabledPaymentButton : {}),
                                }}
                                onClick={() => enviarOferta(solicitud)}
                                disabled={accionandoId === solicitud.id}
                              >
                                Enviar oferta
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.vehicleSelectBlock}>
                            <select
                              value={vehiculoSeleccionado[solicitud.id] || ""}
                              onChange={(e) =>
                                setVehiculoSeleccionado((prev) => ({
                                  ...prev,
                                  [solicitud.id]: e.target.value,
                                }))
                              }
                              style={styles.selectVehicle}
                            >
                              <option value="">Seleccionar placa</option>
                              {vehiculos.map((vehiculo) => (
                                <option
                                  key={vehiculo.id_vehiculo}
                                  value={vehiculo.id_vehiculo}
                                  disabled={!vehiculo.disponible}
                                >
                                  {`${vehiculo.placa} · ${vehiculo.marca}${vehiculo.disponible ? "" : " · En viaje"}`}
                                </option>
                              ))}
                            </select>
                            <small style={styles.vehicleHelp}>Obligatorio para aceptar.</small>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.docsColumn}>
                            {solicitud.guia_movilidad_url ? (
                              <>
                                <button
                                  type="button"
                                  style={styles.infoButton}
                                  onClick={() => abrirDocumento(solicitud.guia_movilidad_url)}
                                >
                                  Ver guía
                                </button>
                                <button
                                  type="button"
                                  style={styles.infoButton}
                                  onClick={() =>
                                    descargarDocumento(
                                      solicitud.guia_movilidad_download_url || solicitud.guia_movilidad_url,
                                      solicitud.guia_movilidad_nombre || "guia-movilidad"
                                    )
                                  }
                                >
                                  Descargar guía
                                </button>
                              </>
                            ) : (
                              <span style={styles.emptyDocText}>Sin guía</span>
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.estadoBadge}>{solicitud.estado}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button
                              type="button"
                              style={{
                                ...styles.acceptButton,
                                ...(aceptarDeshabilitado ? styles.disabledButton : {}),
                              }}
                              disabled={aceptarDeshabilitado}
                              onClick={() => aceptarSolicitud(solicitud)}
                            >
                              {accionandoId === solicitud.id ? "Procesando..." : "Aceptar oferta"}
                            </button>
                            <button
                              type="button"
                              style={{
                                ...styles.rejectButton,
                                ...(accionandoId === solicitud.id ? styles.disabledButton : {}),
                              }}
                              disabled={accionandoId === solicitud.id}
                              onClick={() => rechazarSolicitud(solicitud)}
                            >
                              Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  title: {
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#5f6b7a",
    maxWidth: "680px",
  },
  secondaryButton: {
    border: "1px solid #d7dce3",
    background: "#fff",
    color: "#0f172a",
    borderRadius: "12px",
    padding: "12px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  warningCard: {
    background: "#fff7ed",
    border: "1px solid #fdba74",
    color: "#9a3412",
    padding: "14px 16px",
    borderRadius: "14px",
    fontWeight: 600,
  },
  filtersCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px 20px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
  },
  filtersRow: {
    display: "flex",
    gap: "14px",
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
    minWidth: "1600px",
    borderCollapse: "collapse",
  },
  th: {
    padding: "18px 20px",
    fontSize: "14px",
    textTransform: "uppercase",
    color: "#64748b",
    borderBottom: "1px solid #e5e7eb",
    background: "#fafafa",
    textAlign: "left",
  },
  td: {
    padding: "18px 20px",
    borderBottom: "1px solid #eef2f7",
    color: "#0f172a",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  animalesBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  contactBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  vehicleCell: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "stretch",
    minWidth: "160px",
  },
  infoButton: {
    width: "100%",
    border: "none",
    background: "#d9ebf7",
    color: "#0c4a6e",
    borderRadius: "16px",
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center",
  },
  vehicleSelectBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: "220px",
  },
  selectVehicle: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #d7dce3",
    background: "#fff",
  },
  vehicleHelp: {
    color: "#64748b",
  },
  estadoBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#e0f2fe",
    color: "#0c4a6e",
    fontSize: "14px",
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  acceptButton: {
    border: "none",
    background: "#001B5A",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  rejectButton: {
    border: "none",
    background: "#b91c1c",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  emptyCell: {
    padding: "42px 20px",
    textAlign: "center",
    color: "#64748b",
  },
  docsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "stretch",
    minWidth: "160px",
  },
  paymentActions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
    minWidth: "220px",
  },
  paymentButton: {
    width: "100%",
    border: "none",
    background: "#d9ebf7",
    color: "#0c4a6e",
    borderRadius: "16px",
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center",
  },
  disabledPaymentButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  emptyDocText: {
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 600,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1200,
  },
  modalCard: {
    width: "100%",
    maxWidth: "600px",
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.2)",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: "14px",
  },
  modalList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "14px",
  },
  modalItem: {
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  closeButton: {
    marginTop: "18px",
    border: "none",
    background: "#001B5A",
    color: "#fff",
    borderRadius: "10px",
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default SolicitudesVigentes;