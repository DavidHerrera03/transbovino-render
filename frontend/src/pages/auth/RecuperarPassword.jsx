import { useState } from "react";
import { solicitarRecuperacion } from "../../services/authService";
import { emailInputProps, validateContactFields } from "../../utils/formValidators";
import { AuthShell, IconInput, authStyles as styles } from "../../components/auth/AuthShell";

function RecuperarPassword({ irALogin, volverALogin }) {
  const volver = irALogin || volverALogin;
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    const validationError = validateContactFields({ correo, telefonoRequired: false });
    if (validationError) {
      setMensaje(validationError);
      return;
    }

    try {
      const respuesta = await solicitarRecuperacion(correo);
      setMensaje(
        respuesta?.mensaje ||
          "Si el correo existe, se envió el enlace de recuperación."
      );
    } catch (err) {
      setError(err?.message || "No se pudo procesar la recuperación.");
    }
  };

  return (
    <AuthShell
      title="Olvidé mi contraseña"
      subtitle="Ingresa tu correo registrado y te enviaremos el enlace de recuperación si el usuario existe."
    >
      <form onSubmit={handleSubmit} style={styles.content}>
        <IconInput
          icon="mail"
          iconColor="#000000"
          placeholder="Correo electrónico"
          {...emailInputProps(correo, setCorreo)}
        />

        <button type="submit" style={styles.button}>
          Enviar correo
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

export default RecuperarPassword;
