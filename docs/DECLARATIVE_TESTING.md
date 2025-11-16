# Declarative Test Framework

**Concept:** Tests are pure data objects. A test runner interprets the data and executes UI actions + verifications.

## Philosophy

Instead of writing procedural test code:
```javascript
// ❌ Procedural (lots of code per test)
test('create trip', async () => {
  await page.goto('...');
  await page.click('[data-testid="create-trip"]');
  await page.fill('input[name="title"]', 'Paris');
  await page.click('button:has-text("Create")');
  expect(await page.locator('text=Paris').isVisible()).toBe(true);
});
```

Write declarative test data:
```javascript
// ✅ Declarative (just data)
{
  action: "createTrip",
  data: { title: "Paris", startDate: "2025-07-01", endDate: "2025-07-07" },
  verify: { ui: "Trip card shows 'Paris'", db: { trips: { title: "Paris" } } }
}
```

## Benefits for AI Development

1. **Tests are just data** - AI generates JSON objects, not complex code
2. **Self-verifying** - Runner knows how to check if it worked
3. **Maintainable** - Change UI implementation, test data stays same
4. **Readable** - Non-programmers can understand test cases
5. **Composable** - Chain actions together easily

## Example Implementation

See: `/tests/declarative-test-runner.example.js`

## How It Works

1. **Define test cases as objects**
2. **Test runner maps actions to Screen Objects**
3. **Runner executes action**
4. **Runner verifies results (UI + Database)**
5. **Reports pass/fail**

---

**Status:** Prototype - See example for working implementation
