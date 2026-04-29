import { cachedJsonRequest, invalidateRequestCache } from "../utils/requestCache";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API = `${API_URL}/admin`;

const manejarRespuesta = async (res, mensajeDefault) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || mensajeDefault);
  }
  return data;
};

export const crearSolicitud = async (payload) => {
  const formData = new FormData();

  formData.append("id_usuario", payload.id_usuario);
  formData.append("tipo_solicitud", payload.tipo_solicitud);
  formData.append("origen", payload.origen || "");
  formData.append("destino", payload.destino || "");
  formData.append("fecha", payload.fecha || "");
  formData.append("hora_recogida", payload.hora_recogida || "");
  formData.append("contacto_entrega", payload.contacto_entrega || "");
  formData.append("telefono_contacto", payload.telefono_contacto || "");
  formData.append("observaciones", payload.observaciones || "");
  formData.append("observaciones_ganado", payload.observaciones_ganado || "");
  formData.append("vereda_origen", payload.vereda_origen || "");
  formData.append("vereda_destino", payload.vereda_destino || "");
  formData.append("valor_referencia_campesino", payload.valor_referencia_campesino || 0);

  if (payload.id_finca_origen) formData.append("id_finca_origen", payload.id_finca_origen);
  if (payload.id_finca_destino) formData.append("id_finca_destino", payload.id_finca_destino);

  formData.append("destino_confirmado", payload.destino_confirmado ? "true" : "false");
  formData.append("destino_rechazado", payload.destino_rechazado ? "true" : "false");

  (payload.bovino_ids || []).forEach((id) => {
    formData.append("bovino_ids", id);
  });

  if (payload.guia_movilidad) formData.append("guia_movilidad", payload.guia_movilidad);
  if (payload.documento_adicional) formData.append("documento_adicional", payload.documento_adicional);

  const res = await fetch(`${API}/solicitudes/`, { method: "POST", body: formData });
  const data = await manejarRespuesta(res, "No se pudo crear la solicitud");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("transportador");
  invalidateRequestCache("admin");
  return data;
};

export const getSolicitudesCampesino = async (idUsuario, options = {}) => {
  return cachedJsonRequest(`${API}/solicitudes/usuario/${idUsuario}`, {}, { ttl: options.ttl ?? 15000, force: options.force });
};

export const cancelarSolicitud = async (solicitudId, idUsuario) => {
  const res = await fetch(`${API}/solicitudes/${solicitudId}/cancelar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_usuario: idUsuario }),
  });
  const data = await manejarRespuesta(res, "No se pudo cancelar la solicitud");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("transportador");
  invalidateRequestCache("admin");
  return data;
};

export const getSolicitudesVigentesTransportador = async (idUsuario, options = {}) => {
  return cachedJsonRequest(`${API}/transportador/${idUsuario}/solicitudes`, {}, { ttl: options.ttl ?? 15000, force: options.force });
};

export const aceptarSolicitudTransportador = async (solicitudId, idTransportador, idVehiculo) => {
  const res = await fetch(`${API}/transportador/solicitudes/${solicitudId}/aceptar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_transportador: idTransportador, id_vehiculo: idVehiculo }),
  });
  const data = await manejarRespuesta(res, "No se pudo aceptar la solicitud");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("transportador");
  invalidateRequestCache("viajes");
  invalidateRequestCache("admin");
  return data;
};

export const rechazarSolicitudTransportador = async (solicitudId, idTransportador) => {
  const res = await fetch(`${API}/transportador/solicitudes/${solicitudId}/rechazar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_transportador: idTransportador }),
  });
  const data = await manejarRespuesta(res, "No se pudo rechazar la solicitud");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("transportador");
  invalidateRequestCache("admin");
  return data;
};

export const proponerOfertaTransportador = async (solicitudId, idTransportador, valorOferta) => {
  const res = await fetch(`${API}/transportador/solicitudes/${solicitudId}/oferta`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_transportador: idTransportador, valor_oferta: Number(valorOferta) }),
  });
  const data = await manejarRespuesta(res, "No se pudo enviar la oferta");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("transportador");
  invalidateRequestCache("admin");
  return data;
};


export const aceptarOfertaInicialTransportador = async (solicitudId, idTransportador) => {
  const res = await fetch(`${API}/transportador/solicitudes/${solicitudId}/aceptar-oferta-inicial`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_transportador: idTransportador }),
  });
  const data = await manejarRespuesta(res, "No se pudo aceptar la primera oferta");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("transportador");
  invalidateRequestCache("admin");
  return data;
};

export const responderOfertaCampesino = async (solicitudId, payload) => {
  const res = await fetch(`${API}/solicitudes/${solicitudId}/ofertas/campesino`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await manejarRespuesta(res, "No se pudo responder la oferta");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("transportador");
  invalidateRequestCache("admin");
  return data;
};

export const getOfertasSolicitud = async (solicitudId, idUsuario, options = {}) => {
  return cachedJsonRequest(`${API}/solicitudes/${solicitudId}/ofertas?id_usuario=${idUsuario}`, {}, { ttl: options.ttl ?? 10000, force: options.force });
};

export const cargarDocumentosSolicitud = async (solicitudId, payload) => {
  const formData = new FormData();
  formData.append("id_usuario", payload.id_usuario);
  if (payload.guia_movilidad) formData.append("guia_movilidad", payload.guia_movilidad);
  if (payload.documento_adicional) formData.append("documento_adicional", payload.documento_adicional);

  const res = await fetch(`${API}/solicitudes/${solicitudId}/documentos`, {
    method: "PATCH",
    body: formData,
  });
  const data = await manejarRespuesta(res, "No se pudieron cargar los documentos");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("admin");
  return data;
};
