import { cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import dashboardIcon from "../../assets/icons/Dashboard.png";
import solicitudesIcon from "../../assets/icons/Solicitudes.png";
import viajesIcon from "../../assets/icons/Viajes.png";
import vehiculosIcon from "../../assets/icons/Vehiculos.png";
import usuariosIcon from "../../assets/icons/Conductores_clientes.png";
import fincaIcon from "../../assets/icons/Finca.png";
import bovinoIcon from "../../assets/icons/Bovino.png";
import perfilIcon from "../../assets/icons/Perfil.png";
import { adminService } from "../../services/adminService";
import PasswordInput from "../../components/PasswordInput";
import { emailInputProps, formatColombianPhone, normalizePhone, phoneInputProps, validateContactFields } from "../../utils/formValidators";
import { getPasswordHelpText, validatePasswordStrength } from "../../utils/passwordValidators";

const VEREDAS = [
  "Barandillas", "Barro Blanco", "El Empalizado", "El Tunal", "La Granja", "Pasoancho",
  "Río Frío", "San Isidro", "San Jorge", "San Miguel", "Ventalarga", "Portachuelo", "El Cedro", "Zipaquirá",
];

const VEHICULOS = [
  "Camión Jaula",
  "Camión Estacas con Carpa",
  "Tracción Animal",
  "Camión Plataforma Especial",
];

const vistaTitulos = {
  dashboard: "Dashboard general",
  solicitudes: "Solicitudes vigentes e históricas",
  viajes: "Viajes registrados",
  vehiculos: "Vehículos por transportador",
  conductores: "Conductores registrados",
  clientes: "Clientes / campesinos registrados",
  fincas: "Fincas por campesino",
  bovinos: "Bovinos por campesino",
  perfil: "Perfil del administrador",
};

const usuarioVacio = { id_usuario: "", nombre: "", apellido: "", correo: "", telefono: "", password: "", rol: "campesino" };
const fincaVacia = { id_usuario: "", nombre_finca: "", vereda: VEREDAS[0], referencia: "" };
const bovinoVacio = { codigo_bovino: "", raza: "", peso_promedio: "", observaciones: "", edad: "", estado: "activo", id_usuario: "", id_finca: "" };
const vehiculoVacio = { id_usuario: "", tipo_vehiculo: VEHICULOS[0], marca: "", modelo: "", peso_max_prom: "", capacidad_bovinos: "", descripcion: "", placa: "" };
const perfilVacio = { nombre: "", apellido: "", correo: "", telefono: "", password: "" };

function Admin({ usuario, salir }) {
  const [vistaInterna, setVistaInterna] = useState("dashboard");
  const [resumen, setResumen] = useState(null);
  const [conductores, setConductores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [bovinos, setBovinos] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formUsuario, setFormUsuario] = useState(usuarioVacio);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [formFinca, setFormFinca] = useState(fincaVacia);
  const [editandoFinca, setEditandoFinca] = useState(null);
  const [formBovino, setFormBovino] = useState(bovinoVacio);
  const [editandoBovino, setEditandoBovino] = useState(null);
  const [formVehiculo, setFormVehiculo] = useState(vehiculoVacio);
  const [editandoVehiculo, setEditandoVehiculo] = useState(null);
  const [formPerfil, setFormPerfil] = useState(perfilVacio);
  const [detalleSolicitud, setDetalleSolicitud] = useState(null);
  const [detalleViaje, setDetalleViaje] = useState(null);
  const [detalleDocumentos, setDetalleDocumentos] = useState(null);
  const [estadoViajeAdmin, setEstadoViajeAdmin] = useState({});
  const [guardandoViajeId, setGuardandoViajeId] = useState(null);

  const campesinos = useMemo(
    () => clientes
      .filter((u) => u?.rol === "campesino")
      .sort((a, b) => String(a.nombre_completo || "").localeCompare(String(b.nombre_completo || ""))),
    [clientes]
  );

  const fincasCampesinos = useMemo(
    () => fincas.filter((f) => f?.usuario?.rol === "campesino" || campesinos.some((u) => String(u.id_usuario) === String(f.id_usuario))),
    [fincas, campesinos]
  );

  const bovinosCampesinos = useMemo(
    () => bovinos.filter((b) => b?.usuario?.rol === "campesino" || campesinos.some((u) => String(u.id_usuario) === String(b.id_usuario))),
    [bovinos, campesinos]
  );

  const fincasUsuarioSeleccionado = useMemo(
    () => fincasCampesinos.filter((f) => String(f.id_usuario) === String(formBovino.id_usuario)),
    [fincasCampesinos, formBovino.id_usuario]
  );

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [resumenData, conductoresData, clientesData, fincasData, bovinosData, vehiculosData, solicitudesData, viajesData, perfilData] = await Promise.all([
        adminService.getResumen(),
        adminService.getUsuarios("transportador"),
        adminService.getUsuarios("campesino"),
        adminService.getFincas(),
        adminService.getBovinos(),
        adminService.getVehiculos(),
        adminService.getSolicitudes(),
        adminService.getViajes(),
        adminService.getPerfil(usuario.id_usuario),
      ]);
      setResumen(resumenData);
      setConductores(conductoresData);
      setClientes(clientesData);
      setFincas(fincasData);
      setBovinos(bovinosData);
      setVehiculos(vehiculosData);
      setSolicitudes(solicitudesData);
      setViajes(viajesData);
      setFormPerfil({
        nombre: perfilData.usuario?.nombre || usuario.nombre || "",
        apellido: perfilData.usuario?.apellido || usuario.apellido || "",
        correo: perfilData.usuario?.correo || usuario.correo || "",
        telefono: formatColombianPhone(perfilData.usuario?.telefono || ""),
        password: "",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarTodo(); }, []);

  const limpiarMensajes = () => { setMensaje(""); setError(""); };
  const exito = (txt) => { setMensaje(txt); setError(""); };
  const fallo = (txt) => { setError(txt); setMensaje(""); };

  const resetUsuario = (rol = "campesino") => { setEditandoUsuario(null); setFormUsuario({ ...usuarioVacio, rol }); };
  const resetFinca = () => { setEditandoFinca(null); setFormFinca(fincaVacia); };
  const resetBovino = () => { setEditandoBovino(null); setFormBovino(bovinoVacio); };
  const resetVehiculo = () => { setEditandoVehiculo(null); setFormVehiculo(vehiculoVacio); };

  const onSubmitUsuario = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    const validationError = validateContactFields({ telefono: formUsuario.telefono, correo: formUsuario.correo });
    if (validationError) {
      fallo(validationError);
      return;
    }
    if (formUsuario.password && !validatePasswordStrength(formUsuario.password)) {
      fallo(getPasswordHelpText(formUsuario.password));
      return;
    }
    if (!editandoUsuario && !formUsuario.password) {
      fallo(getPasswordHelpText(formUsuario.password));
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...formUsuario,
        id_usuario: Number(formUsuario.id_usuario),
        telefono: normalizePhone(formUsuario.telefono),
      };
      if (editandoUsuario) {
        await adminService.updateUsuario(editandoUsuario.id_usuario, {
          nombre: payload.nombre,
          apellido: payload.apellido,
          correo: payload.correo,
          telefono: payload.telefono,
          password: payload.password || undefined,
        });
        exito("Usuario actualizado correctamente");
      } else {
        await adminService.createUsuario(payload);
        exito("Usuario creado correctamente");
      }
      resetUsuario(payload.rol || "campesino");
      await cargarTodo();
    } catch (e2) {
      fallo(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  const onSubmitFinca = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    setGuardando(true);
    try {
      const payload = { ...formFinca, id_usuario: Number(formFinca.id_usuario) };
      if (editandoFinca) {
        await adminService.updateFinca(editandoFinca.id_finca, payload);
        exito("Finca actualizada correctamente");
      } else {
        await adminService.createFinca(payload);
        exito("Finca creada correctamente");
      }
      resetFinca();
      await cargarTodo();
    } catch (e2) {
      fallo(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  const onSubmitBovino = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    setGuardando(true);
    try {
      const payload = {
        ...formBovino,
        codigo_bovino: formBovino.codigo_bovino ? Number(formBovino.codigo_bovino) : null,
        peso_promedio: Number(formBovino.peso_promedio),
        edad: Number(formBovino.edad),
        id_usuario: Number(formBovino.id_usuario),
        id_finca: formBovino.id_finca ? Number(formBovino.id_finca) : null,
      };
      if (editandoBovino) {
        await adminService.updateBovino(editandoBovino.id_bovino, payload);
        exito("Bovino actualizado correctamente");
      } else {
        await adminService.createBovino(payload);
        exito("Bovino creado correctamente");
      }
      resetBovino();
      await cargarTodo();
    } catch (e2) {
      fallo(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  const onSubmitVehiculo = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    setGuardando(true);
    try {
      const payload = {
        ...formVehiculo,
        id_usuario: Number(formVehiculo.id_usuario),
        modelo: Number(formVehiculo.modelo),
        peso_max_prom: Number(formVehiculo.peso_max_prom),
        capacidad_bovinos: Number(formVehiculo.capacidad_bovinos),
      };
      if (editandoVehiculo) {
        await adminService.updateVehiculo(editandoVehiculo.id_vehiculo, payload);
        exito("Vehículo actualizado correctamente");
      } else {
        await adminService.createVehiculo(payload);
        exito("Vehículo creado correctamente");
      }
      resetVehiculo();
      await cargarTodo();
    } catch (e2) {
      fallo(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  const onSubmitPerfil = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    const validationError = validateContactFields({ telefono: formPerfil.telefono, correo: formPerfil.correo });
    if (validationError) {
      fallo(validationError);
      return;
    }
    if (formPerfil.password && !validatePasswordStrength(formPerfil.password)) {
      fallo(getPasswordHelpText(formPerfil.password));
      return;
    }
    setGuardando(true);
    try {
      await adminService.updatePerfil(usuario.id_usuario, {
        nombre: formPerfil.nombre,
        apellido: formPerfil.apellido,
        correo: formPerfil.correo,
        telefono: normalizePhone(formPerfil.telefono),
        password: formPerfil.password || undefined,
      });
      exito("Perfil actualizado correctamente");
      setFormPerfil((prev) => ({ ...prev, password: "" }));
      await cargarTodo();
    } catch (e2) {
      fallo(e2.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (tipo, id) => {
    limpiarMensajes();
    const ok = window.confirm("¿Seguro que deseas eliminar este registro?");
    if (!ok) return;
    try {
      if (tipo === "usuario") await adminService.deleteUsuario(id);
      if (tipo === "finca") await adminService.deleteFinca(id);
      if (tipo === "bovino") await adminService.deleteBovino(id);
      if (tipo === "vehiculo") await adminService.deleteVehiculo(id);
      exito("Registro eliminado correctamente");
      await cargarTodo();
    } catch (e) {
      fallo(e.message);
    }
  };


  const abrirDocumento = (url) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const descargarDocumento = (url, nombre = "documento") => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = nombre;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actualizarEstadoViaje = async (viaje) => {
    const nuevoEstado = estadoViajeAdmin[viaje.id] || viaje.estado;
    if (!nuevoEstado || nuevoEstado === viaje.estado) return;
    limpiarMensajes();
    setGuardandoViajeId(viaje.id);
    try {
      await adminService.updateEstadoViaje(viaje.id, nuevoEstado);
      exito("Estado del viaje actualizado correctamente");
      await cargarTodo();
    } catch (e) {
      fallo(e.message);
    } finally {
      setGuardandoViajeId(null);
    }
  };

  const cards = resumen ? [
    { label: "Usuarios", value: resumen.usuarios, icon: dashboardIcon },
    { label: "Campesinos", value: resumen.campesinos, icon: usuariosIcon },
    { label: "Transportadores", value: resumen.transportadores, icon: usuariosIcon },
    { label: "Administradores", value: resumen.administradores, icon: perfilIcon },
    { label: "Fincas", value: resumen.fincas, icon: fincaIcon },
    { label: "Bovinos", value: resumen.bovinos, icon: bovinoIcon },
    { label: "Vehículos", value: resumen.vehiculos, icon: vehiculosIcon },
    { label: "Solicitudes", value: resumen.solicitudes, icon: solicitudesIcon },
    { label: "Viajes", value: resumen.viajes, icon: viajesIcon },
  ] : [];

  const renderVista = () => {
    if (loading) return <div style={styles.card}>Cargando información del administrador...</div>;

    switch (vistaInterna) {
      case "dashboard":
        return (
          <>
            <div style={styles.cardsGrid}>
              {cards.map((card) => (
                <div key={card.label} style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <div style={styles.metricValue}>{card.value}</div>
                    <span style={styles.metricIconWrap}>
                      <img src={card.icon} alt="" style={styles.metricIcon} />
                    </span>
                  </div>
                  <div style={styles.metricLabel}>{card.label}</div>
                </div>
              ))}
            </div>
            <div style={styles.contentGrid}>
              <InfoBlock title="Campesinos" items={campesinos.map((c) => `${c.nombre_completo} · ${c.correo}`)} />
              <InfoBlock title="Transportadores" items={conductores.map((c) => `${c.nombre_completo} · ${c.correo}`)} />
            </div>
          </>
        );
      case "clientes":
        return (
          <CrudSection
            title="Administrar clientes / campesinos"
            form={
              <form onSubmit={onSubmitUsuario} style={styles.formGrid}>
                <Field label="Cédula"><input value={formUsuario.id_usuario} disabled={!!editandoUsuario} onChange={(e) => setFormUsuario({ ...formUsuario, id_usuario: e.target.value })} required /></Field>
                <Field label="Nombre"><input value={formUsuario.nombre} onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })} required /></Field>
                <Field label="Apellido"><input value={formUsuario.apellido} onChange={(e) => setFormUsuario({ ...formUsuario, apellido: e.target.value })} required /></Field>
                <Field label="Correo"><input {...emailInputProps(formUsuario.correo, (value) => setFormUsuario({ ...formUsuario, correo: value }))} /></Field>
                <Field label="Teléfono"><input {...phoneInputProps(formUsuario.telefono, (value) => setFormUsuario({ ...formUsuario, telefono: value }))} /></Field>
                <Field label="Contraseña"><PasswordInput value={formUsuario.password} onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })} placeholder={editandoUsuario ? "Solo si desea cambiarla" : "Obligatoria"} required={!editandoUsuario} inputStyle={styles.control} helpText={getPasswordHelpText(formUsuario.password, !!editandoUsuario)} helpTone={formUsuario.password && validatePasswordStrength(formUsuario.password) ? "success" : "neutral"} /></Field>
                <Field label="Rol"><select value={formUsuario.rol} onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}><option value="campesino">Campesino</option></select></Field>
                <ActionButtons editando={!!editandoUsuario} onCancel={() => resetUsuario("campesino")} guardando={guardando} />
              </form>
            }
            table={<UsuariosTable rows={campesinos} onEdit={(u) => { setEditandoUsuario(u); setFormUsuario({ id_usuario: String(u.id_usuario), nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: formatColombianPhone(u.telefono), password: "", rol: "campesino" }); }} onDelete={(id) => eliminar("usuario", id)} />}
          />
        );
      case "conductores":
        return (
          <CrudSection
            title="Administrar conductores / transportadores"
            form={
              <form onSubmit={onSubmitUsuario} style={styles.formGrid}>
                <Field label="Cédula"><input value={formUsuario.id_usuario} disabled={!!editandoUsuario} onChange={(e) => setFormUsuario({ ...formUsuario, id_usuario: e.target.value })} required /></Field>
                <Field label="Nombre"><input value={formUsuario.nombre} onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })} required /></Field>
                <Field label="Apellido"><input value={formUsuario.apellido} onChange={(e) => setFormUsuario({ ...formUsuario, apellido: e.target.value })} required /></Field>
                <Field label="Correo"><input {...emailInputProps(formUsuario.correo, (value) => setFormUsuario({ ...formUsuario, correo: value }))} /></Field>
                <Field label="Teléfono"><input {...phoneInputProps(formUsuario.telefono, (value) => setFormUsuario({ ...formUsuario, telefono: value }))} /></Field>
                <Field label="Contraseña"><PasswordInput value={formUsuario.password} onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })} placeholder={editandoUsuario ? "Solo si desea cambiarla" : "Obligatoria"} required={!editandoUsuario} inputStyle={styles.control} helpText={getPasswordHelpText(formUsuario.password, !!editandoUsuario)} helpTone={formUsuario.password && validatePasswordStrength(formUsuario.password) ? "success" : "neutral"} /></Field>
                <Field label="Rol"><select value={formUsuario.rol} onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}><option value="transportador">Transportador</option></select></Field>
                <ActionButtons editando={!!editandoUsuario} onCancel={() => resetUsuario("transportador")} guardando={guardando} />
              </form>
            }
            table={<UsuariosTable rows={conductores} onEdit={(u) => { setEditandoUsuario(u); setFormUsuario({ id_usuario: String(u.id_usuario), nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: formatColombianPhone(u.telefono), password: "", rol: "transportador" }); }} onDelete={(id) => eliminar("usuario", id)} />}
          />
        );
      case "fincas":
        return (
          <CrudSection
            title="Administrar fincas por campesino"
            form={
              <form onSubmit={onSubmitFinca} style={styles.formGrid}>
                <Field label="Campesino propietario"><select value={formFinca.id_usuario} onChange={(e) => setFormFinca({ ...formFinca, id_usuario: e.target.value })} required><option value="">Seleccione campesino</option>{campesinos.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo} · {u.id_usuario}</option>)}</select></Field>
                <Field label="Nombre de finca"><input value={formFinca.nombre_finca} onChange={(e) => setFormFinca({ ...formFinca, nombre_finca: e.target.value })} required /></Field>
                <Field label="Vereda"><select value={formFinca.vereda} onChange={(e) => setFormFinca({ ...formFinca, vereda: e.target.value })}>{VEREDAS.map((v) => <option key={v} value={v}>{v}</option>)}</select></Field>
                <Field label="Referencia"><textarea value={formFinca.referencia} onChange={(e) => setFormFinca({ ...formFinca, referencia: e.target.value })} required rows={3} /></Field>
                <ActionButtons editando={!!editandoFinca} onCancel={resetFinca} guardando={guardando} />
              </form>
            }
            table={<FincasTable rows={fincasCampesinos} onEdit={(f) => { setEditandoFinca(f); setFormFinca({ id_usuario: String(f.id_usuario), nombre_finca: f.nombre_finca, vereda: f.vereda, referencia: f.referencia }); }} onDelete={(id) => eliminar("finca", id)} />}
          />
        );
      case "bovinos":
        return (
          <CrudSection
            title="Administrar bovinos por campesino y finca"
            form={
              <form onSubmit={onSubmitBovino} style={styles.formGrid}>
                <Field label="Campesino"><select value={formBovino.id_usuario} onChange={(e) => setFormBovino({ ...formBovino, id_usuario: e.target.value, id_finca: "" })} required><option value="">Seleccione campesino</option>{campesinos.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo} · {u.id_usuario}</option>)}</select></Field>
                <Field label="Finca"><select value={formBovino.id_finca} onChange={(e) => setFormBovino({ ...formBovino, id_finca: e.target.value })}><option value="">Sin finca</option>{fincasUsuarioSeleccionado.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre_finca} · {f.vereda}</option>)}</select></Field>
                <Field label="Código bovino"><input value={formBovino.codigo_bovino} onChange={(e) => setFormBovino({ ...formBovino, codigo_bovino: e.target.value })} /></Field>
                <Field label="Raza"><input value={formBovino.raza} onChange={(e) => setFormBovino({ ...formBovino, raza: e.target.value })} required /></Field>
                <Field label="Peso promedio (kg)"><input value={formBovino.peso_promedio} onChange={(e) => setFormBovino({ ...formBovino, peso_promedio: e.target.value })} required /></Field>
                <Field label="Edad"><input value={formBovino.edad} onChange={(e) => setFormBovino({ ...formBovino, edad: e.target.value })} required /></Field>
                <Field label="Estado"><select value={formBovino.estado} onChange={(e) => setFormBovino({ ...formBovino, estado: e.target.value })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="vendido">Vendido</option><option value="frigorifico">Frigorífico</option></select></Field>
                <Field label="Observaciones" fullWidth><textarea value={formBovino.observaciones} onChange={(e) => setFormBovino({ ...formBovino, observaciones: e.target.value })} required rows={4} /></Field>
                <ActionButtons editando={!!editandoBovino} onCancel={resetBovino} guardando={guardando} />
              </form>
            }
            table={<BovinosTable rows={bovinosCampesinos} onDocs={(b) => setDetalleDocumentos({ titulo: "Documentos del bovino " + (b.codigo_bovino || b.id_bovino), documentos: b.documentos || [] })} onEdit={(b) => { setEditandoBovino(b); setFormBovino({ codigo_bovino: b.codigo_bovino ? String(b.codigo_bovino) : "", raza: b.raza, peso_promedio: String(b.peso_promedio), observaciones: b.observaciones, edad: String(b.edad), estado: b.estado || "activo", id_usuario: String(b.id_usuario || ""), id_finca: b.id_finca ? String(b.id_finca) : "" }); }} onDelete={(id) => eliminar("bovino", id)} />}
          />
        );
      case "vehiculos":
        return (
          <CrudSection
            title="Administrar vehículos por transportador"
            form={
              <form onSubmit={onSubmitVehiculo} style={styles.formGrid}>
                <Field label="Transportador"><select value={formVehiculo.id_usuario} onChange={(e) => setFormVehiculo({ ...formVehiculo, id_usuario: e.target.value })} required><option value="">Seleccione transportador</option>{conductores.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo} · {u.id_usuario}</option>)}</select></Field>
                <Field label="Tipo vehículo"><select value={formVehiculo.tipo_vehiculo} onChange={(e) => setFormVehiculo({ ...formVehiculo, tipo_vehiculo: e.target.value })}>{VEHICULOS.map((v) => <option key={v} value={v}>{v}</option>)}</select></Field>
                <Field label="Marca"><input value={formVehiculo.marca} onChange={(e) => setFormVehiculo({ ...formVehiculo, marca: e.target.value })} required /></Field>
                <Field label="Modelo"><input value={formVehiculo.modelo} onChange={(e) => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })} required /></Field>
                <Field label="Carga máxima permitida (kg)"><input value={formVehiculo.peso_max_prom} onChange={(e) => setFormVehiculo({ ...formVehiculo, peso_max_prom: e.target.value })} required /></Field>
                <Field label="Capacidad bovinos"><input value={formVehiculo.capacidad_bovinos} onChange={(e) => setFormVehiculo({ ...formVehiculo, capacidad_bovinos: e.target.value })} required /></Field>
                <Field label="Placa"><input value={formVehiculo.placa} onChange={(e) => setFormVehiculo({ ...formVehiculo, placa: e.target.value.toUpperCase() })} required /></Field>
                <Field label="Descripción" fullWidth><textarea value={formVehiculo.descripcion} onChange={(e) => setFormVehiculo({ ...formVehiculo, descripcion: e.target.value })} required rows={4} /></Field>
                <ActionButtons editando={!!editandoVehiculo} onCancel={resetVehiculo} guardando={guardando} />
              </form>
            }
            table={<VehiculosTable rows={vehiculos} onDocs={(v) => setDetalleDocumentos({ titulo: "Documentos del vehículo " + (v.placa || v.id_vehiculo), documentos: v.documentos || [] })} onEdit={(v) => { setEditandoVehiculo(v); setFormVehiculo({ id_usuario: String(v.id_usuario), tipo_vehiculo: v.tipo_vehiculo, marca: v.marca, modelo: String(v.modelo), peso_max_prom: String(v.peso_max_prom), capacidad_bovinos: String(v.capacidad_bovinos), descripcion: v.descripcion, placa: v.placa }); }} onDelete={(id) => eliminar("vehiculo", id)} />}
          />
        );
      case "solicitudes":
        return <SolicitudesAdminTable rows={solicitudes} onDetalle={setDetalleSolicitud} onOpen={abrirDocumento} onDownload={descargarDocumento} />;
      case "viajes":
        return <ViajesAdminTable rows={viajes} estadoViajeAdmin={estadoViajeAdmin} setEstadoViajeAdmin={setEstadoViajeAdmin} guardandoViajeId={guardandoViajeId} onSaveEstado={actualizarEstadoViaje} onDetalle={setDetalleViaje} onOpen={abrirDocumento} onDownload={descargarDocumento} />;
      case "perfil":
        return <ProfileCard usuario={usuario} resumen={resumen} formPerfil={formPerfil} setFormPerfil={setFormPerfil} onSubmitPerfil={onSubmitPerfil} guardando={guardando} />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaActiva={vistaInterna}>
      <div style={styles.topHeader}>
        <div>
          <h2 style={styles.pageTitle}>{vistaTitulos[vistaInterna]}</h2>
          <p style={styles.pageText}>La información se muestra organizada por usuario para que el administrador pueda revisar, agregar, modificar o eliminar registros desde un solo panel.</p>
        </div>
      </div>

      {mensaje && <div style={styles.success}>{mensaje}</div>}
      {error && <div style={styles.error}>{error}</div>}
      {renderVista()}
      {detalleSolicitud && <DetalleSolicitudModal item={detalleSolicitud} onClose={() => setDetalleSolicitud(null)} onOpen={abrirDocumento} onDownload={descargarDocumento} />}
      {detalleViaje && <DetalleViajeModal item={detalleViaje} onClose={() => setDetalleViaje(null)} onOpen={abrirDocumento} onDownload={descargarDocumento} />}
      {detalleDocumentos && <DocumentosModal data={detalleDocumentos} onClose={() => setDetalleDocumentos(null)} onOpen={abrirDocumento} onDownload={descargarDocumento} />}
    </AdminLayout>
  );
}

