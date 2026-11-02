import React from 'react';
import { Check } from 'lucide-react';

export const TaskModalAssigneeSelector = ({
  assignedTo = [],
  setAssignedTo,
  members = [],
  lang,
  t,
}) => {
  const allMemberIds = members
    .map((m) => (m.id || m._id || m.userId?._id || m.userId)?.toString())
    .filter(Boolean);

  const handleToggleSelectAll = () => {
    setAssignedTo((prev) =>
      prev.length === allMemberIds.length ? [] : allMemberIds
    );
  };

  const handleToggleMember = (mId) => {
    setAssignedTo((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          {t('assigneeLabel')} ({assignedTo.length})
        </label>
        {members.length > 0 && (
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold hover:underline cursor-pointer"
          >
            {assignedTo.length === members.length
              ? lang === 'fa'
                ? 'حذف همه'
                : 'Clear all'
              : lang === 'fa'
              ? 'انتخاب همه'
              : 'Select all'}
          </button>
        )}
      </div>

      {/* Multi-Assignee Selection List */}
      <div className="p-2 rounded-xl glass-input max-h-36 overflow-y-auto space-y-1">
        {members.length === 0 ? (
          <p className="text-[11px] text-slate-400 p-2 text-center">
            {lang === 'fa' ? 'عضوی در این سازمان یافت نشد' : 'No members found'}
          </p>
        ) : (
          members.map((m) => {
            const mId = (m.id || m._id || m.userId?._id || m.userId)?.toString();
            const mName = m.name || m.userId?.name || 'Member';
            const mRole = m.role || 'member';
            const isSelected = assignedTo.includes(mId);

            return (
              <button
                key={mId}
                type="button"
                onClick={() => handleToggleMember(mId)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold border border-brand-500/30'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-5 h-5 rounded-md bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {mName[0]?.toUpperCase()}
                  </div>
                  <span className="truncate">{mName}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                    {mRole}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

