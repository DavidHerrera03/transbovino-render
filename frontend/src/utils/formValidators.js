export const PHONE_PATTERN = "3[0-9]{2} [0-9]{3} [0-9]{4}";
export const EMAIL_PATTERN = ".*@.*";

export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatColombianPhone(value) {
  const digits = onlyDigits(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function normalizePhone(value) {
  return onlyDigits(value).slice(0, 10);
}

export function isValidColombianPhone(value, required = true) {
  const digits = normalizePhone(value);
  if (!digits) return !required;
  return /^3\d{9}$/.test(digits);
}

export function isValidBasicEmail(value) {
  return String(value || "").includes("@");
}

export function phoneInputProps(value, onChange, required = true) {
  return {
    type: "text",
    inputMode: "numeric",
    maxLength: 12,
    pattern: PHONE_PATTERN,
    placeholder: "3xx xxx xxxx",
    title: "El teléfono debe iniciar con 3 y tener 10 números. Formato: 3xx xxx xxxx",
    value: formatColombianPhone(value),
    onChange: (e) => onChange(formatColombianPhone(e.target.value)),
    required,
  };
}

export function emailInputProps(value, onChange, required = true) {
  return {
    type: "email",
    pattern: EMAIL_PATTERN,
    title: "El correo debe contener mínimo el símbolo @",
    value,
    onChange: (e) => onChange(e.target.value),
    required,
  };
}

export function validateContactFields({ telefono, correo, telefonoRequired = true, correoRequired = true } = {}) {
  if (telefonoRequired && !isValidColombianPhone(telefono, true)) {
    return "El teléfono debe iniciar con 3 y tener exactamente 10 números. Ejemplo: 300 123 4567";
  }
  if (!telefonoRequired && telefono && !isValidColombianPhone(telefono, false)) {
    return "El teléfono de contacto debe iniciar con 3 y tener exactamente 10 números. Ejemplo: 300 123 4567";
  }
  if (correoRequired && !isValidBasicEmail(correo)) {
    return "El correo debe contener mínimo el símbolo @";
  }
  if (!correoRequired && correo && !isValidBasicEmail(correo)) {
    return "El correo debe contener mínimo el símbolo @";
  }
  return "";
}
