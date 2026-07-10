import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameState, KeyBindings, PlayerStats, Enemy, GameItem, Fireball, BossState, Particle } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  keyBindings: KeyBindings;
  onGameOver: () => void;
  onGameClear: () => void;
  onStatsUpdate: (stats: PlayerStats) => void;
  onBossHealthUpdate: (health: number, maxHealth: number) => void;
  onBossSpawned: (spawned: boolean) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  keyBindings,
  onGameOver,
  onGameClear,
  onStatsUpdate,
  onBossHealthUpdate,
  onBossSpawned,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep references to callback props to prevent resetting the ThreeJS loop or causing infinite re-renders
  const callbacksRef = useRef({
    onGameOver,
    onGameClear,
    onStatsUpdate,
    onBossHealthUpdate,
    onBossSpawned,
  });

  useEffect(() => {
    callbacksRef.current = {
      onGameOver,
      onGameClear,
      onStatsUpdate,
      onBossHealthUpdate,
      onBossSpawned,
    };
  });

  // Use refs to share state with the Three.js loop without re-triggering React renders
  const stateRef = useRef({
    gameState,
    keyBindings,
    keysPressed: {} as Record<string, boolean>,
    
    // Player specs
    player: {
      x: 0,
      z: 0,
      y: 0.5,
      speed: 7.0,
      radius: 1.0,
      facingDir: 1, // 1 for right, -1 for left
      state: 'IDLE' as 'IDLE' | 'WALKING' | 'ATTACKING' | 'DANCE',
      invincibilityTimer: 0,
      attackTimer: 0,
      skillTimer: 0,
      
      // Animations
      animFrame: 0,
      animTimer: 0,
      animRow: 0, // 0: Idle, 1: Walk, 2: Attack, 3: Dance
    },
    
    // Player Stats
    stats: {
      health: 5,
      maxHealth: 5,
      score: 0,
      kills: 0,
      skillCooldown: 0,
      skillReady: true,
      attackCooldown: 0,
    } as PlayerStats,

    // Entities
    enemies: [] as Enemy[],
    items: [] as GameItem[],
    fireballs: [] as Fireball[],
    particles: [] as Particle[],
    boss: null as BossState | null,
    bossSpawned: false,
    portal: null as { mesh: THREE.Group; x: number; z: number } | null,
    
    // Enemy Spawning
    spawnTimer: 0,
    spawnInterval: 2.0, // seconds

    // ThreeJS Scene Core
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    playerGroup: null as THREE.Group | null,
    playerMaterial: null as THREE.MeshBasicMaterial | null,
    playerTexture: null as THREE.Texture | null,
    
    // Textures Cache
    textures: {} as Record<string, THREE.Texture>,
  });

  // Keep bindings and state updated in ref
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    stateRef.current.keyBindings = keyBindings;
  }, [keyBindings]);

  // Handle keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Record raw key code (e.g. 'KeyW', 'ArrowUp', 'KeyP')
      stateRef.current.keysPressed[e.code] = true;
      
      // Prevent scrolling with arrows/space inside the game frame
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keysPressed[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Use current callback references dynamically to avoid capturing stale closures
    const onStatsUpdate = (stats: PlayerStats) => callbacksRef.current.onStatsUpdate(stats);
    const onGameOver = () => callbacksRef.current.onGameOver();
    const onGameClear = () => callbacksRef.current.onGameClear();
    const onBossHealthUpdate = (health: number, max: number) => callbacksRef.current.onBossHealthUpdate(health, max);
    const onBossSpawned = (spawned: boolean) => callbacksRef.current.onBossSpawned(spawned);

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // --- 1. INITIALIZE THREE.JS SCENE & RENDERER ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.025);
    stateRef.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 11, 14);
    camera.lookAt(0, 0, 0);
    stateRef.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stateRef.current.renderer = renderer;

    // --- 2. LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa5b4fc, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    const d = 25;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Glowing point light at center
    const pointLight = new THREE.PointLight(0x4f46e5, 1.5, 30);
    pointLight.position.set(0, 4, 0);
    scene.add(pointLight);

    // --- 3. TEXTURE LOADER ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    // Texture cache helper
    const loadCachedTexture = (url: string, key: string, repeatX = 1, repeatY = 1): THREE.Texture => {
      const tex = textureLoader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      
      // Pixel perfect settings for retro sprites
      if (key !== 'ground') {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
      } else {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
      }
      stateRef.current.textures[key] = tex;
      return tex;
    };

    // Load ground texture
    const groundTexture = loadCachedTexture(
      'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png',
      'ground',
      12,
      12
    );

    // Load player sprite sheet
    const playerTexture = loadCachedTexture(
      'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png',
      'player'
    );
    playerTexture.repeat.set(1 / 4, 1 / 4);
    stateRef.current.playerTexture = playerTexture;

    // Load item potion
    loadCachedTexture(
      'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png',
      'item'
    );

    // Load enemy sprite sheet
    loadCachedTexture(
      'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png',
      'enemy'
    );

    // Load boss sprite sheet
    loadCachedTexture(
      'https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png',
      'boss'
    );

    // --- 4. GROUND CREATION ---
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Arena pillars / decorative boundaries
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, 5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.6 });
    const pillarCount = 12;
    const arenaRadius = 24.5;
    
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const px = Math.cos(angle) * arenaRadius;
      const pz = Math.sin(angle) * arenaRadius;
      
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 2.5, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);

      // Add a small neon flame point light on top of 4 pillars
      if (i % 3 === 0) {
        const torchGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const torchMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const torch = new THREE.Mesh(torchGeo, torchMat);
        torch.position.set(px, 5.2, pz);
        scene.add(torch);

        const flameLight = new THREE.PointLight(0xf97316, 0.8, 10);
        flameLight.position.set(px, 5.5, pz);
        scene.add(flameLight);
      }
    }

    // --- 5. PLAYER CREATION ---
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 1.2, 0);
    scene.add(playerGroup);
    stateRef.current.playerGroup = playerGroup;

    // Sprite representation using standard Mesh + Plane for full shadow support
    const playerGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const playerMat = new THREE.MeshBasicMaterial({
      map: playerTexture,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.DoubleSide,
    });
    stateRef.current.playerMaterial = playerMat;

    const playerSpriteMesh = new THREE.Mesh(playerGeo, playerMat);
    playerSpriteMesh.castShadow = true;
    playerGroup.add(playerSpriteMesh);

    // Player shadow receiver base (subtle dark circle underneath)
    const baseShadowGeo = new THREE.RingGeometry(0.01, 0.6, 16);
    const baseShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const baseShadow = new THREE.Mesh(baseShadowGeo, baseShadowMat);
    baseShadow.rotation.x = -Math.PI / 2;
    baseShadow.position.y = -1.15;
    playerGroup.add(baseShadow);

    // --- 6. PRE-SPAWN SPARE ITEMS (Potions) ---
    const spawnItemsInitial = () => {
      const pCount = 6;
      for (let i = 0; i < pCount; i++) {
        spawnPotionItem(
          (Math.random() - 0.5) * 36,
          (Math.random() - 0.5) * 36
        );
      }
    };

    const spawnPotionItem = (x: number, z: number) => {
      const itemGroup = new THREE.Group();
      itemGroup.position.set(x, 0.8, z);
      scene.add(itemGroup);

      const itemTex = stateRef.current.textures['item'];
      const itemGeo = new THREE.PlaneGeometry(1.2, 1.2);
      const itemMat = new THREE.MeshBasicMaterial({
        map: itemTex,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
      });
      const itemMesh = new THREE.Mesh(itemGeo, itemMat);
      itemMesh.castShadow = true;
      itemGroup.add(itemMesh);

      // Light glow ring under potion
      const ringGeo = new THREE.RingGeometry(0.1, 0.4, 8);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.75;
      itemGroup.add(ring);

      stateRef.current.items.push({
        id: Math.random().toString(),
        x,
        z,
        type: 'POTION',
        mesh: itemGroup,
        collected: false,
      });
    };

    // --- 7. PARTICLE SPARK SYSTEM ---
    const createParticleExplosion = (x: number, y: number, z: number, color: number, count = 12) => {
      const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      
      for (let i = 0; i < count; i++) {
        const pMat = new THREE.MeshBasicMaterial({ color });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(x, y, z);
        scene.add(pMesh);

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 1.5 + Math.random() * 3.5;
        
        stateRef.current.particles.push({
          id: Math.random().toString(),
          x, y, z,
          vx: Math.sin(phi) * Math.cos(theta) * speed,
          vy: Math.cos(phi) * speed + 1.5, // slightly upwards bias
          vz: Math.sin(phi) * Math.sin(theta) * speed,
          color: color.toString(),
          size: 0.15,
          life: 1.0,
          decay: 1.5 + Math.random() * 2.0, // dies in 0.3 - 0.7s
          mesh: pMesh,
        });
      }
    };

    // Glowing Skill ring visual
    const triggerSkillRingAnimation = (px: number, pz: number) => {
      const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const skillMesh = new THREE.Mesh(ringGeo, ringMat);
      skillMesh.rotation.x = -Math.PI / 2;
      skillMesh.position.set(px, 0.1, pz);
      scene.add(skillMesh);

      const animRing = {
        mesh: skillMesh,
        radius: 0.1,
        maxRadius: 6.0,
        speed: 12.0, // fast expansion
      };

      const updateSkillRing = (dt: number) => {
        animRing.radius += animRing.speed * dt;
        skillMesh.geometry.dispose();
        skillMesh.geometry = new THREE.RingGeometry(animRing.radius - 0.25, animRing.radius, 32);
        ringMat.opacity = Math.max(0, 1 - animRing.radius / animRing.maxRadius);
        
        if (animRing.radius >= animRing.maxRadius) {
          scene.remove(skillMesh);
          ringMat.dispose();
          skillMesh.geometry.dispose();
          return true; // Done
        }
        return false;
      };

      // Push to a list of animations in tick
      activeSkillRings.push(updateSkillRing);
    };

    const activeSkillRings: ((dt: number) => boolean)[] = [];

    // --- 8. FLOATING COMBAT TEXT GENERATOR ---
    const spawnFloatingText = (text: string, x: number, y: number, z: number, color: string) => {
      // In 3D space, we can create a canvas sprite with high contrast text
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 128;
      textCanvas.height = 64;
      const ctx = textCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 128, 64);
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillStyle = color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(text, 64, 32);
        ctx.fillText(text, 64, 32);
      }

      const txtTexture = new THREE.CanvasTexture(textCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: txtTexture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x, y + 1.2, z);
      sprite.scale.set(1.5, 0.75, 1);
      scene.add(sprite);

      let age = 0;
      const maxAge = 0.8; // seconds

      const updateFloatingText = (dt: number) => {
        age += dt;
        sprite.position.y += 1.8 * dt; // drift up
        spriteMat.opacity = 1 - (age / maxAge);
        
        if (age >= maxAge) {
          scene.remove(sprite);
          spriteMat.dispose();
          txtTexture.dispose();
          return true;
        }
        return false;
      };

      activeFloatingTexts.push(updateFloatingText);
    };

    const activeFloatingTexts: ((dt: number) => boolean)[] = [];

    // --- 9. WARP PORTAL CREATION ---
    const spawnWarpPortal = (x: number, z: number) => {
      const portalGroup = new THREE.Group();
      portalGroup.position.set(x, 0.05, z);
      scene.add(portalGroup);

      // Inner swirling disk
      const diskGeo = new THREE.CircleGeometry(1.8, 32);
      const diskMat = new THREE.MeshBasicMaterial({
        color: 0x4f46e5,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const disk = new THREE.Mesh(diskGeo, diskMat);
      disk.rotation.x = -Math.PI / 2;
      portalGroup.add(disk);

      // Outer golden particle ring
      const ringGeo = new THREE.RingGeometry(1.8, 2.0, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbcd14,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      portalGroup.add(ring);

      stateRef.current.portal = {
        mesh: portalGroup,
        x,
        z,
      };

      spawnFloatingText('PORTAL READY!', x, 1, z, '#fbcd14');
      createParticleExplosion(x, 0.5, z, 0xfbcd14, 25);
    };

    // Pre-populate items
    spawnItemsInitial();

    // Set initial stats
    onStatsUpdate({ ...stateRef.current.stats });

    // --- 10. REAL-TIME TICK LOOP ---
    let lastTime = performance.now();
    let animationFrameId = 0;

    const tick = () => {
      if (stateRef.current.gameState === GameState.MENU || stateRef.current.gameState === GameState.OPTIONS) {
        // Just run simple frame render, no movement
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // cap dt at 0.1s to prevent huge jumps
      lastTime = now;

      const pRef = stateRef.current.player;
      const sRef = stateRef.current.stats;
      const keys = stateRef.current.keysPressed;
      const bindings = stateRef.current.keyBindings;

      // Ensure sprites face camera
      if (playerGroup) {
        playerGroup.quaternion.copy(camera.quaternion);
      }
      stateRef.current.enemies.forEach(e => {
        if (e.mesh) e.mesh.quaternion.copy(camera.quaternion);
      });
      stateRef.current.items.forEach(it => {
        if (it.mesh) it.mesh.quaternion.copy(camera.quaternion);
      });
      if (stateRef.current.boss && stateRef.current.boss.mesh) {
        stateRef.current.boss.mesh.quaternion.copy(camera.quaternion);
      }

      // If playing:
      if (stateRef.current.gameState === GameState.PLAYING) {
        
        // --- A. TIMERS & COOLDOWNS ---
        if (pRef.invincibilityTimer > 0) pRef.invincibilityTimer -= dt;
        if (pRef.attackTimer > 0) pRef.attackTimer -= dt;
        if (pRef.skillTimer > 0) pRef.skillTimer -= dt;

        // Visual flash for player if invincible/hit
        if (pRef.invincibilityTimer > 0) {
          // rapidly toggle player sprite opacity to flash
          if (stateRef.current.playerMaterial) {
            stateRef.current.playerMaterial.opacity = Math.floor(now / 50) % 2 === 0 ? 0.3 : 0.9;
          }
        } else {
          if (stateRef.current.playerMaterial) {
            stateRef.current.playerMaterial.opacity = 1.0;
          }
        }

        // Skill cooldown calculation
        if (sRef.skillCooldown > 0) {
          sRef.skillCooldown = Math.max(0, sRef.skillCooldown - dt);
          if (sRef.skillCooldown === 0) {
            sRef.skillReady = true;
          }
          onStatsUpdate({ ...sRef });
        }

        // --- B. ATTACK & SKILL INPUTS ---
        
        // Match custom controls
        const isPressUp = keys[bindings.moveUp] || keys['KeyW'] || keys['ArrowUp'];
        const isPressDown = keys[bindings.moveDown] || keys['KeyS'] || keys['ArrowDown'];
        const isPressLeft = keys[bindings.moveLeft] || keys['KeyA'] || keys['ArrowLeft'];
        const isPressRight = keys[bindings.moveRight] || keys['KeyD'] || keys['ArrowRight'];
        const isPressAttack = keys[bindings.attack] || keys['KeyP'];
        const isPressSkill = keys[bindings.skill] || keys['KeyO'];

        // Trigger Punch (Attack)
        if (isPressAttack && pRef.attackTimer <= 0 && pRef.state !== 'ATTACKING') {
          pRef.state = 'ATTACKING';
          pRef.attackTimer = 0.4; // 0.4s animation attack window
          pRef.animFrame = 0;
          pRef.animTimer = 0;
          pRef.animRow = 2; // Row 3 (index 2) = Attack

          // Melee Hitbox!
          // Hit offset matches the facing direction on X axis
          const hX = pRef.x + pRef.facingDir * 1.6;
          const hZ = pRef.z;
          const hitRadius = 2.0;

          // Melee sweep particles
          createParticleExplosion(hX, 0.5, hZ, 0xe0e7ff, 6);

          // Attack enemies in range
          stateRef.current.enemies.forEach(e => {
            if (e.state === 'HIT_DEATH') return;
            const dist = Math.sqrt((e.x - hX) ** 2 + (e.z - hZ) ** 2);
            if (dist <= hitRadius) {
              damageEnemy(e, pRef.facingDir, 0); // direction X is facing direction
            }
          });

          // Attack Boss if in range
          if (stateRef.current.boss) {
            const b = stateRef.current.boss;
            const dist = Math.sqrt((b.x - hX) ** 2 + (b.z - hZ) ** 2);
            if (dist <= 3.0) { // Larger hitbox for big boss
              damageBoss(1);
            }
          }
        }

        // Trigger Burst Skill
        if (isPressSkill && sRef.skillReady && pRef.state !== 'ATTACKING') {
          sRef.skillReady = false;
          sRef.skillCooldown = 5.0; // 5 seconds cd
          onStatsUpdate({ ...sRef });

          pRef.state = 'DANCE';
          pRef.skillTimer = 0.8; // lock in skill dance
          pRef.animFrame = 0;
          pRef.animTimer = 0;
          pRef.animRow = 3; // Row 4 (index 3) = Dance/Skill

          // Expand energy ring
          triggerSkillRingAnimation(pRef.x, pRef.z);
          
          // Emit huge explosion of magical particles
          createParticleExplosion(pRef.x, 0.5, pRef.z, 0x818cf8, 25);
          spawnFloatingText('BURST EXPLOSION!', pRef.x, pRef.y + 1, pRef.z, '#818cf8');

          // Damage all enemies inside radius of 6
          stateRef.current.enemies.forEach(e => {
            if (e.state === 'HIT_DEATH') return;
            const dx = e.x - pRef.x;
            const dz = e.z - pRef.z;
            const dist = Math.sqrt(dx ** 2 + dz ** 2);
            if (dist <= 6.0) {
              const knockDirX = dx === 0 ? 0 : dx / dist;
              const knockDirZ = dz === 0 ? 0 : dz / dist;
              damageEnemy(e, knockDirX, knockDirZ);
            }
          });

          // Damage Boss if in radius
          if (stateRef.current.boss) {
            const b = stateRef.current.boss;
            const dist = Math.sqrt((b.x - pRef.x) ** 2 + (b.z - pRef.z) ** 2);
            if (dist <= 6.0) {
              damageBoss(2); // deals 2 damage!
            }
          }
        }

        // --- C. 8-WAY MOVEMENT ---
        let dx = 0;
        let dz = 0;

        if (isPressUp) dz -= 1;
        if (isPressDown) dz += 1;
        if (isPressLeft) dx -= 1;
        if (isPressRight) dx += 1;

        const isMovingInput = dx !== 0 || dz !== 0;

        // Reset player state to IDLE or WALKING if not locked in an action
        if (pRef.state !== 'ATTACKING' && pRef.state !== 'DANCE') {
          if (isMovingInput) {
            pRef.state = 'WALKING';
            pRef.animRow = 1; // Row 2 = Walk
          } else {
            pRef.state = 'IDLE';
            pRef.animRow = 0; // Row 1 = Idle
          }
        }

        // Apply movement if moving and not locked
        if (isMovingInput && pRef.state !== 'ATTACKING' && pRef.state !== 'DANCE') {
          // Normalize vector for constant diagonal speed
          const length = Math.sqrt(dx * dx + dz * dz);
          const ndx = dx / length;
          const ndz = dz / length;

          pRef.x += ndx * pRef.speed * dt;
          pRef.z += ndz * pRef.speed * dt;

          // Face left/right
          if (dx > 0) pRef.facingDir = 1;
          if (dx < 0) pRef.facingDir = -1;
        }

        // Enforce Ground Boundary constraints
        const border = 24.0;
        pRef.x = Math.max(-border, Math.min(border, pRef.x));
        pRef.z = Math.max(-border, Math.min(border, pRef.z));

        // Sync player position to group
        if (playerGroup) {
          playerGroup.position.set(pRef.x, pRef.y, pRef.z);
        }

        // --- D. PLAYER ANIMATION CYCLE ---
        pRef.animTimer += dt;
        
        // Attack plays 2.5x faster, skill dance plays 1.5x faster
        const animSpeed = pRef.state === 'ATTACKING' ? 0.06 : pRef.state === 'DANCE' ? 0.12 : 0.18;
        
        if (pRef.animTimer >= animSpeed) {
          pRef.animTimer = 0;
          pRef.animFrame = (pRef.animFrame + 1) % 4;
          
          if (pRef.state === 'ATTACKING' && pRef.animFrame === 3) {
            // attack animation ended
            pRef.state = 'IDLE';
            pRef.animRow = 0;
            pRef.animFrame = 0;
          }
          if (pRef.state === 'DANCE' && pRef.skillTimer <= 0) {
            pRef.state = 'IDLE';
            pRef.animRow = 0;
            pRef.animFrame = 0;
          }
        }

        // Apply current sprite sheet mapping frame
        if (stateRef.current.playerTexture) {
          const col = pRef.animFrame;
          const row = pRef.animRow;
          
          // Flip offset X dynamically
          if (pRef.facingDir === 1) {
            stateRef.current.playerTexture.repeat.set(1 / 4, 1 / 4);
            stateRef.current.playerTexture.offset.set(col / 4, (3 - row) / 4);
          } else {
            stateRef.current.playerTexture.repeat.set(-1 / 4, 1 / 4);
            stateRef.current.playerTexture.offset.set((col + 1) / 4, (3 - row) / 4);
          }
        }

        // --- E. CAMERA FOLLOW ---
        if (camera) {
          // Smooth Lerp tracking
          const targetCamX = pRef.x;
          const targetCamY = pRef.y + 11.0;
          const targetCamZ = pRef.z + 13.0;
          
          camera.position.x += (targetCamX - camera.position.x) * 4.0 * dt;
          camera.position.y += (targetCamY - camera.position.y) * 4.0 * dt;
          camera.position.z += (targetCamZ - camera.position.z) * 4.0 * dt;
          
          camera.lookAt(pRef.x, pRef.y + 0.5, pRef.z);
        }

        // --- F. ENEMY SPAWNING AGENT ---
        stateRef.current.spawnTimer += dt;
        if (stateRef.current.spawnTimer >= stateRef.current.spawnInterval) {
          stateRef.current.spawnTimer = 0;
          // Scale interval down slowly to increase difficulty
          stateRef.current.spawnInterval = Math.max(0.8, 2.0 - (sRef.score * 0.05));
          
          // Only spawn normal enemies if boss is not active or spawn less
          if (!stateRef.current.bossSpawned) {
            spawnEnemy();
          } else if (stateRef.current.boss && stateRef.current.enemies.length < 3) {
            // spawn occasional support enemies during boss fight
            if (Math.random() < 0.6) spawnEnemy();
          }
        }

        // --- G. ENEMY STATE UPDATES & INTERACTIONS ---
        for (let i = stateRef.current.enemies.length - 1; i >= 0; i--) {
          const e = stateRef.current.enemies[i];

          // 1. Flash timer decay
          if (e.flashTimer > 0) {
            e.flashTimer -= dt;
            if (e.flashTimer <= 0) {
              e.flashColor = null;
              // reset sprite material tint
              const spriteMat = (e.sprite as THREE.Mesh).material as THREE.MeshBasicMaterial;
              spriteMat.color.setHex(0xffffff);
            }
          }

          // 2. Knockback movement
          if (e.state === 'HIT_KNOCKBACK') {
            e.x += e.knockbackDirX * 16.0 * dt;
            e.z += e.knockbackDirZ * 16.0 * dt;
            e.knockbackTimer -= dt;
            if (e.knockbackTimer <= 0) {
              e.state = 'WALKING';
              e.animRow = 1;
            }
          } else if (e.state === 'HIT_DEATH') {
            // Fly up/back and spin out of screen
            e.x += e.knockbackDirX * 22.0 * dt;
            e.z += e.knockbackDirZ * 22.0 * dt;
            e.mesh.position.y += 15.0 * dt; // fly upwards!
            e.mesh.rotation.z += 8.0 * dt;  // spin!
            e.mesh.scale.multiplyScalar(0.93); // shrink!
            
            e.knockbackTimer -= dt;
            if (e.knockbackTimer <= 0) {
              // Delete Enemy
              scene.remove(e.mesh);
              // Dispose materials/geometry to avoid memory leaks
              const spriteMesh = e.sprite as THREE.Mesh;
              spriteMesh.geometry.dispose();
              (spriteMesh.material as THREE.Material).dispose();
              
              stateRef.current.enemies.splice(i, 1);
              
              // Increment score
              sRef.score += 10;
              sRef.kills += 1;
              onStatsUpdate({ ...sRef });
              
              // Drop potion item randomly (25% chance)
              if (Math.random() < 0.25) {
                spawnPotionItem(e.x, e.z);
              }

              // Check Boss trigger
              if (sRef.kills >= 10 && !stateRef.current.bossSpawned) {
                spawnBoss();
              }
              continue;
            }
          } else if (e.state === 'WALKING') {
            // Walk towards Player
            const dx = pRef.x - e.x;
            const dz = pRef.z - e.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist > 0.8) {
              const nx = dx / dist;
              const nz = dz / dist;
              e.x += nx * e.speed * dt;
              e.z += nz * e.speed * dt;
              
              // Flip enemy texture based on player relative side
              e.direction = dx >= 0 ? 1 : -1;
            }

            // Player contact damage check
            if (dist < 1.1 && pRef.invincibilityTimer <= 0) {
              damagePlayer();
            }
          }

          // Bound within Arena
          e.x = Math.max(-24.5, Math.min(24.5, e.x));
          e.z = Math.max(-24.5, Math.min(24.5, e.z));

          // Sync position to Three Group
          if (e.mesh && e.state !== 'HIT_DEATH') {
            e.mesh.position.set(e.x, 0.9, e.z);
          }

          // Enemy sprite animation frame
          e.animTimer += dt;
          if (e.animTimer >= 0.16) {
            e.animTimer = 0;
            e.animFrame = (e.animFrame + 1) % 4;
          }

          // Apply sprite offsets (Row 1 Idle = index 0, Row 2 Walk = index 1)
          const tex = ((e.sprite as THREE.Mesh).material as THREE.MeshBasicMaterial).map;
          if (tex) {
            const col = e.animFrame;
            const row = e.animRow;
            
            if (e.direction === 1) {
              tex.repeat.set(1 / 4, 1 / 2);
              tex.offset.set(col / 4, (1 - row) / 2);
            } else {
              tex.repeat.set(-1 / 4, 1 / 2);
              tex.offset.set((col + 1) / 4, (1 - row) / 2);
            }
          }
        }

        // --- H. COLLECTIBLE POTION PICKUP LOOP ---
        for (let i = stateRef.current.items.length - 1; i >= 0; i--) {
          const item = stateRef.current.items[i];
          
          // Gentle rotation + hover
          if (item.mesh) {
            item.mesh.position.y = 0.8 + Math.sin(now * 0.004) * 0.15;
            item.mesh.rotation.y += 1.5 * dt;
          }

          const dist = Math.sqrt((item.x - pRef.x) ** 2 + (item.z - pRef.z) ** 2);
          if (dist < 1.3) {
            // Collect!
            item.collected = true;
            scene.remove(item.mesh);
            
            // Restore health
            if (sRef.health < sRef.maxHealth) {
              sRef.health = Math.min(sRef.maxHealth, sRef.health + 1);
              onStatsUpdate({ ...sRef });
              spawnFloatingText('+1 HP', item.x, 1, item.z, '#10b981');
              createParticleExplosion(item.x, 0.8, item.z, 0x10b981, 15);
            } else {
              // already full hp, add score bonus instead!
              sRef.score += 50;
              onStatsUpdate({ ...sRef });
              spawnFloatingText('+50 PTS', item.x, 1, item.z, '#fbbf24');
              createParticleExplosion(item.x, 0.8, item.z, 0xfbbbf24, 15);
            }

            stateRef.current.items.splice(i, 1);
          }
        }

        // --- I. BOSS STATE MANAGER ---
        if (stateRef.current.boss) {
          const b = stateRef.current.boss;

          // 1. Idle hover bounce
          b.mesh.position.y = 3.5 + Math.sin(now * 0.0035) * 0.35;

          b.patternTimer -= dt;

          // Boss Animation step
          b.animTimer += dt;
          if (b.animTimer >= 0.15) {
            b.animTimer = 0;
            b.animFrame = (b.animFrame + 1) % 4;
          }

          // Map texture offset (4 cols, 2 rows)
          const bSprite = b.mesh.children[0] as THREE.Mesh;
          const bTex = (bSprite.material as THREE.MeshBasicMaterial).map;
          if (bTex) {
            const col = b.animFrame;
            const row = b.animRow;
            // Face the player
            const faceDir = pRef.x >= b.x ? 1 : -1;
            if (faceDir === 1) {
              bTex.repeat.set(1 / 4, 1 / 2);
              bTex.offset.set(col / 4, (1 - row) / 2);
            } else {
              bTex.repeat.set(-1 / 4, 1 / 2);
              bTex.offset.set((col + 1) / 4, (1 - row) / 2);
            }
          }

          // 2. State Machine behavior
          if (b.pattern === 'IDLE') {
            b.mesh.scale.set(1, 1, 1);
            if (b.patternTimer <= 0) {
              // Choose next dash
              const roll = Math.random();
              if (roll < 0.4) {
                // Dash Close to player
                b.pattern = 'DASH_NEAR';
                b.patternTimer = 0.9;
                const angle = Math.random() * Math.PI * 2;
                b.targetX = pRef.x + Math.cos(angle) * 5.0;
                b.targetZ = pRef.z + Math.sin(angle) * 5.0;
                b.animRow = 1; // Walk row
              } else if (roll < 0.7) {
                // Dash Far
                b.pattern = 'DASH_FAR';
                b.patternTimer = 0.9;
                const angle = Math.random() * Math.PI * 2;
                b.targetX = pRef.x + Math.cos(angle) * 14.0;
                b.targetZ = pRef.z + Math.sin(angle) * 14.0;
                b.animRow = 1; // Walk row
              } else {
                // Prepare Fireball attack
                b.pattern = 'PRE_ATTACK';
                b.patternTimer = 1.4;
                b.animScale = 1.0;
                b.animScaleDir = 1;
                b.animRow = 0; // Standing/Pre-attack
              }
            }
          } else if (b.pattern === 'DASH_NEAR' || b.pattern === 'DASH_FAR') {
            // Lerp position to target
            b.x += (b.targetX - b.x) * 4.5 * dt;
            b.z += (b.targetZ - b.z) * 4.5 * dt;
            b.mesh.position.x = b.x;
            b.mesh.position.z = b.z;

            if (b.patternTimer <= 0) {
              b.pattern = 'IDLE';
              b.patternTimer = 1.5;
              b.animRow = 0;
            }
          } else if (b.pattern === 'PRE_ATTACK') {
            // Pulse size up and down dramatically as warning steps
            b.animScale += b.animScaleDir * 3.5 * dt;
            if (b.animScale >= 1.35) {
              b.animScale = 1.35;
              b.animScaleDir = -1;
            } else if (b.animScale <= 0.85) {
              b.animScale = 0.85;
              b.animScaleDir = 1;
            }
            b.mesh.scale.set(b.animScale, b.animScale, b.animScale);

            if (b.patternTimer <= 0) {
              // Release fireballs!
              b.pattern = 'ATTACKING';
              b.patternTimer = 1.8; // Duration of fireball launching
              b.mesh.scale.set(1, 1, 1);
              launchFireballs(b.x, b.z);
            }
          } else if (b.pattern === 'ATTACKING') {
            if (b.patternTimer <= 0) {
              b.pattern = 'IDLE';
              b.patternTimer = 2.0;
              b.animRow = 0;
            }
          }

          // Keep Boss inside bounds
          b.x = Math.max(-22.0, Math.min(22.0, b.x));
          b.z = Math.max(-22.0, Math.min(22.0, b.z));
          b.mesh.position.x = b.x;
          b.mesh.position.z = b.z;
        }

        // --- J. FIREBALL BALLISTICS ENGINE ---
        for (let i = stateRef.current.fireballs.length - 1; i >= 0; i--) {
          const f = stateRef.current.fireballs[i];

          if (!f.hasLanded) {
            // Track lerped progression along parabolic arc
            f.explosionTimer += dt; // use explosionTimer as elapsed time
            const duration = 1.5; // flight duration
            const progress = f.explosionTimer / duration;

            if (progress >= 1.0) {
              // Fireball hits ground!
              f.hasLanded = true;
              f.currentX = f.targetX;
              f.currentZ = f.targetZ;
              f.currentY = 0.1;
              f.explosionTimer = 0.4; // 0.4s explosion visual timer

              // Remove indicator ring
              scene.remove(f.indicatorMesh);
              f.indicatorMesh.geometry.dispose();
              (f.indicatorMesh.material as THREE.Material).dispose();

              // Create gorgeous red/orange explosion particles
              createParticleExplosion(f.targetX, 0.25, f.targetZ, 0xef4444, 18);
              createParticleExplosion(f.targetX, 0.25, f.targetZ, 0xf97316, 12);

              // Damage player if inside radius
              const playerDist = Math.sqrt((pRef.x - f.targetX) ** 2 + (pRef.z - f.targetZ) ** 2);
              if (playerDist < 1.8 && pRef.invincibilityTimer <= 0) {
                damagePlayer();
              }
            } else {
              // Mid-air coordinates
              const bossPos = stateRef.current.boss ? stateRef.current.boss.mesh.position : new THREE.Vector3(0, 4, 0);
              f.currentX = THREE.MathUtils.lerp(bossPos.x, f.targetX, progress);
              f.currentZ = THREE.MathUtils.lerp(bossPos.z, f.targetZ, progress);
              
              // Parabola height arc
              const heightArc = Math.sin(progress * Math.PI) * 9.0;
              f.currentY = THREE.MathUtils.lerp(3.5, 0.1, progress) + heightArc;

              f.mesh.position.set(f.currentX, f.currentY, f.currentZ);
              f.mesh.rotation.z += 6.0 * dt; // spin fireball mesh

              // Pulse the ground warning indicator opacity/scale
              const mat = f.indicatorMesh.material as THREE.MeshBasicMaterial;
              mat.opacity = 0.25 + Math.sin(now * 0.015) * 0.25;
            }
          } else {
            // Exploding state visual fade
            f.explosionTimer -= dt;
            f.mesh.scale.multiplyScalar(1.2); // grow flame ball slightly
            const mat = (f.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
            mat.opacity = f.explosionTimer / 0.4;

            if (f.explosionTimer <= 0) {
              scene.remove(f.mesh);
              // Clean up materials
              const child = f.mesh.children[0] as THREE.Mesh;
              child.geometry.dispose();
              (child.material as THREE.Material).dispose();
              
              stateRef.current.fireballs.splice(i, 1);
            }
          }
        }

        // --- K. WARP PORTAL TELEPORTATION CHECK ---
        if (stateRef.current.portal) {
          const port = stateRef.current.portal;
          // Rotate warp disks
          port.mesh.children[0].rotation.z += 1.5 * dt;
          port.mesh.children[1].rotation.z -= 1.0 * dt;

          const pDist = Math.sqrt((pRef.x - port.x) ** 2 + (pRef.z - port.z) ** 2);
          if (pDist < 1.8) {
            // Trigger clear state!
            onGameClear();
          }
        }

        // --- L. PARTICLE PHYSICAL SIMULATION ---
        for (let i = stateRef.current.particles.length - 1; i >= 0; i--) {
          const p = stateRef.current.particles[i];
          
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          
          // Apply light gravity
          p.vy -= 9.8 * dt;

          p.life -= p.decay * dt;

          if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            (p.mesh.material as THREE.Material).dispose();
            stateRef.current.particles.splice(i, 1);
          } else {
            p.mesh.position.set(p.x, Math.max(0.05, p.y), p.z);
            (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life;
          }
        }

        // --- M. ANIMATED GROUND SKILL RINGS ---
        for (let i = activeSkillRings.length - 1; i >= 0; i--) {
          const done = activeSkillRings[i](dt);
          if (done) activeSkillRings.splice(i, 1);
        }

        // Floating texts tick
        for (let i = activeFloatingTexts.length - 1; i >= 0; i--) {
          const done = activeFloatingTexts[i](dt);
          if (done) activeFloatingTexts.splice(i, 1);
        }
      }

      // Final frame render
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    // --- 11. GAMEPLAY EVENT METHODS ---

    const spawnEnemy = () => {
      const eGroup = new THREE.Group();
      
      // Spawn at a random position outside the camera view
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 18.0 + Math.random() * 6.0;
      const ex = stateRef.current.player.x + Math.cos(angle) * spawnDist;
      const ez = stateRef.current.player.z + Math.sin(angle) * spawnDist;
      
      eGroup.position.set(ex, 0.9, ez);
      scene.add(eGroup);

      const enemyTex = textureLoader.load('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png');
      enemyTex.colorSpace = THREE.SRGBColorSpace;
      enemyTex.magFilter = THREE.NearestFilter;
      enemyTex.minFilter = THREE.NearestFilter;
      enemyTex.repeat.set(1 / 4, 1 / 2); // 4 frames horizontal, 2 rows vertical (standing, walking)

      const eGeo = new THREE.PlaneGeometry(1.8, 1.8);
      const eMat = new THREE.MeshBasicMaterial({
        map: enemyTex,
        transparent: true,
        alphaTest: 0.15,
        side: THREE.DoubleSide,
      });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.castShadow = true;
      eGroup.add(eMesh);

      // Enemy base shadow plate
      const eShadowGeo = new THREE.RingGeometry(0.01, 0.45, 12);
      const eShadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const eShadow = new THREE.Mesh(eShadowGeo, eShadowMat);
      eShadow.rotation.x = -Math.PI / 2;
      eShadow.position.y = -0.85;
      eGroup.add(eShadow);

      stateRef.current.enemies.push({
        id: Math.random().toString(),
        x: ex,
        z: ez,
        speed: 2.2 + Math.random() * 1.3, // slightly randomized speeds
        health: 2,
        maxHealth: 2,
        mesh: eGroup,
        sprite: eMesh,
        direction: 1,
        state: 'WALKING',
        knockbackTimer: 0,
        knockbackDirX: 0,
        knockbackDirZ: 0,
        flashTimer: 0,
        flashColor: null,
        animFrame: 0,
        animTimer: 0,
        animRow: 1, // Row 2 = Walk
      });
    };

    const damageEnemy = (e: Enemy, knockX: number, knockZ: number) => {
      e.health -= 1;
      createParticleExplosion(e.x, 1.0, e.z, 0xef4444, 8);

      if (e.health === 1) {
        // --- HIT 1: Knockback + Flash red ---
        e.state = 'HIT_KNOCKBACK';
        e.knockbackTimer = 0.35; // knockback duration
        e.knockbackDirX = knockX;
        e.knockbackDirZ = knockZ;
        e.flashTimer = 0.35;
        e.flashColor = 'red';
        e.animRow = 0; // idle frame

        // Tint sprite red
        const mat = (e.sprite as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.color.setHex(0xff3333);

        spawnFloatingText('HIT!', e.x, 1, e.z, '#ef4444');
      } else if (e.health <= 0) {
        // --- HIT 2: Fly back/up, flash white rapidly, disappear ---
        e.state = 'HIT_DEATH';
        e.knockbackTimer = 0.75; // death flight duration
        e.knockbackDirX = knockX;
        e.knockbackDirZ = knockZ;
        e.flashTimer = 0.75;
        e.flashColor = 'white';

        // Tint sprite bright white
        const mat = (e.sprite as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.color.setHex(0xffffff); // can be simulated as flashing later

        spawnFloatingText('K.O.!', e.x, 1, e.z, '#fbcd14');
        createParticleExplosion(e.x, 1.0, e.z, 0xfbcd14, 15);
      }
    };

    const spawnBoss = () => {
      stateRef.current.bossSpawned = true;
      onBossSpawned(true);

      const bGroup = new THREE.Group();
      bGroup.position.set(0, 3.5, -12); // Fly at Elevated Y position
      scene.add(bGroup);

      const bossTex = textureLoader.load('https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png');
      bossTex.colorSpace = THREE.SRGBColorSpace;
      bossTex.magFilter = THREE.NearestFilter;
      bossTex.minFilter = THREE.NearestFilter;
      bossTex.repeat.set(1 / 4, 1 / 2); // 4 cols, 2 rows

      const bGeo = new THREE.PlaneGeometry(4.5, 4.5);
      const bMat = new THREE.MeshBasicMaterial({
        map: bossTex,
        transparent: true,
        alphaTest: 0.15,
        side: THREE.DoubleSide,
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.castShadow = true;
      bGroup.add(bMesh);

      // Huge boss base shadow disk on ground
      const bShadowGeo = new THREE.RingGeometry(0.01, 1.2, 16);
      const bShadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      });
      const bShadow = new THREE.Mesh(bShadowGeo, bShadowMat);
      bShadow.rotation.x = -Math.PI / 2;
      // Fixed Y on ground
      bShadow.position.y = -3.4;
      bGroup.add(bShadow);

      stateRef.current.boss = {
        health: 12,
        maxHealth: 12,
        x: 0,
        z: -12,
        mesh: bGroup,
        pattern: 'IDLE',
        patternTimer: 2.0,
        targetX: 0,
        targetZ: -12,
        animScale: 1.0,
        animScaleDir: 1,
        animFrame: 0,
        animTimer: 0,
        animRow: 0,
      };

      // Trigger UI warning sound (visual)
      spawnFloatingText('BOSS SPAWNED!', 0, 4, -12, '#ef4444');
      createParticleExplosion(0, 3.5, -12, 0xef4444, 40);
      onBossHealthUpdate(12, 12);
    };

    const damageBoss = (dmg: number) => {
      const b = stateRef.current.boss;
      if (!b) return;

      b.health = Math.max(0, b.health - dmg);
      onBossHealthUpdate(b.health, b.maxHealth);

      // Flashing flash indicator
      spawnFloatingText(`-${dmg} HP`, b.x, 3.0, b.z, '#fb7185');
      createParticleExplosion(b.x, 3.5, b.z, 0xfecdd3, 12);

      // Flash Boss Sprite red briefly
      const bSprite = b.mesh.children[0] as THREE.Mesh;
      const bMat = bSprite.material as THREE.MeshBasicMaterial;
      bMat.color.setHex(0xff3344);
      setTimeout(() => {
        bMat.color.setHex(0xffffff);
      }, 200);

      if (b.health <= 0) {
        // BOSS DEFEATED!
        createParticleExplosion(b.x, 3.5, b.z, 0xfbcd14, 60);
        createParticleExplosion(b.x, 3.5, b.z, 0xef4444, 40);
        spawnFloatingText('BOSS DEFEATED!', b.x, 3.5, b.z, '#fbcd14');
        
        // Remove Boss
        scene.remove(b.mesh);
        stateRef.current.boss = null;
        onBossHealthUpdate(0, 12);

        // Spawn warp portal at center of arena
        spawnWarpPortal(0, 0);
      }
    };

    const launchFireballs = (bx: number, bz: number) => {
      const fireCount = 4;
      const delay = 350; // ms between each fireball lob

      for (let i = 0; i < fireCount; i++) {
        setTimeout(() => {
          if (stateRef.current.gameState !== GameState.PLAYING || !stateRef.current.boss) return;

          // Target is centered on player position plus slight random scatter
          const pRef = stateRef.current.player;
          const targetX = pRef.x + (Math.random() - 0.5) * 6.0;
          const targetZ = pRef.z + (Math.random() - 0.5) * 6.0;

          // 1. Create Warning Circle on ground
          const indicatorGeo = new THREE.RingGeometry(1.5, 1.8, 16);
          const indicatorMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
          });
          const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
          indicator.rotation.x = -Math.PI / 2;
          indicator.position.set(targetX, 0.05, targetZ);
          scene.add(indicator);

          // 2. Create Fireball mesh lob
          const fireballGroup = new THREE.Group();
          fireballGroup.position.set(bx, 3.5, bz);
          scene.add(fireballGroup);

          // Fireball core sphere
          const fbSphereGeo = new THREE.SphereGeometry(0.6, 8, 8);
          const fbSphereMat = new THREE.MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 1.0,
          });
          const fbSphere = new THREE.Mesh(fbSphereGeo, fbSphereMat);
          fireballGroup.add(fbSphere);

          // Outer plasma particles
          const fbRingGeo = new THREE.RingGeometry(0.6, 0.85, 8);
          const fbRingMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
          });
          const fbRing = new THREE.Mesh(fbRingGeo, fbRingMat);
          fireballGroup.add(fbRing);

          stateRef.current.fireballs.push({
            id: Math.random().toString(),
            targetX,
            targetZ,
            currentX: bx,
            currentY: 3.5,
            currentZ: bz,
            speedY: 0,
            startY: 3.5,
            mesh: fireballGroup,
            indicatorMesh: indicator,
            hasLanded: false,
            explosionTimer: 0,
            damageDealt: false,
          });

        }, i * delay);
      }
    };

    const damagePlayer = () => {
      const pRef = stateRef.current.player;
      const sRef = stateRef.current.stats;

      sRef.health = Math.max(0, sRef.health - 1);
      pRef.invincibilityTimer = 1.2; // 1.2 seconds of invulnerability
      onStatsUpdate({ ...sRef });

      // Spawn damage particles
      createParticleExplosion(pRef.x, 1.0, pRef.z, 0xef4444, 15);
      spawnFloatingText('-1 HP', pRef.x, 1.5, pRef.z, '#ef4444');

      // Knock player back slightly away from center or enemies
      const angle = Math.random() * Math.PI * 2;
      pRef.x += Math.cos(angle) * 1.5;
      pRef.z += Math.sin(angle) * 1.5;

      if (sRef.health <= 0) {
        onGameOver();
      }
    };

    // Begin looping
    animationFrameId = requestAnimationFrame(tick);

    // Resize Handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // CLEANUP ON UNMOUNT
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      
      // Clear materials, geometry, and textures
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      
      for (const key in stateRef.current.textures) {
        if (stateRef.current.textures[key]) {
          stateRef.current.textures[key].dispose();
        }
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden select-none">
      <canvas ref={canvasRef} className="block w-full h-full" id="game-canvas-3d" />
    </div>
  );
};
