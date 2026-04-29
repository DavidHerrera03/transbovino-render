import { useState } from "react";
import logo from "../../assets/transbovino-logo.png";
import fondoAuth from "../../assets/auth-background.png";
import telefonoIcon from "../../assets/icons/telefono.png";
import cedulaIcon from "../../assets/icons/cedula.png";
import eyeIcon from "../../assets/icons/Ojo.png";
export const authStyles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    backgroundImage: `linear-gradient(rgba(255,255,255,0.42), rgba(255,255,255,0.42)), url(${fondoAuth})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
  card: {
    width: "100%",
    maxWidth: "430px",
    borderRadius: "24px",
    padding: "32px 28px",
    background: "rgba(255, 248, 235, 0.72)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.35)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: "112px",
    height: "112px",
    objectFit: "contain",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "28px",
    fontWeight: "700",
    color: "#222222",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    marginBottom: "22px",
    fontSize: "14px",
    color: "#444444",
    textAlign: "center",
    lineHeight: 1.5,
  },
  content: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  inputWrapper: {
    width: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    width: "18px",
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  iconImage: {
    width: "20px",
    height: "20px",
    objectFit: "contain",
    display: "block",
    filter: "brightness(0)",
  },
  input: {
    width: "100%",
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(0, 0, 0, 0.10)",
    outline: "none",
    padding: "0 46px 0 44px",
    fontSize: "14px",
    color: "#1f1f1f",
    background: "rgba(255, 255, 255, 0.78)",
    boxSizing: "border-box",
  },

  togglePassword: {
    position: "absolute",
    right: "14px",
    width: "22px",
    height: "22px",
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  togglePasswordIcon: {
    width: "20px",
    height: "20px",
    objectFit: "contain",
  },
  helpText: {
    color: "#64748B",
    fontSize: "12px",
    lineHeight: 1.35,
    paddingLeft: "4px",
  },
  helpSuccess: {
    color: "#29650B",
    fontWeight: 600,
  },
  helpError: {
    color: "#b00020",
    fontWeight: 600,
  },
  select: {
    width: "100%",
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(0, 0, 0, 0.10)",
    outline: "none",
    padding: "0 14px",
    fontSize: "14px",
    color: "#1f1f1f",
    background: "rgba(255, 255, 255, 0.78)",
    boxSizing: "border-box",
  },
  rowLinks: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    width: "100%",
    marginTop: "-2px",
  },
  textLink: {
    fontSize: "13px",
    color: "#1d3557",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: "600",
  },
  button: {
    width: "100%",
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "#2D6A4F",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "4px",
  },
  secondaryButton: {
    width: "100%",
    height: "48px",
    border: "none",
    borderRadius: "14px",
    background: "#2D6A4F",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },
  error: {
    margin: 0,
    color: "#b00020",
    fontSize: "13px",
    textAlign: "center",
  },
  success: {
    margin: 0,
    color: "#1b5e20",
    fontSize: "13px",
    textAlign: "center",
  },
};

function UserIcon({ color = "#000000" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ color = "#000000" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" />
      <path
        d="M8 11V8C8 5.79086 9.79086 4 12 4C14.2091 4 16 5.79086 16 8V11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon({ color = "#000000" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="2" />
      <path
        d="M4 7L12 13L20 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssetIcon({ src, alt }) {
  return <img src={src} alt={alt} style={authStyles.iconImage} />;
}

export function IconInput({
  type = "text",
  icon = "user",
  iconColor = "#000000",
  placeholder,
  value,
  onChange,
  required = false,
  helpText,
  helpTone = "neutral",
  ...props
}) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const esPassword = type === "password";

  const renderIcon = () => {
    switch (icon) {
      case "lock":
        return <LockIcon color={iconColor} />;
      case "mail":
        return <MailIcon color={iconColor} />;
      case "phone":
        return <AssetIcon src={telefonoIcon} alt="Teléfono" />;
      case "cedula":
        return <AssetIcon src={cedulaIcon} alt="Cédula" />;
      case "user":
      default:
        return <UserIcon color={iconColor} />;
    }
  };

  return (
    <div style={authStyles.inputGroup}>
      <div style={authStyles.inputWrapper}>
        <span style={authStyles.inputIcon}>{renderIcon()}</span>
        <input
        type={esPassword && mostrarPassword ? "text" : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        style={authStyles.input}
        {...props}
      />
      {esPassword ? (
        <button
          type="button"
          style={authStyles.togglePassword}
          onClick={() => setMostrarPassword((prev) => !prev)}
          aria-label={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
          title={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
        >
          <img src={eyeIcon} alt="" style={authStyles.togglePasswordIcon} />
        </button>
      ) : null}
      </div>
      {helpText ? (
        <small
          style={{
            ...authStyles.helpText,
            ...(helpTone === "success" ? authStyles.helpSuccess : {}),
            ...(helpTone === "error" ? authStyles.helpError : {}),
          }}
        >
          {helpText}
        </small>
      ) : null}
    </div>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div style={authStyles.page}>
      <div style={authStyles.card}>
        <img src={logo} alt="Logo TransBovino" style={authStyles.logo} />
        <h1 style={authStyles.title}>{title}</h1>
        {subtitle ? <p style={authStyles.subtitle}>{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}

export default AuthShell;