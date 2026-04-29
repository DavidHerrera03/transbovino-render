import { useEffect, useMemo, useRef, useState } from "react";
import { getCatalogoFincas, getFincasUsuario } from "../services/fincaService";
import { obtenerBovinosPorUsuario } from "../services/bovinoService";
import {
  crearSolicitud,
  getSolicitudesCampesino,
  responderOfertaCampesino,
  cargarDocumentosSolicitud,
  cancelarSolicitud,
} from "../services/solicitudService";
import { calcularTarifaMinima, VEREDAS_ZIPAQUIRA, normalizarVereda } from "../constants/VeredasTarifas";
import { normalizePhone, phoneInputProps, validateContactFields } from "../utils/formValidators";

const TIPOS = ["Venta", "Traslado de finca a finca", "Venta a frigorifico", "Feria ganadera"];

const DESTINOS_FIJOS = {
  "Venta a frigorifico": {
    nombre: "Frigorífico EFZ",
    vereda: "Zipaquirá",
    referencia: "Av. Industrial Km. 1 vía Zipaquirá – Bogotá",
  },
  "Feria ganadera": {
    nombre: "Plaza de Ferias de Zipaquirá",
    vereda: "Zipaquirá",
    referencia: "Av. Industrial Km. 1 vía Zipaquirá – Bogotá",
  },
};

const initialForm = {
  tipoSolicitud: "Venta",
  idFincaOrigen: "",
  idFincaDestino: "",
  destinoNombre: "",
  destinoVereda: "",
  destinoReferencia: "",
  fechaRecogida: "",
  horaRecogida: "",
  contactoEntrega: "",
  telefonoContacto: "",
  observaciones: "",
  observacionesGanado: "",
  valorOfertaCampesino: "",
};

const normalize = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const normalizarTextoPlano = (value) => String(value || "").trim();

const obtenerVeredaCompatible = (value) => {
  const veredaNormalizada = normalizarVereda(value || "");
  const matchExacto = VEREDAS_ZIPAQUIRA.find((item) => item === veredaNormalizada);
  if (matchExacto) return matchExacto;

  const veredaSinAcentos = normalize(veredaNormalizada);
  const matchFlexible = VEREDAS_ZIPAQUIRA.find((item) => normalize(item) === veredaSinAcentos);
  return matchFlexible || veredaNormalizada;
};

