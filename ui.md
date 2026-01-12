# UI Prompt — “Jones in the Fast Lane” Style Board Interface (Modernized)

Create a UI inspired by the layout and structure of the classic game “Jones in the Fast Lane,” but **without** retro/pixel-art constraints and **without** enforcing any specific aspect ratio.  
Use **emoji as placeholder artwork** wherever images would normally appear.

The UI should be built as a **city board with locations placed around the edges**, **curved roads connecting them**, a **large central content panel**, and a **bottom HUD** showing the week/time and current money.

---

## 🎛 Overall Layout

- The screen is a **single board/map** divided into:
  1. A **background map layer**  
  2. A set of **buildings/locations around the edges**  
  3. A **central location panel** that changes based on where the player travels  
  4. A **bottom HUD bar**

- The background should feel like a **colorful city map**, with:
  - Trees 🌳  
  - Paths/roads in curved shapes 🛣️  
  - Decorative simple shapes for terrain

- Roads should be **soft curved paths** that visually connect the center of the map to each building around the edges.  
  (Use SVG or CSS shapes — no pixel requirement.)

---

## 🏘️ Edge Buildings

Place buildings around the perimeter of the board.  
Each building is a clickable/selectable component.

Use emoji for placeholder icons, such as:

- 🏦 Bank  
- 🧪 Black Market  
- 🏭 Factory  
- 🧾 Rent Office  
- 💍 Pawn Shop  
- 🛒 Discount Store (“Z-Mart”)  
- 🍔 “Monolith Burgers” restaurant  
- 👕 Clothing Store

**Building card requirements:**

- Each building has:
  - A rectangular box with a bold border  
  - A label on or above the box  
  - An emoji inside representing the building  
- When selected:
  - The box visually highlights (e.g., lift, glow, outline change)

Buildings should be placed in roughly these positions:

- Top-left  
- Top-center  
- Top-right  
- Left-middle  
- Right-middle  
- Bottom-left  
- Bottom-right  

(Do NOT lock the layout to exact retro coordinates; use modern responsive spacing.)

---

## 🛣️ Roads

- Create **multiple colored, curved roads** connecting the bottom of the screen to each building.
- Roads may use subtle pastel colors.
- They should **branch**, curve, and guide the user’s eye to each location.

Example road placeholders (use these concepts, not ASCII):

- 🟨 Yellow path  
- 🟩 Green path  
- 🟧 Orange path  
- 🟪 Purple path  

---

## 🪧 Central Location Panel

When a building is selected, the center of the UI shows a **large panel** with location-specific content.

Panel layout:

### Header
- Left side: A **title bar** with the building name (e.g., “Monolith Burgers”)
- Right side: A **portrait box** with an emoji avatar (e.g., 🙂 👩‍🍳 👨‍🍳)

### Body (Two Columns)
- **Left column**
  - A menu/list card with several items and prices
  - Below that, a larger image card using an emoji like 🍟 for fries

- **Right column**
  - A list of additional items + prices  
  - Use dotted-leader spacing (Item.......$Price)

### Footer
- A large **DONE** button  
- Include a decorative cursor emoji (👉 or 🖱️) as a placeholder

---

## ⏰ Bottom HUD

The bottom area contains:

### Week Indicator
- A circular clock (use emoji like 🕒)
- Label below: “Week #X”

### Money Display
- A small display box showing: $ 36.20

- A keypad-like layout using square boxes or emoji keys (e.g., 🔲)

---

## ✨ Interaction Behavior

- Selecting a building updates the **central panel** content.
- The background, buildings, and roads remain visible whenever the central panel changes.
- Everything should be **layered**, **responsive**, and laid out using modern HTML/CSS/React (or your chosen framework).

---

## 🎨 Styling Notes

- No pixel-art requirement.
- Use standard CSS colors, gradients, borders, shadows.
- Use emojis as temporary artwork for:
- Portrait
- Food items
- Buildings
- Signs
- Icons

---

## 📦 Deliverables for Copilot

Generate:
1. A reusable board layout component  
2. A map background with roads  
3. Buildings around the board  
4. Central panel that updates based on state  
5. Bottom HUD  
6. Emoji placeholders everywhere art is needed  

Use clean, modern code and keep it easy to replace emojis with final assets later.
