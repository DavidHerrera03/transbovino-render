import { useState } from "react";
import CampesinoLayout from "../CampesinoLayout";
import { crearFinca } from "../../../services/fincaService";
import { VEREDAS_ZIPAQUIRA } from "../../../constants/VeredasTarifas";

function AgregarFinca({ usuario, salir, setVistaInterna, vistaInterna }) {
  const [form, setForm] = useState({ nombre_finca: "", vereda: "", referencia: "" });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await crearFinca({
        id_usuario: usuario.id_usuario,
        nombre_finca: form.nombre_finca,
        municipio: "Zipaquira",
        vereda: form.vereda,
        referencia: form.referencia,
      });
      alert("Finca creada correctamente");
      setVistaInterna("misFincas");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <CampesinoLayout
      usuario={usuario}
      salir={salir}
      setVistaInterna={setVistaInterna}
      vistaInterna={vistaInterna}
    >
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>Añadir finca</h1>
          <button style={styles.secondaryButton} onClick={() => setVistaInterna("fincas")}>Volver</button>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Nombre de la finca</label>
              <input type="text" name="nombre_finca" value={form.nombre_finca} onChange={handleChange} style={styles.input} required />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Municipio</label>
              <input type="text" value="Zipaquira" style={styles.input} disabled />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Vereda</label>
              <select name="vereda" value={form.vereda} onChange={handleChange} style={styles.input} required>
                <option value="">Seleccione una vereda</option>
                {VEREDAS_ZIPAQUIRA.map((vereda) => (
                  <option key={vereda} value={vereda}>{vereda}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Referencia</label>
              <input type="text" name="referencia" value={form.referencia} onChange={handleChange} style={styles.input} required />
            </div>

            <button type="submit" style={styles.primaryButton}>Guardar finca</button>
          </form>
        </div>
      </div>
    </CampesinoLayout>
  );
}

const styles = {
  page: { padding: "28px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px" },
  title: { margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "24px", maxWidth: "760px" },
  form: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontWeight: 600, color: "#334155" },
  input: { width: "100%", height: "46px", border: "1px solid #dbe1ea", borderRadius: "12px", padding: "0 14px", fontSize: "15px", background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" },
  primaryButton: { background: "#29650B", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 16px", fontSize: "14px", fontWeight: 600, cursor: "pointer", width: "fit-content", marginTop: "8px" },
  secondaryButton: { background: "#fff", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "10px", padding: "11px 16px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
};

export default AgregarFinca;
