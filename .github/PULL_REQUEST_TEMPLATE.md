<!-- Thanks for contributing! Fill the section that applies; delete the other. -->

## Graph change (client/public/graph.json)

**What does this change argue / ask / ground?**
<!-- e.g. "Deepens 'Should you pull the lever?' with the doctrine of double
     effect, grounding in the existing 'persons as ends' principle." -->

**Checklist**
- [ ] Exported from the app (Share → Export), not hand-edited
- [ ] One focused change (one question deepened / one duplicate merged / one objection answered)
- [ ] New bedrock links to existing values where one fits (checked the Values tab)
- [ ] Retracted/superseded instead of deleting anything that was argued against
- [ ] CI is green (schema + integrity checks pass)

## Code change

**What & why**
<!-- Short description of the change and its motivation. -->

**Checklist**
- [ ] `npm run typecheck && npm test && npm run build` pass locally
- [ ] Pure modules stay pure (`graph.ts`, `commitment.ts`, `organize.ts`, `proposals.ts`)
- [ ] Taxonomy/status/commitment changes went through `docs/` (growth policy)
- [ ] `CLAUDE.md` updated if conventions or structure changed
