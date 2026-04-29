export const VEHICULO_CONFIG = {
  "Camión Jaula": {
    kgMin: 10000,
    kgMax: 30000,
    kgDefault: 20000,
    bovinosMin: 15,
    bovinosMax: 30,
    bovinosDefault: 22,
    descripcion: "Transporte ganadero con ventilación y varios niveles.",
  },
  "Camión de Estacas con Carpa": {
    kgMin: 3000,
    kgMax: 15000,
    kgDefault: 9000,
    bovinosMin: 4,
    bovinosMax: 12,
    bovinosDefault: 8,
    descripcion: "Protege del clima y reduce el riesgo de lesiones.",
  },
  "Tracción Animal": {
    kgMin: 500,
    kgMax: 1000,
    kgDefault: 750,
    bovinosMin: 1,
    bovinosMax: 1,
    bovinosDefault: 1,
    descripcion: "Opción rural para cargas pequeñas.",
  },
  "Camión Plataforma Especial": {
    kgMin: 5000,
    kgMax: 20000,
    kgDefault: 12500,
    bovinosMin: 6,
    bovinosMax: 18,
    bovinosDefault: 12,
    descripcion: "Ideal para animales grandes con rampas seguras.",
  },
};

export const getVehiculoConfig = (tipoVehiculo) => VEHICULO_CONFIG[tipoVehiculo] || null;

export const validarRangoVehiculo = (tipoVehiculo, cargaMaxima, capacidadBovinos) => {
  const config = getVehiculoConfig(tipoVehiculo);
  if (!config) {
    return { cargaError: "", bovinosError: "" };
  }

  const cargaNumero = Number(cargaMaxima);
  const bovinosNumero = Number(capacidadBovinos);

  const cargaError = Number.isNaN(cargaNumero) || cargaNumero < config.kgMin || cargaNumero > config.kgMax
    ? "Esa información no corresponde al tipo de vehículo."
    : "";

  const bovinosError = Number.isNaN(bovinosNumero) || bovinosNumero < config.bovinosMin || bovinosNumero > config.bovinosMax
    ? "Esa información no corresponde al tipo de vehículo."
    : "";

  return { cargaError, bovinosError };
};
