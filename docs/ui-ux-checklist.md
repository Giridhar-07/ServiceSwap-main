# UI/UX Improvements Checklist

- Responsive layouts across mobile-first breakpoints.
- Clear loading states for all async operations.
- Descriptive error feedback with actionable next steps (added in Dashboard).
- WCAG: sufficient contrast, focus states, labels for inputs, ARIA roles on interactive components.
- Keyboard accessibility for dialogs, modals, tabs, and menus (Radix components provide good defaults).
- Toast notifications for success/errors; non-blocking and consistent.
- Performance: defer heavy computations, paginate lists, virtualize long lists if needed.
- Consistency: unified spacing, typography, and color tokens via Tailwind.