function CrudSection({ title, form, table }) {
  return (
    <div style={styles.contentGrid}>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>{title}</h3>
        {form}
      </div>
      <div style={styles.card}>
        {table}
      </div>
    </div>
  );
}

function TableCard({ title, children }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function ProfileCard({ usuario, resumen, formPerfil, setFormPerfil, onSubmitPerfil, guardando }) {
  return (
    <div style={styles.contentGrid}>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Actualizar información del administrador</h3>
        <form onSubmit={onSubmitPerfil} style={styles.formGrid}>
          <Field label="Nombre"><input value={formPerfil.nombre} onChange={(e) => setFormPerfil({ ...formPerfil, nombre: e.target.value })} required /></Field>
          <Field label="Apellido"><input value={formPerfil.apellido} onChange={(e) => setFormPerfil({ ...formPerfil, apellido: e.target.value })} required /></Field>
          <Field label="Correo"><input {...emailInputProps(formPerfil.correo, (value) => setFormPerfil({ ...formPerfil, correo: value }))} /></Field>
          <Field label="Teléfono"><input {...phoneInputProps(formPerfil.telefono, (value) => setFormPerfil({ ...formPerfil, telefono: value }))} /></Field>
          <Field label="Cédula"><input value={usuario?.id_usuario || ""} disabled /></Field>
          <Field label="Rol"><input value={usuario?.rol || "administrador"} disabled /></Field>
          <Field label="Contraseña" fullWidth><PasswordInput value={formPerfil.password} onChange={(e) => setFormPerfil({ ...formPerfil, password: e.target.value })} placeholder="Solo si desea cambiarla" inputStyle={styles.control} helpText={getPasswordHelpText(formPerfil.password, true)} helpTone={formPerfil.password && validatePasswordStrength(formPerfil.password) ? "success" : "neutral"} /></Field>
          <ActionButtons editando={true} guardando={guardando} />
        </form>
      </div>
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Resumen del perfil</h3>
        <div style={styles.profileGrid}>
          <ProfileItem label="Nombre" value={`${formPerfil.nombre || ""} ${formPerfil.apellido || ""}`.trim()} />
          <ProfileItem label="Correo" value={formPerfil.correo} />
          <ProfileItem label="Cédula" value={usuario?.id_usuario} />
          <ProfileItem label="Rol" value={usuario?.rol} />
          <ProfileItem label="Administradores registrados" value={resumen?.administradores ?? 0} />
          <ProfileItem label="Estado del módulo" value="Activo" />
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ label, value }) {
  return <div style={styles.profileItem}><span style={styles.profileLabel}>{label}</span><strong>{value || "-"}</strong></div>;
}

function InfoBlock({ title, items }) {
  return <div style={styles.card}><h3 style={styles.sectionTitle}>{title}</h3><div style={styles.list}>{items.length ? items.map((i) => <div key={i} style={styles.listItem}>{i}</div>) : <div style={styles.listItem}>Sin registros</div>}</div></div>;
}

function Field({ label, children, fullWidth = false }) {
  const styledChild = isValidElement(children)
    ? cloneElement(children, { style: { ...(children.props.style || {}), ...styles.control } })
    : children;
  return <label style={{ ...styles.field, ...(fullWidth ? styles.fullWidth : {}) }}><span>{label}</span>{styledChild}</label>;
}

function ActionButtons({ editando, onCancel, guardando }) {
  return (
    <div style={styles.actions}>
      <button type="submit" style={styles.primaryBtn} disabled={guardando}>{editando ? "Guardar cambios" : "Crear registro"}</button>
      {editando && onCancel && <button type="button" style={styles.secondaryBtn} onClick={onCancel}>Cancelar edición</button>}
    </div>
  );
}

function UsuariosTable({ rows, onEdit, onDelete }) {
  return <><h3 style={styles.tableTitle}>Listado</h3><BasicTable headers={["Cédula", "Nombre", "Correo", "Teléfono", "Rol", "Acciones"]} rows={rows.map((u) => [u.id_usuario, u.nombre_completo, u.correo, formatColombianPhone(u.telefono), u.rol, <ActionRow key={u.id_usuario} onEdit={() => onEdit(u)} onDelete={() => onDelete(u.id_usuario)} />])} /></>;
}

function FincasTable({ rows, onEdit, onDelete }) {
  return <><h3 style={styles.tableTitle}>Listado de fincas</h3><BasicTable headers={["Finca", "Campesino", "Vereda", "Referencia", "Acciones"]} rows={rows.map((f) => [f.nombre_finca, f.usuario?.nombre_completo || f.id_usuario, f.vereda, f.referencia, <ActionRow key={f.id_finca} onEdit={() => onEdit(f)} onDelete={() => onDelete(f.id_finca)} />])} /></>;
}

function BovinosTable({ rows, onEdit, onDelete, onDocs }) {
  return <><h3 style={styles.tableTitle}>Listado de bovinos</h3><BasicTable headers={["Código", "Raza", "Campesino", "Finca", "Estado", "Documentos", "Acciones"]} rows={rows.map((b) => [b.codigo_bovino || "-", b.raza, b.usuario?.nombre_completo || b.id_usuario, b.finca?.nombre_finca || "Sin finca", <EstadoBadge key={`estado-${b.id_bovino}`} estado={b.estado} />, <button key={`docs-${b.id_bovino}`} type="button" style={styles.infoButton} onClick={() => onDocs?.(b)}>Ver documentos</button>, <ActionRow key={b.id_bovino} onEdit={() => onEdit(b)} onDelete={() => onDelete(b.id_bovino)} />])} /></>;
}
function VehiculosTable({ rows, onEdit, onDelete, onDocs }) {
  return <><h3 style={styles.tableTitle}>Listado de vehículos</h3><BasicTable headers={["Placa", "Transportador", "Tipo", "Marca", "Capacidad", "Documentos", "Acciones"]} rows={rows.map((v) => [v.placa, v.usuario?.nombre_completo || v.id_usuario, v.tipo_vehiculo, v.marca, `${v.capacidad_bovinos} bovinos`, <button key={`docs-${v.id_vehiculo}`} type="button" style={styles.infoButton} onClick={() => onDocs?.(v)}>Ver documentos</button>, <ActionRow key={v.id_vehiculo} onEdit={() => onEdit(v)} onDelete={() => onDelete(v.id_vehiculo)} />])} /></>;
}

const estadosGestion = ["Asignado", "En ruta", "Completado"];
const ordenEstados = { Asignado: 0, "En ruta": 1, Completado: 2 };
const estadoColors = {
  "Buscando conductor": { background: "#e0f2fe", color: "#075985" },
  "Negociando pago": { background: "#e2e8f0", color: "#334155" },
  Asignado: { background: "#ecfccb", color: "#365314" },
  "En ruta": { background: "#fef3c7", color: "#92400e" },
  Completado: { background: "#dcfce7", color: "#166534" },
  Cancelada: { background: "#fee2e2", color: "#b91c1c" },
  activo: { background: "#dcfce7", color: "#166534" },
  inactivo: { background: "#e2e8f0", color: "#475569" },
  vendido: { background: "#dbeafe", color: "#1d4ed8" },
  frigorifico: { background: "#fee2e2", color: "#b91c1c" },
  feria: { background: "#fef3c7", color: "#92400e" },
};

function EstadoBadge({ estado }) {
  const colors = estadoColors[estado] || { background: "#e2e8f0", color: "#334155" };
  return <span style={{ ...styles.statusBadge, ...colors }}>{estado || "Sin estado"}</span>;
}

function formatMoney(valor) {
  const numero = Number(valor || 0);
  return numero ? numero.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }) : "-";
}

