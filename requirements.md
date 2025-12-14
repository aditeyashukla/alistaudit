# A-List Savings Calculator - Requirements Document & Design Overview

## Project Overview
A React Native application (Web + iOS) that integrates with Letterboxd to calculate savings from AMC A-List membership by tracking watched movies and comparing subscription costs against ticket prices.

---

## 1. Functional Requirements

### 1.1 User Authentication & Data Storage
- Firebase Authentication for user accounts
- Firestore database for storing user data
- Secure storage of API credentials and preferences

### 1.2 Letterboxd Integration
- Accept Letterboxd username/RSS feed URL
- Fetch user's watched movies (diary entries)
- Parse movie data: title, watch date, rating (optional)
- Periodic sync capability to update watched movies

### 1.3 AMC A-List Tracking
- Input fields for:
  - Monthly subscription cost (default: $19.95-$24.95 depending on region)
  - A-List start date
  - Average ticket price in user's area
- Movie marking system: flag which Letterboxd entries were seen at AMC

### 1.4 Savings Calculations
**Core Metrics:**
- Total savings (lifetime since A-List start)
- Annual savings
- Monthly savings
- Total movies seen at AMC
- Average savings per movie
- Break-even analysis (months to recoup subscription cost)

**Formula:**
```
Savings = (AMC Movies × Avg Ticket Price) - (Months Active × Monthly Fee)
```

### 1.5 Free Movie Tracking
- AMC A-List offers 4 "free" movies per week (up to 12/month)
- Track which free weekly movies user has seen
- Show utilization percentage
- Highlight underutilized weeks

### 1.6 Data Management
- Manual movie addition/removal
- Bulk edit capabilities
- Export data (CSV/JSON)
- Clear data option in settings

---

## 2. Technical Requirements

### 2.1 Technology Stack
- **Framework:** React Native (Expo recommended for ease of deployment)
- **Backend:** Firebase
  - Authentication
  - Firestore (user data, movie logs)
  - Cloud Functions (Letterboxd API calls if needed)
- **State Management:** React Context API or Zustand
- **Navigation:** React Navigation
- **Styling:** NativeWind (Tailwind for React Native) for Neubrutalism design

### 2.2 Platform Support
- iOS (React Native)
- Web (React Native Web)
- Responsive design for various screen sizes

### 2.3 External Integrations
- Letterboxd RSS feed parsing
- Optional: TMDb API for movie posters/metadata
- Firebase Cloud Functions for server-side operations

### 2.4 Performance Requirements
- Load dashboard within 2 seconds
- Smooth 60fps animations
- Offline capability for viewing cached data
- Background sync for Letterboxd updates

---

## 3. User Interface Structure

### 3.1 Screen Architecture

**Navigation Pattern:** Bottom Tab Navigation (3 tabs)

#### Screen 1: Dashboard (Home)
**Primary Metrics Card:**
- Total savings (large, prominent)
- Lifetime/Year/Month toggle

**Secondary Stats Grid:**
- Movies seen at AMC (with icon)
- Average savings per movie
- Months active
- Break-even status

**Free Movies Widget:**
- Current week progress (X/4 movies)
- Monthly utilization percentage
- Visual progress indicator

**Recent Activity:**
- Last 5 AMC movies logged
- Quick access to mark more

#### Screen 2: Movie Manager
**Filter/Sort Bar:**
- All Movies / AMC Only / Not AMC
- Sort by date, title, savings

**Movie List:**
- Scrollable list from Letterboxd
- Each item shows:
  - Movie poster (if available)
  - Title and watch date
  - AMC toggle switch (on/off)
  - Calculated savings for that movie

**Actions:**
- Pull to refresh Letterboxd sync
- Floating action button to manually add movie

#### Screen 3: Settings
**Sections:**

1. **Letterboxd Connection**
   - Username input
   - Connection status indicator
   - Last sync timestamp
   - Manual sync button

2. **A-List Information**
   - Monthly subscription cost slider/input
   - Start date picker
   - Average ticket price input
   - Total months active (calculated, read-only)

3. **Display Preferences**
   - Default time period (lifetime/year/month)
   - Currency format
   - Theme toggle (if multiple Neubrutalism variants)

4. **Data Management**
   - Export data
   - Clear all AMC markings
   - Reset account
   - Logout

5. **About**
   - App version
   - Credits
   - Privacy policy
   - Rate app

