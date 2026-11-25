# Product Requirements Document (PRD)

Product: CoachIQ
Author: Bronson Kreitz
Version: 1.0

## 1. Overview
CoachIQ is a web application that helps amateur and youth sports coaches manage their teams, track performance data, and share live dashboards.

## 2. Goals
- Replace scattered spreadsheets and paper notes with one simple tool
- Give coaches clear insights without requiring technical skills
- Keep coaches' data safe and reliable

## 3. Target Users
- Primary: Volunteer and part-time coaches of youth, school, and community sports teams
- Secondary: Assistant coaches, players, and parents who view shared dashboards

## 4. User Stories
- As a coach, I want to create and manage multiple teams so that I can keep everything in one place.
- As a coach, I want to record player and game data so that I can track performance over time.
- As a coach, I want a dashboard so that I can quickly spot trends.
- As a coach, I want to share a live dashboard so that my assistants and players see the same information.
- As a coach, I want warnings when my data cannot be saved so that I never lose my work.
- As a new user, I want a demo mode so that I can try the app before entering real data.

## 5. Functional Requirements

### Must Have
- Create and manage multiple teams
- Record and save sports data
- Dashboard view of team and player information
- Validation of saved data, with damaged data preserved rather than overwritten
- Browser storage status and warnings when a save fails
- Demo mode

### Should Have
- Shareable live dashboards
- Support for more than one sport

### Nice to Have
- Data export
- User accounts and cloud sync
- Notifications
- Native mobile app

## 6. Non-Functional Requirements
- Works in modern desktop and mobile browsers
- Simple enough to use without training
- Existing data is preserved when the app is updated
- Dependencies are kept patched against known security vulnerabilities

## 7. Out of Scope
- Payment processing
- Video analysis
- League and registration management

## 8. Success Metrics
- Number of coaches who complete setup and create a team
- Number of coaches who return for a second session
- Satisfaction ratings and feedback from customer interviews

## 9. Risks and Assumptions
- Data is stored in the user's browser, so clearing browser data can remove it
- Assumes coaches are willing to move from spreadsheets to a dedicated tool
- Assumes the simple, low-cost positioning is enough to stand out from established competitors

## 10. Traceability to Customer Research

| Requirement | Evidence from interviews or research |
|-------------|--------------------------------------|
| TODO | TODO |
| TODO | TODO |
| TODO | TODO |
