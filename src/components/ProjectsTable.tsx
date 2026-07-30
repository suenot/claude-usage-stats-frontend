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
  { value: 'cost', label: 'Highest cost' },
  { value: 'tokens', label: 'Most tokens' },
  { value: 'sessions', label: 'Most sessions' },
  { value: 'name', label: 'Name A–Z' },
];

const PROJECT_PAGE_SIZE = 24;

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
    <li>
      <article
        className="overflow-hidden rounded-2xl transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        style={{ background: 'var(--bg-card)', boxShadow: expanded ? '0 12px 32px rgba(8, 15, 32, 0.22)' : 'none' }}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={onToggle}
          className="group w-full p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-400 active:scale-[0.995] sm:p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg leading-none transition-transform duration-200 group-hover:bg-slate-700 group-aria-expanded:rotate-45"
              style={{ background: 'var(--bg-primary)', color: 'var(--accent-cyan)' }}
            >
              +
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold" title={projectLabel(project.cwd)} style={{ color: 'var(--text-primary)' }}>
                {projectLabel(project.cwd)}
              </span>
              <span className="mt-1 block break-words font-mono text-[11px] leading-4 [overflow-wrap:anywhere]" style={{ color: 'var(--text-secondary)' }}>
                {project.cwd || '(no project path)'}
              </span>
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>USD</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--accent-yellow)' }}>
                {formatProjectMetric(project.cost, 'usd')}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tokens</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--accent-cyan)' }} title={formatProjectMetric(project.tokens, 'tokens')}>
                {formatCompactProjectMetric(project.tokens, 'tokens')}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sessions</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {project.sessions.toLocaleString()}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>Harness</dt>
              <dd className="mt-1 flex min-h-5 flex-wrap gap-1">
                {visibleSources.length ? visibleSources.map(source => (
                  <span
                    key={source}
                    className="max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: 'rgba(96,165,250,0.12)', color: 'var(--accent-blue)' }}
                  >
                    {source}
                  </span>
                )) : <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Unknown</span>}
                {hiddenSourceCount > 0 && (
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                    +{hiddenSourceCount}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <span className="mt-4 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--accent-cyan)' }}>
            {expanded ? 'Hide breakdown' : 'Open breakdown'}
            <span aria-hidden="true" className="text-base leading-none">{expanded ? '−' : '→'}</span>
          </span>
        </button>

        {expanded && <ProjectDetails id={detailsId} project={project} />}
      </article>
    </li>
  );
}

