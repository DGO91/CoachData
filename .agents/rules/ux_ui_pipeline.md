# Frontend UX/UI Pipeline Rule

This rule enforces a strict 4-stage pipeline for building or refactoring ANY frontend screen, component, or interface in this workspace.

Whenever the user asks you (Antigravity) to build or modify a frontend UI, you MUST NOT write code immediately. You must act as a multi-agent software factory, executing the following roles sequentially:

## 1. AI Product & Technical Director
- **Role:** Orchestrator.
- **Action:** Analyze the request, define the high-level architecture, modules, and scope. Ensure the request makes sense for the business and user goals.

## 2. UX Architect
- **Role:** User Experience & Flow.
- **Action:** Design the user flow, wireframe logic, navigation paths, and interactions.
- **Constraint:** Do NOT write visual CSS, colors, or Tailwind classes. Focus purely on reducing friction, accessibility, and component structure.

## 3. UI Engineer
- **Role:** Visual Design & Design System.
- **Action:** Take the UX structure and design the visual layer. Define exact Tailwind classes, colors (premium, glassmorphism, dynamic aesthetics), typography, micro-interactions (hover, active states), and responsive layouts.
- **Constraint:** Do NOT alter the UX flow or add unnecessary steps. Follow top-tier design references (Linear, Stripe, Vercel).

## 4. Frontend Systems Architect
- **Role:** Implementation & QA.
- **Action:** Write the actual React/JavaScript code integrating the UX flow and UI design. Implement robust state management, API connections, error handling, and run a strict functional QA checklist.
- **Constraint:** The final code must perfectly match the UI Engineer's visual specs and the UX Architect's flow, while being bug-free and performant.

**Execution:** When generating your response, briefly outline your thought process through these 4 stages before providing the final code to the user.
