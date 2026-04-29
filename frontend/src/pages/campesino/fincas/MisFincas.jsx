import { useEffect, useMemo, useState } from "react";
import CampesinoLayout from "../CampesinoLayout";
import { eliminarFinca, obtenerFincasUsuario } from "../../../services/fincaService";

function MisFincas({ usuario, salir, setVistaInterna, vistaInterna, setFincaSeleccionada }) {
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accionandoId, setAccionandoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await obtenerFincasUsuario(usuario.id_usuario);
      setFincas(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuario?.id_usuario) cargar();
  }, [usuario]);

  const fincasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return fincas;
    return fincas.filter((finca) => [finca.nombre_finca, finca.municipio, finca.vereda, finca.referencia]
      .filter(Boolean)
      .some((valor) => String(valor).toLowerCase().includes(term)));
  }, [busqueda, fincas]);

  const onEditar = (finca) => {
    setFincaSeleccionada?.(finca);
    setVistaInterna("editarFinca");
  };

  const onEliminar = async (finca) => {
    const ok = window.confirm(`¿Seguro que deseas eliminar la finca ${finca.nombre_finca}?`);
    if (!ok) return;
    try {
      setAccionandoId(finca.id_finca);
      await eliminarFinca(finca.id_finca, usuario.id_usuario);
      await cargar();
      alert("Finca eliminada correctamente");
    } catch (error) {
      alert(error.message || "No se pudo eliminar la finca");
    } finally {
      setAccionandoId(null);
    }
  };

  return (
    <CampesinoLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaInterna={vistaInterna}>
      <div style={styles.page}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Mis fincas</h1>
            <p style={styles.pageText}>Consulta tus fincas registradas, revisa sus datos principales y actualízalas cuando lo necesites.</p>
          </div>
          <div style={styles.headerActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => setVistaInterna("dashboard")}>Volver</button>
            <button type="button" style={styles.primaryButton} onClick={() => setVistaInterna("agregarFinca")}>Añadir finca</button>
          </div>
        </div>

        <div style={styles.filtersCard}>
          <input
            type="text"
            placeholder="Buscar por nombre, municipio, vereda o referencia..."
            style={styles.input}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={styles.emptyCard}>Cargando fincas...</div>
        ) : fincasFiltradas.length === 0 ? (
          <div style={styles.emptyCard}>No hay fincas para mostrar con los filtros actuales.</div>
        ) : (
          <div style={styles.grid}>
            {fincasFiltradas.map((finca) => (
              <div key={finca.id_finca} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <h3 style={styles.cardTitle}>{finca.nombre_finca}</h3>
                    <p style={styles.cardSubtitle}>{finca.municipio || "Municipio sin registrar"}</p>
                  </div>
                  <span style={styles.status}>Activa</span>
                </div>
                <div style={styles.infoGrid}>
                  <p style={styles.text}><strong>Municipio:</strong> {finca.municipio || "-"}</p>
                  <p style={styles.text}><strong>Vereda:</strong> {finca.vereda || "-"}</p>
                </div>
                <p style={styles.obs}><strong>Referencia:</strong> {finca.referencia || "Sin referencia"}</p>
                <div style={styles.cardActions}>
                  <button style={styles.editButton} onClick={() => onEditar(finca)}>Actualizar finca</button>
                  <button
                    style={{ ...styles.deleteButton, ...(accionandoId === finca.id_finca ? styles.disabledButton : {}) }}
                    onClick={() => onEliminar(finca)}
                    disabled={accionandoId === finca.id_finca}
                  >
                    {accionandoId === finca.id_finca ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  filtersCard: { background: "rgba(255,255,255,0.55)", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px", marginBottom: "18px", backdropFilter: "blur(6px)" },
  input: { width: "100%", borderRadius: "12px", border: "1px solid #cbd5e1", padding: "12px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  emptyCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "22px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "18px", boxShadow: "0 4px 14px rgba(15,23,42,0.04)" },
  cardTop: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "14px" },
  cardTitle: { margin: 0, fontSize: "28px", lineHeight: 1.1, color: "#0f172a" },
  cardSubtitle: { margin: "8px 0 0", color: "#64748b" },
  status: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px 10px", borderRadius: "999px", fontWeight: 700, fontSize: "12px", background: "#dcfce7", color: "#166534" },
  infoGrid: { display: "grid", gap: "6px", marginBottom: "8px" },
  text: { margin: 0, color: "#475569" },
  obs: { margin: "8px 0 0", color: "#334155" },
  cardActions: { display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" },
  editButton: { background: "#29650B", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  deleteButton: { background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  disabledButton: { opacity: 0.7, cursor: "not-allowed" },
};

export default MisFincas;