function SolicitudesAdminTable({ rows, onDetalle, onOpen, onDownload }) {
  return (
    <TableCard title="Solicitudes completas">
      <BasicTable
        headers={["Código", "Tipo", "Campesino", "Transportador", "Origen", "Destino", "Animal", "Estado", "Pago", "Documentos", "Acciones"]}
        rows={rows.map((s) => [
          s.codigo || `SOL-${s.id}`,
          s.tipo_solicitud || "-",
          s.campesino?.nombre_completo || "Sin usuario",
          s.transportador?.nombre_completo || "Sin asignar",
          s.origen || "-",
          s.destino || "-",
          <div key={`animal-${s.id}`} style={styles.compactColumn}><span>{Array.isArray(s.bovinos) ? s.bovinos.length : 0}</span><button type="button" style={styles.infoButton} onClick={() => onDetalle(s)}>Más información</button></div>,
          <EstadoBadge key={`estado-${s.id}`} estado={s.estado} />,
          <div key={`pago-${s.id}`} style={styles.compactColumn}><span>Mínimo {formatMoney(s.tarifa_minima)}</span><span>Inicial {formatMoney(s.valor_referencia_campesino)}</span></div>,
          <DocumentosCell key={`docs-${s.id}`} item={s} onOpen={onOpen} onDownload={onDownload} />,
          <button key={`detalle-${s.id}`} type="button" style={styles.infoButton} onClick={() => onDetalle(s)}>Ver detalle</button>,
        ])}
      />
    </TableCard>
  );
}

