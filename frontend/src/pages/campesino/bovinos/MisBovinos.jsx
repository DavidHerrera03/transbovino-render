import { useEffect, useMemo, useRef, useState } from "react";
import CampesinoLayout from "../CampesinoLayout";
import {
  obtenerBovinosPorUsuario,
  obtenerDocumentosBovino,
  obtenerTrazabilidadBovino,
  obtenerUrlDocumentoBovino,
  subirDocumentoBovino,
  eliminarBovino,
} from "../../../services/bovinoService";

const estadoColors = {
  activo: { background: "#dcfce7", color: "#166534" },
  inactivo: { background: "#e2e8f0", color: "#475569" },
  vendido: { background: "#dbeafe", color: "#1d4ed8" },
  frigorifico: { background: "#fee2e2", color: "#b91c1c" },
  feria: { background: "#fef3c7", color: "#92400e" },
};

const getStatusStyle = (estado) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontWeight: 700,
  fontSize: "12px",
  textTransform: "capitalize",
  background: estadoColors[estado]?.background || "#e2e8f0",
  color: estadoColors[estado]?.color || "#334155",
});

function MisBovinos({ usuario, salir, setVistaInterna, vistaInterna, setBovinoSeleccionado }) {
  const [bovinos, setBovinos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ busqueda: "", finca: "" });
  const [detalle, setDetalle] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [trazabilidad, setTrazabilidad] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);
  const inputDocumentoRef = useRef(null);

  const cargarBovinos = async () => {
    if (!usuario?.id_usuario) return;
    try {
      setLoading(true);
      const data = await obtenerBovinosPorUsuario(usuario.id_usuario);
      setBovinos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setBovinos([]);
      alert(error.message || "No se pudieron cargar tus bovinos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarBovinos();
  }, [usuario]);

  const fincasDisponibles = useMemo(() => {
    return [...new Set(bovinos.map((item) => item.nombre_finca).filter(Boolean))];
  }, [bovinos]);

  const bovinosFiltrados = useMemo(() => {
    const term = filtros.busqueda.trim().toLowerCase();
    return bovinos.filter((bovino) => {
      const coincideBusqueda = !term || [
        bovino.codigo_bovino,
        bovino.raza,
        bovino.nombre_finca,
        bovino.vereda_finca,
        bovino.municipio_finca,
      ].filter(Boolean).some((valor) => String(valor).toLowerCase().includes(term));

      const coincideFinca = !filtros.finca || bovino.nombre_finca === filtros.finca;
      return coincideBusqueda && coincideFinca;
    });
  }, [bovinos, filtros]);


  const actualizarInformacion = (bovino) => {
    if (typeof setBovinoSeleccionado === "function") {
      setBovinoSeleccionado(bovino);
    }
    setVistaInterna("editarBovino");
  };

  const eliminarDelListado = async (bovino) => {
    const ok = window.confirm("¿Deseas eliminar este bovino del listado activo? Quedará registrado como inactivo.");
    if (!ok) return;
    try {
      await eliminarBovino(bovino.id_bovino, usuario.id_usuario);
      await cargarBovinos();
    } catch (error) {
      alert(error.message || "No se pudo eliminar el bovino");
    }
  };

  const abrirDetalle = async (bovino) => {
    try {
      setDetalle(bovino);
      setCargandoDetalle(true);
      const [docs, traz] = await Promise.all([
        obtenerDocumentosBovino(bovino.id_bovino, usuario.id_usuario),
        obtenerTrazabilidadBovino(bovino.id_bovino, usuario.id_usuario),
      ]);
      setDocumentos(Array.isArray(docs) ? docs : []);
      setTrazabilidad(Array.isArray(traz) ? traz : []);
    } catch (error) {
      console.error(error);
      setDocumentos([]);
      setTrazabilidad([]);
      alert(error.message || "No se pudo cargar el detalle del bovino");
    } finally {
      setCargandoDetalle(false);
    }
  };


  const cargarDocumentosDetalle = async (bovinoActual = detalle) => {
    if (!bovinoActual?.id_bovino || !usuario?.id_usuario) return;
    const docs = await obtenerDocumentosBovino(bovinoActual.id_bovino, usuario.id_usuario);
    setDocumentos(Array.isArray(docs) ? docs : []);
  };

  const abrirSelectorDocumento = () => {
    inputDocumentoRef.current?.click();
  };

  const manejarSubidaDocumentos = async (event) => {
    const archivos = Array.from(event.target.files || []);
    event.target.value = "";

    if (!archivos.length || !detalle?.id_bovino || !usuario?.id_usuario) return;

    const permitidos = [".pdf", ".jpg", ".jpeg", ".png"];
    const archivoInvalido = archivos.find((archivo) => {
      const nombre = archivo.name || "";
      const extension = nombre.includes(".") ? nombre.slice(nombre.lastIndexOf(".")).toLowerCase() : "";
      return !permitidos.includes(extension);
    });

    if (archivoInvalido) {
      alert("Solo se permiten documentos PDF, JPG, JPEG o PNG.");
      return;
    }

    try {
      setSubiendoDocumento(true);
      for (const archivo of archivos) {
        await subirDocumentoBovino(detalle.id_bovino, usuario.id_usuario, archivo);
      }
      await cargarDocumentosDetalle(detalle);
      await cargarBovinos();
      alert(archivos.length === 1 ? "Documento cargado correctamente." : "Documentos cargados correctamente.");
    } catch (error) {
      alert(error.message || "No se pudieron subir los documentos del bovino");
    } finally {
      setSubiendoDocumento(false);
    }
  };
  const abrirDocumento = async (doc) => {
    try {
      const data = await obtenerUrlDocumentoBovino(doc.id, usuario.id_usuario);
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      alert(error.message || "No se pudo abrir el documento");
    }
  };

  return (
    <CampesinoLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaInterna={vistaInterna}>
      <div style={styles.page}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Mis bovinos</h1>
            <p style={styles.pageText}>Consulta los bovinos activos registrados en tus fincas y revisa su documentación y trazabilidad.</p>
          </div>
          <div style={styles.headerActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => setVistaInterna("dashboard")}>Volver</button>
            <button type="button" style={styles.primaryButton} onClick={() => setVistaInterna("registrarBovino")}>Registrar bovino</button>
          </div>
        </div>

        <div style={styles.filtersCard}>
          <div style={styles.filtersGrid}>
            <input
              type="text"
              placeholder="Buscar por código, raza, finca o vereda..."
              style={styles.input}
              value={filtros.busqueda}
              onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
            />
            <select
              style={styles.select}
              value={filtros.finca}
              onChange={(e) => setFiltros((prev) => ({ ...prev, finca: e.target.value }))}
            >
              <option value="">Todas las fincas</option>
              {fincasDisponibles.map((finca) => <option key={finca} value={finca}>{finca}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={styles.emptyCard}>Cargando bovinos...</div>
        ) : bovinosFiltrados.length === 0 ? (
          <div style={styles.emptyCard}>No hay bovinos activos para mostrar con los filtros actuales.</div>
        ) : (
          <div style={styles.grid}>
            {bovinosFiltrados.map((bovino) => (
              <div key={bovino.id_bovino} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <h3 style={styles.cardTitle}>Bovino #{bovino.codigo_bovino}</h3>
                    <p style={styles.cardSubtitle}>{bovino.raza}</p>
                  </div>
                  <span style={getStatusStyle("activo")}>Activo</span>
                </div>
                <div style={styles.infoGrid}>
                  <p style={styles.text}><strong>Finca:</strong> {bovino.nombre_finca}</p>
                  <p style={styles.text}><strong>Vereda:</strong> {bovino.vereda_finca || "-"}</p>
                  <p style={styles.text}><strong>Municipio:</strong> {bovino.municipio_finca || "-"}</p>
                  <p style={styles.text}><strong>Peso promedio:</strong> {bovino.peso_promedio} kg</p>
                  <p style={styles.text}><strong>Edad:</strong> {bovino.edad || "-"}</p>
                </div>
                <p style={styles.obs}><strong>Observaciones:</strong> {bovino.observaciones || "Sin observaciones"}</p>
                <div style={styles.cardActions}>
                  <button type="button" style={styles.detailButton} onClick={() => abrirDetalle(bovino)}>Ver detalle</button>
                  <button type="button" style={styles.editButton} onClick={() => actualizarInformacion(bovino)}>Actualizar</button>
                  <button type="button" style={styles.deleteButton} onClick={() => eliminarDelListado(bovino)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detalle && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Detalle del bovino #{detalle.codigo_bovino}</h3>
                <p style={styles.modalText}>{detalle.raza} · {detalle.nombre_finca}</p>
              </div>
              <button type="button" style={styles.closeButton} onClick={() => setDetalle(null)}>Cerrar</button>
            </div>

            {cargandoDetalle ? (
              <p style={styles.emptyText}>Cargando información...</p>
            ) : (
              <div style={styles.modalGrid}>
                <div style={styles.panel}>
                  <div style={styles.panelHeader}>
                    <h4 style={styles.panelTitle}>Documentos</h4>
                    <button
                      type="button"
                      style={{ ...styles.uploadButton, ...(subiendoDocumento ? styles.disabledButton : {}) }}
                      disabled={subiendoDocumento}
                      onClick={abrirSelectorDocumento}
                    >
                      {subiendoDocumento ? "Subiendo..." : "Subir archivos"}
                    </button>
                  </div>

                  <input
                    ref={inputDocumentoRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    hidden
                    onChange={manejarSubidaDocumentos}
                  />

                  {documentos.length ? documentos.map((doc) => (
                    <div key={doc.id} style={styles.docRow}>
                      <div>
                        <strong style={styles.docName}>{doc.nombre_archivo}</strong>
                        <div style={styles.docMeta}>{doc.created_at ? new Date(doc.created_at).toLocaleString("es-CO") : "Sin fecha"}</div>
                      </div>
                      <button type="button" style={styles.linkButton} onClick={() => abrirDocumento(doc)}>Abrir</button>
                    </div>
                  )) : <p style={styles.emptyText}>No hay documentos cargados.</p>}
                </div>


                <div style={styles.panel}>
                  <h4 style={styles.panelTitle}>Trazabilidad</h4>
                  {trazabilidad.length ? trazabilidad.map((item) => (
                    <div key={item.id} style={styles.traceItem}>
                      <strong>{item.tipo_movimiento}</strong>
                      <div style={styles.docMeta}>{item.fecha ? new Date(item.fecha).toLocaleString("es-CO") : "Sin fecha"}</div>
                      <div style={styles.text}>{item.descripcion}</div>
                      {item.finca_destino && <div style={styles.docMeta}>Destino: {item.finca_destino} · {item.vereda_destino || "-"}</div>}
                    </div>
                  )) : <p style={styles.emptyText}>Aún no hay movimientos registrados.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </CampesinoLayout>
  );
}

const styles = {
  page: { padding: "28px 24px" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "24px" },
  pageTitle: { margin: 0, fontSize: "28px", color: "#0f172a" },
  pageText: { margin: "8px 0 0", color: "#64748b", maxWidth: "760px" },
  headerActions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  primaryButton: { background: "#29650B", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 600, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "10px", padding: "11px 16px", fontWeight: 600, cursor: "pointer" },
  filtersCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "18px", marginBottom: "20px" },
  filtersGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" },
  input: { width: "100%", height: "48px", border: "1px solid #dbe1ea", borderRadius: "12px", padding: "0 14px", background: "#f8fafc", fontSize: "15px", boxSizing: "border-box" },
  select: { width: "100%", height: "48px", border: "1px solid #dbe1ea", borderRadius: "12px", padding: "0 14px", background: "#f8fafc", fontSize: "15px", boxSizing: "border-box" },
  emptyCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "22px", color: "#475569" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "20px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)" },
  cardTop: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "14px" },
  cardTitle: { margin: 0, fontSize: "18px", color: "#0f172a" },
  cardSubtitle: { margin: "6px 0 0", color: "#64748b" },
  infoGrid: { display: "grid", gap: "8px", marginBottom: "12px" },
  text: { margin: 0, color: "#475569" },
  obs: { margin: "0 0 16px", color: "#475569" },
  cardActions: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" },
  detailButton: { background: "#29650B", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 600, cursor: "pointer" },
  editButton: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  deleteButton: { background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "10px", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1200 },
  modalCard: { width: "100%", maxWidth: 980, maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 20px 45px rgba(15, 23, 42, 0.2)" },
  modalHeader: { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "20px" },
  modalTitle: { margin: 0, color: "#0f172a" },
  modalText: { margin: "6px 0 0", color: "#64748b" },
  closeButton: { background: "#fff", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 14px", fontWeight: 600, cursor: "pointer" },
  modalGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  panel: { border: "1px solid #e5e7eb", borderRadius: "16px", padding: "18px", background: "#f8fafc" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" },
  panelTitle: { margin: 0, color: "#0f172a" },
  uploadButton: { background: "#29650B", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 12px", fontWeight: 700, cursor: "pointer" },
  disabledButton: { opacity: 0.65, cursor: "not-allowed" },
  docRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #e5e7eb" },
  docName: { color: "#0f172a" },
  docMeta: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  linkButton: { background: "#fff", color: "#29650B", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "8px 12px", fontWeight: 600, cursor: "pointer" },
  traceItem: { padding: "12px 0", borderBottom: "1px solid #e5e7eb" },
  emptyText: { color: "#64748b", margin: 0 },
};

export default MisBovinos;