---

## 4. Design System - Neubrutalism Style

### 4.1 Core Principles
**Neubrutalism Characteristics:**
- Bold, thick borders (3-5px)
- High contrast color combinations
- Dramatic shadows (offset box shadows)
- Chunky, geometric shapes
- Brutalist typography (bold, sans-serif)
- Flat colors, no gradients
- Playful, slightly chaotic layouts
- Heavy use of black borders

### 4.2 Color Palette

**Primary Colors:**
- Background: `#FAFAFA` (off-white) or `#F5F5F0` (warm white)
- Black: `#000000` (for borders and text)
- Primary Accent: `#FF6B6B` (coral red) - for positive savings
- Secondary Accent: `#4ECDC4` (turquoise) - for neutral stats
- Tertiary Accent: `#FFE66D` (bright yellow) - for highlights
- Warning: `#FF8B94` (soft red) - for negative savings/alerts

**Supporting Colors:**
- `#95E1D3` (mint green) - success states
- `#C7CEEA` (lavender) - inactive states
- `#FFA07A` (light salmon) - emphasis

### 4.3 Typography

**Font Family:**
- Primary: **Space Grotesk** (bold, geometric) or **Archivo Black**
- Secondary: **Inter** or **Work Sans** (for body text)

**Scale:**
- Hero: 48-56px (bold)
- H1: 32-40px (bold)
- H2: 24-28px (bold)
- H3: 18-20px (semibold)
- Body: 16px (regular)
- Caption: 14px (medium)

**Style:**
- ALL CAPS for emphasis elements
- Heavy font weights (700-900)
- Tight letter spacing for headers

### 4.4 Component Styling

**Cards:**
```
- Background: solid color (white, yellow, turquoise, coral)
- Border: 4px solid black
- Shadow: 6px 6px 0px #000000 (offset, hard shadow)
- Border-radius: 12-16px (slightly rounded, not too soft)
- Padding: 24-32px
```

**Buttons:**
```
Primary:
- Background: #FF6B6B or #4ECDC4
- Border: 4px solid black
- Shadow: 4px 4px 0px #000000
- Text: ALL CAPS, bold
- Active state: shadow reduces to 2px 2px, translate by 2px

Secondary:
- Background: white
- Border: 3px solid black
- Same shadow treatment
```

**Input Fields:**
```
- Background: white
- Border: 3px solid black
- Border-radius: 8px
- Shadow: 3px 3px 0px #000000
- Focus state: double border or thicker border
```

**Toggle Switches:**
```
- Chunky, oversized appearance
- Thick borders
- Dramatic on/off states with color changes
- Animated shadow shift
```

### 4.5 Layout Patterns

**Spacing:**
- Generous whitespace between sections (32-48px)
- Tight spacing within cards (8-16px)
- Consistent 16px or 24px grid

**Grid System:**
- Asymmetric layouts where appropriate
- Overlapping elements for visual interest
- Rotated text elements (±2-3 degrees)
- Staggered card arrangements

**Dashboard Layout Example:**
```
+----------------------------------+
|  [Header: A-LIST SAVINGS]       |
|                                  |
|  +------------------------+      |
|  | 💰 TOTAL SAVED         |      |
|  | $847.00                |      |
|  | [L | Y | M] toggle     |      |
|  +------------------------+      |
|                                  |
|  +-------+  +-------+            |
|  | 🎬 42 |  | $23   |            |
|  | MOVIES|  | /MOVIE|            |
|  +-------+  +-------+            |
|                                  |
|  +------------------------+      |
|  | 🆓 FREE MOVIES         |      |
|  | This week: ▓▓▓▓▒▒ 3/4  |      |
|  +------------------------+      |
+----------------------------------+
```

### 4.6 Iconography
- Bold, geometric icons
- Line icons with thick strokes (3-4px)
- Optionally: hand-drawn, imperfect style
- High contrast (black on color backgrounds)

**Key Icons:**
- 💰 Money bag for savings
- 🎬 Film clapper for movies
- 📅 Calendar for dates
- ⚙️ Gear for settings
- 🔄 Sync arrows for refresh

### 4.7 Micro-interactions
- Buttons: press effect (shadow collapse + transform)
- Cards: subtle tilt on hover (web)
- Loading states: chunky, animated progress bars
- Success feedback: bold checkmarks, color flash
- Haptic feedback on iOS for interactions

