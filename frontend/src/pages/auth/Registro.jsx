import { useState } from "react";
import { registerUser } from "../../services/authService";
import { AuthShell, IconInput, authStyles as styles } from "../../components/auth/AuthShell";
import { emailInputProps, normalizePhone, phoneInputProps, validateContactFields } from "../../utils/formValidators";
import { getPasswordHelpText, validatePasswordStrength } from "../../utils/passwordValidators";

function Registro({ irALogin }) {
  const [form, setForm] = useState({
    identificacion: "",
    nombre: "",
    apellido: "",
    correo: "",
    password: "",
    telefono: "",
    rol: "",
  });

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const interpretarErrorRegistro = (message = "") => {
    const texto = String(message || "");
    const lower = texto.toLowerCase();

    if (lower.includes("correo")) {
      return {
        general: "No se pudo registrar el usuario. Revisa el correo.",
        fields: { correo: texto },
      };
    }

    if (lower.includes("cédula") || lower.includes("cedula") || lower.includes("id_usuario")) {
      return {
        general: "No se pudo registrar el usuario. Revisa la cédula.",
        fields: { identificacion: texto },
      };
    }

    if (lower.includes("teléfono") || lower.includes("telefono")) {
      return {
        general: "No se pudo registrar el usuario. Revisa el teléfono.",
        fields: { telefono: texto },
      };
    }

    if (lower.includes("contraseña") || lower.includes("password")) {
      return {
        general: "No se pudo registrar el usuario. Revisa la contraseña.",
        fields: { password: texto },
      };
    }

    return { general: texto || "No se pudo registrar el usuario.", fields: {} };
  };

  const handleChange = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
    setFieldErrors((prev) => ({ ...prev, [campo]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setFieldErrors({});

    const validationError = validateContactFields({ telefono: form.telefono, correo: form.correo });
    if (!validatePasswordStrength(form.password)) {
      const msg = getPasswordHelpText(form.password);
      setFieldErrors({ password: msg });
      setError("No se pudo registrar el usuario. Revisa la contraseña.");
      return;
    }
    if (validationError) {
      const lower = validationError.toLowerCase();
      if (lower.includes("correo")) {
        setFieldErrors({ correo: validationError });
      } else if (lower.includes("teléfono") || lower.includes("telefono")) {
        setFieldErrors({ telefono: validationError });
      }
      setError(validationError);
      return;
    }

    try {
      await registerUser({
        ...form,
        id_usuario: Number(form.identificacion),
        telefono: normalizePhone(form.telefono),
      });
      setMensaje("Registro exitoso. Ahora puedes iniciar sesión.");

      setForm({
        identificacion: "",
        nombre: "",
        apellido: "",
        correo: "",
        password: "",
        telefono: "",
        rol: "",
      });
    } catch (err) {
      const { general, fields } = interpretarErrorRegistro(err?.message);
      setFieldErrors(fields);
      setError(general);
    }
  };

  return (
    <AuthShell
      title="Registro"
      subtitle="Crea tu cuenta con el mismo estilo del login y conserva el fondo de TransBovino."
    >
      <form onSubmit={handleSubmit} style={styles.content}>
        <IconInput
          type="text"
          icon="cedula"
          iconColor="#000000"
          placeholder="Cédula"
          value={form.identificacion}
          onChange={(e) => handleChange("identificacion", e.target.value.replace(/\D/g, ""))}
          required
          helpText={fieldErrors.identificacion}
          helpTone="error"
        />

        <IconInput
          type="text"
          icon="user"
          iconColor="#000000"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          required
        />

        <IconInput
          type="text"
          icon="user"
          iconColor="#000000"
          placeholder="Apellido"
          value={form.apellido}
          onChange={(e) => handleChange("apellido", e.target.value)}
          required
        />

        <IconInput
          icon="mail"
          iconColor="#000000"
          placeholder="Correo"
          {...emailInputProps(form.correo, (value) => handleChange("correo", value))}
          helpText={fieldErrors.correo}
          helpTone="error"
        />

        <IconInput
          type="password"
          icon="lock"
          iconColor="#000000"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          required
          helpText={fieldErrors.password || getPasswordHelpText(form.password)}
          helpTone={fieldErrors.password ? "error" : validatePasswordStrength(form.password) ? "success" : "neutral"}
        />

        <IconInput
          icon="phone"
          iconColor="#000000"
          {...phoneInputProps(form.telefono, (value) => handleChange("telefono", value))}
          helpText={fieldErrors.telefono}
          helpTone="error"
        />

        <select
          value={form.rol}
          onChange={(e) => handleChange("rol", e.target.value)}
          style={styles.select}
          required
        >
          <option value="">Seleccione rol</option>
          <option value="campesino">Campesino</option>
          <option value="transportador">Transportador</option>
          <option value="administrador">Administrador</option>
        </select>

        <button type="submit" style={styles.button}>
          Registrarse
        </button>

        <button
          type="button"
          onClick={irALogin}
          style={styles.secondaryButton}
        >
          Volver al login
        </button>

        {mensaje ? <p style={styles.success}>{mensaje}</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}
      </form>
    </AuthShell>
  );
}

export default Registro;
