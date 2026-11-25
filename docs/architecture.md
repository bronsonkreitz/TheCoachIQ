# Architecture

## Overview
CoachIQ is a TypeScript web application built with Replit and AI-assisted development. The project is organized as a pnpm workspace (monorepo), which keeps the frontend, API, and shared code in one repository.

## Repository Structure

| Folder or file | Purpose |
|----------------|---------|
| artifacts/ | Application packages such as the frontend and API |
| lib/ | Shared code, including the generated API client |
| scripts/ | Utility and build scripts |
| .agents/ | Replit Agent configuration |
| replit.md | Project notes maintained for Replit |
| package.json, pnpm-workspace.yaml, pnpm-lock.yaml | Workspace and dependency configuration |
| tsconfig.json, tsconfig.base.json | TypeScript configuration |

## How It Works
1. The coach uses the web frontend in the browser.
2. Data entered by the coach is validated before it is saved.
3. Data is saved to browser storage, and the app reports storage status and warns the coach if a save fails.
4. If saved data is found to be damaged, it is preserved rather than overwritten.

## Deployment
The app is published through Replit.
Live link: TODO

## Diagram
Browser -> Frontend (validation) -> Browser storage
