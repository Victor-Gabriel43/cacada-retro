// Vitrine 3D: mostra o item escolhido sobre um pedestal, com os anúncios como etiquetas ao redor.
// O modelo é desenhado aqui mesmo, sem arquivo externo.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CELULAR = matchMedia("(max-width:760px)").matches;
const SEM_MOVIMENTO = matchMedia("(prefers-reduced-motion:reduce)").matches;

function casca(cor) {
  return CELULAR
    ? new THREE.MeshPhysicalMaterial({ color: 0x2f7fe0, roughness: 0.15, transparent: true, opacity: 0.68, clearcoat: 1, side: THREE.DoubleSide })
    : new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.14, transmission: 1, thickness: 1.1, ior: 1.46, attenuationColor: new THREE.Color(cor), attenuationDistance: 3.2, clearcoat: 1, clearcoatRoughness: 0.08 });
}
const fosco = (cor, r = 0.45, m = 0.1) => new THREE.MeshStandardMaterial({ color: cor, roughness: r, metalness: m });

function controle() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-1.5, 1.0);
  s.lineTo(1.5, 1.0);
  s.bezierCurveTo(2.0, 1.0, 2.2, 0.6, 2.35, 0.0);
  s.bezierCurveTo(2.55, -0.8, 2.6, -1.6, 2.2, -1.75);
  s.bezierCurveTo(1.85, -1.85, 1.55, -1.2, 1.2, -0.75);
  s.lineTo(-1.2, -0.75);
  s.bezierCurveTo(-1.55, -1.2, -1.85, -1.85, -2.2, -1.75);
  s.bezierCurveTo(-2.6, -1.6, -2.55, -0.8, -2.35, 0.0);
  s.bezierCurveTo(-2.2, 0.6, -2.0, 1.0, -1.5, 1.0);
  const corpo = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 0.46, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14, bevelSegments: 8, curveSegments: 40 }),
    casca(0x6db3f5),
  );
  corpo.position.z = -0.23;
  g.add(corpo);

  // Por dentro: placa, trilhas douradas e bateria, que aparecem através da casca
  const placa = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.25, 0.05), fosco(0x123b2a, 0.5));
  placa.position.set(0, 0.25, -0.02);
  g.add(placa);
  const ouro = fosco(0xd9a441, 0.3, 0.9);
  for (let i = 0; i < 9; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.018, 0.012), ouro);
    t.position.set(0, -0.2 + i * 0.11, 0.015);
    g.add(t);
  }
  const bateria = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.75, 8, 20), fosco(0xb8bcc4, 0.3, 0.8));
  bateria.rotation.z = Math.PI / 2;
  bateria.position.set(0, -0.35, -0.03);
  g.add(bateria);

  // Sticks
  const preto = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.85, envMapIntensity: 0.25 });
  for (const x of [-0.82, 0.82]) {
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.22, 32), preto);
    haste.rotation.x = Math.PI / 2;
    haste.position.set(x, -0.5, 0.42);
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.29, 0.1, 40), preto);
    topo.rotation.x = Math.PI / 2;
    topo.position.set(x, -0.5, 0.56);
    g.add(haste, topo);
  }

  // Direcional
  const claro = fosco(0xdfe6f2, 0.35);
  for (const a of [0, Math.PI / 2]) {
    const braco = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.09), claro);
    braco.rotation.z = a;
    braco.position.set(-1.65, 0.28, 0.4);
    g.add(braco);
  }

  // Quatro botões de ação
  for (const [dx, dy, cor] of [[0, 0.27, 0x53d6b8], [0.27, 0, 0xf2697f], [0, -0.27, 0x6da8ff], [-0.27, 0, 0xe6a6f0]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.09, 28), fosco(cor, 0.25));
    b.rotation.x = Math.PI / 2;
    b.position.set(1.65 + dx, 0.28 + dy, 0.4);
    g.add(b);
  }

  // Painel central e barra de luz
  const painel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.74, 0.05), new THREE.MeshPhysicalMaterial({ color: 0x0f1a2c, roughness: 0.3, clearcoat: 1 }));
  painel.position.set(0, 0.56, 0.39);
  g.add(painel);
  const luz = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.1), new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x5aa8ff, emissiveIntensity: 2 }));
  luz.position.set(0, 1.14, 0);
  g.add(luz);

  // Gatilhos
  for (const x of [-1.6, 1.6]) {
    const gat = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.48, 6, 16), casca(0x6db3f5));
    gat.rotation.z = Math.PI / 2;
    gat.position.set(x, 1.1, 0.02);
    g.add(gat);
  }
  g.rotation.x = -0.55;
  g.scale.setScalar(0.92);
  return g;
}

function console3d(cor) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 2.6), casca(cor));
  const placa = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 2), fosco(0x123b2a, 0.5));
  const fenda = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.03), fosco(0x14161c));
  fenda.position.set(0, 0, 1.31);
  const luz = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.03), new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x5aa8ff, emissiveIntensity: 2 }));
  luz.position.set(1.3, -0.2, 1.31);
  g.add(corpo, placa, fenda, luz);
  g.rotation.x = 0.28;
  return g;
}

