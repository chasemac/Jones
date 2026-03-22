import React from 'react';
import { adjustedPrice } from '../../engine/economyModel';
import { meetsEducation } from '../../engine/constants';
import itemsData from '../../data/items.json';
import educationData from '../../data/education.json';
import jobsData from '../../data/jobs.json';

// Map each degree to jobs it unlocks (by exact education requirement match)
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
      {player.currentCourse ? (
        <div className="bg-blue-600 text-white p-3 rounded-xl shadow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] uppercase font-bold opacity-70 tracking-wide">Currently Enrolled</div>
              <div className="font-black text-sm">{player.currentCourse.title}</div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-70">{player.currentCourse.progress}/{player.currentCourse.totalHours} hrs</div>
              <div className="text-xs font-bold">{Math.round((player.currentCourse.progress / player.currentCourse.totalHours) * 100)}%</div>
            </div>
          </div>
          <div className="w-full bg-blue-800 h-3 rounded-full overflow-hidden mb-2">
            <div className="bg-yellow-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${(player.currentCourse.progress / player.currentCourse.totalHours) * 100}%` }} />
          </div>
          {studyBonus > 0 && (
            <div className="text-[10px] text-blue-200 mb-1">📚 Study bonus active: +{studyBonus}h/session</div>
          )}
          <button
            onClick={actions.study}
            disabled={player.timeRemaining < 10}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black py-2 rounded-lg disabled:opacity-50 text-sm transition active:scale-95 min-h-[44px]"
          >
            📖 Study {10 + studyBonus}hrs
            <span className="text-xs font-normal ml-1">({player.timeRemaining}h left this week)</span>
          </button>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <div className="font-bold mb-1">🎓 Currently: {player.education}</div>
          <div className="text-slate-500">Enroll in a course below to advance your education.</div>
        </div>
      )}

      {player.currentCourse && !ownsTextbook && !player.inventory.some(i => i.id === 'laptop') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800">
          💡 <strong>Study faster!</strong> A Textbook (+2h/session) from here or a Laptop (+3h/session) from Tech Store will speed up your degree.
        </div>
      )}
      {!ownsTextbook && (
        <button
          onClick={() => actions.buyItem({ ...textbook, cost: textbookPrice })}
          disabled={player.money < textbookPrice}
          className="w-full flex justify-between items-center p-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 text-xs transition"
        >
          <div>
            <div className="font-bold">📚 Buy Textbook <span className="text-green-600 font-normal">(saves time!)</span></div>
            <div className="text-slate-500">+2hrs per study session</div>
          </div>
          <span className="font-mono font-bold">${textbookPrice}</span>
        </button>
      )}

      <div className="flex-grow overflow-y-auto space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Available Courses</div>
          {studyBonus > 0 && <div className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">📚 +{studyBonus}h/session</div>}
        </div>
        {educationData.map(course => {
          const eduReq = course.requirements?.education;
          const itemReq = course.requirements?.item;
          const eduOk = !eduReq || meetsEducation(player.education, eduReq);
          const itemOk = !itemReq || player.inventory.some(i => i.id === itemReq);
          const canEnroll = eduOk && itemOk;
          const alreadyDone = meetsEducation(player.education, course.degree);
          const isActive = player.currentCourse?.id === course.id;
          const courseStudyBonus = player.inventory.reduce((sum, item) => sum + (item.studyBonus || 0), 0);
          const hrsPerSession = 10 + courseStudyBonus;
          const sessionsNeeded = Math.ceil(course.totalHours / hrsPerSession);
          const canAfford = player.money >= course.cost;
          return (
            <button
              key={course.id}
              onClick={() => canEnroll && !alreadyDone && !player.currentCourse && canAfford && actions.enroll(course)}
              disabled={!canEnroll || alreadyDone || !!player.currentCourse || !canAfford}
              className={`w-full flex justify-between items-start p-2.5 border-2 rounded-xl text-xs transition active:scale-[0.99]
                ${alreadyDone ? 'bg-green-50 border-green-200' :
                  isActive ? 'bg-blue-50 border-blue-400' :
                  canEnroll && !player.currentCourse && canAfford ? 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer' :
                  'bg-slate-50 border-slate-100 opacity-50'}`}
            >
              <div className="text-left flex-1 min-w-0">
                <div className="font-bold flex items-center gap-1 flex-wrap">
                  <span>{alreadyDone ? '✅' : isActive ? '📖' : !canEnroll ? '🔒' : '🎓'}</span>
                  <span className="truncate">{course.title}</span>
                  <span className="text-blue-600 font-normal text-[9px] bg-blue-100 px-1 rounded">→ {course.degree}</span>
                </div>
                <div className="text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                  <span>{course.totalHours}h total</span>
                  {!alreadyDone && !isActive && <span className="text-blue-600">~{sessionsNeeded} sessions</span>}
                  {eduReq && !eduOk ? <span className="text-red-500">Need {eduReq}</span> : ''}
                  {itemReq && !itemOk ? <span className="text-red-500">Need {itemReq.replace(/_/g, ' ')}</span> : ''}
                  {!canAfford && !alreadyDone ? <span className="text-red-500">Need ${(course.cost - player.money).toFixed(0)} more</span> : ''}
                </div>
                {degreeUnlocks[course.degree] && (
                  <div className="text-[9px] text-emerald-600 font-bold mt-0.5 line-clamp-2">
                    → Unlocks: {degreeUnlocks[course.degree].join(', ')}
                  </div>
                )}
              </div>
              <div className="ml-2 shrink-0 text-right">
                <div className="font-mono font-bold text-slate-700">${course.cost}</div>
                {!alreadyDone && course.totalHours > 0 && (
                  <div className="text-[8px] text-slate-400">${(course.cost / course.totalHours).toFixed(0)}/hr</div>
                )}
                {!alreadyDone && !isActive && canEnroll && canAfford && (
                  <div className="text-[9px] text-green-600 font-bold mt-0.5">Enroll →</div>
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
