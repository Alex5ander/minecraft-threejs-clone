import * as THREE from 'three';
// import { WorldChunk } from './worldChunk';

export class World extends THREE.Group {
  chunkSize = 32;
  height = 32;
  terrainScale = 31.2;
  magnitude = 18.9;
  offset = 5.5;
  // /** @type {{[key:string]:WorldChunk}} */
  chunks = {};
  drawDistance = 2;
  constructor() {
    super();
  }
  generate() {
    this.disposeChunks();
    this.chunks = {}
    for (let x = -this.drawDistance; x <= this.drawDistance; x++) {
      for (let z = -this.drawDistance; z <= this.drawDistance; z++) {
        this.generateChunk(x, z);
      }
    }
  }
  generateChunk(x, z) {
    if (!this.chunks[x + "" + z]) {
      // const chunk = new WorldChunk(this.chunkSize, this.height, this.terrainScale, this.magnitude, this.offset);
      // chunk.position.set(x * this.chunkSize, 0, z * this.chunkSize);
      // chunk.userData = { x, z }
      // chunk.generate();
      // chunk.generateMeshes();
      // this.chunks[x + "" + z] = chunk;
      // this.add(chunk);
    }
  }
  disposeChunks() {
    this.traverse((chunk) => {
      if (chunk.disposeInstances) {
        chunk.disposeInstances();
      }
    });
    this.clear();
  }
  getBlock(x, y, z) {
    const [cx, cz] = [
      Math.floor(x / this.chunkSize),
      Math.floor(z / this.chunkSize)
    ]

    const [bx, by, bz] = [
      x - this.chunkSize * cx,
      y,
      z - this.chunkSize * cz
    ]

    const chunk = this.chunks[cx + "" + cz];
    return chunk && chunk.isVisible(bx, by, bz) ? chunk.getBlock(bx, by, bz) : null;
  }

  getVisibles(x, z) {
    const [cx, cz] = [
      Math.floor(x / this.chunkSize),
      Math.floor(z / this.chunkSize)
    ]
    const chunk = this.chunks[cx + "" + cz];
    const chunksVisibles = []
    if (chunk) {
      for (let i = cx - this.drawDistance; i <= cx + this.drawDistance; i++) {
        for (let j = cz - this.drawDistance; j <= cz + this.drawDistance; j++) {
          chunksVisibles.push({ x: i, z: j })
        }
      }
    }

    const chunksToAdd = chunksVisibles.filter(c => !this.chunks[c.x + "" + c.z]);
    chunksToAdd.forEach(e => {
      requestIdleCallback(() => this.generateChunk(e.x, e.z), { timeout: 1000 })
    });

    const chunksToList = Object.values(this.chunks);

    const chunksToRemove = chunksToList.filter(({ userData }) => !chunksVisibles.find(e => e.x == userData.x && e.z == userData.z))

    chunksToRemove.forEach((chunk) => {
      if (chunk) {
        chunk.disposeInstances();
        this.remove(chunk);
        const { userData } = chunk;
        delete this.chunks[userData.x + "" + userData.z];
      }
    })
  }
}