### 4.8 Accessibility Considerations
- High contrast ratios (WCAG AA minimum)
- Large touch targets (minimum 44x44px)
- Clear focus states
- Screen reader support
- Readable font sizes

---

## 5. Data Models

### 5.1 User Document (Firestore)
```javascript
{
  uid: string,
  email: string,
  createdAt: timestamp,
  letterboxd: {
    username: string,
    lastSync: timestamp,
    rssUrl: string
  },
  aList: {
    subscriptionCost: number, // monthly
    startDate: timestamp,
    avgTicketPrice: number,
    isActive: boolean
  },
  preferences: {
    defaultView: 'lifetime' | 'year' | 'month',
    currency: 'USD',
    notifications: boolean
  }
}
```

### 5.2 Movies Collection (Subcollection under User)
```javascript
{
  id: string,
  title: string,
  watchDate: timestamp,
  letterboxdId: string,
  isAMC: boolean,
  poster: string (optional),
  rating: number (optional),
  addedManually: boolean,
  notes: string (optional)
}
```

### 5.3 Calculated Stats (Derived, not stored)
```javascript
{
  totalAMCMovies: number,
  totalSavings: number,
  monthlySavings: number,
  yearlySavings: number,
  avgSavingsPerMovie: number,
  monthsActive: number,
  utilizationRate: number, // percentage of free movies used
  breakEvenMonths: number
}
```

---

## 6. Development Phases

### Phase 1: MVP (Weeks 1-2)
- Firebase setup and authentication
- Basic dashboard with manual movie entry
- Settings page for A-List info
- Simple savings calculation
- Neubrutalism component library

### Phase 2: Letterboxd Integration (Weeks 3-4)
- RSS feed parsing
- Movie sync functionality
- Movie manager screen
- AMC toggle for movies

### Phase 3: Enhanced Features (Weeks 5-6)
- Free movies tracking
- Advanced statistics
- Data export
- Polish animations and micro-interactions

### Phase 4: Testing & Launch (Week 7-8)
- Cross-platform testing (iOS, Web)
- Performance optimization
- App Store submission
- Web deployment

---

## 7. Technical Challenges & Solutions

### Challenge 1: Letterboxd API
**Issue:** No official API
**Solution:** Parse RSS feed from `letterboxd.com/[username]/rss/` or use CSV export

### Challenge 2: Movie Matching
**Issue:** Identifying which movies were at AMC
**Solution:** User manually toggles, no automatic detection

### Challenge 3: Offline Functionality
**Issue:** Firebase requires connection
**Solution:** Implement Firestore offline persistence, cache calculations locally

### Challenge 4: Cross-Platform Styling
**Issue:** React Native Web styling differences
**Solution:** Use NativeWind/Tailwind for consistent styling, test on both platforms regularly

---

## 8. Success Metrics

### User Engagement
- Daily active users
- Average session length
- Movies marked per user
- Letterboxd sync frequency

### Business Metrics
- User retention (30-day, 90-day)
- Time to first movie marked
- Settings completion rate

### Technical Metrics
- App load time < 2s
- Sync success rate > 95%
- Crash-free rate > 99%

---

## 9. Future Enhancements (Post-MVP)

1. **Social Features**
   - Compare savings with friends
   - Leaderboards for most movies seen

2. **Advanced Analytics**
   - Genre breakdown
   - Favorite theater analysis
   - Yearly reports

3. **Notifications**
   - Remind to use weekly free movies
   - Milestone celebrations (100 movies, $1000 saved)

4. **Expanded Theater Support**
   - Regal Unlimited
   - Cinemark Movie Club
   - Local theater memberships

5. **Widget Support**
   - iOS home screen widget
   - Live Activity for current savings

---

## 10. Design Mockup Notes

### Dashboard Mood
- Celebration of savings (positive, energetic)
- Bold numbers that "pop"
- Playful asymmetry in card placement
- Strong visual hierarchy

### Movie Manager Mood
- Clean, scannable list
- Quick toggle interactions
- Satisfying feedback when marking AMC movies

### Settings Mood
- Organized, clear sections
- Friendly input fields
- Reassuring data management options

---

This requirements document provides a comprehensive foundation for building the A-List Savings Calculator. The Neubrutalism design will make it visually distinctive and memorable, while the Firebase backend ensures scalability and real-time sync capabilities.