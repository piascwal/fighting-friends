/** Noms des sons. Le moteur ne joue rien lui-même : il émet ces noms, la couche audio les joue. */
export type SfxName =
  | 'hitL'
  | 'hitH'
  | 'block'
  | 'whoosh'
  | 'jump'
  | 'land'
  | 'fire'
  | 'elec'
  | 'earth'
  | 'slash'
  | 'ice'
  | 'special'
  | 'super'
  | 'ko'
  | 'move'
  | 'ok'
  | 'back'
  | 'vs'
  | 'round'
  | 'fight'
  | 'win';

export type MusicName = 'menu' | 'fight' | 'ending';
