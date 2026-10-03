# Testing Strategy & Automated Test Suite

## Running Automated Tests

Run the test suite via Vitest:
```bash
npm test
```

## Required Test Scenarios (Requirement 24)

- **Test 1**: Post published prior to `AGENT_START_TIME` (12:00 vs 12:30) is IGNORED.
- **Test 2**: Post published after `AGENT_START_TIME` (12:31 vs 12:30) is PROCESSED.
- **Test 3**: Server reboot preserves original `AGENT_START_TIME`.
- **Test 4**: Duplicate post detection prevents secondary processing.
- **Test 5**: Discovery of old posts after startup ignores them based on `published_at`.
- **Test 6**: Irrelevant non-job content produces NO Telegram alert.
- **Test 7**: Valid job matching preferences generates Telegram alert.
- **Test 8**: Location synonym resolution (`Gurgaon` <-> `Gurugram`, `Delhi NCR`).
