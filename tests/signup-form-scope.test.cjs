const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
// Exercise the production selectors and submit binding without unrelated page rendering.
const declarations = source.slice(source.indexOf('const signupForm ='), source.indexOf('const contentManifestPath ='));
const handler = source.slice(source.indexOf('async function signupErrorMessage('), source.indexOf('updateHeaderHeight();\nrouteToCurrentHash();'));
function run(volunteerForm) {
  let authBindings = 0;
  let volunteerBindings = 0;
  const authForm = { addEventListener() { authBindings++; } };
  const volunteer = { addEventListener(event) { assert.equal(event, 'submit'); volunteerBindings++; } };
  vm.runInNewContext(declarations + handler, {
    document: { querySelector(selector) {
      if (selector === '.signup-form') return authForm;
      if (selector === '#how-to-join .signup-form') return volunteerForm ? volunteer : null;
      return null;
    } },
  });
  return { authBindings, volunteerBindings };
}
test('login-only page never binds the volunteer email handler to auth', () => {
  assert.deepEqual(run(false), { authBindings: 0, volunteerBindings: 0 });
});
test('volunteer email handler binds only to the volunteer form when present', () => {
  assert.deepEqual(run(true), { authBindings: 0, volunteerBindings: 1 });
});
