import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { World } from './world';

const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color(0x00ffff));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffffff, 50, 100);

const skyBox = new THREE.CubeTextureLoader().load([
  "./Other/skybox_side.png",
  "./Other/skybox_side.png",
  "./Other/skybox_top.png",
  "./Other/skybox_bottom.png",
  "./Other/skybox_side.png",
  "./Other/skybox_side.png",
]);

scene.background = skyBox;

const sun = new THREE.DirectionalLight();
const setupLight = () => {
  sun.intensity = 1.5;
  sun.position.set(50, 50, 50);
  sun.castShadow = true;

  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0009;
  sun.shadow.mapSize = new THREE.Vector2(2048, 2048);
  scene.add(sun);
  scene.add(sun.target);

  const ambient = new THREE.AmbientLight();
  ambient.intensity = 0.2;
  scene.add(ambient);
}

const world = new World();
world.generate();
scene.add(world);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 50
const orbitcontrols = new OrbitControls(camera, renderer.domElement);

const pointercam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
pointercam.position.y = 10
const pointer = new PointerLockControls(pointercam, renderer.domElement);

setupLight();

const keys = {}

const player = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
// scene.add(player);

const hand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff0000 }));
player.add(hand);

hand.position.z -= 0.5;
hand.position.x += .75;
hand.position.y += 0.5;
hand.rotation.x = Math.PI / 2;

const geo = new THREE.BoxGeometry(1.001, 1.001, 1.001);
const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, color: 0xff0000 })

const helpers = new THREE.Group()
const createHelper = (x, y, z) => {
  const helper = new THREE.Mesh(geo, mat);
  helper.position.set(x, y, z)
  helpers.add(helper)
}
scene.add(helpers);

const gravity = 9.8;
let acceleration = 0;
const gameStats = {
  velocity: 0,
}
let ground = false;
let input = { x: 0, z: 0 };

const update = (step) => {
  const speed = 5
  input = {
    z: keys['KeyW'] ? speed : keys["KeyS"] ? -speed : 0,
    x: keys['KeyA'] ? -speed : keys["KeyD"] ? speed : 0
  }
  input.x *= ground ? 1 : 0.5
  input.z *= ground ? 1 : 0.5
  if (ground) {
    acceleration = 0;
    gameStats.velocity = 0;

    if (keys['Space']) {
      acceleration = 0;
      gameStats.velocity = gravity / 4;
      ground = false;
    }
  }
  else {
    acceleration += gravity * step;
    if (acceleration > gravity) {
      acceleration = gravity;
    }
    gameStats.velocity -= acceleration * step;
    pointercam.position.y += gameStats.velocity * step;
  }

  pointer.moveForward(input.z * step);
  pointer.moveRight(input.x * step);
  player.position.copy(pointercam.position);
}

const checkCollisions = () => {
  helpers.clear();

  let minx = Math.floor(player.position.x - player.geometry.parameters.width / 2);
  let maxx = Math.ceil(player.position.x + player.geometry.parameters.width / 2);

  let minz = Math.floor(player.position.z - player.geometry.parameters.width / 2);
  let maxz = Math.ceil(player.position.z + player.geometry.parameters.width / 2);

  let miny = Math.floor(player.position.y - (player.geometry.parameters.height - 0.5));
  let maxy = Math.ceil(player.position.y);

  const blocks = []

  for (let mx = minx; mx <= maxx; mx++) {
    for (let my = miny; my <= maxy; my++) {
      for (let mz = minz; mz <= maxz; mz++) {
        const block = world.getBlock(mx, my, mz);
        if (block) {
          blocks.push(block)
        }
      }
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    let a = blocks[i]
    const dx = a.x - pointercam.position.x;
    const dy = a.y - (pointercam.position.y - (player.geometry.parameters.height - 0.5));
    const dz = a.z - pointercam.position.z;

    if ((Math.abs(dy) < player.geometry.parameters.height / 2) && ((dx * dx + dz * dz) < player.geometry.parameters.width)) {
      // createHelper(a.x, a.y, a.z);
      const overlapY = (player.geometry.parameters.height / 2) - Math.abs(dy);
      const overlapXZ = player.geometry.parameters.width - Math.sqrt(dx * dx + dz * dz);

      let normal, overlap;
      if (overlapY < overlapXZ) {
        normal = new THREE.Vector3(0, -Math.sign(dy), 0);
        overlap = overlapY;
        ground = true;
        pointercam.position.add(normal.multiplyScalar(overlap))
      } else if (overlapY > overlapXZ) {
        normal = new THREE.Vector3(-dx, 0, -dz).normalize();
        overlap = overlapXZ;
        pointercam.position.add(normal.multiplyScalar(overlap))
      }
    }
  }

  if (blocks.length == 0) {
    ground = false
  }
}

let clock = new THREE.Clock();
let accumulator = 0;

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();

  stats.update();

  if (keys["KeyZ"]) {
    pointercam.position.y += 0.1;
  }
  if (keys["KeyX"]) {
    pointercam.position.y -= 0.1;
  }

  if (keys["KeyQ"]) {
    if (!pointer.isLocked) {
      orbitcontrols.disconnect()
      pointer.lock()
    } else {
      orbitcontrols.connect()
      pointer.unlock()
    }
    keys["KeyQ"] = false;
  }

  world.getVisibles(player.position.x, player.position.z);

  const stepSize = 1 / 100;
  accumulator += dt;
  while (accumulator >= stepSize) {
    update(stepSize);
    checkCollisions();
    accumulator -= stepSize;
  }

  player.rotation.copy(pointercam.rotation);
  player.position.y -= 1;
  hand.rotation.x = Math.sin((Date.now() / 2000) * input.z) + Math.PI / 2

  sun.position.copy(pointercam.position);
  sun.position.sub(new THREE.Vector3(-50, -50, -50));
  sun.target.position.copy(pointercam.position);

  if (pointer.isLocked) {
    renderer.render(scene, pointercam);
  } else {
    renderer.render(scene, camera);
  }
});

const gui = new GUI();
const folder = gui.addFolder('Terrain');
folder.onChange(() => {
  world.generate();
  pointercam.position.y = world.height - 2;
});
folder.add(world, 'chunkSize', 8, 100, 1);
folder.add(world, 'terrainScale', 0, 100, 0.1);
folder.add(world, 'magnitude', 0, 100, 0.1);
folder.add(world, 'offset', 0, 32, 0.1);
folder.add(world, 'height', 1, 100, 1);
gui.add(gameStats, 'velocity').listen()
const stats = new Stats();

document.addEventListener('keydown', e => keys[e.code] = true)
document.addEventListener('keyup', e => keys[e.code] = false)

document.body.appendChild(stats.dom);
document.body.appendChild(renderer.domElement);