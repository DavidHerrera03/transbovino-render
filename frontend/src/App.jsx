import { useEffect, useState } from "react";
import Login from "./pages/auth/login";
import Registro from "./pages/auth/Registro";
import RecuperarPassword from "./pages/auth/RecuperarPassword";
import RestablecerPassword from "./pages/auth/RestablecerPassword";
import Campesino from "./pages/campesino";
import Transportador from "./pages/transportador";
import Admin from "./pages/admin";

function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vistaParam = params.get("vista");
    const token = params.get("token");

    if (vistaParam === "restablecer" && token) {
      setVista("restablecer");
      return;
    }

    const guardado = localStorage.getItem("usuario");
    if (guardado) {
      const data = JSON.parse(guardado);
      setUsuario(data);

      if (data.rol === "campesino") setVista("campesino");
      if (data.rol === "transportador") setVista("transportador");
      if (data.rol === "administrador") setVista("admin");
    }
  }, []);

  const limpiarUrl = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const irALogin = () => {
    limpiarUrl();
    setVista("login");
  };

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    setUsuario(null);
    irALogin();
  };

  return (
    <>
      {vista === "login" && (
        <Login
          irARegistro={() => setVista("registro")}
          irARecuperar={() => setVista("recuperar")}
          onLoginExitoso={(data) => {
            localStorage.setItem("usuario", JSON.stringify(data));
            setUsuario(data);

            if (data.rol === "campesino") setVista("campesino");
            if (data.rol === "transportador") setVista("transportador");
            if (data.rol === "administrador") setVista("admin");
          }}
        />
      )}

      {vista === "registro" && <Registro irALogin={irALogin} />}

      {vista === "recuperar" && <RecuperarPassword volverALogin={irALogin} />}

      {vista === "restablecer" && <RestablecerPassword volverALogin={irALogin} />}

      {vista === "campesino" && <Campesino usuario={usuario} salir={cerrarSesion} />}

      {vista === "transportador" && <Transportador usuario={usuario} salir={cerrarSesion} />}

      {vista === "admin" && <Admin usuario={usuario} salir={cerrarSesion} />}
    </>
  );
}

export default App;
