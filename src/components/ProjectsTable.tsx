import { useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api, type ProjectEntry } from '../lib/api';
import {
  formatCompactProjectMetric,
  formatProjectMetric,
  matchesProjectSearch,
  projectLabel,
  projectTotals,
  sortProjects,
  type ProjectSort,
} from '../lib/project-chart';
import { ProjectChart } from './ProjectChart';
import { ProjectDetails } from './ProjectDetails';

const sortOptions: Array<{ value: ProjectSort; label: string }> = [
  { value: 'cost', label: 'Cost' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'name', label: 'Name A to Z' },
];

const PROJECT_PAGE_SIZE = 24;

function DataCell({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 border-t border-[#1B1B1B] pt-2 first:border-t-0 sm:border-l sm:border-t-0 sm:px-3 sm:first:pl-0">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66645F]">{label}</dt>
      <dd className={`mt-1 min-w-0 break-words font-mono text-sm font-semibold tabular-nums [overflow-wrap:anywhere] ${emphasis ? 'text-[#BC1010]' : 'text-[#111111]'}`}>
        {value}
      </dd>
    </div>
  );
}

function ProjectSummaryCard({
  project,
  expanded,
  onToggle,
}: {
  project: ProjectEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailsId = `project-details-${encodeURIComponent(project.cwd)}`;
  const visibleSources = project.sources.slice(0, 3);
  const hiddenSourceCount = project.sources.length - visibleSources.length;

  return (
    <li className="border border-[#1B1B1B] bg-[#F4F4F0]">
      <article>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={onToggle}
          className="group block min-h-11 w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#BC1010]"
        >
          <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-6">
            <div className="min-w-0">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center border border-[#1B1B1B] font-mono text-lg leading-none transition-colors ${expanded ? 'bg-[#BC1010] text-[#F4F4F0]' : 'bg-[#DEDDD7] text-[#111111] group-hover:bg-[#BC1010] group-hover:text-[#F4F4F0]'}`}
                >
                  {expanded ? '−' : '+'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BC1010]">Project unit</span>
                  <span className="mt-1 block break-words text-xl font-black leading-none tracking-[-0.045em] text-[#111111] [overflow-wrap:anywhere] sm:text-2xl">
                    {projectLabel(project.cwd)}
                  </span>
                  <span className="mt-3 block break-words font-mono text-[11px] leading-4 text-[#66645F] [overflow-wrap:anywhere]">
                    {project.cwd || '(no project path)'}
                  </span>
                </span>
              </div>
              <div className="mt-4 flex min-h-6 flex-wrap gap-1.5 border-t border-[#1B1B1B] pt-3">
                {visibleSources.length ? visibleSources.map(source => (
                  <span key={source} className="border border-[#1B1B1B] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#111111]">
                    {source}
                  </span>
                )) : <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#66645F]">Harness unknown</span>}
                {hiddenSourceCount > 0 && (
                  <span className="border border-[#1B1B1B] bg-[#DEDDD7] px-2 py-1 font-mono text-[10px] font-semibold text-[#111111]">+{hiddenSourceCount}</span>
                )}
              </div>
            </div>

            <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 border-t border-[#1B1B1B] pt-3 sm:grid-cols-4 sm:gap-x-0 sm:border-t-0 sm:pt-0 lg:items-start">
              <DataCell label="USD" value={formatProjectMetric(project.cost, 'usd')} emphasis />
              <DataCell label="Tokens" value={formatCompactProjectMetric(project.tokens, 'tokens')} />
              <DataCell label="Sessions" value={project.sessions.toLocaleString('en-US')} />
              <DataCell label="State" value={expanded ? 'Open' : 'Closed'} />
            </dl>
          </div>
          <span className="flex min-h-11 items-center border-t border-[#1B1B1B] px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66645F] sm:px-5">
            {expanded ? 'Close breakdown' : 'Open breakdown'}
          </span>
        </button>

        {expanded && <ProjectDetails id={detailsId} project={project} />}
      </article>
    </li>
  );
}

function ProjectsLoading() {
  return (
    <div className="border border-[#1B1B1B]" aria-label="Loading projects" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid animate-pulse gap-3 border-t border-[#1B1B1B] p-4 first:border-t-0 sm:grid-cols-[1.1fr_0.9fr] sm:p-5">
          <div className="h-14 bg-[#DEDDD7]" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, statIndex) => <div key={statIndex} className="h-14 bg-[#DEDDD7]" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProjectsTableProps {
  refreshKey?: number;
}

export function ProjectsTable({ refreshKey = 0 }: ProjectsTableProps) {
  const { data, loading, error, refetch } = useApi(() => api.getProjects(), [refreshKey]);
  const [expandedCwd, setExpandedCwd] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ProjectSort>('cost');
  const [visibleCount, setVisibleCount] = useState(PROJECT_PAGE_SIZE);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const browserHeadingRef = useRef<HTMLHeadingElement>(null);
  const totals = useMemo(() => projectTotals(data || []), [data]);
  const projects = useMemo(() => sortProjects(
    (data || []).filter(project => matchesProjectSearch(project, query)),
    sort,
  ), [data, query, sort]);
  const visibleProjects = projects.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PROJECT_PAGE_SIZE);
    setExpandedCwd(null);
  }, [query, sort]);

  const clearSearch = () => {
    setQuery('');
    searchInputRef.current?.focus();
  };

  const loadMore = () => {
    const nextCount = Math.min(visibleCount + PROJECT_PAGE_SIZE, projects.length);
    setVisibleCount(nextCount);
    if (nextCount === projects.length) requestAnimationFrame(() => browserHeadingRef.current?.focus());
  };

  return (
    <div className="-mx-3 -my-4 min-w-0 bg-[#F4F4F0] px-3 py-6 text-[#111111] sm:-mx-6 sm:-my-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-t-[3px] border-[#111111] pt-3">
          <div className="flex items-start justify-between gap-4 border-b border-[#1B1B1B] pb-5">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#BC1010]">Harness analyzer / project register</p>
              <h2 id="projects-heading" className="mt-2 text-[clamp(3rem,15vw,8.5rem)] font-black uppercase leading-[0.78] tracking-[-0.075em] text-[#111111]">Projects</h2>
            </div>
            {!loading && data && (
              <p className="border border-[#1B1B1B] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#111111]">
                {totals.projects.toLocaleString('en-US')} units
              </p>
            )}
          </div>
        </header>

        <section aria-labelledby="projects-heading" className="grid border-b border-[#1B1B1B] lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
          <div className="min-w-0 py-5 lg:border-r lg:border-[#1B1B1B] lg:pr-6 lg:py-7">
            <p className="max-w-xl text-sm leading-6 text-[#66645F]">Cost, token volume, model mix and harness mix for every recorded working directory.</p>
            <dl className="mt-6 grid grid-cols-2 border-l border-t border-[#1B1B1B] sm:grid-cols-4">
              <div className="min-w-0 border-b border-r border-[#1B1B1B] p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66645F]">Projects</dt>
                <dd className="mt-2 font-mono text-xl font-bold tabular-nums text-[#111111]">{!data ? '...' : totals.projects.toLocaleString('en-US')}</dd>
              </div>
              <div className="min-w-0 border-b border-r border-[#1B1B1B] p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66645F]">USD</dt>
                <dd className="mt-2 break-words font-mono text-xl font-bold tabular-nums text-[#BC1010] [overflow-wrap:anywhere]">{!data ? '...' : formatProjectMetric(totals.cost, 'usd')}</dd>
              </div>
              <div className="min-w-0 border-b border-r border-[#1B1B1B] p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66645F]">Tokens</dt>
                <dd title={data ? formatProjectMetric(totals.tokens, 'tokens') : undefined} className="mt-2 break-words font-mono text-lg font-bold tabular-nums text-[#111111] [overflow-wrap:anywhere]">{!data ? '...' : formatCompactProjectMetric(totals.tokens, 'tokens')}</dd>
              </div>
              <div className="min-w-0 border-b border-r border-[#1B1B1B] p-3">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#66645F]">Sessions</dt>
                <dd className="mt-2 font-mono text-xl font-bold tabular-nums text-[#111111]">{!data ? '...' : totals.sessions.toLocaleString('en-US')}</dd>
              </div>
            </dl>
          </div>
          <div className="min-w-0 py-5 lg:py-7 lg:pl-6">
            <ProjectChart data={data} loading={loading} />
          </div>
        </section>

        <section aria-labelledby="project-browser-heading" className="pt-6 sm:pt-8">
          <div className="border-y-[3px] border-[#111111] py-3 sm:flex sm:items-end sm:justify-between sm:gap-6">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#BC1010]">Directory index</p>
              <h3 ref={browserHeadingRef} id="project-browser-heading" tabIndex={-1} className="mt-1 text-2xl font-black uppercase tracking-[-0.045em] text-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#BC1010]">
                {loading ? 'Loading' : `${projects.length.toLocaleString('en-US')} / ${totals.projects.toLocaleString('en-US')} projects`}
              </h3>
            </div>
            <p className="mt-2 max-w-sm font-mono text-[10px] uppercase tracking-[0.08em] text-[#66645F] sm:mt-0 sm:text-right">Select a unit to inspect model and harness distribution.</p>
          </div>

          <div className="grid gap-0 border-b border-[#1B1B1B] py-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:gap-3">
            <div className="relative min-w-0 border border-[#1B1B1B] bg-[#F4F4F0]">
              <label className="sr-only" htmlFor="project-search">Search projects</label>
              <input
                id="project-search"
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search path, model or harness"
                className="min-h-11 w-full appearance-none bg-transparent px-3 pr-12 font-mono text-sm text-[#111111] outline-none placeholder:text-[#66645F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]"
              />
              {query && (
                <button type="button" aria-label="Clear project search" onClick={clearSearch} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center border-l border-[#1B1B1B] bg-[#DEDDD7] font-mono text-lg text-[#111111] hover:bg-[#BC1010] hover:text-[#F4F4F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]">×</button>
              )}
            </div>
            <div className="mt-3 min-w-0 sm:mt-0">
              <label className="sr-only" htmlFor="project-sort">Sort projects</label>
              <select id="project-sort" value={sort} onChange={event => setSort(event.target.value as ProjectSort)} className="min-h-11 w-full border border-[#1B1B1B] bg-[#F4F4F0] px-3 font-mono text-sm text-[#111111] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#BC1010]">
                {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 sm:pt-5">
            {loading ? <ProjectsLoading /> : error ? (
              <div role="alert" className="border border-[#1B1B1B] p-5 sm:p-7">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#BC1010]">Data unavailable</p>
                <p className="mt-2 text-lg font-bold text-[#111111]">Project index could not be loaded.</p>
                <p className="mt-1 font-mono text-xs text-[#66645F]">{error}</p>
                <button type="button" onClick={refetch} className="mt-5 min-h-11 border border-[#1B1B1B] bg-[#BC1010] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#F4F4F0] hover:bg-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BC1010]">Retry</button>
              </div>
            ) : projects.length === 0 ? (
              <div className="border border-[#1B1B1B] p-5 sm:p-7">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#BC1010]">No matching unit</p>
                <p className="mt-2 text-lg font-bold text-[#111111]">{query ? 'No project matches this search.' : 'No project usage recorded.'}</p>
                {query && <button type="button" onClick={clearSearch} className="mt-5 min-h-11 border border-[#1B1B1B] bg-[#BC1010] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#F4F4F0] hover:bg-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BC1010]">Clear search</button>}
              </div>
            ) : (
              <ul className="space-y-3 sm:space-y-4" aria-label="Projects">
                {visibleProjects.map(project => (
                  <ProjectSummaryCard key={project.cwd} project={project} expanded={expandedCwd === project.cwd} onToggle={() => setExpandedCwd(current => current === project.cwd ? null : project.cwd)} />
                ))}
              </ul>
            )}

            {projects.length > visibleProjects.length && (
              <div className="mt-5 border-t-[3px] border-[#111111] pt-3">
                <button type="button" onClick={loadMore} className="min-h-11 border border-[#1B1B1B] bg-[#111111] px-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#F4F4F0] hover:bg-[#BC1010] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BC1010]">
                  Load {Math.min(PROJECT_PAGE_SIZE, projects.length - visibleProjects.length)} more units
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
