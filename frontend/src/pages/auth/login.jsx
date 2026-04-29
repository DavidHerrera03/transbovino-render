import { useState } from "react";
import { loginUser } from "../../services/authService";
import { AuthShell, IconInput, authStyles as styles } from "../../components/auth/AuthShell";

function Login({ irARegistro, irARecuperar, onLoginExitoso }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await loginUser({ usuario, password });
      onLoginExitoso(data);
    } catch {
      setError("Usuario o contraseña incorrecta");
    }
  };

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Ingresa tus datos para acceder a TransBovino."
    >
      <form onSubmit={handleSubmit} style={styles.content}>
        <IconInput
          type="text"
          icon="user"
          iconColor="#000000"
          placeholder="Correo o cédula"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          required
        />

        <IconInput
          type="password"
          icon="lock"
          iconColor="#000000"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div style={styles.rowLinks}>
          <span onClick={irARegistro} style={styles.textLink}>
            Registrarse
          </span>
          <span onClick={irARecuperar} style={styles.textLink}>
            Olvidé mi contraseña
          </span>
        </div>

        <button type="submit" style={styles.button}>
          Entrar
        </button>

        {error ? <p style={styles.error}>{error}</p> : null}
      </form>
    </AuthShell>
  );
}

export default Login;