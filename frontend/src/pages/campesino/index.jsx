import { useState } from "react";
import Dashboard from "./Dashboard";
import Perfil from "./perfil/Perfil";
import MisSolicitudes from "./solicitudes/MisSolicitudes";
import CrearSolicitud from "./solicitudes/CrearSolicitud";
import MisBovinos from "./bovinos/MisBovinos";
import RegistrarBovino from "./bovinos/RegistrarBovino";
import EditarPerfil from "./perfil/EditarPerfil";
import MisFincas from "./fincas/MisFincas";
import AgregarFinca from "./fincas/AgregarFinca";
import EditarFinca from "./fincas/EditarFinca";

function Campesino({ usuario, salir }) {
  const [vistaInterna, setVistaInterna] = useState("dashboard");
  const [fincaSeleccionada, setFincaSeleccionada] = useState(null);
  const [bovinoSeleccionado, setBovinoSeleccionado] = useState(null);

  const propsComunes = { usuario, salir, vistaInterna, setVistaInterna, fincaSeleccionada, setFincaSeleccionada, bovinoSeleccionado, setBovinoSeleccionado };

  switch (vistaInterna) {
    case "perfil":
      return <Perfil {...propsComunes} />;
    case "editarPerfil":
      return <EditarPerfil {...propsComunes} />;
    case "solicitudes":
    case "misSolicitudes":
      return <MisSolicitudes {...propsComunes} />;
    case "crearSolicitud":
      return <CrearSolicitud {...propsComunes} />;
    case "bovinos":
    case "misBovinos":
      return <MisBovinos {...propsComunes} />;
    case "registrarBovino":
      return <RegistrarBovino {...propsComunes} />;
    case "editarBovino":
      return <RegistrarBovino {...propsComunes} modo="editar" />;
    case "fincas":
    case "misFincas":
      return <MisFincas {...propsComunes} />;
    case "agregarFinca":
      return <AgregarFinca {...propsComunes} />;
    case "editarFinca":
      return <EditarFinca {...propsComunes} />;
    default:
      return <Dashboard {...propsComunes} />;
  }
}

export default Campesino;
