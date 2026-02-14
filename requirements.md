the first module I'd like to build out is a planner for a chest of drawers. the goal is to help the user build a visual plan and cutlist for their chest of drawers.

- users should be able to select the units they'd like to use (inches or cm).
- users should be able to optionally specify the total dimension constraints (heightxwidthxdepth) for their chest of drawers. if this is specified, and we exceed any of these dimensions through our selections, we should visually indicate that there will be a problem
- users should be able to select the number of columns for their chest of drawers
- users can pick a number of rows per column of drawers
- they can select a different height for each row, but we should make it easy to just use the same height universally or repeatedly.
- the user should be able to select the style of drawer - overlay vs inset
- the user should be able to select the thickness of wood in nominal units (like 1/2 plywood) and you should be able to suggest the actual dimension for these
- we can use different thickness of wood for basically every piece. if we want to use different thickness wood for the drawer bottoms vs sides vs top vs bottom, great. even different drawers can be different thicknesses but that shouldn't be the default flow, it should be simplified unless the user wants to be more advanced with this
- we'll stick to standard drawer slides for the drawers, with normal tolerance. the slide length should be configurable but you should recommend a length based on the available space
- the user should be able to visually see the drawer represented, with visiible measurements
- the user should be able to get plans for the drawers. you need to take into account tolerances when making these plans and when calculating the required dimensions for everything
- the user should also be able to get a cutlist from the plans, given options of wood stock (4x4, 4x8, etc) per thickness of wood used in the plan. the cut list should take the blade/kerf width into account
