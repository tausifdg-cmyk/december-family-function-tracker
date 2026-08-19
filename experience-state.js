(function(){
'use strict';
const Store=window.MyBodyStore;if(!Store)return;
function current(){const state=Store.read(),date=Store.localDate(),experience=window.MyBodyExperience,coach=window.MyBodyCoach;const action=experience?.nextAction?.(date)||{title:'Keep logging',body:'MYBODY is learning your routine.',action:'today',label:'Continue'};const readiness=state.profile?.coach?.readiness?.[date]||null;const plan=state.profile?.coach?.plan||null;const phase3=state.profile?.phase3||{};const weekly=state.profile?.phase4?.lastDecision||null;return Object.freeze({date,plan,readiness,action,recovery:{lighterWeek:Boolean(phase3.deloadActive),busyDay:Boolean(phase3.minimumDays?.[date])},targets:{calories:state.config?.calories,protein:state.config?.protein,steps:state.config?.steps,water:state.config?.water},weekly,confidence:plan?(experience?.sevenDayScore?.()>0?'growing':'learning'):'setup'});}
function emit(){window.dispatchEvent(new CustomEvent('mybody:coach-state',{detail:current()}))}
window.addEventListener('mybody:state',()=>setTimeout(emit,60));
document.addEventListener('DOMContentLoaded',emit);
window.MyBodyCoachState=Object.freeze({current});
})();