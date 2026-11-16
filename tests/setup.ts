/* Avant chaque fichier de test : les personnages de test rejoignent la liste des personnages jouables. */
import { addCharacter } from '../src/data/roster';
import { TEST_CHARACTERS } from './fixtures';

for (const def of TEST_CHARACTERS) addCharacter(def);
