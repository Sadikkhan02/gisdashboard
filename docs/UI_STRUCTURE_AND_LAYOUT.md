# 🏗️ UI Structure and Layout Architecture

This document outlines the visual architecture and component hierarchy of the GeoSpatial Intelligence Dashboard.

---

## 1. Global Layout System
The application uses a **Persistent Shell Architecture** defined in `app/dashboard/page.js`.

*   **Responsive Sidebar**: A collapsible navigation bar on the left.
    *   *Collapsed (20px)*: Icon-only view for maximum map space.
    *   *Expanded (64px)*: Full labels and sub-branding.
*   **Dynamic Main Content**: Adjusts padding automatically based on the sidebar state.
*   **Persistent Navbar**: Contains the search bar, region filter, and user profile management.

---

## 2. Component Hierarchy by View

### A. Dashboard View (The Grid)
*   **KPI Section**: A row of 4 high-visibility cards showing total locations, population, crime, and development index.
*   **Left Column (8/12)**: **Interactive Map**. Powered by Leaflet/React-Leaflet. Supports markers, cluster views, and heatmap overlays.
*   **Right Column (4/12)**:
    *   **Analytics Snapshot**: A summary card with key numeric metrics.
    *   **Activity Feed**: A vertical scrolling list of real-time events and alerts.

### B. Connect View (Communication)
*   **Full-Screen Chat**: A unified interface with a user list on the left and a message window on the right.
*   **Overlays**: **WebRTC Video Call** system that appears as a floating tile during active sessions.

### C. Charts View (Deep Analytics)
*   **Comparative Grid**: 4 columns of cards containing categorized charts:
    *   *Crime Trends* (Line Chart)
    *   *Category Distribution* (Donut Chart)
    *   *Hourly Patterns* (Bar Chart)
    *   *KPI Comparisons* (Area Chart)

### D. Intelligence View (Phase 8 - D3E)
*   **Tactical Split-View**:
    *   **Left (Tactical Map)**: Full-height map with "Live Engine" status indicator.
    *   **Right (Decision Intelligence Panel)**:
        *   Dark-themed **Glassmorphism** panel.
        *   **Suitability Gauge**: Neon-styled radial progress bar.
        *   **Radar Chart**: Visualizing Safety vs. Growth.
        *   **Strategic Recommendation Card**: Automated verdict output.

---

## 3. Design System & Aesthetics

### Color Palette
*   **Primary (Brand)**: Teal-700 (#168c7a) - Used for buttons, active states, and branding.
*   **Background**: Slate-50 (#f5f7fb) - Clean, neutral backdrop.
*   **Text**: Slate-950 (Dark Blue-Black) - High contrast for readability.
*   **Intelligence Theme**: Deep Slate-900 with Indigo/Emerald accents for a "Command Center" feel.

### UI Effects
*   **Glassmorphism**: Use of `backdrop-blur` and semi-transparent borders for overlays.
*   **Animations**: Custom `vibe-in` and `slide-right` transitions for panel loading.
*   **Micro-Interactions**: Hover scales on cards, pulsating notification badges, and rotating spin loaders.

---

## 4. State Integration
The UI is synchronized via **Zustand (`appStore.js`)**:
1.  **View State**: Controls which major component is rendered.
2.  **Viewport State**: Captures the map's current bounding box to update analytics.
3.  **Real-time State**: Socket.io updates for chat and call notifications across all views.
