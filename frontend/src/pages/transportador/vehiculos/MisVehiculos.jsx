import { useEffect, useState } from "react";
import TransportadorLayout from "../TransportadorLayout";
import {
  getVehiculos,
  eliminarVehiculo,
  subirDocumentacionVehiculo,
  getDocumentosVehiculo,
  getUrlDocumentoVehiculo,
  eliminarDocumentoVehiculo,
} from "../../../services/vehiculoService";
import VehiculoCard from "../../../components/VehiculoCard";

function MisVehiculos({ usuario, salir, setVistaInterna, vistaInterna }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);
  const [documentosVehiculo, setDocumentosVehiculo] = useState([]);
  const [vehiculoDocumentos, setVehiculoDocumentos] = useState(null);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [eliminandoDocumentoId, setEliminandoDocumentoId] = useState(null);

  const cargarVehiculos = async () => {
    if (!usuario?.id_usuario) return;
    try {
      setCargando(true);
      const data = await getVehiculos(usuario.id_usuario);
      setVehiculos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando vehículos:", error);
      setVehiculos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarVehiculos();
  }, [usuario]);

  const handleDelete = async (vehiculo) => {
    const confirmar = window.confirm(`¿Seguro que deseas eliminar el vehículo con placa ${vehiculo.placa}? Esta acción quitará el registro de la base de datos.`);
    if (!confirmar) return;

    try {
      setEliminandoId(vehiculo.id_vehiculo);
      await eliminarVehiculo(vehiculo.id_vehiculo, usuario.id_usuario);
      await cargarVehiculos();
      alert("Vehículo eliminado correctamente");
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo eliminar el vehículo");
    } finally {
      setEliminandoId(null);
    }
  };

  const handleViewDocuments = async (vehiculo) => {
    try {
      setVehiculoDocumentos(vehiculo);
      setCargandoDocumentos(true);
      const docs = await getDocumentosVehiculo(vehiculo.id_vehiculo, usuario.id_usuario);
      setDocumentosVehiculo(Array.isArray(docs) ? docs : []);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo cargar la documentación");
    } finally {
      setCargandoDocumentos(false);
    }
  };

  const handleOpenDocument = async (documento) => {
    if (!vehiculoDocumentos) return;
    try {
      const data = await getUrlDocumentoVehiculo(vehiculoDocumentos.id_vehiculo, documento.id, usuario.id_usuario);
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo abrir el documento");
    }
  };

  const closeDocumentsModal = () => {
    setVehiculoDocumentos(null);
    setDocumentosVehiculo([]);
    setCargandoDocumentos(false);
    setEliminandoDocumentoId(null);
  };

  const handleDeleteDocument = async (documento) => {
    if (!vehiculoDocumentos) return;
    const confirmar = window.confirm(`¿Deseas eliminar el documento ${documento.nombre_archivo}?`);
    if (!confirmar) return;

    try {
      setEliminandoDocumentoId(documento.id);
      await eliminarDocumentoVehiculo(vehiculoDocumentos.id_vehiculo, documento.id, usuario.id_usuario);
      const docs = await getDocumentosVehiculo(vehiculoDocumentos.id_vehiculo, usuario.id_usuario);
      setDocumentosVehiculo(Array.isArray(docs) ? docs : []);
      await cargarVehiculos();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo eliminar el documento");
    } finally {
      setEliminandoDocumentoId(null);
    }
  };

  const handleUploadDocuments = async (vehiculo, files) => {
    try {
      setSubiendoId(vehiculo.id_vehiculo);
      await subirDocumentacionVehiculo(vehiculo.id_vehiculo, usuario.id_usuario, files);
      await cargarVehiculos();
      alert("Documentación cargada correctamente en Firebase Storage");
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo cargar la documentación");
    } finally {
      setSubiendoId(null);
    }
  };

  return (
    <TransportadorLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaInterna={vistaInterna}>
      <div style={styles.page}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Mis vehículos</h1>
            <p style={styles.pageText}>Consulta tus vehículos registrados y administra su documentación desde un solo lugar.</p>
          </div>
          <div style={styles.headerActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => setVistaInterna("dashboard")}>Volver</button>
            <button type="button" style={styles.primaryButton} onClick={() => setVistaInterna("agregarVehiculo")}>Agregar vehículo</button>
          </div>
        </div>

        {cargando ? (
          <div style={styles.emptyCard}>Cargando vehículos...</div>
        ) : vehiculos.length === 0 ? (
          <div style={styles.emptyCard}>Todavía no has registrado vehículos.</div>
        ) : (
          <div style={styles.grid}>
            {vehiculos.map((vehiculo) => (
              <VehiculoCard
                key={vehiculo.id_vehiculo}
                vehiculo={vehiculo}
                deleting={eliminandoId === vehiculo.id_vehiculo}
                uploading={subiendoId === vehiculo.id_vehiculo}
                onDelete={handleDelete}
                onUploadDocuments={handleUploadDocuments}
                onViewDocuments={handleViewDocuments}
              />
            ))}
          </div>
        )}
      </div>

      {vehiculoDocumentos ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Documentos de {vehiculoDocumentos.placa}</h3>
                <p style={styles.modalText}>{vehiculoDocumentos.tipo_vehiculo} · {vehiculoDocumentos.marca} {vehiculoDocumentos.modelo}</p>
              </div>
              <button type="button" style={styles.closeButton} onClick={closeDocumentsModal}>Cerrar</button>
            </div>

            {cargandoDocumentos ? (
              <p style={styles.emptyText}>Cargando documentos...</p>
            ) : documentosVehiculo.length === 0 ? (
              <p style={styles.emptyText}>Este vehículo todavía no tiene documentos cargados.</p>
            ) : (
              <div style={styles.docsList}>
                {documentosVehiculo.map((documento) => (
                  <div key={documento.id} style={styles.docItem}>
                    <div>
                      <strong>{documento.nombre_archivo}</strong>
                      <div style={styles.docMeta}>
                        {documento.created_at ? new Date(documento.created_at).toLocaleString() : "Sin fecha"}
                      </div>
                    </div>
                    <div style={styles.docActions}>
                      <button type="button" style={styles.openButton} onClick={() => handleOpenDocument(documento)}>
                        Ver documento
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.deleteDocButton,
                          ...(eliminandoDocumentoId === documento.id ? styles.disabledButton : {}),
                        }}
                        disabled={eliminandoDocumentoId === documento.id}
                        onClick={() => handleDeleteDocument(documento)}
                      >
                        {eliminandoDocumentoId === documento.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </TransportadorLayout>
  );
}

const styles = {
  page: { padding: "28px 24px" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "24px" },
  pageTitle: { margin: 0, fontSize: "28px", color: "#0f172a" },
  pageText: { margin: "8px 0 0", color: "#64748b", maxWidth: "760px" },
  headerActions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  primaryButton: { background: "#0B5FA5", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 16px", fontWeight: 600, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "10px", padding: "11px 16px", fontWeight: 600, cursor: "pointer" },
  emptyCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "22px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 999 },
  modal: { background: "#fff", width: "min(720px, 100%)", maxHeight: "80vh", overflowY: "auto", borderRadius: "18px", padding: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "12px" },
  modalTitle: { margin: 0, fontSize: "22px", color: "#0f172a" },
  modalText: { margin: "6px 0 0", color: "#64748b" },
  closeButton: { border: "1px solid #d1d5db", background: "#fff", borderRadius: "10px", padding: "10px 14px", cursor: "pointer" },
  docsList: { display: "flex", flexDirection: "column", gap: "12px" },
  docItem: { border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  docMeta: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  docActions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  openButton: { background: "#0B5FA5", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", fontWeight: 600 },
  deleteDocButton: { background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", cursor: "pointer", fontWeight: 600 },
  disabledButton: { opacity: 0.7, cursor: "not-allowed" },
  emptyText: { color: "#475569" },
};

export default MisVehiculos;