export function montar(caixa, canvas, ao) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !CELULAR, alpha: true });
  } catch {
    ao.semSuporte();
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, CELULAR ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const cena = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 2, 0.1, 100);
  camera.position.set(0, 1.0, 11.5);
  camera.lookAt(0, -0.75, 0);

  const foco = new THREE.SpotLight(0xcfe4ff, 34, 30, 0.5, 0.8);
  foco.position.set(0, 8, 3);
  const contra = new THREE.PointLight(0x4f8fff, 22, 14);
  contra.position.set(-4, 0.6, -3.5);
  const quente = new THREE.PointLight(0xffc48a, 10, 12);
  quente.position.set(4, 0.2, 3);
  cena.add(foco, contra, quente);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.05, 0.22, 96), new THREE.MeshStandardMaterial({ color: 0x151d2d, roughness: 0.6, metalness: 0.2, envMapIntensity: 0.3 }));
  pedestal.position.y = -2.15;
  const anelLuz = new THREE.Mesh(new THREE.TorusGeometry(2.92, 0.012, 8, 160), new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x6db4ff, emissiveIntensity: 2.4 }));
  anelLuz.rotation.x = Math.PI / 2;
  anelLuz.position.y = -2.03;
  cena.add(pedestal, anelLuz);

  const giro = new THREE.Group();
  giro.position.y = 0.25;
  cena.add(giro);

  let ancoras = [];
  const ponto = new THREE.Vector3();

  function trocar(categoria, etiquetas) {
    giro.clear();
    const modelo = categoria === "Controle" ? controle() : console3d(0x4a6fa5);
    giro.add(modelo);
    ancoras = etiquetas.map((el, i) => {
      const a = (i / Math.max(etiquetas.length, 1)) * Math.PI * 2 + 0.5;
      const alt = i % 2 ? 1.2 : -0.3;
      return { el, pos: new THREE.Vector3(Math.cos(a) * 3.1, alt, Math.sin(a) * 3.1) };
    });
  }

  function medir() {
    const w = caixa.clientWidth, h = caixa.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Em tela estreita a câmera recua para o objeto caber
    camera.position.z = camera.aspect < 1.5 ? 15 : 11.5;
    camera.updateProjectionMatrix();
  }
  const obs = new ResizeObserver(medir);
  obs.observe(caixa);
  medir();

  // Arrastar para girar, com inércia
  let alvoY = -0.35, alvoX = 0, vel = 0, arrastando = false, ultimoX = 0, ultimoY = 0, tocou = false;
  const ip = (e) => { arrastando = true; tocou = true; ultimoX = e.clientX; ultimoY = e.clientY; canvas.setPointerCapture(e.pointerId); };
  const mv = (e) => {
    if (!arrastando) return;
    vel = (e.clientX - ultimoX) * 0.008;
    alvoY += vel;
    alvoX = THREE.MathUtils.clamp(alvoX + (e.clientY - ultimoY) * 0.004, -0.4, 0.5);
    ultimoX = e.clientX; ultimoY = e.clientY;
  };
  const fp = () => { arrastando = false; };
  canvas.addEventListener("pointerdown", ip);
  canvas.addEventListener("pointermove", mv);
  canvas.addEventListener("pointerup", fp);
  canvas.addEventListener("pointercancel", fp);

  let parado = false, quadro = 0;
  function desenhar() {
    quadro = requestAnimationFrame(desenhar);
    if (parado || document.hidden || !caixa.clientWidth) return;
    if (!arrastando) {
      alvoY += vel;
      vel *= 0.94;
      if (!SEM_MOVIMENTO && !tocou) alvoY += 0.0035;
    }
    giro.rotation.y += (alvoY - giro.rotation.y) * 0.14;
    giro.rotation.x += (alvoX - giro.rotation.x) * 0.14;
    if (!SEM_MOVIMENTO) giro.position.y = 0.25 + Math.sin(performance.now() / 1400) * 0.05;
    renderer.render(cena, camera);

    const w = caixa.clientWidth, h = caixa.clientHeight;
    for (const { el, pos } of ancoras) {
      ponto.copy(pos).applyEuler(new THREE.Euler(0, giro.rotation.y * 0.35, 0));
      const atras = ponto.z < -1.2;
      ponto.project(camera);
      el.style.transform = `translate(-50%,-50%) translate(${((ponto.x + 1) / 2) * w}px,${((1 - ponto.y) / 2) * h}px)`;
      el.style.opacity = atras ? 0.35 : 1;
      el.style.zIndex = atras ? 1 : 3;
    }
  }
  desenhar();

  return {
    trocar,
    pausar: (v) => { parado = v; },
    destruir: () => {
      cancelAnimationFrame(quadro);
      obs.disconnect();
      renderer.dispose();
    },
  };
}
