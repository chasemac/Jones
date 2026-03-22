import React from 'react';
import { checkJobRequirements } from '../../engine/jobModel';
import jobsData from '../../data/jobs.json';

/** Economy badge shown next to work sections */
export const EconomyWageBadge = ({ economy }) => {
  if (economy === 'Normal') return null;
  const isBoom = economy === 'Boom';
  return (
    <span className={`text-[8px] font-black px-1 rounded ml-1 ${isBoom ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-700'}`}>
      {isBoom ? '📈 Boom wages' : '📉 Low wages'}
    </span>
  );
};

/** Experience progress bar toward next promotion */
export const ExpProgressBar = ({ player }) => {
  if (!player.job?.promotion) return null;
  const nextJob = jobsData.find(j => j.id === player.job.promotion);
  const expNeeded = nextJob?.requirements?.experience || 0;
  if (!expNeeded) return null;
  const weeksWorked = player.job.weeksWorked || 0;
  const expPct = Math.min(100, (weeksWorked / expNeeded) * 100);
  const ready = weeksWorked >= expNeeded;
  const weeksLeft = Math.max(0, expNeeded - weeksWorked);
  const { meetsEdu, meetsDep, meetsItem } = nextJob ? checkJobRequirements(player, nextJob) : {};
  return (
    <div className={`mt-1 text-[10px] rounded-lg px-2 py-1.5 border ${ready && meetsEdu && meetsDep && meetsItem ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
      <div className="flex justify-between mb-0.5">
        <span>⏱ → {nextJob.title}</span>
        <span className={ready ? 'text-green-600 font-bold' : ''}>{weeksWorked}/{expNeeded} wks{ready ? ' ✓' : ` (${weeksLeft} more)`}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${ready ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${expPct}%` }} />
      </div>
      {ready && (!meetsEdu || !meetsDep || !meetsItem) && (
        <div className="text-[9px] text-amber-600 mt-0.5 font-bold">
          Also need: {!meetsEdu && `🎓 ${nextJob.requirements.education} `}{!meetsDep && `🎯 ${nextJob.requirements.dependability} dep `}{!meetsItem && `📦 ${nextJob.requirements.item?.replace(/_/g, ' ')}`}
        </div>
      )}
    </div>
  );
};

