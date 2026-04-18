import React, { useState } from 'react';
import { effectiveWage } from '../../engine/economyModel';
import { CAREER_TRACKS, checkJobRequirements, isEntryLevel, difficultyLabel } from '../../engine/jobModel';
import { LOCATIONS_CONFIG, LIBRARY_LOCATION_GROUPS } from '../../engine/boardModel';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import { meetsEducation, CAREER_PERKS } from '../../engine/constants';
import jobsData from '../../data/jobs.json';

const SalaryTransparencyView = ({ player, economy }) => {
  const sorted = [...jobsData].sort((a, b) => b.wage - a.wage);
  return (
    <div className="space-y-1">
      <div className="text-[9px] text-slate-400 mb-1.5">All jobs sorted by pay — visit the location to apply.</div>
      {sorted.map(job => {
        const isCurrent = player.job?.id === job.id;
        const { canApply: qualified } = checkJobRequirements(player, job);
        return (
          <div key={job.id} className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs ${isCurrent ? 'bg-emerald-50 border-emerald-300' : qualified ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] opacity-60">{LOCATIONS_CONFIG[job.location]?.emoji}</span>
              <div className="min-w-0">
                <div className="font-bold truncate">{job.title} {isCurrent && <span className="text-[8px] text-emerald-700">← you</span>}</div>
                <div className="text-[9px] text-slate-400">{LIBRARY_LOCATION_GROUPS.find(g => g.id === job.location)?.label ?? job.location.replace(/_/g, ' ')} {job.remote ? '· 🏠 WFH' : ''}</div>
                {!isCurrent && (
                  <span className={`text-[8px] font-bold px-1 rounded ${qualified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {qualified ? '✅ Eligible' : '❌ Missing reqs'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="font-mono font-black text-green-700">${effectiveWage(job.wage, economy)}/hr</div>
              <div className="text-[8px] text-slate-400">${Math.floor(effectiveWage(job.wage, economy) * 8)}/shift</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LibraryContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTradeEmployee = player.job?.type === 'trade';
  const tradePerk = CAREER_PERKS.public_library;
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [viewMode, setViewMode] = useState('browse');

  const locationJobs = selectedLocation
    ? jobsData.filter(j => j.location === selectedLocation.id)
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      {/* Left: Job board by location */}
      <div className="flex flex-col">
        {!selectedLocation ? (
          <>
            <div className="flex items-center gap-2 border-b border-slate-300 pb-1 mb-2">
              <h3 className="font-bold text-sm flex-1">📋 Job Board</h3>
              <div className="flex text-[9px] gap-1">
                <button onClick={() => setViewMode('browse')} className={`px-2 py-0.5 rounded font-bold transition ${viewMode === 'browse' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  By Location
                </button>
                <button onClick={() => setViewMode('salary')} className={`px-2 py-0.5 rounded font-bold transition ${viewMode === 'salary' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  💰 By Pay
                </button>
              </div>
            </div>
            {viewMode === 'salary' && (
              <div className="max-h-64 sm:max-h-none sm:flex-grow overflow-y-auto">
                <SalaryTransparencyView player={player} economy={economy} />
              </div>
            )}
            {viewMode === 'browse' && (
            <div className="max-h-72 sm:max-h-none sm:flex-grow overflow-y-auto">
            <div className="space-y-1.5">
              {LIBRARY_LOCATION_GROUPS.map(loc => {
                const jobs = jobsData.filter(j => j.location === loc.id);
                if (jobs.length === 0) return null;
                const entryCount = jobs.filter(j => isEntryLevel(j)).length;
                const isCurrentWorkplace = player.job?.location === loc.id;
                const isRemote = loc.id === 'home';
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`w-full text-left p-2.5 border-2 rounded-xl transition active:scale-95
                      ${isCurrentWorkplace ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{loc.emoji}</span>
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            {loc.label}
                            {isCurrentWorkplace && <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded">your employer</span>}
                            {isRemote && <span className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded">WFH</span>}
                          </div>
                          {entryCount > 0 && <div className="text-[9px] text-green-600 font-semibold">✓ {entryCount} entry-level opening{entryCount !== 1 ? 's' : ''}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-500">{jobs.length} position{jobs.length !== 1 ? 's' : ''}</div>
                        <div className="text-slate-400 text-sm">›</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[9px] text-slate-400 italic text-center">Select a company to browse openings and apply. Then visit that location to work your shifts.</div>
            </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 border-b border-slate-300 pb-1">
              <button onClick={() => setSelectedLocation(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none font-bold">‹</button>
              <span className="text-lg">{selectedLocation.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm leading-tight">{selectedLocation.label}</h3>
                <p className="text-[9px] text-slate-500">{locationJobs.length} position{locationJobs.length !== 1 ? 's' : ''} available</p>
              </div>
            </div>
            <div className="max-h-72 sm:max-h-none sm:flex-grow overflow-y-auto space-y-2">
              {locationJobs.map(job => {
                const { meetsExp, meetsEdu, meetsDep, meetsItem, canApply } = checkJobRequirements(player, job);
                const isCurrent = player.job?.id === job.id;
                const isEntry = isEntryLevel(job);
                const diff = difficultyLabel(job.rejectionChance);
                return (
                  <div key={job.id} className={`border-2 rounded-xl p-2.5 ${isCurrent ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300' : canApply ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1">
                          {job.title}
                          {isCurrent && <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded">current</span>}
                          {job.remote && <span className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded">remote</span>}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{job.description}</div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-mono font-black text-sm text-green-700">${job.wage}/hr</div>
                        <span className={`text-[9px] px-1 rounded ${diff.colorClass}`}>{diff.text}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {isEntry
                        ? <span className="text-[9px] text-green-600 font-semibold">✓ Open to everyone</span>
                        : <>
                          {job.requirements?.education && <span className={`text-[9px] px-1 rounded ${meetsEdu ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎓 {job.requirements.education}</span>}
                          {job.requirements?.experience && <span className={`text-[9px] px-1 rounded ${meetsExp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>⏱ {job.requirements.experience}wks exp</span>}
                          {job.requirements?.dependability && <span className={`text-[9px] px-1 rounded ${meetsDep ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎯 {job.requirements.dependability} dep</span>}
                          {job.requirements?.item && <span className={`text-[9px] px-1 rounded ${meetsItem ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>📦 {job.requirements.item.replace(/_/g, ' ')}</span>}
                        </>
                      }
                    </div>
                    {isCurrent ? (
                      <div className="text-[10px] text-center text-emerald-700 font-semibold py-1">✓ Currently employed here</div>
                    ) : (
                      <button
                        onClick={() => actions.applyForJob(job)}
                        disabled={player.timeRemaining < 2}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold text-white transition active:scale-95 disabled:opacity-40 min-h-[44px] ${canApply ? 'bg-slate-700 hover:bg-slate-900' : 'bg-slate-400 hover:bg-slate-500'}`}
                      >
                        {canApply ? '📋 Apply (2 hrs)' : '🚫 Apply anyway (likely rejected)'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right: Trade Dispatch */}
      <div className="flex flex-col gap-3 sm:overflow-y-auto sm:max-h-full">
        <div>
          <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">
            🔧 Trade Dispatch <EconomyWageBadge economy={state.economy} />
          </h3>
          {isTradeEmployee && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2 mb-2">
              <span>{tradePerk.icon}</span>
              <span className="font-bold text-yellow-800">{tradePerk.label}:</span>
              <span className="text-yellow-700">{tradePerk.desc}</span>
            </div>
          )}
          {isTradeEmployee ? (
            <WorkShiftPanel
              player={player}
              economy={state.economy}
              actions={actions}
              partClass="bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
              fullClass="bg-yellow-100 border-yellow-300 hover:bg-yellow-200"
              partLabel="⏱ Half (4h)"
              fullLabel="🔧 Site (8h)"
            />
          ) : (
            <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Trade workers (electricians, plumbers, laborers) pick up dispatch jobs here.</div>
          )}
        </div>
        {/* Career track overview */}
        {!isTradeEmployee && (
          <div className="mb-3">
            <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">🗺️ Career Tracks</h3>
            <div className="space-y-2">
              {CAREER_TRACKS.slice(0, 4).map((track, ti) => {
                const entryJob = jobsData.find(j => j.id === track.jobs[0]);
                const canEnter = entryJob && (!entryJob.requirements?.education || meetsEducation(player.education, entryJob.requirements.education));
                return (
                <div key={ti} className={`rounded-lg p-2 border ${canEnter ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-bold text-slate-600">{track.label}</div>
                    {canEnter ? <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded font-bold">✓ Eligible</span> : <span className="text-[8px] bg-slate-100 text-slate-400 px-1 rounded">locked</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {track.jobs.map((jobId, i) => {
                      const job = jobsData.find(j => j.id === jobId);
                      if (!job) return null;
                      const isCurrent = player.job?.id === jobId;
                      return (
                        <React.Fragment key={jobId}>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isCurrent ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>
                            {job.title} <span className="opacity-60">${job.wage}</span>
                          </span>
                          {i < track.jobs.length - 1 && <span className="text-slate-300 text-[9px]">→</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Books section */}
        <div>
          <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📖 Read a Book (2h)</h3>
          <div className="space-y-2">
            {[
              { title: 'The Great Novel',      emoji: '📕', genre: 'Fiction',    hours: 2, happinessGain: 8, relaxGain: 5,  depGain: 0, desc: 'Escape into a story. Pure bliss.' },
              { title: 'Think & Grow Rich',    emoji: '📗', genre: 'Self-Help',  hours: 2, happinessGain: 4, relaxGain: 0,  depGain: 3, desc: '+happiness, +dependability' },
              { title: 'How Things Work',      emoji: '📘', genre: 'Technical',  hours: 2, happinessGain: 3, relaxGain: 0,  depGain: 2, desc: 'Dry but useful. You feel smarter.' },
              { title: 'Travel & Adventures',  emoji: '📙', genre: 'Travel',     hours: 2, happinessGain: 10, relaxGain: 8, depGain: 0, desc: 'Best happiness boost, pure joy.' },
            ].map(book => (
              <button
                key={book.title}
                onClick={() => actions.readBook(book)}
                disabled={player.timeRemaining < book.hours}
                className="w-full text-left p-2.5 border rounded-xl bg-white hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-40 transition active:scale-95 border-slate-200"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{book.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs">{book.title}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{book.desc}</div>
                    <div className="flex gap-2 mt-1">
                      {book.happinessGain > 0 && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">+{book.happinessGain} 😊</span>}
                      {book.relaxGain > 0 && <span className="text-[9px] bg-teal-100 text-teal-700 px-1 rounded">+{book.relaxGain} relax</span>}
                      {book.depGain > 0 && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">+{book.depGain} dep</span>}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 shrink-0">{book.hours}h</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryContent;
