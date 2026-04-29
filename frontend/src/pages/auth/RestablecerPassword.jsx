import { useMemo, useState } from "react";
import { restablecerPassword } from "../../services/authService";
import { AuthShell, IconInput, authStyles as styles } from "../../components/auth/AuthShell";
import { getPasswordHelpText, validatePasswordStrength } from "../../utils/passwordValidators";

function RestablecerPassword({ token: tokenProp, irALogin, volverALogin }) {
  const volver = irALogin || volverALogin;
  const token = useMemo(() => {
    if (tokenProp) return tokenProp;
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, [tokenProp]);

  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!token) {
      setError("El enlace de recuperación no es válido.");
      return;
    }

    if (!validatePasswordStrength(password)) {
      setError(getPasswordHelpText(password));
      return;
    }

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      const respuesta = await restablecerPassword({ token, password });
      setMensaje(respuesta?.mensaje || "Contraseña actualizada correctamente.");
    } catch (err) {
      setError(err?.message || "No se pudo restablecer la contraseña.");
    }
  };

  return (
    <AuthShell
      title="Restablecer contraseña"
      subtitle="Escribe tu nueva contraseña para actualizar el acceso a tu cuenta."
    >
      <form onSubmit={handleSubmit} style={styles.content}>
        <IconInput
          type="password"
          icon="lock"
          iconColor="#000000"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          helpText={getPasswordHelpText(password)}
          helpTone={validatePasswordStrength(password) ? "success" : "neutral"}
        />

        <IconInput
          type="password"
          icon="lock"
          iconColor="#000000"
          placeholder="Confirmar contraseña"
          value={confirmarPassword}
          onChange={(e) => setConfirmarPassword(e.target.value)}
          required
          helpText={confirmarPassword && password === confirmarPassword ? "Las contraseñas coinciden." : "Debe coincidir con la nueva contraseña."}
          helpTone={confirmarPassword && password === confirmarPassword ? "success" : "neutral"}
        />

        <button type="submit" style={styles.button}>
          Guardar contraseña
        </button>

        <button
          type="button"
          onClick={volver}
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

export default RestablecerPassword;
