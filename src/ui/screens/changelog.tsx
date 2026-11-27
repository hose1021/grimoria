// The version history: the repository changelog rendered as a readable page.
// Vite inlines the file at bundle time, so the page works offline.
import { useEffect } from "react";
import { ArcaneAppBar } from "../components/arcane/index.ts";
import { useShellPorts } from "../ports.ts";
import { APP_VERSION } from "../version.ts";

// `moduleDetection: force` turns Vite's global ImportMeta augmentation into a
// module augmentation, so this file names the one API it calls.
interface RawGlob {
  (
    pattern: string | string[],
    options: { query: "?raw"; import: "default"; eager: true },
  ): Record<string, string>;
}

const CHANGELOG =
  (import.meta as ImportMeta & { glob: RawGlob }).glob("/CHANGELOG.md", {
    query: "?raw",
    import: "default",
    eager: true,
  })["/CHANGELOG.md"] ?? "";

interface ChangelogSection {
  title: string;
  items: string[];
}

interface Release {
  version: string;
  date: string | null;
  sections: ChangelogSection[];
}

const SECTION_KEYS: Record<string, string> = {
  Added: "changelogAdded",
  Changed: "changelogChanged",
  Fixed: "changelogFixed",
  Removed: "changelogRemoved",
};

function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | null = null;
  let section: ChangelogSection | null = null;
  for (const line of markdown.split("\n")) {
    const heading = /^##\s+\[?([^\]\s]+)\]?(?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*$/.exec(line);
    if (heading?.[1]) {
      release = { version: heading[1], date: heading[2] ?? null, sections: [] };
      releases.push(release);
      section = null;
      continue;
    }
    if (!release) continue;
    const group = /^###\s+(.+)$/.exec(line);
    if (group?.[1]) {
      section = { title: group[1].trim(), items: [] };
      release.sections.push(section);
      continue;
    }
    const item = /^-\s+(.+)$/.exec(line);
    if (item?.[1] && section) section.items.push(item[1].trim());
  }
  return releases;
}

const RELEASES = parseChangelog(CHANGELOG);

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
          return (
            <code key={index} className="rounded-[4px] bg-crypt px-1 py-0.5 text-[12.5px]">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-text">
              {part.slice(2, -2)}
            </strong>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link?.[1] && link[2]) {
          return (
            <a
              key={index}
              className="text-accent-text underline underline-offset-2 hover:text-text"
              href={link[2]}
              target="_blank"
              rel="noreferrer"
            >
              {link[1]}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export function ChangelogScreen() {
  // On a direct Pages visit, the lazy route mounts after the browser has
  // already tried to find the fragment in the empty shell.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id.startsWith("release-")) document.getElementById(id)?.scrollIntoView();
  }, []);
  const ports = useShellPorts();
  const t = ports.strings.t;
  return (
    <>
      <ArcaneAppBar current="changelog" />
      <main className="min-h-[calc(100dvh-3.5rem)] bg-crypt px-4 py-8 text-text min-[900px]:px-6">
        <div className="mx-auto w-full max-w-[760px]">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-edge pb-5">
            <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.05] font-semibold tracking-[-0.02em]">
              {t("changelog")}
            </h1>
            <p className="text-[12px] text-muted">
              {t("changelogCurrent")}{" "}
              <b className="font-medium tabular-nums text-text">v{APP_VERSION}</b>
            </p>
          </header>

          <nav aria-label={t("changelog")} className="mt-4 flex flex-wrap gap-1.5">
            {RELEASES.map((release) => (
              <a
                key={release.version}
                className="rounded-[6px] border border-edge px-2 py-1 text-[11px] tabular-nums text-muted transition-colors hover:border-edge-2 hover:text-text"
                href={`#release-${release.version === "Unreleased" ? "unreleased" : release.version}`}
              >
                {release.version === "Unreleased"
                  ? t("changelogUnreleased")
                  : `v${release.version}`}
              </a>
            ))}
          </nav>

          <div>
            {RELEASES.map((release) => (
              <article
                key={release.version}
                id={`release-${release.version === "Unreleased" ? "unreleased" : release.version}`}
                className="grid scroll-mt-20 gap-2 border-b border-edge py-6 min-[720px]:grid-cols-[140px_minmax(0,1fr)] min-[720px]:gap-7"
              >
                <header className="min-w-0">
                  <h2 className="text-[18px] leading-[24px] font-semibold tracking-[-0.01em]">
                    {release.version === "Unreleased"
                      ? t("changelogUnreleased")
                      : `v${release.version}`}
                  </h2>
                  {release.date ? (
                    <time
                      className="mt-1 block text-[12px] tabular-nums text-muted"
                      dateTime={release.date}
                    >
                      {release.date}
                    </time>
                  ) : null}
                  {release.version === APP_VERSION ? (
                    <span className="mt-2 inline-block rounded-[6px] border border-amber-dim px-2 py-0.5 text-[10px] font-medium tracking-[.06em] uppercase text-accent-text">
                      {t("changelogCurrent")}
                    </span>
                  ) : null}
                </header>

                <div className="min-w-0">
                  {release.sections.map((section) => {
                    const key = SECTION_KEYS[section.title];
                    return (
                      <section key={section.title} className="mt-4 first:mt-0">
                        <h3 className="text-[11px] font-semibold tracking-[.12em] uppercase text-muted">
                          {key ? t(key) : section.title}
                        </h3>
                        <ul className="mt-2 list-none space-y-2 p-0">
                          {section.items.map((item, index) => (
                            <li key={index} className="flex gap-2.5 text-[14px] leading-[23px]">
                              <span
                                className="mt-[9px] size-1 shrink-0 rounded-full bg-edge-2"
                                aria-hidden="true"
                              />
                              <span className="min-w-0">
                                <Inline text={item} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-[12px] leading-[18px] text-muted">{t("changelogSourceNote")}</p>
        </div>
      </main>
    </>
  );
}
