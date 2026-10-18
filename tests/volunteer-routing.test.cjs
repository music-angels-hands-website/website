const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
const routing = source.slice(source.indexOf('function getDefaultSubpage('), source.indexOf('function closeMobileNav('));
function setup(hash) {
  let visible = false;
  const page = { id: 'volunteer', classList: { contains: () => false }, closest: () => null, querySelector(selector) { return selector === '.page-section[id]' ? section : null; } };
  const section = { id: 'volunteer-records', closest: () => page, classList: { contains: name => name === 'page-section', toggle(name, enabled) { visible = enabled; } } };
  const context = { window: { location: { hash } }, pageSections: [section], document: { getElementById: id => id === page.id ? page : id === section.id ? section : null } };
  vm.createContext(context); vm.runInContext(routing, context);
  return { context, visible: () => visible };
}
for (const hash of ['#volunteer', '#volunteer-records']) test(`${hash} keeps the volunteer content and errors visible`, () => {
  const { context, visible } = setup(hash);
  assert.equal(context.setActiveSubpage('volunteer'), 'volunteer-records');
  assert.equal(visible(), true);
});
test('explicit sub-navigation still takes priority', () => {
  const {context} = setup('#volunteer');
  assert.equal(context.getDefaultSubpage({id:'about',querySelector:selector=>selector==='.sub-nav a'?{getAttribute:()=> '#mission-vision'}:{id:'other'}}),'mission-vision');
});
