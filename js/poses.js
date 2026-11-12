/* Postures du squelette procédural + liste des sprites attendus (et prompts) */
(function () {
  const FF = window.FF;

  // Angles en degrés. Segment : 0 = vers le bas, 90 = vers l'avant, 180 = vers le haut.
  // t = inclinaison du buste (+ = vers l'avant), hd = tête, rot = rotation du corps entier.
  // aF/aB = bras avant/arrière [bras, avant-bras], lF/lB = jambes [cuisse, tibia].
  const RAW = {
    idle: { t: 6, hd: 0, aF: [40, 140], aB: [5, 120], lF: [26, 2], lB: [-16, -34] },
    idle2: { t: 9, hd: 2, aF: [46, 134], aB: [11, 114], lF: [33, -3], lB: [-21, -41] },
    walkA: { t: 7, lF: [36, 14], lB: [-26, -50] },
    walkB: { t: 7, lF: [-8, -32], lB: [26, 4] },
    crouch: { t: 26, hd: -8, aF: [45, 140], aB: [15, 125], lF: [100, -25], lB: [55, -95] },
    jump: { t: 4, aF: [70, 160], aB: [-40, 60], lF: [70, -40], lB: [10, -70] },
    block: { t: -6, hd: -6, aF: [75, 172], aB: [60, 168], lF: [24, 4], lB: [-18, -32] },
    crouchBlock: { t: 16, hd: -8, aF: [75, 172], aB: [60, 168], lF: [100, -25], lB: [55, -95] },
    hit: { t: -24, hd: -28, aF: [-10, 60], aB: [-50, 10], lF: [32, 12], lB: [-8, -28] },
    hitLow: { t: 36, hd: 26, aF: [30, 100], aB: [20, 95], lF: [20, -6], lB: [-20, -42] },
    fall: { rot: -62, t: -6, hd: -16, aF: [-70, -100], aB: [-90, -120], lF: [52, 20], lB: [20, -12] },
    down: { rot: -90, t: 0, hd: 4, aF: [34, 22], aB: [-12, -6], lF: [16, 4], lB: [-4, -16] },
    getup: { t: 42, hd: 10, aF: [30, 10], aB: [20, 0], lF: [95, -20], lB: [50, -90] },
    win: { t: -4, hd: -10, aF: [166, 178], aB: [-34, 44], lF: [14, 4], lB: [-14, -6] },
    intro: { t: 0, hd: 6, aF: [24, 104], aB: [18, 96], lF: [10, 2], lB: [-12, -6] },
    lose: { t: 38, hd: 30, aF: [20, 10], aB: [10, 0], lF: [92, -12], lB: [30, -92] },
    // normaux
    windP: { t: -4, aF: [30, 120], aB: [-50, 70] },
    lp: { t: 12, aF: [86, 90], aB: [0, 125], lF: [30, 4], lB: [-20, -36] },
    hp: { t: 24, hd: 4, aF: [-25, 75], aB: [84, 88], lF: [42, 2], lB: [-34, -44] },
    windK: { t: -8, lF: [80, -10], lB: [-4, -10] },
    lk: { t: -12, aF: [30, 130], aB: [-20, 100], lF: [84, 82], lB: [-4, -12] },
    hk: { t: -28, hd: -5, aF: [10, 110], aB: [-50, 40], lF: [120, 126], lB: [4, -6] },
    cLp: { t: 32, hd: -8, aF: [84, 90], aB: [10, 120], lF: [100, -25], lB: [55, -95] },
    cLk: { t: 6, hd: -4, aF: [45, 140], aB: [15, 125], lF: [80, 86], lB: [60, -95] },
    sweep: { t: -32, hd: -5, aF: [20, 100], aB: [-70, -20], lF: [76, 84], lB: [70, -80] },
    windU: { t: 30, hd: 0, aF: [20, 80], aB: [10, 110], lF: [90, -20], lB: [50, -90] },
    upper: { t: -6, hd: -14, aF: [160, 176], aB: [-30, 60], lF: [16, 2], lB: [-14, -24] },
    windO: { t: -12, hd: -6, aF: [150, 215], aB: [20, 110] },
    overhead: { t: 32, hd: 10, aF: [72, 58], aB: [-30, 40], lF: [40, 0], lB: [-30, -44] },
    jP: { t: 28, aF: [62, 56], aB: [-40, 60], lF: [60, -50], lB: [10, -80] },
    jK: { t: 14, aF: [40, 140], aB: [-40, 80], lF: [58, 56], lB: [50, -70] },
    // spéciaux
    windCast: { t: -6, aF: [-30, 30], aB: [-50, 10], lF: [30, 0], lB: [-24, -40] },
    cast: { t: 18, aF: [84, 90], aB: [78, 96], lF: [46, -4], lB: [-40, -52] },
    throwS: { t: 22, aF: [96, 82], aB: [-40, 30], lF: [40, 0], lB: [-30, -46] },
    dashP: { t: 38, hd: 8, aF: [88, 92], aB: [-60, -20], lF: [60, -10], lB: [-50, -60] },
    shoulder: { t: 42, hd: 15, aF: [40, 150], aB: [30, 140], lF: [55, -12], lB: [-45, -58] },
    spinK: { t: -20, aF: [-40, 40], aB: [60, 100], lF: [100, 104], lB: [0, -5] },
    spinK2: { t: -20, aF: [-40, 40], aB: [60, 100], lF: [100, 104], lB: [0, -5], flip: 1 },
    diveK: { rot: 22, t: 10, aF: [-40, 60], aB: [-70, 10], lF: [40, 42], lB: [60, -60] },
    windSlam: { t: -12, hd: -10, aF: [168, 182], aB: [160, 176], lF: [30, 0], lB: [-24, -40] },
    slam: { t: 56, hd: 20, aF: [40, 22], aB: [34, 14], lF: [82, -15], lB: [-30, -72] },
    charge: { t: -6, hd: -12, aF: [80, 172], aB: [-78, -172], lF: [40, 2], lB: [-40, -4] },
    slash: { t: 30, hd: 6, aF: [100, 70], aB: [-60, -10], lF: [50, -6], lB: [-44, -56] },
    slash2: { t: 10, hd: 0, aF: [150, 120], aB: [-30, 60], lF: [44, -4], lB: [-38, -50] },
    dashF: { t: 30, hd: 6, aF: [20, 110], aB: [-40, 40], lF: [56, -14], lB: [-50, -70] },
    dashB: { t: -18, hd: -4, aF: [50, 150], aB: [20, 130], lF: [40, 30], lB: [0, -30] },
  };

  const KEYS = ['t', 'hd', 'rot', 'aF0', 'aF1', 'aB0', 'aB1', 'lF0', 'lF1', 'lB0', 'lB1'];
  const P = {};
  const base = RAW.idle;
  for (const n in RAW) {
    const r = RAW[n], g = (k) => (r[k] !== undefined ? r[k] : base[k]);
    P[n] = {
      name: n, t: g('t'), hd: r.hd || 0, rot: r.rot || 0, flip: r.flip || 0,
      aF0: g('aF')[0], aF1: g('aF')[1], aB0: g('aB')[0], aB1: g('aB')[1],
      lF0: g('lF')[0], lF1: g('lF')[1], lB0: g('lB')[0], lB1: g('lB')[1],
    };
  }
  FF.POSES = P; FF.POSE_KEYS = KEYS;

  // posture du squelette -> sprite utilisé quand le personnage a des images
  FF.POSE_SPRITE = {
    idle: 'idle', idle2: 'idle', walkA: 'walk1', walkB: 'walk2', crouch: 'crouch', jump: 'jump',
    block: 'block', crouchBlock: 'crouch_block', hit: 'hit', hitLow: 'hit', fall: 'fall', down: 'down',
    getup: 'crouch', win: 'win', intro: 'intro', lose: 'crouch', windP: 'idle', lp: 'punch_light',
    hp: 'punch_heavy', windK: 'idle', lk: 'kick_light', hk: 'kick_heavy', cLp: 'crouch_punch',
    cLk: 'crouch_kick', sweep: 'crouch_kick', windU: 'crouch', upper: 'uppercut', windO: 'idle',
    overhead: 'punch_heavy', jP: 'jump_punch', jK: 'jump_kick', windCast: 'idle', cast: 'special1',
    throwS: 'special1', dashP: 'special1', shoulder: 'special2', spinK: 'special2', spinK2: 'special2',
    diveK: 'special2', windSlam: 'idle', slam: 'special1', charge: 'super', slash: 'punch_heavy',
    slash2: 'uppercut', dashF: 'walk1', dashB: 'idle',
  };

  /* Liste des sprites d'un personnage.
     h : hauteur visée (1 = taille debout) ; w : largeur visée (poses allongées) ;
     ax : position du centre du corps dans la largeur de l'image détourée (0 = arrière, 1 = avant) ;
     fb : sprites de repli si l'image manque. */
  FF.SPRITE_POSES = [
    { key: 'idle', label: 'Garde (repos)', req: true, rig: 'idle', h: 1, ax: 0.5, fb: [],
      desc: "posture de garde de combat : debout, jambes légèrement fléchies et écartées, les deux poings levés devant le torse, regard déterminé" },
    { key: 'portrait', label: 'Portrait (case de sélection)', rig: 'idle', portrait: true, fb: [],
      desc: "PORTRAIT en gros plan : uniquement la tête et le haut des épaules, visage de 3/4 tourné vers la droite, expression combative. Cadrage carré serré sur le visage" },
    { key: 'walk1', label: 'Marche 1', rig: 'walkA', h: 1, ax: 0.5, fb: ['idle'],
      desc: "en garde et en train d'avancer : grand pas en avant, jambe avant loin devant, jambe arrière tendue derrière, poings levés" },
    { key: 'walk2', label: 'Marche 2', rig: 'walkB', h: 1, ax: 0.5, fb: ['walk1', 'idle'],
      desc: "en garde et en train d'avancer : jambes croisées en plein milieu d'un pas (la jambe arrière passe devant), poings levés" },
    { key: 'crouch', label: 'Accroupi', rig: 'crouch', h: 0.7, ax: 0.5, fb: ['idle'],
      desc: "accroupi très bas, genoux pliés, un genou presque au sol, buste penché en avant, poings en garde devant le visage" },
    { key: 'jump', label: 'Saut', rig: 'jump', h: 0.9, ax: 0.5, fb: ['idle'],
      desc: "en plein saut dans les airs : genoux repliés sous le corps, un bras levé, corps ramassé (aucun sol visible)" },
    { key: 'block', label: 'Blocage debout', rig: 'block', h: 1, ax: 0.5, fb: ['idle'],
      desc: "en train de bloquer un coup : debout, les deux avant-bras relevés à la verticale devant le visage, buste légèrement en retrait" },
    { key: 'crouch_block', label: 'Blocage accroupi', rig: 'crouchBlock', h: 0.7, ax: 0.5, fb: ['crouch', 'block', 'idle'],
      desc: "accroupi très bas en train de bloquer : les deux avant-bras relevés devant le visage" },
    { key: 'punch_light', label: 'Poing léger', rig: 'lp', h: 1, ax: 0.36, fb: ['idle'],
      desc: "coup de poing rapide (jab) : bras avant complètement tendu à l'horizontale à hauteur d'épaule, l'autre poing reste en garde près du menton" },
    { key: 'punch_heavy', label: 'Poing fort', rig: 'hp', h: 0.97, ax: 0.34, fb: ['punch_light', 'idle'],
      desc: "coup de poing puissant (direct du bras arrière) : buste fortement engagé et penché vers l'avant, bras tendu loin devant, jambes en fente, expression de rage" },
    { key: 'kick_light', label: 'Pied léger', rig: 'lk', h: 1, ax: 0.34, fb: ['punch_light', 'idle'],
      desc: "coup de pied frontal rapide : jambe avant tendue à l'horizontale à hauteur du ventre, debout sur l'autre jambe, poings en garde" },
    { key: 'kick_heavy', label: 'Pied fort', rig: 'hk', h: 1.02, ax: 0.36, fb: ['kick_light', 'punch_light', 'idle'],
      desc: "coup de pied circulaire haut très puissant : jambe tendue levée à hauteur de tête, buste penché en arrière pour l'équilibre, debout sur l'autre jambe" },
    { key: 'crouch_punch', label: 'Poing accroupi', rig: 'cLp', h: 0.68, ax: 0.38, fb: ['crouch', 'punch_light', 'idle'],
      desc: "accroupi très bas en donnant un coup de poing : bras avant tendu à l'horizontale devant lui" },
    { key: 'crouch_kick', label: 'Balayette', rig: 'sweep', h: 0.52, ax: 0.3, fb: ['crouch', 'kick_light', 'idle'],
      desc: "balayette au ras du sol : presque assis, une main posée au sol derrière lui, une jambe complètement tendue vers l'avant au niveau du sol" },
    { key: 'uppercut', label: 'Uppercut', rig: 'upper', h: 1.12, ax: 0.45, fb: ['punch_heavy', 'punch_light', 'idle'],
      desc: "uppercut : corps étiré vers le haut, poing levé à la verticale au-dessus de la tête, tête basculée en arrière, sur la pointe des pieds" },
    { key: 'jump_punch', label: 'Poing sauté', rig: 'jP', h: 0.86, ax: 0.42, fb: ['jump_kick', 'jump', 'idle'],
      desc: "en l'air (aucun sol visible), coup de poing plongeant : bras tendu en diagonale vers le bas et l'avant, genoux repliés" },
    { key: 'jump_kick', label: 'Pied sauté', rig: 'jK', h: 0.86, ax: 0.4, fb: ['jump_punch', 'jump', 'idle'],
      desc: "en l'air (aucun sol visible), coup de pied sauté : une jambe tendue en diagonale vers le bas et l'avant, l'autre jambe repliée sous le corps" },
    { key: 'special1', label: 'Coup spécial 1', rig: null, h: 0.95, ax: 0.38, fb: ['punch_heavy', 'punch_light', 'idle'], desc: null },
    { key: 'special2', label: 'Coup spécial 2', rig: null, h: 1, ax: 0.42, fb: ['kick_heavy', 'uppercut', 'punch_heavy', 'idle'], desc: null },
    { key: 'super', label: 'Super (concentration)', rig: 'charge', h: 1, ax: 0.5, fb: ['win', 'idle'],
      desc: "concentration de toute sa puissance avant une super attaque : jambes très écartées, bras fléchis de chaque côté du corps, poings serrés, tête levée, il hurle" },
    { key: 'hit', label: 'Touché', rig: 'hit', h: 0.98, ax: 0.5, fb: ['idle'],
      desc: "en train d'encaisser un coup violent au visage : tête et buste rejetés en arrière, bras ballants, grimace de douleur, déséquilibré" },
    { key: 'fall', label: 'Projeté en l\'air', rig: 'fall', w: 1.0, ax: 0.5, fb: ['hit', 'idle'],
      desc: "projeté dans les airs après un coup (aucun sol visible) : corps presque à l'horizontale, dos vers le sol, tête à GAUCHE et pieds à DROITE plus hauts que la tête, bras et jambes relâchés" },
    { key: 'down', label: 'Au sol (K.O.)', rig: 'down', w: 1.05, ax: 0.5, fb: ['fall', 'hit', 'idle'],
      desc: "K.O., allongé à plat sur le dos : corps horizontal, tête à GAUCHE de l'image et pieds à DROITE, bras le long du corps, yeux fermés" },
    { key: 'win', label: 'Victoire', rig: 'win', h: 1.12, ax: 0.5, fb: ['idle'],
      desc: "pose de victoire : debout bien droit, un poing levé vers le ciel, l'autre main sur la hanche, grand sourire triomphant" },
    { key: 'intro', label: 'Entrée en scène', rig: 'intro', h: 1, ax: 0.5, fb: ['idle'],
      desc: "pose d'entrée en scène avant le combat : debout bien droit, bras croisés sur la poitrine, regard de défi" },
    { key: 'projectile', label: 'Projectile', rig: null, proj: true, fb: [], desc: null },
  ];
  FF.SPRITE_BY_KEY = {};
  FF.SPRITE_POSES.forEach((s) => (FF.SPRITE_BY_KEY[s.key] = s));

  FF.poseDesc = (char, key) => {
    const s = FF.SPRITE_BY_KEY[key];
    return s.desc || (char.tpl.spriteDesc && char.tpl.spriteDesc[key]) || '';
  };
  FF.poseRig = (char, key) => FF.SPRITE_BY_KEY[key].rig || (char.tpl.spriteRig && char.tpl.spriteRig[key]) || 'idle';

  FF.buildPrompt = (char, key) => {
    const s = FF.SPRITE_BY_KEY[key], name = char.name, d = FF.poseDesc(char, key);
    const style = "Style : sprite de jeu de combat d'arcade 2D, strictement le même style graphique, les mêmes proportions et le même niveau de détail que l'image de référence, contours nets.";
    const bg = "Fond : aplat uni magenta pur #FF00FF sur toute l'image, sans dégradé, sans ombre portée, sans sol, sans décor, sans texte, sans cadre. Aucune teinte magenta ou rose vif sur le sujet lui-même.";
    if (s.proj)
      return `Génère UNE SEULE image d'un effet de jeu de combat, dans l'esprit et la palette de couleurs du personnage « ${name} » de l'image de référence jointe, SANS aucun personnage : ${d}. L'effet se déplace vers la DROITE, il est centré et occupe environ 70 % de l'image. ${style} ${bg} Format carré 1024×1024.`;
    if (s.portrait)
      return `À partir de l'image de référence jointe du personnage « ${name} » (garde exactement le même visage, la même coiffure, les mêmes vêtements, les mêmes couleurs), génère UNE SEULE image : ${d}. ${style} ${bg} Format carré 1024×1024.`;
    return `À partir de l'image de référence jointe du personnage « ${name} » (garde exactement le même visage, la même coiffure, la même corpulence, les mêmes vêtements, les mêmes accessoires et les mêmes couleurs), génère UNE SEULE image de ce personnage EN ENTIER, de la tête aux pieds, vu de côté (profil 3/4) et tourné vers la DROITE, dans la posture suivante : ${d}. ` +
      `Un seul personnage, une seule pose, aucun effet spécial (ni flammes, ni éclairs, ni traînées de mouvement, ni onomatopées). Le personnage est centré, entièrement visible sans être coupé, et occupe environ 80 % de la hauteur de l'image. ${style} ${bg} Format carré 1024×1024.`;
  };
})();
