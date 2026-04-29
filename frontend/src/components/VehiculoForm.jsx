import { useMemo, useState } from "react";
import { crearVehiculo } from "../services/vehiculoService";
import { VEHICULO_CONFIG, getVehiculoConfig, validarRangoVehiculo } from "../constants/vehiculoConfig";

function VehiculoForm({ usuario, onSuccess }) {
  const [form, setForm] = useState({
    tipo_vehiculo: "",
    marca: "",
    modelo: "",
    peso_max_prom: "",
    capacidad_bovinos: "",
    placa: "",
    descripcion: "",
  });
  const [guardando, setGuardando] = useState(false);

  const configSeleccionada = useMemo(
    () => getVehiculoConfig(form.tipo_vehiculo),
    [form.tipo_vehiculo],
  );

  const errores = useMemo(() => {
    if (!form.tipo_vehiculo || form.peso_max_prom === "" || form.capacidad_bovinos === "") {
      return { cargaError: "", bovinosError: "" };
    }
    return validarRangoVehiculo(form.tipo_vehiculo, form.peso_max_prom, form.capacidad_bovinos);
  }, [form.capacidad_bovinos, form.peso_max_prom, form.tipo_vehiculo]);

  const formularioValido =
    Boolean(form.tipo_vehiculo) &&
    Boolean(form.marca.trim()) &&
    Boolean(form.modelo) &&
    Boolean(form.peso_max_prom) &&
    Boolean(form.capacidad_bovinos) &&
    Boolean(form.placa.trim()) &&
    Boolean(form.descripcion.trim()) &&
    !errores.cargaError &&
    !errores.bovinosError;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "tipo_vehiculo") {
      const config = getVehiculoConfig(value);
      setForm((prev) => ({
        ...prev,
        tipo_vehiculo: value,
        peso_max_prom: config ? String(config.kgDefault) : "",
        capacidad_bovinos: config ? String(config.bovinosDefault) : "",
        descripcion: config?.descripcion || "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!usuario?.id_usuario) {
      alert("No se encontró el usuario del transportador");
      return;
    }

    if (!formularioValido) {
      alert("Debes completar el formulario y respetar los rangos permitidos para el tipo de vehículo.");
      return;
    }

    try {
      setGuardando(true);
      await crearVehiculo({
        ...form,
        id_usuario: usuario.id_usuario,
        modelo: Number(form.modelo),
        peso_max_prom: Number(form.peso_max_prom),
        capacidad_bovinos: Number(form.capacidad_bovinos),
      });

      alert("Vehículo guardado correctamente");
      setForm({
        tipo_vehiculo: "",
        marca: "",
        modelo: "",
        peso_max_prom: "",
        capacidad_bovinos: "",
        placa: "",
        descripcion: "",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar el vehículo");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.grid}>
        <div style={styles.fieldFull}>
          <label style={styles.label}>Tipo de vehículo</label>
          <select
            name="tipo_vehiculo"
            value={form.tipo_vehiculo}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Seleccione</option>
            {Object.keys(VEHICULO_CONFIG).map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
          {configSeleccionada && (
            <small style={styles.help}>
              Valores sugeridos cargados automáticamente según el tipo seleccionado.
            </small>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Marca del vehículo</label>
          <input
            name="marca"
            value={form.marca}
            onChange={handleChange}
            style={styles.input}
            placeholder="Ej. Chevrolet"
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Modelo</label>
          <input
            name="modelo"
            type="number"
            value={form.modelo}
            onChange={handleChange}
            style={styles.input}
            placeholder="Ej. 2022"
            min="1900"
            max="2100"
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Carga máxima permitida (kg)</label>
          <input
            name="peso_max_prom"
            type="number"
            value={form.peso_max_prom}
            onChange={handleChange}
            style={{
              ...styles.input,
              ...(errores.cargaError ? styles.inputError : {}),
            }}
            placeholder={configSeleccionada ? `Ej. ${configSeleccionada.kgDefault}` : "Selecciona un tipo"}
            min={configSeleccionada?.kgMin}
            max={configSeleccionada?.kgMax}
            required
          />
          {configSeleccionada && (
            <small style={styles.help}>
              Rango permitido: {configSeleccionada.kgMin} a {configSeleccionada.kgMax} kg.
            </small>
          )}
          {errores.cargaError && <small style={styles.error}>{errores.cargaError}</small>}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Capacidad de bovinos</label>
          <input
            name="capacidad_bovinos"
            type="number"
            value={form.capacidad_bovinos}
            onChange={handleChange}
            style={{
              ...styles.input,
              ...(errores.bovinosError ? styles.inputError : {}),
            }}
            placeholder={configSeleccionada ? `Ej. ${configSeleccionada.bovinosDefault}` : "Selecciona un tipo"}
            min={configSeleccionada?.bovinosMin}
            max={configSeleccionada?.bovinosMax}
            required
          />
          {configSeleccionada && (
            <small style={styles.help}>
              Rango permitido: {configSeleccionada.bovinosMin} a {configSeleccionada.bovinosMax} bovinos.
            </small>
          )}
          {errores.bovinosError && <small style={styles.error}>{errores.bovinosError}</small>}
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.label}>Placa</label>
          <input
            name="placa"
            value={form.placa}
            onChange={handleChange}
            style={styles.input}
            placeholder="Ej. ABC123"
            required
          />
        </div>

        <div style={styles.fieldFull}>
          <label style={styles.label}>Descripción</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            style={styles.textarea}
            placeholder="Describe el vehículo o deja la sugerencia cargada"
            rows={4}
            required
          />
        </div>
      </div>

      <button style={{ ...styles.button, ...(guardando || !formularioValido ? styles.buttonDisabled : {}) }} type="submit" disabled={guardando || !formularioValido}>
        {guardando ? "Guardando..." : "Guardar vehículo"}
      </button>
    </form>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  fieldFull: { display: "flex", flexDirection: "column", gap: "8px", gridColumn: "span 2" },
  label: { fontSize: "14px", color: "#444", fontWeight: 600 },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #ccc" },
  inputError: { border: "1px solid #dc2626", background: "#fef2f2" },
  textarea: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    resize: "vertical",
    fontFamily: "inherit",
  },
  help: { color: "#555" },
  error: { color: "#dc2626", fontWeight: 600 },
  button: {
    alignSelf: "flex-start",
    background: "#001B5A",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};

export default VehiculoForm;
