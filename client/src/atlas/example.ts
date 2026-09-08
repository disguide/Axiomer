import type { Statement, Connection } from './model';
const time = '2026-09-07T00:00:00.000Z';
function node(id: string, title: string, body: string, kind: Statement['kind'] = 'claim', topic = 'Cities & transport', url = '', publisher = '', locator = ''): Statement {
  return { id, title, body, kind, topic, url, publisher, locator, version: 1, created_at: time, updated_at: time };
}
export const exampleNodes: Statement[] = [
  node('transport', 'Should cities prioritize public transport?', 'Explore the case for investing in public transport, the trade-offs, and what the evidence can tell us. This is a worked example, open to revision.', 'question'),
  node('access', 'Better transit connects more people to opportunity.', 'Reliable, accessible services can connect people to work, education, and healthcare without requiring car ownership. The benefit depends on where routes go, cost, frequency, and accessibility.'),
  node('emissions', 'Shifting trips to public transport can reduce emissions.', 'Emissions depend on occupancy, energy sources, and the trips replaced. The claim is conditional: adding a poorly used service is different from shifting crowded roads to a well-used network.'),
  node('space', 'Streets can serve more people with less space for cars.', 'A dedicated transit corridor can move many people in limited street space. Walking, cycling, freight, and access needs also belong in the decision.'),
  node('cost', 'Large projects can crowd out other urgent spending.', 'Construction and operating costs create real trade-offs. Each proposal needs a transparent comparison with alternatives, including improving existing services.'),
  node('coverage', 'Fixed routes do not serve every journey well.', 'Low-density areas, late shifts, disability access, and complicated trip patterns can make a fixed network less useful. Complementary services may be needed.'),
  node('frequency', 'Frequency matters as much as proximity.', 'A nearby stop offers little practical access if the service runs infrequently or cannot be relied upon.'),
  node('design', 'Compare access to destinations, not just vehicle speed.', 'A transport system is useful because it lets people reach places. This changes how we evaluate a project: destinations reached, affordability, and access for different users.'),
  node('ipcc', 'IPCC · Climate Change 2022: Transport', 'Chapter 10 reviews mitigation options across transport, including demand reduction, mode shifts, infrastructure, and electrification. Read the original for the full scope and uncertainties.', 'source', 'Cities & transport', 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/', 'IPCC', 'AR6 WGIII · Chapter 10'),
  node('itf', 'ITF · Reversing Car Dependency', 'An OECD/ITF report on reducing car dependency and improving accessibility. Attached as relevant reading; individual claims still need critical evaluation.', 'source', 'Cities & transport', 'https://www.itf-oecd.org/reversing-car-dependency', 'International Transport Forum', '2021 · Summary & conclusions'),
  node('science', 'What makes a scientific claim trustworthy?', 'Explore evidence, reproducibility, and the limits of our confidence.', 'question', 'Science & knowledge'),
  node('replication', 'Independent replication increases confidence.', 'When different researchers can reproduce a result, some explanations based on a single method, dataset, or laboratory become less likely.', 'claim', 'Science & knowledge'),
  node('uncertainty', 'A result can be useful while remaining uncertain.', 'Confidence should reflect the quality and scope of the evidence. Acknowledging uncertainty helps other people decide how much to rely on a claim.', 'claim', 'Science & knowledge'),
  node('ai', 'When should an AI agent ask a person to review its work?', 'A starting question. Add reasons, counterexamples, and sources to develop it.', 'question', 'Technology & society'),
];
export const exampleConnections: Connection[] = [
  ...['access','emissions','space'].map(child=>({id:`transport-${child}`,parent:'transport',child,relation:'supports' as const})),
  ...['cost','coverage'].map(child=>({id:`transport-${child}`,parent:'transport',child,relation:'challenges' as const})),
  {id:'access-frequency',parent:'access',child:'frequency',relation:'supports'},
  {id:'access-design',parent:'access',child:'design',relation:'context'},
  {id:'emissions-ipcc',parent:'emissions',child:'ipcc',relation:'source'},
  {id:'transport-itf',parent:'transport',child:'itf',relation:'source'},
  {id:'space-itf',parent:'space',child:'itf',relation:'source'},
  {id:'science-replication',parent:'science',child:'replication',relation:'supports'},
  {id:'science-uncertainty',parent:'science',child:'uncertainty',relation:'context'},
];
