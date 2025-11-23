# Orgdown for VS Code

<p align="center">
<img src="https://raw.githubusercontent.com/idears-org/orgdown-vscode/master/assets/orgdown.png" alt="Orgdown Logo" width="150" />
</p>

<p align="center">
<strong>OrgMode is the only reason I still keep Emacs on my device; that's why this extension was created.</strong>
</p>

<p align="center">
<img src="https://raw.githubusercontent.com/idears-org/orgdown-vscode/master/docs/user_guide/screen-shot.png" alt="Orgdown Screen Shot" />
</p>

## Getting Started

This extension focuses on providing comprehensive syntax support and essential operational features for Org Mode. If you want to achieve the color scheme shown in the screenshots, we recommend installing the [vscode-spacemacs-theme](https://marketplace.visualstudio.com/items?itemName=idears-org.vscode-spacemacs-theme) theme extension together with this one.

If you prefer the fancy coloring from the screenshots but don't want to switch your theme to Spacemacs globally, we provide a ready-to-use example settings file at `examples/settings-orgdown.json`. You can copy its contents into your user or workspace `settings.json` under `"editor.tokenColorCustomizations"` → `"textMateRules"`. You can also modify the color values to better match your preferences just like what I did in this project ./.vscode/settings.json.

## About The Project

Welcome to Orgdown! This is a Visual Studio Code extension dedicated to bringing the legendary organizational power of [Emacs' Org Mode](https://orgmode.org/) to the modern, accessible environment of VS Code. Our mission is to faithfully implement 80% or more of the core Org Mode feature set, such as robust syntax highlighting, code block execution, task management and so on.

This project is built with a professional-grade, test-driven architecture following VS Code's three-layer model: **TextMate grammar** for fast syntax highlighting, **Decoration API** for rich visual enhancements, and a **Language Server** using **Tree-sitter** for structural features like code folding, document outline, and future semantic capabilities.

Learn more at our project websites:

[orgdown.org](https://orgdown.org).

## Features & Roadmap

We are systematically implementing the full Org Mode feature set. The implementation roadmap is organized into three main phases:

- 🔵 Phase 1 — Readability (In progress)
  - Goal: make Org files comfortable and natural to read in VS Code for users who do not use Emacs.
  - Focus: robust syntax highlighting, reliable outline folding and navigation, and real-time preview of common constructs. Provide theme-friendly token colors and sensible defaults so shared Org files are readable without additional Emacs configuration.
  - Status: ✅ TextMate grammar with comprehensive test coverage | ✅ Code folding (headlines, blocks, drawers) | ✅ Document outline/symbol navigation

- Phase 2 — Writing & Export
  - Goal: improve the authoring and publishing experience for people writing with Org Mode in VS Code.
  - Focus: editing ergonomics (snippets, templates, inline helpers), live export previews, and smooth integration with export backends (HTML/Markdown/PDF) to make producing publishable output straightforward.

- Phase 3 — Advanced Features
  - Goal: implement higher-level Org Mode capabilities to support workflows and automation.
  - Focus: Babel code block execution, project/task management (TODO workflows and agenda-like features), richer inspections and integrations with external tools and languages.

We prioritize quality, test coverage, and backward compatibility across all phases; see our contribution guide for details on how features are developed and reviewed.

## How to Contribute

_We welcome and encourage community contributions!_

To get started, please read our comprehensive _[Contribution Guide](./docs/contributing/readme.org)_. It contains everything you need to know about our architecture, testing philosophy, and step-by-step processes.

## Our Architectural Philosophy

For those interested in the engineering principles behind the project, we follow a strict, documentation-driven design process:

- _The "Why":_ Our overall system design is detailed in our _[Architecture Document](./docs/reference/architecture.org)_.
- _The "How":_ Our development process is detailed in the _[Contribution Guide](./docs/contributing/readme.org)_.
- _Specific Decisions_: Significant, specific design decisions are documented in our Architecture Decision Records (ADRs), located in `docs/architecture_decisions/`.

## License

This project is licensed under the MIT License.
