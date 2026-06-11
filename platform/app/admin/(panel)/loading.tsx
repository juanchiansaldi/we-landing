import WeLoader from "../../../components/WeLoader";

// Loader del panel: se muestra dentro del layout (la nav queda), solo el contenido carga.
export default function Loading() {
  return <WeLoader label="Cargando" />;
}