function ProjectsLoading() {
  return (
    <div className="space-y-3" aria-label="Loading projects" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="animate-pulse rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)' }}>
          <div className="h-5 w-2/5 rounded" style={{ background: 'var(--bg-secondary)' }} />
          <div className="mt-3 h-3 w-4/5 rounded" style={{ background: 'var(--bg-secondary)' }} />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, statIndex) => <div key={statIndex} className="h-9 rounded" style={{ background: 'var(--bg-secondary)' }} />)}
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
    if (nextCount === projects.length) {
      requestAnimationFrame(() => browserHeadingRef.current?.focus());
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <section aria-labelledby="projects-heading" className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)] xl:items-stretch">
        <div className="rounded-2xl p-4 sm:p-5 lg:p-6" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--accent-cyan)' }}>Usage by project</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="projects-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>Projects</h2>
              <p className="mt-1 max-w-xl text-sm leading-5" style={{ color: 'var(--text-secondary)' }}>
                Compare cost and token use, then open a project to see its models and harnesses.
              </p>
            </div>
            {!loading && data && <span className="rounded-lg px-2.5 py-1 font-mono text-xs tabular-nums" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>{totals.projects} tracked</span>}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-primary)' }}>
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>Projects</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{!data ? '—' : totals.projects.toLocaleString()}</dd>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-primary)' }}>
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>USD</dt>
              <dd className="mt-1 truncate font-mono text-lg font-semibold tabular-nums" style={{ color: 'var(--accent-yellow)' }} title={formatProjectMetric(totals.cost, 'usd')}>{!data ? '—' : formatProjectMetric(totals.cost, 'usd')}</dd>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-primary)' }}>
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tokens</dt>
              <dd
                aria-label={data ? formatProjectMetric(totals.tokens, 'tokens') : undefined}
                className="mt-1 font-mono text-base font-semibold tabular-nums sm:text-lg"
                style={{ color: 'var(--accent-cyan)' }}
                title={formatProjectMetric(totals.tokens, 'tokens')}
              >
                {!data ? '—' : formatCompactProjectMetric(totals.tokens, 'tokens')}
              </dd>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-primary)' }}>
              <dt className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sessions</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{!data ? '—' : totals.sessions.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <ProjectChart data={data} loading={loading} />
      </section>

      <section aria-labelledby="project-browser-heading" className="rounded-2xl p-3 sm:p-5" style={{ background: 'rgba(30,41,59,0.55)' }}>
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
          <div>
            <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>Project browser</p>
            <h3
              ref={browserHeadingRef}
              id="project-browser-heading"
              tabIndex={-1}
              className="mt-0.5 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              style={{ color: 'var(--text-primary)' }}
            >
              {loading ? 'Loading projects' : `${projects.length.toLocaleString()} of ${totals.projects.toLocaleString()} projects`}
            </h3>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <label className="sr-only" htmlFor="project-search">Search projects</label>
            <div className="relative sm:w-72">
              <input
                id="project-search"
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search project, model, harness"
                className="min-h-11 w-full appearance-none rounded-xl border bg-transparent px-3 py-2 pr-11 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-400"
                style={{ borderColor: 'rgba(148,163,184,0.22)', color: 'var(--text-primary)' }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear project search"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-lg transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-400 active:scale-[0.96]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ×
                </button>
              )}
            </div>
            <label className="sr-only" htmlFor="project-sort">Sort projects</label>
            <select
              id="project-sort"
              value={sort}
              onChange={event => setSort(event.target.value as ProjectSort)}
              className="min-h-11 rounded-xl border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-400"
              style={{ borderColor: 'rgba(148,163,184,0.22)', color: 'var(--text-primary)' }}
            >
              {sortOptions.map(option => <option key={option.value} value={option.value} style={{ background: 'var(--bg-secondary)' }}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          {loading ? <ProjectsLoading /> : error ? (
            <div role="alert" className="rounded-2xl px-4 py-10 text-center" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Could not load projects</p>
              <p className="mt-1 text-sm">{error}</p>
              <button type="button" onClick={refetch} className="mt-4 min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:scale-[0.98]" style={{ background: 'rgba(34,211,238,0.12)', color: 'var(--accent-cyan)' }}>Try again</button>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl px-4 py-10 text-center" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{query ? 'No projects match this search' : 'No project usage yet'}</p>
              <p className="mt-1 text-sm">{query ? 'Search paths, model names, or harnesses.' : 'Collected project activity will appear here.'}</p>
              {query && <button type="button" onClick={clearSearch} className="mt-4 min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:scale-[0.98]" style={{ background: 'rgba(34,211,238,0.12)', color: 'var(--accent-cyan)' }}>Clear search</button>}
            </div>
          ) : (
            <ul className="space-y-3 sm:space-y-4" aria-label="Projects">
              {visibleProjects.map(project => (
                <ProjectSummaryCard
                  key={project.cwd}
                  project={project}
                  expanded={expandedCwd === project.cwd}
                  onToggle={() => setExpandedCwd(current => current === project.cwd ? null : project.cwd)}
                />
              ))}
            </ul>
          )}
          {projects.length > visibleProjects.length && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 active:scale-[0.98]"
                style={{ background: 'var(--bg-card)', color: 'var(--accent-cyan)' }}
              >
                Load {Math.min(PROJECT_PAGE_SIZE, projects.length - visibleProjects.length)} more
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
