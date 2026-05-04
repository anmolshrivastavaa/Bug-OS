# Bug OS

`bugOS` is a QA and bug tracking platform with a compact real-time architecture for test and defect management.

## Overview

This project is implemented as a single-page application backed by a Node.js/Express server and MongoDB persistence. It tracks test cases, bugs, backend escalations, audit history, and Java automation scripts.

## Architecture

- Frontend: `index.html` with vanilla JavaScript, CSS, client-side state management, and Socket.IO synchronization.
- Backend: `server.js` runs Express for HTTP serving, Socket.IO for real-time updates, MongoDB persistence, and a Java automation endpoint.
- Database: MongoDB with Mongoose models for test cases, bugs, modules, audit logs, counters, and automation scripts.
- Automation: Test case data is injected into generated Java source, compiled using `javac`, and executed with `java` to determine pass/fail outcomes.

## Core Features

- Live sync across connected clients using Socket.IO
- Persistent test case and bug tracking in MongoDB
- Module-based test organization with duplicate test case IDs allowed across modules
- Bug lifecycle workflow including `Open`, `Escalated`, `Fixed`, `Verified`, and `Retest Failed`
- Backend escalation board for issues that need deeper investigation
- Retest queue for QA verification after developer fixes
- Audit log capture of user actions with a 200-entry retention window
- Role-aware UI for QA, Developer, and Admin personas
- Automation script storage tied to specific test case + module pairs

## Role Capabilities

### QA

- Create, edit, and delete test cases
- Manage modules and organize test coverage
- Save and run automation scripts for linked test cases
- Verify fixed bugs through the retest queue
- Remove outdated bug records when appropriate

### Developer

- Review open and retest-failed bug reports
- Mark bugs as fixed once changes are ready
- Escalate issues to backend status for deeper investigation
- Work from the escalation board and add developer notes

### Admin

- Monitor system state and audit history
- Oversee overall QA activity and bug trends
- Act as a supervision role with visibility across the app
- Note: current admin capabilities are primarily visibility-focused, not separate CRUD restrictions

## QA Workflow

1. QA creates and updates test cases by module.
2. Failed or held tests create or update bug records.
3. Developers review bugs and either fix them or escalate them for backend work.
4. Fixed bugs enter the retest queue for QA verification.
5. QA verifies the fix by marking the bug pass or fail.
6. Escalated bugs are tracked separately until resolved.
7. All actions generate audit log entries for review.

## Tech Stack

- Node.js
- Express
- Socket.IO
- MongoDB
- Mongoose
- HTML/CSS
- Vanilla JavaScript
- Java runtime for automation execution

## Repository Structure

- `index.html` — frontend UI, role handling, data views, and live sync client logic
- `server.js` — backend server, Socket.IO handlers, MongoDB models, and automation endpoint
- `package.json` — dependencies and application start script
- `start-mongo.bat` — Windows helper for local MongoDB startup

## Implementation Notes

- Authentication is frontend-only and hardcoded in `index.html`.
- Test cases are keyed by `id + module` so the same numeric ID can exist in different modules.
- Audit logs are limited to the newest 200 entries.
- Java automation depends on `PASS` or `FAIL` being printed by the script.
- Bug IDs are auto-generated as `BUG-001`, `BUG-002`, etc.

> Note: login is implemented in frontend code only and is intended for demo/testing.

## What This App Is About

`bugOS` is designed to support QA and development teams by tracking test cases, logging defects, and keeping everyone in sync. The app is useful for:

- capturing and updating test case information
- logging bug reports linked to failed tests
- escalating issues to backend teams
- reviewing audit history of changes
- running simple Java automation scripts against test case data

## Architecture

- Frontend: `index.html` with vanilla JavaScript, CSS, and Socket.IO client
- Backend: `server.js` with `Express`, `Socket.IO`, and `Mongoose`
- Database: MongoDB collections for test cases, bugs, modules, counters, audit logs, and automation scripts


