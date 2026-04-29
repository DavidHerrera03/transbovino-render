import { useState } from "react";
import eyeIcon from "../assets/icons/Ojo.png";

function PasswordInput({
  value,
  onChange,
  placeholder = "Contraseña",
  required = false,
  style = {},
  inputStyle = {},
  buttonStyle = {},
  helpText,
  helpTone = "neutral",
  ...props
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ ...styles.container, ...style }}>
      <div style={styles.wrapper}>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={{ ...styles.input, ...inputStyle }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          style={{ ...styles.toggle, ...buttonStyle }}
          aria-label={visible ? "Ocultar contraseña" : "Ver contraseña"}
          title={visible ? "Ocultar contraseña" : "Ver contraseña"}
        >
          <img src={eyeIcon} alt="" style={styles.icon} />
        </button>
      </div>
      {helpText ? <small style={{ ...styles.helpText, ...(helpTone === "success" ? styles.helpSuccess : {}) }}>{helpText}</small> : null}
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  wrapper: {
    position: "relative",
    width: "100%",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    paddingRight: "48px",
    boxSizing: "border-box",
  },
  toggle: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "30px",
    height: "30px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: "20px",
    height: "20px",
    objectFit: "contain",
  },
  helpText: {
    color: "#64748B",
    fontWeight: 400,
    lineHeight: 1.35,
  },
  helpSuccess: {
    color: "#29650B",
    fontWeight: 600,
  },
};

export default PasswordInput;
