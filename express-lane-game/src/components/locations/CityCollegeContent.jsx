import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { meetsEducation, STUDY_SESSION_HOURS } from '../../engine/constants';
import itemsData from '../../data/items.json';
import educationData from '../../data/education.json';
import jobsData from '../../data/jobs.json';

const degreeUnlocks = {};
jobsData.forEach(job => {
  const req = job.requirements?.education;
  if (req) {
    if (!degreeUnlocks[req]) degreeUnlocks[req] = [];
    degreeUnlocks[req].push(job.title);
  }
});

const CityCollegeContent = ({ state, actions }) => {
  const { player, economy } = state;
  const studyBonus = player.inventory.reduce((sum, item) => sum + (item.studyBonus || 0), 0);
  const textbook = itemsData.find(i => i.id === 'textbook');
  const textbookPrice = adjustedPrice(textbook.cost, economy);
  const ownsTextbook = player.inventory.some(i => i.id === 'textbook');

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Active enrollment card or status */}
      {player.currentCourse ? (
        <div
          className="p-3 rounded-xl"
          style={{ background: 'var(--ink)', color: '#fff', boxShadow: 'var(--sh-2)' }}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] uppercase font-display font-bold tracking-wider" style={{ opacity: 0.7 }}>Currently enrolled</div>
              <div className="font-display font-bold text-[14px]">{player.currentCourse.title}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-num" style={{ opacity: 0.7 }}>{player.currentCourse.progress}/{player.currentCourse.totalHours} hrs</div>
              <div className="text-[12px] font-num font-bold">{Math.round((player.currentCourse.progress / player.currentCourse.totalHours) * 100)}%</div>
            </div>
          </div>
          <div className="w-full rounded-full overflow-hidden mb-2" style={{ height: 8, background: 'rgba(255,255,255,0.18)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(player.currentCourse.progress / player.currentCourse.totalHours) * 100}%`,
                background: 'var(--warn)',
              }}
            />
          </div>
          {studyBonus > 0 && (
            <div className="text-[10px] mb-1" style={{ opacity: 0.8 }}>📚 Study bonus active: +{studyBonus}h/session</div>
          )}
          <button
            onClick={actions.study}
            disabled={player.timeRemaining < 10}
            className="w-full font-display font-bold py-2 rounded-lg disabled:opacity-50 text-[13px] transition active:scale-[0.99]"
            style={{ background: 'var(--warn)', color: 'var(--ink)', minHeight: 44 }}
          >
            📖 Study {STUDY_SESSION_HOURS + studyBonus}h
            <span className="ml-1 text-[11px] font-normal" style={{ opacity: 0.7 }}>({player.timeRemaining}h left)</span>
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl p-3 text-[12px]"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <div className="font-display font-bold mb-1" style={{ color: '#1d4ed8' }}>🎓 Currently: {player.education}</div>
          <div style={{ color: 'var(--muted)' }}>Enroll in a course below to advance your education.</div>
        </div>
      )}

      {player.currentCourse && !ownsTextbook && !player.inventory.some(i => i.id === 'laptop') && (
        <div
          className="rounded-lg p-2 text-[11px]"
          style={{ background: 'rgba(244,184,42,0.1)', border: '1px solid rgba(244,184,42,0.35)', color: 'var(--warn-ink)' }}
        >
          💡 <strong>Study faster!</strong> A Textbook (+2h/session) or Laptop (+3h/session) speeds up your degree.
        </div>
      )}

      {!ownsTextbook && (
        <button
          onClick={() => actions.buyItem({ ...textbook, cost: textbookPrice })}
          disabled={player.money < textbookPrice}
          className="w-full flex justify-between items-center p-2 rounded-lg disabled:opacity-50 text-[12px] transition active:scale-[0.99]"
          style={{
            background: 'rgba(244,184,42,0.06)',
            border: '1px solid rgba(244,184,42,0.3)',
            minHeight: 44,
          }}
        >
          <div className="text-left">
            <div className="font-display font-bold" style={{ color: 'var(--ink)' }}>
              📚 Buy Textbook
              <span className="ml-1 text-[10px] font-normal" style={{ color: 'var(--money-ink)' }}>saves time</span>
            </div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>+2hrs per study session</div>
          </div>
          <span className="font-num font-bold" style={{ color: 'var(--ink)' }}>${textbookPrice}</span>
        </button>
      )}

      <div className="flex-grow overflow-y-auto space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <div className="ds-eyebrow">Available courses</div>
          {studyBonus > 0 && (
            <span className="ds-pill ds-pill-info" style={{ padding: '1px 6px', fontSize: 9 }}>📚 +{studyBonus}h/session</span>
          )}
        </div>

        {educationData.map(course => {
          const eduReq = course.requirements?.education;
          const itemReq = course.requirements?.item;
          const eduOk = !eduReq || meetsEducation(player.education, eduReq);
          const itemOk = !itemReq || player.inventory.some(i => i.id === itemReq);
          const canEnroll = eduOk && itemOk;
          const alreadyDone = meetsEducation(player.education, course.degree);
          const isActive = player.currentCourse?.id === course.id;
          const hrsPerSession = STUDY_SESSION_HOURS + studyBonus;
          const sessionsNeeded = Math.ceil(course.totalHours / hrsPerSession);
          const canAfford = player.money >= course.cost;

          let bg = 'var(--surface)';
          let border = 'var(--border)';
          let opacity = 1;
          if (alreadyDone) { bg = 'rgba(16,168,118,0.06)'; border = 'rgba(16,168,118,0.3)'; }
          else if (isActive) { bg = 'rgba(59,130,246,0.06)'; border = 'rgba(59,130,246,0.4)'; }
          else if (!canEnroll || !canAfford || player.currentCourse) { bg = 'var(--surface-2)'; opacity = 0.55; }

          return (
            <button
              key={course.id}
              onClick={() => canEnroll && !alreadyDone && !player.currentCourse && canAfford && actions.enroll(course)}
              disabled={!canEnroll || alreadyDone || !!player.currentCourse || !canAfford}
              className="w-full flex justify-between items-start p-2.5 rounded-xl text-[12px] transition active:scale-[0.99]"
              style={{ background: bg, border: `1px solid ${border}`, opacity, boxShadow: opacity < 1 ? 'none' : 'var(--sh-1)' }}
            >
              <div className="text-left flex-1 min-w-0">
                <div className="font-display font-bold flex items-center gap-1 flex-wrap" style={{ color: 'var(--ink)' }}>
                  <span>{alreadyDone ? '✅' : isActive ? '📖' : !canEnroll ? '🔒' : '🎓'}</span>
                  <span className="truncate">{course.title}</span>
                  <span
                    className="font-normal text-[10px] px-1 rounded"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }}
                  >→ {course.degree}</span>
                </div>
                <div className="mt-0.5 flex gap-2 flex-wrap" style={{ color: 'var(--muted)' }}>
                  <span>{course.totalHours}h total</span>
                  {!alreadyDone && !isActive && <span style={{ color: '#1d4ed8' }}>~{sessionsNeeded} sessions</span>}
                  {eduReq && !eduOk && <span style={{ color: 'var(--debt-ink)' }}>Need {eduReq}</span>}
                  {itemReq && !itemOk && <span style={{ color: 'var(--debt-ink)' }}>Need {itemReq.replace(/_/g, ' ')}</span>}
                  {!canAfford && !alreadyDone && <span style={{ color: 'var(--debt-ink)' }}>Need ${(course.cost - player.money).toFixed(0)} more</span>}
                </div>
                {degreeUnlocks[course.degree] && (
                  <div className="text-[10px] font-display font-bold mt-0.5 line-clamp-2" style={{ color: 'var(--money-ink)' }}>
                    → Unlocks: {degreeUnlocks[course.degree].join(', ')}
                  </div>
                )}
              </div>
              <div className="ml-2 shrink-0 text-right">
                <div className="font-num font-bold" style={{ color: 'var(--ink)' }}>${course.cost}</div>
                {!alreadyDone && course.totalHours > 0 && (
                  <div className="text-[9px] font-num" style={{ color: 'var(--muted-2)' }}>${(course.cost / course.totalHours).toFixed(0)}/hr</div>
                )}
                {!alreadyDone && !isActive && canEnroll && canAfford && (
                  <div className="text-[10px] font-display font-bold mt-0.5" style={{ color: 'var(--money-ink)' }}>Enroll →</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CityCollegeContent;
