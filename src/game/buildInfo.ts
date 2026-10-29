import { SAVE_DATA_VERSION } from './progress';

declare const __BUILD_DATE__: string;
declare const __GIT_COMMIT__: string;

export const PLAYTEST_CANDIDATE = 'Playtest Candidate 1';
export const BUILD_DATE = __BUILD_DATE__;
export const BUILD_COMMIT = __GIT_COMMIT__;
export { SAVE_DATA_VERSION };
