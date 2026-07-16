# FLL-Tournament-App
A lightweight, offline web application designed to manage, schedule, and score FLL robotics events. Featuring dual-window system, allows for Admin Dashboard for event control and synchronized Audience Display for live scoring and timers. Built with basic HTML/JS, requires no backend.


# FLL Tournament Management System


## Features

* **Admin Dashboard:** A centralized control hub for the event organizer.
    * **Team Management:** Add teams, assign icons, and input student rosters.
    * **Match Scheduling:** Create matches by pairing registered teams or dynamic "Winner of Match X" slots.
    * **Live Scoring Interface:** Enter scores with a built-in visual reference scorecard.
    * **Timer Control:** Start, pause, and reset match countdown timers with millisecond accuracy.
    * **Data Management:** Export and import all event data as JSON backups.
* **Audience Display:** A synchronized, presentation-ready window designed for a secondary monitor or projector.
    * Displays the current match, competing teams, live scores, high score, and next upcoming match.
    * Features a massive, real-time synchronized match timer.
* **Offline-First Architecture:** Utilizes standard browser `localStorage` to synchronize state between the Admin and Audience windows instantly, requiring zero server infrastructure.

## Application Architecture

The application consists of standard web files:
* `index.html` - The Admin Dashboard interface.
* `audience.html` - The public-facing presentation interface.
* `style.css` - Unified styling for both views, implementing a dark, minimalist theme.
* `app.js` - Core logic handling state management, timer synchronization, and DOM updates.

## Setup & Deployment

Because this application relies entirely on client-side code, you have two simple options for deployment.

### Option 1: Local File Execution (No setup required)
1. Download or clone this repository to your machine.
2. Ensure the required images (`background.jpg`, `scorecard.jpg`, `cavalier_logo.png`, `vortx_logo.png`) are in the same directory as the HTML files.
3. Double-click `index.html` to open the Admin Dashboard in your default web browser.

### Option 2: GitHub Pages (Recommended for sharing)
1. Push this code to a public GitHub repository.
2. Navigate to your repository **Settings**.
3. Select **Pages** from the left sidebar.
4. Under "Build and deployment", set the source to deploy from the `main` (or `master`) branch.
5. Save and wait 1-2 minutes for the site to build.
6. Access the live site at the provided URL.

## Operational Guide (How to run an event)

Due to the system's reliance on `localStorage` for database-free operation, data is tied strictly to the browser and device currently running the application.

1. **Host Setup:** Open the Admin Dashboard (`index.html`) on your primary computer.
2. **Launch Presentation:** Navigate to the "System" tab and click **Launch Audience Window**. 
3. **Screen Management:** Drag the newly opened Audience Window onto your extended display (projector or TV) and make it fullscreen.
4. **Data Sync:** Because both windows are running on the same browser instance, all updates made in the Admin Dashboard (timer starts, score pushes, team updates) will reflect instantly on the Audience Display.

**Important Data Warning:** If you open the link on a different computer, it will not have access to the event data. Always use the JSON Export/Import feature in the System tab to move event data between different computers if a hardware swap is necessary.
