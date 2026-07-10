import * as THREE from 'three';

export enum GameState {
  MENU = 'MENU',
  OPTIONS = 'OPTIONS',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  GAMECLEAR = 'GAMECLEAR',
}

export interface KeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  attack: string; // Punch (P)
  skill: string;  // Burst Skill (O)
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  score: number;
  kills: number;
  skillCooldown: number;
  skillReady: boolean;
  attackCooldown: number;
}

export interface GameItem {
  id: string;
  x: number;
  z: number;
  type: 'POTION';
  mesh: THREE.Group | THREE.Sprite;
  collected: boolean;
}

export interface Enemy {
  id: string;
  x: number;
  z: number;
  speed: number;
  health: number; // 2 hits to defeat
  maxHealth: number;
  mesh: THREE.Group;
  sprite: THREE.Sprite | THREE.Mesh;
  direction: number; // 1 for right, -1 for left
  state: 'WALKING' | 'HIT_KNOCKBACK' | 'HIT_DEATH' | 'ATTACKING';
  knockbackTimer: number;
  knockbackDirX: number;
  knockbackDirZ: number;
  flashTimer: number; // For flashing red/white
  flashColor: 'red' | 'white' | null;
  animFrame: number;
  animTimer: number;
  animRow: number;
}

export interface Fireball {
  id: string;
  targetX: number;
  targetZ: number;
  currentX: number;
  currentY: number;
  currentZ: number;
  speedY: number;
  startY: number;
  mesh: THREE.Group;
  indicatorMesh: THREE.Mesh;
  hasLanded: boolean;
  explosionTimer: number;
  damageDealt: boolean;
}

export interface BossState {
  health: number;
  maxHealth: number;
  x: number;
  z: number;
  mesh: THREE.Group;
  pattern: 'IDLE' | 'DASH_NEAR' | 'DASH_FAR' | 'PRE_ATTACK' | 'ATTACKING';
  patternTimer: number;
  targetX: number;
  targetZ: number;
  animScale: number;
  animScaleDir: number; // For pulsing scaling before fireball
  animFrame: number;
  animTimer: number;
  animRow: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number; // 0 to 1
  decay: number;
  mesh: THREE.Mesh;
}
