# Growing Money Tree

## What will change
- Replace the changing plant emoji on each goal with one illustrated money tree.
- Make the trunk, canopy, and number of leaves grow continuously with the saved percentage.
- Animate newly visible leaves after savings are added.
- Show a dense, fully leafed tree at 100%, while keeping the existing progress, calculations, and completion message.

## Technical details
- Add a small reusable tree visual inside the Goals page using accessible HTML/CSS shapes.
- Derive tree size and visible leaf count from the existing clamped goal percentage, so it never exceeds 100%.
- Preserve all current database updates and goal logic; this is a presentation-only enhancement.
- Verify the Goals page at mobile and desktop sizes and confirm the app still builds cleanly.
