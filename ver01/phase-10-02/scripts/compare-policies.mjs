import { PLAYTEST_POLICIES } from '../src/policies.ts';
import { runPlaytest } from '../src/playtest.ts';

console.log(JSON.stringify(PLAYTEST_POLICIES.map(runPlaytest), null, 2));
