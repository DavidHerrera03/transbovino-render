import TransportadorLayout from "../TransportadorLayout";
import VehiculoForm from "../../../components/VehiculoForm";

function AgregarVehiculos({ usuario, salir, setVistaInterna, vistaInterna }) {
  return (
    <TransportadorLayout usuario={usuario} salir={salir} setVistaInterna={setVistaInterna} vistaInterna={vistaInterna}>
      <h2>Agregar vehículo</h2>
      <div style={styles.card}>
        <VehiculoForm usuario={usuario} onSuccess={() => setVistaInterna("misVehiculos")} />
      </div>

      <button style={styles.back} onClick={() => setVistaInterna("vehiculos")}>
        Volver
      </button>
    </TransportadorLayout>
  );
}

const styles = {
  card: { background: "#fff", padding: "20px", borderRadius: "12px", maxWidth: "720px" },
  back: { marginTop: "16px", padding: "10px 14px", borderRadius: "8px", border: "none", cursor: "pointer" },
};

export default AgregarVehiculos;