export default function SolicitudWizard({ usuario, onSuccess }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [fincasUsuario, setFincasUsuario] = useState([]);
  const [catalogoFincas, setCatalogoFincas] = useState([]);
  const [bovinos, setBovinos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [thirdPartyInfo, setThirdPartyInfo] = useState(null);
  const [mostrarModalFinca, setMostrarModalFinca] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [destinoRechazado, setDestinoRechazado] = useState(false);
  const [guiaMovilidad, setGuiaMovilidad] = useState(null);
  const [documentoAdicional, setDocumentoAdicional] = useState(null);
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [solicitudCreada, setSolicitudCreada] = useState(null);
  const [solicitudActual, setSolicitudActual] = useState(null);
  const [solicitudesEnProceso, setSolicitudesEnProceso] = useState([]);
  const [modoFormulario, setModoFormulario] = useState("selector");
  const [contraofertas, setContraofertas] = useState({});
  const [loading, setLoading] = useState(false);
  const ultimaDecisionRef = useRef({ fincaId: null, nombreDestino: "" });
  const fincasRechazadasRef = useRef(new Set());

  const construirDestinoDesdeFinca = (finca) => ({
    idFincaDestino: finca?.id_finca ? String(finca.id_finca) : "",
    destinoNombre: normalizarTextoPlano(finca?.nombre_finca),
    destinoVereda: obtenerVeredaCompatible(finca?.vereda),
    destinoReferencia: normalizarTextoPlano(finca?.referencia),
  });

  useEffect(() => {
    if (!usuario?.id_usuario) return;
    getFincasUsuario(usuario.id_usuario).then(setFincasUsuario).catch(console.error);
    getCatalogoFincas().then(setCatalogoFincas).catch(console.error);
    obtenerBovinosPorUsuario(usuario.id_usuario).then(setBovinos).catch(console.error);
  }, [usuario]);

  const filtrarSolicitudesEnProceso = (items = []) => items.filter((solicitud) => {
    const estadoActivo = ["Negociando pago", "Buscando conductor", "Asignado", "En ruta"].includes(solicitud.estado);
    const sinGuia = !solicitud.guia_movilidad_url && (!solicitud.guia_movilidad_nombre || solicitud.guia_movilidad_nombre === "pendiente");
    return estadoActivo && sinGuia;
  });

  const cargarSolicitudesEnProceso = async () => {
    if (!usuario?.id_usuario) return [];
    const data = await getSolicitudesCampesino(usuario.id_usuario, { force: true });
    const pendientes = filtrarSolicitudesEnProceso(Array.isArray(data) ? data : []);
    setSolicitudesEnProceso(pendientes);
    return pendientes;
  };

  useEffect(() => {
    if (!usuario?.id_usuario) return;
    cargarSolicitudesEnProceso().catch(console.error);
  }, [usuario?.id_usuario]);

  useEffect(() => {
    setSeleccionados([]);
  }, [form.idFincaOrigen]);

  useEffect(() => {
    if (form.tipoSolicitud === "Venta a frigorifico" || form.tipoSolicitud === "Feria ganadera") {
      const fijo = DESTINOS_FIJOS[form.tipoSolicitud];
      setForm((prev) => ({ ...prev, idFincaDestino: "", destinoNombre: fijo.nombre, destinoVereda: fijo.vereda, destinoReferencia: fijo.referencia }));
      setThirdPartyInfo(null);
      setMostrarModalFinca(false);
      setConfirmado(false);
      setDestinoRechazado(false);
      fincasRechazadasRef.current.clear();
      ultimaDecisionRef.current = { fincaId: null, nombreDestino: "" };
      return;
    }

    if (form.tipoSolicitud === "Traslado de finca a finca") {
      setForm((prev) => ({ ...prev, destinoNombre: "", destinoVereda: "", destinoReferencia: "" }));
      setThirdPartyInfo(null);
      setMostrarModalFinca(false);
      setConfirmado(false);
      setDestinoRechazado(false);
      fincasRechazadasRef.current.clear();
      ultimaDecisionRef.current = { fincaId: null, nombreDestino: "" };
      return;
    }

    setForm((prev) => ({ ...prev, idFincaDestino: "" }));
    setThirdPartyInfo(null);
    setMostrarModalFinca(false);
    setConfirmado(false);
    setDestinoRechazado(false);
    fincasRechazadasRef.current.clear();
    ultimaDecisionRef.current = { fincaId: null, nombreDestino: "" };
  }, [form.tipoSolicitud]);

  const bovinosFiltrados = useMemo(() => {
    if (!form.idFincaOrigen) return [];
    return bovinos.filter((item) => String(item.id_finca) === String(form.idFincaOrigen));
  }, [bovinos, form.idFincaOrigen]);

  const fincaOrigen = useMemo(() => fincasUsuario.find((item) => String(item.id_finca) === String(form.idFincaOrigen)), [fincasUsuario, form.idFincaOrigen]);

  const fincaVentaDetectada = useMemo(() => {
    if (form.tipoSolicitud !== "Venta" || !form.destinoNombre.trim()) return null;
    const destinoNormalizado = normalize(form.destinoNombre);
    if (destinoNormalizado.length < 3) return null;
    return catalogoFincas.find((item) => {
      const nombreFinca = normalize(item.nombre_finca);
      return nombreFinca === destinoNormalizado || nombreFinca.includes(destinoNormalizado) || destinoNormalizado.includes(nombreFinca);
    }) || null;
  }, [catalogoFincas, form.destinoNombre, form.tipoSolicitud]);

  useEffect(() => {
    if (form.tipoSolicitud !== "Venta") return;
    if (!fincaVentaDetectada) {
      setThirdPartyInfo(null);
      setMostrarModalFinca(false);
      setConfirmado(false);
      setDestinoRechazado(false);
      setForm((prev) => ({ ...prev, idFincaDestino: "", destinoVereda: "", destinoReferencia: "" }));
      ultimaDecisionRef.current = { fincaId: null, nombreDestino: "" };
      return;
    }

    if (Number(fincaVentaDetectada.id_usuario) === Number(usuario?.id_usuario)) {
      const destinoAutocompletado = construirDestinoDesdeFinca(fincaVentaDetectada);
      setForm((prev) => ({ ...prev, ...destinoAutocompletado }));
      setThirdPartyInfo(null);
      setMostrarModalFinca(false);
      setConfirmado(true);
      setDestinoRechazado(false);
      ultimaDecisionRef.current = { fincaId: fincaVentaDetectada.id_finca, nombreDestino: normalize(form.destinoNombre) };
      return;
    }

    const fueRechazada = fincasRechazadasRef.current.has(Number(fincaVentaDetectada.id_finca));
    const yaRespondio = Number(ultimaDecisionRef.current.fincaId) === Number(fincaVentaDetectada.id_finca)
      && ultimaDecisionRef.current.nombreDestino === normalize(form.destinoNombre);

    setThirdPartyInfo(fincaVentaDetectada);

    if (fueRechazada || yaRespondio) {
      setMostrarModalFinca(false);
      setConfirmado(false);
      setDestinoRechazado(fueRechazada);
      setForm((prev) => ({ ...prev, idFincaDestino: "" }));
      return;
    }

    setConfirmado(false);
    setDestinoRechazado(false);
    setForm((prev) => ({ ...prev, idFincaDestino: "" }));
    setMostrarModalFinca(true);
  }, [fincaVentaDetectada, form.destinoNombre, form.tipoSolicitud, usuario]);

  const origenLabel = fincaOrigen ? `${fincaOrigen.nombre_finca} - ${fincaOrigen.vereda} - ${fincaOrigen.referencia}` : "";

  const destinoLabel = useMemo(() => {
    if (form.tipoSolicitud === "Traslado de finca a finca") {
      const finca = catalogoFincas.find((item) => String(item.id_finca) === String(form.idFincaDestino));
      return finca ? `${finca.nombre_finca} - ${finca.vereda} - ${finca.referencia}` : "";
    }
    return [form.destinoNombre, form.destinoVereda, form.destinoReferencia].filter(Boolean).join(" - ");
  }, [catalogoFincas, form]);


  const veredaOrigenActual = useMemo(() => normalizarVereda(fincaOrigen?.vereda || ""), [fincaOrigen]);

  const veredaDestinoActual = useMemo(() => {
    if (form.tipoSolicitud === "Traslado de finca a finca") {
      const finca = catalogoFincas.find((item) => String(item.id_finca) === String(form.idFincaDestino));
      return normalizarVereda(finca?.vereda || "");
    }
    return normalizarVereda(form.destinoVereda || DESTINOS_FIJOS[form.tipoSolicitud]?.vereda || "");
  }, [catalogoFincas, form.idFincaDestino, form.destinoVereda, form.tipoSolicitud]);

  const tarifaResumen = useMemo(() => {
    if (!veredaOrigenActual || !veredaDestinoActual) return null;
    return calcularTarifaMinima(veredaOrigenActual, veredaDestinoActual);
  }, [veredaDestinoActual, veredaOrigenActual]);

  useEffect(() => {
    if (tarifaResumen && (!form.valorOfertaCampesino || Number(form.valorOfertaCampesino) < Number(tarifaResumen.tarifa_minima))) {
      setForm((prev) => ({ ...prev, valorOfertaCampesino: String(tarifaResumen.tarifa_minima) }));
    }
  }, [tarifaResumen]);

  useEffect(() => {
    setPagoConfirmado(false);
  }, [form.valorOfertaCampesino, veredaOrigenActual, veredaDestinoActual]);

  const handleToggleBovino = (idBovino) => {
    setSeleccionados((prev) => (prev.includes(idBovino) ? prev.filter((item) => item !== idBovino) : [...prev, idBovino]));
  };

  const responderConfirmacionFinca = (aceptada) => {
    if (!thirdPartyInfo) return;
    ultimaDecisionRef.current = { fincaId: thirdPartyInfo.id_finca, nombreDestino: normalize(form.destinoNombre) };
    if (aceptada) {
      setConfirmado(true);
      setDestinoRechazado(false);
      const destinoConfirmado = construirDestinoDesdeFinca(thirdPartyInfo);
      setForm((prev) => ({ ...prev, ...destinoConfirmado }));
    } else {
      fincasRechazadasRef.current.add(Number(thirdPartyInfo.id_finca));
      setConfirmado(false);
      setDestinoRechazado(true);
      setForm((prev) => ({ ...prev, idFincaDestino: "", destinoVereda: "", destinoReferencia: "" }));
    }
    setMostrarModalFinca(false);
  };

  const validarPasoUno = () => {
    if (mostrarModalFinca) return "Debes responder primero si la finca encontrada es la finca destino de la venta.";
    if (!form.idFincaOrigen) return "Debes seleccionar una finca de origen.";
    if (!seleccionados.length) return "Debes seleccionar al menos un bovino.";
    if (!form.fechaRecogida) return "Debes seleccionar la fecha de recogida.";
    if (!form.horaRecogida) return "Debes seleccionar la hora de recogida.";
    if (form.tipoSolicitud === "Venta") {
      if (!form.destinoNombre.trim()) return "Debes escribir el nombre del destino.";
      if (!form.destinoVereda) return "Debes seleccionar la vereda de destino.";
      if (!form.destinoReferencia.trim()) return "Debes ingresar la dirección de destino.";
    }
    if (form.tipoSolicitud === "Traslado de finca a finca" && !form.idFincaDestino) {
      return "Debes seleccionar una finca de destino.";
    }
    return null;
  };

  const validarPasoPago = () => {
    if (!tarifaResumen) return "No se pudo calcular la tarifa mínima para esa ruta.";
    if (!form.valorOfertaCampesino) return "Debes ingresar la propuesta inicial de pago.";
    if (Number(form.valorOfertaCampesino) < Number(tarifaResumen.tarifa_minima)) {
      return `La propuesta inicial no puede ser menor a $${Number(tarifaResumen.tarifa_minima).toLocaleString("es-CO")}.`;
    }
    if (!pagoConfirmado) return "Debes confirmar la propuesta inicial para publicar la solicitud.";
    return null;
  };

  const construirPayloadSolicitud = () => {
    let destinoFinal = destinoLabel;
    if ((form.tipoSolicitud === "Venta a frigorifico" || form.tipoSolicitud === "Feria ganadera") && DESTINOS_FIJOS[form.tipoSolicitud]) {
      const fijo = DESTINOS_FIJOS[form.tipoSolicitud];
      destinoFinal = [fijo.nombre, fijo.vereda, fijo.referencia].filter(Boolean).join(" - ");
    }

    return {
      id_usuario: usuario.id_usuario,
      tipo_solicitud: form.tipoSolicitud,
      origen: origenLabel,
      destino: destinoFinal,
      fecha: form.fechaRecogida,
      hora_recogida: form.horaRecogida,
      contacto_entrega: form.contactoEntrega,
      telefono_contacto: normalizePhone(form.telefonoContacto),
      observaciones: form.observaciones,
      observaciones_ganado: form.observacionesGanado,
      bovino_ids: seleccionados,
      id_finca_origen: form.idFincaOrigen,
      id_finca_destino: form.idFincaDestino || undefined,
      destino_confirmado: confirmado,
      destino_rechazado: destinoRechazado,
      vereda_origen: veredaOrigenActual,
      vereda_destino: veredaDestinoActual,
      valor_referencia_campesino: Number(form.valorOfertaCampesino),
    };
  };

  const cargarSolicitudActual = async (idSolicitud = solicitudCreada?.id) => {
    if (!idSolicitud || !usuario?.id_usuario) return null;
    const data = await getSolicitudesCampesino(usuario.id_usuario, { force: true });
    const lista = Array.isArray(data) ? data : [];
    setSolicitudesEnProceso(filtrarSolicitudesEnProceso(lista));
    const encontrada = lista.find((item) => Number(item.id) === Number(idSolicitud)) || null;
    if (encontrada) setSolicitudActual(encontrada);
    return encontrada;
  };

  useEffect(() => {
    if (!solicitudCreada?.id) return undefined;
    cargarSolicitudActual(solicitudCreada.id).catch(console.error);
    const timer = setInterval(() => {
      cargarSolicitudActual(solicitudCreada.id).catch(console.error);
    }, 5000);
    return () => clearInterval(timer);
  }, [solicitudCreada?.id, usuario?.id_usuario]);

  const solicitudListaParaDocumentos = Boolean(
    solicitudActual?.id_transportador &&
    solicitudActual?.vehiculo_id &&
    ["Asignado", "En ruta"].includes(solicitudActual?.estado)
  );

  const ofertasPago = Array.isArray(solicitudActual?.ofertas_pago) ? solicitudActual.ofertas_pago : [];

  const tarifaMinimaActual = tarifaResumen?.tarifa_minima || solicitudActual?.tarifa_minima || 0;
  const distanciaActual = tarifaResumen?.distancia_km || solicitudActual?.distancia_km || 0;
  const valorInicialActual = form.valorOfertaCampesino || solicitudActual?.valor_referencia_campesino || "";

  const continuarSolicitudEnProceso = (solicitud) => {
    setSolicitudCreada({
      id: solicitud.id,
      codigo: solicitud.codigo,
      estado: solicitud.estado,
      tarifa_minima: solicitud.tarifa_minima,
      valor_referencia_campesino: solicitud.valor_referencia_campesino,
    });
    setSolicitudActual(solicitud);
    setForm((prev) => ({
      ...prev,
      valorOfertaCampesino: String(solicitud.valor_referencia_campesino || ""),
    }));
    setPagoConfirmado(true);
    setModoFormulario("continuar");
    const listaParaDocumentos = Boolean(
      solicitud.id_transportador &&
      solicitud.vehiculo_id &&
      ["Asignado", "En ruta"].includes(solicitud.estado)
    );
    setStep(listaParaDocumentos ? 3 : 2);
  };

  const iniciarNuevaSolicitud = () => {
    setStep(1);
    setForm(initialForm);
    setSeleccionados([]);
    setGuiaMovilidad(null);
    setDocumentoAdicional(null);
    setPagoConfirmado(false);
    setSolicitudCreada(null);
    setSolicitudActual(null);
    setContraofertas({});
    setModoFormulario("nuevo");
  };

  const volverAlSelector = async () => {
    setLoading(true);
    try {
      await cargarSolicitudesEnProceso();
      setModoFormulario("selector");
      setStep(1);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudieron cargar los procesos pendientes");
    } finally {
      setLoading(false);
    }
  };

  const cancelarEnProceso = async (solicitud) => {
    const confirmar = window.confirm(`¿Seguro que deseas cancelar la solicitud ${solicitud.codigo || `SOL-${solicitud.id}`}?`);
    if (!confirmar) return;
    try {
      setLoading(true);
      await cancelarSolicitud(solicitud.id, usuario.id_usuario);
      await cargarSolicitudesEnProceso();
      if (Number(solicitudCreada?.id) === Number(solicitud.id)) {
        setSolicitudCreada(null);
        setSolicitudActual(null);
        setModoFormulario("selector");
      }
    } catch (errorCancelar) {
      alert(errorCancelar.message || "No se pudo cancelar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  const siguientePaso = () => {
    const error = validarPasoUno();
    if (error) return alert(error);
    setStep(2);
  };

  const publicarSolicitudInicial = async () => {
    const error = validarPasoUno();
    if (error) return alert(error);
    const errorPago = validarPasoPago();
    if (errorPago) return alert(errorPago);
    const errorTelefono = validateContactFields({ telefono: form.telefonoContacto, telefonoRequired: false, correoRequired: false });
    if (errorTelefono) return alert(errorTelefono);

    try {
      setLoading(true);
      const creada = await crearSolicitud(construirPayloadSolicitud());
      setSolicitudCreada(creada);
      setModoFormulario("continuar");
      const actual = await cargarSolicitudActual(creada.id);
      setSolicitudActual(actual || creada);
      alert("Solicitud publicada. Ahora espera las propuestas de los transportadores para llegar a un acuerdo.");
    } catch (errorSolicitud) {
      alert(errorSolicitud.message || "No se pudo publicar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  const responderOferta = async (oferta, accion) => {
    try {
      setLoading(true);
      await responderOfertaCampesino(solicitudCreada.id, {
        id_usuario: usuario.id_usuario,
        transportador_id: oferta.transportador_id,
        accion,
      });
      await cargarSolicitudActual(solicitudCreada.id);
    } catch (errorOferta) {
      alert(errorOferta.message || "No se pudo responder la oferta");
    } finally {
      setLoading(false);
    }
  };

  const enviarContraoferta = async (oferta) => {
    const valor = Number(contraofertas[oferta.transportador_id] || 0);
    if (!valor) return alert("Debes ingresar un valor para la contraoferta.");
    if (tarifaMinimaActual && valor < Number(tarifaMinimaActual)) {
      return alert(`La contraoferta no puede ser menor a ${Number(tarifaMinimaActual).toLocaleString("es-CO")}.`);
    }

    try {
      setLoading(true);
      await responderOfertaCampesino(solicitudCreada.id, {
        id_usuario: usuario.id_usuario,
        transportador_id: oferta.transportador_id,
        accion: "contraofertar",
        valor_oferta: valor,
      });
      await cargarSolicitudActual(solicitudCreada.id);
    } catch (errorOferta) {
      alert(errorOferta.message || "No se pudo enviar la contraoferta");
    } finally {
      setLoading(false);
    }
  };

  const siguientePasoPago = async () => {
    if (!solicitudCreada?.id) {
      await publicarSolicitudInicial();
      return;
    }

    const actual = await cargarSolicitudActual(solicitudCreada.id);
    const puedeContinuar = Boolean(
      actual?.id_transportador &&
      actual?.vehiculo_id &&
      ["Asignado", "En ruta"].includes(actual?.estado)
    );

    if (!puedeContinuar) {
      return alert("Aún no puedes cargar documentos. Primero debe existir un acuerdo y el transportador debe aceptar la solicitud asignando la placa del vehículo.");
    }

    setStep(3);
  };

  const guardar = async () => {
    if (!solicitudCreada?.id) return alert("Primero debes publicar la solicitud y cerrar el acuerdo de pago.");
    if (!solicitudListaParaDocumentos) return alert("Aún falta que el transportador acepte y asigne la placa del vehículo.");
    if (!guiaMovilidad) return alert("La guía de movilidad es obligatoria.");

    try {
      setLoading(true);
      await cargarDocumentosSolicitud(solicitudCreada.id, {
        id_usuario: usuario.id_usuario,
        guia_movilidad: guiaMovilidad,
        documento_adicional: documentoAdicional,
      });
      alert("Documentos cargados correctamente.");
      onSuccess?.();
    } catch (errorSolicitud) {
      alert(errorSolicitud.message || "No se pudieron cargar los documentos");
    } finally {
      setLoading(false);
    }
  };

  if (modoFormulario === "selector" && solicitudesEnProceso.length > 0) {
    return (
      <div style={styles.card}>
        <h2 style={styles.mainTitle}>Crear nueva solicitud de transporte</h2>
        <div style={styles.infoNotice}>
          Tienes solicitudes en proceso. Puedes continuar una negociación pendiente, cargar documentos si ya tiene transportador y placa, cancelarla si todavía no fue aceptada o crear otra solicitud nueva sin perder las anteriores.
        </div>

        <div style={styles.pendingRequestsGrid}>
          {solicitudesEnProceso.map((solicitud) => (
            <div key={solicitud.id} style={styles.pendingRequestCard}>
              <div style={styles.pendingRequestHeader}>
                <strong>{solicitud.codigo || `SOL-${solicitud.id}`}</strong>
                <span style={styles.pendingBadge}>{solicitud.estado}</span>
              </div>
              <p style={styles.offerText}><strong>Origen:</strong> {solicitud.origen}</p>
              <p style={styles.offerText}><strong>Destino:</strong> {solicitud.destino}</p>
              <p style={styles.offerText}><strong>Fecha:</strong> {solicitud.fecha || "-"} {solicitud.hora_recogida || ""}</p>
              <p style={styles.offerText}><strong>Propuesta inicial:</strong> ${Number(solicitud.valor_referencia_campesino || 0).toLocaleString("es-CO")}</p>
              <p style={styles.offerText}><strong>Transportador:</strong> {solicitud.transportador_nombre || "Sin asignar"}</p>
              <p style={styles.offerText}><strong>Placa:</strong> {solicitud.vehiculo_placa || "Sin asignar"}</p>
              <div style={styles.pendingActions}>
                <button type="button" style={styles.primaryButton} onClick={() => continuarSolicitudEnProceso(solicitud)}>
                  Continuar proceso
                </button>
                {solicitud.puede_cancelar ? (
                  <button type="button" style={styles.rejectOfferButton} onClick={() => cancelarEnProceso(solicitud)} disabled={loading}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <button type="button" style={styles.secondaryButton} onClick={iniciarNuevaSolicitud}>
            Crear otra solicitud nueva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.titleRow}>
        <h2 style={styles.mainTitle}>Crear nueva solicitud de transporte</h2>
        {solicitudesEnProceso.length > 0 ? (
          <button type="button" style={styles.secondaryButton} onClick={volverAlSelector} disabled={loading}>{loading ? "Cargando..." : "Ver procesos pendientes"}</button>
        ) : null}
      </div>

      <div style={styles.stepsRow}>
        {[{ n: 1, label: "Origen y destino" }, { n: 2, label: "Acuerdo de pago" }, { n: 3, label: "Documentos" }].map((item, index, arr) => (
          <div key={item.n} style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, ...(step >= item.n ? styles.stepCircleActive : {}) }}>{item.n}</div>
            {index < arr.length - 1 && <div style={{ ...styles.stepLine, ...(step > item.n ? styles.stepLineActive : {}) }} />}
            <div style={{ ...styles.stepLabel, ...(step === item.n ? styles.stepLabelActive : {}) }}>{item.label}</div>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <>
          <div style={styles.formGrid}>
            <Field label="Tipo de solicitud">
              <select value={form.tipoSolicitud} onChange={(e) => setForm((p) => ({ ...p, tipoSolicitud: e.target.value }))} style={styles.input}>
                {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </Field>

            <Field label="Finca de origen">
              <select value={form.idFincaOrigen} onChange={(e) => setForm((p) => ({ ...p, idFincaOrigen: e.target.value }))} style={styles.input}>
                <option value="">Seleccionar finca</option>
                {fincasUsuario.map((finca) => <option key={finca.id_finca} value={finca.id_finca}>{finca.nombre_finca} - {finca.vereda}</option>)}
              </select>
            </Field>

            {form.tipoSolicitud === "Venta" && (
              <>
                <Field label="Vereda de destino">
                  <select
                    value={obtenerVeredaCompatible(form.destinoVereda)}
                    onChange={(e) => setForm((p) => ({ ...p, destinoVereda: e.target.value }))}
                    style={styles.input}
                  >
                    <option value="">Seleccionar vereda</option>
                    {VEREDAS_ZIPAQUIRA.map((vereda) => <option key={vereda} value={vereda}>{vereda}</option>)}
                  </select>
                  {form.idFincaDestino && confirmado ? (
                    <small style={styles.fieldHint}>La vereda se completó con la información de la finca registrada.</small>
                  ) : null}
                </Field>
                <Field label="Dirección de origen">
                  <textarea value={origenLabel} readOnly style={{ ...styles.textarea, ...styles.readonly }} />
                </Field>
                <Field label="Nombre del destino">
                  <input
                    value={form.destinoNombre}
                    onChange={(e) => {
                      const nuevoNombre = e.target.value;
                      setForm((p) => ({ ...p, destinoNombre: nuevoNombre, idFincaDestino: "" }));
                      setConfirmado(false);
                      setDestinoRechazado(false);
                      setMostrarModalFinca(false);
                    }}
                    style={styles.input}
                    placeholder="Nombre de la finca o destino"
                  />
                </Field>
                <Field label="Dirección de destino">
                  <textarea value={form.destinoReferencia} onChange={(e) => setForm((p) => ({ ...p, destinoReferencia: e.target.value }))} style={styles.textarea} placeholder="Ingrese la dirección completa" />
                </Field>
              </>
            )}

            {form.tipoSolicitud === "Traslado de finca a finca" && (
              <>
                <Field label="Finca de destino">
                  <select value={form.idFincaDestino} onChange={(e) => setForm((p) => ({ ...p, idFincaDestino: e.target.value }))} style={styles.input}>
                    <option value="">Seleccionar finca</option>
                    {catalogoFincas.filter((finca) => Number(finca.id_usuario) === Number(usuario?.id_usuario)).map((finca) => <option key={finca.id_finca} value={finca.id_finca}>{finca.nombre_finca} - {finca.vereda}</option>)}
                  </select>
                </Field>
                <Field label="Dirección de origen">
                  <textarea value={origenLabel} readOnly style={{ ...styles.textarea, ...styles.readonly }} />
                </Field>
                <Field label="Dirección de destino">
                  <textarea value={destinoLabel} readOnly style={{ ...styles.textarea, ...styles.readonly }} />
                </Field>
              </>
            )}

            {(form.tipoSolicitud === "Venta a frigorifico" || form.tipoSolicitud === "Feria ganadera") && (
              <>
                <Field label="Vereda de destino">
                  <input value={form.destinoVereda} readOnly style={{ ...styles.input, ...styles.readonly }} />
                </Field>
                <Field label="Dirección de origen">
                  <textarea value={origenLabel} readOnly style={{ ...styles.textarea, ...styles.readonly }} />
                </Field>
                <Field label="Dirección de destino">
                  <textarea value={destinoLabel} readOnly style={{ ...styles.textarea, ...styles.readonly }} />
                </Field>
              </>
            )}

            <Field label="Fecha de recogida">
              <input type="date" value={form.fechaRecogida} onChange={(e) => setForm((p) => ({ ...p, fechaRecogida: e.target.value }))} style={styles.input} />
            </Field>

            <Field label="Hora de recogida">
              <input type="time" value={form.horaRecogida} onChange={(e) => setForm((p) => ({ ...p, horaRecogida: e.target.value }))} style={styles.input} />
            </Field>

            <Field label="Contacto de entrega">
              <input value={form.contactoEntrega} onChange={(e) => setForm((p) => ({ ...p, contactoEntrega: e.target.value }))} style={styles.input} placeholder="Nombre de la persona de contacto" />
            </Field>

            <Field label="Teléfono de contacto">
              <input {...phoneInputProps(form.telefonoContacto, (value) => setForm((p) => ({ ...p, telefonoContacto: value })), false)} style={styles.input} />
            </Field>

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Observaciones">
                <textarea value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} style={styles.textarea} placeholder="Información adicional sobre el transporte" />
              </Field>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Observaciones sobre el ganado">
                <textarea value={form.observacionesGanado} onChange={(e) => setForm((p) => ({ ...p, observacionesGanado: e.target.value }))} style={styles.textarea} placeholder="Condiciones, recomendaciones o detalles del ganado" />
              </Field>
            </div>
          </div>

          <div style={styles.sectionDivider} />

          <div>
            <h3 style={styles.sectionTitle}>Bovinos seleccionados en la solicitud</h3>
            {bovinosFiltrados.length ? (
              <div style={styles.bovinoList}>
                {bovinosFiltrados.map((bovino) => (
                  <label key={bovino.id_bovino} style={styles.bovinoCard}>
                    <input type="checkbox" checked={seleccionados.includes(bovino.id_bovino)} onChange={() => handleToggleBovino(bovino.id_bovino)} />
                    <div>
                      <strong>{bovino.codigo_bovino}</strong>
                      <div style={styles.bovinoText}>{bovino.raza} · {bovino.peso_promedio} kg · {bovino.edad || "S/E"}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div style={styles.emptyText}>No hay bovinos disponibles en esa finca.</div>
            )}
          </div>

          <div style={styles.footer}>
            <button type="button" style={styles.primaryButton} onClick={siguientePaso}>Siguiente</button>
          </div>
        </>
      ) : step === 2 ? (
        <>
          <div style={styles.tarifaCard}>
            <h3 style={styles.sectionTitle}>Acuerdo de pago con transportadores</h3>
            <p style={styles.tarifaText}>
              Primero publica la solicitud con la propuesta inicial del campesino. Después los transportadores podrán aceptar esa propuesta o enviar una nueva.
              La carga de la guía se desbloquea únicamente cuando ya exista un acuerdo y el transportador haya aceptado la solicitud asignando la placa del vehículo.
            </p>
            <div style={styles.tarifaGrid}>
              <div><strong>Origen:</strong> {solicitudActual?.origen || origenLabel || "-"}</div>
              <div><strong>Destino:</strong> {solicitudActual?.destino || destinoLabel || "-"}</div>
              <div><strong>Distancia:</strong> {distanciaActual ? `${distanciaActual} km` : "-"}</div>
              <div><strong>Tarifa mínima:</strong> {tarifaMinimaActual ? `${Number(tarifaMinimaActual).toLocaleString("es-CO")}` : "-"}</div>
            </div>

            <Field label="Propuesta inicial del campesino">
              <input
                type="number"
                min={tarifaMinimaActual || 0}
                value={valorInicialActual}
                onChange={(e) => setForm((p) => ({ ...p, valorOfertaCampesino: e.target.value }))}
                style={styles.input}
                disabled={Boolean(solicitudCreada?.id)}
                placeholder={tarifaMinimaActual ? `Mínimo ${Number(tarifaMinimaActual).toLocaleString("es-CO")}` : "Valor del servicio"}
              />
            </Field>

            <label style={styles.confirmPaymentBox}>
              <input
                type="checkbox"
                checked={pagoConfirmado}
                disabled={Boolean(solicitudCreada?.id)}
                onChange={(e) => setPagoConfirmado(e.target.checked)}
              />
              <span>Confirmo que esta será la propuesta inicial que se publicará para los transportadores.</span>
            </label>

            {!solicitudCreada?.id ? (
              <div style={styles.infoNotice}>
                La solicitud todavía no se ha publicado. Cuando la publiques, quedará en estado de negociación y aparecerá en el panel del transportador.
              </div>
            ) : (
              <div style={styles.infoNotice}>
                <strong>Solicitud publicada:</strong> {solicitudActual?.codigo || solicitudCreada.codigo || `SOL-${solicitudCreada.id}`} ·
                <strong> Estado:</strong> {solicitudActual?.estado || solicitudCreada.estado || "Negociando pago"}
                {solicitudActual?.vehiculo_placa ? (
                  <> · <strong>Placa:</strong> {solicitudActual.vehiculo_placa}</>
                ) : null}
              </div>
            )}
          </div>

          {solicitudCreada?.id && (
            <div style={styles.offersCard}>
              <div style={styles.offersHeader}>
                <div>
                  <h3 style={styles.sectionTitle}>Propuestas recibidas</h3>
                  <p style={styles.tarifaText}>Aquí puedes ver qué transportador hizo cada propuesta y responder antes de pasar a documentos.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => cargarSolicitudActual(solicitudCreada.id)} disabled={loading}>
                  Actualizar
                </button>
              </div>

              {ofertasPago.length ? (
                <div style={styles.offersList}>
                  {ofertasPago.map((oferta) => (
                    <div key={oferta.id || oferta.transportador_id} style={styles.offerItem}>
                      <div>
                        <p style={styles.offerTitle}>
                          {oferta.propuesta_por === "campesino" ? "Propuesta del campesino" : "Propuesta del transportador"}
                        </p>
                        <p style={styles.offerText}><strong>Transportador:</strong> {oferta.transportador_nombre || `Transportador #${oferta.transportador_id}`}</p>
                        <p style={styles.offerText}><strong>Valor propuesto:</strong> ${Number(oferta.valor_oferta || 0).toLocaleString("es-CO")}</p>
                        <p style={styles.offerText}><strong>Estado:</strong> {oferta.estado}</p>
                      </div>

                      {oferta.estado === "pendiente_campesino" ? (
                        <div style={styles.offerActions}>
                          <button type="button" style={styles.primaryButton} onClick={() => responderOferta(oferta, "aceptar")} disabled={loading}>Aceptar propuesta</button>
                          <button type="button" style={styles.rejectOfferButton} onClick={() => responderOferta(oferta, "rechazar")} disabled={loading}>Rechazar</button>
                          <div style={styles.counterRow}>
                            <input
                              type="number"
                              min={tarifaMinimaActual || 0}
                              value={contraofertas[oferta.transportador_id] || ""}
                              onChange={(e) => setContraofertas((prev) => ({ ...prev, [oferta.transportador_id]: e.target.value }))}
                              style={styles.counterInput}
                              placeholder="Contraoferta"
                            />
                            <button type="button" style={styles.secondaryButton} onClick={() => enviarContraoferta(oferta)} disabled={loading}>Enviar</button>
                          </div>
                        </div>
                      ) : oferta.estado === "pendiente_transportador" ? (
                        <div style={styles.pendingBox}>Esperando respuesta del transportador.</div>
                      ) : oferta.estado === "acordado" ? (
                        <div style={styles.successBox}>Acuerdo alcanzado. Falta que el transportador acepte y seleccione la placa para habilitar documentos.</div>
                      ) : (
                        <div style={styles.pendingBox}>Esta propuesta ya no está activa.</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyText}>Aún no hay propuestas de transportadores. Esta sección se actualizará automáticamente.</div>
              )}
            </div>
          )}

          <div style={styles.footerBetween}>
            {solicitudCreada?.id ? (
              <button type="button" style={styles.secondaryButton} onClick={volverAlSelector}>Volver a pendientes</button>
            ) : (
              <button type="button" style={styles.secondaryButton} onClick={() => setStep(1)}>Atrás</button>
            )}
            <button type="button" style={styles.primaryButton} onClick={siguientePasoPago} disabled={loading}>
              {loading ? "Procesando..." : solicitudCreada?.id ? "Continuar a documentos" : "Publicar solicitud"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={styles.infoNotice}>
            <strong>Documentos habilitados.</strong> Ya existe acuerdo con transportador y vehículo asignado.
            {solicitudActual?.vehiculo_placa ? <> Placa del vehículo: <strong>{solicitudActual.vehiculo_placa}</strong>.</> : null}
          </div>
          <div style={styles.docsGrid}>
            <UploadCard
              title="Guía de movilidad"
              description="Archivo obligatorio. PDF, JPG o PNG."
              required
              file={guiaMovilidad}
              onChange={(file) => setGuiaMovilidad(file)}
            />
            <UploadCard
              title="Información adicional"
              description="Archivo opcional para anexos complementarios."
              file={documentoAdicional}
              onChange={(file) => setDocumentoAdicional(file)}
            />
          </div>
          <div style={styles.footerBetween}>
            <button type="button" style={styles.secondaryButton} onClick={() => setStep(2)}>Atrás</button>
            <button type="button" style={styles.primaryButton} onClick={guardar} disabled={loading}>{loading ? "Guardando..." : "Cargar documentos"}</button>
          </div>
        </>
      )}

      {mostrarModalFinca && thirdPartyInfo && Number(thirdPartyInfo.id_usuario) !== Number(usuario?.id_usuario) && form.tipoSolicitud === "Venta" && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Finca encontrada</h3>
            <div style={styles.modalInfoBox}>
              <p><strong>Finca:</strong> {thirdPartyInfo.nombre_finca}</p>
              <p><strong>Municipio:</strong> {thirdPartyInfo.municipio || "Zipaquira"}</p>
              <p><strong>Vereda:</strong> {thirdPartyInfo.vereda || "No registrada"}</p>
              <p><strong>Propietario:</strong> {thirdPartyInfo.propietario || "Sin propietario"}</p>
            </div>
            <p style={styles.modalQuestion}>¿Sí es esta la finca a la que le vas a vender el bovino?</p>
            <div style={styles.modalActions}>
              <button type="button" style={styles.modalYesButton} onClick={() => responderConfirmacionFinca(true)}>Sí</button>
              <button type="button" style={styles.modalNoButton} onClick={() => responderConfirmacionFinca(false)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={styles.label}>{label}</label>{children}</div>;
}

function UploadCard({ title, description, required = false, file, onChange }) {
  return (
    <div style={styles.uploadCard}>
      <div style={styles.uploadHead}>
        <div>
          <h4 style={styles.uploadTitle}>{title} {required ? <span style={styles.required}>*</span> : null}</h4>
          <p style={styles.uploadText}>{description}</p>
        </div>
      </div>
      <label style={styles.uploadArea}>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => onChange(e.target.files?.[0] || null)} />
        <span>{file ? file.name : "Seleccionar archivo"}</span>
      </label>
    </div>
  );
}

const styles = {
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "28px" },
  mainTitle: { margin: "0 0 22px", fontSize: "28px", color: "#111827" },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  stepsRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" },
  stepItem: { flex: 1, position: "relative", textAlign: "center" },
  stepCircle: { width: 38, height: 38, borderRadius: 999, background: "#e5e7eb", color: "#475569", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, position: "relative", zIndex: 2 },
  stepCircleActive: { background: "#55880a", color: "#fff" },
  stepLine: { position: "absolute", top: 18, left: "50%", width: "100%", height: 4, background: "#e5e7eb", zIndex: 1 },
  stepLineActive: { background: "#c7df9d" },
  stepLabel: { marginTop: 12, color: "#64748b", fontSize: 15 },
  stepLabelActive: { color: "#334155", fontWeight: 600 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  label: { display: "block", marginBottom: 8, fontWeight: 600, color: "#111827" },
  input: { width: "100%", height: 54, border: "1px solid #e5e7eb", borderRadius: 12, padding: "0 14px", background: "#f8fafc", fontSize: 15, boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 84, border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", background: "#f8fafc", fontSize: 15, boxSizing: "border-box", resize: "vertical" },
  readonly: { color: "#475569" },
  sectionDivider: { margin: "28px 0", borderTop: "1px solid #e5e7eb" },
  sectionTitle: { margin: "0 0 14px", color: "#111827" },
  bovinoList: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  bovinoCard: { display: "flex", gap: 10, alignItems: "flex-start", padding: 14, border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff" },
  bovinoText: { color: "#64748b", fontSize: 14, marginTop: 4 },
  emptyText: { color: "#64748b" },
  fieldHint: { display: "block", marginTop: 6, color: "#475569", fontSize: 13 },
  tarifaCard: { marginTop: 20, padding: 18, borderRadius: 16, background: "#f8fafc", border: "1px solid #dbe1ea" },
  tarifaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, color: "#334155", marginBottom: 14 },
  tarifaText: { color: "#64748b", marginTop: 0, marginBottom: 14 },
  confirmPaymentBox: { display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, padding: 14, borderRadius: 14, background: "#fff", border: "1px solid #dbe1ea", color: "#334155", lineHeight: 1.5 },
  docsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  uploadCard: { border: "1px solid #e5e7eb", borderRadius: 18, padding: 18, background: "#fff" },
  uploadHead: { marginBottom: 14 },
  uploadTitle: { margin: 0, fontSize: 18, color: "#111827" },
  uploadText: { margin: "6px 0 0", color: "#64748b", fontSize: 14 },
  required: { color: "#b91c1c" },
  uploadArea: { minHeight: 110, border: "1px dashed #94a3b8", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#334155", fontWeight: 600, cursor: "pointer", textAlign: "center", padding: 16 },
  footer: { display: "flex", justifyContent: "flex-end", marginTop: 28 },
  footerBetween: { display: "flex", justifyContent: "space-between", marginTop: 28 },
  primaryButton: { background: "#55880a", color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#fff", color: "#334155", border: "1px solid #d1d5db", borderRadius: 10, padding: "12px 22px", fontWeight: 700, cursor: "pointer" },
  rejectOfferButton: { background: "#b91c1c", color: "#fff", border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 700, cursor: "pointer" },
  infoNotice: { marginTop: 16, padding: 14, borderRadius: 14, background: "#eef6ff", border: "1px solid #bfdbfe", color: "#1e3a8a", lineHeight: 1.5 },
  offersCard: { marginTop: 18, padding: 18, borderRadius: 16, background: "#fff", border: "1px solid #dbe1ea" },
  offersHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 12 },
  offersList: { display: "grid", gap: 12 },
  offerItem: { display: "grid", gridTemplateColumns: "1fr auto", gap: 16, padding: 16, border: "1px solid #e5e7eb", borderRadius: 14, background: "#f8fafc" },
  offerTitle: { margin: "0 0 8px", fontWeight: 800, color: "#111827" },
  offerText: { margin: "4px 0", color: "#334155" },
  offerActions: { display: "flex", flexDirection: "column", gap: 10, minWidth: 260 },
  counterRow: { display: "flex", gap: 8 },
  counterInput: { minWidth: 0, flex: 1, height: 44, border: "1px solid #d1d5db", borderRadius: 10, padding: "0 12px", background: "#fff", boxSizing: "border-box" },
  pendingBox: { alignSelf: "center", padding: 12, borderRadius: 12, background: "#f1f5f9", color: "#475569", fontWeight: 700 },
  successBox: { alignSelf: "center", padding: 12, borderRadius: 12, background: "#ecfdf5", color: "#166534", fontWeight: 700, maxWidth: 300 },
  pendingRequestsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 20 },
  pendingRequestCard: { padding: 18, border: "1px solid #dbe1ea", borderRadius: 16, background: "#f8fafc" },
  pendingRequestHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, color: "#111827" },
  pendingBadge: { padding: "6px 10px", borderRadius: 999, background: "#e0f2fe", color: "#0c4a6e", fontSize: 13, fontWeight: 700 },
  pendingActions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1200 },
  modalCard: { width: "100%", maxWidth: 620, background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 20px 45px rgba(15, 23, 42, 0.2)" },
  modalTitle: { marginTop: 0, marginBottom: 14, textAlign: "center", color: "#5b536a", fontSize: 22 },
  modalInfoBox: { padding: 18, borderRadius: 14, background: "#f8fafc", border: "1px solid #dbe1ea", color: "#4b5563", lineHeight: 1.65 },
  modalQuestion: { marginTop: 18, marginBottom: 16, textAlign: "center", color: "#334155", fontWeight: 600 },
  modalActions: { display: "flex", justifyContent: "center", gap: 14 },
  modalYesButton: { border: "none", background: "#001B5A", color: "#fff", borderRadius: 10, padding: "11px 28px", fontWeight: 700, cursor: "pointer" },
  modalNoButton: { border: "none", background: "#b91c1c", color: "#fff", borderRadius: 10, padding: "11px 28px", fontWeight: 700, cursor: "pointer" },
};
