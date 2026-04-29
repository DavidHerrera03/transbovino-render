import { useEffect, useMemo, useState } from "react";
import CampesinoLayout from "../CampesinoLayout";
import PasswordInput from "../../../components/PasswordInput";
import { emailInputProps, formatColombianPhone, normalizePhone, phoneInputProps, validateContactFields } from "../../../utils/formValidators";
import { getPasswordHelpText, validatePasswordStrength } from "../../../utils/passwordValidators";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Perfil({ usuario, salir, setVistaInterna }) {
  const [form, setForm] = useState({ nombre: "", apellido: "", correo: "", telefono: "", password: "", cedula: "" });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const res = await fetch(`${API_URL}/perfil/${usuario.id_usuario}`);
      const data = await res.json();
      if (data?.usuario) {
        setForm({
          nombre: data.usuario.nombre || "",
          apellido: data.usuario.apellido || "",
          correo: data.usuario.correo || "",
          telefono: formatColombianPhone(data.usuario.telefono || ""),
          password: "",
          cedula: data.usuario.id_usuario || usuario.id_usuario || "",
        });
      }
    };
    if (usuario?.id_usuario) cargarDatos();
  }, [usuario]);

  const resumen = useMemo(() => ([
    { label: "Nombre", value: `${form.nombre || ""} ${form.apellido || ""}`.trim() },
    { label: "Correo", value: form.correo },
    { label: "Cédula", value: form.cedula },
    { label: "Rol", value: usuario?.rol || "campesino" },
    { label: "Estado del módulo", value: "Activo" },
    { label: "Teléfono", value: form.telefono },
  ]), [form, usuario]);

  const handleGuardar = async (e) => {
    e.preventDefault();
    const validationError = validateContactFields({ telefono: normalizePhone(form.telefono), correo: form.correo });
    if (validationError) {
      alert(validationError);
      return;
    }

    if (form.password && !validatePasswordStrength(form.password)) {
      alert(getPasswordHelpText(form.password));
      return;
    }

    try {
      setGuardando(true);
      const body = {
        nombre: form.nombre,
        apellido: form.apellido,
        correo: form.correo,
        telefono: normalizePhone(form.telefono),
        password: form.password,
      };
      const res = await fetch(`${API_URL}/perfil/${usuario.id_usuario}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.detail || "No se pudo actualizar la información");
        return;
      }
      alert("Actualizado correctamente");
      setForm((prev) => ({ ...prev, password: "" }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <CampesinoLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna}>
      <div style={styles.topHeader}>
        <h2 style={styles.pageTitle}>Perfil del campesino</h2>
        <p style={styles.pageText}>Actualiza tu información y revisa el resumen de tu cuenta desde un solo lugar.</p>
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Actualizar información</h3>
          <form onSubmit={handleGuardar} style={styles.formGrid}>
            <Field label="Nombre"><input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required /></Field>
            <Field label="Apellido"><input value={form.apellido} onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))} required /></Field>
            <Field label="Correo"><input {...emailInputProps(form.correo, (value) => setForm((p) => ({ ...p, correo: value })))} /></Field>
            <Field label="Teléfono"><input {...phoneInputProps(form.telefono, (value) => setForm((p) => ({ ...p, telefono: value })))} /></Field>
            <Field label="Cédula"><input value={form.cedula} disabled /></Field>
            <Field label="Rol"><input value={usuario?.rol || "campesino"} disabled /></Field>
            <Field label="Contraseña" fullWidth>
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Solo si desea cambiarla"
                inputStyle={styles.control}
                helpText={getPasswordHelpText(form.password, true)}
                helpTone={form.password && validatePasswordStrength(form.password) ? "success" : "neutral"}
              />
            </Field>
            <div style={styles.actions}>
              <button type="submit" style={styles.primaryBtn} disabled={guardando}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </form>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Resumen del perfil</h3>
          <div style={styles.profileGrid}>
            {resumen.map((item) => (
              <ProfileItem key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      </div>
    </CampesinoLayout>
  );
}

function Field({ label, children, fullWidth = false }) {
  const child = children?.type
    ? { ...children, props: { ...children.props, style: { ...(children.props?.style || {}), ...styles.control } } }
    : children;
  return <label style={{ ...styles.field, ...(fullWidth ? styles.fullWidth : {}) }}><span>{label}</span>{child}</label>;
}

function ProfileItem({ label, value }) {
  return <div style={styles.profileItem}><span style={styles.profileLabel}>{label}</span><strong>{value || "-"}</strong></div>;
}

const styles = {
  topHeader: { marginBottom: 18 },
  pageTitle: { margin: 0, fontSize: 28, color: "#1F2937" },
  pageText: { margin: "8px 0 0", color: "#64748B" },
  contentGrid: { display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", gap: 20, alignItems: "start" },
  card: { background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 10px 25px rgba(15,23,42,0.06)", minWidth: 0, boxSizing: "border-box" },
  sectionTitle: { margin: "0 0 16px", fontSize: 18, color: "#1E293B" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, width: "100%" },
  field: { display: "flex", flexDirection: "column", gap: 6, color: "#334155", fontWeight: 600, fontSize: 14, minWidth: 0 },
  fullWidth: { gridColumn: "1 / -1" },
  control: { width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #D0D5DD", fontSize: 14, fontFamily: "inherit", minHeight: 42, background: "#fff" },
  actions: { display: "flex", gap: 10, alignItems: "center", gridColumn: "1 / -1", marginTop: 8 },
  primaryBtn: { background: "#29650B", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 },
  profileItem: { background: "#F8FAFC", borderRadius: 14, padding: 16, minHeight: 76, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 },
  profileLabel: { color: "#64748B", fontSize: 14 },
};

export default Perfil;
