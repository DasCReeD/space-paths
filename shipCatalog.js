import fighterObjUrl from './fighter1.obj?url';
import fighterClassUrl from './assets/custom/fighter.glb?url';
import haulerClassUrl from './assets/custom/hauler.glb?url';
import scoutClassUrl from './assets/custom/scout.glb?url';
import dreadnoughtClassUrl from './assets/custom/dreadnought.glb?url';
import cruiserClassUrl from './assets/custom/cruiser.glb?url';
import racerClassUrl from './assets/custom/racer.glb?url';
import hovdiClassUrl from './assets/custom/hovdi.glb?url';
import uvMapUrl from './uvmap.jpg';
import freelancerSkinUrl from './freelancer.jpg';
import lordshadowSkinUrl from './lordshadow.jpg';
import psionicSkinUrl from './psionic.jpg';
import shadeeSkinUrl from './shadee.jpg';
import thorSkinUrl from './thor.jpg';
import spaceshipHullPlatingUrl from './spaceship_hull_plating.png';
import roadMetallicUrl from './road_metallic_plate.png';

// Pack A: Battle Corvette & Frigate FBX models
import corvette1Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_01.fbx?url';
import corvette2Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_02.fbx?url';
import corvette3Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_03.fbx?url';
import corvette4Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_04.fbx?url';
import corvette5Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_05.fbx?url';
import frigate1Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_01.fbx?url';
import frigate2Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_02.fbx?url';
import frigate3Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_03.fbx?url';
import frigate4Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_04.fbx?url';
import frigate5Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_05.fbx?url';
import freeBattleTexUrl from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Texture/T_Spase_64.png';

const MAJADROID_BASE = './SBS - Seamless Abstract Pack - 512x512/LowPoly-Spaceships-By-Majadroid';

export const SHIP_MODELS = {
  original: fighterObjUrl,
  // Custom Hovercraft Classes
  fighter: fighterClassUrl,
  hauler: haulerClassUrl,
  scout: scoutClassUrl,
  dreadnought: dreadnoughtClassUrl,
  cruiser: cruiserClassUrl,
  racer: racerClassUrl,
  hovdi: hovdiClassUrl
};

export const SHIP_SKINS = {
  // Classic skins kept for test compliance
  default: uvMapUrl,
  freelancer: freelancerSkinUrl,
  lordshadow: lordshadowSkinUrl,
  psionic: psionicSkinUrl,
  shadee: shadeeSkinUrl,
  thor: thorSkinUrl,
  
  // Premium skins
  spaceship_hull: spaceshipHullPlatingUrl,
  road_metallic: roadMetallicUrl,
  
  // Majadroid skins
  skin1: `${MAJADROID_BASE}/tex01-512.png`,
  skin2: `${MAJADROID_BASE}/tex02-512.png`,
  skin3: `${MAJADROID_BASE}/tex03-512.png`,
  skin4: `${MAJADROID_BASE}/tex04-512.png`
};

export const SHIP_METRICS = {
  original: { offset: 0.25, height: 0.20, rotationY: -Math.PI / 2 },
  fighter: { offset: 0.25, height: 0.20, rotationY: -Math.PI / 2 },
  hauler: { offset: 0.38, height: 0.22, rotationY: -Math.PI / 2 },
  scout: { offset: 0.30, height: 0.16, rotationY: -Math.PI / 2 },
  dreadnought: { offset: 0.42, height: 0.21, rotationY: -Math.PI / 2 },
  cruiser: { offset: 0.26, height: 0.18, rotationY: -Math.PI / 2 },
  racer: { offset: 0.30, height: 0.18, rotationY: 0 },
  hovdi: { offset: 0.30, height: 0.20, rotationY: -Math.PI / 2 }
};

export const BASE_TEXTURES = {
  corvette1: freeBattleTexUrl,
  corvette2: freeBattleTexUrl,
  corvette3: freeBattleTexUrl,
  corvette4: freeBattleTexUrl,
  corvette5: freeBattleTexUrl,
  frigate1: freeBattleTexUrl,
  frigate2: freeBattleTexUrl,
  frigate3: freeBattleTexUrl,
  frigate4: freeBattleTexUrl,
  frigate5: freeBattleTexUrl,
  
  ship1: `${MAJADROID_BASE}/tex01-512.png`,
  ship2: `${MAJADROID_BASE}/tex01-512.png`,
  ship3: `${MAJADROID_BASE}/tex01-512.png`,
  ship4: `${MAJADROID_BASE}/tex01-512.png`,
  ship5: `${MAJADROID_BASE}/tex01-512.png`
};

export { uvMapUrl };
