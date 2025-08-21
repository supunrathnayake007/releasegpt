import { NextResponse } from "next/server";

type Ticket = { id: string; key: string; title: string; type?: string };
type Commit = { id: string; hash: string; message: string; author?: string; date?: string };
type Project = { id: string; name: string; jiraKey: string; devopsRepo: string; branch: string };

export async function POST(req: Request) {
  const { project, tickets, commits } = (await req.json()) as {
    project: Project;
    tickets: Ticket[];
    commits: Commit[];
  };

  const date = new Date().toISOString().slice(0, 10);
  const featureTickets = tickets.filter(t => (t.type || "").toLowerCase().includes("story") || (t.type || "").toLowerCase().includes("feature"));
  const bugTickets = tickets.filter(t => (t.type || "").toLowerCase().includes("bug"));
  const epicTickets = tickets.filter(t => (t.type || "").toLowerCase().includes("epic"));
  const otherTickets = tickets.filter(t => ![...featureTickets, ...bugTickets, ...epicTickets].includes(t));

  // A little helper to bullet-ize items
  const bullets = (items: string[]) => items.map(i => `- ${i}`).join("\n");

  const title = `${project.name} — Release Notes (${date})`;

  const narrative = [
    `This release pushes ${project.name.split(" ")[0]} closer to reliable, real-world operations. Our focus was making autonomous routing smarter in tough conditions, while giving operators better visibility into live missions.`,
    `From wind-aware path planning to faster LIDAR processing, the system is more resilient and responsive. Operators also get a clearer control surface through an updated fleet dashboard.`
  ];

  // Turn tickets/commits into text
  const features = [
    ...featureTickets.map(t => `${t.key}: ${t.title}`),
    ...epicTickets.map(t => `${t.key}: ${t.title}`)
  ];
  const fixes = bugTickets.map(t => `${t.key}: ${t.title}`);
  const improvements = commits
    .filter(c => c.message.startsWith("perf:") || c.message.startsWith("ui:"))
    .map(c => `${c.message} (${c.hash.slice(0,7)})`);

  const techNotes = [
    `Routing: wind compensation model integrated into planner (configurable).`,
    `Perception: LIDAR processing pipeline refactored for lower latency.`,
    `Frontend: Live tracking dashboard updated; better rendering on dense telemetry.`
  ];

  const knownIssues = [
    `Occasional jitter in drone icon at < 2s telemetry intervals (UI).`,
    `Route recomputation might pause briefly when wind gust data spikes (>95th percentile).`
  ];

  const upgrade = [
    `No schema migrations.`,
    `Recommend clearing cached routes before first mission post-upgrade.`,
    `Check new wind-compensation toggle in project settings.`
  ];

  // Simple contributor list from commits
  const contributors = Array.from(new Set(commits.map(c => c.author).filter(Boolean))) as string[];

  const changelog = commits.map(
    c => `- ${c.message} (${c.hash.slice(0,7)})${c.author ? ` — ${c.author}` : ""}${c.date ? ` on ${c.date}` : ""}`
  );

  const response = {
    title,
    date,
    narrative, // 1–2 paragraphs “story of the release”
    sections: [
      { heading: "Highlights", items: [
        "Wind-aware routing for safer autonomous flights.",
        "Live fleet monitoring dashboard with richer telemetry.",
        "Lower latency in obstacle detection pipeline."
      ]},
      { heading: "New Features", items: features },
      { heading: "Bug Fixes", items: fixes },
      { heading: "Improvements", items: improvements },
      { heading: "Technical Notes", items: techNotes },
      { heading: "Breaking Changes", items: [] }, // leave empty if none
      { heading: "Known Issues", items: knownIssues },
      { heading: "Upgrade Notes", items: upgrade },
      { heading: "Credits", items: contributors.length ? contributors : ["—"] },
      { heading: "Changelog", items: changelog }
    ],
    // A ready-to-copy Markdown export:
    markdown:
`# ${title}

${narrative.join("\n\n")}

${[
  ["## Highlights", ["Wind-aware routing for safer autonomous flights.","Live fleet monitoring dashboard with richer telemetry.","Lower latency in obstacle detection pipeline."]],
  ["## New Features", features],
  ["## Bug Fixes", fixes],
  ["## Improvements", improvements],
  ["## Technical Notes", techNotes],
  ["## Breaking Changes", []],
  ["## Known Issues", knownIssues],
  ["## Upgrade Notes", upgrade],
  ["## Credits", contributors.length ? contributors : ["—"]],
  ["## Changelog", changelog]
].map(([h, arr]) => `${h}\n${(arr as string[]).length ? bullets(arr as string[]) : "- None"}`).join("\n\n")}

`
  };

  return NextResponse.json(response);
}
