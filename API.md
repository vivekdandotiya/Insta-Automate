# API Reference

## Agent State
- `GET /api/agent/status`: Returns current state, `AGENT_START_TIME`, last check time.
- `POST /api/agent/start`: Starts agent background monitoring.
- `POST /api/agent/pause`: Pauses monitoring loop.
- `POST /api/agent/stop`: Stops monitoring loop.
- `POST /api/agent/run-now`: Triggers immediate check cycle execution.
- `POST /api/agent/reset-start-time`: Resets `AGENT_START_TIME` (Requires `{ "confirm": true }`).

## Monitored Sources
- `GET /api/sources`: Lists monitored accounts.
- `POST /api/sources`: Adds a new account (`username`, `priority`).
- `DELETE /api/sources/:id`: Deletes account.
- `PATCH /api/sources/:id/toggle`: Enables/disables account.

## Filters & Job Preference
- `GET /api/filters`: Returns roles, locations, experience, min relevance.
- `PUT /api/filters`: Updates job preferences.

## Job Alerts & Metrics
- `GET /api/alerts`: Lists detected job alerts.
- `GET /api/alerts/:id`: Full details for job modal.
- `GET /api/alerts/metrics`: System observability counters.
- `POST /api/test/classify`: Manual Sandbox text/flyer classification.
- `POST /api/test/telegram`: Sends test Telegram alert.
