/* Choix de la posture d'un combattant à chaque frame, et transition en douceur vers elle. */
import { POSES, approachPose, clonePose, mixPose } from '../data/poses';
import type { Fighter } from './fighter';

/** Posture de travail, réutilisée à chaque appel pour ne rien allouer pendant le combat. */
const scratch = clonePose('idle');

export function updateFighterPose(f: Fighter): void {
  let target = f.poseTarget;
  let rate = f.poseRate;
  if (f.state === 'neutral') {
    // libre de ses mouvements : la posture découle directement de ce que fait le joueur
    if (f.crouching) {
      target = f.guard ? POSES.crouchBlock : POSES.crouch;
      f.spriteKey = f.guard ? 'crouch_block' : 'crouch';
      rate = 0.4;
    } else if (f.guard) {
      target = POSES.block;
      f.spriteKey = 'block';
      rate = 0.4;
    } else if (f.vx) {
      // marche : les jambes alternent, les bras restent en garde
      const k = (Math.sin(f.walkPhase) + 1) / 2;
      target = mixPose(POSES.walkA, POSES.walkB, k, scratch);
      target.aF0 = POSES.idle.aF0;
      target.aF1 = POSES.idle.aF1;
      target.aB0 = POSES.idle.aB0;
      target.aB1 = POSES.idle.aB1;
      f.spriteKey = k > 0.5 ? 'walk2' : 'walk1';
      rate = 0.5;
    } else {
      // attente : légère respiration
      target = mixPose(POSES.idle, POSES.idle2, (Math.sin(f.age * 0.09) + 1) / 2, scratch);
      f.spriteKey = 'idle';
      rate = 0.3;
    }
  } else if (f.state === 'hitstun' && f.t > f.stun - 5) {
    // fin d'étourdissement : retour progressif à la garde
    target = f.crouching ? POSES.crouch : POSES.idle;
    rate = 0.3;
  }
  approachPose(f.pose, target, rate);
}
