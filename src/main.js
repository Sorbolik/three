import './style.css'
import * as THREE from 'three';

// === SCENA ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === PARAMETRI MAPPA ===
const MAP_SIZE = 20;
const TILE_SIZE = 2;
const OBSTACLE_CHANCE = 0.15; // 15% di celle diventano muri
const obstacles = [];

// === PLAYER ===
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
scene.add(player);
player.position.set(0, 0.5, 0);

// === GENERAZIONE MAPPA ===
const floorGeometry = new THREE.PlaneGeometry(MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / 2;
scene.add(floor);

function generateMap() {
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let z = 0; z < MAP_SIZE; z++) {
      if (Math.random() < OBSTACLE_CHANCE && (x !== MAP_SIZE/2 || z !== MAP_SIZE/2)) {
        const boxGeo = new THREE.BoxGeometry(TILE_SIZE, 1, TILE_SIZE);
        const boxMat = new THREE.MeshBasicMaterial({ color: 0x4444ff });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(
          (x - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2,
          0.5,
          (z - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2
        );
        scene.add(box);
        obstacles.push(box);
      }
    }
  }
}

generateMap();

// === CAMERA ===
camera.position.set(0, 15, 0);
camera.lookAt(0, 0, 0);

// === INPUT ===
const keys = { w: false, a: false, s: false, d: false };
document.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
document.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

// === PROIETTILI ===
const bullets = [];
const bulletSpeed = 0.5;

document.addEventListener('mousedown', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(floor);

  if (intersects.length > 0) {
    const target = intersects[0].point;
    const dir = new THREE.Vector3().subVectors(target, player.position).normalize();

    player.rotation.y = Math.atan2(dir.x, dir.z);

    const bulletGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.copy(player.position);
    bullet.userData.velocity = dir.clone().multiplyScalar(bulletSpeed);
    scene.add(bullet);
    bullets.push(bullet);
  }
});

// === COLLISIONE SEMPLICE ===
function checkCollision(newPos) {
  for (const obs of obstacles) {
    const dx = Math.abs(newPos.x - obs.position.x);
    const dz = Math.abs(newPos.z - obs.position.z);
    if (dx < TILE_SIZE / 2 && dz < TILE_SIZE / 2) {
      return true;
    }
  }
  return false;
}


// Ritorna true se c'è collisione tra player e ostacolo per una posizione specifica
function collides(pos) {
  for (const obs of obstacles) {
    const dx = Math.abs(pos.x - obs.position.x);
    const dz = Math.abs(pos.z - obs.position.z);
    if (dx < TILE_SIZE / 2 + 0.5 && dz < TILE_SIZE / 2 + 0.5) { // 0.5 = metà player
      return true;
    }
  }
  return false;
}

// MOVIMENTO SCIVOLANTE
function movePlayer() {
  const speed = 0.15;
  let deltaX = 0, deltaZ = 0;

  if (keys.w) deltaZ -= speed;
  if (keys.s) deltaZ += speed;
  if (keys.a) deltaX -= speed;
  if (keys.d) deltaX += speed;

  // Prova movimento solo X
  let newPosX = player.position.clone();
  newPosX.x += deltaX;
  if (!collides(newPosX)) {
    player.position.x += deltaX;
  }

  // Prova movimento solo Z
  let newPosZ = player.position.clone();
  newPosZ.z += deltaZ;
  if (!collides(newPosZ)) {
    player.position.z += deltaZ;
  }
}


// === LOOP ===
function animate() {
  requestAnimationFrame(animate);

 movePlayer();

  // Aggiorna proiettili
for (let i = bullets.length - 1; i >= 0; i--) {
  const b = bullets[i];
  b.position.add(b.userData.velocity);

  // Controlla collisione con ostacoli
  let hit = false;
  for (const obs of obstacles) {
    const dx = Math.abs(b.position.x - obs.position.x);
    const dz = Math.abs(b.position.z - obs.position.z);
    if (dx < TILE_SIZE / 2 && dz < TILE_SIZE / 2) {
      hit = true;
      break;
    }
  }

  // Se collide con ostacolo o è fuori mappa, rimuovi il proiettile
  if (hit || b.position.x < -MAP_SIZE || b.position.x > MAP_SIZE || b.position.z < -MAP_SIZE || b.position.z > MAP_SIZE) {
    scene.remove(b);
    bullets.splice(i, 1);
  }
}


  // Camera segue il player
  camera.position.x = player.position.x;
  camera.position.z = player.position.z;
  camera.lookAt(player.position);

  renderer.render(scene, camera);
}

animate();

// === Resize ===
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
