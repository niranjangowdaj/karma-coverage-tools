# Change Log

All notable changes to the "Karma Coverage Tools" extension will be documented in this file.

## [0.1.0] - 2026-01-04

### Added

- Initial release of Karma Coverage Tools
- Automatic detection of Karma configuration files with coverage reporters
- Istanbul-style hit count badges showing execution counts
- Clean indicators for uncovered lines (red rectangle, no number)
- Support for Cobertura and LCOV coverage formats
- Monorepo support with multiple Karma configurations
- Nested configuration path resolution
- Status bar integration with coverage percentage
- Click status bar to toggle coverage display
- Double-click status bar to refresh and show detailed breakdown
- Hover tooltips with detailed coverage information and suggestions
- Run Tests command to execute Karma in headless mode
- Automatic coverage refresh when files change
- File system watchers for real-time updates
- Overview ruler markers for quick navigation
- Comprehensive test suite with 63+ tests

### Features

- Zero configuration required - reads settings from karma.conf.js
- Handles relative and absolute coverage paths correctly
- Aggregates coverage statistics across multiple packages
- Detailed coverage breakdown for each configuration
- Branch coverage tracking and visualization
- Execution count display (1x, 5x, 10x, etc.)
- Color-coded indicators (green for covered, orange for partial, red for uncovered)

## [0.1.1] - 2026-01-05

### Added

- Enhancements in text and removal of AI generated icons
- Changes SVG images to ensure it renders in all different devices

### Features

- Dialog to prompt user to run tests