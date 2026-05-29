# EB Bill Splitter - AI Development Prompt

Build a modern, mobile-friendly frontend-only web application called **EB Bill Splitter** for a bachelor house.

The application will be hosted on GitHub Pages, so there must be **no backend and no server-side code**.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (preferred)
- Chart.js for charts
- LocalStorage for persistence
- JSON export/import for backup and restore

---

## Purpose

The application calculates electricity bill sharing among 3 roommates.

There is:
- 1 main EB meter
- 3 separate AC meters (one AC per room)

### Inputs

- Total EB Units Consumed
- Total EB Bill Amount
- AC1 Units
- AC2 Units
- AC3 Units

### Calculation Logic

```text
Per Unit Rate = Total Bill Amount / Total Units

Common Units =
Total Units - (AC1 + AC2 + AC3)

Common Units Per Person =
Common Units / 3

Person 1 Amount =
(AC1 Units × Per Unit Rate)
+ (Common Units Per Person × Per Unit Rate)

Person 2 Amount =
(AC2 Units × Per Unit Rate)
+ (Common Units Per Person × Per Unit Rate)

Person 3 Amount =
(AC3 Units × Per Unit Rate)
+ (Common Units Per Person × Per Unit Rate)
```

Display a detailed breakdown.

---

# UI Design Requirements

- Modern and professional
- Google Material Design inspired
- Soft shadows
- Rounded corners
- Mobile-first responsive design
- Light theme
- White background
- Subtle blue accent color
- Maximum content width: 1000px
- Center aligned layout

---

# Page Structure

## Header

Title:
EB Bill Splitter

Subtitle:
Split electricity bills fairly among roommates

---

## Section 1: Current Bill Entry

### Main Meter

- Month (default current month)
- Total Units
- Total Bill Amount

### AC Meters

- Room 1 AC Units
- Room 2 AC Units
- Room 3 AC Units

### Buttons

- Calculate
- Reset
- Save Month

---

## Section 2: Calculation Summary

Display cards for:

### Per Unit Rate

Example:
₹7.25 / unit

### Common Units

Example:
450 Units

### Common Share Per Person

Example:
150 Units

---

## Section 3: Roommate Breakdown

Create 3 cards.

Each card should display:

### Room 1

- AC Units
- AC Charge
- Common Charge
- Total Payable

Make Total Payable visually prominent.

Repeat for Room 2 and Room 3.

---

## Section 4: Monthly History

History table.

Columns:

- Month
- Total Units
- Total Bill
- AC1
- AC2
- AC3
- Rate
- Person1
- Person2
- Person3
- Actions

Actions:

- View
- Delete

Newest month first.

---

## Section 5: Analytics Dashboard

Use Chart.js.

### Chart 1: Monthly EB Bill Trend

Line chart

X-axis:
Month

Y-axis:
Total Bill

Purpose:
Track bill increase/decrease.

### Chart 2: Monthly Unit Consumption

Bar chart

X-axis:
Month

Y-axis:
Units

Purpose:
Track consumption trends.

### Chart 3: AC Usage Comparison

Stacked bar chart

Series:
- AC1
- AC2
- AC3

Purpose:
Identify which room consumes more AC power.

---

## Section 6: Backup & Restore

### Export History

Download:

eb-bill-history.json

Contains all saved records.

### Import History

Upload JSON file.

Validate before importing.

---

# Data Model

```json
[
  {
    "month": "2026-05",
    "totalUnits": 900,
    "totalBill": 6300,
    "perUnitRate": 7,
    "ac1": 200,
    "ac2": 150,
    "ac3": 100,
    "commonUnits": 450,
    "person1Amount": 2450,
    "person2Amount": 2100,
    "person3Amount": 1750,
    "createdAt": "2026-05-28T12:00:00"
  }
]
```

Store data in LocalStorage.

Support JSON export/import.

---

# Validation Rules

Reject:

- Total Units <= 0
- Total Bill <= 0

Reject:

- AC1 + AC2 + AC3 > Total Units

Show user-friendly validation messages.

---

# UX Enhancements

### Auto-select Current Month

Example:
May 2026

### Toast Notifications

Examples:

- Calculation completed
- Month saved
- History exported
- History imported

### Confirmation Dialog

Before deleting a history record.

### Empty State

Display:

"No bill history available yet."

---

# Statistics Cards

Display:

- Highest Bill
- Average Monthly Bill
- Highest Units Consumed
- Average Per Unit Rate

Calculate from saved history.

---

# Technical Requirements

- Single Page Application
- No backend
- No frameworks
- Chart.js via CDN
- Mobile responsive
- Desktop responsive
- GitHub Pages compatible

Project structure:

```text
index.html
style.css
script.js
```

Keep the implementation clean, maintainable, and not over-engineered.

Prioritize usability, clarity, and simplicity.
