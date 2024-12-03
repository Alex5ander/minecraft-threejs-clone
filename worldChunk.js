import * as THREE from 'three';
import { createNoise2D, createNoise3D } from 'simplex-noise';
import alea from 'alea';
const noise2D = createNoise2D(alea(Math.E));
const noise3D = createNoise3D(alea(Math.E));

const loadTexture = (value) => {
  const texture = new THREE.TextureLoader().load(value);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return new THREE.MeshLambertMaterial({ map: texture, transparent: true });
}

const grass_top = loadTexture('Tiles/grass_top.png');
const dirt_grass = loadTexture('Tiles/dirt_grass.png');
const snow = loadTexture('Tiles/snow.png');
const dirt_snow = loadTexture('Tiles/dirt_snow.png');
const dirt = loadTexture('Tiles/dirt.png');
const stone = loadTexture('Tiles/stone.png');
const sand = loadTexture('Tiles/sand.png');
const water = loadTexture('Tiles/water.png');
const lava = loadTexture('Tiles/lava.png');
const trunk_side = loadTexture('Tiles/trunk_side.png');
const leaves_transparent = loadTexture('Tiles/leaves_transparent.png');
const leaves_orange_transparent = loadTexture('Tiles/leaves_orange_transparent.png');
const trunk_top = loadTexture('Tiles/trunk_top.png');
const cactus_inside = loadTexture('Tiles/cactus_inside.png');
const cactus_side = loadTexture('Tiles/cactus_side.png');
const cactus_top = loadTexture('Tiles/cactus_top.png');
const clouds = new THREE.MeshBasicMaterial({ color: 0xffffff, });
clouds.side = THREE.DoubleSide;

const materials = {
  grass: [
    dirt_grass,
    dirt_grass,
    grass_top,
    dirt,
    dirt_grass,
    dirt_grass
  ],
  cactus: [cactus_side, cactus_side, cactus_top, cactus_inside, cactus_side, cactus_side],
  snow: [dirt_snow, dirt_snow, snow, dirt, dirt_snow, dirt_snow],
  leaves_orange_transparent: leaves_orange_transparent,
  leaves_transparent: leaves_transparent,
  trunk: [trunk_side, trunk_side, trunk_top, trunk_top, trunk_side, trunk_side],
  dirt: dirt,
  stone: stone,
  sand: sand,
  clouds: [null, null, clouds, null, null]
}

const geometry = new THREE.BoxGeometry();

const matrix = new THREE.Matrix4();

