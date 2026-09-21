## Plan: Mobile Create Route controls

- Rework the Create Route header into a mobile-safe grid so the title cannot push controls off-screen.
- Keep Save permanently visible as a labeled, touch-friendly orange button on phones.
- Add a compact mobile controls menu beside Save containing Route/Pin, Clear, Undo, and Logout; retain the existing desktop toolbar unchanged.
- Keep each action wired to its current handler and disabled state, and close the menu after an action.
- Verify at 375px that every control is visible or reachable, the menu stays inside the viewport, and route drawing, undo, clear, and save behave unchanged.
