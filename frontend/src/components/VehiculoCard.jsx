import { useRef } from "react";

function VehiculoCard({ vehiculo, onDelete, onUploadDocuments, onViewDocuments, deleting = false, uploading = false }) {
  const inputRef = useRef(null);

  const abrirSelectorDocumentos = () => {
    inputRef.current?.click();
  };

  const manejarArchivos = async (event) => {
    const files = event.target.files;
    if (!files?.length || !onUploadDocuments) return;

    await onUploadDocuments(vehiculo, files);
    event.target.value = "";
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>{vehiculo.tipo_vehiculo}</h3>
      <p><b>Marca:</b> {vehiculo.marca}</p>
      <p><b>Modelo:</b> {vehiculo.modelo}</p>
      <p><b>Carga máxima permitida:</b> {vehiculo.peso_max_prom} kg</p>
      <p><b>Capacidad de bovinos:</b> {vehiculo.capacidad_bovinos}</p>
      <p><b>Placa:</b> {vehiculo.placa}</p>
      <p><b>Estado:</b> {vehiculo.estado_operacion || (vehiculo.disponible ? "Disponible" : "En viaje")}</p>
      <p><b>Documentos cargados:</b> {vehiculo.documentos_count ?? 0}</p>
      <p><b>Descripción:</b> {vehiculo.descripcion || "Sin descripción"}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        hidden
        onChange={manejarArchivos}
      />

      <div style={styles.actions}>
        <button
          type="button"
          style={{ ...styles.docButton, ...(uploading ? styles.disabledButton : {}) }}
          disabled={uploading}
          onClick={abrirSelectorDocumentos}
        >
          {uploading ? "Cargando..." : "Agregar documentación"}
        </button>

        <button
          type="button"
          style={styles.viewButton}
          onClick={() => onViewDocuments?.(vehiculo)}
        >
          Ver documentos
        </button>

        <button
          type="button"
          style={{
            ...styles.deleteButton,
            ...((deleting || !vehiculo.disponible) ? styles.disabledButton : {}),
          }}
          disabled={deleting || !vehiculo.disponible}
          onClick={() => onDelete?.(vehiculo)}
          title={!vehiculo.disponible ? "No puedes eliminar un vehículo con un viaje activo" : "Eliminar vehículo"}
        >
          {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  title: { marginTop: 0, marginBottom: "12px", color: "#1b4332" },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  docButton: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  viewButton: {
    border: "1px solid #2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "#fff",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};

export default VehiculoCard;
