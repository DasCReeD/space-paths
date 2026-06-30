I based this on your uploaded generic visual QA checklist  and the official PS3 guide, which defines the XMB as a **horizontal row of feature categories** with a **vertical column of items under each category**. The guide also establishes the core interaction model: directional buttons select categories/items, Cross confirms, Circle cancels, Triangle opens options/control panels, and the information panel sits in the upper-right area. ([PlayStation Manuals][1])

[![Lo sapevate che il menu di PS3 nasconde un segreto animato?](https://images.openai.com/static-rsc-4/yRDHGsZXz_DGHRmx7vHsK54xuQk_IDq6iX62RxLP1pRtpDE9L-JDEmhMtLCCizWQ8zKUocb8OOn5_Vhm6poAPQwNF4C3aHbVwpn-lqJJYs0BRAnVFJw1RGbS5zZ8jCCoY4KcsTpZ5WSAXZAMHKqOzUrD1aoovleCPawcP1qI0ws?purpose=inline)](https://www.everyeye.it/notizie/sapevate-menu-playstation-3-nasconde-segreto-753885.html?utm_source=chatgpt.com)

Here is a modified version you can use as a **PS3 XrossMediaBar Visual QA / Claude Code Agent standard**.

# PS3 XrossMediaBar UI Design Review Standard for Claude Code

## Purpose

This visual QA standard forces Claude Code to review UI work against the design language of the PlayStation 3 XrossMediaBar, also known as the XMB.

The goal is not to create a normal web-app layout. The goal is to enforce a console-style, cinematic, controller-first interface built around:

* A horizontal category rail
* A vertical item column under the selected category
* Center-focused navigation
* Large icon-driven categories
* Minimal text
* Soft glow and fade effects
* Dark translucent atmosphere
* Smooth directional movement
* Upper-right system information
* Triangle-style contextual options
* Cross/Circle-style confirm/cancel behavior

A UI only passes if it feels like a polished PS3 XMB-style interface, not a generic dashboard.

---

# Core XMB Rules

## 1. Required XMB layout structure

1. The interface must have a horizontal category rail.
2. The horizontal category rail must be the primary navigation structure.
3. The selected category must visually anchor the screen.
4. The selected category must reveal a vertical list of child items.
5. The vertical item list must appear aligned beneath or near the selected category.
6. The layout must avoid generic top nav bars unless they are restyled into an XMB-like category rail.
7. The layout must avoid generic left sidebars unless they are transformed into XMB-style vertical child navigation.
8. The selected item should be near the visual center of attention.
9. The interface must use spatial navigation logic: left/right changes category, up/down changes item.
10. Horizontal and vertical navigation must be visually distinct.
11. Category icons should feel like large system-level destinations.
12. Child items should feel like content/actions inside the active category.
13. The UI must not look like a form-first business app unless the form is opened as a secondary detail panel.
14. The main screen must feel open, spacious, and atmospheric.
15. The XMB navigation cross should remain visually understandable at a glance.
16. The user should immediately understand what category is selected.
17. The user should immediately understand what item is selected.
18. The current category and item must never be visually ambiguous.
19. Secondary panels must not overpower the XMB navigation.
20. The interface must preserve the feeling of a calm media-console home screen.

---

## 2. Horizontal category rail standards

21. Categories must be arranged horizontally.
22. Category icons must be evenly spaced.
23. Category icons must sit on a consistent horizontal axis.
24. The selected category should be larger, brighter, sharper, or more prominent than inactive categories.
25. Inactive categories should be dimmed but still recognizable.
26. Category labels should appear only for the active category unless the design intentionally shows subtle labels.
27. Category labels must not clutter the rail.
28. The rail should avoid heavy boxes, tabs, or borders.
29. Category icons should feel suspended over the background, not trapped inside cards.
30. The category rail should not use dense text menus.
31. Category spacing must be wide enough to feel console-like.
32. The rail must not look cramped at common screen sizes.
33. The rail must remain centered or intentionally offset in XMB style.
34. The active category must not be too close to the screen edge.
35. Horizontal movement must feel predictable.
36. Category order must remain stable.
37. Icons must not jump unexpectedly between states.
38. The selected category should visually line up with its vertical item column.
39. The category rail should support smooth left/right transitions.
40. The category rail must not overlap the information panel.

---

## 3. Vertical item column standards

41. The selected category must reveal a vertical column of items.
42. Items must be stacked vertically with consistent spacing.
43. The selected item must be visually brighter or larger than non-selected items.
44. Non-selected items must remain readable but visually secondary.
45. The item column must align to the selected category.
46. The item column must not feel like a generic dropdown menu.
47. The item column must not use heavy rectangular list boxes unless the design intentionally mimics translucent PS3 panels.
48. Each item should have an icon, thumbnail, or subtle marker when appropriate.
49. Item labels must be readable against the background.
50. Long item labels must fade, scroll, wrap gracefully, or truncate cleanly.
51. Long item labels must not collide with other items.
52. Item descriptions must be secondary and visually quieter.
53. The selected item should have enough breathing room around it.
54. The item column must not extend off-screen without a graceful scroll/fade treatment.
55. Items above and below the selected item may fade into the background.
56. The vertical list should support up/down navigation.
57. The active item must not be hidden under the category rail.
58. The active item must not be hidden under the system information panel.
59. The item column must remain usable with many items.
60. The item column must remain usable with only one item.

---

## 4. Focus and selection behavior

61. There must always be one clearly focused category.
62. There must always be one clearly focused item when a category has items.
63. Focus must be visible without relying only on color.
64. Focus may use brightness, glow, scale, opacity, blur, or movement.
65. Focus must not be so subtle that the user cannot tell where they are.
66. Focus must not be so aggressive that it ruins the calm XMB feel.
67. The selected object should appear visually “alive.”
68. Inactive objects should recede gently.
69. Focus movement must not cause layout shifts that break alignment.
70. Focus states must be consistent across categories, items, menus, and overlays.
71. The focused item must never be clipped.
72. The focused item must never overlap nearby items.
73. The focused item must have enough space for glow or scale effects.
74. Hover, keyboard focus, and controller focus should resolve to the same visual language.
75. Focus should feel like a console selector, not a mouse hover hack.
76. Focus must remain visible on dark and bright backgrounds.
77. Disabled items must not look focusable.
78. Selected and disabled states must be visually different.
79. Loading states must not remove focus unexpectedly.
80. Returning from a submenu should restore prior focus.

---

## 5. Controller-first navigation

81. Left/right must move between categories.
82. Up/down must move between items inside the selected category.
83. Confirm must activate the selected item.
84. Cancel must return to the previous level or close the current panel.
85. Options must open the contextual options menu for the selected item.
86. Back behavior must be predictable.
87. Navigation must not require a mouse.
88. All primary actions must be reachable by keyboard/controller.
89. Tab order must not fight the visual XMB order.
90. Focus should not jump into hidden panels.
91. Focus should not land on decorative background elements.
92. Focus should not disappear when opening options.
93. Focus should not become trapped unless inside a modal.
94. Modals must support confirm/cancel behavior.
95. Options menus must support up/down selection.
96. The selected category/item must be restorable after closing a modal.
97. Rapid directional input must not break the layout.
98. Holding a direction should not cause visual tearing or bad state.
99. Navigation animations must not block input for too long.
100. The interface must remain understandable without visible mouse cursor usage.

---

## 6. PS3-style visual atmosphere

101. The background should be dark, calm, and atmospheric.
102. The background may use soft gradients.
103. The background may use wave-like motion or layered translucent shapes.
104. The background must not compete with icons or text.
105. White or near-white text should be the default readable foreground.
106. Secondary text should use lower opacity.
107. The design should avoid flat corporate dashboard colors.
108. The design should avoid thick borders and boxed sections.
109. The design should avoid excessive cards.
110. The design should avoid dense tables on the main XMB screen.
111. The visual style should feel light, floating, and spacious.
112. Large empty space is acceptable when it feels intentional.
113. Empty space is not acceptable if it makes the layout look broken.
114. Glow effects should be subtle.
115. Blur effects should be subtle.
116. Shadows should be soft.
117. Borders should be minimal or translucent.
118. The interface should avoid harsh white panels.
119. The interface should avoid bright saturated backgrounds behind text.
120. The interface should feel more like a media system than an admin portal.

---

## 7. Icon standards

121. Main categories must use simple, recognizable icons.
122. Icons should be monochrome or low-color unless selected.
123. Selected icons may become brighter, whiter, larger, or softly glowing.
124. Inactive icons should be dimmed consistently.
125. Icon style must be consistent across all categories.
126. Icon stroke width must be consistent.
127. Icon fill style must be consistent.
128. Icons must be visually balanced in size.
129. Icons must align to the same visual centerline.
130. Icons must not look randomly sourced from different icon packs.
131. Icons must remain crisp at large display sizes.
132. Icons must not appear pixelated.
133. Icons must not stretch or distort.
134. Icons must have enough space around them.
135. Category icons must be larger than child item icons.
136. Item icons must support the item label, not overpower it.
137. Thumbnail-style items must align consistently.
138. Placeholder icons must match the XMB visual style.
139. Status icons must not clutter the category rail.
140. Decorative icons must not be focusable.

---

## 8. Typography standards

141. Text should be clean, simple, and highly readable.
142. Text should feel light and modern.
143. The interface should avoid heavy bold typography except for strong focus.
144. The selected item label may be brighter or slightly larger.
145. Inactive labels should be lower opacity.
146. Labels should be short.
147. Category labels should be minimal.
148. Body copy should be avoided on the main XMB screen.
149. Long explanations should appear in detail panels, not in the navigation cross.
150. Text must not be clipped.
151. Text must not overlap icons.
152. Text must not collide with the information panel.
153. Text must not disappear into bright background waves.
154. Text must have enough contrast in all themes.
155. Text line height must prevent clipping.
156. Text should not use dense paragraph blocks in the main navigation.
157. Metadata should be smaller and dimmer than item names.
158. Button prompt text should be small but readable.
159. Date/time text must be readable in the upper-right area.
160. Font sizes must scale cleanly at different resolutions.

---

## 9. Information panel standards

161. The upper-right area should be reserved for system information.
162. The information panel may include date and time.
163. The information panel may include user/avatar/status indicators.
164. The information panel may include notification/message indicators.
165. The information panel must not overlap the category rail.
166. The information panel must not overlap the item column.
167. The information panel should be subtle.
168. The information panel should not become the main visual focus.
169. Text in the information panel must be readable.
170. Information icons must be small and consistent.
171. Busy/loading indicators should appear near the information area when appropriate.
172. Status information should not be scattered randomly around the screen.
173. Notification badges must be readable but restrained.
174. The information panel should remain anchored during navigation.
175. The information panel should adapt gracefully at smaller screen sizes.
176. The information panel must not be clipped.
177. The information panel must not cause horizontal scrolling.
178. The information panel must not cover options menus.
179. The information panel must not use bright intrusive colors.
180. The information panel should feel like part of the console shell.

---

## 10. Options menu standards

181. Contextual options should be opened from the selected item.
182. Options should feel secondary to the main XMB navigation.
183. Options menus must not appear as generic browser dropdowns.
184. Options menus should use translucent or dark styling.
185. Options menus must stay within the visible viewport.
186. Options menus must not be clipped by parent containers.
187. Options menus must not appear behind the main navigation.
188. Options menus must align visually with the selected item.
189. Options menu items must be readable.
190. Options menu items must have consistent vertical spacing.
191. The active option must be clearly focused.
192. The options menu must close cleanly with cancel.
193. The options menu must toggle cleanly with the options action.
194. The options menu must not steal focus permanently.
195. Disabled option items must be visibly disabled.
196. Destructive options must be visually distinct but not garish.
197. Options must be relevant to the selected item.
198. The options menu must not cover the selected item in a confusing way.
199. The options menu must support keyboard/controller up/down navigation.
200. The options menu must pass screenshot review in its open state.

---

## 11. Modal and detail panel standards

201. Details should open as calm overlays or side/detail panels.
202. Modals must not destroy the XMB sense of place.
203. Modals should be translucent or visually compatible with the dark background.
204. Modal headers must be clear.
205. Modal body text must be readable.
206. Modal actions must be visible without awkward scrolling.
207. Confirm and cancel actions must be visually distinct.
208. The cancel action must be easy to find.
209. Modal focus must be trapped while open.
210. Closing the modal must return focus to the prior XMB item.
211. Modals must not be larger than the viewport.
212. Modals must not open partially off-screen.
213. Modal content must scroll internally when needed.
214. The page behind the modal must not scroll accidentally.
215. Nested modals should be avoided.
216. Detail panels must not cover the category rail unless intentionally full-screen.
217. Detail panels must preserve clear escape/back behavior.
218. Detail content must not look like a dense admin form unless required.
219. Long-form editing should be placed behind a focused edit view.
220. A modal or panel only passes if it feels native to the XMB shell.

---

## 12. Spacing and layout rhythm

221. Spacing should be generous.
222. Related items should be close enough to feel connected.
223. Unrelated sections should be separated by open space.
224. The layout should avoid dense web-app spacing.
225. Category icon spacing must be even.
226. Item spacing must be even.
227. Focused items must have enough room for scale and glow.
228. Text must not sit too close to icons.
229. Labels must not sit too close to screen edges.
230. Upper-right system info must have safe margins.
231. Main navigation must have safe margins.
232. Vertical item lists must avoid crowding the bottom edge.
233. Horizontal category rail must avoid crowding the left and right edges.
234. Any detail panel must have consistent internal padding.
235. Options menus must have consistent internal padding.
236. Button prompts must have consistent spacing.
237. Background waves must not visually cut through important labels.
238. Empty space must be used intentionally.
239. Spacing should scale proportionally with viewport size.
240. The screen must not feel cramped at the minimum supported size.

---

## 13. Clipping and overflow standards

241. No selected category may be clipped.
242. No selected item may be clipped.
243. No item label may be cut off vertically.
244. No button prompt may be cut off.
245. No options menu may be clipped.
246. No modal may extend off-screen.
247. No information panel may be clipped.
248. No long title may collide with another item.
249. No glow/scale effect may be cut off by overflow hidden.
250. No vertical item list may disappear under the screen edge without a fade or scroll behavior.
251. No horizontal category rail may require browser horizontal scrolling.
252. No text descenders may be cut off.
253. No thumbnail may be partially hidden unless intentionally fading off-list.
254. No focus outline/glow may be cropped.
255. No fixed header/footer may cover XMB items.
256. No panel may hide the active selection accidentally.
257. No menu may open behind another layer.
258. No tooltip or prompt may be hidden behind the background.
259. No UI element may appear half-inside and half-outside the window.
260. Any clipping visible in a screenshot is an automatic failure unless explicitly intentional.

---

## 14. Responsiveness and screen scaling

261. The XMB layout must work at default desktop size.
262. The XMB layout must work at large display size.
263. The XMB layout must work at small window size.
264. The XMB layout must define a minimum usable size.
265. The category rail must remain usable at all supported sizes.
266. The selected item column must remain readable at all supported sizes.
267. The information panel must reposition or simplify on small screens.
268. Icons must scale without distortion.
269. Text must remain readable at browser zoom levels.
270. The layout must avoid horizontal scrolling.
271. If the screen is too narrow, categories may compress, fade, or carousel.
272. If the screen is too short, item lists may scroll or fade.
273. The selected item must remain visible during resizing.
274. The selected category must remain visible during resizing.
275. Focus must not reset unexpectedly on resize.
276. Background effects must scale cleanly.
277. Modals must fit smaller screens.
278. Options menus must flip or reposition to stay visible.
279. Detail panels must become full-screen or stacked when necessary.
280. The interface must be screenshot-reviewed at multiple viewport sizes before approval.

---

## 15. Animation and motion standards

281. Movement should be smooth and calm.
282. Category transitions should slide or fade horizontally.
283. Item transitions should slide or fade vertically.
284. Focus changes may use subtle scale.
285. Focus changes may use subtle glow.
286. Animations must not feel bouncy or cartoonish unless intentionally themed.
287. Animations must not be too slow.
288. Animations must not make navigation feel delayed.
289. Animations must not cause layout jumping.
290. Background waves must not distract from text.
291. Loading animations should be subtle.
292. Busy indicators should be restrained.
293. Opening options menus should feel lightweight.
294. Closing options menus should feel instant or nearly instant.
295. Modal transitions should be smooth but quick.
296. Reduced-motion preferences should be respected.
297. Rapid navigation should not queue excessive animations.
298. Animations must not make focus unclear.
299. Text must remain readable during motion.
300. The UI should feel premium, quiet, and responsive.

---

## 16. Color and theme standards

301. The default visual tone should be dark.
302. Background colors should use deep blues, blacks, purples, or soft gradients unless intentionally themed.
303. Foreground text should usually be white or near-white.
304. Secondary text should use opacity rather than unrelated colors.
305. Selected items should brighten rather than become loud.
306. Accent colors should be restrained.
307. Random one-off colors are not allowed.
308. Error colors may be stronger but must still fit the theme.
309. Success colors must not overpower the interface.
310. Warning colors must be visible but not neon.
311. Disabled items should be dimmed and desaturated.
312. Borders should be subtle and translucent.
313. Panels should feel glassy, smoky, or softly layered.
314. The interface should avoid flat white boxes.
315. The interface should avoid corporate blue dashboard styling.
316. The interface should avoid material-design card overload.
317. Icons should harmonize with the selected/inactive color system.
318. Contrast must remain accessible.
319. Background waves must not reduce text readability.
320. Light themes are allowed only if they still preserve the XMB structure and calm console feel.

---

## 17. Button prompt standards

321. Important actions should be shown as controller-style prompts where appropriate.
322. Confirm should be represented consistently.
323. Cancel/back should be represented consistently.
324. Options should be represented consistently.
325. Prompt labels must be short.
326. Prompt labels should appear near the bottom or in a consistent help area.
327. Prompts must not clutter the main XMB cross.
328. Prompts must update based on the selected item.
329. Unavailable actions must not be shown as active prompts.
330. Prompt icons must be readable.
331. Prompt text must be readable.
332. Prompt spacing must be consistent.
333. Prompt area must not overlap item lists.
334. Prompt area must not overlap modals.
335. Prompt area must not be clipped at the bottom of the screen.
336. Keyboard equivalents may be shown, but they must not break the console feel.
337. Mouse-only tooltips must not replace core prompts.
338. Prompts must not use generic web button styling.
339. Prompts must pass screenshot review.
340. Prompts should reinforce the controller-first interaction model.

---

## 18. Content density standards

341. The main screen must not be dense.
342. Do not place full data tables directly on the XMB home view.
343. Do not place large forms directly on the XMB home view.
344. Do not place paragraphs of instructions directly in the item column.
345. Use progressive disclosure.
346. Category level should show broad destinations.
347. Item level should show selectable content/actions.
348. Detail level should show full information.
349. Editing level should show forms only when needed.
350. Large datasets should be opened in a dedicated viewer.
351. Search/filter panels should not dominate the XMB home view.
352. Notifications should not flood the screen.
353. Empty states should be calm and concise.
354. Error states should be clear but not visually chaotic.
355. The selected item may show a short description.
356. Long descriptions belong in detail panels.
357. Metadata should be secondary.
358. Badges should be minimal.
359. Avoid unnecessary labels around obvious icons.
360. The interface should feel browsable, not administrative.

---

## 19. Tables, forms, and business UI inside XMB

361. Tables are allowed only in secondary views.
362. Forms are allowed only in secondary views.
363. Secondary views must still use the XMB visual language.
364. Tables should use dark translucent styling.
365. Table rows must be readable.
366. Table focus must be controller navigable.
367. Table selection must be visually clear.
368. Table columns must not be cramped.
369. Form fields must not use harsh white boxes unless restyled.
370. Form labels must be readable.
371. Form focus must be highly visible.
372. Submit/cancel must map clearly to confirm/cancel behavior.
373. Form errors must be readable.
374. Form errors must not break the layout.
375. Long forms should be split into steps or panels.
376. Search fields should feel integrated, not pasted on.
377. Data grids must not appear on the primary XMB navigation screen.
378. Dense content must be visually softened.
379. The user must always know how to go back to the XMB.
380. Secondary UI must not destroy the console-shell feel.

---

## 20. Screenshot review requirements

381. Do not approve UI changes without rendered screenshots.
382. Review the default screen.
383. Review the selected category state.
384. Review at least one vertical item list.
385. Review an options menu open state.
386. Review any modal or detail panel changed.
387. Review any loading state changed.
388. Review any empty state changed.
389. Review any error state changed.
390. Review long-text test data.
391. Review small viewport size.
392. Review large viewport size.
393. Review minimum supported size.
394. Review browser zoom or OS scaling if relevant.
395. Review dark background readability.
396. Check for clipping.
397. Check for overlap.
398. Check for off-screen panels.
399. Check for unreadable text.
400. Check for inconsistent focus states.

---

# XMB Visual QA Failure Rules

The UI automatically fails if any of the following are visible:

1. The interface does not have a horizontal category rail.
2. The selected category does not reveal a vertical item list.
3. The selected category is unclear.
4. The selected item is unclear.
5. The layout looks like a generic web dashboard instead of an XMB-style console interface.
6. Text is clipped.
7. Icons overlap.
8. Focus glow is clipped.
9. Menus open off-screen.
10. Options menus look like unstyled browser dropdowns.
11. Modals cover the selected item without preserving context.
12. The information panel overlaps navigation.
13. The screen is too dense.
14. The design uses heavy cards, tables, or forms on the main XMB screen.
15. Controller/keyboard navigation does not match left/right category and up/down item movement.
16. The selected state relies only on color.
17. The background makes text unreadable.
18. The UI requires a mouse for core navigation.
19. The layout breaks at supported viewport sizes.
20. The result does not feel like a calm PS3-style media-console interface.

---

# Required Claude Code Review Loop

When reviewing or modifying XMB-style UI, Claude Code must follow this loop:

1. Identify the changed screen, component, or menu.
2. Run the app.
3. Capture screenshots at multiple viewport sizes.
4. Capture screenshots with menus, options, modals, and item lists open.
5. Compare the screenshots against this XMB standard.
6. Identify all visible defects.
7. Classify each defect as Critical, Major, Minor, or Polish.
8. Fix Critical and Major issues first.
9. Re-render and capture screenshots again.
10. Repeat until the interface passes or until five attempts have been made.

Claude Code must not finish by saying only that the build passed.

The final answer must include:

* Screens reviewed
* Viewports reviewed
* XMB states reviewed
* Defects found
* Fixes made
* Remaining concerns
* Final PASS or FAIL

---

# Claude Code Agent Instruction

You are the XMB Visual QA Reviewer.

You are reviewing UI against PS3 XrossMediaBar design standards.

You must be strict.

Do not approve the UI because the code compiles.

Do not approve the UI because tests pass.

Do not approve the UI because no console errors appear.

Only approve the UI if the rendered screenshots look like a polished XMB-style interface.

The UI must have:

* Horizontal category navigation
* Vertical item navigation under the selected category
* Clear selected category
* Clear selected item
* Controller-first movement
* Minimal chrome
* Dark atmospheric background
* Soft glow/fade visual language
* Upper-right system information area
* Contextual options behavior
* No clipping
* No overlap
* No broken scaling
* No generic dashboard feel

Return either PASS or FAIL.

If FAIL, explain exactly what must be fixed before approval.


[1]: https://manuals.playstation.net/document/en/ps3/current/basicoperations/xmb.html "PS3™ | About the XMB™ (XrossMediaBar) menu"
