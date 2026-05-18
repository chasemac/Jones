import React, { useState } from 'react';
import { effectiveWage } from '../../engine/economyModel';
import { CAREER_TRACKS, checkJobRequirements, isEntryLevel, difficultyLabel } from '../../engine/jobModel';
import { LOCATIONS_CONFIG, LIBRARY_LOCATION_GROUPS } from '../../engine/boardModel';
import { EconomyWageBadge } from '../ui/GameWidgets';
import WorkShiftPanel from '../ui/WorkShiftPanel';
import { meetsEducation, CAREER_PERKS } from '../../engine/constants';
import jobsData from '../../data/jobs.json';

const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
    <h3 className="font-display font-bold text-[13px]" style={{ color: 'var(--ink)' }}>{children}</h3>
    {right}
  </div>
);

const SalaryTransparencyView = ({ player, economy }) => {
  const sorted = [...jobsData].sort((a, b) => b.wage - a.wage);
  return (
    <div className="space-y-1">
      {sorted.map(job => {
        const isCurrent = player.job?.id === job.id;
        const { canApply: qualified } = checkJobRequirements(player, job);
        return (
          <div
            key={job.id}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px]"
            style={{
              background: isCurrent ? 'rgba(16,168,118,0.08)' : qualified ? 'var(--surface)' : 'var(--surface-2)',
              border: `1px solid ${isCurrent ? 'rgba(16,168,118,0.35)' : 'var(--border)'}`,
              opacity: !isCurrent && !qualified ? 0.6 : 1,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[14px] opacity-70">{LOCATIONS_CONFIG[job.location]?.emoji}</span>
              <div className="min-w-0">
                <div className="font-display font-bold truncate" style={{ color: 'var(--ink)' }}>
                  {job.title}
                  {isCurrent && <span className="ml-1 text-[9px] font-num" style={{ color: 'var(--money-ink)' }}>· you</span>}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {LIBRARY_LOCATION_GROUPS.find(g => g.id === job.location)?.label ?? job.location.replace(/_/g, ' ')}
                  {job.remote ? ' · WFH' : ''}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="font-num font-bold" style={{ color: 'var(--money-ink)' }}>${effectiveWage(job.wage, economy)}/hr</div>
              <div className="text-[9px] font-num" style={{ color: 'var(--muted-2)' }}>${Math.floor(effectiveWage(job.wage, economy) * 8)}/shift</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ToggleBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="px-2 py-1 rounded-md font-display text-[10px] font-bold transition"
    style={{
      background: active ? 'var(--ink)' : 'var(--surface-2)',
      color: active ? '#fff' : 'var(--muted)',
      border: '1px solid var(--border)',
    }}
  >
    {children}
  </button>
);

const LibraryContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTradeEmployee = player.job?.type === 'trade';
  const tradePerk = CAREER_PERKS.public_library;
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [viewMode, setViewMode] = useState('browse');

  const locationJobs = selectedLocation ? jobsData.filter(j => j.location === selectedLocation.id) : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      {/* Left: Job board */}
      <div className="flex flex-col">
        {!selectedLocation ? (
          <>
            <SectionTitle
              right={
                <div className="flex gap-1">
                  <ToggleBtn active={viewMode === 'browse'} onClick={() => setViewMode('browse')}>By location</ToggleBtn>
                  <ToggleBtn active={viewMode === 'salary'} onClick={() => setViewMode('salary')}>By pay</ToggleBtn>
                </div>
              }
            >
              📋 Job board
            </SectionTitle>

            {viewMode === 'salary' && (
              <div className="max-h-64 sm:max-h-none sm:flex-grow overflow-y-auto">
                <SalaryTransparencyView player={player} economy={economy} />
              </div>
            )}

            {viewMode === 'browse' && (
              <div className="max-h-72 sm:max-h-none sm:flex-grow overflow-y-auto space-y-1.5">
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
                      className="w-full text-left p-2.5 rounded-xl transition active:scale-[0.99]"
                      style={{
                        background: isCurrentWorkplace ? 'rgba(16,168,118,0.08)' : 'var(--surface)',
                        border: `1px solid ${isCurrentWorkplace ? 'rgba(16,168,118,0.4)' : 'var(--border)'}`,
                        boxShadow: 'var(--sh-1)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">{loc.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-display font-bold text-[12px] flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--ink)' }}>
                              {loc.label}
                              {isCurrentWorkplace && <span className="ds-pill ds-pill-money" style={{ padding: '1px 6px', fontSize: 9 }}>employer</span>}
                              {isRemote && <span className="ds-pill ds-pill-accent" style={{ padding: '1px 6px', fontSize: 9 }}>WFH</span>}
                            </div>
                            {entryCount > 0 && (
                              <div className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--money-ink)' }}>
                                {entryCount} entry-level opening{entryCount !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-[10px] font-num" style={{ color: 'var(--muted)' }}>{jobs.length} {jobs.length === 1 ? 'role' : 'roles'}</div>
                          <div className="text-[16px] leading-none" style={{ color: 'var(--muted-2)' }}>›</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setSelectedLocation(null)} className="text-lg leading-none font-bold" style={{ color: 'var(--muted-2)' }}>‹</button>
              <span className="text-lg">{selectedLocation.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-[13px] leading-tight" style={{ color: 'var(--ink)' }}>{selectedLocation.label}</h3>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{locationJobs.length} position{locationJobs.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="max-h-72 sm:max-h-none sm:flex-grow overflow-y-auto space-y-2">
              {locationJobs.map(job => {
                const { meetsExp, meetsEdu, meetsDep, meetsItem, canApply } = checkJobRequirements(player, job);
                const isCurrent = player.job?.id === job.id;
                const isEntry = isEntryLevel(job);
                const diff = difficultyLabel(job.rejectionChance);
                const reqPill = (label, ok) => (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                    style={{
                      background: ok ? 'rgba(16,168,118,0.12)' : 'rgba(228,65,58,0.1)',
                      color: ok ? 'var(--money-ink)' : 'var(--debt-ink)',
                      border: `1px solid ${ok ? 'rgba(16,168,118,0.3)' : 'rgba(228,65,58,0.3)'}`,
                    }}
                  >{label}</span>
                );
                return (
                  <div
                    key={job.id}
                    className="rounded-xl p-2.5"
                    style={{
                      background: isCurrent ? 'rgba(16,168,118,0.08)' : 'var(--surface)',
                      border: `1px solid ${isCurrent ? 'rgba(16,168,118,0.4)' : 'var(--border)'}`,
                      boxShadow: isCurrent ? 'none' : 'var(--sh-1)',
                    }}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="min-w-0">
                        <div className="font-display font-bold text-[12px] flex items-center gap-1 flex-wrap" style={{ color: 'var(--ink)' }}>
                          {job.title}
                          {isCurrent && <span className="ds-pill ds-pill-money" style={{ padding: '1px 6px', fontSize: 9 }}>current</span>}
                          {job.remote && <span className="ds-pill ds-pill-accent" style={{ padding: '1px 6px', fontSize: 9 }}>remote</span>}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{job.description}</div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-num font-bold text-[14px]" style={{ color: 'var(--money-ink)' }}>${job.wage}/hr</div>
                        <span className={`text-[9px] px-1 rounded ${diff.colorClass}`}>{diff.text}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {isEntry ? (
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--money-ink)' }}>✓ Open to everyone</span>
                      ) : (
                        <>
                          {job.requirements?.education && reqPill(`🎓 ${job.requirements.education}`, meetsEdu)}
                          {job.requirements?.experience && reqPill(`⏱ ${job.requirements.experience}wks`, meetsExp)}
                          {job.requirements?.dependability && reqPill(`🎯 ${job.requirements.dependability} dep`, meetsDep)}
                          {job.requirements?.item && reqPill(`📦 ${job.requirements.item.replace(/_/g, ' ')}`, meetsItem)}
                        </>
                      )}
                    </div>
                    {isCurrent ? (
                      <div className="text-[11px] text-center font-semibold py-1" style={{ color: 'var(--money-ink)' }}>✓ Currently employed</div>
                    ) : (
                      <button
                        onClick={() => actions.applyForJob(job)}
                        disabled={player.timeRemaining < 2}
                        className={canApply ? 'ds-btn ds-btn-dark w-full' : 'ds-btn w-full'}
                        style={{ minHeight: 44 }}
                      >
                        {canApply ? '📋 Apply · 2h' : '🚫 Apply anyway · likely rejected'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right: Trade dispatch + career tracks + books */}
      <div className="flex flex-col gap-3 sm:overflow-y-auto sm:max-h-full">
        <div>
          <SectionTitle right={<EconomyWageBadge economy={state.economy} />}>🔧 Trade dispatch</SectionTitle>
          {isTradeEmployee && (
            <div
              className="rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-2 mb-2"
              style={{
                background: 'rgba(244,184,42,0.12)',
                border: '1px solid rgba(244,184,42,0.4)',
                color: 'var(--warn-ink)',
              }}
            >
              <span>{tradePerk.icon}</span>
              <span className="font-bold">{tradePerk.label}:</span>
              <span>{tradePerk.desc}</span>
            </div>
          )}
          {isTradeEmployee ? (
            <WorkShiftPanel
              player={player}
              economy={state.economy}
              actions={actions}
              partClass=""
              fullClass=""
              partLabel="⏱ Half · 4h"
              fullLabel="🔧 Site · 8h"
            />
          ) : (
            <div className="text-[11px] italic p-2 rounded" style={{ color: 'var(--muted)', background: 'var(--surface-2)' }}>
              Trade workers (electricians, plumbers, laborers) pick up dispatch jobs here.
            </div>
          )}
        </div>

        {!isTradeEmployee && (
          <div>
            <SectionTitle>🗺️ Career tracks</SectionTitle>
            <div className="space-y-2">
              {CAREER_TRACKS.slice(0, 4).map((track, ti) => {
                const entryJob = jobsData.find(j => j.id === track.jobs[0]);
                const canEnter = entryJob && (!entryJob.requirements?.education || meetsEducation(player.education, entryJob.requirements.education));
                return (
                  <div
                    key={ti}
                    className="rounded-lg p-2"
                    style={{
                      background: canEnter ? 'rgba(16,168,118,0.06)' : 'var(--surface-2)',
                      border: `1px solid ${canEnter ? 'rgba(16,168,118,0.3)' : 'var(--border)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[11px] font-display font-bold" style={{ color: 'var(--ink)' }}>{track.label}</div>
                      {canEnter
                        ? <span className="ds-pill ds-pill-money" style={{ padding: '1px 6px', fontSize: 9 }}>Eligible</span>
                        : <span className="ds-pill" style={{ padding: '1px 6px', fontSize: 9 }}>Locked</span>}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {track.jobs.map((jobId, i) => {
                        const job = jobsData.find(j => j.id === jobId);
                        if (!job) return null;
                        const isCurrent = player.job?.id === jobId;
                        return (
                          <React.Fragment key={jobId}>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-display font-bold font-num"
                              style={{
                                background: isCurrent ? 'var(--money)' : 'var(--surface)',
                                color: isCurrent ? '#fff' : 'var(--ink-2)',
                                border: `1px solid ${isCurrent ? 'var(--money)' : 'var(--border)'}`,
                              }}
                            >
                              {job.title} <span style={{ opacity: 0.7 }}>${job.wage}</span>
                            </span>
                            {i < track.jobs.length - 1 && <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>→</span>}
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

        <div>
          <SectionTitle>📖 Read a book · 2h</SectionTitle>
          <div className="space-y-2">
            {[
              { title: 'The Great Novel',      emoji: '📕', genre: 'Fiction',    hours: 2, happinessGain: 8,  relaxGain: 5, depGain: 0, desc: 'Escape into a story.' },
              { title: 'Think & Grow Rich',    emoji: '📗', genre: 'Self-Help',  hours: 2, happinessGain: 4,  relaxGain: 0, depGain: 3, desc: '+happiness, +dependability' },
              { title: 'How Things Work',      emoji: '📘', genre: 'Technical',  hours: 2, happinessGain: 3,  relaxGain: 0, depGain: 2, desc: 'You feel smarter.' },
              { title: 'Travel & Adventures',  emoji: '📙', genre: 'Travel',     hours: 2, happinessGain: 10, relaxGain: 8, depGain: 0, desc: 'Best happiness boost.' },
            ].map(book => (
              <button
                key={book.title}
                onClick={() => actions.readBook(book)}
                disabled={player.timeRemaining < book.hours}
                className="w-full text-left p-2.5 rounded-xl transition active:scale-[0.99] disabled:opacity-40"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-1)' }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{book.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-[12px]" style={{ color: 'var(--ink)' }}>{book.title}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{book.desc}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {book.happinessGain > 0 && <span className="ds-pill ds-pill-warn" style={{ padding: '1px 6px', fontSize: 9 }}>+{book.happinessGain} 😊</span>}
                      {book.relaxGain > 0 && <span className="ds-pill ds-pill-money" style={{ padding: '1px 6px', fontSize: 9 }}>+{book.relaxGain} relax</span>}
                      {book.depGain > 0 && <span className="ds-pill ds-pill-info" style={{ padding: '1px 6px', fontSize: 9 }}>+{book.depGain} dep</span>}
                    </div>
                  </div>
                  <span className="text-[10px] font-num shrink-0" style={{ color: 'var(--muted-2)' }}>{book.hours}h</span>
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
