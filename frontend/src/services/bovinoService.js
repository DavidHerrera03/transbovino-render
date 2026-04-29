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

export const crearBovino = async (payload) => {
  const res = await fetch(`${API}/bovinos/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await manejarRespuesta(res, "No se pudo crear el bovino");
  invalidateRequestCache("bovinos");
  invalidateRequestCache("admin");
  return data;
};

export const obtenerBovinosPorUsuario = async (id_usuario, options = {}) => {
  return cachedJsonRequest(`${API}/bovinos/usuario/${id_usuario}`, {}, { ttl: options.ttl ?? 30000, force: options.force });
};

export const actualizarBovino = async (idBovino, payload) => {
  const res = await fetch(`${API}/bovinos/${idBovino}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await manejarRespuesta(res, "No se pudo actualizar el bovino");
  invalidateRequestCache("bovinos");
  invalidateRequestCache("admin");
  return data;
};

export const eliminarBovino = async (idBovino, idUsuario) => {
  const res = await fetch(`${API}/bovinos/${idBovino}?id_usuario=${idUsuario}`, {
    method: "DELETE",
  });
  const data = await manejarRespuesta(res, "No se pudo eliminar el bovino");
  invalidateRequestCache("bovinos");
  invalidateRequestCache("admin");
  return data;
};

export const obtenerTrazabilidadBovino = async (idBovino, idUsuario) => {
  return cachedJsonRequest(`${API}/bovinos/${idBovino}/trazabilidad?id_usuario=${idUsuario}`, {}, { ttl: 30000 });
};

export const obtenerDocumentosBovino = async (idBovino, idUsuario) => {
  return cachedJsonRequest(`${API}/bovinos/${idBovino}/documentos?id_usuario=${idUsuario}`, {}, { ttl: 30000 });
};

export const subirDocumentoBovino = async (idBovino, idUsuario, file) => {
  const formData = new FormData();
  formData.append("id_usuario", idUsuario);
  formData.append("archivo", file);

  const res = await fetch(`${API}/bovinos/${idBovino}/documentos`, {
    method: "POST",
    body: formData,
  });
  const data = await manejarRespuesta(res, "No se pudo subir el documento del bovino");
  invalidateRequestCache("bovinos");
  return data;
};

export const obtenerUrlDocumentoBovino = async (idDocumento, idUsuario) => {
  const res = await fetch(`${API}/bovinos/documentos/${idDocumento}?id_usuario=${idUsuario}`);
  return manejarRespuesta(res, "No se pudo obtener el documento");
};

export const eliminarDocumentoBovino = async (idDocumento, idUsuario) => {
  const res = await fetch(`${API}/bovinos/documentos/${idDocumento}?id_usuario=${idUsuario}`, {
    method: "DELETE",
  });
  const data = await manejarRespuesta(res, "No se pudo eliminar el documento");
  invalidateRequestCache("bovinos");
  return data;
};