export class WorldChunk extends THREE.Group {
  size = 16;
  height = 32;
  terrainScale = 1.2;
  magnitude = 1;
  offset = 1;
  sealLevel = 4.51;
  /** @type {{[key:string]: { id:string, x: number, z: number, y:number }}} */
  blocks = {};
  constructor(size, height, terrainScale, magnitude, offset) {
    super();
    this.size = size;
    this.height = height;
    this.terrainScale = terrainScale;
    this.magnitude = magnitude;
    this.offset = offset;
  }
  generate() {
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const value = noise2D((this.position.x + x) / this.terrainScale, (this.position.z + z) / this.terrainScale);
        const scaledNoise = this.offset + this.magnitude * value;
        let height = Math.floor(scaledNoise);
        height = Math.max(0, Math.min(height, this.height - 1));
        for (let y = this.height; y >= 0; y--) {
          if (this.blocks[x] == null) {
            this.blocks[x] = {};
          }
          if (this.blocks[x][y] == null) {
            this.blocks[x][y] = {}
          }

          if (y <= this.sealLevel && y == height) {
            this.blocks[x][y][z] = { id: 'sand', x: x + this.position.x, z: z + this.position.z, y };
          }
          else if (y == height) {
            this.blocks[x][y][z] = { id: 'grass', x: x + this.position.x, z: z + this.position.z, y };

            if (value > 0.5 && value < 0.51) {
              this.generateTree(x, y, z)
            }

          } else if (y < height) {
            const id = height > this.sealLevel / 2 ? 'dirt' : 'stone';
            this.blocks[x][y][z] = { id, x: x + this.position.x, z: z + this.position.z, y };
          }
        }
      }
    }

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const value = (noise2D(
          (this.position.x + x) / 10,
          (this.position.z + z) / 10
        ) + 1) * 0.5;

        if (value < 0.5) {
          this.blocks[x][this.height - 1][z] = { id: 'clouds', x: x + this.position.x, z: z + this.position.z, y: this.height - 1 };
        }
      }
    }
  }
  generateTree(x, y, z) {
    const treeHeight = 5 + Math.round(noise2D(this.position.x + x / 40, this.position.z + z / 40) * 10);
    for (let i = 1; i < treeHeight; i++) {
      this.blocks[x][i + y][z] = { id: 'trunk', x: x + this.position.x, z: z + this.position.z, y: i + y };

      if (i == treeHeight - 1) {
        const r = Math.ceil(treeHeight / 2);

        for (let tx = -r; tx <= r; tx++) {
          for (let tz = -r; tz <= r; tz++) {
            for (let ty = -r; ty <= r; ty++) {

              const _y = i + ty + y;
              const dotProduct = tx * tx + ty * ty + tz * tz;
              if (dotProduct > r) continue;
              if (!this.blocks[x + tx]) {
                this.blocks[x + tx] = {}
              }
              if (!this.blocks[x + tx][_y]) {
                this.blocks[x + tx][_y] = {}
              }
              if (!this.blocks[x + tx][_y][z + tz]) {
                this.blocks[x + tx][_y][z + tz] = { id: 'leaves_transparent', x: this.position.x + x + tx, z: z + tz + this.position.z, y: _y };
              }
            }
          }
        }
      }
    }
  }
  generateMeshes = () => {
    /**@type {{[key:string]: THREE.InstancedMesh<THREE.BoxGeometry, any, THREE.InstancedMeshEventMap>}} */
    const meshes = {};

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          const isVisible = this.isVisible(x, y, z);
          const block = this.getBlock(x, y, z);

          if (block && isVisible) {
            let mesh = meshes[block.id];
            if (!mesh) {
              mesh = new THREE.InstancedMesh(geometry, materials[block.id], this.size * this.size * this.height);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.count = 0;
              meshes[block.id] = mesh;
            }
            matrix.setPosition(x, y, z);
            mesh.setMatrixAt(mesh.count, matrix);
            mesh.count += 1;
          }
        }
      }
    }

    const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size, this.size, this.size), water);
    waterMesh.position.y = this.sealLevel;
    waterMesh.position.x = (this.size / 2) - .5;
    waterMesh.position.z = waterMesh.position.x;
    waterMesh.rotation.x = Math.PI / -2;
    water.map.repeat = new THREE.Vector2(this.size, this.size);
    water.side = THREE.DoubleSide;
    water.map.wrapS = THREE.RepeatWrapping;
    water.map.wrapT = THREE.RepeatWrapping;
    water.opacity = 0.9;

    this.add(waterMesh);

    const lavaMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size, this.size, this.size), lava);
    lavaMesh.position.y = this.sealLevel - 4;
    lavaMesh.position.x = (this.size / 2) - .5;
    lavaMesh.position.z = lavaMesh.position.x;
    lavaMesh.rotation.x = Math.PI / -2;
    lava.map.repeat = new THREE.Vector2(this.size, this.size);
    lava.side = THREE.DoubleSide;
    lava.map.wrapS = THREE.RepeatWrapping;
    lava.map.wrapT = THREE.RepeatWrapping;
    lava.opacity = 0.9;

    this.add(lavaMesh);

    this.add(...Object.values(meshes));
  }
  getBlock(x, y, z) {
    if (x >= 0 && x < this.size && y >= 0 && y < this.height && z >= 0 && z < this.size) {
      return this.blocks[x][y][z]
    }
    return undefined
  };
  isVisible(x, y, z) {
    const forward = this.getBlock(x, y, z + 1);
    const back = this.getBlock(x, y, z - 1);
    const up = this.getBlock(x, y + 1, z);
    const down = this.getBlock(x, y - 1, z);
    const left = this.getBlock(x - 1, y, z);
    const right = this.getBlock(x + 1, y, z);
    return forward == undefined || back == undefined || down == undefined || up == undefined || left == undefined || right == undefined;
  }
  disposeInstances() {
    this.traverse((obj) => {
      if (obj.dispose) obj.dispose();
    });
    this.clear();
  }
}