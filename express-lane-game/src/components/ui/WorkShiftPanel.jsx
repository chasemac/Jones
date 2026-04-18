import React from 'react';
import { effectiveWage } from '../../engine/economyModel';
import { getNextPromotion } from '../../engine/jobModel';
import { ExpProgressBar } from './GameWidgets';

/**
 * Reusable work-shift UI used at every employer location.
 * Renders part-time (4h), full-shift (8h), and overtime (12h) buttons,
 * an XP progress bar, and a promote button when the next job is available.
 *
 * Theme props accept Tailwind class strings so each location keeps its color identity.
 */
const WorkShiftPanel = ({
  player,
  economy,
  actions,
  partClass = 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  fullClass = 'bg-orange-100 border-orange-300 hover:bg-orange-200',
  overtimeClass = 'bg-amber-50 border-amber-300 hover:bg-amber-100',
  overtimeTextClass = 'text-amber-700',
  partLabel = '⏱ Part (4h)',
  fullLabel = 'Full Shift (8h)',
  overtimeSubtitle = '-10 happiness',
}) => {
  const wage = player.job?.wage ?? 0;
  const nextJob = getNextPromotion(player);

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <button
          onClick={actions.partTimeWork}
          disabled={player.timeRemaining < 4}
          className={`p-2 border-2 rounded-xl disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px] ${partClass}`}
        >
          <div className="font-bold">{partLabel}</div>
          <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(wage, economy) * 4)}</div>
        </button>
        <button
          onClick={actions.work}
          disabled={player.timeRemaining < 8}
          className={`p-2 border-2 rounded-xl disabled:opacity-50 text-xs transition active:scale-95 min-h-[44px] ${fullClass}`}
        >
          <div className="font-bold">{fullLabel}</div>
          <div className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(wage, economy) * 8)}</div>
        </button>
      </div>
      <button
        onClick={actions.workOvertime}
        disabled={player.timeRemaining < 12}
        className={`w-full p-2 border rounded-xl disabled:opacity-50 text-xs transition active:scale-95 mb-1.5 min-h-[44px] ${overtimeClass}`}
      >
        <div className="flex justify-between items-center">
          <span className="font-bold">⚡ Overtime (12h · 1.5x)</span>
          <span className="font-mono font-black text-green-600">+${Math.floor(effectiveWage(wage, economy) * 12 * 1.5)}</span>
        </div>
        <div className={overtimeTextClass}>{overtimeSubtitle}</div>
      </button>
      <ExpProgressBar player={player} />
      {nextJob && (
        <button
          onClick={() => actions.applyForJob(nextJob, true)}
          className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95"
        >
          🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
        </button>
      )}
    </>
  );
};

export default WorkShiftPanel;
