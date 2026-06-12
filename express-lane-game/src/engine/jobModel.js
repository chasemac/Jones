/**
 * @module jobModel
 * Job and career logic: requirement checks, promotion eligibility, career track derivation.
 *
 * All job data comes from jobs.json. This module provides pure functions
 * for evaluating player eligibility against job requirements.
 */

import { meetsEducation, CAREER_PERKS, JOB_BASE_REJECTION, JOB_DEP_REJECTION_DIVISOR, JOB_DEP_REJECTION_CAP } from './constants';
import jobsData from '../data/jobs.json';

const REJECTION_MESSAGES = [
  (employer) => `${employer} went with another candidate.`,
  (employer) => `${employer} said they'll keep your résumé on file. (They won't.)`,
  (employer) => `${employer} ghosted you after the interview.`,
  (employer) => `${employer} said you were overqualified. Sure.`,
  (employer) => `${employer} passed this time. Try again.`,
];

/**
 * Final probabilistic-rejection chance for a qualified applicant.
 * Higher dependability and the Coffee Shop networking perk improve odds.
 * Pure — exposed separately so the UI can show "hire chance" some day.
 */
export const applicationRejectionChance = (player, job) => {
  const baseChance = job.rejectionChance || JOB_BASE_REJECTION;
  const depBonus = Math.min(JOB_DEP_REJECTION_CAP, player.dependability / JOB_DEP_REJECTION_DIVISOR);
  const coffeeNetworking = player.job?.location === 'coffee_shop' ? (CAREER_PERKS.coffee_shop.rejectionReduction || 0) : 0;
  return baseChance * (1 - depBonus) * (1 - coffeeNetworking);
};

/**
 * Probabilistic application roll for a QUALIFIED applicant (hard requirements
 * already checked). Audit A7: extracted from the reducer with injectable RNG
 * so the rejection curve is unit-testable.
 * @returns {{ rejected: boolean, message: string|null, chance: number }}
 */
export const rollApplication = (player, job, employer, rng = Math.random) => {
  const chance = applicationRejectionChance(player, job);
  if (rng() < chance) {
    const message = REJECTION_MESSAGES[Math.floor(rng() * REJECTION_MESSAGES.length)](employer);
    return { rejected: true, message, chance };
  }
  return { rejected: false, message: null, chance };
};

/**
 * Metadata labels for career track types.
 * @type {Object<string, string>}
 */
const TRACK_META = {
  service: '☕ Service',
  tech: '💻 Tech',
  corporate: '🏢 Corp',
  trade: '🔧 Trade',
};

/**
 * Derived career tracks: each track is a chain of jobs linked by promotion.
 * Built once from jobs.json at module load time.
 *
 * Each entry: { label: string, jobs: string[] } where jobs is an ordered
 * array of job IDs from entry-level to the top of the chain.
 *
 * @type {Array<{label: string, jobs: string[]}>}
 */
export const CAREER_TRACKS = (() => {
  const promotionTargets = new Set(jobsData.map(j => j.promotion).filter(Boolean));
  const tracks = [];
  for (const [type, label] of Object.entries(TRACK_META)) {
    const typeJobs = jobsData.filter(j => j.type === type);
    const roots = typeJobs.filter(j => !promotionTargets.has(j.id));
    for (const root of roots) {
      const chain = [];
      let cur = root;
      while (cur) {
        chain.push(cur.id);
        cur = typeJobs.find(j => j.id === cur.promotion);
      }
      tracks.push({ label, jobs: chain });
    }
  }
  return tracks;
})();

/**
 * Check whether a player meets all hard requirements for a specific job.
 * @param {Object} player - The player state object.
 * @param {Object} job - The job definition from jobs.json.
 * @returns {{meetsExp: boolean, meetsEdu: boolean, meetsDep: boolean, meetsItem: boolean, canApply: boolean}}
 */
export const checkJobRequirements = (player, job) => {
  const meetsExp = !job.requirements?.experience ||
    (player.job?.shiftsWorked || 0) >= job.requirements.experience;
  const meetsEdu = !job.requirements?.education ||
    meetsEducation(player.education, job.requirements.education);
  const meetsDep = !job.requirements?.dependability ||
    player.dependability >= job.requirements.dependability;
  const meetsItem = !job.requirements?.item ||
    player.inventory.some(i => i.id === job.requirements.item);
  return {
    meetsExp,
    meetsEdu,
    meetsDep,
    meetsItem,
    canApply: meetsExp && meetsEdu && meetsDep && meetsItem,
  };
};

/**
 * Check whether a job is "entry level" (has no hard requirements).
 * @param {Object} job - Job definition from jobs.json.
 * @returns {boolean}
 */
export const isEntryLevel = (job) =>
  !job.requirements?.education &&
  !job.requirements?.experience &&
  !job.requirements?.dependability &&
  !job.requirements?.item;

/**
 * Get the next promotion job if the player meets all its requirements.
 * Returns null if no promotion exists or requirements aren't met.
 * @param {Object} player - The player state object.
 * @returns {Object|null} The next job definition, or null.
 */
export const getNextPromotion = (player) => {
  if (!player?.job?.promotion) return null;
  const nextJob = jobsData.find(j => j.id === player.job.promotion);
  if (!nextJob) return null;

  const { canApply } = checkJobRequirements(player, nextJob);
  return canApply ? nextJob : null;
};

/**
 * Categorize a job's rejection chance into a difficulty label.
 * @param {number} rejectionChance - The job's base rejection chance (0-1).
 * @returns {{text: string, colorClass: string}}
 */
export const difficultyLabel = (rejectionChance) => {
  const chance = rejectionChance ?? 0.25;
  if (chance <= 0.15) return { text: 'Easy', colorClass: 'bg-green-100 text-green-700' };
  if (chance <= 0.30) return { text: 'Moderate', colorClass: 'bg-yellow-100 text-yellow-700' };
  return { text: 'Competitive', colorClass: 'bg-red-100 text-red-600' };
};

/**
 * Get the location ID where a job's work is performed.
 * Falls back through job.workLocation → job.location → type-based default.
 * @param {Object|null} job - The job definition.
 * @returns {string|null} Location ID or null if no job.
 */
export const getJobLocation = (job) => {
  if (!job) return null;
  return job.workLocation || job.location || JOB_WORK_LOCATION_FALLBACK[job.type] || null;
};

/** @private Fallback work locations by job type */
const JOB_WORK_LOCATION_FALLBACK = {
  service: 'coffee_shop',
  tech: 'tech_store',
  corporate: 'neobank',
  gig: 'quick_eats',
  trade: 'public_library',
};
