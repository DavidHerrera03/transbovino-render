import logo from '../assets/transbovino-logo.png';
import backgroundImage from '../assets/auth-background.png';

function AuthLayout({ title, subtitle, children, cardWidth = '420px' }) {
  return (
    <div style={styles.page(backgroundImage)}>
      <div style={styles.overlay} />
      <div style={styles.wrapper}>
        <div style={styles.card(cardWidth)}>
          <img src={logo} alt="Logo TransBovino" style={styles.logo} />
          <h1 style={styles.title}>{title}</h1>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
          <div style={styles.content}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export const authStyles = {
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    background: 'rgba(241, 245, 249, 0.96)',
    outline: 'none',
  },
  primaryButton: {
    width: '100%',
    padding: '13px 16px',
    background: '#29650B',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
  },
  secondaryButton: {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.7)',
    color: '#29650B',
    border: '1px solid rgba(41, 101, 11, 0.45)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '15px',
  },
  textButton: {
    background: 'none',
    border: 'none',
    color: '#29650B',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    fontWeight: 500,
  },
  linksRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  messageError: {
    color: '#dc2626',
    fontSize: '13px',
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.45,
  },
  messageSuccess: {
    color: '#166534',
    fontSize: '13px',
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.45,
  },
  helperText: {
    color: '#dc2626',
    fontSize: '13px',
    margin: '-4px 0 0',
    textAlign: 'left',
  },
  label: {
    color: '#1f2937',
    fontWeight: 600,
    marginBottom: '6px',
    display: 'block',
  },
};

const styles = {
  page: (backgroundImage) => ({
    minHeight: '100vh',
    position: 'relative',
    backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.72), rgba(248, 250, 252, 0.78)), url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }),
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.32))',
    backdropFilter: 'blur(1.5px)',
  },
  wrapper: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 18px',
  },
  card: (cardWidth) => ({
    width: '100%',
    maxWidth: cardWidth,
    background: 'rgba(255, 255, 255, 0.88)',
    borderRadius: '24px',
    padding: '28px 28px 30px',
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.16)',
    border: '1px solid rgba(255,255,255,0.7)',
    backdropFilter: 'blur(8px)',
  }),
  logo: {
    width: '92px',
    height: '92px',
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto 10px',
  },
  title: {
    margin: '0 0 8px',
    textAlign: 'center',
    color: '#1f2937',
    fontSize: '2rem',
    lineHeight: 1.1,
  },
  subtitle: {
    margin: '0 auto 20px',
    textAlign: 'center',
    color: '#475569',
    lineHeight: 1.55,
    maxWidth: '90%',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};

export default AuthLayout;
