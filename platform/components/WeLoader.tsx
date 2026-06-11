// Pantalla de carga de marca: el isotipo (copa) se llena de vino en loop.
// Animación 100% SVG (SMIL) + CSS, sin JS — sirve como server component.
// Misma técnica de "llenado" que el hero del landing (clipPath + nivel que sube).

const ISO_D = "M 0.0,59.2 C 0.1,123.8 0.3,127.2 5.7,141.1 C 9.8,151.5 16.5,161.3 25.4,169.7 C 36.2,180.0 49.1,187.0 63.3,190.1 L 69.0,191.3 L 69.0,234.2 L 69.0,277.0 L 34.5,277.0 L 0.0,277.0 L 0.0,288.0 L 0.0,299.0 L 80.0,299.0 L 160.0,299.0 L 160.0,288.0 L 160.0,277.0 L 125.5,277.0 L 91.0,277.0 L 91.0,234.1 L 91.0,191.2 L 95.3,190.5 C 102.9,189.2 115.9,183.9 123.3,179.0 C 136.9,170.1 147.4,157.6 153.6,143.0 C 159.8,128.6 160.0,126.4 160.0,60.0 L 160.0,0.0 L 149.6,0.0 L 139.1,0.0 L 138.8,61.2 C 138.4,121.2 138.4,122.6 136.2,129.0 C 131.1,144.2 119.4,157.9 105.8,164.4 C 101.8,166.3 96.8,168.2 94.8,168.5 L 91.1,169.2 L 90.8,118.3 C 90.4,69.1 90.3,67.3 88.1,59.5 C 77.9,23.7 46.4,0.0 8.9,0.0 L 0.0,0.0 L 0.0,59.2 M 38.5,28.3 C 46.8,32.6 58.6,44.7 62.7,53.0 C 68.9,65.7 69.0,66.5 69.0,120.3 L 69.0,169.2 L 65.3,168.5 C 63.2,168.2 58.1,166.2 54.0,164.3 C 44.2,159.6 32.8,148.4 28.1,139.0 C 21.6,125.7 21.7,126.2 21.3,73.2 C 21.0,46.6 21.1,24.2 21.4,23.4 C 22.1,21.6 30.0,23.9 38.5,28.3 M 168.5,281.5 C 166.6,283.3 166.0,285.0 166.0,288.0 C 166.0,296.5 175.0,300.1 181.1,294.1 C 185.2,290.0 184.8,283.9 180.1,280.3 C 177.3,278.1 171.2,278.7 168.5,281.5 M 178.5,280.6 C 180.9,281.6 183.1,286.6 182.4,289.5 C 181.6,292.7 177.5,296.0 174.3,296.0 C 173.0,296.0 170.8,294.9 169.5,293.5 C 163.2,287.3 170.1,277.4 178.5,280.6 M 171.4,288.0 C 171.3,292.4 171.6,293.0 173.4,293.0 C 174.9,293.0 175.1,292.7 174.2,291.8 C 172.6,290.2 172.7,289.0 174.4,289.0 C 175.2,289.0 176.2,289.9 176.5,291.0 C 176.8,292.1 177.8,293.0 178.6,293.0 C 179.9,293.0 179.9,292.7 178.6,290.8 C 177.5,289.2 177.3,288.3 178.1,287.3 C 180.0,285.1 178.3,283.0 174.8,283.0 C 171.5,283.0 171.5,283.0 171.4,288.0 M 176.5,286.0 C 176.5,288.2 173.6,287.8 173.2,285.7 C 172.9,284.3 173.3,283.9 174.7,284.2 C 175.7,284.4 176.5,285.2 176.5,286.0";

export default function WeLoader({ full = false, label = "Cargando" }: { full?: boolean; label?: string }) {
  return (
    <div className={`we-load${full ? " we-load-full" : ""}`} role="status" aria-live="polite">
      <div className="we-load-glow" />
      <div className="we-load-iso">
        <svg viewBox="0 0 183.92 299.00" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <path id="weLoadIso" d={ISO_D} />
            <clipPath id="weLoadClip"><use href="#weLoadIso" /></clipPath>
            <linearGradient id="weLoadWine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff4754" />
              <stop offset="1" stopColor="#c41f29" />
            </linearGradient>
          </defs>

          <use href="#weLoadIso" className="we-load-empty" />

          <g clipPath="url(#weLoadClip)">
            <g>
              <animateTransform attributeName="transform" attributeType="XML" type="translate"
                dur="3.6s" repeatCount="indefinite" calcMode="spline"
                keyTimes="0;0.42;0.72;1" values="0 299;0 44;0 44;0 299"
                keySplines="0.45 0 0.15 1; 0 0 1 1; 0.6 0 0.2 1" />
              <g>
                <animateTransform attributeName="transform" type="translate"
                  dur="2.1s" repeatCount="indefinite" calcMode="linear" values="0 0;-100 0" />
                <path fill="url(#weLoadWine)" d="M -200,16 Q -175,8 -150,16 T -100,16 T -50,16 T 0,16 T 50,16 T 100,16 T 150,16 T 200,16 T 250,16 L 250,340 L -200,340 Z" />
                <path fill="rgba(255,255,255,.35)" d="M -200,16 Q -175,8 -150,16 T -100,16 T -50,16 T 0,16 T 50,16 T 100,16 T 150,16 T 200,16 T 250,16 L 250,19 L -200,19 Z" />
              </g>
            </g>
          </g>
        </svg>
      </div>
      <div className="we-load-cap">
        <span className="we-load-t">{label}<span className="we-load-dots" /></span>
        <span className="we-load-s">We · Cava &amp; Gourmet</span>
      </div>
    </div>
  );
}
