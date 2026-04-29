export const PASSWORD_RULE_TEXT = "Mínimo 8 caracteres, una minúscula, una mayúscula y un carácter especial.";

export function getPasswordMissingRequirements(password = "") {
  const value = String(password || "");
  const missing = [];

  if (value.length < 8) missing.push("mínimo 8 caracteres");
  if (!/[a-z]/.test(value)) missing.push("una minúscula");
  if (!/[A-Z]/.test(value)) missing.push("una mayúscula");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) missing.push("un carácter especial");

  return missing;
}

export function validatePasswordStrength(password = "") {
  return getPasswordMissingRequirements(password).length === 0;
}

export function getPasswordHelpText(password = "", optional = false) {
  const value = String(password || "");

  if (!value && optional) {
    return `Si desea cambiarla: ${PASSWORD_RULE_TEXT}`;
  }

  const missing = getPasswordMissingRequirements(value);
  if (missing.length === 0) {
    return "Contraseña segura.";
  }

  return `Falta: ${missing.join(", ")}.`;
}
