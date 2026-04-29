import { useEffect, useMemo, useState } from "react";
import CampesinoLayout from "../CampesinoLayout";
import { actualizarBovino, crearBovino } from "../../../services/bovinoService";
import { getFincasUsuario } from "../../../services/fincaService";

const formInicial = {
  codigo_bovino: "",
  raza: "",
  peso_promedio: "",
  edad: "",
  observaciones: "",
  id_finca: "",
};

function RegistrarBovino({ usuario, salir, setVistaInterna, vistaInterna, modo = "crear", bovinoSeleccionado, setBovinoSeleccionado }) {
  const esEdicion = modo === "editar";
  const [form, setForm] = useState(formInicial);
  const [fincas, setFincas] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (usuario?.id_usuario) getFincasUsuario(usuario.id_usuario).then(setFincas).catch(console.error);
  }, [usuario]);

  useEffect(() => {
    if (esEdicion && bovinoSeleccionado) {
      setForm({
        codigo_bovino: bovinoSeleccionado.codigo_bovino?.toString() || "",
        raza: bovinoSeleccionado.raza || "",
        peso_promedio: bovinoSeleccionado.peso_promedio?.toString() || "",
        edad: bovinoSeleccionado.edad?.toString() || "",
        observaciones: bovinoSeleccionado.observaciones || "",
        id_finca: bovinoSeleccionado.id_finca?.toString() || "",
      });
      return;
    }

    if (!esEdicion) {
      setForm(formInicial);
    }
  }, [esEdicion, bovinoSeleccionado]);

  const titulo = useMemo(() => {
    if (!esEdicion) return "Registrar bovino";
    return bovinoSeleccionado?.codigo_bovino ? `Actualizar bovino #${bovinoSeleccionado.codigo_bovino}` : "Actualizar bovino";
  }, [esEdicion, bovinoSeleccionado]);

  const volverListado = () => {
    if (typeof setBovinoSeleccionado === "function") {
      setBovinoSeleccionado(null);
    }
    setVistaInterna("bovinos");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (esEdicion && !bovinoSeleccionado?.id_bovino) {
      alert("No se seleccionó un bovino para actualizar.");
      volverListado();
      return;
    }

    const payload = {
      ...form,
      codigo_bovino: parseInt(form.codigo_bovino, 10),
      peso_promedio: parseFloat(form.peso_promedio),
      edad: parseInt(form.edad, 10),
      id_finca: parseInt(form.id_finca, 10),
      id_usuario: usuario.id_usuario,
      estado: "activo",
    };

    try {
      setGuardando(true);
      const result = esEdicion
        ? await actualizarBovino(bovinoSeleccionado.id_bovino, payload)
        : await crearBovino(payload);

      if (!result.ok) {
        alert(result.detail || (esEdicion ? "No se pudo actualizar el bovino" : "No se pudo registrar el bovino"));
        return;
      }

      alert(esEdicion ? "Información del bovino actualizada correctamente" : "Bovino registrado correctamente");
      if (esEdicion) {
        volverListado();
      } else {
        setForm(formInicial);
      }
    } catch (error) {
      alert(error.message || (esEdicion ? "No se pudo actualizar el bovino" : "No se pudo registrar el bovino"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <CampesinoLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaInterna={vistaInterna}>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{titulo}</h1>
            <p style={styles.subtitle}>{esEdicion ? "Modifica los datos principales del animal registrado." : "Registra los datos básicos del animal en una de tus fincas."}</p>
          </div>
          <button style={styles.secondaryButton} onClick={volverListado}>Volver</button>
        </div>

        {esEdicion && !bovinoSeleccionado ? (
          <div style={styles.card}>No se seleccionó ningún bovino para actualizar.</div>
        ) : (
          <div style={styles.card}>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Finca</label>
                <select value={form.id_finca} onChange={(e) => setForm((p) => ({ ...p, id_finca: e.target.value }))} style={styles.input} required>
                  <option value="">Seleccione la finca</option>
                  {fincas.map((finca) => <option key={finca.id_finca} value={finca.id_finca}>{finca.nombre_finca}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Número de bovino</label>
                <input type="number" min="1" value={form.codigo_bovino} onChange={(e) => setForm((p) => ({ ...p, codigo_bovino: e.target.value }))} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Raza</label>
                <input type="text" value={form.raza} onChange={(e) => setForm((p) => ({ ...p, raza: e.target.value }))} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Peso promedio (kg)</label>
                <input type="number" min="1" step="0.01" value={form.peso_promedio} onChange={(e) => setForm((p) => ({ ...p, peso_promedio: e.target.value }))} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Edad</label>
                <input type="number" min="0" value={form.edad} onChange={(e) => setForm((p) => ({ ...p, edad: e.target.value }))} style={styles.input} required />
              </div>
              <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                <label style={styles.label}>Observaciones</label>
                <textarea value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} style={styles.textarea} required />
              </div>
              <button type="submit" style={{ ...styles.primaryButton, ...(guardando ? styles.disabledButton : {}) }} disabled={guardando}>
                {guardando ? "Guardando..." : esEdicion ? "Actualizar información" : "Guardar bovino"}
              </button>
            </form>
          </div>
        )}
      </div>
    </CampesinoLayout>
  );
}

const styles = {
  page: { padding: "28px 24px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "24px" },
  title: { margin: 0, fontSize: "20px", fontWeight: 700, color: "#0f172a" },
  subtitle: { margin: "8px 0 0", color: "#64748b" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "24px", maxWidth: "760px" },
  form: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontWeight: 600, color: "#334155" },
  input: { width: "100%", height: "46px", border: "1px solid #dbe1ea", borderRadius: "12px", padding: "0 14px", fontSize: "15px", background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: "100px", border: "1px solid #dbe1ea", borderRadius: "12px", padding: "12px 14px", fontSize: "15px", background: "#f8fafc", color: "#0f172a", boxSizing: "border-box" },
  primaryButton: { background: "#29650B", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 16px", fontSize: "14px", fontWeight: 600, cursor: "pointer", width: "fit-content", marginTop: "8px" },
  secondaryButton: { background: "#fff", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: "10px", padding: "11px 16px", fontSize: "14px", fontWeight: 600, cursor: "pointer" },
  disabledButton: { opacity: 0.65, cursor: "not-allowed" },
};

export default RegistrarBovino;
