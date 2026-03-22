import React, { useState } from 'react';
import { checkJobRequirements, isEntryLevel, difficultyLabel } from '../../engine/jobModel';
import jobsData from '../../data/jobs.json';

const JobsHereCard = ({ locationId, player, actions }) => {
  const [open, setOpen] = useState(false);
  const jobs = jobsData.filter(j => j.location === locationId);
  if (jobs.length === 0) return null;
  const entryCount = jobs.filter(j => isEntryLevel(j)).length;
  const isUnemployed = !player.job;
  const hasEntryJob = entryCount > 0;

  return (
    <div className={`border rounded-xl overflow-hidden mb-3 ${isUnemployed && hasEntryJob ? 'border-green-300 shadow-sm' : 'border-slate-200'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition min-h-[40px] ${isUnemployed && hasEntryJob ? 'bg-green-50 hover:bg-green-100 text-green-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
      >
        <span>
          {isUnemployed && hasEntryJob ? '🟢 ' : '🧾 '}
          {jobs.length} Position{jobs.length !== 1 ? 's' : ''} Available Here
          {entryCount > 0 ? ` · ${entryCount} entry level` : ''}
          {isUnemployed && hasEntryJob ? ' · HIRING' : ''}
        </span>
        <span>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="p-2 space-y-2 bg-white">
          {jobs.map(job => {
            const { meetsExp, meetsEdu, meetsDep, meetsItem, canApply } = checkJobRequirements(player, job);
            const isCurrent = player.job?.id === job.id;
            const diff = difficultyLabel(job.rejectionChance);
            const isEntry = isEntryLevel(job);
            return (
              <div key={job.id} className={`border rounded-lg p-2 text-xs ${isCurrent ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-bold">{job.title}</span>
                    {isCurrent && <span className="ml-1 text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded">current</span>}
                    {job.remote && <span className="ml-1 text-[9px] bg-violet-100 text-violet-700 px-1 rounded">remote</span>}
                    <div className="text-slate-400 text-[9px] mt-0.5">{job.description}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-mono font-black text-green-700">${job.wage}/hr</div>
                    <span className={`text-[9px] px-1 rounded ${diff.colorClass}`}>{diff.text}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {isEntry
                    ? <span className="text-[9px] text-green-600">✓ Open to everyone</span>
                    : <>
                      {job.requirements?.education && <span className={`text-[9px] px-1 rounded ${meetsEdu ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎓 {job.requirements.education}</span>}
                      {job.requirements?.experience && <span className={`text-[9px] px-1 rounded ${meetsExp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>⏱ {job.requirements.experience}wks</span>}
                      {job.requirements?.dependability && <span className={`text-[9px] px-1 rounded ${meetsDep ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎯 {job.requirements.dependability} dep</span>}
                      {job.requirements?.item && <span className={`text-[9px] px-1 rounded ${meetsItem ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>📦 {job.requirements.item.replace(/_/g, ' ')}</span>}
                    </>
                  }
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => actions.applyForJob(job)}
                    disabled={player.timeRemaining < 2}
                    className={`w-full py-1 rounded text-[10px] font-bold text-white transition active:scale-95 disabled:opacity-40 min-h-[36px] ${canApply ? 'bg-slate-700 hover:bg-slate-800' : 'bg-slate-400 hover:bg-slate-500'}`}
                  >
                    {canApply ? '📋 Apply (2 hrs)' : '🚫 Apply anyway'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobsHereCard;