function ViajesAdminTable({ rows, estadoViajeAdmin, setEstadoViajeAdmin, guardandoViajeId, onSaveEstado, onDetalle, onOpen, onDownload }) {
  return (
    <TableCard title="Viajes completos">
      <BasicTable
        headers={["ID", "Solicitud", "Campesino", "Transportador", "Vehículo", "Origen", "Destino", "Animal", "Estado", "Progreso", "Documentos", "Actualizar estado"]}
        rows={rows.map((v) => {
          const estadoActual = estadoViajeAdmin[v.id] || v.estado;
          const disponibles = estadosGestion.filter((estado) => (ordenEstados[estado] ?? -1) >= (ordenEstados[v.estado] ?? -1));
          return [
            v.id,
            v.solicitud_codigo || `SOL-${v.solicitud_id}`,
            v.campesino?.nombre_completo || "Sin campesino",
            v.transportador?.nombre_completo || "Sin transportador",
            v.vehiculo ? `${v.vehiculo.tipo_vehiculo} · ${v.vehiculo.placa}` : "Sin vehículo",
            v.origen || "-",
            v.destino || "-",
            <div key={`animal-${v.id}`} style={styles.compactColumn}><span>{Array.isArray(v.bovinos) ? v.bovinos.length : 0}</span><button type="button" style={styles.infoButton} onClick={() => onDetalle(v)}>Más información</button></div>,
            <EstadoBadge key={`estado-${v.id}`} estado={v.estado} />,
            <div key={`progreso-${v.id}`} style={styles.progressWrapper}><div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${Math.max(0, Math.min(100, Number(v.progreso || 0)))}%` }} /></div><span>{Math.max(0, Math.min(100, Number(v.progreso || 0)))}%</span></div>,
            <DocumentosCell key={`docs-${v.id}`} item={v} onOpen={onOpen} onDownload={onDownload} />,
            <div key={`accion-${v.id}`} style={styles.actionColumn}><select value={estadoActual || "Asignado"} onChange={(e) => setEstadoViajeAdmin((prev) => ({ ...prev, [v.id]: e.target.value }))} style={styles.miniSelect}>{disponibles.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select><button type="button" style={{ ...styles.smallSave, ...((guardandoViajeId === v.id || estadoActual === v.estado) ? styles.disabledBtn : {}) }} disabled={guardandoViajeId === v.id || estadoActual === v.estado} onClick={() => onSaveEstado(v)}>{guardandoViajeId === v.id ? "Guardando..." : "Guardar"}</button></div>,
          ];
        })}
      />
    </TableCard>
  );
}

function DocumentosCell({ item, onOpen, onDownload }) {
  const documentos = [
    item.guia_movilidad_url ? { nombre_archivo: item.guia_movilidad_nombre || "Guía de movilidad", url: item.guia_movilidad_url, download_url: item.guia_movilidad_download_url } : null,
    item.info_adicional_url ? { nombre_archivo: item.info_adicional_nombre || "Documento adicional", url: item.info_adicional_url, download_url: item.info_adicional_download_url } : null,
  ].filter(Boolean);
  if (!documentos.length) return <span style={styles.emptySmall}>Sin documentos</span>;
  return <div style={styles.compactColumn}>{documentos.map((doc, index) => <button key={`${doc.nombre_archivo}-${index}`} type="button" style={styles.infoButton} onClick={() => onOpen(doc.url)}>{index === 0 ? "Ver guía" : "Ver documento"}</button>)}</div>;
}

function DetalleSolicitudModal({ item, onClose, onOpen, onDownload }) {
  return <DetalleModal title={`Detalle de solicitud ${item.codigo || `SOL-${item.id}`}`} item={item} onClose={onClose} onOpen={onOpen} onDownload={onDownload} tipo="solicitud" />;
}

function DetalleViajeModal({ item, onClose, onOpen, onDownload }) {
  return <DetalleModal title={`Detalle de viaje #${item.id}`} item={item} onClose={onClose} onOpen={onOpen} onDownload={onDownload} tipo="viaje" />;
}

function DetalleModal({ title, item, onClose, onOpen, onDownload, tipo }) {
  const documentos = [
    item.guia_movilidad_url ? { nombre_archivo: item.guia_movilidad_nombre || "Guía de movilidad", url: item.guia_movilidad_url, download_url: item.guia_movilidad_download_url } : null,
    item.info_adicional_url ? { nombre_archivo: item.info_adicional_nombre || "Documento adicional", url: item.info_adicional_url, download_url: item.info_adicional_download_url } : null,
  ].filter(Boolean);
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}><h3 style={styles.modalTitle}>{title}</h3><button type="button" style={styles.closeButton} onClick={onClose}>Cerrar</button></div>
        <div style={styles.detailGrid}>
          <InfoMini label="Campesino" value={item.campesino?.nombre_completo} />
          <InfoMini label="Transportador" value={item.transportador?.nombre_completo} />
          <InfoMini label="Vehículo" value={item.vehiculo ? `${item.vehiculo.tipo_vehiculo} · ${item.vehiculo.placa}` : "Sin vehículo"} />
          <InfoMini label="Estado" value={item.estado} />
          <InfoMini label="Origen" value={item.origen} />
          <InfoMini label="Destino" value={item.destino} />
          <InfoMini label="Fecha" value={item.fecha} />
          <InfoMini label="Pago inicial" value={formatMoney(item.valor_referencia_campesino)} />
        </div>
        <h4 style={styles.modalSectionTitle}>Bovinos</h4>
        <div style={styles.modalList}>{Array.isArray(item.bovinos) && item.bovinos.length ? item.bovinos.map((b) => <div key={b.id_bovino} style={styles.modalItem}><strong>Código:</strong> {b.codigo_bovino || `BOV-${b.id_bovino}`} · <strong>Raza:</strong> {b.raza || "-"} · <strong>Peso:</strong> {b.peso_promedio || 0} kg<br /><strong>Finca:</strong> {b.nombre_finca || "Sin finca"} · <strong>Vereda:</strong> {b.vereda_finca || "-"}</div>) : <p style={styles.emptySmall}>Sin bovinos asociados.</p>}</div>
        <h4 style={styles.modalSectionTitle}>Documentos</h4>
        <DocumentosList documentos={documentos} onOpen={onOpen} onDownload={onDownload} />
      </div>
    </div>
  );
}

function DocumentosModal({ data, onClose, onOpen, onDownload }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}><h3 style={styles.modalTitle}>{data.titulo}</h3><button type="button" style={styles.closeButton} onClick={onClose}>Cerrar</button></div>
        <DocumentosList documentos={data.documentos || []} onOpen={onOpen} onDownload={onDownload} />
      </div>
    </div>
  );
}

function DocumentosList({ documentos, onOpen, onDownload }) {
  if (!documentos?.length) return <p style={styles.emptySmall}>No hay documentos cargados.</p>;
  return <div style={styles.modalList}>{documentos.map((doc, idx) => <div key={doc.id || idx} style={styles.modalItem}><strong>{doc.nombre_archivo || "Documento"}</strong><div style={styles.rowActions}><button type="button" style={styles.infoButton} onClick={() => onOpen(doc.url)}>Abrir</button><button type="button" style={styles.secondaryBtn} onClick={() => onDownload(doc.download_url || doc.url, doc.nombre_archivo || "documento")}>Descargar</button></div></div>)}</div>;
}

function InfoMini({ label, value }) {
  return <div style={styles.profileItem}><span style={styles.profileLabel}>{label}</span><strong>{value || "-"}</strong></div>;
}

function ActionRow({ onEdit, onDelete }) {
  return <div style={styles.rowActions}><button type="button" style={styles.smallEdit} onClick={onEdit}>Editar</button><button type="button" style={styles.smallDelete} onClick={onDelete}>Eliminar</button></div>;
}

function BasicTable({ headers, rows }) {
  return <div style={styles.tableWrap}><table style={styles.table}><thead><tr>{headers.map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, idx) => <tr key={idx}>{row.map((cell, i) => <td key={i} style={styles.td}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} style={styles.empty}>Sin información disponible</td></tr>}</tbody></table></div>;
}

const styles = {
  topHeader: { marginBottom: 18 },
  pageTitle: { margin: 0, fontSize: 28, color: "#1F2937" },
  pageText: { margin: "8px 0 0", color: "#64748B" },
  sectionTitle: { margin: "0 0 16px", fontSize: 18, color: "#1E293B" },
  tableTitle: { marginTop: 0, marginBottom: 16, fontSize: 18, color: "#1E293B" },
  success: { background: "#E8F5E9", color: "#1B5E20", padding: 12, borderRadius: 12, marginBottom: 16 },
  error: { background: "#FDECEC", color: "#B42318", padding: 12, borderRadius: 12, marginBottom: 16 },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 },
  metricCard: { background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 10px 25px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", gap: 10 },
  metricHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  metricValue: { fontSize: 34, fontWeight: 800, color: "#29650B" },
  metricLabel: { color: "#64748B" },
  metricIconWrap: { width: 38, height: 38, borderRadius: 12, background: "#eef6f0", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  metricIcon: { width: 18, height: 18, objectFit: "contain" },
  contentGrid: { display: "grid", gridTemplateColumns: "minmax(320px, 440px) minmax(0, 1fr)", gap: 20, alignItems: "start" },
  card: { background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 10px 25px rgba(15,23,42,0.06)", minWidth: 0, boxSizing: "border-box" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, width: "100%" },
  field: { display: "flex", flexDirection: "column", gap: 6, color: "#334155", fontWeight: 600, fontSize: 14, minWidth: 0 },
  fullWidth: { gridColumn: "1 / -1" },
  control: { width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #D0D5DD", fontSize: 14, fontFamily: "inherit", minHeight: 42, resize: "vertical", background: "#fff" },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", gridColumn: "1 / -1", marginTop: 8 },
  primaryBtn: { background: "#29650B", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 },
  secondaryBtn: { background: "#fff", color: "#334155", border: "1px solid #CBD5E1", borderRadius: 10, padding: "10px 14px", cursor: "pointer" },
  tableWrap: { overflowX: "auto", width: "100%" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 620 },
  th: { textAlign: "left", fontSize: 13, color: "#64748B", padding: "12px 10px", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" },
  td: { padding: "14px 10px", borderBottom: "1px solid #EEF2F7", verticalAlign: "top" },
  empty: { textAlign: "center", color: "#94A3B8", padding: 20 },
  rowActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  smallEdit: { background: "#EAF4E3", color: "#29650B", border: "none", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontWeight: 700 },
  smallDelete: { background: "#FDECEC", color: "#B42318", border: "none", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontWeight: 700 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  listItem: { padding: 12, borderRadius: 12, background: "#F8FAFC" },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  profileItem: { padding: 16, borderRadius: 14, background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 6 },
  profileLabel: { color: "#64748B", fontSize: 13 },
  infoButton: { border: "none", background: "#E0F2FE", color: "#0C4A6E", borderRadius: 9, padding: "8px 10px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" },
  statusBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", padding: "6px 10px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  compactColumn: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" },
  actionColumn: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
  miniSelect: { minWidth: 130, padding: "9px 10px", borderRadius: 9, border: "1px solid #CBD5E1", background: "#fff" },
  smallSave: { background: "#1E4E8C", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 },
  disabledBtn: { opacity: 0.55, cursor: "not-allowed" },
  progressWrapper: { display: "flex", alignItems: "center", gap: 8 },
  progressTrack: { width: 90, height: 8, borderRadius: "999px", background: "#E5E7EB", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: "999px", background: "#1E4E8C" },
  emptySmall: { color: "#94A3B8", fontSize: 13, fontWeight: 600 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 9999 },
  modalCard: { width: "min(920px, 96vw)", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 24px 60px rgba(15,23,42,0.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  modalTitle: { margin: 0, fontSize: 22, color: "#0F172A" },
  closeButton: { background: "#1E4E8C", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 16 },
  modalSectionTitle: { margin: "18px 0 10px", color: "#1E293B" },
  modalList: { display: "flex", flexDirection: "column", gap: 10 },
  modalItem: { padding: 12, borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0" },
};

export default Admin;
