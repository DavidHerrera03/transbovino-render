import { useState } from "react";
import Dashboard from "./Dashboard";
import Perfil from "./perfil/Perfil";
import EditarPerfil from "./perfil/EditarPerfil";
import MisVehiculos from "./vehiculos/MisVehiculos";
import AgregarVehiculos from "./vehiculos/AgregarVehiculos";
import MisViajes from "./viajes/MisViajes";
import SolicitudesVigentes from "./solicitudes/SolicitudesVigentes";

function Transportador({ usuario, salir }) {
  const [vistaInterna, setVistaInternaState] = useState("dashboard");
  const [dashboardContext, setDashboardContext] = useState({});

  const setVistaInterna = (vista, context = {}) => {
    setVistaInternaState(vista);
    setDashboardContext(context || {});
  };

  const propsComunes = { usuario, salir, vistaInterna, setVistaInterna, dashboardContext };

  switch (vistaInterna) {
    case "perfil":
      return <Perfil {...propsComunes} />;
    case "editarPerfil":
      return <EditarPerfil {...propsComunes} />;
    case "vehiculos":
    case "misVehiculos":
      return <MisVehiculos {...propsComunes} />;
    case "agregarVehiculo":
      return <AgregarVehiculos {...propsComunes} />;
    case "solicitudes":
      return <SolicitudesVigentes {...propsComunes} />;
    case "misViajes":
      return <MisViajes {...propsComunes} />;
    default:
      return <Dashboard {...propsComunes} />;
  }
}

export default Transportador;
